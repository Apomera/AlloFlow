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
if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('solarSystem'))) {

(function() {
  'use strict';
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-solarsystem')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-solarsystem';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  window.StemLab.registerTool('solarSystem', {
    icon: '\uD83C\uDF0D',
    label: 'solarSystem',
    desc: '',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'visit_all_planets', label: 'Visit all 9 planets', icon: '\uD83C\uDF0D', field: 'planetsVisited', check: function(d) { return (d.planetsVisited || []).length >= 9; }, progress: function(d) { return (d.planetsVisited || []).length + '/9 planets'; } },
      { id: 'quiz_score_5', label: 'Score 5+ on the planet quiz', icon: '\uD83E\uDDE0', field: 'quiz.score', check: function(d) { return d.quiz && d.quiz.score >= 5; }, progress: function(d) { return (d.quiz ? d.quiz.score : 0) + '/5'; } },
      { id: 'quiz_score_8', label: 'Score 8+ on the planet quiz', icon: '\uD83C\uDFC6', field: 'quiz.score', check: function(d) { return d.quiz && d.quiz.score >= 8; }, progress: function(d) { return (d.quiz ? d.quiz.score : 0) + '/8'; } },
      { id: 'deploy_rover', label: 'Deploy a rover or probe on any planet', icon: '\uD83D\uDE97', field: 'missionLog', check: function(d) { return (d.missionLog || []).length >= 1; }, progress: function(d) { return (d.missionLog || []).length > 0 ? 'Done' : 'Not yet'; } },
      { id: 'visit_5_planets', label: 'Visit at least 5 different planets', icon: '\u2B50', field: 'planetsVisited', check: function(d) { return (d.planetsVisited || []).length >= 5; }, progress: function(d) { return (d.planetsVisited || []).length + '/5 planets'; } },
      { id: 'explore_interior', label: 'View the interior of 3 different planets', icon: '\uD83C\uDF0B', field: 'interiorsViewed', check: function(d) { return (d.interiorsViewed || []).length >= 3; }, progress: function(d) { return (d.interiorsViewed || []).length + '/3'; } },
      { id: 'descent_sim', label: 'Descend through an atmosphere', icon: '\uD83D\uDE80', field: 'descentsDone', check: function(d) { return (d.descentsDone || []).length >= 1; }, progress: function(d) { return (d.descentsDone || []).length > 0 ? 'Done' : 'Not yet'; } },
      // Pedagogical quest hooks (for Station Builder integration)
      { id: 'journal_3', label: 'Write 3 field journal entries', icon: '\uD83D\uDCD3', field: 'journalEntries', check: function(d) { return (d.journalEntries || []).length >= 3; }, progress: function(d) { return (d.journalEntries || []).length + '/3 entries'; } },
      { id: 'journal_5_planets', label: 'Journal entries for 5 different planets', icon: '\uD83D\uDCDD', field: 'journalEntries', check: function(d) { var planets = {}; (d.journalEntries || []).forEach(function(j) { planets[j.planet] = true; }); return Object.keys(planets).length >= 5; }, progress: function(d) { var planets = {}; (d.journalEntries || []).forEach(function(j) { planets[j.planet] = true; }); return Object.keys(planets).length + '/5 planets'; } },
      { id: 'vocab_10', label: 'Explore 10 vocabulary terms', icon: '\uD83D\uDCD6', field: 'vocabLookedUp', check: function(d) { return (d.vocabLookedUp || []).length >= 10; }, progress: function(d) { return (d.vocabLookedUp || []).length + '/10 terms'; } },
      { id: 'poe_5', label: 'Make predictions for 5 planets', icon: '\uD83E\uDD14', field: 'poeSeen', check: function(d) { return (d.poeSeen || []).length >= 5; }, progress: function(d) { return (d.poeSeen || []).length + '/5 predictions'; } },
      { id: 'misconception_5', label: 'Answer 5 misconception checkpoints', icon: '\u2753', field: 'misconceptionsSeen', check: function(d) { return (d.misconceptionsSeen || []).length >= 5; }, progress: function(d) { return (d.misconceptionsSeen || []).length + '/5 checked'; } },
      { id: 'assignment_complete', label: 'Complete any assignment', icon: '\uD83D\uDCCB', field: 'activeAssignment', check: function(d) { if (!d.activeAssignment) return false; var tasks = d['asn_done_' + d.activeAssignment] || []; var asnLen = { inner_planets: 4, gas_giants: 4, habitability: 4, full_survey: 5 }; return tasks.length >= (asnLen[d.activeAssignment] || 4); }, progress: function(d) { if (!d.activeAssignment) return 'Not started'; var tasks = d['asn_done_' + d.activeAssignment] || []; return tasks.length + ' tasks done'; } }
    ],
    render: function(ctx) {
      // Aliases â€" maps ctx properties to original variable names
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

      // â"€â"€ Tool body (solarSystem) â"€â"€
      return (function() {
const d = labToolData.solarSystem;

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('solarSystem', 'init', {
              first: 'Solar System Explorer loaded. Interactive 3D model of our solar system. Click any planet to explore its surface, atmosphere, moons, and more.',
              repeat: 'Solar System Explorer active.',
              terse: 'Solar System.'
            }, { debounce: 800 });
          }

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
              if (e.key === '4') { e.preventDefault(); upd('viewTab', 'descent'); }
              if (e.key === '5') { e.preventDefault(); upd('viewTab', 'drone'); }
            }
          };
          window.addEventListener('keydown', window._solarKeyHandler);

          // --- Sound effects (singleton AudioContext) ---
          var _solarAC = null;
          function getSolarAC() {
            if (!_solarAC) { try { _solarAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
            if (_solarAC && _solarAC.state === 'suspended') { try { _solarAC.resume(); } catch(e) {} }
            return _solarAC;
          }
          function solarTone(freq, dur, type, vol) {
            var ac = getSolarAC(); if (!ac) return;
            try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = type || 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(vol || 0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (dur || 0.1)); } catch(e) {}
          }
          function playBeep() { solarTone(880, 0.08, 'sine', 0.08); }
          function playCelebrate() {
            [523, 659, 784, 1047].forEach(function(freq, i) {
              setTimeout(function() { solarTone(freq, 0.1, 'sine', 0.06); }, i * 120);
            });
          }
          // Planet selection sound — ascending tone based on distance from sun
          function playPlanetSelect(distAU) {
            var baseFreq = 300 + Math.min(distAU || 1, 40) * 15;
            solarTone(baseFreq, 0.06, 'sine', 0.05);
            setTimeout(function() { solarTone(baseFreq * 1.33, 0.08, 'sine', 0.06); }, 50);
            setTimeout(function() { solarTone(baseFreq * 1.5, 0.1, 'sine', 0.04); }, 100);
          }
          // Quiz correct/wrong sounds
          function playQuizCorrect() { solarTone(523, 0.08, 'sine', 0.06); setTimeout(function() { solarTone(659, 0.08, 'sine', 0.06); }, 80); setTimeout(function() { solarTone(784, 0.12, 'sine', 0.07); }, 160); }
          function playQuizWrong() { solarTone(300, 0.12, 'sawtooth', 0.05); setTimeout(function() { solarTone(220, 0.15, 'sawtooth', 0.04); }, 80); }
          // Tab switch click
          function playTabClick() { solarTone(600, 0.03, 'square', 0.03); }
          // Descent altitude change
          function playDescentTick(alt) { var freq = 200 + (1 - Math.min(alt, 300) / 300) * 600; solarTone(freq, 0.04, 'sine', 0.03); }

          // ── Ambient planet drones — each planet has a unique synthesized atmosphere ──
          var _ambientNodes = null;
          var PLANET_AMBIENCE = {
            Mercury: { freq: 80, type: 'sine', filterHz: 200, vol: 0.006 },
            Venus: { freq: 55, type: 'sawtooth', filterHz: 150, vol: 0.008 },
            Earth: { freq: 120, type: 'sine', filterHz: 400, vol: 0.005 },
            Mars: { freq: 90, type: 'sine', filterHz: 250, vol: 0.006 },
            Jupiter: { freq: 40, type: 'sawtooth', filterHz: 120, vol: 0.01 },
            Saturn: { freq: 50, type: 'triangle', filterHz: 180, vol: 0.008 },
            Uranus: { freq: 70, type: 'sine', filterHz: 160, vol: 0.007 },
            Neptune: { freq: 45, type: 'triangle', filterHz: 140, vol: 0.009 },
            Pluto: { freq: 100, type: 'sine', filterHz: 200, vol: 0.004 }
          };
          function startPlanetAmbience(planetName) {
            stopPlanetAmbience();
            var ac = getSolarAC(); if (!ac) return;
            var cfg = PLANET_AMBIENCE[planetName]; if (!cfg) return;
            try {
              // Base oscillator
              var osc = ac.createOscillator(); osc.type = cfg.type; osc.frequency.value = cfg.freq;
              // LFO for gentle wobble
              var lfo = ac.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.3 + Math.random() * 0.2;
              var lfoGain = ac.createGain(); lfoGain.gain.value = cfg.freq * 0.08;
              lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
              // Filter
              var filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = cfg.filterHz; filt.Q.value = 1.5;
              // Master gain with fade-in
              var master = ac.createGain(); master.gain.setValueAtTime(0, ac.currentTime);
              master.gain.linearRampToValueAtTime(cfg.vol, ac.currentTime + 1.5);
              osc.connect(filt); filt.connect(master); master.connect(ac.destination);
              osc.start(); lfo.start();
              _ambientNodes = { osc: osc, lfo: lfo, master: master };
            } catch(e) {}
          }
          function stopPlanetAmbience() {
            if (_ambientNodes) {
              try {
                _ambientNodes.master.gain.linearRampToValueAtTime(0, (getSolarAC() ? getSolarAC().currentTime : 0) + 0.5);
                var nodes = _ambientNodes;
                setTimeout(function() { try { nodes.osc.stop(); nodes.lfo.stop(); } catch(e) {} }, 600);
              } catch(e) {}
              _ambientNodes = null;
            }
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

          // ═══════════════════════════════════════════════════════════
          // ═══ PEDAGOGICAL SYSTEMS ═══
          // ═══════════════════════════════════════════════════════════

          // ── POE (Predict-Observe-Explain) Prompts ──
          var POE_PROMPTS = {
            Mercury: { predict: 'Mercury is closest to the Sun. Do you think it is the hottest planet?', reveal: 'Surprise! Venus is hotter (462\u00B0C vs 430\u00B0C). Mercury has no atmosphere to trap heat, so heat escapes into space at night (-180\u00B0C). Atmospheres matter more than distance!', concept: 'greenhouse effect' },
            Venus: { predict: 'Venus is similar in size to Earth. Do you think its surface is similar too?', reveal: 'Not at all! Venus has a crushing 90-atmosphere CO\u2082 atmosphere, 462\u00B0C surface, and sulfuric acid clouds. It\u2019s the most extreme greenhouse effect in the solar system.', concept: 'atmospheric composition' },
            Earth: { predict: 'What makes Earth unique compared to every other planet we know of?', reveal: 'Liquid water on the surface! Earth sits in the habitable zone, has a protective magnetic field, and a balanced atmosphere. No other known planet has all three.', concept: 'habitable zone' },
            Mars: { predict: 'Mars once had rivers and lakes. Why do you think the water disappeared?', reveal: 'Mars lost its magnetic field ~4 billion years ago. Without magnetic shielding, solar wind stripped away the atmosphere, and low pressure caused surface water to evaporate or freeze underground.', concept: 'magnetosphere' },
            Jupiter: { predict: 'Jupiter is 11x wider than Earth. How strong do you think its gravity is compared to Earth?', reveal: 'Jupiter\u2019s surface gravity is only 2.34x Earth\u2019s \u2014 surprisingly low for such a massive planet! That\u2019s because it\u2019s made of light gases (hydrogen/helium), so its density is low.', concept: 'density vs mass' },
            Saturn: { predict: 'Saturn is the second-largest planet. Could it float in water?', reveal: 'Yes! Saturn\u2019s density is only 0.687 g/cm\u00B3 \u2014 less than water (1.0 g/cm\u00B3). If you had a bathtub big enough, Saturn would float. Size doesn\u2019t always mean heavy!', concept: 'density' },
            Uranus: { predict: 'Uranus is tilted 98\u00B0 on its side. What do you think seasons are like there?', reveal: 'Each pole gets 42 years of continuous sunlight followed by 42 years of darkness! The equator is actually colder than the poles. Axial tilt dramatically affects climate.', concept: 'axial tilt & seasons' },
            Neptune: { predict: 'Neptune is the farthest planet from the Sun. Do you think it has the coldest temperature?', reveal: 'Neptune is cold (-214\u00B0C) but Uranus is actually colder (-224\u00B0C) despite being closer to the Sun! Neptune radiates 2.6x more heat than it receives \u2014 it has a mysterious internal heat source.', concept: 'internal heat' },
            Pluto: { predict: 'Pluto was called a planet for 76 years. Why do you think scientists reclassified it?', reveal: 'In 2006, the IAU defined 3 criteria: orbits the Sun (\u2713), round shape (\u2713), cleared its orbit (\u2717). Pluto shares its orbital zone with thousands of Kuiper Belt objects, so it\u2019s a "dwarf planet."', concept: 'planetary classification' }
          };

          // ── Enhanced Quiz with Error-Correcting Feedback ──
          var QUIZ_BANK = [
            { q: 'Which planet is the hottest?', a: 'Venus', opts: ['Mercury', 'Venus', 'Mars', 'Jupiter'], tip: 'Venus has a runaway greenhouse effect reaching 462\u00B0C!', wrongFeedback: { Mercury: 'Mercury is closest to the Sun, but Venus is hotter because its thick CO\u2082 atmosphere traps heat (greenhouse effect). Distance isn\u2019t everything!', Mars: 'Mars is actually very cold (-65\u00B0C average). Its thin atmosphere can\u2019t trap much heat.', Jupiter: 'Jupiter is far from the Sun and made of cold gas. Its cloud tops are -145\u00B0C!' }, difficulty: 1, concept: 'greenhouse effect' },
            { q: 'Which planet has the most moons?', a: 'Saturn', opts: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], tip: 'Saturn has 146 known moons as of 2024!', wrongFeedback: { Jupiter: 'Close! Jupiter has 95 known moons, but Saturn surpassed it with 146 discoveries in recent surveys.', Uranus: 'Uranus has 27 known moons \u2014 far fewer than the gas giant leaders.', Neptune: 'Neptune has only 16 known moons. Triton is the famous one \u2014 it orbits backwards!' }, difficulty: 1, concept: 'moons' },
            { q: 'Which planet rotates on its side?', a: 'Uranus', opts: ['Neptune', 'Uranus', 'Saturn', 'Pluto'], tip: 'Uranus has an axial tilt of 97.77\u00B0!', wrongFeedback: { Neptune: 'Neptune\u2019s tilt is 28\u00B0 \u2014 similar to Earth\u2019s 23.5\u00B0.', Saturn: 'Saturn\u2019s tilt is 27\u00B0 \u2014 it has normal seasons.', Pluto: 'Pluto\u2019s tilt is 120\u00B0 (extreme!), but Uranus at 98\u00B0 is the textbook answer for "on its side."' }, difficulty: 2, concept: 'axial tilt' },
            { q: 'Which is the smallest planet?', a: 'Mercury', opts: ['Mercury', 'Mars', 'Pluto', 'Venus'], tip: 'Mercury is only 4,879 km in diameter.', wrongFeedback: { Mars: 'Mars (6,779 km) is small but still 40% larger than Mercury.', Pluto: 'Pluto is tiny (2,377 km) but it\u2019s no longer classified as a planet since 2006!', Venus: 'Venus (12,104 km) is nearly the same size as Earth \u2014 much larger than Mercury.' }, difficulty: 1, concept: 'planetary size' },
            { q: 'Which planet has the longest year?', a: 'Pluto', opts: ['Neptune', 'Pluto', 'Uranus', 'Saturn'], tip: 'Pluto takes 248 Earth years to orbit the Sun!', wrongFeedback: { Neptune: 'Neptune\u2019s year is 165 Earth years \u2014 long, but Pluto\u2019s is even longer at 248.', Uranus: 'Uranus orbits in 84 Earth years \u2014 less than half of Pluto\u2019s.', Saturn: 'Saturn takes 29.5 Earth years. The farther from the Sun, the longer the orbit!' }, difficulty: 2, concept: 'orbital period' },
            { q: 'Which planet has the shortest day?', a: 'Jupiter', opts: ['Jupiter', 'Saturn', 'Earth', 'Mars'], tip: 'Jupiter rotates in just 10 hours!', wrongFeedback: { Saturn: 'Saturn is close at 10.7 hours, but Jupiter at 9.9 hours wins!', Earth: 'Earth\u2019s 24-hour day is slow compared to giant planets. Giant planets spin fast because they formed from rapidly spinning gas clouds.', Mars: 'Mars\u2019s day is 24.6 hours \u2014 almost identical to Earth\u2019s.' }, difficulty: 1, concept: 'rotation' },
            { q: 'Which planet is known as the Red Planet?', a: 'Mars', opts: ['Venus', 'Mars', 'Mercury', 'Jupiter'], tip: 'Iron oxide (rust) gives Mars its red color.', wrongFeedback: { Venus: 'Venus appears yellowish-white due to sulfuric acid clouds.', Mercury: 'Mercury appears dark grey \u2014 its surface is similar to our Moon.', Jupiter: 'Jupiter\u2019s bands are brown/orange/white from ammonia and sulfur compounds.' }, difficulty: 1, concept: 'surface composition' },
            { q: 'Which planet could float in water?', a: 'Saturn', opts: ['Jupiter', 'Saturn', 'Neptune', 'Uranus'], tip: 'Saturn\u2019s density is less than water (0.687 g/cm\u00B3)!', wrongFeedback: { Jupiter: 'Jupiter\u2019s density is 1.33 g/cm\u00B3 \u2014 denser than water. Despite being mostly hydrogen, its massive gravity compresses the gas.', Neptune: 'Neptune\u2019s density is 1.64 g/cm\u00B3. Ice giants are denser than gas giants.', Uranus: 'Uranus has a density of 1.27 g/cm\u00B3 \u2014 close, but still sinks!' }, difficulty: 3, concept: 'density' },
            { q: 'Where is the tallest volcano in the solar system?', a: 'Mars', opts: ['Earth', 'Venus', 'Mars', 'Jupiter'], tip: 'Olympus Mons on Mars is 21.9 km high \u2014 nearly 3x Everest!', wrongFeedback: { Earth: 'Mauna Kea (from base) is 10.2 km, but Mars\u2019s low gravity allows volcanoes to grow much taller!', Venus: 'Venus has Maat Mons (8 km), but Mars\u2019s Olympus Mons is nearly 3x taller. Low gravity = taller mountains!', Jupiter: 'Jupiter has no solid surface, so no traditional volcanoes. But its moon Io is the most volcanic body in the solar system!' }, difficulty: 2, concept: 'gravity & geology' },
            { q: 'Which planet has the strongest winds?', a: 'Neptune', opts: ['Jupiter', 'Saturn', 'Neptune', 'Uranus'], tip: 'Neptune\u2019s winds reach 2,100 km/h!', wrongFeedback: { Jupiter: 'Jupiter\u2019s winds reach 680 km/h in the Great Red Spot \u2014 fast, but Neptune\u2019s are 3x faster!', Saturn: 'Saturn has 1,800 km/h winds \u2014 close, but Neptune edges it out.', Uranus: 'Uranus has relatively weak winds (900 km/h) for an ice giant.' }, difficulty: 2, concept: 'atmospheric dynamics' },
            // ── New questions expanding coverage ──
            { q: 'What protects Earth from harmful solar radiation?', a: 'Magnetic field', opts: ['Ozone layer', 'Magnetic field', 'Gravity', 'Atmosphere thickness'], tip: 'Earth\u2019s magnetic field deflects charged solar particles. The ozone helps with UV, but the magnetosphere is the primary shield!', wrongFeedback: { 'Ozone layer': 'The ozone layer blocks UV radiation, but the magnetosphere deflects the solar wind \u2014 charged particles that would strip away our atmosphere entirely.', 'Gravity': 'Gravity holds our atmosphere, but doesn\u2019t deflect solar wind. Mars has enough gravity to hold some atmosphere but lost it without a magnetic field.', 'Atmosphere thickness': 'A thick atmosphere helps (Venus has one!) but without a magnetic field, solar wind gradually strips it away. Mars proves this!' }, difficulty: 2, concept: 'magnetosphere' },
            { q: 'Why is Pluto no longer classified as a planet?', a: 'It hasn\u2019t cleared its orbital zone', opts: ['It\u2019s too small', 'It\u2019s too far away', 'It hasn\u2019t cleared its orbital zone', 'It doesn\u2019t orbit the Sun'], tip: 'The IAU\u2019s 2006 definition requires planets to clear their orbital neighborhood of other debris.', wrongFeedback: { 'It\u2019s too small': 'Size isn\u2019t one of the IAU criteria! Mercury is only twice Pluto\u2019s diameter and is still a planet.', 'It\u2019s too far away': 'Distance from the Sun isn\u2019t a criterion for planet classification.', 'It doesn\u2019t orbit the Sun': 'Pluto does orbit the Sun! The issue is it shares its orbit with thousands of Kuiper Belt objects.' }, difficulty: 2, concept: 'planetary classification' },
            { q: 'What is the "habitable zone"?', a: 'Distance where liquid water can exist', opts: ['Where humans can breathe', 'Distance where liquid water can exist', 'Where there is no radiation', 'The warmest part of a solar system'], tip: 'Also called the "Goldilocks zone" \u2014 not too hot, not too cold for liquid water on the surface.', wrongFeedback: { 'Where humans can breathe': 'Breathability depends on atmosphere composition, not distance from the star. Venus is in the habitable zone but has no oxygen!', 'Where there is no radiation': 'Radiation exists everywhere in space. The habitable zone is about temperature for liquid water.', 'The warmest part of a solar system': 'The warmest zone is closest to the star, but that\u2019s too hot for liquid water. The habitable zone is the "just right" middle distance.' }, difficulty: 2, concept: 'habitable zone' },
            { q: 'Why do we always see the same side of the Moon?', a: 'Tidal locking', opts: ['The Moon doesn\u2019t rotate', 'Tidal locking', 'Earth\u2019s gravity is too strong', 'The dark side is always hidden'], tip: 'The Moon rotates exactly once per orbit \u2014 this synchronization is caused by tidal forces over billions of years.', wrongFeedback: { 'The Moon doesn\u2019t rotate': 'The Moon DOES rotate! It rotates exactly once per orbit (27.3 days), so the same face always points at Earth. This is called tidal locking.', 'Earth\u2019s gravity is too strong': 'Earth\u2019s gravity caused the tidal locking, but the result is synchronized rotation, not prevented rotation.', 'The dark side is always hidden': 'There\u2019s no permanent "dark side" \u2014 all parts of the Moon get sunlight. The far side is just the part we can\u2019t see from Earth.' }, difficulty: 3, concept: 'tidal locking' },
            { q: 'What evidence suggests Mars once had liquid water?', a: 'Hematite minerals and river channels', opts: ['Red color from rust', 'Hematite minerals and river channels', 'Polar ice caps', 'Thin atmosphere'], tip: 'Opportunity rover found hematite "blueberries" \u2014 minerals that only form in water. Orbital photos show ancient river deltas!', wrongFeedback: { 'Red color from rust': 'Iron oxide (rust) forms through oxidation, not necessarily water. Mars\u2019s red color comes from iron dust, not liquid water.', 'Polar ice caps': 'Mars\u2019s ice caps are mostly CO\u2082 (dry ice) with some water ice. They show water exists but not that it was ever liquid on the surface.', 'Thin atmosphere': 'The thin atmosphere actually makes liquid water impossible today! Low pressure causes water to boil or freeze instantly.' }, difficulty: 3, concept: 'evidence of water' }
          ];

          // ── Vocabulary Glossary ──
          var VOCAB = {
            'greenhouse effect': { def: 'When an atmosphere traps heat from the Sun, warming the surface. CO\u2082 and methane are key greenhouse gases.', grade: 4 },
            'habitable zone': { def: 'The distance range from a star where liquid water can exist on a planet\u2019s surface. Also called the "Goldilocks zone."', grade: 5 },
            'magnetosphere': { def: 'The region around a planet controlled by its magnetic field, which deflects charged particles from the solar wind.', grade: 6 },
            'tidal locking': { def: 'When a moon or planet rotates at the same rate it orbits, so one face always points toward the body it orbits.', grade: 6 },
            'density': { def: 'How much mass fits in a given volume. Measured in g/cm\u00B3. Water = 1.0. Objects with density < 1.0 float in water.', grade: 4 },
            'axial tilt': { def: 'The angle a planet\u2019s rotation axis is tilted relative to its orbit. Earth\u2019s 23.5\u00B0 tilt causes our seasons.', grade: 5 },
            'escape velocity': { def: 'The minimum speed needed to break free from a planet\u2019s gravity without further propulsion.', grade: 7 },
            'exosphere': { def: 'The outermost layer of an atmosphere, where atoms are so spread out they can escape into space.', grade: 6 },
            'tholins': { def: 'Complex reddish-brown organic molecules formed when UV light hits methane and nitrogen. Found on Pluto and Titan.', grade: 7 },
            'superionic ice': { def: 'A bizarre form of water ice where oxygen atoms are locked in a crystal but hydrogen atoms flow freely like a liquid. Found deep inside Uranus and Neptune.', grade: 8 },
            'extremophile': { def: 'An organism that thrives in extreme conditions (extreme heat, cold, pressure, or acidity) that would kill most life.', grade: 6 },
            'biosignature': { def: 'Any substance, element, isotope, or phenomenon that provides scientific evidence of past or present life.', grade: 7 },
            'Kuiper Belt': { def: 'A ring of icy bodies beyond Neptune\u2019s orbit, from 30 to 50 AU. Pluto is the most famous Kuiper Belt object.', grade: 5 },
            'AU (astronomical unit)': { def: 'The average distance from Earth to the Sun: about 150 million km. Used to measure distances within our solar system.', grade: 5 },
            'solar wind': { def: 'A stream of charged particles (mostly protons and electrons) constantly flowing outward from the Sun at 400-800 km/s.', grade: 6 },
            'albedo': { def: 'How much light a surface reflects. Fresh snow has high albedo (0.9); charcoal has low albedo (0.04). Affects planet temperature.', grade: 7 },
            'regolith': { def: 'The layer of loose rock, dust, and debris covering solid bedrock on a planet or moon. The Moon\u2019s surface is mostly regolith.', grade: 6 }
          };

          // ── Misconception Checkpoints (T/F) ──
          var MISCONCEPTIONS = [
            { statement: 'Mercury is the hottest planet because it\u2019s closest to the Sun.', answer: false, explanation: 'Venus is hotter (462\u00B0C vs 430\u00B0C)! Mercury has no atmosphere to trap heat. The greenhouse effect matters more than distance.', trigger: 'Mercury', concept: 'greenhouse effect' },
            { statement: 'Gas giants like Jupiter have solid surfaces you could stand on.', answer: false, explanation: 'Gas giants have no solid surface! They\u2019re mostly hydrogen and helium gas that gradually gets denser toward the core. A probe would sink endlessly.', trigger: 'descent_gas', concept: 'gas giant structure' },
            { statement: 'The Sun is closest to Earth at noon.', answer: false, explanation: 'Earth\u2019s distance from the Sun doesn\u2019t change during the day. Noon just means the Sun is highest in your sky. Earth is closest in January (perihelion)!', trigger: 'Earth', concept: 'orbital mechanics' },
            { statement: 'All planets are roughly the same size.', answer: false, explanation: 'Jupiter is 11x wider than Earth, and 1,300 Earths could fit inside it! The solar system has extreme size differences.', trigger: 'comparison', concept: 'scale' },
            { statement: 'Pluto was removed from the solar system when it was reclassified.', answer: false, explanation: 'Pluto is still in the solar system! It was reclassified from "planet" to "dwarf planet" in 2006, but it\u2019s still orbiting the Sun.', trigger: 'Pluto', concept: 'classification' },
            { statement: 'The asteroid belt is a dense field of rocks you\u2019d have to dodge through.', answer: false, explanation: 'The asteroid belt is mostly empty space! The average distance between asteroids is millions of km. Spacecraft fly through without any risk.', trigger: 'overview', concept: 'scale' },
            { statement: 'You would weigh more on any planet bigger than Earth.', answer: false, explanation: 'Not always! Saturn is 95x Earth\u2019s mass but surface gravity is only 1.06g because it\u2019s so large and low-density. Weight depends on both mass AND radius.', trigger: 'gravity', concept: 'gravity' },
            { statement: 'The Moon has a permanent "dark side" that never gets sunlight.', answer: false, explanation: 'All parts of the Moon receive sunlight! The "far side" is just the half we can\u2019t see from Earth due to tidal locking. It gets just as much Sun.', trigger: 'moons', concept: 'tidal locking' }
          ];

          // ── Science Concept Cards ──
          var CONCEPT_CARDS = {
            habitable_zone: { title: 'The Habitable Zone', icon: '\uD83C\uDF0D', color: '#22c55e', content: 'The habitable zone (or "Goldilocks zone") is the range of distances from a star where liquid water could exist on a planet\u2019s surface. In our solar system, Venus is at the inner edge, Earth is in the middle, and Mars is at the outer edge. But having liquid water also requires the right atmosphere and magnetic field!', planets: ['Venus', 'Earth', 'Mars'] },
            greenhouse: { title: 'The Greenhouse Effect', icon: '\u2600\uFE0F', color: '#f59e0b', content: 'When sunlight heats a planet\u2019s surface, the surface radiates heat (infrared). Greenhouse gases (CO\u2082, CH\u2084, H\u2082O) absorb this heat and re-radiate it, warming the planet. Earth\u2019s greenhouse is +33\u00B0C (life-sustaining). Venus\u2019s is +510\u00B0C (runaway). Mars has almost none (-60\u00B0C average). The amount of greenhouse gas determines the outcome!', planets: ['Venus', 'Earth', 'Mars'] },
            magnetosphere: { title: 'Magnetic Shields', icon: '\uD83E\uDDF2', color: '#3b82f6', content: 'A planet\u2019s magnetic field creates a "magnetosphere" \u2014 an invisible shield that deflects the solar wind (charged particles from the Sun). Earth\u2019s magnetosphere protects our atmosphere and makes life possible. Mars lost its magnetic field 4 billion years ago, and its atmosphere was gradually stripped away. Jupiter\u2019s magnetosphere is 20,000x stronger than Earth\u2019s!', planets: ['Earth', 'Mars', 'Jupiter'] },
            pluto_iau: { title: 'Why Isn\u2019t Pluto a Planet?', icon: '\uD83E\uDE90', color: '#8b5cf6', content: 'In 2006, the International Astronomical Union defined three criteria for a planet: (1) Orbits the Sun \u2713, (2) Has enough mass for round shape \u2713, (3) Has "cleared its orbit" of other debris \u2717. Pluto shares its orbital zone with thousands of Kuiper Belt objects, so it\u2019s classified as a "dwarf planet." This doesn\u2019t make it less interesting \u2014 New Horizons revealed it\u2019s geologically active!', planets: ['Pluto'] },
            tidal_locking: { title: 'Tidal Locking', icon: '\uD83C\uDF19', color: '#06b6d4', content: 'Over billions of years, gravitational tidal forces can slow a moon\u2019s rotation until it matches its orbital period. Result: one face always points at the planet. Our Moon is tidally locked to Earth. Mercury is partially locked to the Sun (3:2 ratio). Pluto and Charon are mutually locked \u2014 they always show the same face to each other!', planets: ['Earth', 'Mercury', 'Pluto'] },
            biosignatures: { title: 'Searching for Life', icon: '\uD83E\uDDA0', color: '#10b981', content: 'A biosignature is any evidence of past or present life. Scientists look for: (1) liquid water, (2) organic molecules, (3) atmospheric gases like oxygen or methane that shouldn\u2019t exist without life producing them, (4) energy sources. The best candidates in our solar system: Mars (ancient water), Europa (subsurface ocean), Enceladus (water geysers), and Titan (methane lakes).', planets: ['Mars', 'Jupiter', 'Saturn'] }
          };

          // ── Guided Learning Paths ──
          var LEARNING_PATHS = {
            tour_guide: { name: 'Tour Guide', icon: '\uD83D\uDE8C', desc: 'Guided tour for beginners (grades 3-5)', planets: ['Earth', 'Mars', 'Jupiter', 'Saturn', 'Pluto'], steps: [
              'Start with Earth \u2014 your home planet! Compare everything else to it.',
              'Visit Mars \u2014 the most Earth-like planet. Look for evidence of water.',
              'Explore Jupiter \u2014 feel the difference in gravity and size.',
              'See Saturn\u2019s rings \u2014 and learn they won\u2019t last forever.',
              'End with Pluto \u2014 and decide: should it be a planet?'
            ] },
            explorer: { name: 'Explorer', icon: '\uD83E\uDDED', desc: 'Self-directed exploration (grades 6-8)', planets: null, steps: [
              'Choose any planet that interests you.',
              'Use all 5 view modes (overview, surface, interior, descent, drone).',
              'Collect at least 3 geological samples.',
              'Complete 2 navigation challenges in drone mode.',
              'Compare your planet with another using the comparison tool.'
            ] },
            researcher: { name: 'Researcher', icon: '\uD83D\uDD2C', desc: 'Advanced investigation (grade 8+)', planets: null, steps: [
              'Form a hypothesis about one planet\u2019s most interesting feature.',
              'Collect evidence using scanner, samples, and observations.',
              'Use the AI Space Tutor to research your hypothesis.',
              'Compare at least 3 planets\u2019 atmospheres and interiors.',
              'Write a field journal entry summarizing your findings.'
            ] }
          };

          // ── Field Journal Template ──
          var journalEntries = d.journalEntries || [];
          function addJournalEntry(planet, prediction, observation, surprise, question) {
            var entry = { planet: planet, prediction: prediction, observation: observation, surprise: surprise, question: question, timestamp: Date.now(), samples: (d.collectedSamples || []).filter(function(s) { return s.planet === planet; }).length };
            var updated = journalEntries.concat([entry]);
            upd('journalEntries', updated);
            journalEntries = updated;
            if (addToast) addToast('\uD83D\uDCD3 Field journal entry saved for ' + planet + '!', 'success');
          }

          // ── Teacher Progress Tracking ──
          function exportProgressCSV() {
            var rows = [['Metric', 'Value', 'Details']];
            rows.push(['Planets Visited', planetsVisited.length + '/9', planetsVisited.join(', ') || 'None']);
            rows.push(['Quiz Score', (d.quiz ? d.quiz.score : 0) + '', 'Best streak: ' + (d.quiz ? d.quiz.streak : 0)]);
            rows.push(['Research Points', researchPoints + '', totalRP + ' total earned']);
            rows.push(['Challenges Completed', completedChallenges.length + '/' + CHALLENGES.length, completedChallenges.join(', ')]);
            rows.push(['Samples Collected', (d.collectedSamples || []).length + '', '']);
            rows.push(['Journal Entries', journalEntries.length + '', '']);
            rows.push(['Misconceptions Checked', (d.misconceptionsSeen || []).length + '/' + MISCONCEPTIONS.length, '']);
            rows.push(['POE Prompts Seen', (d.poeSeen || []).length + '/9', '']);
            var vocabSeen = d.vocabLookedUp || [];
            rows.push(['Vocabulary Explored', vocabSeen.length + '/' + Object.keys(VOCAB).length, vocabSeen.join(', ')]);
            // Active learning path
            rows.push(['Learning Path', d.learningPath || 'Free Explore', '']);
            // Per-planet detail
            PLANETS.forEach(function(p) {
              var visited = planetsVisited.indexOf(p.name) !== -1;
              var samples = (d.collectedSamples || []).filter(function(s) { return s.planet === p.name; }).length;
              var journal = journalEntries.filter(function(j) { return j.planet === p.name; }).length;
              rows.push([p.name, visited ? 'Visited' : 'Not visited', 'Samples: ' + samples + ', Journal: ' + journal]);
            });
            var csv = rows.map(function(r) { return r.map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
            var blob = new Blob([csv], { type: 'text/csv' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = 'solar_explorer_progress_' + new Date().toISOString().slice(0, 10) + '.csv';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (addToast) addToast('\uD83D\uDCCA Progress report exported!', 'success');
          }

          // ── Assignment Mode ──
          var PRESET_ASSIGNMENTS = [
            { id: 'inner_planets', name: 'Inner Planets Study', tasks: ['Visit Mercury, Venus, Earth, and Mars', 'Collect 2 samples from each rocky planet', 'Answer: Why is Venus hotter than Mercury?', 'Write a journal entry comparing Earth and Mars'], gradeRange: '4-6' },
            { id: 'gas_giants', name: 'Gas Giant Expedition', tasks: ['Visit Jupiter, Saturn, Uranus, and Neptune', 'Descend through Jupiter\u2019s atmosphere', 'Compare wind speeds across all 4 gas/ice giants', 'Explore the Great Red Spot in drone mode'], gradeRange: '5-8' },
            { id: 'habitability', name: 'Search for Life', tasks: ['Read the Habitable Zone concept card', 'Compare Earth, Mars, and Venus using the comparison tool', 'Collect biosignature-related samples', 'Write: What makes a planet habitable?'], gradeRange: '6-8' },
            { id: 'full_survey', name: 'Grand Tour Survey', tasks: ['Visit all 9 planets', 'Score 8+ on the quiz', 'Complete 3 navigation challenges', 'Write journal entries for 5 different planets', 'Export your progress report'], gradeRange: '6-8+' }
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



          // â"€â"€ Three.js 3D Canvas â"€â"€

          const canvasRef = function (canvas) {

            if (!canvas) { // cleanup on unmount â€" but skip if canvas is still alive (just a ref swap from re-render)

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



              // â"€â"€ Starfield â"€â"€

              const starGeo = new THREE.BufferGeometry();

              const starPos = new Float32Array(3000);

              for (let i = 0; i < 3000; i++) { starPos[i] = (Math.random() - 0.5) * 400; }

              starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

              scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8 })));



              // â"€â"€ Ambient light â"€â"€

              scene.add(new THREE.AmbientLight(0x222244, 0.3));



              // â"€â"€ Sun â"€â"€

              const sunGeo = new THREE.SphereGeometry(5.5, 32, 32);

              const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });

              const sun = new THREE.Mesh(sunGeo, sunMat);

              scene.add(sun);

              const sunLight = new THREE.PointLight(0xffffff, 1.5, 200);

              scene.add(sunLight);

              // Sun glow sprite

              const glowCanvas = document.createElement('canvas'); glowCanvas.setAttribute('aria-hidden', 'true'); glowCanvas.width = 128; glowCanvas.height = 128;

              const gctx = glowCanvas.getContext('2d');

              const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);

              grad.addColorStop(0, 'rgba(255,220,80,0.6)'); grad.addColorStop(0.4, 'rgba(255,180,40,0.2)'); grad.addColorStop(1, 'rgba(255,160,0,0)');

              gctx.fillStyle = grad; gctx.fillRect(0, 0, 128, 128);

              const glowTex = new THREE.CanvasTexture(glowCanvas);

              const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending }));

              glowSprite.scale.set(18, 18, 1);

              scene.add(glowSprite);



              // â"€â"€ Procedural planet texture â"€â"€

              function makePlanetTex(rgb, variation) {

                const c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); c.width = 128; c.height = 64;

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



              // â"€â"€ Create planets â"€â"€

              const planetMeshes = [];

              const orbitLines = [];

              PLANETS.forEach(function (p, idx) {

                // Orbit ring

                const orbitGeo = new THREE.RingGeometry(p.dist - 0.015, p.dist + 0.015, 128);

                const orbitMat = new THREE.MeshBasicMaterial({ color: p.color ? parseInt(p.color.replace('#', '0x')) : 0x556688, side: THREE.DoubleSide, transparent: true, opacity: 0.18 });

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

                // Starting orbital angle â€" spread planets out

                mesh._orbitAngle = (idx / PLANETS.length) * Math.PI * 2;

                mesh._orbitDist = p.dist;

                mesh._orbitSpeed = p.speed;

                mesh.position.set(Math.cos(mesh._orbitAngle) * p.dist, 0, Math.sin(mesh._orbitAngle) * p.dist);

                scene.add(mesh);

                planetMeshes.push(mesh);

                // Atmosphere glow — soft halo around planets with atmospheres
                if (p.atmosphere && p.atmosphere !== 'None' && p.atmosphere.indexOf('None') === -1) {
                  var glowSize = p.size * 2.4;
                  var glowCanvas = document.createElement('canvas'); glowCanvas.width = 128; glowCanvas.height = 128;
                  var gctx = glowCanvas.getContext('2d');
                  var glowGrad = gctx.createRadialGradient(64, 64, 20, 64, 64, 64);
                  glowGrad.addColorStop(0, 'rgba(' + Math.round(p.rgb[0]*255) + ',' + Math.round(p.rgb[1]*255) + ',' + Math.round(p.rgb[2]*255) + ',0.3)');
                  glowGrad.addColorStop(0.5, 'rgba(' + Math.round(p.rgb[0]*255) + ',' + Math.round(p.rgb[1]*255) + ',' + Math.round(p.rgb[2]*255) + ',0.1)');
                  glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
                  gctx.fillStyle = glowGrad; gctx.fillRect(0, 0, 128, 128);
                  var glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
                  glowSprite.scale.set(glowSize, glowSize, 1);
                  mesh.add(glowSprite);
                  mesh._atmosGlow = glowSprite;
                }

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

                  const ringCanvas = document.createElement('canvas'); ringCanvas.setAttribute('aria-hidden', 'true'); ringCanvas.width = 256; ringCanvas.height = 1;

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



              // â"€â"€ Asteroid belt (between Mars and Jupiter) â"€â"€

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




              // â"€â"€ Camera orbit controls (manual) â"€â"€

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



              // â"€â"€ Raycasting for planet clicks (smooth fly-to) â"€â"€

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
                  startPlanetAmbience(name);
                  if (typeof canvasNarrate === 'function') {
                    var pData = PLANETS[hitObj.userData.idx];
                    canvasNarrate('solarSystem', 'planet_select', {
                      first: 'Selected ' + name + '. ' + (pData ? pData.fact : ''),
                      repeat: name + ' selected.',
                      terse: name + '.'
                    }, { debounce: 500 });
                  }

                  focusedPlanetIdx = hitObj.userData.idx;

                  // Set smooth zoom target â€" closer for small planets, farther for giants

                  var radius = hitObj.geometry.parameters.radius;

                  targetDist = Math.max(3, Math.min(18, radius * 5));

                  // Set lookAt target to planet's current position (will be tracked each frame)

                  targetLookAt.copy(hitObj.position);

                  // Adjust camera angle for a nice viewing angle

                  camPhi = 0.8;

                } else {

                  // Clicked empty space — deselect, return to system view

                  upd('selectedPlanet', null); stopPlanetAmbience();

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



              // â"€â"€ Planet label overlay â"€â"€

              const labelContainer = canvas.parentElement.querySelector('.solar-labels');



              // â"€â"€ Animation loop â"€â"€

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



                // â"€â"€ Handle camera reset signal from Reset View button â"€â"€

                if (canvas.dataset.resetCamera === 'true') {

                  canvas.dataset.resetCamera = '';

                  focusedPlanetIdx = -1;

                  targetLookAt.set(0, 0, 0);

                  targetDist = 55;

                  camPhi = 1.0;

                  camTheta = 0.5;

                }



                // â"€â"€ Smooth camera tracking â"€â"€

                // If focused on a planet, update targetLookAt to follow it as it orbits

                if (focusedPlanetIdx >= 0 && focusedPlanetIdx < planetMeshes.length) {

                  var fp = planetMeshes[focusedPlanetIdx];

                  targetLookAt.copy(fp.position);

                }

                // Highlight selected planet's orbit ring
                orbitLines.forEach(function(ol, oi) {
                  var targetOp = (oi === focusedPlanetIdx) ? 0.5 : 0.18;
                  ol.material.opacity += (targetOp - ol.material.opacity) * 0.1;
                });

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



              // â"€â"€ Resize handler â"€â"€

              const resizeObserver = new ResizeObserver(function () {

                const w = canvas.clientWidth; const h = canvas.clientHeight;

                if (w && h) { camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); }

              });

              resizeObserver.observe(canvas);



              // â"€â"€ Cleanup â"€â"€

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

                stopPlanetAmbience();

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

                role: 'img',
                'aria-label': 'Interactive 3D solar system model. ' + (sel ? 'Viewing ' + sel.name + '. ' + sel.fact : 'Showing all 9 planets orbiting the Sun. Click a planet to explore it.'),
                tabIndex: 0,

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

                React.createElement("button", { "aria-label": "Toggle simulation playback",

                  onClick: () => upd('paused', !paused),

                  className: "px-2.5 py-1 rounded-lg text-xs font-bold " + (paused ? 'bg-emerald-700 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20') + " backdrop-blur-sm border border-white/10 transition-all"

                }, paused ? "\u25B6 Play" : "\u23F8 Pause"),

                React.createElement("div", { className: "flex items-center gap-1.5 flex-1 max-w-[180px] bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1 border border-white/10" },

                  React.createElement("span", { className: "text-[11px] text-white/60 font-bold whitespace-nowrap" }, "Speed"),

                  React.createElement("input", { type: "range", min: "0.1", max: "10", step: "0.1", value: simSpeed, 'aria-label': 'Simulation speed', onChange: e => upd('simSpeed', parseFloat(e.target.value)), className: "flex-1 accent-indigo-400", style: { height: '12px' } }),

                  React.createElement("span", { className: "text-[10px] text-indigo-300 font-bold min-w-[28px] text-right" }, simSpeed.toFixed(1) + "x")

                ),

                React.createElement("button", { "aria-label": "Reset View",

                  onClick: () => { upd('selectedPlanet', null); stopPlanetAmbience(); const c = document.querySelector('.solar3d-canvas'); if (c) { c.dataset.resetCamera = 'true'; } },

                  className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 text-white/70 hover:bg-white/20 border border-white/10 backdrop-blur-sm transition-all"

                }, "\uD83C\uDFE0 Reset View"),

                React.createElement("span", { className: "text-[11px] text-white/40 ml-auto hidden sm:inline" }, "Drag to orbit \u2022 Scroll to zoom \u2022 Click a planet")

              )

            ),

            // Planet buttons row

            React.createElement("div", { className: "flex gap-1 mt-2 flex-wrap justify-center" },

              PLANETS.map(p => React.createElement("button", { "aria-label": "Select planet: " + p.name,

                key: p.name,

                onClick: () => { upd('selectedPlanet', p.name); playPlanetSelect(p.dist || 1); startPlanetAmbience(p.name); if (typeof canvasNarrate === 'function') { canvasNarrate('solarSystem', 'planet_select', { first: 'Selected ' + p.name + '. ' + p.fact, repeat: p.name + ' selected.', terse: p.name + '.' }, { debounce: 500 }); } },

                className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + (d.selectedPlanet === p.name ? 'text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'),

                style: d.selectedPlanet === p.name ? { backgroundColor: p.color } : {}

              }, p.emoji + " " + p.name))

            ),

            // â"€â"€ Scale Explanation Collapsible â"€â"€

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

            // â"€â"€ Planet Info Card (Enhanced with Close-Up & Drone) â"€â"€

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

                  ['overview', 'surface', 'interior', 'descent', 'drone'].map(function (tab) {

                    var isGas = sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant';
                    var hasDescentData = !!DESCENT_LAYERS[sel.name];
                    if (tab === 'descent' && !hasDescentData) return null;

                    var tabLabels = {
                      overview: '\uD83D\uDCCA Overview',
                      surface: '\u26C5 Surface',
                      interior: '\uD83C\uDF0B Interior',
                      descent: '\uD83D\uDE80 Descent',
                      drone: isGas ? '\uD83D\uDEF8 Probe' : sel.terrainType === 'earthlike' ? '\uD83D\uDEA4 Submersible' : '\uD83D\uDE97 Rover'
                    };

                    return React.createElement("button", { "aria-label": "Switch to " + tab + " view tab",

                      key: tab, onClick: function () {
                        upd('viewTab', tab); playTabClick();
                        if (tab === 'interior') {
                          tryAward('gas_explorer');
                          var prev = d.interiorsViewed || [];
                          if (sel && prev.indexOf(sel.name) === -1) upd('interiorsViewed', prev.concat([sel.name]));
                        }
                        if (tab === 'descent') {
                          tryAward('atmosphere_descent');
                          var prevD = d.descentsDone || [];
                          if (sel && prevD.indexOf(sel.name) === -1) upd('descentsDone', prevD.concat([sel.name]));
                        }
                      },

                      className: "px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all " +

                        ((d.viewTab || 'overview') === tab ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-slate-300')

                    }, tabLabels[tab]);

                  })

                )

              ),



              // â"€â"€ OVERVIEW TAB â"€â"€

              (d.viewTab || 'overview') === 'overview' && React.createElement("div", null,

                React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 mb-3" },

                  [['\uD83C\uDF21', 'Temp', sel.temp], ['\u2600', 'Day', sel.dayLen], ['\uD83C\uDF0D', 'Year', sel.yearLen], ['\uD83D\uDCCF', 'Size', sel.diameter],

                  ['\u2696\uFE0F', 'Gravity', sel.gravity || 'Unknown'], ['\uD83C\uDF11', 'Moons', String(sel.moons)], ['\uD83C\uDF2C', 'Atmosphere', (sel.atmosphere || 'Unknown').substring(0, 30)], ['\uD83D\uDCA0', 'Type', sel.terrainType === 'gasgiant' ? 'Gas Giant' : sel.terrainType === 'icegiant' ? 'Ice Giant' : 'Rocky']

                  ].map(function (item) {

                    return React.createElement("div", { key: item[1], className: "bg-white rounded-xl p-2.5 text-center border border-slate-200 hover:border-indigo-200 transition-colors" },

                      React.createElement("p", { className: "text-[9px] text-slate-400 font-bold uppercase tracking-wider" }, item[0] + ' ' + item[1]),

                      React.createElement("p", { className: "text-xs font-bold text-slate-800 mt-0.5" }, item[2])

                    );

                  })

                ),

                // Visual comparison bars — gravity and size relative to Earth
                React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-3" },
                  // Gravity bar
                  React.createElement("div", { className: "bg-white rounded-xl p-2.5 border border-slate-200" },
                    React.createElement("div", { className: "flex justify-between items-center mb-1" },
                      React.createElement("span", { className: "text-[9px] font-bold text-slate-400 uppercase" }, "\u2696\uFE0F Gravity vs Earth"),
                      React.createElement("span", { className: "text-[10px] font-bold text-indigo-600" }, (GRAVITY_MAP[sel.name] || 1).toFixed(2) + 'g')
                    ),
                    React.createElement("div", { className: "w-full h-2.5 bg-slate-100 rounded-full overflow-hidden" },
                      React.createElement("div", { className: "h-full rounded-full transition-all duration-700", style: { width: Math.min(100, (GRAVITY_MAP[sel.name] || 1) * 42) + '%', background: 'linear-gradient(90deg, #6366f1, #818cf8)' } })
                    )
                  ),
                  // Size bar
                  React.createElement("div", { className: "bg-white rounded-xl p-2.5 border border-slate-200" },
                    React.createElement("div", { className: "flex justify-between items-center mb-1" },
                      React.createElement("span", { className: "text-[9px] font-bold text-slate-400 uppercase" }, "\uD83D\uDCCF Radius vs Earth"),
                      React.createElement("span", { className: "text-[10px] font-bold text-emerald-600" }, ((PLANET_RADII[sel.name] || 6371) / 6371).toFixed(2) + '\u00d7')
                    ),
                    React.createElement("div", { className: "w-full h-2.5 bg-slate-100 rounded-full overflow-hidden" },
                      React.createElement("div", { className: "h-full rounded-full transition-all duration-700", style: { width: Math.min(100, ((PLANET_RADII[sel.name] || 6371) / 6371) * 9) + '%', background: 'linear-gradient(90deg, #10b981, #34d399)' } })
                    )
                  )
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



              // â"€â"€ SURFACE TAB â"€â"€

              (d.viewTab) === 'surface' && React.createElement("div", { className: "space-y-3" },

                React.createElement("div", { className: "bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 text-white" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                    React.createElement("span", { className: "text-lg" }, "\uD83C\uDF0D"),

                    React.createElement("h5", { className: "font-bold text-sm" }, sel.name + " Surface Conditions")

                  ),

                  React.createElement("p", { className: "text-xs text-slate-300 leading-relaxed mb-3" }, sel.surfaceDesc || 'Surface data unavailable.'),

                  React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-2" },

                    [

                      ['\u2696\uFE0F Gravity', sel.gravity || '?'],

                      ['\uD83C\uDF21 Temperature', sel.temp],

                      ['\uD83C\uDF2C\uFE0F Atmosphere', (sel.atmosphere || 'None').split(' \u2014')[0]]

                    ].map(function (item) {

                      return React.createElement("div", { key: item[0], className: "bg-white/10 rounded-lg p-2 text-center backdrop-blur-sm" },

                        React.createElement("p", { className: "text-[11px] text-slate-500" }, item[0]),

                        React.createElement("p", { className: "text-xs font-bold" }, item[1])

                      );

                    })

                  ),
                  // Gravity comparison: your weight on this planet
                  (function() {
                    var gVal = parseFloat((sel.gravity || '0').replace('g', ''));
                    if (!gVal || sel.name === 'Earth') return null;
                    var earthWeight = 70; // kg reference
                    var planetWeight = Math.round(earthWeight * gVal);
                    return React.createElement("div", { className: "bg-white/5 rounded-lg p-2 flex items-center gap-2 border border-white/10" },
                      React.createElement("span", { className: "text-sm" }, "\uD83C\uDFCB\uFE0F"),
                      React.createElement("div", { className: "flex-1" },
                        React.createElement("p", { className: "text-[10px] text-slate-400" }, "If you weigh 70 kg on Earth:"),
                        React.createElement("p", { className: "text-xs font-bold " + (gVal > 1 ? 'text-red-400' : 'text-green-400') },
                          "You'd weigh " + planetWeight + " kg on " + sel.name + (gVal > 1 ? ' \u2014 heavier!' : gVal < 0.5 ? ' \u2014 you could jump ' + Math.round(1/gVal) + 'x higher!' : ' \u2014 lighter!'))
                      )
                    );
                  })()

                ),

                // â"€â"€ 2D Planet Surface Canvas â"€â"€

                React.createElement("div", { className: "relative rounded-2xl overflow-hidden border-2 shadow-xl", style: { height: '350px', borderColor: sel.color + '60' } },

                  React.createElement("canvas", {

                    "data-surface-canvas": "true",
                    role: "img",
                    "aria-label": sel.name + " surface view. " + (sel.surfaceDesc || sel.fact) + " Diameter: " + sel.diameter + ". Gravity: " + (sel.gravity || "unknown") + ". " + sel.moons + " moon" + (sel.moons !== 1 ? "s" : "") + ". Click planet, atmosphere, or moons to explore. Drag to rotate.",

                    style: { width: '100%', height: '100%', display: 'block' },

                    ref: function (cvEl) {

                      if (!cvEl || cvEl._surfInit === sel.name) return;

                      cvEl._surfInit = sel.name;

                      var ctx = cvEl.getContext('2d');

                      var W = cvEl.offsetWidth || 600, H = cvEl.offsetHeight || 350;

                      cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2);

                      var isGas = sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant';

                      var tick = 0;

                      // ── Interactive: store clickable regions each frame ──
                      var _moonHitAreas = []; // {x, y, r, moonIdx, name}
                      var _planetHitArea = { x: 0, y: 0, r: 0 };
                      var _atmoHitArea = { x: 0, y: 0, innerR: 0, outerR: 0 };
                      var _hoveredMoon = -1;
                      var _dragRotation = 0; // user drag rotation offset
                      var _isDragging = false;
                      var _dragStartX = 0;
                      var _featureLabels = []; // {x, y, r, name, desc} — clickable surface features
                      var _hoveredFeature = -1;

                      // Click handler for canvas interactions
                      cvEl.style.cursor = 'default';
                      cvEl.addEventListener('click', function(e) {
                        var rect = cvEl.getBoundingClientRect();
                        var mx = (e.clientX - rect.left) * (cvEl.width / 2 / rect.width);
                        var my = (e.clientY - rect.top) * (cvEl.height / 2 / rect.height);

                        // Check moon clicks
                        for (var mi = 0; mi < _moonHitAreas.length; mi++) {
                          var mh = _moonHitAreas[mi];
                          var dist = Math.sqrt((mx - mh.x) * (mx - mh.x) + (my - mh.y) * (my - mh.y));
                          if (dist < mh.r + 8) { // generous hit area
                            upd('surfaceExplore', 'moons');
                            return;
                          }
                        }
                        // Check atmosphere ring click
                        var adist = Math.sqrt((mx - _atmoHitArea.x) * (mx - _atmoHitArea.x) + (my - _atmoHitArea.y) * (my - _atmoHitArea.y));
                        if (adist > _planetHitArea.r && adist < _atmoHitArea.outerR) {
                          upd('surfaceExplore', d.surfaceExplore === 'atmosphere' ? null : 'atmosphere');
                          return;
                        }
                        // Check planet body click
                        var pdist = Math.sqrt((mx - _planetHitArea.x) * (mx - _planetHitArea.x) + (my - _planetHitArea.y) * (my - _planetHitArea.y));
                        if (pdist < _planetHitArea.r) {
                          upd('surfaceExplore', d.surfaceExplore === 'composition' ? null : 'composition');
                          return;
                        }
                      });

                      // Mousemove for hover cursor + drag-to-rotate
                      cvEl.addEventListener('mousedown', function(e) {
                        var rect = cvEl.getBoundingClientRect();
                        var mx = (e.clientX - rect.left) * (cvEl.width / 2 / rect.width);
                        var my = (e.clientY - rect.top) * (cvEl.height / 2 / rect.height);
                        var pdist = Math.sqrt((mx - _planetHitArea.x) * (mx - _planetHitArea.x) + (my - _planetHitArea.y) * (my - _planetHitArea.y));
                        if (pdist < _planetHitArea.r * 1.1) {
                          _isDragging = true;
                          _dragStartX = e.clientX;
                          cvEl.style.cursor = 'grabbing';
                        }
                      });
                      cvEl.addEventListener('mouseup', function() { _isDragging = false; });
                      cvEl.addEventListener('mouseleave', function() { _isDragging = false; });
                      cvEl.addEventListener('mousemove', function(e) {
                        if (_isDragging) {
                          _dragRotation += (e.clientX - _dragStartX) * 0.008;
                          _dragStartX = e.clientX;
                          cvEl.style.cursor = 'grabbing';
                          return;
                        }
                        var rect = cvEl.getBoundingClientRect();
                        var mx = (e.clientX - rect.left) * (cvEl.width / 2 / rect.width);
                        var my = (e.clientY - rect.top) * (cvEl.height / 2 / rect.height);
                        var overMoon = false;
                        _hoveredMoon = -1;
                        for (var mi = 0; mi < _moonHitAreas.length; mi++) {
                          var mh = _moonHitAreas[mi];
                          var dist = Math.sqrt((mx - mh.x) * (mx - mh.x) + (my - mh.y) * (my - mh.y));
                          if (dist < mh.r + 8) { overMoon = true; _hoveredMoon = mi; break; }
                        }
                        var adist = Math.sqrt((mx - _atmoHitArea.x) * (mx - _atmoHitArea.x) + (my - _atmoHitArea.y) * (my - _atmoHitArea.y));
                        var pdist = Math.sqrt((mx - _planetHitArea.x) * (mx - _planetHitArea.x) + (my - _planetHitArea.y) * (my - _planetHitArea.y));
                        var overAtmo = adist > _planetHitArea.r && adist < _atmoHitArea.outerR;
                        var overPlanet = pdist < _planetHitArea.r;
                        // Check feature labels hover
                        var overFeature = false;
                        _hoveredFeature = -1;
                        for (var fi2 = 0; fi2 < _featureLabels.length; fi2++) {
                          var fl = _featureLabels[fi2];
                          var fdist = Math.sqrt((mx - fl.x) * (mx - fl.x) + (my - fl.y) * (my - fl.y));
                          if (fdist < fl.r + 5) { overFeature = true; _hoveredFeature = fi2; break; }
                        }
                        cvEl.style.cursor = overFeature ? 'help' : overPlanet ? 'grab' : (overMoon || overAtmo) ? 'pointer' : 'default';
                      });

                      function drawPlanet() {

                        tick++;

                        ctx.clearRect(0, 0, W, H);

                        // Space background with nebula hints
                        var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
                        bgGrad.addColorStop(0, '#010108');
                        bgGrad.addColorStop(0.3, '#020214');
                        bgGrad.addColorStop(0.7, '#06061e');
                        bgGrad.addColorStop(1, '#0a0a2e');
                        ctx.fillStyle = bgGrad;
                        ctx.fillRect(0, 0, W, H);

                        // Subtle nebula cloud
                        ctx.globalAlpha = 0.02;
                        var nebColors = ['#4a2080', '#203060', '#602040'];
                        for (var ni = 0; ni < 3; ni++) {
                          var nx = W * (0.15 + ni * 0.35);
                          var ny = H * (0.2 + ni * 0.2);
                          var nebGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, W * 0.25);
                          nebGrad.addColorStop(0, nebColors[ni]);
                          nebGrad.addColorStop(1, 'transparent');
                          ctx.fillStyle = nebGrad;
                          ctx.fillRect(0, 0, W, H);
                        }
                        ctx.globalAlpha = 1;

                        // Rich starfield with colored stars and varied sizes
                        var starColors = ['#ffffff', '#ffffff', '#ffffff', '#ffe8c0', '#c0d0ff', '#ffd0d0', '#d0ffd0'];
                        for (var si = 0; si < 200; si++) {
                          var sx = ((si * 137 + 29) % W);
                          var sy = ((si * 211 + 17) % H);
                          var sb = 0.1 + 0.3 * Math.sin(tick * 0.012 + si * 0.9);
                          var starSize = si % 7 === 0 ? 1.8 : si % 4 === 0 ? 1.2 : 0.6;
                          ctx.globalAlpha = sb * (starSize > 1 ? 1.2 : 0.8);
                          ctx.fillStyle = starColors[si % starColors.length];
                          ctx.beginPath();
                          ctx.arc(sx, sy, starSize, 0, Math.PI * 2);
                          ctx.fill();
                          // Star cross-flare for bright stars
                          if (starSize > 1.5 && sb > 0.3) {
                            ctx.globalAlpha = sb * 0.3;
                            ctx.strokeStyle = ctx.fillStyle;
                            ctx.lineWidth = 0.3;
                            ctx.beginPath();
                            ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy);
                            ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy + 4);
                            ctx.stroke();
                          }
                        }
                        ctx.globalAlpha = 1;

                        // Planet

                        var cx = W * 0.5, cy = H * 0.5;

                        var planetR = Math.min(W, H) * 0.38;

                        // Store hit areas for interactivity
                        _planetHitArea = { x: cx, y: cy, r: planetR };
                        _atmoHitArea = { x: cx, y: cy, innerR: planetR, outerR: planetR * 1.25 };
                        _moonHitAreas = [];
                        _featureLabels = [];

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

                        // Surface features — planet-specific rich detail
                        if (isGas) {
                          // Cloud bands with varying widths and colors
                          var bandColors = sel.name === 'Jupiter' ? ['rgba(180,120,60,', 'rgba(220,180,120,', 'rgba(160,100,50,', 'rgba(200,160,100,', 'rgba(140,90,40,', 'rgba(230,200,140,', 'rgba(170,110,55,', 'rgba(190,140,80,'] :
                            sel.name === 'Saturn' ? ['rgba(200,170,100,', 'rgba(220,190,130,', 'rgba(180,150,80,', 'rgba(210,180,120,', 'rgba(190,160,90,', 'rgba(230,200,140,', 'rgba(170,140,70,', 'rgba(200,170,100,'] :
                            ['rgba(100,160,160,', 'rgba(80,140,140,', 'rgba(120,180,180,', 'rgba(90,150,150,', 'rgba(110,170,170,', 'rgba(70,130,130,', 'rgba(100,160,160,', 'rgba(85,145,145,'];
                          for (var bi = 0; bi < 10; bi++) {
                            var bandH = planetR * 2 / 10;
                            var by = cy - planetR + bi * bandH;
                            var wave = Math.sin(tick * 0.008 + bi * 1.5) * 3 + Math.sin(tick * 0.003 + bi * 0.7) * 2;
                            var bandAlpha = 0.06 + 0.04 * Math.sin(bi * 1.8);
                            ctx.fillStyle = bandColors[bi % bandColors.length] + bandAlpha + ')';
                            ctx.fillRect(cx - planetR, by + wave - bandH * 0.6, planetR * 2, bandH * 1.2);
                            // Turbulent edge eddies
                            if (bi % 3 === 0) {
                              for (var ei = 0; ei < 4; ei++) {
                                var ex = cx - planetR * 0.6 + ei * planetR * 0.35 + Math.sin(tick * 0.005 + ei) * 8;
                                ctx.fillStyle = bandColors[(bi + 1) % bandColors.length] + '0.05)';
                                ctx.beginPath();
                                ctx.ellipse(ex, by + wave, 8 + ei * 2, 4, tick * 0.002 + ei, 0, Math.PI * 2);
                                ctx.fill();
                              }
                            }
                          }
                          // Great Red Spot (Jupiter) or hexagonal vortex indicator (Saturn)
                          if (sel.name === 'Jupiter') {
                            var spotPhase = tick * 0.004 + _dragRotation;
                            var spotX = cx + Math.cos(spotPhase) * planetR * 0.25;
                            var spotY = cy + planetR * 0.18;
                            // Register GRS as hoverable feature
                            if (Math.sqrt(Math.pow(spotX - cx, 2) + Math.pow(spotY - cy, 2)) < planetR * 0.9) {
                              _featureLabels.push({ x: spotX, y: spotY, r: planetR * 0.15, name: 'Great Red Spot', desc: 'Storm raging 350+ years, larger than Earth' });
                            }
                            // Outer swirl
                            ctx.save();
                            ctx.translate(spotX, spotY);
                            ctx.rotate(tick * 0.003);
                            var grsGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, planetR * 0.18);
                            grsGrad.addColorStop(0, 'rgba(200,80,30,0.35)');
                            grsGrad.addColorStop(0.5, 'rgba(180,60,20,0.2)');
                            grsGrad.addColorStop(1, 'rgba(160,50,15,0)');
                            ctx.fillStyle = grsGrad;
                            ctx.beginPath();
                            ctx.ellipse(0, 0, planetR * 0.2, planetR * 0.11, 0.15, 0, Math.PI * 2);
                            ctx.fill();
                            // Inner eye
                            ctx.fillStyle = 'rgba(220,100,40,0.3)';
                            ctx.beginPath();
                            ctx.ellipse(0, 0, planetR * 0.08, planetR * 0.045, 0, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                          } else if (sel.name === 'Saturn') {
                            // Hexagonal polar vortex hint at top
                            _featureLabels.push({ x: cx, y: cy - planetR * 0.75, r: planetR * 0.15, name: 'Hexagonal Vortex', desc: 'Persistent hexagon at north pole, 14,500 km per side' });
                            ctx.save();
                            ctx.globalAlpha = 0.12;
                            ctx.strokeStyle = '#eab308';
                            ctx.lineWidth = 1;
                            ctx.translate(cx, cy - planetR * 0.75);
                            ctx.rotate(tick * 0.002);
                            ctx.beginPath();
                            for (var hi = 0; hi < 7; hi++) {
                              var ha = hi * Math.PI * 2 / 6;
                              var hx = Math.cos(ha) * planetR * 0.18;
                              var hy = Math.sin(ha) * planetR * 0.08;
                              hi === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
                            }
                            ctx.closePath();
                            ctx.stroke();
                            ctx.restore();
                          }
                        } else if (sel.terrainType === 'earthlike') {
                          // Earth: continents + ocean areas
                          ctx.globalAlpha = 0.3;
                          // Simplified continent shapes as organic blobs
                          var continents = [
                            { x: -0.2, y: -0.15, w: 0.25, h: 0.35, color: '#2d6a4f' }, // Americas-like
                            { x: 0.15, y: -0.25, w: 0.2, h: 0.2, color: '#40916c' },   // Europe/Africa-like
                            { x: 0.35, y: -0.1, w: 0.15, h: 0.25, color: '#52b788' },  // Asia-like
                            { x: 0.25, y: 0.3, w: 0.18, h: 0.12, color: '#74c69d' },   // Australia-like
                            { x: -0.1, y: 0.35, w: 0.3, h: 0.1, color: '#d8f3dc' },    // Antarctica-like
                          ];
                          var rotPhase = tick * 0.003 + _dragRotation; // slow auto-rotation + drag
                          continents.forEach(function(cont) {
                            var contX = cx + (cont.x + Math.sin(rotPhase) * 0.1) * planetR * 1.5;
                            var contY = cy + cont.y * planetR * 1.5;
                            if (Math.sqrt(Math.pow(contX - cx, 2) + Math.pow(contY - cy, 2)) < planetR * 0.85) {
                              ctx.fillStyle = cont.color;
                              ctx.beginPath();
                              ctx.ellipse(contX, contY, cont.w * planetR, cont.h * planetR, rotPhase * 0.3, 0, Math.PI * 2);
                              ctx.fill();
                            }
                          });
                          ctx.globalAlpha = 1;
                          // Ocean blue tint
                          ctx.fillStyle = 'rgba(30,80,150,0.08)';
                          ctx.fillRect(cx - planetR, cy - planetR, planetR * 2, planetR * 2);
                          // Ocean depth zone indicator (right edge)
                          ctx.save();
                          ctx.beginPath(); ctx.arc(cx, cy, planetR, 0, Math.PI * 2); ctx.clip();
                          var depthZones = [
                            { y: 0, h: 0.15, color: 'rgba(14,165,233,0.06)', label: 'Sunlight' },
                            { y: 0.15, h: 0.15, color: 'rgba(3,105,161,0.06)', label: 'Twilight' },
                            { y: 0.30, h: 0.20, color: 'rgba(30,58,138,0.06)', label: 'Midnight' },
                            { y: 0.50, h: 0.25, color: 'rgba(15,23,42,0.06)', label: 'Abyssal' },
                            { y: 0.75, h: 0.25, color: 'rgba(0,10,20,0.08)', label: 'Hadal' }
                          ];
                          depthZones.forEach(function(dz) {
                            ctx.fillStyle = dz.color;
                            ctx.fillRect(cx - planetR, cy - planetR + dz.y * planetR * 2, planetR * 2, dz.h * planetR * 2);
                          });
                          ctx.restore();
                          // Feature labels
                          _featureLabels.push({ x: cx - planetR * 0.3, y: cy - planetR * 0.2, r: planetR * 0.15, name: 'Pacific Ocean', desc: 'Largest ocean \u2014 covers more area than all land combined (165.25 million km\u00B2)' });
                          _featureLabels.push({ x: cx + planetR * 0.2, y: cy + planetR * 0.15, r: planetR * 0.1, name: 'Mid-Ocean Ridge', desc: '65,000 km underwater mountain chain where new ocean floor is born' });
                        } else if (sel.terrainType === 'desert') {
                          // Mars: Valles Marineris canyon scar + Olympus Mons
                          _featureLabels.push({ x: cx - planetR * 0.35, y: cy - planetR * 0.2, r: planetR * 0.12, name: 'Olympus Mons', desc: 'Tallest volcano in the solar system (21.9 km)' });
                          _featureLabels.push({ x: cx + planetR * 0.1, y: cy + planetR * 0.05, r: planetR * 0.2, name: 'Valles Marineris', desc: '4,000 km canyon system, 7 km deep' });
                          ctx.globalAlpha = 0.15;
                          // Canyon scar across equator
                          ctx.strokeStyle = '#6b2a1a';
                          ctx.lineWidth = 3;
                          ctx.beginPath();
                          var canyonY = cy + planetR * 0.05;
                          ctx.moveTo(cx - planetR * 0.6, canyonY - 2);
                          ctx.bezierCurveTo(cx - planetR * 0.2, canyonY + 5, cx + planetR * 0.1, canyonY - 3, cx + planetR * 0.5, canyonY + 1);
                          ctx.stroke();
                          // Olympus Mons (large light circle)
                          ctx.fillStyle = '#c9653a';
                          ctx.beginPath();
                          ctx.arc(cx - planetR * 0.35, cy - planetR * 0.2, planetR * 0.12, 0, Math.PI * 2);
                          ctx.fill();
                          ctx.strokeStyle = 'rgba(180,120,80,0.2)';
                          ctx.lineWidth = 1;
                          ctx.beginPath();
                          ctx.arc(cx - planetR * 0.35, cy - planetR * 0.2, planetR * 0.15, 0, Math.PI * 2);
                          ctx.stroke();
                          ctx.globalAlpha = 1;
                          // Dust texture across surface
                          for (var di = 0; di < 20; di++) {
                            var dx = cx + ((di * 83 + 41) % Math.floor(planetR * 1.4)) - planetR * 0.7;
                            var dy = cy + ((di * 61 + 23) % Math.floor(planetR * 1.2)) - planetR * 0.6;
                            if (Math.sqrt((dx - cx) * (dx - cx) + (dy - cy) * (dy - cy)) < planetR * 0.9) {
                              ctx.fillStyle = 'rgba(0,0,0,0.04)';
                              ctx.beginPath();
                              ctx.ellipse(dx, dy, 4 + di % 6, 2 + di % 3, di * 0.5, 0, Math.PI * 2);
                              ctx.fill();
                            }
                          }
                        } else if (sel.terrainType === 'volcanic') {
                          // Venus: lava flows + volcanic calderas
                          _featureLabels.push({ x: cx - planetR * 0.2, y: cy - planetR * 0.25, r: planetR * 0.12, name: 'Maxwell Montes', desc: 'Highest point on Venus at 11 km \u2014 coated in metallic "snow" of lead and bismuth sulfide' });
                          _featureLabels.push({ x: cx + planetR * 0.25, y: cy - planetR * 0.3, r: planetR * 0.15, name: 'Ishtar Terra', desc: 'Highland continent (Australia-sized) containing Maxwell Montes \u2014 one of two main "continents"' });
                          _featureLabels.push({ x: cx + planetR * 0.1, y: cy + planetR * 0.2, r: planetR * 0.12, name: 'Aphrodite Terra', desc: 'Largest highland region \u2014 stretches along the equator like a vast volcanic plateau' });
                          for (var vfi = 0; vfi < 6; vfi++) {
                            var vfx = cx + ((vfi * 79 + 17) % Math.floor(planetR * 1.4)) - planetR * 0.7;
                            var vfy = cy + ((vfi * 53 + 31) % Math.floor(planetR * 1.2)) - planetR * 0.6;
                            if (Math.sqrt((vfx - cx) * (vfx - cx) + (vfy - cy) * (vfy - cy)) < planetR * 0.8) {
                              // Caldera
                              ctx.fillStyle = 'rgba(200,100,20,' + (0.08 + Math.sin(tick * 0.02 + vfi) * 0.04) + ')';
                              ctx.beginPath();
                              ctx.arc(vfx, vfy, 5 + vfi % 4 * 3, 0, Math.PI * 2);
                              ctx.fill();
                              // Lava glow
                              var lavaGlow = ctx.createRadialGradient(vfx, vfy, 0, vfx, vfy, 8 + vfi * 2);
                              lavaGlow.addColorStop(0, 'rgba(255,100,0,' + (0.06 + Math.sin(tick * 0.03 + vfi * 2) * 0.03) + ')');
                              lavaGlow.addColorStop(1, 'rgba(255,50,0,0)');
                              ctx.fillStyle = lavaGlow;
                              ctx.beginPath();
                              ctx.arc(vfx, vfy, 10 + vfi * 3, 0, Math.PI * 2);
                              ctx.fill();
                            }
                          }
                        } else if (sel.terrainType === 'iceworld') {
                          // Pluto/iceworld: Tombaugh Regio heart + icy craters
                          // Heart-shaped bright region
                          var heartX = cx + Math.sin(_dragRotation + tick * 0.003) * planetR * 0.15;
                          var heartY = cy - planetR * 0.05;
                          ctx.globalAlpha = 0.2;
                          ctx.fillStyle = '#e8ddd0';
                          // Draw heart shape from two arcs + triangle
                          ctx.beginPath();
                          var hs = planetR * 0.18;
                          ctx.moveTo(heartX, heartY + hs * 0.6);
                          ctx.bezierCurveTo(heartX + hs * 0.8, heartY - hs * 0.3, heartX + hs * 0.5, heartY - hs * 0.8, heartX, heartY - hs * 0.3);
                          ctx.bezierCurveTo(heartX - hs * 0.5, heartY - hs * 0.8, heartX - hs * 0.8, heartY - hs * 0.3, heartX, heartY + hs * 0.6);
                          ctx.fill();
                          // Inner brighter region (Sputnik Planitia)
                          ctx.globalAlpha = 0.12;
                          ctx.fillStyle = '#f0ece0';
                          ctx.beginPath();
                          ctx.ellipse(heartX - hs * 0.15, heartY, hs * 0.35, hs * 0.4, 0.1, 0, Math.PI * 2);
                          ctx.fill();
                          ctx.globalAlpha = 1;
                          _featureLabels.push({ x: heartX, y: heartY, r: hs, name: 'Tombaugh Regio', desc: 'Heart-shaped nitrogen glacier \u2014 Sputnik Planitia ice plain' });
                          // Dark reddish Cthulhu Macula
                          ctx.globalAlpha = 0.1;
                          ctx.fillStyle = '#6b3a2a';
                          var cthX = cx + planetR * 0.3 + Math.sin(_dragRotation) * 5;
                          ctx.beginPath();
                          ctx.ellipse(cthX, cy + planetR * 0.15, planetR * 0.2, planetR * 0.1, 0.3, 0, Math.PI * 2);
                          ctx.fill();
                          ctx.globalAlpha = 1;
                          _featureLabels.push({ x: cthX, y: cy + planetR * 0.15, r: planetR * 0.15, name: 'Cthulhu Macula', desc: 'Dark region colored by tholins \u2014 complex organic molecules' });
                          // Icy craters
                          for (var ici = 0; ici < 12; ici++) {
                            var icx = cx + ((ici * 97 + 31) % Math.floor(planetR * 1.4)) - planetR * 0.7;
                            var icy2 = cy + ((ici * 73 + 17) % Math.floor(planetR * 1.2)) - planetR * 0.6;
                            var icr = 2 + (ici % 5) * 2;
                            if (Math.sqrt((icx - cx) * (icx - cx) + (icy2 - cy) * (icy2 - cy)) + icr < planetR * 0.9) {
                              ctx.fillStyle = 'rgba(200,210,220,0.06)';
                              ctx.beginPath(); ctx.arc(icx, icy2, icr, 0, Math.PI * 2); ctx.fill();
                            }
                          }
                        } else {
                          // Generic rocky: craters with varied sizes + depth shadows
                          for (var ci = 0; ci < 20; ci++) {
                            var crx = cx + ((ci * 97 + 31) % Math.floor(planetR * 1.6)) - planetR * 0.8;
                            var cry = cy + ((ci * 73 + 17) % Math.floor(planetR * 1.4)) - planetR * 0.7;
                            var crr = 2 + (ci % 7) * 3;
                            if (Math.sqrt((crx - cx) * (crx - cx) + (cry - cy) * (cry - cy)) + crr < planetR) {
                              // Crater shadow (darker on sunward side)
                              ctx.fillStyle = 'rgba(0,0,0,' + (0.06 + crr * 0.005) + ')';
                              ctx.beginPath();
                              ctx.arc(crx + 1, cry + 1, crr, 0, Math.PI * 2);
                              ctx.fill();
                              // Crater rim highlight
                              ctx.strokeStyle = 'rgba(255,255,255,' + (0.04 + crr * 0.003) + ')';
                              ctx.lineWidth = 0.6;
                              ctx.beginPath();
                              ctx.arc(crx - 1, cry - 1, crr, Math.PI * 0.8, Math.PI * 1.8);
                              ctx.stroke();
                              // Central peak for large craters
                              if (crr > 10) {
                                ctx.fillStyle = 'rgba(255,255,255,0.04)';
                                ctx.beginPath();
                                ctx.arc(crx, cry, crr * 0.2, 0, Math.PI * 2);
                                ctx.fill();
                              }
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

                        ctx.fillText(sel.emoji + ' ' + sel.name, cx, H - 28);

                        ctx.font = '10px system-ui, sans-serif';

                        ctx.fillStyle = '#94a3b8';

                        ctx.fillText(sel.diameter + ' \u2022 ' + (sel.gravity || '?'), cx, H - 15);

                        // Interactive hint
                        ctx.font = '8px system-ui, sans-serif';
                        ctx.fillStyle = 'rgba(129,140,248,' + (0.3 + 0.2 * Math.sin(tick * 0.03)) + ')';
                        ctx.fillText('\uD83D\uDC46 Click to explore \u2022 Drag planet to rotate', cx, H - 3);

                        // === Feature hover labels ===
                        if (_hoveredFeature >= 0 && _hoveredFeature < _featureLabels.length) {
                          var hf = _featureLabels[_hoveredFeature];
                          // Highlight ring around feature
                          ctx.save();
                          ctx.strokeStyle = 'rgba(129,140,248,0.6)';
                          ctx.lineWidth = 1.5;
                          ctx.setLineDash([3, 3]);
                          ctx.beginPath();
                          ctx.arc(hf.x, hf.y, hf.r + 3, 0, Math.PI * 2);
                          ctx.stroke();
                          ctx.setLineDash([]);
                          // Label card with connecting line
                          var labelX = hf.x < cx ? hf.x - planetR * 0.35 : hf.x + planetR * 0.35;
                          var labelY = hf.y < cy ? hf.y - 25 : hf.y + 25;
                          // Keep label within canvas bounds
                          labelX = Math.max(70, Math.min(W - 70, labelX));
                          labelY = Math.max(20, Math.min(H - 30, labelY));
                          // Connecting line
                          ctx.strokeStyle = 'rgba(129,140,248,0.4)';
                          ctx.lineWidth = 0.8;
                          ctx.beginPath();
                          ctx.moveTo(hf.x, hf.y);
                          ctx.lineTo(labelX, labelY);
                          ctx.stroke();
                          // Label background
                          ctx.fillStyle = 'rgba(15,23,42,0.85)';
                          var nameWidth = ctx.measureText(hf.name).width;
                          var labelW = Math.max(nameWidth + 16, 80);
                          ctx.beginPath();
                          ctx.roundRect(labelX - labelW / 2, labelY - 18, labelW, 32, 6);
                          ctx.fill();
                          ctx.strokeStyle = 'rgba(129,140,248,0.4)';
                          ctx.lineWidth = 0.5;
                          ctx.stroke();
                          // Label text
                          ctx.fillStyle = '#c7d2fe';
                          ctx.font = 'bold 10px system-ui, sans-serif';
                          ctx.textAlign = 'center';
                          ctx.fillText(hf.name, labelX, labelY - 5);
                          ctx.fillStyle = '#94a3b8';
                          ctx.font = '7px system-ui, sans-serif';
                          ctx.fillText(hf.desc, labelX, labelY + 7);
                          ctx.restore();
                        }

                        // === ENHANCED: Orbiting moons (clickable) ===
                        var moonCount = Math.min(sel.moons, 6); // show up to 6 moons
                        var notableMoonNames = (NOTABLE_MOONS[sel.name] || []).map(function(m) { return m.name; });
                        if (moonCount > 0) {
                          for (var mi = 0; mi < moonCount; mi++) {
                            var moonOrbitR = planetR * 1.3 + mi * 18;
                            var moonAngle = tick * (0.008 + mi * 0.003) + mi * (Math.PI * 2 / moonCount);
                            var mx = cx + Math.cos(moonAngle) * moonOrbitR;
                            var my = cy + Math.sin(moonAngle) * moonOrbitR * 0.35; // elliptical
                            var moonR = 2.5 + (mi === 0 ? 2 : 0); // largest moon is bigger
                            var isHovered = _hoveredMoon === mi;
                            // orbit path
                            ctx.strokeStyle = isHovered ? 'rgba(129,140,248,0.25)' : 'rgba(255,255,255,0.06)';
                            ctx.lineWidth = isHovered ? 1 : 0.5;
                            ctx.beginPath();
                            ctx.ellipse(cx, cy, moonOrbitR, moonOrbitR * 0.35, 0, 0, Math.PI * 2);
                            ctx.stroke();
                            // hover glow ring
                            if (isHovered) {
                              ctx.save();
                              ctx.strokeStyle = 'rgba(129,140,248,0.5)';
                              ctx.lineWidth = 2;
                              ctx.shadowColor = '#818cf8';
                              ctx.shadowBlur = 10;
                              ctx.beginPath();
                              ctx.arc(mx, my, moonR + 4, 0, Math.PI * 2);
                              ctx.stroke();
                              ctx.restore();
                            }
                            // moon body
                            var moonGrad = ctx.createRadialGradient(mx - 1, my - 1, 0, mx, my, moonR);
                            moonGrad.addColorStop(0, isHovered ? '#c7d2fe' : '#e2e8f0');
                            moonGrad.addColorStop(1, isHovered ? '#818cf8' : '#64748b');
                            ctx.fillStyle = moonGrad;
                            ctx.beginPath();
                            ctx.arc(mx, my, isHovered ? moonR + 1 : moonR, 0, Math.PI * 2);
                            ctx.fill();
                            // Moon name label on hover
                            if (isHovered && notableMoonNames[mi]) {
                              ctx.save();
                              ctx.font = 'bold 9px system-ui, sans-serif';
                              ctx.fillStyle = '#c7d2fe';
                              ctx.textAlign = 'center';
                              ctx.fillText(notableMoonNames[mi], mx, my - moonR - 6);
                              ctx.restore();
                            }
                            // Store hit area for click detection
                            _moonHitAreas.push({ x: mx, y: my, r: moonR, moonIdx: mi, name: notableMoonNames[mi] || 'Moon ' + (mi + 1) });
                          }
                        }

                        // === ENHANCED: Saturn rings in surface view (detailed multi-band) ===
                        if (sel.hasRings) {
                          ctx.save();
                          var ringTilt = -0.15;
                          var ringBands = [
                            // [innerR multiplier, width, alpha, color, name]
                            [1.12, 4, 0.08, '#d4c090', 'D Ring'],
                            [1.18, 8, 0.35, '#c9a04a', 'C Ring'],
                            [1.28, 14, 0.5, '#eab308', 'B Ring (brightest)'],
                            // Cassini Division (gap)
                            [1.47, 3, 0.06, '#222222', 'Cassini Division'],
                            [1.51, 12, 0.4, '#d4a017', 'A Ring'],
                            // Encke Gap
                            [1.64, 1.5, 0.04, '#111111', 'Encke Gap'],
                            [1.66, 5, 0.3, '#c9a04a', 'A Ring outer'],
                            [1.74, 3, 0.1, '#aa8830', 'F Ring (thin)']
                          ];
                          // Draw back half of rings (behind planet)
                          ringBands.forEach(function(rb) {
                            var rInner = planetR * rb[0];
                            var rOuter = rInner + rb[1];
                            ctx.globalAlpha = rb[2] * 0.7;
                            ctx.fillStyle = rb[3];
                            ctx.beginPath();
                            ctx.ellipse(cx, cy, rOuter, rOuter * 0.18, ringTilt, Math.PI * 0.05, Math.PI * 0.95);
                            ctx.ellipse(cx, cy, rInner, rInner * 0.18, ringTilt, Math.PI * 0.95, Math.PI * 0.05, true);
                            ctx.closePath();
                            ctx.fill();
                          });
                          // Ring shadow on planet body
                          ctx.save();
                          ctx.beginPath();
                          ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
                          ctx.clip();
                          ctx.globalAlpha = 0.12;
                          ctx.fillStyle = '#000000';
                          ctx.beginPath();
                          ctx.ellipse(cx, cy + planetR * 0.08, planetR * 1.5, planetR * 0.06, ringTilt, 0, Math.PI * 2);
                          ctx.fill();
                          ctx.restore();
                          // Draw front half of rings (in front of planet)
                          ringBands.forEach(function(rb) {
                            var rInner = planetR * rb[0];
                            var rOuter = rInner + rb[1];
                            ctx.globalAlpha = rb[2];
                            ctx.fillStyle = rb[3];
                            ctx.beginPath();
                            ctx.ellipse(cx, cy, rOuter, rOuter * 0.18, ringTilt, Math.PI * 1.05, Math.PI * 1.95);
                            ctx.ellipse(cx, cy, rInner, rInner * 0.18, ringTilt, Math.PI * 1.95, Math.PI * 1.05, true);
                            ctx.closePath();
                            ctx.fill();
                          });
                          // Sparkle particles scattered on rings
                          ctx.globalAlpha = 0.4;
                          ctx.fillStyle = '#fff';
                          for (var sp = 0; sp < 30; sp++) {
                            var spAngle = Math.PI + (sp * 137.5 * Math.PI / 180) % Math.PI; // golden angle spread on front
                            var spR = planetR * (1.15 + (sp * 73 % 55) / 55 * 0.55);
                            var spx = cx + Math.cos(spAngle + ringTilt * 0.1) * spR;
                            var spy = cy + Math.sin(spAngle) * spR * 0.18;
                            var spBright = 0.2 + Math.sin(tick * 0.05 + sp * 2.7) * 0.3;
                            if (spBright > 0.3) {
                              ctx.globalAlpha = spBright;
                              ctx.beginPath();
                              ctx.arc(spx, spy, 0.6, 0, Math.PI * 2);
                              ctx.fill();
                            }
                          }
                          ctx.globalAlpha = 1;
                          ctx.restore();
                        }

                        // === ENHANCED: Earth-specific features ===
                        if (sel.terrainType === 'earthlike') {
                          ctx.save();
                          ctx.beginPath();
                          ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
                          ctx.clip();
                          // Swirling cloud wisps (improved with varied sizes)
                          ctx.globalAlpha = 0.12;
                          ctx.fillStyle = '#ffffff';
                          for (var wi = 0; wi < 8; wi++) {
                            var wx = cx + Math.cos(tick * 0.003 + _dragRotation + wi * 0.9) * planetR * (0.3 + wi * 0.08);
                            var wy = cy - planetR * 0.4 + wi * planetR * 0.12;
                            var cw = planetR * (0.2 + Math.sin(wi * 1.7) * 0.12);
                            ctx.beginPath();
                            ctx.ellipse(wx, wy, cw, 3 + wi % 3, tick * 0.002 + wi * 0.4 + _dragRotation * 0.3, 0, Math.PI * 2);
                            ctx.fill();
                          }
                          // City lights on the dark (shadow) side
                          var shadowCenter = cx + planetR * 0.4; // shadow is on right
                          ctx.globalAlpha = 0.6;
                          var cityPositions = [
                            [0.25, -0.1], [0.35, -0.15], [0.45, 0.05], [0.3, 0.15], [0.5, -0.05],
                            [0.2, -0.25], [0.4, -0.3], [0.55, 0.1], [0.15, 0.1], [0.35, 0.25],
                            [0.28, -0.35], [0.5, -0.2], [0.42, 0.18], [0.22, 0.3], [0.38, -0.08],
                            [0.6, -0.1], [0.32, 0.08], [0.48, -0.28], [0.18, -0.05], [0.55, 0.2]
                          ];
                          cityPositions.forEach(function(cp, ci2) {
                            var cityX = cx + (cp[0] + Math.sin(_dragRotation + tick * 0.003) * 0.05) * planetR * 1.2;
                            var cityY = cy + cp[1] * planetR * 1.5;
                            var cityDist = Math.sqrt(Math.pow(cityX - cx, 2) + Math.pow(cityY - cy, 2));
                            // Only show on the dark side and within planet radius
                            if (cityDist < planetR * 0.92 && cityX > shadowCenter - planetR * 0.3) {
                              var cityBright = 0.3 + Math.sin(tick * 0.1 + ci2 * 2.3) * 0.15; // twinkle
                              ctx.globalAlpha = cityBright;
                              ctx.fillStyle = '#fef3c7';
                              ctx.beginPath();
                              ctx.arc(cityX, cityY, 0.8 + (ci2 % 3) * 0.4, 0, Math.PI * 2);
                              ctx.fill();
                              // Warm glow halo
                              ctx.globalAlpha = cityBright * 0.3;
                              ctx.fillStyle = '#fbbf24';
                              ctx.beginPath();
                              ctx.arc(cityX, cityY, 2 + (ci2 % 3), 0, Math.PI * 2);
                              ctx.fill();
                            }
                          });
                          // Aurora borealis at north pole
                          ctx.globalAlpha = 0.08 + Math.sin(tick * 0.02) * 0.04;
                          var auroraColors = ['#22c55e', '#4ade80', '#06b6d4', '#8b5cf6'];
                          for (var ai2 = 0; ai2 < 6; ai2++) {
                            var auroraX = cx + Math.cos(tick * 0.005 + ai2 * 1.1 + _dragRotation) * planetR * (0.3 + ai2 * 0.05);
                            var auroraY = cy - planetR * 0.78 + ai2 * 3;
                            ctx.fillStyle = auroraColors[ai2 % auroraColors.length];
                            ctx.beginPath();
                            ctx.ellipse(auroraX, auroraY, planetR * 0.18 + Math.sin(tick * 0.03 + ai2) * 5, 2 + Math.sin(tick * 0.04 + ai2 * 2) * 1.5, tick * 0.003 + ai2 * 0.3, 0, Math.PI * 2);
                            ctx.fill();
                          }
                          ctx.globalAlpha = 1;
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

                        // === Uranus: tilted axis line + faint ring system ===
                        if (sel.name === 'Uranus') {
                          ctx.save();
                          // Axis tilt indicator (97.8 degrees — nearly horizontal)
                          ctx.strokeStyle = 'rgba(103,232,249,0.25)';
                          ctx.lineWidth = 0.8;
                          ctx.setLineDash([4, 4]);
                          var axisTilt = 97.8 * Math.PI / 180;
                          ctx.beginPath();
                          ctx.moveTo(cx + Math.cos(axisTilt) * planetR * 1.4, cy - Math.sin(axisTilt) * planetR * 1.4);
                          ctx.lineTo(cx - Math.cos(axisTilt) * planetR * 1.4, cy + Math.sin(axisTilt) * planetR * 1.4);
                          ctx.stroke();
                          ctx.setLineDash([]);
                          // Axis label
                          ctx.globalAlpha = 0.3;
                          ctx.font = '7px system-ui';
                          ctx.fillStyle = '#67e8f9';
                          ctx.textAlign = 'left';
                          ctx.fillText('97.8\u00B0 tilt', cx + Math.cos(axisTilt) * planetR * 1.15 + 4, cy - Math.sin(axisTilt) * planetR * 1.15);
                          ctx.globalAlpha = 1;
                          // Faint ring system (Uranus has rings too — very faint)
                          ctx.globalAlpha = 0.12;
                          ctx.strokeStyle = '#67e8f9';
                          ctx.lineWidth = 1;
                          for (var uri = 0; uri < 3; uri++) {
                            var urR = planetR * (1.15 + uri * 0.06);
                            ctx.beginPath();
                            ctx.ellipse(cx, cy, urR, urR * 0.08, axisTilt - Math.PI / 2, 0, Math.PI * 2);
                            ctx.stroke();
                          }
                          ctx.globalAlpha = 1;
                          _featureLabels.push({ x: cx + planetR * 0.8, y: cy - planetR * 0.9, r: 15, name: '97.8\u00B0 Axial Tilt', desc: 'Knocked sideways by an ancient collision with an Earth-sized body' });
                          ctx.restore();
                        }

                        // === Mercury: intense solar glare from proximity ===
                        if (sel.name === 'Mercury') {
                          // Solar glare on the sunward (left) side
                          ctx.save();
                          var glareGrad = ctx.createRadialGradient(cx - planetR * 0.8, cy, 0, cx - planetR * 0.8, cy, planetR * 0.8);
                          glareGrad.addColorStop(0, 'rgba(255,248,220,0.15)');
                          glareGrad.addColorStop(0.5, 'rgba(255,240,200,0.05)');
                          glareGrad.addColorStop(1, 'transparent');
                          ctx.fillStyle = glareGrad;
                          ctx.beginPath();
                          ctx.arc(cx - planetR * 0.8, cy, planetR * 0.8, 0, Math.PI * 2);
                          ctx.fill();
                          // Temperature gradient indicator
                          ctx.globalAlpha = 0.2;
                          ctx.font = '7px system-ui';
                          ctx.fillStyle = '#fef3c7';
                          ctx.textAlign = 'center';
                          ctx.fillText('430\u00B0C', cx - planetR * 0.6, cy + planetR * 0.6);
                          ctx.fillStyle = '#93c5fd';
                          ctx.fillText('-180\u00B0C', cx + planetR * 0.6, cy + planetR * 0.6);
                          ctx.globalAlpha = 1;
                          // Caloris Basin (large impact crater)
                          ctx.save();
                          ctx.beginPath(); ctx.arc(cx, cy, planetR, 0, Math.PI * 2); ctx.clip();
                          var calX = cx - planetR * 0.15 + Math.sin(_dragRotation + tick * 0.003) * planetR * 0.1;
                          var calY = cy - planetR * 0.1;
                          ctx.globalAlpha = 0.1;
                          ctx.strokeStyle = '#aaa';
                          ctx.lineWidth = 1;
                          ctx.beginPath(); ctx.arc(calX, calY, planetR * 0.22, 0, Math.PI * 2); ctx.stroke();
                          ctx.fillStyle = 'rgba(0,0,0,0.04)';
                          ctx.beginPath(); ctx.arc(calX, calY, planetR * 0.2, 0, Math.PI * 2); ctx.fill();
                          ctx.globalAlpha = 1;
                          ctx.restore();
                          _featureLabels.push({ x: calX, y: calY, r: planetR * 0.18, name: 'Caloris Basin', desc: '1,550 km impact crater \u2014 one of the largest in the solar system' });
                          // Polar ice indicator
                          _featureLabels.push({ x: cx, y: cy - planetR * 0.85, r: 10, name: 'Polar Ice Deposits', desc: 'Water ice in permanently shadowed craters, despite being closest to the Sun' });
                          ctx.restore();
                        }

                        // === ENHANCED: Gas giant — scrolling cloud eddies + lightning ===
                        if (isGas) {
                          ctx.save();
                          ctx.beginPath();
                          ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
                          ctx.clip();
                          // Scrolling turbulent eddies (move with rotation + drag)
                          var scrollX = tick * 0.4 + _dragRotation * planetR * 0.5;
                          ctx.globalAlpha = 0.07;
                          for (var ei = 0; ei < 16; ei++) {
                            var ex = cx + ((ei * 67 + 13 + Math.floor(scrollX)) % Math.floor(planetR * 1.8)) - planetR * 0.9;
                            var ey = cy + ((ei * 43 + 7) % Math.floor(planetR * 1.4)) - planetR * 0.7;
                            var eAngle = tick * 0.003 + _dragRotation + ei * 0.5;
                            var eddySize = 6 + ei % 5 * 3;
                            ctx.fillStyle = ei % 3 === 0 ? '#ffffff' : ei % 3 === 1 ? sel.color : '#000000';
                            ctx.beginPath();
                            ctx.ellipse(ex, ey, eddySize, eddySize * 0.55, eAngle, 0, Math.PI * 2);
                            ctx.fill();
                            // Spiral arm inside larger eddies
                            if (eddySize > 12) {
                              ctx.globalAlpha = 0.04;
                              ctx.strokeStyle = '#ffffff';
                              ctx.lineWidth = 0.5;
                              ctx.beginPath();
                              for (var sa = 0; sa < Math.PI * 3; sa += 0.3) {
                                var sr = sa * 1.2;
                                var spx2 = ex + Math.cos(sa + eAngle) * sr;
                                var spy2 = ey + Math.sin(sa + eAngle) * sr * 0.5;
                                sa === 0 ? ctx.moveTo(spx2, spy2) : ctx.lineTo(spx2, spy2);
                              }
                              ctx.stroke();
                              ctx.globalAlpha = 0.07;
                            }
                          }
                          // Lightning flashes between cloud bands
                          if (tick % 100 < 3) {
                            var lx = cx + (Math.sin(tick * 0.1) * planetR * 0.5);
                            var ly = cy + (Math.cos(tick * 0.07) * planetR * 0.3);
                            ctx.globalAlpha = 0.5 - (tick % 100) * 0.15;
                            var flashGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, planetR * 0.12);
                            flashGrad.addColorStop(0, '#ffffff');
                            flashGrad.addColorStop(0.4, 'rgba(200,220,255,0.3)');
                            flashGrad.addColorStop(1, 'transparent');
                            ctx.fillStyle = flashGrad;
                            ctx.beginPath();
                            ctx.arc(lx, ly, planetR * 0.12, 0, Math.PI * 2);
                            ctx.fill();
                            // Lightning bolt line
                            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.moveTo(lx, ly);
                            ctx.lineTo(lx + 6, ly + 8);
                            ctx.lineTo(lx - 3, ly + 14);
                            ctx.lineTo(lx + 4, ly + 22);
                            ctx.stroke();
                          }
                          ctx.globalAlpha = 1;
                          ctx.restore();
                          // === Jupiter aurora at poles ===
                          if (sel.name === 'Jupiter') {
                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
                            ctx.clip();
                            ctx.globalAlpha = 0.1 + Math.sin(tick * 0.025) * 0.05;
                            var jupAuroraColors = ['#8b5cf6', '#6366f1', '#a78bfa', '#818cf8'];
                            for (var jai = 0; jai < 5; jai++) {
                              var jaX = cx + Math.cos(tick * 0.004 + jai * 1.3 + _dragRotation) * planetR * (0.2 + jai * 0.06);
                              var jaY = cy - planetR * 0.82 + jai * 2;
                              ctx.fillStyle = jupAuroraColors[jai % jupAuroraColors.length];
                              ctx.beginPath();
                              ctx.ellipse(jaX, jaY, planetR * 0.15 + Math.sin(tick * 0.04 + jai) * 4, 2.5, tick * 0.002 + jai * 0.4, 0, Math.PI * 2);
                              ctx.fill();
                            }
                            // South pole aurora too
                            for (var jai2 = 0; jai2 < 4; jai2++) {
                              var jaX2 = cx + Math.cos(tick * 0.003 + jai2 * 1.1 + _dragRotation + 2) * planetR * (0.15 + jai2 * 0.05);
                              var jaY2 = cy + planetR * 0.82 - jai2 * 2;
                              ctx.fillStyle = jupAuroraColors[(jai2 + 2) % jupAuroraColors.length];
                              ctx.beginPath();
                              ctx.ellipse(jaX2, jaY2, planetR * 0.12 + Math.sin(tick * 0.035 + jai2) * 3, 2, tick * 0.002 + jai2 * 0.5, 0, Math.PI * 2);
                              ctx.fill();
                            }
                            ctx.globalAlpha = 1;
                            ctx.restore();
                          }
                          // === Neptune: Great Dark Spot ===
                          if (sel.name === 'Neptune') {
                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
                            ctx.clip();
                            var gdsX = cx + Math.cos(tick * 0.003 + _dragRotation) * planetR * 0.2;
                            var gdsY = cy - planetR * 0.15;
                            ctx.globalAlpha = 0.2;
                            ctx.fillStyle = '#1a1a4a';
                            ctx.beginPath();
                            ctx.ellipse(gdsX, gdsY, planetR * 0.16, planetR * 0.09, 0.1 + tick * 0.001, 0, Math.PI * 2);
                            ctx.fill();
                            // Bright companion cloud
                            ctx.globalAlpha = 0.15;
                            ctx.fillStyle = '#aaccff';
                            ctx.beginPath();
                            ctx.ellipse(gdsX + planetR * 0.12, gdsY - planetR * 0.08, planetR * 0.06, planetR * 0.025, 0, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.globalAlpha = 1;
                            ctx.restore();
                          }
                        }

                        // === ENHANCED: Mars — dust storm clouds drifting ===
                        if (sel.terrainType === 'desert') {
                          ctx.save();
                          ctx.beginPath();
                          ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
                          ctx.clip();
                          // Drifting dust clouds
                          var dustPhase = tick * 0.002 + _dragRotation;
                          for (var dci = 0; dci < 4; dci++) {
                            var dcX = cx + Math.cos(dustPhase + dci * 1.6) * planetR * 0.5;
                            var dcY = cy + planetR * (-0.1 + dci * 0.15);
                            var dcAlpha = 0.06 + Math.sin(tick * 0.01 + dci * 2) * 0.03;
                            ctx.globalAlpha = dcAlpha;
                            ctx.fillStyle = '#c9856b';
                            ctx.beginPath();
                            ctx.ellipse(dcX, dcY, planetR * 0.3, planetR * 0.06, dci * 0.3 + dustPhase * 0.2, 0, Math.PI * 2);
                            ctx.fill();
                          }
                          ctx.globalAlpha = 1;
                          ctx.restore();
                        }

                        // === ENHANCED: Venus — atmospheric lightning + sulfuric haze ===
                        if (sel.terrainType === 'volcanic') {
                          ctx.save();
                          ctx.beginPath();
                          ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
                          ctx.clip();
                          // Thick haze layers
                          for (var vhi = 0; vhi < 3; vhi++) {
                            ctx.globalAlpha = 0.04;
                            ctx.fillStyle = '#e0c060';
                            var vhY = cy - planetR * 0.4 + vhi * planetR * 0.35;
                            ctx.beginPath();
                            ctx.ellipse(cx + Math.sin(tick * 0.002 + vhi) * 5, vhY, planetR * 0.9, planetR * 0.08, 0, 0, Math.PI * 2);
                            ctx.fill();
                          }
                          // Lightning in clouds
                          if (tick % 80 < 2) {
                            var vlx = cx + (Math.sin(tick * 0.13) * planetR * 0.4);
                            var vly = cy + (Math.cos(tick * 0.09) * planetR * 0.25);
                            ctx.globalAlpha = 0.5 - (tick % 80) * 0.25;
                            ctx.fillStyle = '#fef3c7';
                            ctx.beginPath();
                            ctx.arc(vlx, vly, planetR * 0.06, 0, Math.PI * 2);
                            ctx.fill();
                            // Bolt
                            ctx.strokeStyle = 'rgba(255,255,200,0.4)';
                            ctx.lineWidth = 0.8;
                            ctx.beginPath();
                            ctx.moveTo(vlx, vly);
                            ctx.lineTo(vlx + 4, vly + 10);
                            ctx.lineTo(vlx - 2, vly + 16);
                            ctx.stroke();
                          }
                          ctx.globalAlpha = 1;
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
                            // Bright head + fade trail
                            ctx.fillStyle = '#fef3c7';
                            ctx.beginPath();
                            ctx.arc(metX + metLen, metY + metLen * 0.4, 2, 0, Math.PI * 2);
                            ctx.fill();
                            // Fading trail
                            var trailGrad = ctx.createLinearGradient(metX, metY, metX + metLen, metY + metLen * 0.4);
                            trailGrad.addColorStop(0, 'transparent');
                            trailGrad.addColorStop(1, 'rgba(254,243,199,0.3)');
                            ctx.strokeStyle = trailGrad;
                            ctx.lineWidth = 3;
                            ctx.beginPath();
                            ctx.moveTo(metX, metY);
                            ctx.lineTo(metX + metLen, metY + metLen * 0.4);
                            ctx.stroke();
                            ctx.globalAlpha = 1;
                          }
                        }

                        // === Pluto: nitrogen sublimation wisps ===
                        if (sel.name === 'Pluto') {
                          ctx.save();
                          ctx.beginPath();
                          ctx.arc(cx, cy, planetR * 1.1, 0, Math.PI * 2);
                          ctx.clip();
                          ctx.globalAlpha = 0.06;
                          ctx.fillStyle = '#ddeeff';
                          for (var nwi = 0; nwi < 4; nwi++) {
                            var nwX = cx + Math.cos(tick * 0.002 + nwi * 1.5 + _dragRotation) * planetR * 0.6;
                            var nwY = cy + planetR * (0.6 + nwi * 0.08);
                            ctx.beginPath();
                            ctx.ellipse(nwX, nwY, planetR * 0.25, planetR * 0.04, nwi * 0.3, 0, Math.PI * 2);
                            ctx.fill();
                          }
                          ctx.globalAlpha = 1;
                          ctx.restore();
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

                        // === Earth-scale comparison (for non-Earth planets) ===
                        if (sel.name !== 'Earth' && PLANET_RADII[sel.name] && PLANET_RADII['Earth']) {
                          var earthScale = PLANET_RADII['Earth'] / PLANET_RADII[sel.name];
                          var earthR = planetR * earthScale;
                          if (earthR > 1.5 && earthR < planetR * 0.9) { // only show if meaningfully different
                            var ecx = W - 30, ecy = 30;
                            // Earth reference circle
                            ctx.globalAlpha = 0.5;
                            ctx.fillStyle = '#3b82f6';
                            ctx.beginPath();
                            ctx.arc(ecx, ecy, earthR, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.strokeStyle = 'rgba(59,130,246,0.6)';
                            ctx.lineWidth = 0.5;
                            ctx.stroke();
                            ctx.globalAlpha = 0.6;
                            ctx.font = '7px system-ui';
                            ctx.fillStyle = '#94a3b8';
                            ctx.textAlign = 'center';
                            ctx.fillText('\uD83C\uDF0D Earth', ecx, ecy + earthR + 8);
                            ctx.fillText('for scale', ecx, ecy + earthR + 16);
                            ctx.globalAlpha = 1;
                          } else if (earthR >= planetR * 0.9) {
                            // Earth is similar size or bigger — show text only
                            ctx.globalAlpha = 0.4;
                            ctx.font = '7px system-ui';
                            ctx.fillStyle = '#94a3b8';
                            ctx.textAlign = 'right';
                            ctx.fillText('\uD83C\uDF0D ~' + (1 / earthScale).toFixed(1) + 'x Earth', W - 8, 14);
                            ctx.globalAlpha = 1;
                          }
                        }

                        // === Sun direction indicator (top-left) ===
                        ctx.globalAlpha = 0.4;
                        ctx.fillStyle = '#fef3c7';
                        ctx.beginPath();
                        ctx.arc(16, 16, 5, 0, Math.PI * 2);
                        ctx.fill();
                        // Sun rays
                        ctx.strokeStyle = '#fef3c7';
                        ctx.lineWidth = 0.5;
                        for (var ray2 = 0; ray2 < 8; ray2++) {
                          var ra = ray2 * Math.PI / 4;
                          ctx.beginPath();
                          ctx.moveTo(16 + Math.cos(ra) * 7, 16 + Math.sin(ra) * 7);
                          ctx.lineTo(16 + Math.cos(ra) * 10, 16 + Math.sin(ra) * 10);
                          ctx.stroke();
                        }
                        ctx.font = '6px system-ui';
                        ctx.fillStyle = '#fef3c7';
                        ctx.textAlign = 'left';
                        ctx.fillText(sel.dist ? sel.dist + ' AU' : '', 28, 18);
                        ctx.globalAlpha = 1;

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

                // ── Interactive Depth Exploration Buttons ──
                React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-2" },
                  [
                    { key: 'moons', icon: '\uD83C\uDF19', label: 'Moons (' + sel.moons + ')', show: sel.moons > 0 },
                    { key: 'atmosphere', icon: '\uD83C\uDF2B\uFE0F', label: 'Atmosphere', show: !!DESCENT_LAYERS[sel.name] },
                    { key: 'magnetic', icon: '\uD83E\uDDF2', label: 'Magnetic Field', show: !!MAGNETOSPHERE[sel.name] },
                    { key: 'nightsky', icon: '\uD83C\uDF0C', label: 'Night Sky', show: !!SKY_VIEWS[sel.name] },
                    { key: 'composition', icon: '\uD83E\uDDEA', label: 'Composition', show: true }
                  ].filter(function(b) { return b.show; }).map(function(btn) {
                    var isActive = d.surfaceExplore === btn.key;
                    return React.createElement("button", {
                      key: btn.key,
                      "aria-label": "Explore " + btn.label + " of " + sel.name,
                      onClick: function() { upd('surfaceExplore', isActive ? null : btn.key); },
                      className: "px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border " +
                        (isActive ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/25 scale-[1.03]' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700')
                    }, btn.icon + ' ' + btn.label);
                  })
                ),

                // ── MOONS DETAIL PANEL ──
                d.surfaceExplore === 'moons' && React.createElement("div", { className: "mt-2 bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-3 border border-slate-700 animate-fadeIn" },
                  React.createElement("div", { className: "flex items-center justify-between mb-2" },
                    React.createElement("h6", { className: "text-sm font-bold text-white" }, "\uD83C\uDF19 " + sel.name + "'s Moons"),
                    React.createElement("span", { className: "text-[10px] text-slate-400" }, sel.moons + " known moon" + (sel.moons !== 1 ? 's' : ''))
                  ),
                  NOTABLE_MOONS[sel.name] && NOTABLE_MOONS[sel.name].length > 0 ?
                    React.createElement("div", { className: "space-y-2" },
                      NOTABLE_MOONS[sel.name].map(function(moon, mi) {
                        return React.createElement("div", { key: mi, className: "bg-white/5 rounded-lg p-2.5 border border-white/10 hover:border-indigo-400/40 transition-all cursor-default group" },
                          React.createElement("div", { className: "flex items-start gap-2" },
                            React.createElement("div", { className: "w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-[10px] font-bold text-slate-800 shrink-0 group-hover:from-indigo-300 group-hover:to-indigo-500 transition-all" }, moon.name.charAt(0)),
                            React.createElement("div", { className: "flex-1 min-w-0" },
                              React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                                React.createElement("span", { className: "text-xs font-bold text-white" }, moon.name),
                                React.createElement("span", { className: "text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium" }, moon.type)
                              ),
                              React.createElement("div", { className: "flex gap-3 mt-1 text-[9px] text-slate-400" },
                                React.createElement("span", null, "\u2300 " + moon.diameter),
                                React.createElement("span", null, "\u21C4 " + moon.dist + " from " + sel.name)
                              ),
                              React.createElement("p", { className: "text-[10px] text-sky-300 mt-1 leading-relaxed" }, "\uD83D\uDCA1 " + moon.fact)
                            )
                          )
                        );
                      })
                    ) :
                    React.createElement("p", { className: "text-xs text-slate-400 italic text-center py-3" },
                      sel.moons > 0 ? sel.moons + " small moons discovered, but no major moons with detailed data yet." : "No moons discovered."
                    )
                ),

                // ── ATMOSPHERE DEPTH PANEL ──
                d.surfaceExplore === 'atmosphere' && React.createElement("div", { className: "mt-2 bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-3 border border-slate-700 animate-fadeIn" },
                  React.createElement("h6", { className: "text-sm font-bold text-white mb-2" }, "\uD83C\uDF2B\uFE0F Atmospheric Descent: " + sel.name),
                  React.createElement("p", { className: "text-[10px] text-slate-400 mb-2" }, "What you\u2019d experience descending through " + sel.name + "'s atmosphere:"),
                  DESCENT_LAYERS[sel.name] ?
                    React.createElement("div", { className: "space-y-0" },
                      DESCENT_LAYERS[sel.name].map(function(layer, li) {
                        return React.createElement("div", { key: li, className: "flex items-stretch gap-2 group" },
                          // Depth line connector
                          React.createElement("div", { className: "flex flex-col items-center w-6 shrink-0" },
                            React.createElement("div", { className: "w-3 h-3 rounded-full border-2 shrink-0 z-10", style: { borderColor: layer.color, backgroundColor: layer.color + '60' } }),
                            li < DESCENT_LAYERS[sel.name].length - 1 ? React.createElement("div", { className: "w-0.5 flex-1 opacity-30", style: { backgroundColor: layer.color } }) : null
                          ),
                          // Layer card
                          React.createElement("div", { className: "flex-1 pb-2.5" },
                            React.createElement("div", { className: "bg-white/5 rounded-lg p-2 border border-white/10 hover:border-white/20 transition-all", style: { borderLeftColor: layer.color, borderLeftWidth: '3px' } },
                              React.createElement("div", { className: "flex items-center justify-between mb-1" },
                                React.createElement("span", { className: "text-xs font-bold", style: { color: layer.color } }, layer.name),
                                React.createElement("span", { className: "text-[9px] text-slate-500 font-mono" }, layer.alt >= 0 ? layer.alt + " km" : Math.abs(layer.alt).toLocaleString() + " km depth")
                              ),
                              React.createElement("p", { className: "text-[10px] text-slate-300 mb-1" }, layer.desc),
                              React.createElement("div", { className: "flex gap-3 text-[9px] text-slate-400" },
                                React.createElement("span", null, "\uD83C\uDF21 " + layer.temp),
                                React.createElement("span", null, "\uD83D\uDCA8 " + layer.pressure)
                              )
                            )
                          )
                        );
                      })
                    ) :
                    React.createElement("div", { className: "text-center py-3" },
                      React.createElement("p", { className: "text-xs text-slate-300" }, sel.atmosphere || "No atmosphere data"),
                      React.createElement("p", { className: "text-[10px] text-slate-500 mt-1" }, "Detailed descent layers not available for " + sel.name)
                    )
                ),

                // ── MAGNETIC FIELD PANEL ──
                d.surfaceExplore === 'magnetic' && MAGNETOSPHERE[sel.name] && React.createElement("div", { className: "mt-2 bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-3 border border-slate-700 animate-fadeIn" },
                  React.createElement("h6", { className: "text-sm font-bold text-white mb-2" }, "\uD83E\uDDF2 " + sel.name + "'s Magnetic Field"),
                  React.createElement("div", { className: "bg-white/5 rounded-lg p-3 border border-white/10" },
                    React.createElement("div", { className: "flex items-center gap-3 mb-2" },
                      React.createElement("div", { className: "w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 " +
                        (MAGNETOSPHERE[sel.name].shield ? 'bg-green-500/20 border-2 border-green-500/40' : 'bg-red-500/20 border-2 border-red-500/40') },
                        MAGNETOSPHERE[sel.name].shield ? '\uD83D\uDEE1\uFE0F' : '\u26A0\uFE0F'
                      ),
                      React.createElement("div", null,
                        React.createElement("p", { className: "text-xs font-bold " + (MAGNETOSPHERE[sel.name].shield ? 'text-green-400' : 'text-red-400') },
                          MAGNETOSPHERE[sel.name].shield ? 'ACTIVE SHIELD' : 'NO SHIELD'
                        ),
                        React.createElement("p", { className: "text-[10px] text-slate-300" }, "Strength: " + MAGNETOSPHERE[sel.name].strength)
                      )
                    ),
                    React.createElement("p", { className: "text-[10px] text-sky-300 leading-relaxed" }, "\uD83D\uDCA1 " + MAGNETOSPHERE[sel.name].note),
                    // Visual strength bar
                    React.createElement("div", { className: "mt-2" },
                      React.createElement("div", { className: "flex justify-between text-[8px] text-slate-500 mb-0.5" },
                        React.createElement("span", null, "Field Strength vs Earth"),
                        React.createElement("span", null, MAGNETOSPHERE[sel.name].strength)
                      ),
                      React.createElement("div", { className: "h-2 bg-slate-700 rounded-full overflow-hidden" },
                        React.createElement("div", { className: "h-full rounded-full transition-all",
                          style: {
                            width: Math.min(100, (sel.name === 'Jupiter' ? 100 : sel.name === 'Saturn' ? 60 : sel.name === 'Earth' ? 25 : sel.name === 'Uranus' ? 20 : sel.name === 'Neptune' ? 18 : 3)) + '%',
                            background: MAGNETOSPHERE[sel.name].shield ? 'linear-gradient(90deg, #22c55e, #3b82f6)' : 'linear-gradient(90deg, #ef4444, #f97316)'
                          }
                        })
                      )
                    ),
                    ESCAPE_VEL[sel.name] && React.createElement("p", { className: "text-[9px] text-slate-500 mt-2" }, "\uD83D\uDE80 Escape velocity: " + ESCAPE_VEL[sel.name] + " km/s" + (sel.name !== 'Earth' ? " (Earth: 11.2 km/s)" : ""))
                  )
                ),

                // ── NIGHT SKY PANEL ──
                d.surfaceExplore === 'nightsky' && SKY_VIEWS[sel.name] && React.createElement("div", { className: "mt-2 bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-3 border border-slate-700 animate-fadeIn" },
                  React.createElement("h6", { className: "text-sm font-bold text-white mb-2" }, "\uD83C\uDF0C Night Sky from " + sel.name),
                  React.createElement("div", { className: "bg-white/5 rounded-lg p-3 border border-white/10" },
                    React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-2" },
                      React.createElement("div", { className: "bg-yellow-500/10 rounded-lg p-2 text-center border border-yellow-500/20" },
                        React.createElement("p", { className: "text-[9px] text-yellow-400/70" }, "\u2600\uFE0F Sun Size"),
                        React.createElement("p", { className: "text-xs font-bold text-yellow-300" }, SKY_VIEWS[sel.name].sunSize)
                      ),
                      React.createElement("div", { className: "bg-blue-500/10 rounded-lg p-2 text-center border border-blue-500/20" },
                        React.createElement("p", { className: "text-[9px] text-blue-400/70" }, "\uD83D\uDC41 Visible"),
                        React.createElement("p", { className: "text-[10px] font-bold text-blue-300" }, SKY_VIEWS[sel.name].visible.length + " object" + (SKY_VIEWS[sel.name].visible.length !== 1 ? 's' : ''))
                      )
                    ),
                    React.createElement("div", { className: "mb-2" },
                      React.createElement("p", { className: "text-[9px] text-slate-400 font-bold mb-1" }, "VISIBLE OBJECTS:"),
                      SKY_VIEWS[sel.name].visible.map(function(obj, oi) {
                        return React.createElement("div", { key: oi, className: "flex items-center gap-1.5 py-0.5" },
                          React.createElement("span", { className: "text-[10px]" }, "\u2B50"),
                          React.createElement("span", { className: "text-[10px] text-slate-300" }, obj)
                        );
                      })
                    ),
                    React.createElement("p", { className: "text-[10px] text-sky-300 leading-relaxed border-t border-white/10 pt-2" }, "\uD83D\uDCA1 " + SKY_VIEWS[sel.name].note)
                  )
                ),

                // ── COMPOSITION PANEL ──
                d.surfaceExplore === 'composition' && React.createElement("div", { className: "mt-2 bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-3 border border-slate-700 animate-fadeIn" },
                  React.createElement("h6", { className: "text-sm font-bold text-white mb-2" }, "\uD83E\uDDEA " + sel.name + " Composition"),
                  React.createElement("div", { className: "space-y-2" },
                    // Atmosphere composition
                    React.createElement("div", { className: "bg-white/5 rounded-lg p-2.5 border border-white/10" },
                      React.createElement("p", { className: "text-[9px] text-slate-400 font-bold mb-1.5" }, "\uD83C\uDF2C\uFE0F ATMOSPHERE"),
                      React.createElement("p", { className: "text-[10px] text-slate-300 leading-relaxed" }, sel.atmosphere || 'No significant atmosphere'),
                      // Visual gas bars
                      (function() {
                        var isGas2 = sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant';
                        var gases = sel.name === 'Jupiter' ? [['H\u2082', 90, '#88ccff'], ['He', 10, '#ffdd88']] :
                          sel.name === 'Saturn' ? [['H\u2082', 96, '#88ccff'], ['He', 3, '#ffdd88'], ['CH\u2084', 0.45, '#44ffaa']] :
                          sel.name === 'Uranus' ? [['H\u2082', 83, '#88ccff'], ['He', 15, '#ffdd88'], ['CH\u2084', 2, '#44ffaa']] :
                          sel.name === 'Neptune' ? [['H\u2082', 80, '#88ccff'], ['He', 19, '#ffdd88'], ['CH\u2084', 1, '#44ffaa']] :
                          sel.name === 'Venus' ? [['CO\u2082', 96.5, '#cc8844'], ['N\u2082', 3.5, '#aaddff']] :
                          sel.name === 'Earth' ? [['N\u2082', 78, '#aaddff'], ['O\u2082', 21, '#88ff88'], ['Ar', 0.93, '#dd88ff']] :
                          sel.name === 'Mars' ? [['CO\u2082', 95, '#cc8844'], ['N\u2082', 2.7, '#aaddff'], ['Ar', 1.6, '#dd88ff']] :
                          [];
                        if (gases.length === 0) return null;
                        return React.createElement("div", { className: "mt-2 space-y-1" },
                          gases.map(function(g) {
                            return React.createElement("div", { key: g[0], className: "flex items-center gap-2" },
                              React.createElement("span", { className: "text-[9px] text-slate-400 w-8 text-right font-mono" }, g[0]),
                              React.createElement("div", { className: "flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden" },
                                React.createElement("div", { className: "h-full rounded-full", style: { width: Math.max(2, g[1]) + '%', backgroundColor: g[2] } })
                              ),
                              React.createElement("span", { className: "text-[8px] font-mono", style: { color: g[2] } }, g[1] + '%')
                            );
                          })
                        );
                      })()
                    ),
                    // Surface composition
                    React.createElement("div", { className: "bg-white/5 rounded-lg p-2.5 border border-white/10" },
                      React.createElement("p", { className: "text-[9px] text-slate-400 font-bold mb-1.5" }, "\uD83E\uDEA8 SURFACE"),
                      React.createElement("p", { className: "text-[10px] text-slate-300 leading-relaxed" }, sel.surface || 'Surface data unavailable'),
                      sel.surfaceDesc && React.createElement("p", { className: "text-[10px] text-sky-300 mt-1" }, "\uD83D\uDCA1 " + sel.surfaceDesc)
                    ),
                    // Key facts
                    EXTRA_FACTS[sel.name] && React.createElement("div", { className: "bg-white/5 rounded-lg p-2.5 border border-white/10" },
                      React.createElement("p", { className: "text-[9px] text-slate-400 font-bold mb-1.5" }, "\u2728 KEY FACTS"),
                      EXTRA_FACTS[sel.name].slice(0, 4).map(function(fact, fi) {
                        return React.createElement("p", { key: fi, className: "text-[10px] text-slate-300 py-0.5" }, "\u2022 " + fact);
                      })
                    )
                  )
                ),

                React.createElement("button", { "aria-label": "Deploy rover or probe on selected planet",

                  onClick: function () { upd('viewTab', 'drone'); addMissionEntry('\uD83D\uDE80 Deployed ' + (sel && (sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant') ? 'atmospheric probe' : sel.terrainType === 'earthlike' ? 'deep-sea submersible' : 'rover') + ' on ' + (sel ? sel.name : 'planet')); },

                  className: "w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r " + (sel.terrainType === 'earthlike' ? 'from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800' : 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700') + " shadow-lg transition-all hover:scale-[1.01] mt-2"

                }, sel.terrainType === 'earthlike' ? "\uD83D\uDEA4 Launch Deep-Sea Submersible in " + sel.name + "'s Ocean" : (sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant' ? "\uD83D\uDEF8 Launch Atmospheric Probe on " : "\uD83D\uDE97 Deploy Rover on ") + sel.name)

              ),


              // ── INTERIOR VIEW TAB ──
              (d.viewTab) === 'interior' && sel && React.createElement("div", { className: "space-y-3" },
                React.createElement("div", { className: "bg-gradient-to-r from-orange-900 to-red-900 rounded-xl p-4 text-white" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                    React.createElement("span", { className: "text-lg" }, "\uD83C\uDF0B"),
                    React.createElement("h5", { className: "font-bold text-sm" }, sel.name + " Interior Structure")
                  ),
                  React.createElement("p", { className: "text-xs text-orange-200 leading-relaxed" },
                    sel.terrainType === 'gasgiant' ? "Gas giants have no solid surface. Layers of gas compress into liquid and eventually metallic hydrogen." :
                    sel.terrainType === 'icegiant' ? "Ice giants have a rocky core surrounded by exotic ices, superionic water, and possibly diamond rain." :
                    sel.terrainType === 'iceworld' ? "Pluto has a thin nitrogen/methane atmosphere, a water-ice crust over a rocky core, and possibly a subsurface ocean." :
                    "Rocky planets have a layered structure: a metal core, a rocky mantle, and a thin crust."
                  )
                ),
                // Cutaway canvas
                React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-orange-300 shadow-lg", style: { height: '420px' } },
                  React.createElement("canvas", {
                    "aria-label": "Interior cutaway diagram of " + sel.name,
                    style: { width: '100%', height: '100%', display: 'block', background: '#0a0a20' },
                    ref: function(canvasEl) {
                      if (!canvasEl) return;
                      var ctx2 = canvasEl.getContext('2d');
                      if (!ctx2) return;
                      var cw = canvasEl.parentElement.clientWidth || canvasEl.offsetWidth || 600;
                      var ch = 420;
                      canvasEl.width = cw; canvasEl.height = ch;
                      var cx = cw / 2; var cy = ch / 2;
                      var maxR = Math.min(cw, ch) * 0.38;

                      // Planet interior layers by type
                      var layers;
                      if (sel.name === 'Mercury') {
                        layers = [
                          { r: 1.0, color: '#8a7060', label: 'Crust', desc: 'Thin silicate crust, heavily cratered', thick: '100 km' },
                          { r: 0.85, color: '#6a5040', label: 'Mantle', desc: 'Silicate rock mantle', thick: '600 km' },
                          { r: 0.55, color: '#d4a050', label: 'Outer Core', desc: 'Liquid iron-nickel outer core', thick: '500 km' },
                          { r: 0.35, color: '#f0c040', label: 'Inner Core', desc: 'Solid iron inner core \u2014 giant for Mercury\'s size!', thick: '850 km' }
                        ];
                      } else if (sel.name === 'Venus') {
                        layers = [
                          { r: 1.0, color: '#c9a050', label: 'Crust', desc: 'Basaltic volcanic crust, no tectonic plates', thick: '30 km' },
                          { r: 0.95, color: '#a07030', label: 'Upper Mantle', desc: 'Silicate rock, possible partial melt', thick: '500 km' },
                          { r: 0.65, color: '#805020', label: 'Lower Mantle', desc: 'Dense silicate rock under extreme pressure', thick: '2,500 km' },
                          { r: 0.30, color: '#e0b040', label: 'Core', desc: 'Iron-nickel core \u2014 possibly liquid (no magnetic field!)', thick: '3,200 km' }
                        ];
                      } else if (sel.name === 'Earth') {
                        layers = [
                          { r: 1.0, color: '#4a8050', label: 'Crust', desc: 'Oceanic (5 km) + Continental (35 km)', thick: '5\u201335 km' },
                          { r: 0.97, color: '#c07030', label: 'Upper Mantle', desc: 'Asthenosphere \u2014 tectonic plates float here', thick: '670 km' },
                          { r: 0.70, color: '#903020', label: 'Lower Mantle', desc: 'Dense, slow-flowing rock drives convection', thick: '2,200 km' },
                          { r: 0.35, color: '#d09030', label: 'Outer Core', desc: 'Liquid iron-nickel \u2014 creates magnetic field!', thick: '2,260 km' },
                          { r: 0.18, color: '#f0d060', label: 'Inner Core', desc: 'Solid iron ball, 5,400\u00B0C \u2014 hot as Sun\'s surface', thick: '1,220 km' }
                        ];
                      } else if (sel.name === 'Mars') {
                        layers = [
                          { r: 1.0, color: '#b04020', label: 'Crust', desc: 'Iron-oxide basalt \u2014 gives Mars its red color', thick: '50 km' },
                          { r: 0.90, color: '#704030', label: 'Mantle', desc: 'Silicate rock, iron/magnesium-rich', thick: '1,560 km' },
                          { r: 0.40, color: '#d09040', label: 'Core', desc: 'Liquid iron-sulfide core (no magnetic field!)', thick: '1,830 km' }
                        ];
                      } else if (sel.name === 'Jupiter') {
                        layers = [
                          { r: 1.0, color: '#d4924f', label: 'Cloud Tops', desc: 'Ammonia ice clouds, colored bands & storms', thick: '~50 km' },
                          { r: 0.95, color: '#b07030', label: 'Gaseous H\u2082', desc: 'Molecular hydrogen deepening to liquid', thick: '~21,000 km' },
                          { r: 0.65, color: '#7050a0', label: 'Liquid H\u2082', desc: 'Hydrogen compressed to liquid ocean', thick: '~20,000 km' },
                          { r: 0.35, color: '#a070c0', label: 'Metallic H\u2082', desc: 'Metallic hydrogen conducts electricity \u2014 strongest magnetic field!', thick: '~19,000 km' },
                          { r: 0.12, color: '#e0c040', label: 'Rocky Core', desc: 'Diffuse rocky/ice core, 10-20x Earth\'s mass', thick: '~10,000 km' }
                        ];
                      } else if (sel.name === 'Saturn') {
                        layers = [
                          { r: 1.0, color: '#c9a04a', label: 'Cloud Tops', desc: 'Ammonia crystals, golden-white bands', thick: '~50 km' },
                          { r: 0.95, color: '#a08030', label: 'Gaseous H\u2082', desc: 'Molecular hydrogen gas', thick: '~30,000 km' },
                          { r: 0.55, color: '#6040a0', label: 'Liquid H\u2082', desc: 'Liquid hydrogen layer', thick: '~14,000 km' },
                          { r: 0.30, color: '#8060b0', label: 'Metallic H\u2082', desc: 'Metallic hydrogen \u2014 generates magnetic field', thick: '~8,000 km' },
                          { r: 0.10, color: '#e0b040', label: 'Rocky Core', desc: 'Ice/rock core, 9-22x Earth\'s mass', thick: '~8,000 km' }
                        ];
                      } else if (sel.name === 'Uranus') {
                        layers = [
                          { r: 1.0, color: '#80d0d0', label: 'Upper Atmosphere', desc: 'Methane absorbs red light \u2192 cyan color', thick: '~5,000 km' },
                          { r: 0.80, color: '#50a0a0', label: 'H\u2082/He Envelope', desc: 'Hydrogen-helium gas layer', thick: '~7,000 km' },
                          { r: 0.55, color: '#2a5a7a', label: 'Water/Ammonia Ice', desc: 'Superionic water: ice that conducts electricity!', thick: '~10,000 km' },
                          { r: 0.30, color: '#b8d8f8', label: 'Diamond Rain', desc: 'Carbon crushed into diamonds that sink', thick: '~3,000 km' },
                          { r: 0.15, color: '#808060', label: 'Rocky Core', desc: 'Silicate/iron core, ~1x Earth mass', thick: '~3,000 km' }
                        ];
                      } else if (sel.name === 'Neptune') {
                        layers = [
                          { r: 1.0, color: '#4060c0', label: 'Upper Atmosphere', desc: 'Deep blue from methane, supersonic 2,100 km/h winds', thick: '~5,000 km' },
                          { r: 0.80, color: '#3050a0', label: 'H\u2082/He Envelope', desc: 'Hydrogen-helium gas layer', thick: '~7,000 km' },
                          { r: 0.55, color: '#1a2060', label: 'Water/Ammonia Ice', desc: 'Superionic water mantle', thick: '~10,000 km' },
                          { r: 0.30, color: '#a0c8e8', label: 'Diamond Rain', desc: 'Carbon atoms crushed into literal diamonds', thick: '~3,000 km' },
                          { r: 0.15, color: '#606050', label: 'Rocky Core', desc: 'Iron-silicate core, ~1.2x Earth mass', thick: '~4,000 km' }
                        ];
                      } else { // Pluto
                        layers = [
                          { r: 1.0, color: '#d0c8b0', label: 'Nitrogen Ice', desc: 'Frozen N\u2082/CO/CH\u2084 ice surface (Tombaugh Regio)', thick: '~10 km' },
                          { r: 0.92, color: '#8090a0', label: 'Water Ice Crust', desc: 'Rigid water-ice bedrock', thick: '~300 km' },
                          { r: 0.65, color: '#4060a0', label: 'Subsurface Ocean?', desc: 'Possible liquid water ocean kept warm by radioactive decay', thick: '~100 km' },
                          { r: 0.50, color: '#605040', label: 'Rocky Core', desc: 'Silicate rock core, ~70% of Pluto\'s mass', thick: '~850 km' }
                        ];
                      }

                      // Draw starfield
                      ctx2.fillStyle = '#0a0a20';
                      ctx2.fillRect(0, 0, cw, ch);
                      for (var si = 0; si < 120; si++) {
                        var sx = (Math.sin(si * 137.508 + 42) * 0.5 + 0.5) * cw;
                        var sy = (Math.cos(si * 91.3 + 17) * 0.5 + 0.5) * ch;
                        ctx2.fillStyle = 'rgba(255,255,255,' + (0.2 + Math.random() * 0.5) + ')';
                        ctx2.fillRect(sx, sy, 1, 1);
                      }

                      // Draw half-circle cutaway (right half = full planet, left half = cross-section)
                      // Full planet right half
                      for (var li = 0; li < layers.length; li++) {
                        var lr = layers[li].r * maxR;
                        ctx2.beginPath();
                        ctx2.arc(cx, cy, lr, -Math.PI / 2, Math.PI / 2, false);
                        ctx2.fillStyle = layers[li].color;
                        ctx2.fill();
                      }

                      // Cross-section left half (concentric half-circles)
                      for (var li2 = 0; li2 < layers.length; li2++) {
                        var lr2 = layers[li2].r * maxR;
                        ctx2.beginPath();
                        ctx2.arc(cx, cy, lr2, Math.PI / 2, -Math.PI / 2, false);
                        ctx2.closePath();
                        ctx2.fillStyle = layers[li2].color;
                        ctx2.fill();
                        // Layer boundary line
                        if (li2 > 0) {
                          ctx2.beginPath();
                          ctx2.arc(cx, cy, lr2, Math.PI / 2, -Math.PI / 2, false);
                          ctx2.strokeStyle = 'rgba(255,255,255,0.3)';
                          ctx2.lineWidth = 1;
                          ctx2.stroke();
                        }
                      }

                      // Center dividing line
                      ctx2.beginPath();
                      ctx2.moveTo(cx, cy - layers[0].r * maxR);
                      ctx2.lineTo(cx, cy + layers[0].r * maxR);
                      ctx2.strokeStyle = 'rgba(255,255,255,0.6)';
                      ctx2.lineWidth = 2;
                      ctx2.stroke();

                      // Atmospheric glow
                      var glowGrad = ctx2.createRadialGradient(cx, cy, maxR * 0.95, cx, cy, maxR * 1.12);
                      glowGrad.addColorStop(0, layers[0].color + '60');
                      glowGrad.addColorStop(1, 'transparent');
                      ctx2.fillStyle = glowGrad;
                      ctx2.fillRect(0, 0, cw, ch);

                      // Labels on left side (cross-section callouts)
                      ctx2.textAlign = 'right';
                      ctx2.textBaseline = 'middle';
                      for (var li3 = 0; li3 < layers.length; li3++) {
                        var layer = layers[li3];
                        var nextR = li3 < layers.length - 1 ? layers[li3 + 1].r : 0;
                        var midR = ((layer.r + nextR) / 2) * maxR;
                        var labelY = cy - midR * 0.7; // spread labels vertically
                        var labelX = cx - maxR - 20;

                        // Connector line
                        ctx2.beginPath();
                        ctx2.moveTo(labelX + 5, labelY);
                        ctx2.lineTo(cx - midR, cy);
                        ctx2.strokeStyle = 'rgba(255,255,255,0.25)';
                        ctx2.lineWidth = 1;
                        ctx2.setLineDash([3, 3]);
                        ctx2.stroke();
                        ctx2.setLineDash([]);

                        // Label text
                        ctx2.font = 'bold 11px sans-serif';
                        ctx2.fillStyle = '#fff';
                        ctx2.fillText(layer.label, labelX, labelY - 7);
                        ctx2.font = '9px sans-serif';
                        ctx2.fillStyle = '#ccc';
                        ctx2.fillText(layer.thick, labelX, labelY + 7);
                      }

                      // Title
                      ctx2.textAlign = 'center';
                      ctx2.font = 'bold 14px sans-serif';
                      ctx2.fillStyle = '#fff';
                      ctx2.fillText(sel.name + ' Interior', cx, 24);
                      ctx2.font = '10px sans-serif';
                      ctx2.fillStyle = '#aaa';
                      ctx2.fillText('Cross-section (not to scale)', cx, 40);
                    }
                  })
                ),
                // Layer details grid
                React.createElement("div", { className: "space-y-2" },
                  (function() {
                    var interiorLayers;
                    if (sel.name === 'Mercury') interiorLayers = [
                      { label: 'Crust', thick: '~100 km', desc: 'Thin silicate crust, heavily cratered from 4 billion years of impacts', icon: '\uD83E\uDEA8', color: '#8a7060' },
                      { label: 'Mantle', thick: '~600 km', desc: 'Silicate rock mantle \u2014 unusually thin compared to the core', icon: '\uD83C\uDF0B', color: '#6a5040' },
                      { label: 'Iron Core', thick: '~1,850 km', desc: 'Enormous iron core makes up 85% of the planet\'s radius \u2014 the largest core-to-planet ratio in the solar system!', icon: '\u2B50', color: '#f0c040' }
                    ];
                    else if (sel.name === 'Venus') interiorLayers = [
                      { label: 'Volcanic Crust', thick: '~30 km', desc: 'Basaltic surface, 1,600+ volcanoes but no tectonic plates', icon: '\uD83C\uDF0B', color: '#c9a050' },
                      { label: 'Mantle', thick: '~3,000 km', desc: 'Hot silicate rock. May have periodic global resurfacing events', icon: '\uD83D\uDD25', color: '#a07030' },
                      { label: 'Core', thick: '~3,200 km', desc: 'Iron-nickel core, possibly liquid but no magnetic field \u2014 Venus rotates too slowly!', icon: '\uD83E\uDDF2', color: '#e0b040' }
                    ];
                    else if (sel.name === 'Earth') interiorLayers = [
                      { label: 'Crust', thick: '5\u201335 km', desc: 'Oceanic crust (thin, dense basalt) + continental crust (thick, light granite)', icon: '\uD83C\uDF0D', color: '#4a8050' },
                      { label: 'Mantle', thick: '~2,870 km', desc: 'Convecting rock drives plate tectonics. Upper part (asthenosphere) is partially molten', icon: '\uD83C\uDF0B', color: '#c07030' },
                      { label: 'Outer Core', thick: '~2,260 km', desc: 'Liquid iron-nickel \u2014 convection here creates Earth\'s magnetic field (magnetodynamo)', icon: '\uD83E\uDDF2', color: '#d09030' },
                      { label: 'Inner Core', thick: '~1,220 km', desc: 'Solid iron ball at 5,400\u00B0C \u2014 as hot as the Sun\'s surface, kept solid by immense pressure', icon: '\u2B50', color: '#f0d060' }
                    ];
                    else if (sel.name === 'Mars') interiorLayers = [
                      { label: 'Iron-Oxide Crust', thick: '~50 km', desc: 'Thicker than Earth\'s crust. Iron oxide gives Mars its red color', icon: '\uD83D\uDD34', color: '#b04020' },
                      { label: 'Mantle', thick: '~1,560 km', desc: 'Iron and magnesium-rich silicate rock, now mostly inactive', icon: '\uD83C\uDF0B', color: '#704030' },
                      { label: 'Core', thick: '~1,830 km', desc: 'Liquid iron-sulfide. Mars lost its magnetic field ~4 billion years ago when the core stopped convecting', icon: '\uD83E\uDDF2', color: '#d09040' }
                    ];
                    else if (sel.name === 'Jupiter') interiorLayers = [
                      { label: 'Cloud Tops', thick: '~50 km', desc: 'Ammonia ice crystals form the colored bands and Great Red Spot', icon: '\u2601\uFE0F', color: '#d4924f' },
                      { label: 'Gaseous H\u2082', thick: '~21,000 km', desc: 'Molecular hydrogen gas deepening with pressure', icon: '\uD83D\uDCA8', color: '#b07030' },
                      { label: 'Metallic Hydrogen', thick: '~39,000 km', desc: 'Hydrogen compressed so densely it conducts electricity like metal \u2014 generates Jupiter\'s enormous magnetic field', icon: '\u26A1', color: '#a070c0' },
                      { label: 'Rocky Core', thick: '~10,000 km', desc: 'Diffuse core of rock and exotic ices, 10-20x Earth\'s mass, at 20,000\u00B0C', icon: '\uD83E\uDEA8', color: '#e0c040' }
                    ];
                    else if (sel.name === 'Saturn') interiorLayers = [
                      { label: 'Cloud Tops', thick: '~50 km', desc: 'Golden ammonia crystal clouds, less turbulent than Jupiter', icon: '\u2601\uFE0F', color: '#c9a04a' },
                      { label: 'Gaseous H\u2082', thick: '~30,000 km', desc: 'Molecular hydrogen deepening under pressure', icon: '\uD83D\uDCA8', color: '#a08030' },
                      { label: 'Metallic Hydrogen', thick: '~22,000 km', desc: 'Metallic hydrogen ocean \u2014 Saturn is so light it could float in water!', icon: '\u26A1', color: '#8060b0' },
                      { label: 'Rocky Core', thick: '~8,000 km', desc: 'Dense ice/rock core, 9-22x Earth mass', icon: '\uD83E\uDEA8', color: '#e0b040' }
                    ];
                    else if (sel.name === 'Uranus') interiorLayers = [
                      { label: 'Methane Atmosphere', thick: '~5,000 km', desc: 'Methane absorbs red light, giving Uranus its cyan color. Tilted 97.8\u00B0 on its side!', icon: '\uD83D\uDCA0', color: '#80d0d0' },
                      { label: 'H\u2082/He Envelope', thick: '~7,000 km', desc: 'Hydrogen-helium gas transitioning to liquid', icon: '\uD83D\uDCA8', color: '#50a0a0' },
                      { label: 'Superionic Water/Ice', thick: '~10,000 km', desc: 'Water in exotic "superionic" state \u2014 ice that conducts electricity! Plus diamond rain', icon: '\uD83D\uDC8E', color: '#2a5a7a' },
                      { label: 'Rocky Core', thick: '~3,000 km', desc: 'Small silicate/iron core, about 1x Earth mass', icon: '\uD83E\uDEA8', color: '#808060' }
                    ];
                    else if (sel.name === 'Neptune') interiorLayers = [
                      { label: 'Methane Atmosphere', thick: '~5,000 km', desc: 'Deepest blue in the solar system. Winds reach 2,100 km/h \u2014 fastest in the solar system!', icon: '\uD83C\uDF0A', color: '#4060c0' },
                      { label: 'H\u2082/He Envelope', thick: '~7,000 km', desc: 'Hydrogen-helium gas with extreme pressure', icon: '\uD83D\uDCA8', color: '#3050a0' },
                      { label: 'Superionic Water/Diamond Rain', thick: '~13,000 km', desc: 'Superionic water mantle where carbon atoms are crushed into literal diamonds that rain down', icon: '\uD83D\uDC8E', color: '#1a2060' },
                      { label: 'Rocky Core', thick: '~4,000 km', desc: 'Iron-silicate core, ~1.2x Earth mass at 5,400\u00B0C', icon: '\uD83E\uDEA8', color: '#606050' }
                    ];
                    else interiorLayers = [ // Pluto
                      { label: 'Nitrogen Ice', thick: '~10 km', desc: 'Frozen N\u2082, CO, CH\u2084 on the surface. The famous heart-shaped Tombaugh Regio is nitrogen ice', icon: '\u2744\uFE0F', color: '#d0c8b0' },
                      { label: 'Water Ice Crust', thick: '~300 km', desc: 'Rigid water-ice bedrock \u2014 at -230\u00B0C, ice is as hard as rock', icon: '\uD83E\uDDCA', color: '#8090a0' },
                      { label: 'Subsurface Ocean?', thick: '~100 km', desc: 'Scientists believe liquid water may exist beneath the ice, kept warm by radioactive decay in the core', icon: '\uD83D\uDCA7', color: '#4060a0' },
                      { label: 'Rocky Core', thick: '~850 km', desc: 'Silicate rock core makes up ~70% of Pluto\'s mass', icon: '\uD83E\uDEA8', color: '#605040' }
                    ];
                    return interiorLayers.map(function(layer, li) {
                      return React.createElement("div", {
                        key: li,
                        className: "flex items-start gap-3 rounded-lg p-3 border transition-all hover:shadow-md",
                        style: { background: layer.color + '15', borderColor: layer.color + '40' }
                      },
                        React.createElement("div", {
                          className: "w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 mt-0.5",
                          style: { background: layer.color, boxShadow: '0 2px 8px ' + layer.color + '80' }
                        }, layer.icon),
                        React.createElement("div", { className: "flex-1 min-w-0" },
                          React.createElement("div", { className: "flex items-center gap-2 mb-0.5" },
                            React.createElement("span", { className: "text-xs font-bold text-white" }, layer.label),
                            React.createElement("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono" }, layer.thick)
                          ),
                          React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed" }, layer.desc)
                        )
                      );
                    });
                  })()
                )
              ),


              // ── ATMOSPHERE DESCENT SIMULATOR TAB ──
              (d.viewTab) === 'descent' && sel && DESCENT_LAYERS[sel.name] && React.createElement("div", { className: "space-y-3" },
                React.createElement("div", { className: "bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl p-4 text-white" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                    React.createElement("span", { className: "text-lg" }, "\uD83D\uDE80"),
                    React.createElement("h5", { className: "font-bold text-sm" }, sel.name + " Atmospheric Descent")
                  ),
                  React.createElement("p", { className: "text-xs text-indigo-200 leading-relaxed" },
                    "Experience what a probe would encounter descending through " + sel.name + "'s atmosphere. Click a layer to learn more."
                  )
                ),
                // Descent visualization canvas
                React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-indigo-300 shadow-lg", style: { height: '400px' } },
                  React.createElement("canvas", {
                    "aria-label": "Atmospheric descent visualization for " + sel.name,
                    style: { width: '100%', height: '100%', display: 'block' },
                    ref: function(canvasEl) {
                      if (!canvasEl) return;
                      var ctx2 = canvasEl.getContext('2d');
                      if (!ctx2) return;
                      var cw = canvasEl.parentElement.clientWidth || canvasEl.offsetWidth || 600;
                      var ch = 400;
                      canvasEl.width = cw; canvasEl.height = ch;
                      var descentLayers = DESCENT_LAYERS[sel.name] || [];
                      if (descentLayers.length === 0) return;

                      var padding = 40;
                      var layerAreaH = ch - padding * 2;
                      var layerH = layerAreaH / descentLayers.length;
                      var probeY = d._descentProbeY != null ? d._descentProbeY : 0;

                      // Draw layers from top to bottom (highest altitude first)
                      descentLayers.forEach(function(layer, li) {
                        var y = padding + li * layerH;
                        // Layer gradient background
                        var grad = ctx2.createLinearGradient(0, y, 0, y + layerH);
                        grad.addColorStop(0, layer.color);
                        var nextColor = li < descentLayers.length - 1 ? descentLayers[li + 1].color : layer.color;
                        grad.addColorStop(1, nextColor);
                        ctx2.fillStyle = grad;
                        ctx2.fillRect(0, y, cw, layerH);

                        // Layer boundary line
                        if (li > 0) {
                          ctx2.beginPath();
                          ctx2.moveTo(0, y);
                          ctx2.lineTo(cw, y);
                          ctx2.strokeStyle = 'rgba(255,255,255,0.25)';
                          ctx2.lineWidth = 1;
                          ctx2.setLineDash([5, 5]);
                          ctx2.stroke();
                          ctx2.setLineDash([]);
                        }

                        // Altitude label on left
                        ctx2.textAlign = 'left';
                        ctx2.font = 'bold 10px sans-serif';
                        ctx2.fillStyle = 'rgba(255,255,255,0.9)';
                        ctx2.fillText((layer.alt >= 0 ? '+' : '') + layer.alt + ' km', 8, y + 14);

                        // Layer name and description centered
                        ctx2.textAlign = 'center';
                        ctx2.font = 'bold 12px sans-serif';
                        ctx2.fillStyle = '#fff';
                        ctx2.fillText(layer.name, cw / 2, y + layerH / 2 - 10);
                        ctx2.font = '10px sans-serif';
                        ctx2.fillStyle = 'rgba(255,255,255,0.7)';
                        // Word-wrap description
                        var words = layer.desc.split(' ');
                        var line = ''; var lineY = y + layerH / 2 + 6; var maxW = cw * 0.6;
                        words.forEach(function(word) {
                          var test = line + word + ' ';
                          if (ctx2.measureText(test).width > maxW && line) {
                            ctx2.fillText(line.trim(), cw / 2, lineY);
                            lineY += 13; line = word + ' ';
                          } else { line = test; }
                        });
                        if (line.trim()) ctx2.fillText(line.trim(), cw / 2, lineY);

                        // Right side: temp & pressure
                        ctx2.textAlign = 'right';
                        ctx2.font = '9px sans-serif';
                        ctx2.fillStyle = 'rgba(255,200,100,0.9)';
                        ctx2.fillText(layer.temp, cw - 10, y + 14);
                        ctx2.fillStyle = 'rgba(150,200,255,0.8)';
                        ctx2.fillText(layer.pressure, cw - 10, y + 26);
                      });

                      // Probe indicator (animated)
                      var probeLayerIdx = Math.min(descentLayers.length - 1, Math.floor(probeY * descentLayers.length));
                      var probePixelY = padding + probeY * layerAreaH;
                      // Probe glow
                      var probeGlow = ctx2.createRadialGradient(cw * 0.15, probePixelY, 0, cw * 0.15, probePixelY, 20);
                      probeGlow.addColorStop(0, 'rgba(255,255,100,0.6)');
                      probeGlow.addColorStop(1, 'transparent');
                      ctx2.fillStyle = probeGlow;
                      ctx2.fillRect(cw * 0.15 - 20, probePixelY - 20, 40, 40);
                      // Probe icon
                      ctx2.textAlign = 'center';
                      ctx2.font = '16px sans-serif';
                      ctx2.fillText('\uD83D\uDEF0\uFE0F', cw * 0.15, probePixelY + 5);

                      // Title
                      ctx2.textAlign = 'center';
                      ctx2.font = 'bold 12px sans-serif';
                      ctx2.fillStyle = '#fff';
                      ctx2.fillText('\u2193 ' + sel.name + ' Atmosphere Descent', cw / 2, 20);
                    }
                  }),
                  // Descent depth slider overlay
                  React.createElement("div", {
                    className: "absolute bottom-3 left-3 right-3 flex items-center gap-2 bg-black/50 backdrop-blur rounded-lg px-3 py-2"
                  },
                    React.createElement("span", { className: "text-[10px] text-white/70 font-bold" }, "\u2B06 High"),
                    React.createElement("input", {
                      type: "range", min: "0", max: "100", value: (d._descentProbeY || 0) * 100,
                      onChange: function(e) { upd('_descentProbeY', parseInt(e.target.value) / 100); },
                      className: "flex-1 accent-indigo-400",
                      "aria-label": "Descent depth slider",
                      style: { height: '6px' }
                    }),
                    React.createElement("span", { className: "text-[10px] text-white/70 font-bold" }, "\u2B07 Deep")
                  )
                ),
                // Layer detail cards
                React.createElement("div", { className: "space-y-2" },
                  DESCENT_LAYERS[sel.name].map(function(layer, li) {
                    var isActive = d._descentProbeY != null && Math.floor(d._descentProbeY * DESCENT_LAYERS[sel.name].length) === li;
                    return React.createElement("div", {
                      key: li,
                      className: "flex items-center gap-3 rounded-lg p-3 border transition-all cursor-pointer hover:shadow-md",
                      style: {
                        background: isActive ? layer.color + '30' : layer.color + '10',
                        borderColor: isActive ? layer.color : layer.color + '30',
                        boxShadow: isActive ? '0 0 12px ' + layer.color + '40' : 'none'
                      },
                      onClick: function() { upd('_descentProbeY', li / DESCENT_LAYERS[sel.name].length); tryAward('atmosphere_descent'); }
                    },
                      React.createElement("div", {
                        className: "w-3 h-3 rounded-full flex-shrink-0",
                        style: { background: layer.color, boxShadow: isActive ? '0 0 8px ' + layer.color : 'none' }
                      }),
                      React.createElement("div", { className: "flex-1 min-w-0" },
                        React.createElement("div", { className: "flex items-center gap-2" },
                          React.createElement("span", { className: "text-xs font-bold", style: { color: isActive ? '#fff' : '#cbd5e1' } }, layer.name),
                          React.createElement("span", { className: "text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10", style: { color: '#94a3b8' } },
                            (layer.alt >= 0 ? '+' : '') + layer.alt + ' km'
                          )
                        ),
                        React.createElement("p", { className: "text-[10px] mt-0.5", style: { color: isActive ? '#e2e8f0' : '#64748b' } }, layer.desc)
                      ),
                      React.createElement("div", { className: "text-right flex-shrink-0" },
                        React.createElement("div", { className: "text-[9px] font-bold", style: { color: '#f59e0b' } }, layer.temp),
                        React.createElement("div", { className: "text-[9px]", style: { color: '#60a5fa' } }, layer.pressure)
                      )
                    );
                  })
                )
              ),


              // ── ROVER / PROBE TAB (Three.js First-Person) ──

              (d.viewTab) === 'drone' && React.createElement("div", { id: "drone-fullscreen-container" },

                React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-purple-300 shadow-lg", style: { height: '70vh', minHeight: '400px', maxHeight: '800px' } },

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
                        var isOcean = sel.terrainType === 'earthlike'; // Earth gets underwater drone
                        var isFluid = isGas || isOcean; // shared free-movement mechanics

                        var camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 500);

                        camera.position.set(0, isFluid ? 5 : 1.6, 0);

                        var renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });

                        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(W, H);

                        renderer.setClearColor(new THREE.Color(isOcean ? '#041830' : sel.skyColor || '#000000'));



                        // â"€â"€ Sky dome â"€â"€

                        var skyGeo = new THREE.SphereGeometry(200, 32, 16);

                        var skyCv = document.createElement('canvas'); skyCv.setAttribute('aria-hidden', 'true'); skyCv.width = 512; skyCv.height = 256;

                        var sCtx = skyCv.getContext('2d');

                        if (isOcean) {
                          // Underwater sky: light filtering through water surface
                          var sGrad = sCtx.createLinearGradient(0, 0, 0, 256);
                          sGrad.addColorStop(0, '#0a6899'); // bright water surface
                          sGrad.addColorStop(0.15, '#065a80');
                          sGrad.addColorStop(0.4, '#043d5c');
                          sGrad.addColorStop(0.7, '#022840');
                          sGrad.addColorStop(1, '#011020'); // deep dark
                          sCtx.fillStyle = sGrad; sCtx.fillRect(0, 0, 512, 256);
                          // God rays (sunlight shafts through water)
                          sCtx.globalAlpha = 0.08;
                          sCtx.fillStyle = '#88ccff';
                          for (var ray = 0; ray < 12; ray++) {
                            var rx1 = 40 + ray * 38;
                            sCtx.beginPath();
                            sCtx.moveTo(rx1, 0);
                            sCtx.lineTo(rx1 - 20 + ray * 3, 180);
                            sCtx.lineTo(rx1 + 8, 180);
                            sCtx.closePath();
                            sCtx.fill();
                          }
                          sCtx.globalAlpha = 1;
                          // Water surface caustics (light ripple pattern at top)
                          sCtx.globalAlpha = 0.06;
                          sCtx.fillStyle = '#aaddff';
                          for (var ci = 0; ci < 100; ci++) {
                            var ccx = Math.random() * 512, ccy = Math.random() * 40;
                            sCtx.beginPath();
                            sCtx.ellipse(ccx, ccy, 3 + Math.random() * 8, 1 + Math.random() * 3, Math.random() * Math.PI, 0, Math.PI * 2);
                            sCtx.fill();
                          }
                          sCtx.globalAlpha = 1;
                        } else {
                          var sGrad = sCtx.createLinearGradient(0, 0, 0, 256);

                          sGrad.addColorStop(0, sel.skyColor || '#000');

                          sGrad.addColorStop(0.5, sel.terrainType === 'volcanic' ? '#d4923a' : sel.skyColor || '#111');

                          sGrad.addColorStop(1, sel.terrainColor || '#333');

                          sCtx.fillStyle = sGrad; sCtx.fillRect(0, 0, 512, 256);
                        }

                        // Stars for dark worlds

                        if (!isOcean && (sel.terrainType === 'cratered' || sel.terrainType === 'iceworld' || sel.terrainType === 'desert')) {

                          for (var si = 0; si < 200; si++) {

                            sCtx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.5) + ')';

                            sCtx.beginPath(); sCtx.arc(Math.random() * 512, Math.random() * 128, Math.random() * 1.5, 0, Math.PI * 2); sCtx.fill();

                          }

                        }

                        var skyTex = new THREE.CanvasTexture(skyCv);

                        var skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });

                        scene.add(new THREE.Mesh(skyGeo, skyMat));

                        // ── Visible Sun in Sky ──
                        // Sun apparent size varies by planet distance from Sun
                        var sunSizeFactors = { Mercury: 3.2, Venus: 1.9, Earth: 1.0, Mars: 0.65, Jupiter: 0.19, Saturn: 0.1, Uranus: 0.04, Neptune: 0.025, Pluto: 0.02 };
                        var sunSizeFactor = sunSizeFactors[sel.name] || 0.5;
                        var sunRadius = 2.5 * sunSizeFactor;
                        var sunGeo = new THREE.SphereGeometry(sunRadius, 16, 16);
                        var sunMat = new THREE.MeshBasicMaterial({ color: 0xfff8e1 });
                        var sunMesh = new THREE.Mesh(sunGeo, sunMat);
                        sunMesh.position.set(50, 30, 20).normalize().multiplyScalar(180);
                        scene.add(sunMesh);

                        // Sun glow corona
                        var coronaSize = sunRadius * 4;
                        var coronaCv = document.createElement('canvas'); coronaCv.width = 128; coronaCv.height = 128;
                        var coronaCtx = coronaCv.getContext('2d');
                        var coronaGrad = coronaCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
                        coronaGrad.addColorStop(0, 'rgba(255,248,225,0.9)');
                        coronaGrad.addColorStop(0.2, 'rgba(255,240,180,0.5)');
                        coronaGrad.addColorStop(0.5, 'rgba(255,200,100,0.15)');
                        coronaGrad.addColorStop(1, 'rgba(255,180,80,0)');
                        coronaCtx.fillStyle = coronaGrad; coronaCtx.fillRect(0, 0, 128, 128);
                        var coronaTex = new THREE.CanvasTexture(coronaCv);
                        var coronaGeoS = new THREE.PlaneGeometry(coronaSize, coronaSize);
                        var coronaMatS = new THREE.MeshBasicMaterial({ map: coronaTex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
                        var coronaMesh = new THREE.Mesh(coronaGeoS, coronaMatS);
                        coronaMesh.position.copy(sunMesh.position);
                        scene.add(coronaMesh);

                        // ── Horizon Haze (ground fog/dust for atmosphere) ──
                        if (sel.atmosphere && sel.atmosphere !== 'Virtually none' && !isFluid) {
                          var hazeGeo = new THREE.PlaneGeometry(400, 400);
                          var hazeCv = document.createElement('canvas'); hazeCv.width = 64; hazeCv.height = 64;
                          var hazeCtx = hazeCv.getContext('2d');
                          var hazeGrad = hazeCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
                          var hazeColor = sel.terrainType === 'earthlike' ? 'rgba(200,220,255,' : sel.terrainType === 'desert' ? 'rgba(200,160,100,' : sel.terrainType === 'volcanic' ? 'rgba(200,130,50,' : 'rgba(180,180,200,';
                          hazeGrad.addColorStop(0, hazeColor + '0.25)');
                          hazeGrad.addColorStop(1, hazeColor + '0)');
                          hazeCtx.fillStyle = hazeGrad; hazeCtx.fillRect(0, 0, 64, 64);
                          var hazeTex = new THREE.CanvasTexture(hazeCv);
                          var hazeMat2 = new THREE.MeshBasicMaterial({ map: hazeTex, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
                          var hazePlane = new THREE.Mesh(hazeGeo, hazeMat2);
                          hazePlane.rotation.x = -Math.PI / 2;
                          hazePlane.position.y = 0.3;
                          scene.add(hazePlane);
                        }

                        // ── Fog for depth perception ──
                        if (isOcean) {
                          scene.fog = new THREE.FogExp2(0x043d5c, 0.012); // underwater murk
                        } else if (!isGas && sel.terrainType !== 'cratered') {
                          var fogColor = sel.terrainType === 'desert' ? '#c4956b' : sel.terrainType === 'volcanic' ? '#c98030' : sel.terrainType === 'iceworld' ? '#8ab4cc' : '#222222';
                          scene.fog = new THREE.FogExp2(new THREE.Color(fogColor).getHex(), 0.008);
                        }

                        // Hide sun/corona for ocean (underwater)
                        if (isOcean) {
                          sunMesh.visible = false;
                          coronaMesh.visible = false;
                        }

                        // â"€â"€ Terrain (rocky planets) or Cloud layers (gas giants) â"€â"€

                        // Fractal noise helper for realistic terrain
                        var fbm = function(x, z, octaves, lacunarity, gain) {
                          var sum = 0, amp = 1, freq = 1, maxAmp = 0;
                          for (var oi = 0; oi < octaves; oi++) {
                            sum += amp * (Math.sin(x * freq * 0.037 + z * freq * 0.029) * Math.cos(z * freq * 0.041 - x * freq * 0.019) + Math.sin((x + z) * freq * 0.023) * 0.5);
                            maxAmp += amp;
                            amp *= gain;
                            freq *= lacunarity;
                          }
                          return sum / maxAmp;
                        };

                        // Store terrain reference for rover ground-following
                        var _terrainMesh = null;
                        var _terrainHeightAt = function(x, z) { return 0; }; // will be overridden for rocky planets

                        if (isOcean) {
                          // ═══ OCEAN FLOOR TERRAIN (Earth Underwater) ═══
                          var terrainGeo = new THREE.PlaneGeometry(250, 250, 150, 150);
                          var posArr = terrainGeo.attributes.position.array;
                          for (var vi = 0; vi < posArr.length; vi += 3) {
                            var px = posArr[vi], py = posArr[vi + 1];
                            // Ocean floor: rolling sand with rocky outcrops and trenches
                            var h = fbm(px, py, 5, 2.0, 0.5) * 3;
                            h += fbm(px * 0.3, py * 0.3, 3, 2.2, 0.45) * 2;
                            // Underwater ridges
                            h += Math.max(0, fbm(px * 0.1, py * 0.1, 3, 2.5, 0.5) * 2 - 0.3) * 6;
                            // Deep trench
                            var trenchDist = Math.abs(px * 0.8 + py * 0.3 - 15);
                            if (trenchDist < 8) h -= (8 - trenchDist) * 0.8;
                            posArr[vi + 2] = h;
                          }
                          terrainGeo.computeVertexNormals();
                          // Ocean floor texture (sandy with dark patches)
                          var tCv = document.createElement('canvas'); tCv.setAttribute('aria-hidden', 'true'); tCv.width = 512; tCv.height = 512;
                          var tCx = tCv.getContext('2d');
                          for (var ty = 0; ty < 512; ty++) {
                            for (var tx = 0; tx < 512; tx++) {
                              var n = fbm(tx * 0.8, ty * 0.8, 3, 2.5, 0.5) * 0.5 + 0.5;
                              var sand = 0.65 + n * 0.15;
                              var cr = Math.round((0.55 * sand + 0.1) * 180);
                              var cg = Math.round((0.50 * sand + 0.15) * 160);
                              var cb = Math.round((0.35 * sand + 0.25) * 140);
                              var speck = (Math.random() - 0.5) * 8;
                              tCx.fillStyle = 'rgb(' + Math.max(0, Math.min(255, cr + speck)) + ',' + Math.max(0, Math.min(255, cg + speck)) + ',' + Math.max(0, Math.min(255, cb + speck)) + ')';
                              tCx.fillRect(tx, ty, 1, 1);
                            }
                          }
                          var terrainTex = new THREE.CanvasTexture(tCv);
                          terrainTex.wrapS = terrainTex.wrapT = THREE.RepeatWrapping; terrainTex.repeat.set(12, 12);
                          var terrainMat = new THREE.MeshStandardMaterial({ map: terrainTex, roughness: 0.92, metalness: 0.1, flatShading: true });
                          var terrain = new THREE.Mesh(terrainGeo, terrainMat);
                          terrain.rotation.x = -Math.PI / 2;
                          terrain.position.y = -25; // ocean floor is deep below start
                          scene.add(terrain);
                          _terrainMesh = terrain;
                          var _terrainRay = new THREE.Raycaster();
                          _terrainHeightAt = function(x, z) {
                            _terrainRay.set(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));
                            var hits = _terrainRay.intersectObject(_terrainMesh);
                            return hits.length > 0 ? hits[0].point.y : -25;
                          };

                          // Coral formations (with bioluminescent glow)
                          var coralColors = [0xff6b8a, 0xff8c42, 0xffd166, 0x06d6a0, 0x8338ec, 0xf72585];
                          var coralLights = [];
                          for (var ci = 0; ci < 40; ci++) {
                            var coralType = ci % 3;
                            var cGeo, cMat;
                            var cColor = coralColors[ci % coralColors.length];
                            if (coralType === 0) {
                              // Branch coral
                              cGeo = new THREE.ConeGeometry(0.3 + Math.random() * 0.5, 1.5 + Math.random() * 2, 5 + Math.floor(Math.random() * 4));
                              cMat = new THREE.MeshStandardMaterial({ color: cColor, roughness: 0.7, metalness: 0.1, flatShading: true, emissive: cColor, emissiveIntensity: 0.15 });
                            } else if (coralType === 1) {
                              // Fan coral
                              cGeo = new THREE.PlaneGeometry(1 + Math.random() * 1.5, 1.5 + Math.random() * 2, 3, 3);
                              var cPos = cGeo.attributes.position.array;
                              for (var cpv = 0; cpv < cPos.length; cpv += 3) { cPos[cpv + 2] = Math.random() * 0.2; }
                              cGeo.computeVertexNormals();
                              cMat = new THREE.MeshStandardMaterial({ color: cColor, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.85, emissive: cColor, emissiveIntensity: 0.12 });
                            } else {
                              // Brain/mound coral
                              cGeo = new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.8, 1);
                              var bPos = cGeo.attributes.position.array;
                              for (var bpv = 0; bpv < bPos.length; bpv += 3) { bPos[bpv + 1] *= 0.5 + Math.random() * 0.3; }
                              cGeo.computeVertexNormals();
                              cMat = new THREE.MeshStandardMaterial({ color: cColor, roughness: 0.8, metalness: 0.05, flatShading: true, emissive: cColor, emissiveIntensity: 0.1 });
                            }
                            var coral = new THREE.Mesh(cGeo, cMat);
                            var ccx = (Math.random() - 0.5) * 160, ccz = (Math.random() - 0.5) * 160;
                            var ccy = _terrainHeightAt(ccx, ccz);
                            coral.position.set(ccx, ccy + 0.5, ccz);
                            coral.rotation.set(Math.random() * 0.3, Math.random() * Math.PI * 2, Math.random() * 0.3);
                            scene.add(coral);
                            // Every 5th coral gets a small point light for visible bioluminescent glow
                            if (ci % 5 === 0) {
                              var clGlow = new THREE.PointLight(cColor, 0.3, 4);
                              clGlow.position.set(ccx, ccy + 1.2, ccz);
                              clGlow._coralPhase = Math.random() * Math.PI * 2;
                              scene.add(clGlow);
                              coralLights.push(clGlow);
                            }
                          }

                          // Kelp forests (tall swaying columns)
                          var kelpGroup = [];
                          for (var ki = 0; ki < 25; ki++) {
                            var kx = (Math.random() - 0.5) * 140, kz = (Math.random() - 0.5) * 140;
                            var ky = _terrainHeightAt(kx, kz);
                            var kHeight = 4 + Math.random() * 8;
                            var kGeo = new THREE.CylinderGeometry(0.06, 0.1, kHeight, 4);
                            var kMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.7, transparent: true, opacity: 0.8 });
                            var kelp = new THREE.Mesh(kGeo, kMat);
                            kelp.position.set(kx, ky + kHeight * 0.5, kz);
                            kelp._kelpPhase = Math.random() * Math.PI * 2;
                            kelp._kelpBaseX = kx;
                            scene.add(kelp);
                            kelpGroup.push(kelp);
                            // Kelp leaves (flat planes along the stalk)
                            for (var kl = 0; kl < 3; kl++) {
                              var leafGeo = new THREE.PlaneGeometry(0.6, 0.3);
                              var leafMat = new THREE.MeshStandardMaterial({ color: 0x40916c, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
                              var leaf = new THREE.Mesh(leafGeo, leafMat);
                              leaf.position.set(kx + (Math.random() - 0.5) * 0.3, ky + kHeight * (0.3 + kl * 0.25), kz + (Math.random() - 0.5) * 0.3);
                              leaf.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.5);
                              scene.add(leaf);
                            }
                          }

                          // Hydrothermal vent (near the trench)
                          var ventGeo = new THREE.ConeGeometry(1.2, 3, 8);
                          var vPos = ventGeo.attributes.position.array;
                          for (var vvi = 0; vvi < vPos.length; vvi += 3) { vPos[vvi] *= 0.7 + Math.random() * 0.6; vPos[vvi + 2] *= 0.7 + Math.random() * 0.6; }
                          ventGeo.computeVertexNormals();
                          var ventMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.95, flatShading: true });
                          var vent = new THREE.Mesh(ventGeo, ventMat);
                          var ventY = _terrainHeightAt(15, -5);
                          vent.position.set(15, ventY + 1.2, -5);
                          scene.add(vent);
                          // Vent particle glow
                          var ventLight = new THREE.PointLight(0xff6600, 1.5, 15);
                          ventLight.position.set(15, ventY + 3.5, -5);
                          scene.add(ventLight);

                          // Underwater lighting: blue-green ambient, dim directional from above
                          scene.add(new THREE.AmbientLight(0x1a4a6a, 0.8));
                          var waterLight = new THREE.DirectionalLight(0x88bbdd, 0.4);
                          waterLight.position.set(0, 50, 0);
                          scene.add(waterLight);
                          // Caustic light that moves (simulates surface ripple light)
                          var causticLight = new THREE.PointLight(0x66aacc, 0.6, 60);
                          causticLight.position.set(0, 15, 0);
                          scene.add(causticLight);

                          // ── Animated caustic light pattern on seafloor ──
                          var causticCv = document.createElement('canvas'); causticCv.width = 256; causticCv.height = 256;
                          var causticCtx2 = causticCv.getContext('2d');
                          var causticTex = new THREE.CanvasTexture(causticCv);
                          causticTex.wrapS = causticTex.wrapT = THREE.RepeatWrapping;
                          causticTex.repeat.set(6, 6);
                          var causticPlane = new THREE.Mesh(
                            new THREE.PlaneGeometry(120, 120),
                            new THREE.MeshBasicMaterial({ map: causticTex, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending })
                          );
                          causticPlane.rotation.x = -Math.PI / 2;
                          causticPlane.position.y = -24.5; // just above seafloor
                          scene.add(causticPlane);

                          // ── Shark silhouette (distant, cruising) ──
                          var sharkGroup = new THREE.Group();
                          // Body - elongated cone
                          var sharkBody = new THREE.Mesh(
                            new THREE.ConeGeometry(0.3, 2.5, 5),
                            new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.6 })
                          );
                          sharkBody.rotation.x = Math.PI / 2;
                          sharkGroup.add(sharkBody);
                          // Dorsal fin
                          var dorsalGeo = new THREE.PlaneGeometry(0.05, 0.5);
                          var dorsalMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5a, side: THREE.DoubleSide });
                          var dorsal = new THREE.Mesh(dorsalGeo, dorsalMat);
                          dorsal.position.set(0, 0.3, -0.3);
                          dorsal.rotation.x = -0.2;
                          sharkGroup.add(dorsal);
                          // Tail fin
                          var tailGeo2 = new THREE.PlaneGeometry(0.4, 0.5);
                          var tailMesh2 = new THREE.Mesh(tailGeo2, dorsalMat.clone());
                          tailMesh2.position.set(0, 0.15, 1.3);
                          tailMesh2.rotation.x = -0.3;
                          sharkGroup.add(tailMesh2);
                          sharkGroup.position.set(-40, -1, 30);
                          sharkGroup.scale.setScalar(2);
                          sharkGroup._sharkAngle = 0;
                          scene.add(sharkGroup);

                          // ── Tropical fish school near coral (small colorful fish) ──
                          var tropicalFish = new THREE.Group();
                          var tropColors = [0xff6b6b, 0xffd93d, 0x4ecdc4, 0xff8a5c, 0xa78bfa, 0x06d6a0];
                          for (var tfi = 0; tfi < 20; tfi++) {
                            var tfGeo = new THREE.ConeGeometry(0.04, 0.15, 3);
                            tfGeo.rotateX(-Math.PI / 2);
                            var tfMesh = new THREE.Mesh(tfGeo, new THREE.MeshStandardMaterial({ color: tropColors[tfi % tropColors.length], roughness: 0.4 }));
                            tfMesh.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 4);
                            tfMesh._tfPhase = Math.random() * Math.PI * 2;
                            tropicalFish.add(tfMesh);
                          }
                          // Position near a coral area
                          var tfBaseX = 10, tfBaseZ = -8;
                          tropicalFish.position.set(tfBaseX, _terrainHeightAt(tfBaseX, tfBaseZ) + 2, tfBaseZ);
                          tropicalFish._basePos = tropicalFish.position.clone();
                          tropicalFish._swimAngle = 0;
                          scene.add(tropicalFish);

                          // ── Fish Schools (groups of small fish that swim together) ──
                          var fishSchools = [];
                          for (var fsi = 0; fsi < 6; fsi++) {
                            var schoolGroup = new THREE.Group();
                            var fishCount = 8 + Math.floor(Math.random() * 12);
                            var fishColor = [0x6699cc, 0x44aa88, 0xaacc44, 0xcc8844, 0x8866cc, 0xcc6677][fsi % 6];
                            for (var fi = 0; fi < fishCount; fi++) {
                              // Simple fish: elongated tetrahedron
                              var fishGeo = new THREE.ConeGeometry(0.08, 0.3, 3);
                              fishGeo.rotateX(-Math.PI / 2);
                              var fishMat = new THREE.MeshStandardMaterial({ color: fishColor, roughness: 0.5, metalness: 0.3 });
                              var fish = new THREE.Mesh(fishGeo, fishMat);
                              fish.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 3);
                              fish._fishPhase = Math.random() * Math.PI * 2;
                              schoolGroup.add(fish);
                            }
                            var schoolDepth = -2 + fsi * -3; // spread across depths
                            schoolGroup.position.set((Math.random() - 0.5) * 100, schoolDepth, (Math.random() - 0.5) * 100);
                            schoolGroup._swimAngle = Math.random() * Math.PI * 2;
                            schoolGroup._swimSpeed = 0.005 + Math.random() * 0.008;
                            schoolGroup._swimRadius = 15 + Math.random() * 20;
                            schoolGroup._basePos = schoolGroup.position.clone();
                            scene.add(schoolGroup);
                            fishSchools.push(schoolGroup);
                          }

                          // ── Whale Silhouette (distant, slowly gliding) ──
                          var whaleGroup = new THREE.Group();
                          // Whale body (elongated ellipsoid)
                          var whaleBodyGeo = new THREE.SphereGeometry(1, 12, 8);
                          whaleBodyGeo.scale(3.5, 1, 1.2);
                          var whaleMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.8, metalness: 0.1 });
                          whaleGroup.add(new THREE.Mesh(whaleBodyGeo, whaleMat));
                          // Whale tail fluke
                          var flukeGeo = new THREE.PlaneGeometry(2.2, 0.8);
                          var flukeMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, side: THREE.DoubleSide, roughness: 0.7 });
                          var fluke = new THREE.Mesh(flukeGeo, flukeMat);
                          fluke.position.set(3.8, 0, 0);
                          fluke.rotation.y = Math.PI / 2;
                          whaleGroup.add(fluke);
                          // Whale belly (lighter underside)
                          var bellyGeo = new THREE.SphereGeometry(0.85, 10, 6);
                          bellyGeo.scale(2.8, 0.6, 1.0);
                          var bellyMat = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.7 });
                          var belly = new THREE.Mesh(bellyGeo, bellyMat);
                          belly.position.set(-0.3, -0.3, 0);
                          whaleGroup.add(belly);
                          whaleGroup.position.set(60, -2, -40);
                          whaleGroup.scale.setScalar(1.5);
                          whaleGroup._whaleAngle = 0;
                          scene.add(whaleGroup);

                          // ── Jellyfish (translucent, pulsing) ──
                          var jellyfish = [];
                          for (var ji = 0; ji < 8; ji++) {
                            var jellyGroup = new THREE.Group();
                            // Bell
                            var bellGeo = new THREE.SphereGeometry(0.25 + Math.random() * 0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
                            var jellyColor = [0x88aaff, 0xff88cc, 0x88ffbb, 0xffaa66, 0xcc88ff][ji % 5];
                            var bellMat = new THREE.MeshStandardMaterial({ color: jellyColor, transparent: true, opacity: 0.35, side: THREE.DoubleSide, emissive: jellyColor, emissiveIntensity: 0.2 });
                            jellyGroup.add(new THREE.Mesh(bellGeo, bellMat));
                            // Tentacles (thin cylinders)
                            for (var ti = 0; ti < 5; ti++) {
                              var tentGeo = new THREE.CylinderGeometry(0.01, 0.005, 0.6 + Math.random() * 0.5, 3);
                              var tentMat = new THREE.MeshBasicMaterial({ color: jellyColor, transparent: true, opacity: 0.25 });
                              var tent = new THREE.Mesh(tentGeo, tentMat);
                              tent.position.set((Math.random() - 0.5) * 0.15, -0.4, (Math.random() - 0.5) * 0.15);
                              jellyGroup.add(tent);
                            }
                            var jDepth = -3 - Math.random() * 12;
                            jellyGroup.position.set((Math.random() - 0.5) * 80, jDepth, (Math.random() - 0.5) * 80);
                            jellyGroup._jellyPhase = Math.random() * Math.PI * 2;
                            jellyGroup._jellyBaseY = jDepth;
                            scene.add(jellyGroup);
                            jellyfish.push(jellyGroup);
                          }

                          // ── Vent smoke particles (rising from hydrothermal vent) ──
                          var ventSmoke = new THREE.BufferGeometry();
                          var ventSmokePos = new Float32Array(60 * 3);
                          for (var vsi = 0; vsi < 60; vsi++) {
                            ventSmokePos[vsi * 3] = 15 + (Math.random() - 0.5) * 2;
                            ventSmokePos[vsi * 3 + 1] = ventY + 2 + Math.random() * 6;
                            ventSmokePos[vsi * 3 + 2] = -5 + (Math.random() - 0.5) * 2;
                          }
                          ventSmoke.setAttribute('position', new THREE.BufferAttribute(ventSmokePos, 3));
                          var ventSmokeMesh = new THREE.Points(ventSmoke, new THREE.PointsMaterial({ color: 0x554433, size: 0.15, transparent: true, opacity: 0.3 }));
                          scene.add(ventSmokeMesh);

                        } else if (!isFluid) {
                          var terrainGeo = new THREE.PlaneGeometry(250, 250, 150, 150);
                          var posArr = terrainGeo.attributes.position.array;
                          var heightMap = {};
                          for (var vi = 0; vi < posArr.length; vi += 3) {
                            var px = posArr[vi], py = posArr[vi + 1];
                            var h = 0;
                            if (sel.terrainType === 'volcanic') {
                              h = fbm(px, py, 5, 2.2, 0.5) * 8 + Math.abs(Math.sin(px * 0.02) * Math.cos(py * 0.015)) * 6;
                              h += Math.max(0, fbm(px * 0.3, py * 0.3, 3, 2, 0.6)) * 12; // volcanic peaks
                              var crater = Math.sqrt(px * px + py * py);
                              if (crater < 15) h += (15 - crater) * 0.8; // central caldera rim
                              if (crater < 8) h -= (8 - crater) * 0.6; // caldera basin
                            } else if (sel.terrainType === 'earthlike') {
                              h = fbm(px, py, 6, 2.0, 0.5) * 5;
                              h += fbm(px * 0.5, py * 0.5, 3, 2.5, 0.4) * 3; // rolling hills
                              h += Math.max(0, fbm(px * 0.1, py * 0.1, 4, 2, 0.55) * 2 - 0.5) * 8; // occasional mountains
                            } else if (sel.terrainType === 'desert') {
                              h = fbm(px, py, 4, 2.3, 0.45) * 2.5;
                              h += Math.sin(px * 0.04 + py * 0.01) * Math.sin(px * 0.01 - py * 0.03) * 4; // sweeping dunes
                              h += Math.abs(fbm(px * 0.7, py * 0.7, 2, 2, 0.5)) * 1.5; // ripples
                            } else if (sel.terrainType === 'iceworld') {
                              h = fbm(px, py, 5, 2.1, 0.48) * 3;
                              h += Math.max(0, fbm(px * 0.2, py * 0.2, 3, 2.3, 0.5)) * 6; // ice ridges
                              var crevasse = Math.sin(px * 0.08 + py * 0.03) * Math.sin(py * 0.06);
                              if (crevasse > 0.7) h -= 2; // ice crevasses
                            } else {
                              // Generic rocky (Mercury, Moon)
                              h = fbm(px, py, 5, 2.0, 0.5) * 4;
                              h += fbm(px * 0.3, py * 0.3, 3, 2.2, 0.45) * 2;
                              // Impact craters
                              var cx0 = [20, -30, 45, -15, 60], cz0 = [25, -20, -35, 40, -50], cr0 = [12, 8, 15, 6, 10];
                              for (var ci = 0; ci < cx0.length; ci++) {
                                var dist = Math.sqrt(Math.pow(px - cx0[ci], 2) + Math.pow(py - cz0[ci], 2));
                                if (dist < cr0[ci]) {
                                  var rim = 1 - dist / cr0[ci];
                                  h += (dist < cr0[ci] * 0.8) ? -rim * 3 : rim * 2; // bowl with rim
                                }
                              }
                            }
                            posArr[vi + 2] = h;
                          }
                          terrainGeo.computeVertexNormals();

                          // Higher-resolution terrain texture (512x512)
                          var tCv = document.createElement('canvas'); tCv.setAttribute('aria-hidden', 'true'); tCv.width = 512; tCv.height = 512;
                          var tCx = tCv.getContext('2d');
                          var baseC = new THREE.Color(sel.terrainColor || '#886644');
                          var secC = sel.terrainType === 'volcanic' ? new THREE.Color('#331100') :
                                     sel.terrainType === 'earthlike' ? new THREE.Color('#4a6741') :
                                     sel.terrainType === 'desert' ? new THREE.Color('#c4a35a') :
                                     sel.terrainType === 'iceworld' ? new THREE.Color('#b8d4e3') :
                                     new THREE.Color('#665544');
                          for (var ty = 0; ty < 512; ty++) {
                            for (var tx = 0; tx < 512; tx++) {
                              var n1 = fbm(tx * 0.8, ty * 0.8, 3, 2.5, 0.5) * 0.5 + 0.5;
                              var n2 = (Math.sin(tx * 0.15 + ty * 0.12) * 0.5 + 0.5) * 0.3;
                              var n = n1 * 0.7 + n2 * 0.3;
                              var cr = Math.round((baseC.r * (1 - n * 0.4) + secC.r * n * 0.4) * 255);
                              var cg = Math.round((baseC.g * (1 - n * 0.4) + secC.g * n * 0.4) * 255);
                              var cb = Math.round((baseC.b * (1 - n * 0.4) + secC.b * n * 0.4) * 255);
                              // Subtle speckling
                              var speck = (Math.random() - 0.5) * 12;
                              tCx.fillStyle = 'rgb(' + Math.max(0, Math.min(255, cr + speck)) + ',' + Math.max(0, Math.min(255, cg + speck * 0.7)) + ',' + Math.max(0, Math.min(255, cb + speck * 0.5)) + ')';
                              tCx.fillRect(tx, ty, 1, 1);
                            }
                          }
                          var terrainTex = new THREE.CanvasTexture(tCv);
                          terrainTex.wrapS = terrainTex.wrapT = THREE.RepeatWrapping; terrainTex.repeat.set(12, 12);
                          var terrainMat = new THREE.MeshStandardMaterial({ map: terrainTex, roughness: 0.92, metalness: 0.05, flatShading: true });
                          var terrain = new THREE.Mesh(terrainGeo, terrainMat);
                          terrain.rotation.x = -Math.PI / 2; scene.add(terrain);
                          _terrainMesh = terrain;

                          // Build height lookup via raycaster for rover ground-following
                          var _terrainRay = new THREE.Raycaster();
                          _terrainHeightAt = function(x, z) {
                            _terrainRay.set(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));
                            var hits = _terrainRay.intersectObject(_terrainMesh);
                            return hits.length > 0 ? hits[0].point.y : 0;
                          };

                          // Add scattered rocks and boulders for visual detail
                          var rockMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(sel.terrainColor || '#886644').multiplyScalar(0.7), roughness: 0.95, metalness: 0.05, flatShading: true });
                          for (var ri = 0; ri < 60; ri++) {
                            var rx = (Math.random() - 0.5) * 180, rz = (Math.random() - 0.5) * 180;
                            var rScale = 0.2 + Math.random() * 1.5;
                            var rockGeo = new THREE.DodecahedronGeometry(rScale, 0);
                            // Deform vertices for natural look
                            var rPos = rockGeo.attributes.position.array;
                            for (var rvi = 0; rvi < rPos.length; rvi += 3) {
                              rPos[rvi] *= 0.7 + Math.random() * 0.6;
                              rPos[rvi + 1] *= 0.5 + Math.random() * 0.5;
                              rPos[rvi + 2] *= 0.7 + Math.random() * 0.6;
                            }
                            rockGeo.computeVertexNormals();
                            var rock = new THREE.Mesh(rockGeo, rockMat);
                            var ry = _terrainHeightAt(rx, rz);
                            rock.position.set(rx, ry + rScale * 0.3, rz);
                            rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                            scene.add(rock);
                          }

                          // ═══ PLANET-SPECIFIC TERRAIN FEATURES ═══

                          // Mars: Polar ice caps at terrain edges
                          if (sel.terrainType === 'desert') {
                            var iceCap1 = new THREE.CircleGeometry(25, 24);
                            var iceCapMat = new THREE.MeshStandardMaterial({
                              color: 0xeef4f8, roughness: 0.3, metalness: 0.1,
                              transparent: true, opacity: 0.75
                            });
                            var iceMesh1 = new THREE.Mesh(iceCap1, iceCapMat);
                            iceMesh1.rotation.x = -Math.PI / 2;
                            iceMesh1.position.set(0, _terrainHeightAt(0, -100) + 0.15, -100);
                            scene.add(iceMesh1);
                            var iceMesh2 = new THREE.Mesh(iceCap1.clone(), iceCapMat.clone());
                            iceMesh2.rotation.x = -Math.PI / 2;
                            iceMesh2.position.set(0, _terrainHeightAt(0, 100) + 0.15, 100);
                            scene.add(iceMesh2);
                            // Frost dusting near poles
                            for (var frosti = 0; frosti < 20; frosti++) {
                              var frostGeo = new THREE.CircleGeometry(1.5 + Math.random() * 3, 8);
                              var frostMat2 = new THREE.MeshStandardMaterial({ color: 0xddeeff, transparent: true, opacity: 0.25 + Math.random() * 0.15, roughness: 0.2 });
                              var frostMesh = new THREE.Mesh(frostGeo, frostMat2);
                              frostMesh.rotation.x = -Math.PI / 2;
                              var fz = (frosti < 10 ? -1 : 1) * (70 + Math.random() * 40);
                              var fx = (Math.random() - 0.5) * 60;
                              frostMesh.position.set(fx, _terrainHeightAt(fx, fz) + 0.1, fz);
                              scene.add(frostMesh);
                            }
                          }

                          // Venus: Pancake dome formations (unique flat-topped volcanoes)
                          if (sel.terrainType === 'volcanic') {
                            for (var pdi = 0; pdi < 4; pdi++) {
                              var pdX = (Math.random() - 0.5) * 140;
                              var pdZ = (Math.random() - 0.5) * 140;
                              var pdR = 5 + Math.random() * 8;
                              var pdH = 1.5 + Math.random() * 2;
                              var pdGeo = new THREE.CylinderGeometry(pdR, pdR * 1.2, pdH, 16, 1, false);
                              // Slightly round the top
                              var pdPos = pdGeo.attributes.position.array;
                              for (var pdv = 0; pdv < pdPos.length; pdv += 3) {
                                if (pdPos[pdv + 1] > pdH * 0.3) {
                                  var dist2 = Math.sqrt(pdPos[pdv] * pdPos[pdv] + pdPos[pdv + 2] * pdPos[pdv + 2]) / pdR;
                                  pdPos[pdv + 1] -= dist2 * dist2 * pdH * 0.15;
                                }
                              }
                              pdGeo.computeVertexNormals();
                              var pdMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.85, flatShading: true });
                              var pdMesh = new THREE.Mesh(pdGeo, pdMat);
                              var pdY = _terrainHeightAt(pdX, pdZ);
                              pdMesh.position.set(pdX, pdY + pdH * 0.3, pdZ);
                              scene.add(pdMesh);
                            }
                          }

                          // Pluto: Cantaloupe terrain ridges (irregular mound pattern)
                          if (sel.terrainType === 'iceworld') {
                            for (var cti = 0; cti < 30; cti++) {
                              var ctX = (Math.random() - 0.5) * 120;
                              var ctZ = (Math.random() - 0.5) * 120;
                              var ctR = 1 + Math.random() * 2.5;
                              var ctGeo = new THREE.DodecahedronGeometry(ctR, 0);
                              var ctPos2 = ctGeo.attributes.position.array;
                              for (var ctv = 0; ctv < ctPos2.length; ctv += 3) {
                                ctPos2[ctv + 1] *= 0.35; // flatten into ridge mound
                              }
                              ctGeo.computeVertexNormals();
                              var ctMat = new THREE.MeshStandardMaterial({ color: 0xb8d4e3, roughness: 0.4, metalness: 0.15, flatShading: true });
                              var ctMesh = new THREE.Mesh(ctGeo, ctMat);
                              ctMesh.position.set(ctX, _terrainHeightAt(ctX, ctZ) + ctR * 0.2, ctZ);
                              ctMesh.rotation.y = Math.random() * Math.PI * 2;
                              scene.add(ctMesh);
                            }
                          }

                          // ═══ GEOLOGICAL SAMPLE COLLECTION (Rocky Planets) ═══
                          var geoSamples = [];
                          var geoSampleOrbs = [];
                          var geoSampleCooldown = 0;
                          var ROCK_SAMPLES = {
                            Mercury: [
                              { name: 'Iron-Rich Regolith', icon: '\u2699\uFE0F', type: 'Soil', color: 0x8a8278, xp: 8, fact: 'Mercury\u2019s surface is rich in iron and magnesium silicates. The entire planet shrank as its huge iron core cooled!' },
                              { name: 'Impact Melt Glass', icon: '\uD83D\uDCA0', type: 'Glass', color: 0x44aa66, xp: 10, fact: 'Violent impacts melt rock into glass beads. Mercury\u2019s surface is heavily cratered from billions of years of bombardment.' },
                              { name: 'Volcanic Basalt', icon: '\uD83E\uDEA8', type: 'Igneous', color: 0x555555, xp: 12, fact: 'Ancient lava plains cover much of Mercury. Volcanism stopped ~3.5 billion years ago when the core cooled.' },
                              { name: 'Sulfur Deposit', icon: '\uD83D\uDFE1', type: 'Element', color: 0xccaa00, xp: 15, fact: 'Mercury has surprisingly high sulfur content \u2014 up to 4%! This was unexpected and challenges formation models.' }
                            ],
                            Venus: [
                              { name: 'Basaltic Lava Rock', icon: '\uD83C\uDF0B', type: 'Igneous', color: 0x6b3a1a, xp: 8, fact: 'Venus\u2019s surface is 90% basalt from volcanic eruptions. The planet may still have active volcanoes today!' },
                              { name: 'Sulfuric Acid Crystal', icon: '\uD83E\uDDEA', type: 'Chemical', color: 0xcccc00, xp: 12, fact: 'The atmosphere rains sulfuric acid, but it evaporates before reaching the surface due to the extreme heat.' },
                              { name: 'Pyrite (Fool\u2019s Gold)', icon: '\u2728', type: 'Mineral', color: 0xddbb44, xp: 10, fact: 'Mountain peaks on Venus may be coated in metallic \u201Csnow\u201D made of lead sulfide and bismuth sulfide!' },
                              { name: 'Pancake Dome Fragment', icon: '\uD83E\uDEA8', type: 'Volcanic', color: 0x8a6a4a, xp: 15, fact: 'Venus has unique flat-topped volcanic domes up to 65 km across, formed by extremely viscous lava.' }
                            ],
                            Mars: [
                              { name: 'Iron Oxide Dust', icon: '\uD83D\uDD34', type: 'Soil', color: 0xb5452a, xp: 5, fact: 'Mars is red because its soil is rich in iron oxide (rust). The entire planet is literally rusty!' },
                              { name: 'Hematite Blueberry', icon: '\u26AB', type: 'Mineral', color: 0x333344, xp: 10, fact: 'Opportunity rover found tiny hematite spheres called \u201Cblueberries\u201D \u2014 proof that water once flowed on Mars!' },
                              { name: 'Perchlorate Salt', icon: '\uD83E\uDDC2', type: 'Chemical', color: 0xddddcc, xp: 12, fact: 'Martian soil contains toxic perchlorates \u2014 bad for humans, but bacteria on Earth can use them as fuel!' },
                              { name: 'Olivine Crystal', icon: '\uD83D\uDC8E', type: 'Mineral', color: 0x66aa44, xp: 15, fact: 'Green olivine has been found in Martian meteorites. On Earth, it\u2019s a semi-precious gemstone called peridot.' },
                              { name: 'Methane Ice', icon: '\u2744\uFE0F', type: 'Volatile', color: 0xaaccee, xp: 18, fact: 'Curiosity detected seasonal methane spikes. Is it geological or biological? One of Mars\u2019s biggest mysteries!' }
                            ],
                            Pluto: [
                              { name: 'Nitrogen Ice', icon: '\u2744\uFE0F', type: 'Ice', color: 0xddddee, xp: 8, fact: 'Sputnik Planitia is a vast plain of nitrogen ice that slowly churns via convection, like a giant lava lamp!' },
                              { name: 'Tholin Deposit', icon: '\uD83D\uDFE4', type: 'Organic', color: 0x8b4513, xp: 12, fact: 'Tholins are complex organic molecules made when UV light hits methane. They give Pluto its reddish color.' },
                              { name: 'Water Ice Bedrock', icon: '\uD83E\uDDCA', type: 'Ice', color: 0xccddee, xp: 10, fact: 'Pluto\u2019s mountains are made of water ice \u2014 at -230\u00B0C, water ice is as hard as rock!' },
                              { name: 'Methane Frost', icon: '\u2728', type: 'Volatile', color: 0xeeeeff, xp: 15, fact: 'Methane frosts coat Pluto\u2019s peaks like snow caps on Earth. When closer to the Sun, they sublimate into a thin atmosphere.' }
                            ]
                          };
                          var planetSamples = ROCK_SAMPLES[sel.name] || [
                            { name: 'Rock Sample', icon: '\uD83E\uDEA8', type: 'Generic', color: 0x886644, xp: 8, fact: 'A mineral sample from ' + sel.name + '\u2019s surface for analysis.' },
                            { name: 'Soil Core', icon: '\u26CF\uFE0F', type: 'Soil', color: 0x665544, xp: 5, fact: 'Surface soil reveals the geological history of ' + sel.name + '.' }
                          ];

                          // Spawn collectible rock sample orbs
                          planetSamples.forEach(function(rs, rsi) {
                            for (var rdup = 0; rdup < 2; rdup++) {
                              var rox = (Math.random() - 0.5) * 120;
                              var roz = (Math.random() - 0.5) * 120;
                              var roy = _terrainHeightAt(rox, roz) + 0.6;
                              var orbGroup = new THREE.Group();
                              // Glowing sample orb
                              var orbGeo = new THREE.DodecahedronGeometry(0.3, 0);
                              var orbMat = new THREE.MeshStandardMaterial({ color: rs.color, emissive: rs.color, emissiveIntensity: 0.5, transparent: true, opacity: 0.75 });
                              orbGroup.add(new THREE.Mesh(orbGeo, orbMat));
                              // Pickup ring
                              var ringGeo2 = new THREE.RingGeometry(0.5, 0.65, 12);
                              var ringMat2 = new THREE.MeshBasicMaterial({ color: rs.color, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
                              var ring2 = new THREE.Mesh(ringGeo2, ringMat2);
                              ring2.rotation.x = -Math.PI / 2;
                              ring2.position.y = -0.3;
                              orbGroup.add(ring2);
                              orbGroup.position.set(rox, roy, roz);
                              orbGroup._sampleData = rs;
                              orbGroup._collected = false;
                              orbGroup._pulsePhase = Math.random() * Math.PI * 2;
                              scene.add(orbGroup);
                              geoSampleOrbs.push(orbGroup);
                            }
                          });

                        } else {
                          // Gas giant: layered atmospheric cloud volumes with turbulent banding
                          var gasBaseColor = new THREE.Color(sel.terrainColor || '#cc9944');
                          for (var cl = 0; cl < 8; cl++) {
                            var clGeo = new THREE.PlaneGeometry(400, 400, 20, 20);
                            // Warp the cloud plane vertices for volumetric look
                            var clPos = clGeo.attributes.position.array;
                            for (var cvi = 0; cvi < clPos.length; cvi += 3) {
                              clPos[cvi + 2] = fbm(clPos[cvi] + cl * 50, clPos[cvi + 1] + cl * 30, 3, 2, 0.5) * (1.5 + cl * 0.3);
                            }
                            clGeo.computeVertexNormals();

                            var clCv = document.createElement('canvas'); clCv.setAttribute('aria-hidden', 'true'); clCv.width = 512; clCv.height = 128;
                            var clCx = clCv.getContext('2d');
                            var bandOffset = cl * 1.7;
                            for (var cy2 = 0; cy2 < 128; cy2++) {
                              var band = Math.sin(cy2 * 0.15 + bandOffset) * 0.5 + 0.5;
                              var stormBand = Math.pow(Math.sin(cy2 * 0.08 + cl * 3), 2) * 0.3;
                              for (var cx3 = 0; cx3 < 512; cx3++) {
                                var turb = fbm(cx3 * 0.3 + cl * 100, cy2 * 0.5 + cl * 70, 3, 2, 0.5) * 0.3;
                                var swirl = Math.sin(cx3 * 0.02 + cy2 * 0.04 + cl) * 15;
                                var mix = band + turb + stormBand;
                                var rV = Math.max(0, Math.min(255, Math.round(gasBaseColor.r * 255 * (0.5 + mix * 0.5) + swirl)));
                                var gV = Math.max(0, Math.min(255, Math.round(gasBaseColor.g * 255 * (0.5 + mix * 0.5) + swirl * 0.6)));
                                var bV = Math.max(0, Math.min(255, Math.round(gasBaseColor.b * 255 * (0.6 + mix * 0.4) + swirl * 0.3)));
                                clCx.fillStyle = 'rgb(' + rV + ',' + gV + ',' + bV + ')';
                                clCx.fillRect(cx3, cy2, 1, 1);
                              }
                            }
                            var clTex = new THREE.CanvasTexture(clCv); clTex.wrapS = THREE.RepeatWrapping; clTex.repeat.set(4, 1);
                            var clOp = cl < 2 ? 0.7 : (0.5 - cl * 0.04);
                            var clMat = new THREE.MeshBasicMaterial({ map: clTex, transparent: true, opacity: clOp, side: THREE.DoubleSide, depthWrite: false });
                            var clMesh = new THREE.Mesh(clGeo, clMat);
                            clMesh.rotation.x = -Math.PI / 2; clMesh.position.y = -3 - cl * 5;
                            clMesh._cloudSpeed = 0.008 + cl * 0.004;
                            clMesh._cloudDrift = cl * 0.3;
                            scene.add(clMesh);
                          }
                          // Add swirling storm vortex (Great Red Spot style) for Jupiter/Saturn
                          if (sel.name === 'Jupiter' || sel.name === 'Saturn') {
                            var stormGeo = new THREE.CircleGeometry(8, 32);
                            var stormCv = document.createElement('canvas'); stormCv.width = 128; stormCv.height = 128;
                            var stormCx = stormCv.getContext('2d');
                            var grad = stormCx.createRadialGradient(64, 64, 0, 64, 64, 64);
                            grad.addColorStop(0, sel.name === 'Jupiter' ? 'rgba(200,80,40,0.9)' : 'rgba(180,160,100,0.7)');
                            grad.addColorStop(0.5, sel.name === 'Jupiter' ? 'rgba(220,120,60,0.5)' : 'rgba(200,180,120,0.4)');
                            grad.addColorStop(1, 'rgba(0,0,0,0)');
                            stormCx.fillStyle = grad; stormCx.fillRect(0, 0, 128, 128);
                            var stormTex = new THREE.CanvasTexture(stormCv);
                            var stormMat = new THREE.MeshBasicMaterial({ map: stormTex, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
                            var stormMesh = new THREE.Mesh(stormGeo, stormMat);
                            stormMesh.rotation.x = -Math.PI / 2; stormMesh.position.set(30, -4, -20);
                            stormMesh._cloudSpeed = 0.015; stormMesh._isStorm = true;
                            scene.add(stormMesh);
                          }
                        }



                        // â"€â"€ Lighting â"€â"€

                        scene.add(new THREE.AmbientLight(0x444466, 0.6));

                        var sunDir = new THREE.DirectionalLight(0xffeedd, sel.terrainType === 'iceworld' ? 0.3 : 1.0);

                        sunDir.position.set(50, 30, 20); scene.add(sunDir);

                        // ── Visible Moons in Sky (orbiting overhead for planets with notable moons) ──
                        var skyMoons = [];
                        var notableMoonsForSky = NOTABLE_MOONS[sel.name] || [];
                        notableMoonsForSky.forEach(function(moonData, mi) {
                          var moonGroup = new THREE.Group();
                          // Moon sphere
                          var moonR2 = 0.4 + (mi === 0 ? 0.3 : 0);
                          var moonColor = moonData.type === 'Volcanic' ? 0xffaa33 : moonData.type === 'Ice/Ocean' ? 0x88ccff : moonData.type === 'Atmosphere/Lakes' ? 0xddaa44 : moonData.type === 'Ice/Geysers' ? 0xccddff : 0xbbbbbb;
                          var moonGeo2 = new THREE.SphereGeometry(moonR2, 12, 8);
                          var moonMat2 = new THREE.MeshStandardMaterial({ color: moonColor, roughness: 0.8, metalness: 0.1 });
                          moonGroup.add(new THREE.Mesh(moonGeo2, moonMat2));
                          // Moon glow
                          var moonGlowGeo = new THREE.SphereGeometry(moonR2 * 1.4, 12, 8);
                          var moonGlowMat = new THREE.MeshBasicMaterial({ color: moonColor, transparent: true, opacity: 0.15 });
                          moonGroup.add(new THREE.Mesh(moonGlowGeo, moonGlowMat));
                          // Position in sky at different orbital heights
                          var orbitR = 80 + mi * 25;
                          var orbitSpeed = 0.001 + mi * 0.0005;
                          moonGroup._orbitR = orbitR;
                          moonGroup._orbitSpeed = orbitSpeed;
                          moonGroup._orbitPhase = mi * (Math.PI * 2 / Math.max(1, notableMoonsForSky.length));
                          moonGroup._orbitTilt = 0.2 + mi * 0.15;
                          moonGroup._moonName = moonData.name;
                          scene.add(moonGroup);
                          skyMoons.push(moonGroup);
                        });

                        // â"€â"€ 3D Rover / Probe / Submarine Model â"€â"€

                        var roverGroup = new THREE.Group();

                        if (isOcean) {
                          // ═══ DEEP-SEA SUBMERSIBLE ROV ═══
                          // Main hull (elongated sphere)
                          var hullGeo = new THREE.SphereGeometry(0.5, 16, 12);
                          hullGeo.scale(1.6, 0.9, 0.9);
                          var hullMat = new THREE.MeshStandardMaterial({ color: 0xeeaa00, metalness: 0.6, roughness: 0.3 });
                          var hull = new THREE.Mesh(hullGeo, hullMat);
                          hull.position.y = 0;
                          roverGroup.add(hull);
                          // Viewport dome (glass sphere at front)
                          var domeGeo = new THREE.SphereGeometry(0.28, 12, 8);
                          var domeMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.6 });
                          var dome = new THREE.Mesh(domeGeo, domeMat);
                          dome.position.set(0, 0.1, -0.7);
                          roverGroup.add(dome);
                          // Propeller shrouds (4 thrusters)
                          var thrusterPositions = [[-0.6, 0.2, 0.5], [0.6, 0.2, 0.5], [-0.5, -0.25, 0], [0.5, -0.25, 0]];
                          thrusterPositions.forEach(function(tp) {
                            var shroudGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.25, 8);
                            var shroudMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.4 });
                            var shroud = new THREE.Mesh(shroudGeo, shroudMat);
                            shroud.position.set(tp[0], tp[1], tp[2]);
                            shroud.rotation.x = Math.PI / 2;
                            roverGroup.add(shroud);
                          });
                          // Manipulator arm (folded underneath)
                          var armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
                          var armMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7 });
                          var arm = new THREE.Mesh(armGeo, armMat);
                          arm.position.set(0.2, -0.35, -0.3);
                          arm.rotation.z = -0.4;
                          roverGroup.add(arm);
                          // Claw
                          var clawGeo = new THREE.BoxGeometry(0.1, 0.06, 0.15);
                          var clawMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.6 });
                          var claw = new THREE.Mesh(clawGeo, clawMat);
                          claw.position.set(0.45, -0.55, -0.3);
                          roverGroup.add(claw);
                          // Headlights (bright forward-facing)
                          var subHeadL = new THREE.SpotLight(0xccddff, 2.5, 40, Math.PI / 5, 0.4);
                          subHeadL.position.set(-0.3, 0, -0.8);
                          subHeadL.target.position.set(-0.3, -0.5, -6);
                          roverGroup.add(subHeadL); roverGroup.add(subHeadL.target);
                          var subHeadR = new THREE.SpotLight(0xccddff, 2.5, 40, Math.PI / 5, 0.4);
                          subHeadR.position.set(0.3, 0, -0.8);
                          subHeadR.target.position.set(0.3, -0.5, -6);
                          roverGroup.add(subHeadR); roverGroup.add(subHeadR.target);
                          // Headlight lens glow
                          var subGlowGeo = new THREE.SphereGeometry(0.06, 8, 8);
                          var subGlowMat = new THREE.MeshBasicMaterial({ color: 0xccddff, transparent: true, opacity: 0.9 });
                          [-0.3, 0.3].forEach(function(sx) {
                            var g = new THREE.Mesh(subGlowGeo.clone(), subGlowMat.clone());
                            g.position.set(sx, 0, -0.8);
                            roverGroup.add(g);
                          });
                          // Strobe light (red blinking)
                          var strobeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 });
                          var strobe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), strobeMat);
                          strobe.position.set(0, 0.45, 0.5);
                          roverGroup.add(strobe);
                          // Sampling basket
                          var basketGeo = new THREE.BoxGeometry(0.5, 0.2, 0.4);
                          var basketMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, wireframe: true });
                          var basket = new THREE.Mesh(basketGeo, basketMat);
                          basket.position.set(0, -0.4, 0.2);
                          roverGroup.add(basket);

                          // Bubble trail particle system
                          var bubbleGeo = new THREE.BufferGeometry();
                          var bubblePos = new Float32Array(80 * 3);
                          var bubbleLife = new Float32Array(80);
                          for (var bbi = 0; bbi < 80; bbi++) {
                            bubblePos[bbi * 3] = 0; bubblePos[bbi * 3 + 1] = -999; bubblePos[bbi * 3 + 2] = 0;
                            bubbleLife[bbi] = 0;
                          }
                          bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
                          var bubbleMesh = new THREE.Points(bubbleGeo, new THREE.PointsMaterial({ color: 0xaaddff, size: 0.08, transparent: true, opacity: 0.5 }));
                          scene.add(bubbleMesh);
                          var bubbleIdx = 0;

                        } else if (!isGas) {

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

                          // ── Rover headlights ──
                          var headlightL = new THREE.SpotLight(0xffffee, 1.5, 25, Math.PI / 6, 0.5);
                          headlightL.position.set(-0.25, 0.45, -0.65);
                          headlightL.target.position.set(-0.25, 0.2, -5);
                          roverGroup.add(headlightL);
                          roverGroup.add(headlightL.target);

                          var headlightR = new THREE.SpotLight(0xffffee, 1.5, 25, Math.PI / 6, 0.5);
                          headlightR.position.set(0.25, 0.45, -0.65);
                          headlightR.target.position.set(0.25, 0.2, -5);
                          roverGroup.add(headlightR);
                          roverGroup.add(headlightR.target);

                          // Headlight lens glow
                          var hlGlowGeo = new THREE.SphereGeometry(0.05, 8, 8);
                          var hlGlowMat = new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.9 });
                          var hlGlowL = new THREE.Mesh(hlGlowGeo, hlGlowMat);
                          hlGlowL.position.set(-0.25, 0.45, -0.65);
                          roverGroup.add(hlGlowL);
                          var hlGlowR = new THREE.Mesh(hlGlowGeo.clone(), hlGlowMat.clone());
                          hlGlowR.position.set(0.25, 0.45, -0.65);
                          roverGroup.add(hlGlowR);

                          // ── Dust trail particle system ──
                          var dustTrailGeo = new THREE.BufferGeometry();
                          var dustTrailPos = new Float32Array(60 * 3);
                          var dustTrailLife = new Float32Array(60);
                          for (var dti = 0; dti < 60; dti++) {
                            dustTrailPos[dti * 3] = 0;
                            dustTrailPos[dti * 3 + 1] = -999;
                            dustTrailPos[dti * 3 + 2] = 0;
                            dustTrailLife[dti] = 0;
                          }
                          dustTrailGeo.setAttribute('position', new THREE.BufferAttribute(dustTrailPos, 3));
                          var dustColor = sel.terrainType === 'iceworld' ? 0xccddee : sel.terrainType === 'volcanic' ? 0x664422 : sel.terrainType === 'earthlike' ? 0x886633 : 0xaa9966;
                          var dustTrailMesh = new THREE.Points(dustTrailGeo, new THREE.PointsMaterial({ color: dustColor, size: 0.12, transparent: true, opacity: 0.35 }));
                          scene.add(dustTrailMesh);
                          var dustTrailIdx = 0;

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

                        roverGroup.position.set(0, isFluid ? 5 : 0, 0);

                        scene.add(roverGroup);

                        // ═══ GAS GIANT ATMOSPHERE SIMULATION ═══
                        var gasAtmo = null;
                        var gasSamples = [];
                        var gasSampleCooldown = 0;
                        var gasShieldHP = 100;
                        var gasWarningText = '';
                        var gasWarningTimer = 0;
                        if (isGas) {
                          // Atmosphere depth zones (Y coordinate maps to depth: higher Y = upper atmosphere)
                          var zones = [
                            { name: 'Upper Atmosphere', minY: 3, maxY: 999, pressure: '0.1 bar', temp: sel.name === 'Jupiter' ? '-110\u00B0C' : sel.name === 'Saturn' ? '-140\u00B0C' : sel.name === 'Uranus' ? '-195\u00B0C' : '-200\u00B0C', color: '#88bbff', gases: ['H\u2082', 'He', 'NH\u2083 ice'], windSpeed: 100, fogDensity: 0, hazard: null, science: 'Ammonia ice crystals form here. Visible cloud tops.' },
                            { name: 'Cloud Deck', minY: 0, maxY: 3, pressure: '1-5 bar', temp: sel.name === 'Jupiter' ? '-50\u00B0C' : sel.name === 'Saturn' ? '-80\u00B0C' : '-150\u00B0C', color: '#cc9955', gases: ['H\u2082', 'He', 'NH\u2084SH', 'H\u2082O'], windSpeed: 300, fogDensity: 0.15, hazard: 'wind_shear', science: 'Ammonium hydrosulfide clouds. Extreme wind shear between bands.' },
                            { name: 'Deep Troposphere', minY: -8, maxY: 0, pressure: '10-100 bar', temp: sel.name === 'Jupiter' ? '100\u00B0C' : '50\u00B0C', color: '#885522', gases: ['H\u2082', 'He', 'H\u2082O vapor', 'CH\u2084'], windSpeed: 500, fogDensity: 0.35, hazard: 'pressure', science: 'Water clouds form here. Temperature rises from compression. Lightning storms rage.' },
                            { name: 'Metallic Hydrogen Layer', minY: -20, maxY: -8, pressure: '200+ bar', temp: '2,000\u00B0C+', color: '#442211', gases: ['Metallic H', 'He rain', sel.terrainType === 'icegiant' ? 'Diamond rain' : 'Liquid H\u2082'], windSpeed: 50, fogDensity: 0.6, hazard: 'crush', science: sel.terrainType === 'icegiant' ? 'Carbon compressed into diamonds that rain downward. Extreme pressure.' : 'Hydrogen becomes a liquid metal conductor. Source of the magnetic field.' },
                            { name: 'Inner Core Region', minY: -999, maxY: -20, pressure: '1000+ bar', temp: '20,000\u00B0C+', color: '#ff4400', gases: ['Rock/ice core', 'Metallic H', 'Exotic matter'], windSpeed: 0, fogDensity: 0.85, hazard: 'lethal', science: 'Rocky/icy core 10-20x Earth mass. No probe has ever reached this depth.' }
                          ];
                          gasAtmo = {
                            zones: zones,
                            getZone: function(y) {
                              for (var zi = 0; zi < zones.length; zi++) {
                                if (y >= zones[zi].minY && y < zones[zi].maxY) return zones[zi];
                              }
                              return zones[zones.length - 1];
                            },
                            // Gas sample orbs scattered in 3D space
                            sampleOrbs: []
                          };

                          // Create collectible gas sample orbs at various depths
                          var sampleTypes = [
                            { name: 'Ammonia Ice Crystal', icon: '\u2744\uFE0F', gas: 'NH\u2083', depth: 4, color: 0x88ccff, xp: 8, fact: 'Ammonia freezes into ice crystals in the upper atmosphere, forming the visible cloud tops.' },
                            { name: 'Hydrogen Sample', icon: '\uD83D\uDCA8', gas: 'H\u2082', depth: 2, color: 0xaaddff, xp: 5, fact: 'Molecular hydrogen makes up ~90% of the atmosphere. At depth, it becomes metallic.' },
                            { name: 'Helium Droplet', icon: '\uD83D\uDCA7', gas: 'He', depth: -2, color: 0xffdd88, xp: 8, fact: 'Helium "rains" out of the hydrogen at extreme pressures, sinking toward the core.' },
                            { name: 'Water Vapor Sample', icon: '\uD83C\uDF2B\uFE0F', gas: 'H\u2082O', depth: -3, color: 0x4488ff, xp: 10, fact: 'Water clouds exist deep below the visible surface. Jupiter may have more water than Earth.' },
                            { name: 'Methane Crystal', icon: '\uD83D\uDC8E', gas: 'CH\u2084', depth: -1, color: 0x44ffaa, xp: 8, fact: 'Methane gives Uranus and Neptune their blue-green color. Under pressure, it breaks into carbon and hydrogen.' },
                            { name: 'Ammonium Hydrosulfide', icon: '\uD83E\uDDEA', gas: 'NH\u2084SH', depth: 1, color: 0xcc8844, xp: 10, fact: 'This compound creates the brown-orange bands visible on Jupiter and Saturn.' },
                            { name: sel.terrainType === 'icegiant' ? 'Diamond Fragment' : 'Metallic Hydrogen', icon: sel.terrainType === 'icegiant' ? '\uD83D\uDC8E' : '\u26A1', gas: sel.terrainType === 'icegiant' ? 'C (diamond)' : 'Metallic H', depth: -12, color: sel.terrainType === 'icegiant' ? 0xffffff : 0xff8800, xp: 20, fact: sel.terrainType === 'icegiant' ? 'Carbon atoms crystallize into actual diamonds under extreme pressure!' : 'Hydrogen becomes a liquid metal that conducts electricity \u2014 creating the magnetic field.' },
                            { name: 'Phosphine Trace', icon: '\u2623\uFE0F', gas: 'PH\u2083', depth: -5, color: 0x88ff44, xp: 12, fact: 'Phosphine is dredged up from deep atmosphere by convection. It\u2019s a biosignature on rocky planets.' }
                          ];

                          // Spawn orbs at random XZ positions at their designated depths
                          var sampleMat = new THREE.MeshStandardMaterial({ emissive: 0x44aaff, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 });
                          sampleTypes.forEach(function(st, si) {
                            var orbGeo = new THREE.SphereGeometry(0.35, 12, 8);
                            // Give each a unique color
                            var orbMat = new THREE.MeshStandardMaterial({ color: st.color, emissive: st.color, emissiveIntensity: 0.6, transparent: true, opacity: 0.75, wireframe: false });
                            // Inner glow core
                            var coreGeo = new THREE.SphereGeometry(0.15, 8, 6);
                            var coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });

                            // Place 2 of each type at random XZ
                            for (var dup = 0; dup < 2; dup++) {
                              var ox = (Math.random() - 0.5) * 140;
                              var oz = (Math.random() - 0.5) * 140;
                              var oy = st.depth + (Math.random() - 0.5) * 3;
                              var orbGroup = new THREE.Group();
                              orbGroup.add(new THREE.Mesh(orbGeo.clone(), orbMat.clone()));
                              orbGroup.add(new THREE.Mesh(coreGeo.clone(), coreMat.clone()));
                              orbGroup.position.set(ox, oy, oz);
                              orbGroup._sampleData = st;
                              orbGroup._collected = false;
                              orbGroup._pulsePhase = Math.random() * Math.PI * 2;
                              scene.add(orbGroup);
                              gasAtmo.sampleOrbs.push(orbGroup);
                            }
                          });

                          // Add atmospheric fog that intensifies with depth
                          scene.fog = new THREE.FogExp2(new THREE.Color(sel.terrainColor || '#886644').getHex(), 0.005);

                          // ── Depth-based particle systems ──
                          // Ammonia crystals (upper atmosphere) — small white sparkles
                          var ammoniaParts = new THREE.BufferGeometry();
                          var ammoniaPos = new Float32Array(300 * 3);
                          for (var ap = 0; ap < 300; ap++) {
                            ammoniaPos[ap * 3] = (Math.random() - 0.5) * 100;
                            ammoniaPos[ap * 3 + 1] = 2 + Math.random() * 10;
                            ammoniaPos[ap * 3 + 2] = (Math.random() - 0.5) * 100;
                          }
                          ammoniaParts.setAttribute('position', new THREE.BufferAttribute(ammoniaPos, 3));
                          var ammoniaMesh = new THREE.Points(ammoniaParts, new THREE.PointsMaterial({ color: 0xddeeff, size: 0.06, transparent: true, opacity: 0.5 }));
                          scene.add(ammoniaMesh);

                          // Helium rain (mid-depth) — golden droplets falling
                          var heliumParts = new THREE.BufferGeometry();
                          var heliumPos = new Float32Array(150 * 3);
                          for (var hp = 0; hp < 150; hp++) {
                            heliumPos[hp * 3] = (Math.random() - 0.5) * 80;
                            heliumPos[hp * 3 + 1] = -3 + Math.random() * 8;
                            heliumPos[hp * 3 + 2] = (Math.random() - 0.5) * 80;
                          }
                          heliumParts.setAttribute('position', new THREE.BufferAttribute(heliumPos, 3));
                          var heliumMesh = new THREE.Points(heliumParts, new THREE.PointsMaterial({ color: 0xffcc44, size: 0.04, transparent: true, opacity: 0.4 }));
                          scene.add(heliumMesh);

                          // Deep atmosphere embers — reddish particles near core
                          var emberParts = new THREE.BufferGeometry();
                          var emberPos = new Float32Array(100 * 3);
                          for (var ep = 0; ep < 100; ep++) {
                            emberPos[ep * 3] = (Math.random() - 0.5) * 60;
                            emberPos[ep * 3 + 1] = -15 + Math.random() * 10;
                            emberPos[ep * 3 + 2] = (Math.random() - 0.5) * 60;
                          }
                          emberParts.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
                          var emberMesh = new THREE.Points(emberParts, new THREE.PointsMaterial({ color: 0xff4400, size: 0.1, transparent: true, opacity: 0.3 }));
                          scene.add(emberMesh);

                          // ── Probe heat shield glow (visible in 3rd person at depth) ──
                          var shieldGlow = new THREE.PointLight(0xff6600, 0, 8);
                          shieldGlow.position.set(0, -0.3, 0);
                          roverGroup.add(shieldGlow);

                          // ── Depth record tracking ──
                          gasAtmo.deepestY = 999;
                          gasAtmo.depthRecord = 0;
                          gasAtmo.zonesVisited = {};

                          // ── Spectrometer mini-display (bottom-left) ──
                          var spectroEl = document.createElement('div');
                          spectroEl.id = 'hud-spectrometer';
                          spectroEl.style.cssText = 'position:absolute;bottom:12px;left:12px;background:rgba(15,23,42,0.85);backdrop-filter:blur(8px);border:1px solid rgba(56,189,248,0.2);border-radius:10px;padding:10px;z-index:14;width:180px;font-family:system-ui;pointer-events:none';
                          spectroEl.innerHTML = '<div style="font-size:9px;font-weight:bold;color:#38bdf8;margin-bottom:6px;letter-spacing:1px">\uD83D\uDD2C SPECTROMETER</div>' +
                            '<div id="spectro-bars" style="display:flex;flex-direction:column;gap:3px"></div>';
                          canvasEl.parentElement.appendChild(spectroEl);
                        }



                        // ═══ OCEAN DEPTH SIMULATION (Earth Underwater) ═══
                        var oceanAtmo = null;
                        var oceanSamples = [];
                        var oceanSampleCooldown = 0;
                        var oceanHullHP = 100;
                        var oceanWarningText = '';
                        var oceanWarningTimer = 0;
                        if (isOcean) {
                          var oceanZones = [
                            { name: 'Sunlight Zone (Epipelagic)', minY: 0, maxY: 999, pressure: '1-2 atm', temp: '15-25\u00B0C', color: '#0a7ab5', life: ['Dolphins', 'Sea turtles', 'Coral reefs', 'Phytoplankton'], lightLevel: 1.0, fogDensity: 0.008, hazard: null, science: 'Sunlight penetrates to ~200m. This is where 90% of ocean life exists. Photosynthesis drives the food web.' },
                            { name: 'Twilight Zone (Mesopelagic)', minY: -5, maxY: 0, pressure: '20-100 atm', temp: '5-15\u00B0C', color: '#064f7a', life: ['Lanternfish', 'Jellyfish', 'Squid', 'Swordfish'], lightLevel: 0.3, fogDensity: 0.015, hazard: null, science: 'Only 1% of surface light reaches here. Many creatures migrate up at night to feed, then descend at dawn.' },
                            { name: 'Midnight Zone (Bathypelagic)', minY: -12, maxY: -5, pressure: '100-400 atm', temp: '2-4\u00B0C', color: '#032b4a', life: ['Anglerfish', 'Giant squid', 'Viperfish', 'Bioluminescent jellies'], lightLevel: 0.0, fogDensity: 0.02, hazard: 'pressure', science: 'Total darkness. 75% of creatures here produce their own light (bioluminescence). Food is scarce \u2014 marine snow drifts down from above.' },
                            { name: 'Abyssal Zone (Abyssopelagic)', minY: -20, maxY: -12, pressure: '400-700 atm', temp: '1-2\u00B0C', color: '#011a30', life: ['Giant isopods', 'Zombie worms', 'Sea cucumbers', 'Tube worms'], lightLevel: 0.0, fogDensity: 0.025, hazard: 'crush', science: 'The abyssal plains cover 65% of Earth\u2019s surface. Hydrothermal vents here support life without sunlight \u2014 chemosynthesis!' },
                            { name: 'Hadal Zone (Trenches)', minY: -999, maxY: -20, pressure: '700-1100 atm', temp: '1-4\u00B0C', color: '#000a15', life: ['Snailfish', 'Amphipods', 'Xenophyophores', 'Unknown species'], lightLevel: 0.0, fogDensity: 0.035, hazard: 'lethal', science: 'The deepest trenches (11 km). Pressure would crush a human instantly. Yet life thrives here \u2014 even at the bottom of the Mariana Trench!' }
                          ];
                          oceanAtmo = {
                            zones: oceanZones,
                            getZone: function(y) {
                              for (var zi = 0; zi < oceanZones.length; zi++) {
                                if (y >= oceanZones[zi].minY && y < oceanZones[zi].maxY) return oceanZones[zi];
                              }
                              return oceanZones[oceanZones.length - 1];
                            },
                            sampleOrbs: [],
                            deepestY: 999,
                            depthRecord: 0,
                            zonesVisited: {}
                          };

                          // Marine specimen collectibles
                          var marineSpecimens = [
                            { name: 'Giant Kelp Sample', icon: '\uD83C\uDF3F', type: 'Flora', depth: 3, color: 0x2d6a4f, xp: 5, fact: 'Giant kelp can grow up to 60cm per day \u2014 the fastest growing organism on Earth!' },
                            { name: 'Coral Fragment', icon: '\uD83E\uDEB8', type: 'Cnidaria', depth: 1, color: 0xff6b8a, xp: 8, fact: 'Coral reefs support 25% of all marine species despite covering less than 1% of the ocean floor.' },
                            { name: 'Bioluminescent Jellyfish', icon: '\uD83E\uDEBC', type: 'Cnidaria', depth: -3, color: 0x00ffaa, xp: 10, fact: 'Some jellyfish use GFP (green fluorescent protein) \u2014 the same molecule that won a Nobel Prize in chemistry!' },
                            { name: 'Deep-Sea Anglerfish', icon: '\uD83D\uDC1F', type: 'Fish', depth: -8, color: 0x334455, xp: 12, fact: 'The anglerfish\u2019s bioluminescent lure is powered by symbiotic bacteria. Males permanently fuse to females!' },
                            { name: 'Giant Squid Tissue', icon: '\uD83E\uDD91', type: 'Cephalopod', depth: -6, color: 0xcc4444, xp: 15, fact: 'Giant squid have the largest eyes in the animal kingdom (27 cm!) \u2014 the size of dinner plates.' },
                            { name: 'Hydrothermal Vent Microbe', icon: '\uD83E\uDDA0', type: 'Archaea', depth: -15, color: 0xff8800, xp: 18, fact: 'These extremophiles thrive at 400\u00B0C using chemosynthesis. They may resemble the earliest life on Earth.' },
                            { name: 'Tube Worm Colony', icon: '\uD83E\uDEB1', type: 'Annelida', depth: -16, color: 0xee3333, xp: 15, fact: 'Giant tube worms can live 250+ years and grow to 2.4m. They have no mouth, stomach, or eyes!' },
                            { name: 'Mariana Snailfish', icon: '\uD83D\uDC20', type: 'Fish', depth: -24, color: 0xeeddcc, xp: 25, fact: 'The deepest-living fish ever found (8,178m). Its body has special proteins that prevent cellular collapse under pressure.' },
                            { name: 'Manganese Nodule', icon: '\u26AB', type: 'Mineral', depth: -18, color: 0x333333, xp: 12, fact: 'These potato-sized mineral lumps take millions of years to form and contain cobalt, nickel, and rare earth metals.' },
                            { name: 'Marine Snow Sample', icon: '\u2744\uFE0F', type: 'Organic', depth: -4, color: 0xddddee, xp: 8, fact: 'Marine snow is a shower of dead organisms and waste that feeds the deep sea. It can take weeks to reach the bottom.' }
                          ];

                          // Spawn collectible orbs
                          marineSpecimens.forEach(function(sp) {
                            for (var dup = 0; dup < 2; dup++) {
                              var ox = (Math.random() - 0.5) * 120;
                              var oz = (Math.random() - 0.5) * 120;
                              var oy = sp.depth + (Math.random() - 0.5) * 3;
                              var orbGroup = new THREE.Group();
                              var orbGeo = new THREE.SphereGeometry(0.35, 12, 8);
                              var orbMat = new THREE.MeshStandardMaterial({ color: sp.color, emissive: sp.color, emissiveIntensity: 0.5, transparent: true, opacity: 0.7 });
                              orbGroup.add(new THREE.Mesh(orbGeo, orbMat));
                              var coreGeo = new THREE.SphereGeometry(0.15, 8, 6);
                              var coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
                              orbGroup.add(new THREE.Mesh(coreGeo, coreMat));
                              orbGroup.position.set(ox, oy, oz);
                              orbGroup._sampleData = sp;
                              orbGroup._collected = false;
                              orbGroup._pulsePhase = Math.random() * Math.PI * 2;
                              scene.add(orbGroup);
                              oceanAtmo.sampleOrbs.push(orbGroup);
                            }
                          });

                          // Underwater particles: bubbles (rise), plankton (drift), marine snow (fall)
                          var bubbleParts = new THREE.BufferGeometry();
                          var bubblePartPos = new Float32Array(200 * 3);
                          for (var bp2 = 0; bp2 < 200; bp2++) {
                            bubblePartPos[bp2 * 3] = (Math.random() - 0.5) * 100;
                            bubblePartPos[bp2 * 3 + 1] = -25 + Math.random() * 35;
                            bubblePartPos[bp2 * 3 + 2] = (Math.random() - 0.5) * 100;
                          }
                          bubbleParts.setAttribute('position', new THREE.BufferAttribute(bubblePartPos, 3));
                          var bubblePartMesh = new THREE.Points(bubbleParts, new THREE.PointsMaterial({ color: 0xaaddff, size: 0.04, transparent: true, opacity: 0.4 }));
                          scene.add(bubblePartMesh);

                          var planktonParts = new THREE.BufferGeometry();
                          var planktonPos = new Float32Array(300 * 3);
                          for (var pp2 = 0; pp2 < 300; pp2++) {
                            planktonPos[pp2 * 3] = (Math.random() - 0.5) * 80;
                            planktonPos[pp2 * 3 + 1] = -10 + Math.random() * 20;
                            planktonPos[pp2 * 3 + 2] = (Math.random() - 0.5) * 80;
                          }
                          planktonParts.setAttribute('position', new THREE.BufferAttribute(planktonPos, 3));
                          var planktonMesh = new THREE.Points(planktonParts, new THREE.PointsMaterial({ color: 0x88ffaa, size: 0.03, transparent: true, opacity: 0.35 }));
                          scene.add(planktonMesh);

                          var snowParts = new THREE.BufferGeometry();
                          var snowPartPos = new Float32Array(150 * 3);
                          for (var sp2 = 0; sp2 < 150; sp2++) {
                            snowPartPos[sp2 * 3] = (Math.random() - 0.5) * 80;
                            snowPartPos[sp2 * 3 + 1] = -20 + Math.random() * 30;
                            snowPartPos[sp2 * 3 + 2] = (Math.random() - 0.5) * 80;
                          }
                          snowParts.setAttribute('position', new THREE.BufferAttribute(snowPartPos, 3));
                          var snowMesh = new THREE.Points(snowParts, new THREE.PointsMaterial({ color: 0xddddee, size: 0.05, transparent: true, opacity: 0.3 }));
                          scene.add(snowMesh);

                          // Bioluminescent creatures (deep-water floating lights)
                          var bioLights = [];
                          for (var bli = 0; bli < 15; bli++) {
                            var blColor = [0x00ffaa, 0x00aaff, 0x8800ff, 0x00ffdd, 0xff00aa][bli % 5];
                            var blLight = new THREE.PointLight(blColor, 0.5, 8);
                            blLight.position.set((Math.random() - 0.5) * 80, -8 - Math.random() * 15, (Math.random() - 0.5) * 80);
                            blLight._bioPhase = Math.random() * Math.PI * 2;
                            blLight._bioBaseY = blLight.position.y;
                            blLight._bioBaseX = blLight.position.x;
                            scene.add(blLight);
                            bioLights.push(blLight);
                            // Visible glowing orb
                            var blOrbGeo = new THREE.SphereGeometry(0.12, 8, 6);
                            var blOrbMat = new THREE.MeshBasicMaterial({ color: blColor, transparent: true, opacity: 0.6 });
                            var blOrb = new THREE.Mesh(blOrbGeo, blOrbMat);
                            blOrb.position.copy(blLight.position);
                            blLight._orbMesh = blOrb;
                            scene.add(blOrb);
                          }

                          // Sonar display (bottom-left)
                          var sonarEl = document.createElement('div');
                          sonarEl.id = 'hud-sonar';
                          sonarEl.style.cssText = 'position:absolute;bottom:12px;left:12px;background:rgba(5,20,40,0.9);backdrop-filter:blur(8px);border:1px solid rgba(0,180,255,0.25);border-radius:10px;padding:10px;z-index:14;width:180px;font-family:system-ui;pointer-events:none';
                          sonarEl.innerHTML = '<div style="font-size:9px;font-weight:bold;color:#00b4ff;margin-bottom:6px;letter-spacing:1px">\uD83D\uDD0A SONAR</div>' +
                            '<div id="sonar-readout" style="display:flex;flex-direction:column;gap:3px"></div>';
                          canvasEl.parentElement.appendChild(sonarEl);
                        }

                        // â"€â"€ Scattered Environment Objects (rocks/boulders for depth cues) â"€â"€

                        var envObjects = [];

                        if (!isFluid) {
                          // Landmark boulders that sit on terrain
                          var rockColor2 = new THREE.Color(sel.terrainColor || '#886644');
                          for (var bi = 0; bi < 10; bi++) {
                            var bSize = 1.5 + Math.random() * 3;
                            var bGeo = new THREE.DodecahedronGeometry(bSize, 1);
                            var bPositions = bGeo.attributes.position.array;
                            for (var bv = 0; bv < bPositions.length; bv += 3) {
                              bPositions[bv] *= 0.6 + Math.random() * 0.8;
                              bPositions[bv + 1] *= 0.4 + Math.random() * 0.6;
                              bPositions[bv + 2] *= 0.6 + Math.random() * 0.8;
                            }
                            bGeo.computeVertexNormals();
                            var bMat = new THREE.MeshStandardMaterial({
                              color: rockColor2.clone().offsetHSL(0, -0.05, -0.1),
                              roughness: 0.95, metalness: 0.05, flatShading: true
                            });
                            var boulder2 = new THREE.Mesh(bGeo, bMat);
                            var bx = (Math.random() - 0.5) * 120, bz = (Math.random() - 0.5) * 120;
                            var by = _terrainHeightAt(bx, bz);
                            boulder2.position.set(bx, by + bSize * 0.25, bz);
                            boulder2.rotation.y = Math.random() * Math.PI * 2;
                            scene.add(boulder2);
                            envObjects.push(boulder2);
                          }
                        }



                        // ═══ PLANET-SPECIFIC LANDMARK FEATURES ═══

                        // ── Saturn: Visible ring arcs overhead ──
                        var saturnRingMeshes = [];
                        if (sel.hasRings && isGas) {
                          var ringColors = [0xeab308, 0xd4a017, 0xc9a04a, 0xb89030, 0xa88020];
                          for (var sri = 0; sri < 5; sri++) {
                            var ringR = 80 + sri * 12;
                            var ringW = 3 + sri * 1.5;
                            var rGeo = new THREE.RingGeometry(ringR - ringW, ringR + ringW, 64);
                            // Create ring texture with gaps
                            var rCv = document.createElement('canvas'); rCv.width = 256; rCv.height = 1;
                            var rCtx = rCv.getContext('2d');
                            for (var rpx = 0; rpx < 256; rpx++) {
                              var alpha = 0.15 + Math.sin(rpx * 0.3 + sri) * 0.08 + Math.random() * 0.03;
                              if (rpx % 17 < 2) alpha *= 0.2; // Cassini-like gaps
                              rCtx.fillStyle = 'rgba(234,179,8,' + alpha + ')';
                              rCtx.fillRect(rpx, 0, 1, 1);
                            }
                            var rTex = new THREE.CanvasTexture(rCv);
                            var rMat = new THREE.MeshBasicMaterial({
                              map: rTex, side: THREE.DoubleSide, transparent: true, opacity: 0.3 - sri * 0.03, depthWrite: false
                            });
                            var ringMesh2 = new THREE.Mesh(rGeo, rMat);
                            ringMesh2.rotation.x = Math.PI / 2 + 0.3; // tilted overhead
                            ringMesh2.position.y = 30 + sri * 4;
                            scene.add(ringMesh2);
                            saturnRingMeshes.push(ringMesh2);
                          }
                        }

                        // ── Mars: Dust devil columns ──
                        var dustDevils = [];
                        if (sel.terrainType === 'desert' && !isOcean) {
                          for (var ddi = 0; ddi < 3; ddi++) {
                            var ddGroup = new THREE.Group();
                            // Spinning dust column (cone of particles)
                            var ddGeo = new THREE.CylinderGeometry(0.3, 1.5, 8, 8, 4, true);
                            var ddMat = new THREE.MeshBasicMaterial({ color: 0xb5452a, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
                            var ddMesh = new THREE.Mesh(ddGeo, ddMat);
                            ddMesh.position.y = 4;
                            ddGroup.add(ddMesh);
                            // Inner brighter column
                            var ddInner = new THREE.Mesh(
                              new THREE.CylinderGeometry(0.15, 0.8, 6, 6, 3, true),
                              new THREE.MeshBasicMaterial({ color: 0xc9653a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
                            );
                            ddInner.position.y = 3;
                            ddGroup.add(ddInner);
                            // Dust ring at base
                            var ddRing = new THREE.Mesh(
                              new THREE.RingGeometry(1, 3, 16),
                              new THREE.MeshBasicMaterial({ color: 0xb5452a, transparent: true, opacity: 0.08, side: THREE.DoubleSide })
                            );
                            ddRing.rotation.x = -Math.PI / 2;
                            ddRing.position.y = 0.1;
                            ddGroup.add(ddRing);
                            var ddX = 30 + ddi * 35 + (Math.random() - 0.5) * 20;
                            var ddZ = -20 + ddi * 25 + (Math.random() - 0.5) * 30;
                            ddGroup.position.set(ddX, _terrainHeightAt(ddX, ddZ), ddZ);
                            ddGroup._ddSpeed = 0.03 + Math.random() * 0.02;
                            ddGroup._ddWander = Math.random() * Math.PI * 2;
                            ddGroup._ddBaseX = ddX;
                            ddGroup._ddBaseZ = ddZ;
                            scene.add(ddGroup);
                            dustDevils.push(ddGroup);
                          }
                        }

                        // ── Venus: Distant volcanic glow + lava flow ──
                        var venusVolcanoes = [];
                        if (sel.terrainType === 'volcanic') {
                          for (var vvi2 = 0; vvi2 < 2; vvi2++) {
                            var vGroup = new THREE.Group();
                            // Volcano cone
                            var vCone = new THREE.Mesh(
                              new THREE.ConeGeometry(8, 12, 8),
                              new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.95, flatShading: true })
                            );
                            var vcPos = vCone.geometry.attributes.position.array;
                            for (var vci = 0; vci < vcPos.length; vci += 3) { vcPos[vci] *= 0.8 + Math.random() * 0.4; vcPos[vci + 2] *= 0.8 + Math.random() * 0.4; }
                            vCone.geometry.computeVertexNormals();
                            vCone.position.y = 6;
                            vGroup.add(vCone);
                            // Glowing crater
                            var craterGlow = new THREE.PointLight(0xff4400, 2, 30);
                            craterGlow.position.y = 12.5;
                            vGroup.add(craterGlow);
                            var craterOrb = new THREE.Mesh(
                              new THREE.SphereGeometry(1.5, 8, 6),
                              new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.4 })
                            );
                            craterOrb.position.y = 12;
                            vGroup.add(craterOrb);
                            // Lava streams down side
                            for (var ls = 0; ls < 3; ls++) {
                              var lavaGeo = new THREE.CylinderGeometry(0.2, 0.8, 8, 4);
                              var lavaMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.2 + Math.random() * 0.15 });
                              var lava = new THREE.Mesh(lavaGeo, lavaMat);
                              var lAngle = ls * (Math.PI * 2 / 3) + Math.random() * 0.5;
                              lava.position.set(Math.cos(lAngle) * 3, 5, Math.sin(lAngle) * 3);
                              lava.rotation.z = 0.3;
                              lava.rotation.y = lAngle;
                              vGroup.add(lava);
                            }
                            var vx = 60 + vvi2 * 70;
                            var vz = -40 + vvi2 * 80;
                            vGroup.position.set(vx, _terrainHeightAt(vx, vz) - 1, vz);
                            vGroup._volcanoPhase = vvi2 * Math.PI;
                            scene.add(vGroup);
                            venusVolcanoes.push(vGroup);
                          }
                        }

                        // ── Mars: Olympus Mons (giant shield volcano) ──
                        if (sel.terrainType === 'desert' && !isOcean) {
                          // Massive volcanic cone in the distance
                          var omGeo = new THREE.ConeGeometry(18, 14, 12);
                          var omPos2 = omGeo.attributes.position.array;
                          for (var omi = 0; omi < omPos2.length; omi += 3) {
                            omPos2[omi] *= 0.9 + Math.random() * 0.2;
                            omPos2[omi + 2] *= 0.9 + Math.random() * 0.2;
                          }
                          omGeo.computeVertexNormals();
                          var omMat = new THREE.MeshStandardMaterial({ color: 0xb5452a, roughness: 0.95, flatShading: true });
                          var olympusMons = new THREE.Mesh(omGeo, omMat);
                          var omX = 80, omZ = -60;
                          olympusMons.position.set(omX, _terrainHeightAt(omX, omZ) + 5, omZ);
                          scene.add(olympusMons);
                          // Caldera at summit
                          var calderaGeo = new THREE.CylinderGeometry(4, 4, 1.5, 12, 1, true);
                          var calderaMat = new THREE.MeshStandardMaterial({ color: 0x8a3a1a, roughness: 0.9, side: THREE.DoubleSide });
                          var caldera = new THREE.Mesh(calderaGeo, calderaMat);
                          caldera.position.set(omX, _terrainHeightAt(omX, omZ) + 18, omZ);
                          scene.add(caldera);
                          // Snow/ice cap at summit
                          var snowGeo = new THREE.CircleGeometry(3.5, 12);
                          var snowMat = new THREE.MeshStandardMaterial({ color: 0xccddee, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
                          var snow = new THREE.Mesh(snowGeo, snowMat);
                          snow.rotation.x = -Math.PI / 2;
                          snow.position.set(omX, _terrainHeightAt(omX, omZ) + 19.2, omZ);
                          scene.add(snow);
                        }

                        // ── Pluto: Heart-shaped Tombaugh Regio glacier ──
                        if (sel.name === 'Pluto' || sel.terrainType === 'iceworld') {
                          // Large flat bright ice plain
                          var tRegioGeo = new THREE.CircleGeometry(15, 16);
                          var tRegioMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
                          var tRegio = new THREE.Mesh(tRegioGeo, tRegioMat);
                          tRegio.rotation.x = -Math.PI / 2;
                          var trX = -30, trZ = 25;
                          tRegio.position.set(trX, _terrainHeightAt(trX, trZ) + 0.1, trZ);
                          scene.add(tRegio);
                          // Cryovolcano (nitrogen ice volcano)
                          var cryoGeo = new THREE.ConeGeometry(3, 5, 8);
                          var cryoMat = new THREE.MeshStandardMaterial({ color: 0xbbccdd, roughness: 0.6, flatShading: true });
                          var cryo = new THREE.Mesh(cryoGeo, cryoMat);
                          cryo.position.set(trX + 20, _terrainHeightAt(trX + 20, trZ - 10) + 2, trZ - 10);
                          scene.add(cryo);
                          // Nitrogen geyser particles
                          var geyserParts = new THREE.BufferGeometry();
                          var geyserPos = new Float32Array(40 * 3);
                          for (var gpi = 0; gpi < 40; gpi++) {
                            geyserPos[gpi * 3] = trX + 20 + (Math.random() - 0.5) * 2;
                            geyserPos[gpi * 3 + 1] = _terrainHeightAt(trX + 20, trZ - 10) + 5 + Math.random() * 6;
                            geyserPos[gpi * 3 + 2] = trZ - 10 + (Math.random() - 0.5) * 2;
                          }
                          geyserParts.setAttribute('position', new THREE.BufferAttribute(geyserPos, 3));
                          var geyserMesh = new THREE.Points(geyserParts, new THREE.PointsMaterial({ color: 0xddddff, size: 0.08, transparent: true, opacity: 0.4 }));
                          scene.add(geyserMesh);
                        }

                        // ── Ocean: Shipwreck on the ocean floor ──
                        var shipwreck = null;
                        if (isOcean) {
                          shipwreck = new THREE.Group();
                          // Hull (broken ship)
                          var hullGeo2 = new THREE.BoxGeometry(8, 3, 3);
                          var hullPos2 = hullGeo2.attributes.position.array;
                          for (var hi2 = 0; hi2 < hullPos2.length; hi2 += 3) {
                            hullPos2[hi2] *= 0.8 + Math.random() * 0.4;
                            hullPos2[hi2 + 1] *= 0.7 + Math.random() * 0.3;
                          }
                          hullGeo2.computeVertexNormals();
                          var hullMat2 = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.95, metalness: 0.2, flatShading: true });
                          var hullMesh2 = new THREE.Mesh(hullGeo2, hullMat2);
                          shipwreck.add(hullMesh2);
                          // Mast (broken)
                          var mastGeo2 = new THREE.CylinderGeometry(0.15, 0.2, 6, 6);
                          var mastMat2 = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9 });
                          var mastMesh2 = new THREE.Mesh(mastGeo2, mastMat2);
                          mastMesh2.position.set(-1, 3, 0);
                          mastMesh2.rotation.z = 0.4; // tilted
                          shipwreck.add(mastMesh2);
                          // Coral growing on hull
                          for (var wci = 0; wci < 8; wci++) {
                            var wcGeo = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.4, 0);
                            var wcMat = new THREE.MeshStandardMaterial({ color: [0xff6b8a, 0x06d6a0, 0xffd166, 0x8338ec][wci % 4], roughness: 0.7, flatShading: true });
                            var wcMesh = new THREE.Mesh(wcGeo, wcMat);
                            wcMesh.position.set((Math.random() - 0.5) * 7, 1.5 + Math.random() * 1.5, (Math.random() - 0.5) * 2.5);
                            shipwreck.add(wcMesh);
                          }
                          // Anchor
                          var anchorGeo = new THREE.TorusGeometry(0.5, 0.08, 6, 12, Math.PI);
                          var anchorMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9, metalness: 0.5 });
                          var anchor = new THREE.Mesh(anchorGeo, anchorMat);
                          anchor.position.set(5, 0.5, 1);
                          anchor.rotation.z = Math.PI;
                          shipwreck.add(anchor);
                          var swX = -25, swZ = 20;
                          var swY = _terrainHeightAt(swX, swZ);
                          shipwreck.position.set(swX, swY + 1, swZ);
                          shipwreck.rotation.y = 0.8;
                          shipwreck.rotation.z = 0.15; // listing to one side
                          scene.add(shipwreck);

                          // ── Sea Turtles ──
                          var seaTurtles = [];
                          for (var sti = 0; sti < 3; sti++) {
                            var turtleGroup = new THREE.Group();
                            // Shell (flattened sphere)
                            var shellGeo = new THREE.SphereGeometry(0.4, 8, 6);
                            shellGeo.scale(1.2, 0.5, 1);
                            var shellMat = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.8, flatShading: true });
                            turtleGroup.add(new THREE.Mesh(shellGeo, shellMat));
                            // Head
                            var headGeo2 = new THREE.SphereGeometry(0.15, 6, 4);
                            var headMat2 = new THREE.MeshStandardMaterial({ color: 0x5a8a4a, roughness: 0.7 });
                            var head2 = new THREE.Mesh(headGeo2, headMat2);
                            head2.position.set(0, 0.05, -0.55);
                            turtleGroup.add(head2);
                            // Flippers (4 flat planes)
                            var flipGeo = new THREE.PlaneGeometry(0.4, 0.15);
                            var flipMat = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, side: THREE.DoubleSide, roughness: 0.7 });
                            [[-0.35, -0.05, -0.15, 0.5], [0.35, -0.05, -0.15, -0.5], [-0.3, -0.05, 0.25, 0.3], [0.3, -0.05, 0.25, -0.3]].forEach(function(fp) {
                              var flip = new THREE.Mesh(flipGeo.clone(), flipMat.clone());
                              flip.position.set(fp[0], fp[1], fp[2]);
                              flip.rotation.y = fp[3];
                              turtleGroup.add(flip);
                            });
                            var tx = (Math.random() - 0.5) * 60;
                            var tz = (Math.random() - 0.5) * 60;
                            turtleGroup.position.set(tx, 1 + Math.random() * 4, tz);
                            turtleGroup.scale.setScalar(0.8 + Math.random() * 0.6);
                            turtleGroup._turtleAngle = Math.random() * Math.PI * 2;
                            turtleGroup._turtleSpeed = 0.003 + Math.random() * 0.004;
                            turtleGroup._turtleRadius = 8 + Math.random() * 15;
                            turtleGroup._turtleBasePos = turtleGroup.position.clone();
                            scene.add(turtleGroup);
                            seaTurtles.push(turtleGroup);
                          }

                          // ── Manta Rays ──
                          var mantaRays = [];
                          for (var mri = 0; mri < 2; mri++) {
                            var mantaGroup = new THREE.Group();
                            // Body (flat diamond shape)
                            var mantaGeo = new THREE.PlaneGeometry(3, 1.5, 4, 2);
                            var mPos = mantaGeo.attributes.position.array;
                            // Shape into diamond wing form
                            for (var mvi = 0; mvi < mPos.length; mvi += 3) {
                              var mx2 = Math.abs(mPos[mvi]);
                              mPos[mvi + 2] = -mx2 * mx2 * 0.15; // curve wings down at tips
                              mPos[mvi + 1] *= (1 - mx2 * 0.4); // taper front/back
                            }
                            mantaGeo.computeVertexNormals();
                            var mantaMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.6, side: THREE.DoubleSide });
                            mantaGroup.add(new THREE.Mesh(mantaGeo, mantaMat));
                            // White belly
                            var bellyGeo2 = new THREE.PlaneGeometry(2, 1, 3, 1);
                            var bellyMat2 = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5, side: THREE.DoubleSide });
                            var bellyMesh2 = new THREE.Mesh(bellyGeo2, bellyMat2);
                            bellyMesh2.position.z = -0.05;
                            bellyMesh2.rotation.x = Math.PI;
                            mantaGroup.add(bellyMesh2);
                            // Tail
                            var tailGeo = new THREE.CylinderGeometry(0.02, 0.01, 2, 4);
                            tailGeo.rotateX(Math.PI / 2);
                            var tailMesh = new THREE.Mesh(tailGeo, new THREE.MeshStandardMaterial({ color: 0x2a2a3a }));
                            tailMesh.position.set(0, 0.75, 0);
                            mantaGroup.add(tailMesh);
                            mantaGroup.rotation.x = -Math.PI / 2; // horizontal
                            var mrX = (Math.random() - 0.5) * 80;
                            var mrZ = (Math.random() - 0.5) * 80;
                            mantaGroup.position.set(mrX, -1 - Math.random() * 6, mrZ);
                            mantaGroup._mantaAngle = Math.random() * Math.PI * 2;
                            mantaGroup._mantaSpeed = 0.004 + Math.random() * 0.003;
                            mantaGroup._mantaRadius = 20 + Math.random() * 25;
                            mantaGroup._mantaBasePos = mantaGroup.position.clone();
                            scene.add(mantaGroup);
                            mantaRays.push(mantaGroup);
                          }
                        }

                        // â"€â"€ Particle effects (wind-driven ambient dust/ash) â"€â"€

                        var ambientPartMesh = null;
                        var ambientPartVelocities = null;
                        if (sel.terrainType === 'desert' || sel.terrainType === 'volcanic') {

                          var partCount = 300;

                          var partGeo = new THREE.BufferGeometry();

                          var partPos = new Float32Array(partCount * 3);
                          ambientPartVelocities = new Float32Array(partCount * 3);

                          for (var pi = 0; pi < partCount; pi++) {

                            partPos[pi * 3] = (Math.random() - 0.5) * 80;

                            partPos[pi * 3 + 1] = Math.random() * 10;

                            partPos[pi * 3 + 2] = (Math.random() - 0.5) * 80;

                            // Initial velocities — wind direction + random drift
                            ambientPartVelocities[pi * 3] = (Math.random() - 0.3) * 0.04; // slight eastward bias
                            ambientPartVelocities[pi * 3 + 1] = (Math.random() - 0.5) * 0.008; // gentle vertical drift
                            ambientPartVelocities[pi * 3 + 2] = (Math.random() - 0.5) * 0.02;

                          }

                          partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));

                          var partColor = sel.terrainType === 'volcanic' ? 0xff6600 : 0xc9a06a;

                          ambientPartMesh = new THREE.Points(partGeo, new THREE.PointsMaterial({
                            color: partColor, size: sel.terrainType === 'volcanic' ? 0.07 : 0.05,
                            transparent: true, opacity: 0.45
                          }));
                          scene.add(ambientPartMesh);

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



                        // â"€â"€ Movement state â"€â"€

                        var moveState = { forward: false, back: false, left: false, right: false, up: false, down: false };

                        var yaw = 0, pitch = 0, playerPos = new THREE.Vector3(0, isFluid ? 5 : 1.6, 0);

                        var speed3d = isFluid ? 0.12 : 0.08;



                        function onKey(e, pressed) {

                          switch (e.key.toLowerCase()) {

                            case 'w': case 'arrowup': moveState.forward = pressed; break;

                            case 's': case 'arrowdown': moveState.back = pressed; break;

                            case 'a': case 'arrowleft': moveState.left = pressed; break;

                            case 'd': case 'arrowright': moveState.right = pressed; break;

                            case 'q': case ' ': moveState.up = pressed; break;

                            case 'e': case 'shift': moveState.down = pressed; break;

                            case 'f': moveState.sample = pressed; break;

                            case 'tab':
                              if (pressed && isFluid) {
                                e.preventDefault();
                                var inv = document.getElementById(isOcean ? 'ocean-sample-inventory' : 'gas-sample-inventory');
                                if (inv) { inv.style.display = inv.style.display === 'none' ? 'block' : 'none'; }
                              }
                              break;

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
                        var _photoCooldown = 0;

                        var animId3d;

                        var hudMode = 'simple'; // 'simple' | 'standard' | 'full' — start simple, press H to reveal more

                        // animate3d is defined later as animate3dV2 with 3rd-person and compass support



                        // â"€â"€ Rich Educational HUD (Enhanced) â"€â"€

                        var hud = document.createElement('div');

                        hud.className = 'rover-hud';

                        hud.style.cssText = 'position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);border-radius:12px;padding:10px 14px;color:#38bdf8;font-family:monospace;font-size:10px;pointer-events:none;z-index:10;border:1px solid rgba(56,189,248,0.3);max-width:290px;transition:opacity 0.3s';

                        var modeLabel = isOcean ? '\uD83D\uDEA4 DEEP-SEA SUBMERSIBLE' : isGas ? '\uD83D\uDEF8 ATMOSPHERIC PROBE' : '\uD83D\uDE97 SURFACE ROVER';

                        var atmosLabel = sel.atmosphere || 'No data';

                        var gravLabel = sel.gravity || '?';

                        var featList = (sel.notableFeatures || []).slice(0, 3).map(function (f) { return '<div style="color:#94a3b8;font-size:9px;padding-left:8px">\u2022 ' + f + '</div>'; }).join('');

                        // â"€â"€ Fullscreen Toggle â"€â"€

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
                          var innerContainer = canvasEl.parentElement;
                          var w, h2;
                          if (isFS) {
                            w = window.innerWidth;
                            h2 = window.innerHeight;
                            canvasEl.style.width = w + 'px';
                            canvasEl.style.height = h2 + 'px';
                            container.style.width = w + 'px';
                            container.style.height = h2 + 'px';
                            container.style.position = 'fixed';
                            container.style.top = '0';
                            container.style.left = '0';
                            container.style.zIndex = '99999';
                            container.style.background = '#000';
                            if (innerContainer && innerContainer !== container) {
                              innerContainer.style.height = h2 + 'px';
                              innerContainer.style.maxHeight = 'none';
                              innerContainer.style.borderRadius = '0';
                              innerContainer.style.border = 'none';
                            }
                          } else {
                            canvasEl.style.width = '100%';
                            canvasEl.style.height = '100%';
                            container.style.width = '';
                            container.style.height = '';
                            container.style.position = '';
                            container.style.top = '';
                            container.style.left = '';
                            container.style.zIndex = '';
                            container.style.background = '';
                            if (innerContainer && innerContainer !== container) {
                              innerContainer.style.height = '';
                              innerContainer.style.maxHeight = '';
                              innerContainer.style.borderRadius = '';
                              innerContainer.style.border = '';
                            }
                            w = canvasEl.clientWidth || canvasEl.parentElement.clientWidth || 900;
                            h2 = canvasEl.clientHeight || canvasEl.parentElement.clientHeight || 600;
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

                          '<div id="hud-standard-rows" style="border-top:1px solid rgba(56,189,248,0.12);padding-top:4px;margin-bottom:4px;display:none;grid-template-columns:auto 1fr;gap:2px 8px">' +

                          '<span style="color:#64748b" title="Compass heading: 0=N, 90=E, 180=S, 270=W">\uD83E\uDDED Hdg</span><span id="hud-hdg" style="color:#67e8f9">N 0\u00B0</span>' +

                          '<span style="color:#64748b" title="Cartesian grid position (X, Y)">\uD83D\uDCCD Pos</span><span id="hud-pos" style="color:#67e8f9;font-size:9px">0.0, 0.0</span>' +

                          '<span style="color:#64748b" title="Current speed in m/s">\uD83D\uDCA8 Spd</span><span id="hud-spd" style="color:#67e8f9">0 m/s</span>' +

                          '</div>' +

                          '<div id="hud-full-rows" style="border-top:1px solid rgba(56,189,248,0.12);padding-top:4px;margin-bottom:4px;display:none;grid-template-columns:auto 1fr;gap:2px 8px">' +

                          '<span style="color:#64748b" title="Height above surface (radar altimeter)">\uD83D\uDCCF Alt</span><span id="hud-alt" style="color:#67e8f9">0 m</span>' +

                          '<span style="color:#64748b" title="Total distance traveled">\uD83D\uDEB6 Dist</span><span id="hud-odo" style="color:#67e8f9">0 m</span>' +

                          '<span style="color:#64748b" title="Navigation target distance">\uD83C\uDFAF Tgt</span><span id="hud-tgt" style="color:#a78bfa">-- m</span>' +

                          '</div>' +

                          (isOcean ? '<div id="hud-ocean-panel" style="border-top:1px solid rgba(0,180,255,0.2);padding-top:4px;margin-bottom:4px">' +
                          '<div style="font-weight:bold;font-size:9px;color:#00b4ff;margin-bottom:3px">\uD83C\uDF0A OCEAN DEPTH</div>' +
                          '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;font-size:10px">' +
                          '<span style="color:#64748b">Zone</span><span id="hud-zone" style="color:#00b4ff;font-weight:bold">Sunlight Zone</span>' +
                          '<span style="color:#64748b">Pressure</span><span id="hud-pressure" style="color:#0ea5e9">1 atm</span>' +
                          '<span style="color:#64748b">Temp</span><span id="hud-zonetemp" style="color:#22d3ee">15\u00B0C</span>' +
                          '<span style="color:#64748b">Life</span><span id="hud-gases" style="color:#4ade80;font-size:9px">Dolphins, Sea turtles</span>' +
                          '<span style="color:#64748b">\uD83D\uDEE1\uFE0F Hull</span><span id="hud-shield" style="color:#22c55e;font-weight:bold">100%</span>' +
                          '<span style="color:#64748b">\uD83E\uDDEB Specimens</span><span id="hud-samples" style="color:#a78bfa;font-weight:bold">0</span>' +
                          '<span style="color:#64748b">\u2B07\uFE0F Deepest</span><span id="hud-depth-record" style="color:#f97316;font-weight:bold">0 m</span>' +
                          '<span style="color:#64748b">\uD83C\uDF0A Zones</span><span id="hud-zones-visited" style="color:#4ade80">0 / 5</span>' +
                          '</div></div>' :
                          isGas ? '<div id="hud-atmo-panel" style="border-top:1px solid rgba(251,191,36,0.2);padding-top:4px;margin-bottom:4px">' +
                          '<div style="font-weight:bold;font-size:9px;color:#fbbf24;margin-bottom:3px">\uD83E\uDDEA ATMOSPHERE</div>' +
                          '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;font-size:10px">' +
                          '<span style="color:#64748b">Zone</span><span id="hud-zone" style="color:#fbbf24;font-weight:bold">Upper Atmosphere</span>' +
                          '<span style="color:#64748b">Pressure</span><span id="hud-pressure" style="color:#f59e0b">0.1 bar</span>' +
                          '<span style="color:#64748b">Temp</span><span id="hud-zonetemp" style="color:#ef4444">' + sel.temp + '</span>' +
                          '<span style="color:#64748b">Wind</span><span id="hud-wind" style="color:#94a3b8">100 km/h</span>' +
                          '<span style="color:#64748b">Gases</span><span id="hud-gases" style="color:#67e8f9;font-size:9px">H\u2082, He</span>' +
                          '<span style="color:#64748b">\uD83D\uDEE1\uFE0F Shield</span><span id="hud-shield" style="color:#22c55e;font-weight:bold">100%</span>' +
                          '<span style="color:#64748b">\uD83E\uDDEA Samples</span><span id="hud-samples" style="color:#a78bfa;font-weight:bold">0</span>' +
                          '<span style="color:#64748b">\u2B07\uFE0F Deepest</span><span id="hud-depth-record" style="color:#f97316;font-weight:bold">0 m</span>' +
                          '<span style="color:#64748b">\uD83C\uDF0A Zones</span><span id="hud-zones-visited" style="color:#4ade80">0 / 5</span>' +
                          '</div></div>' : '') +

                          (featList ? '<div style="border-top:1px solid rgba(56,189,248,0.12);padding-top:3px;margin-bottom:3px"><span style="color:#7dd3fc;font-weight:bold;font-size:9px">\uD83D\uDD2D NOTABLE</span>' + featList + '</div>' : '') +

                          '<div style="border-top:1px solid rgba(56,189,248,0.12);padding-top:3px;color:#94a3b8;font-size:9px">' + (isFluid ? 'WASD move \u2022 Q/E ' + (isOcean ? 'depth' : 'altitude') + ' \u2022 <span style="color:#fbbf24">F</span> ' + (isOcean ? 'collect' : 'sample') : 'WASD drive \u2022 <span style="color:#fbbf24">F</span> collect') + ' \u2022 <span style="color:#22d3ee">G</span> scan \u2022 <span style="color:#f472b6">C</span> photo \u2022 V view \u2022 M mission \u2022 H hud \u2022 N nav</div>';

                        hud.innerHTML = hudStaticHTML;

                        canvasEl.parentElement.appendChild(hud);

                        // ── Gas Sample Inventory Panel (Tab to toggle) ──
                        if (isGas) {
                          var invPanel = document.createElement('div');
                          invPanel.id = 'gas-sample-inventory';
                          invPanel.style.cssText = 'display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:420px;max-width:90%;max-height:80%;overflow-y:auto;background:rgba(15,23,42,0.95);backdrop-filter:blur(12px);border:2px solid rgba(251,191,36,0.3);border-radius:16px;padding:20px;z-index:30;color:#e2e8f0;font-family:system-ui';
                          invPanel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-weight:bold;font-size:16px;color:#fbbf24">\uD83E\uDDEA Gas Sample Collection</div><div style="font-size:11px;color:#94a3b8">Press TAB to close</div></div>' +
                            '<div style="font-size:11px;color:#94a3b8;margin-bottom:12px">Fly through the atmosphere and press <span style="color:#fbbf24;font-weight:bold">F</span> near glowing orbs to collect gas samples. Descend deeper for rarer specimens!</div>' +
                            '<div id="gas-sample-list" style="space-y:8px"></div>' +
                            '<div id="gas-sample-empty" style="text-align:center;padding:20px;color:#64748b;font-style:italic">No samples collected yet. Look for glowing orbs in the atmosphere!</div>';
                          canvasEl.parentElement.appendChild(invPanel);
                        }
                        // ── Ocean Specimen Inventory Panel (Tab to toggle) ──
                        if (isOcean) {
                          var oceanInvPanel = document.createElement('div');
                          oceanInvPanel.id = 'ocean-sample-inventory';
                          oceanInvPanel.style.cssText = 'display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:420px;max-width:90%;max-height:80%;overflow-y:auto;background:rgba(5,20,45,0.95);backdrop-filter:blur(12px);border:2px solid rgba(0,180,255,0.3);border-radius:16px;padding:20px;z-index:30;color:#e2e8f0;font-family:system-ui';
                          oceanInvPanel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-weight:bold;font-size:16px;color:#00b4ff">\uD83E\uDDEB Marine Specimen Collection</div><div style="font-size:11px;color:#94a3b8">Press TAB to close</div></div>' +
                            '<div style="font-size:11px;color:#94a3b8;margin-bottom:12px">Dive through the ocean and press <span style="color:#00b4ff;font-weight:bold">F</span> near glowing specimens to collect them. Descend deeper for rarer life forms!</div>' +
                            '<div id="ocean-sample-list" style="space-y:8px"></div>' +
                            '<div id="ocean-sample-empty" style="text-align:center;padding:20px;color:#64748b;font-style:italic">No specimens collected yet. Look for glowing orbs in the water!</div>';
                          canvasEl.parentElement.appendChild(oceanInvPanel);
                        }

                        // â"€â"€ Hazard Warning Strip â"€â"€

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

                          [t('stem.solar_sys.earth')]: ['\uD83C\uDF0A DEPTH WARNING: Hull integrity monitoring active', '\uD83D\uDC19 SONAR: Large biological contact detected 200m port', '\u26A0 PRESSURE: Approaching crush depth \u2014 check hull', '\uD83C\uDF21 THERMOCLINE: Temperature gradient detected ahead', '\uD83D\uDD0A HYDROPHONE: Whale song detected on long-range sonar']

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



                        // â"€â"€ Discovery System (POI landmarks) â"€â"€

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

                            { x: 10, z: -12, name: 'Mariana Trench', desc: 'Deepest point on Earth at 11,034 m \u2014 deeper than Everest is tall.', fact: 'More people have walked on the Moon than have been to the bottom of the Mariana Trench.' },

                            { x: -22, z: 15, name: 'Hydrothermal Vent Field', desc: 'Superheated water erupts at 400\u00B0C, supporting life without sunlight.', fact: 'Tube worms here can grow to 2.4m and live 250+ years using chemosynthesis \u2014 no sunlight needed!' },

                            { x: 28, z: -8, name: 'Coral Reef Colony', desc: 'A living reef system teeming with biodiversity.', fact: 'Coral reefs support 25% of all marine species despite covering less than 1% of the ocean floor.' },

                            { x: -25, z: 20, name: 'Shipwreck', desc: 'A sunken vessel colonized by marine life \u2014 an artificial reef.', fact: 'There are an estimated 3 million shipwrecks on the ocean floor worldwide. Many become thriving ecosystems.' }

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

                        var poiLabelMeshes = [];
                        pois.forEach(function (poi, idx) {

                          var poiGeo = new THREE.SphereGeometry(0.3, 8, 8);

                          var poiMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 });

                          var poiMesh = new THREE.Mesh(poiGeo, poiMat);

                          var poiY = isOcean ? -10 : isGas ? 3 : 1.5;
                          poiMesh.position.set(poi.x, poiY, poi.z);

                          poiMesh._poiIdx = idx;

                          scene.add(poiMesh);

                          poiMeshes.push(poiMesh);

                          // Glow ring around POI

                          var ringGeo = new THREE.RingGeometry(0.5, 0.8, 16);

                          var ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.3, side: THREE.DoubleSide });

                          var ringMesh = new THREE.Mesh(ringGeo, ringMat);

                          ringMesh.rotation.x = -Math.PI / 2;

                          ringMesh.position.set(poi.x, isOcean ? -10.5 : isGas ? 2.5 : 1.0, poi.z);

                          ringMesh._pulsePhase = idx;

                          scene.add(ringMesh);

                          poiMeshes.push(ringMesh);

                          // 3D text label above POI (canvas-textured plane, billboards toward camera)
                          var labelCv = document.createElement('canvas');
                          labelCv.width = 256; labelCv.height = 48;
                          var lCtx = labelCv.getContext('2d');
                          lCtx.fillStyle = 'rgba(0,0,0,0.65)';
                          lCtx.roundRect(0, 0, 256, 48, 8); lCtx.fill();
                          lCtx.fillStyle = '#fbbf24';
                          lCtx.font = 'bold 16px system-ui, sans-serif';
                          lCtx.textAlign = 'center';
                          // Truncate long names
                          var labelText = poi.name.length > 28 ? poi.name.substring(0, 26) + '...' : poi.name;
                          lCtx.fillText(labelText, 128, 20);
                          lCtx.fillStyle = '#94a3b8';
                          lCtx.font = '11px system-ui, sans-serif';
                          var distLabel = Math.round(Math.sqrt(poi.x * poi.x + poi.z * poi.z) * scaleFactor) + 'm from origin';
                          lCtx.fillText(distLabel, 128, 38);
                          var labelTex = new THREE.CanvasTexture(labelCv);
                          var labelGeo2 = new THREE.PlaneGeometry(3.5, 0.7);
                          var labelMat2 = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthTest: false });
                          var labelMesh = new THREE.Mesh(labelGeo2, labelMat2);
                          labelMesh.position.set(poi.x, poiY + 1.5, poi.z);
                          labelMesh._poiLabelIdx = idx;
                          labelMesh.renderOrder = 999;
                          scene.add(labelMesh);
                          poiLabelMeshes.push(labelMesh);

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



                        // â"€â"€ Mission Card Overlay (M key toggle) â"€â"€

                        var missionCard = document.createElement('div');

                        missionCard.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);backdrop-filter:blur(12px);border-radius:16px;padding:24px;color:#fff;font-family:sans-serif;font-size:12px;pointer-events:auto;z-index:15;border:1px solid rgba(56,189,248,0.3);max-width:380px;width:90%;opacity:0;transition:opacity 0.3s;display:none';

                        var missionIcon = isOcean ? '\uD83D\uDEA4' : isGas ? '\uD83D\uDEF8' : '\uD83D\uDE97';

                        var missionType = isOcean ? 'Deep-Sea Expedition' : isGas ? 'Atmospheric Survey' : 'Surface Exploration';

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
                        var _lastMilestone = 0;
                        var _milestones = [100, 250, 500, 1000, 2500, 5000, 10000];
                        var _milestoneNames = ['Scout', 'Explorer', 'Voyager', 'Pathfinder', 'Pioneer', 'Odyssey', 'Legend'];

                        var lastSpeed = 0;

                        var scaleFactor = isOcean ? 100 : isGas ? 100 : 50; // meters per unit for display



                        // â"€â"€ Science Fact Ticker (bottom of canvas, expanded) â"€â"€

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

                          isOcean ? '\uD83C\uDF0A The ocean has 5 depth zones: Sunlight, Twilight, Midnight, Abyssal, and Hadal. Each has unique life adapted to extreme conditions.' : isGas ? '\uD83E\uDEA8 Gas giants have no solid surface \u2014 you would fall forever through ever-denser gas layers.' : '\uD83E\uDEA8 The terrain is generated from real-world elevation science for ' + sel.terrainType + ' surfaces.',

                          isOcean ? '\uD83D\uDC33 At 11,034 meters, the Mariana Trench\u2019s Challenger Deep is the deepest point in any ocean. The pressure there is 1,086 times atmospheric!' : isGas ? '\uD83C\uDF21 If you parachuted into ' + sel.name + ', you would never touch ground \u2014 just endless clouds.' : '\uD83E\uDEA8 The surface of ' + sel.name + ' is made of ' + (sel.surface || 'rock and dust') + '.',

                          // Planet-specific unique facts

                          sel.name === t('stem.periodic.mercury') ? '\uD83D\uDE80 MESSENGER orbited Mercury 2011\u20132015, mapping the entire surface and discovering ice in polar craters.' : sel.name === t('stem.solar_sys.venus') ? '\uD83D\uDE80 Soviet Venera 13 survived 127 minutes on Venus\u2019s surface in 1982 \u2014 still a record.' : sel.name === t('stem.solar_sys.earth') ? '\uD83C\uDF0A The ocean covers 71% of Earth\u2019s surface but only 5% has been explored. We know more about the Moon\u2019s surface than our own ocean floor.' : sel.name === t('stem.solar_sys.mars') ? '\uD83D\uDE80 Perseverance landed Feb 2021 in Jezero Crater, searching for signs of ancient microbial life.' : sel.name === t('stem.solar_sys.jupiter') ? '\uD83D\uDE80 Juno has been orbiting Jupiter since 2016, peering beneath the cloud tops with microwave sensors.' : sel.name === t('stem.solar_sys.saturn') ? '\uD83D\uDE80 Cassini orbited Saturn for 13 years (2004\u20132017) before its grand finale plunge into the atmosphere.' : sel.name === t('stem.solar_sys.uranus') ? '\uD83D\uDE80 Only Voyager 2 has visited Uranus, flying by in January 1986 and discovering 10 new moons.' : sel.name === t('stem.solar_sys.neptune') ? '\uD83D\uDE80 Voyager 2 is the only spacecraft to visit Neptune, flying by in August 1989.' : '\uD83D\uDE80 NASA\u2019s New Horizons flew past Pluto in July 2015, revealing a geologically active world.',

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



                        // â"€â"€ Compass / bearing indicator (top-right) â"€â"€

                        var compass = document.createElement('div');

                        compass.style.cssText = 'position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:#38bdf8;font-size:18px;font-weight:bold;pointer-events:none;z-index:10;border:1px solid rgba(56,189,248,0.3)';

                        compass.innerHTML = '\uD83E\uDDED';

                        canvasEl.parentElement.appendChild(compass);

                        // ── Vertical Depth/Altitude Gauge (right side) ──
                        var depthGauge = document.createElement('div');
                        depthGauge.style.cssText = 'position:absolute;top:64px;right:12px;width:28px;height:200px;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);border-radius:14px;pointer-events:none;z-index:10;border:1px solid rgba(56,189,248,0.2);overflow:hidden;display:flex;flex-direction:column;align-items:center;padding:4px 0';
                        depthGauge.innerHTML =
                          '<div style="font-size:6px;color:#94a3b8;margin-bottom:2px">' + (isOcean ? '\u2191 SURF' : isGas ? '\u2191 HIGH' : '\u2191 UP') + '</div>' +
                          '<div style="flex:1;width:8px;background:rgba(30,41,59,0.8);border-radius:4px;position:relative;overflow:hidden">' +
                            '<div id="depth-gauge-fill" style="position:absolute;bottom:0;left:0;right:0;height:50%;border-radius:4px;transition:height 0.3s,background 0.3s;background:linear-gradient(to top,' + (isOcean ? '#0369a1,#0ea5e9' : isGas ? '#f59e0b,#eab308' : '#22c55e,#4ade80') + ')"></div>' +
                            '<div id="depth-gauge-marker" style="position:absolute;left:-2px;right:-2px;height:3px;background:#fff;border-radius:2px;top:50%;transition:top 0.3s;box-shadow:0 0 4px rgba(255,255,255,0.5)"></div>' +
                          '</div>' +
                          '<div id="depth-gauge-val" style="font-size:7px;color:#67e8f9;margin-top:2px;font-family:monospace;font-weight:bold">0m</div>' +
                          '<div style="font-size:6px;color:#94a3b8;margin-top:1px">' + (isOcean ? '\u2193 DEEP' : isGas ? '\u2193 DEEP' : '\u2193 DN') + '</div>';
                        canvasEl.parentElement.appendChild(depthGauge);

                        // ── POI Direction Arrow (points to nearest undiscovered POI) ──
                        var poiArrow = document.createElement('div');
                        poiArrow.id = 'poi-arrow';
                        poiArrow.style.cssText = 'position:absolute;bottom:56px;left:50%;transform:translateX(-50%);pointer-events:none;z-index:10;text-align:center;opacity:0;transition:opacity 0.5s';
                        poiArrow.innerHTML =
                          '<div id="poi-arrow-icon" style="font-size:20px;transition:transform 0.2s;filter:drop-shadow(0 0 4px rgba(251,191,36,0.5))">\u2B06\uFE0F</div>' +
                          '<div id="poi-arrow-label" style="font-size:8px;color:#fbbf24;font-weight:bold;text-shadow:0 1px 3px rgba(0,0,0,0.8)">POI 50m</div>';
                        canvasEl.parentElement.appendChild(poiArrow);

                        // ── Mini-Map Radar (bottom-right) ──
                        var miniMap = document.createElement('canvas');
                        miniMap.width = 120; miniMap.height = 120;
                        miniMap.style.cssText = 'position:absolute;bottom:12px;right:12px;width:120px;height:120px;border-radius:50%;border:2px solid rgba(56,189,248,0.3);background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);pointer-events:none;z-index:10';
                        canvasEl.parentElement.appendChild(miniMap);
                        var mmCtx = miniMap.getContext('2d');

                        // ── Screen Effects Overlay (vignette + scan lines) ──
                        var screenFx = document.createElement('div');
                        screenFx.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9;border-radius:inherit;overflow:hidden';
                        // Vignette
                        screenFx.innerHTML = '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,0.4) 100%)"></div>' +
                          // Subtle scan lines
                          '<div id="scanline-fx" style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);opacity:0.5"></div>' +
                          // Depth color tint overlay (changes with depth for fluid environments)
                          '<div id="depth-tint-fx" style="position:absolute;inset:0;background:transparent;transition:background 1s;opacity:0.15"></div>';
                        canvasEl.parentElement.appendChild(screenFx);

                        // ── Atmospheric Sound Description (top-center, cycles) ──
                        var soundDesc = document.createElement('div');
                        soundDesc.style.cssText = 'position:absolute;top:60px;left:50%;transform:translateX(-50%);color:rgba(148,163,184,0.6);font-size:9px;font-style:italic;font-family:system-ui;pointer-events:none;z-index:10;text-align:center;transition:opacity 1s;opacity:0';
                        canvasEl.parentElement.appendChild(soundDesc);
                        var AMBIENT_SOUNDS = {
                          Mercury: ['\uD83D\uDD07 Dead silence. No atmosphere to carry sound.', '\uD83D\uDD07 Only the faint vibration of your rover\u2019s wheels through the regolith.', '\uD83D\uDD07 The absolute quiet of an airless world.'],
                          Venus: ['\uD83C\uDF2C\uFE0F A deep, constant roar of wind and pressure.', '\uD83C\uDF0B Distant rumbling from volcanic activity beneath the surface.', '\uD83C\uDF2C\uFE0F Sulfuric acid droplets sizzle on the hull.'],
                          Earth: ['\uD83C\uDF0A Gentle current hums against the hull. Distant whale song.', '\uD83D\uDCA7 Bubbles rising. The creak of pressure on the hull.', '\uD83D\uDC1F Clicking of shrimp colonies echoes through the water.', '\uD83C\uDF0A Deep groaning of tectonic plates shifting far below.'],
                          Mars: ['\uD83C\uDF2C\uFE0F A thin, eerie whistling of wind through canyon walls.', '\uD83C\uDF2C\uFE0F Sand grains pinging off the rover hull.', '\uD83D\uDD07 Near silence \u2014 Mars\u2019 atmosphere is too thin for most sound.'],
                          Jupiter: ['\u26A1 Crackling static from the magnetic field.', '\uD83C\uDF2C\uFE0F A deafening roar of hypersonic winds at 360 km/h.', '\u26A1 Deep electromagnetic rumbles from the metallic hydrogen core.'],
                          Saturn: ['\uD83C\uDF2C\uFE0F Gentle whooshing of hydrogen winds.', '\u26A1 Radio emissions from the aurora \u2014 eerie alien tones.', '\uD83E\uDDCA Ring particles creating a distant hiss of impacts.'],
                          Uranus: ['\uD83C\uDF2C\uFE0F A low, constant moan of methane winds.', '\uD83D\uDCA8 Whisper-quiet compared to Jupiter \u2014 but still 900 km/h.', '\uD83D\uDC8E Faint tinkling \u2014 could that be diamond rain?'],
                          Neptune: ['\uD83C\uDF2C\uFE0F The loudest winds in the solar system: a supersonic shriek.', '\u26A1 Electromagnetic pulse from the tilted magnetosphere.', '\uD83C\uDF2C\uFE0F Subsonic rumbles that shake the probe\u2019s instruments.'],
                          Pluto: ['\uD83D\uDD07 Almost nothing. A faint crackle of nitrogen sublimating.', '\uD83D\uDD07 The loneliest silence in the solar system.', '\u2744\uFE0F Soft crystalline sounds as ice shifts in the cold.']
                        };
                        var planetSounds = AMBIENT_SOUNDS[sel.name] || ['\uD83D\uDD07 Silence.'];
                        var soundIdx = 0;
                        var soundTimer = setInterval(function() {
                          soundDesc.style.opacity = '0';
                          setTimeout(function() {
                            soundDesc.textContent = '\uD83C\uDFA7 ' + planetSounds[soundIdx % planetSounds.length];
                            soundDesc.style.opacity = '1';
                            soundIdx++;
                          }, 800);
                          setTimeout(function() { soundDesc.style.opacity = '0'; }, 8000);
                        }, 12000);
                        // Show first sound after 3s
                        setTimeout(function() {
                          soundDesc.textContent = '\uD83C\uDFA7 ' + planetSounds[0];
                          soundDesc.style.opacity = '1';
                          soundIdx = 1;
                          setTimeout(function() { soundDesc.style.opacity = '0'; }, 8000);
                        }, 3000);

                        // ── Environment Scanner (G key) ──
                        var scannerActive = false;
                        var scannerCooldown = 0;
                        var scannerOverlay = document.createElement('div');
                        scannerOverlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:20;opacity:0;transition:opacity 0.3s';
                        scannerOverlay.innerHTML =
                          // Scanning sweep line
                          '<div id="scan-sweep" style="position:absolute;top:0;left:0;width:3px;height:100%;background:linear-gradient(to right,transparent,rgba(56,189,248,0.6),transparent);transition:left 1.5s linear"></div>' +
                          // Scan result card
                          '<div id="scan-result" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,10,20,0.92);backdrop-filter:blur(12px);border:1px solid rgba(56,189,248,0.4);border-radius:14px;padding:16px 20px;max-width:340px;width:85%;color:#e2e8f0;font-family:system-ui;text-align:center;opacity:0;transition:opacity 0.5s 0.8s">' +
                            '<div style="font-weight:bold;font-size:14px;color:#38bdf8;margin-bottom:6px;letter-spacing:1px">\uD83D\uDD2C ENVIRONMENT SCAN</div>' +
                            '<div id="scan-body" style="font-size:11px;line-height:1.6"></div>' +
                          '</div>';
                        canvasEl.parentElement.appendChild(scannerOverlay);

                        function doEnvironmentScan() {
                          if (scannerCooldown > 0) return;
                          scannerCooldown = 300; // ~5 sec cooldown
                          scannerOverlay.style.opacity = '1';
                          var sweep = document.getElementById('scan-sweep');
                          if (sweep) { sweep.style.left = '0'; requestAnimationFrame(function() { sweep.style.left = '100%'; }); }
                          var scanBody = document.getElementById('scan-body');
                          var scanResult = document.getElementById('scan-result');

                          // Build scan data from current location/zone
                          var scanHTML = '';
                          if (isOcean && oceanAtmo) {
                            var oz = oceanAtmo.getZone(playerPos.y);
                            scanHTML = '<div style="color:#00b4ff;font-weight:bold;margin-bottom:4px">' + oz.name + '</div>' +
                              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;text-align:left;margin-bottom:6px">' +
                              '<div>\uD83C\uDF21 ' + oz.temp + '</div><div>\uD83D\uDCA8 ' + oz.pressure + '</div>' +
                              '</div>' +
                              '<div style="color:#4ade80;font-size:10px;margin-bottom:4px">\uD83E\uDDA0 Life detected: ' + (oz.life || []).join(', ') + '</div>' +
                              '<div style="color:#94a3b8;font-size:10px;font-style:italic">' + oz.science + '</div>';
                          } else if (isGas && gasAtmo) {
                            var gz = gasAtmo.getZone(playerPos.y);
                            scanHTML = '<div style="color:#fbbf24;font-weight:bold;margin-bottom:4px">' + gz.name + '</div>' +
                              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;text-align:left;margin-bottom:6px">' +
                              '<div>\uD83C\uDF21 ' + gz.temp + '</div><div>\uD83D\uDCA8 ' + gz.pressure + '</div>' +
                              '<div>\uD83C\uDF2C\uFE0F ' + gz.windSpeed + ' km/h</div><div>\uD83E\uDDEA ' + (gz.gases || []).join(', ') + '</div>' +
                              '</div>' +
                              '<div style="color:#94a3b8;font-size:10px;font-style:italic">' + gz.science + '</div>';
                          } else {
                            // Rocky planet scan
                            var elev = ((playerPos.y - 1.6) * scaleFactor).toFixed(0);
                            var nearestPOIName = '';
                            var nearestPOIDist2 = 999;
                            pois.forEach(function(p) {
                              var d2 = Math.sqrt(Math.pow(playerPos.x - p.x, 2) + Math.pow(playerPos.z - p.z, 2)) * scaleFactor;
                              if (d2 < nearestPOIDist2) { nearestPOIDist2 = d2; nearestPOIName = p.name; }
                            });
                            scanHTML = '<div style="color:#67e8f9;font-weight:bold;margin-bottom:4px">' + sel.name + ' Surface Analysis</div>' +
                              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;text-align:left;margin-bottom:6px">' +
                              '<div>\u2696\uFE0F ' + (sel.gravity || '?') + '</div><div>\uD83C\uDF21 ' + sel.temp + '</div>' +
                              '<div>\uD83D\uDCCF Elev: ' + elev + 'm</div><div>\uD83E\uDDED Nearest: ' + Math.round(nearestPOIDist2) + 'm</div>' +
                              '</div>' +
                              '<div style="color:#fbbf24;font-size:10px;margin-bottom:4px">\uD83D\uDD2D Nearest landmark: ' + nearestPOIName + '</div>' +
                              '<div style="color:#94a3b8;font-size:10px;font-style:italic">' + (sel.surfaceDesc || sel.fact) + '</div>';
                          }
                          if (scanBody) scanBody.innerHTML = scanHTML;
                          if (scanResult) scanResult.style.opacity = '1';

                          // Auto-dismiss after 5 seconds
                          setTimeout(function() {
                            scannerOverlay.style.opacity = '0';
                            if (scanResult) scanResult.style.opacity = '0';
                            if (sweep) sweep.style.left = '0';
                          }, 5000);
                        }

                        // â"€â"€ 3rd-person camera toggle (V key) + Mission card (M key) â"€â"€

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

                          if (e.key === 'g' || e.key === 'G') {
                            doEnvironmentScan();
                          }

                          // Photo capture mode (C key) — with actual screenshot thumbnail
                          if (e.key === 'c' || e.key === 'C') {
                            if (typeof _photoCooldown !== 'undefined' && _photoCooldown > 0) return;
                            _photoCooldown = 120;

                            // Capture the actual canvas as a thumbnail before flash
                            var thumbDataUrl = '';
                            try {
                              renderer.render(scene, camera); // ensure fresh frame
                              thumbDataUrl = canvasEl.toDataURL('image/jpeg', 0.7);
                            } catch(pe) { /* security restrictions on some browsers */ }

                            // Flash effect
                            var flash = document.createElement('div');
                            flash.style.cssText = 'position:absolute;inset:0;background:rgba(255,255,255,0.7);z-index:50;pointer-events:none;transition:opacity 0.4s';
                            canvasEl.parentElement.appendChild(flash);
                            setTimeout(function() { flash.style.opacity = '0'; }, 100);
                            setTimeout(function() { if (flash.parentElement) flash.parentElement.removeChild(flash); }, 500);

                            // Photo card overlay with real screenshot thumbnail
                            var photoCard = document.createElement('div');
                            photoCard.style.cssText = 'position:absolute;bottom:70px;right:12px;background:rgba(0,0,0,0.92);backdrop-filter:blur(12px);border:2px solid rgba(56,189,248,0.4);border-radius:14px;padding:10px;z-index:25;pointer-events:auto;color:#e2e8f0;font-family:system-ui;max-width:260px;opacity:0;transition:opacity 0.3s,transform 0.3s;transform:translateY(10px)';
                            var photoLabel = isOcean ? 'DEPTH ' + Math.abs(playerPos.y * scaleFactor).toFixed(0) + 'm' : isGas ? 'ALT ' + (playerPos.y * scaleFactor).toFixed(0) + 'm' : 'ELEV ' + ((playerPos.y - 1.6) * scaleFactor).toFixed(0) + 'm';
                            var timestamp = new Date().toLocaleTimeString();
                            var thumbHtml = thumbDataUrl ? '<img src="' + thumbDataUrl + '" style="width:100%;height:100px;object-fit:cover;border-radius:8px;border:1px solid rgba(56,189,248,0.2);margin-bottom:6px" alt="Photo of ' + sel.name + '" />' : '';
                            photoCard.innerHTML = thumbHtml +
                              '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:14px">\uD83D\uDCF8</span><span style="font-weight:bold;font-size:11px;color:#38bdf8">PHOTO CAPTURED</span></div>' +
                              '<div style="font-size:9px;color:#94a3b8">' + sel.name + ' \u2022 ' + photoLabel + '</div>' +
                              '<div style="font-size:9px;color:#64748b">' + dirLabel + ' ' + Math.round(deg) + '\u00B0 \u2022 ' + timestamp + '</div>' +
                              '<div style="font-size:9px;color:#4ade80;margin-top:3px">\u2B50 +5 XP \u2022 Added to mission log</div>' +
                              (thumbDataUrl ? '<div style="margin-top:6px;text-align:center"><a download="' + sel.name.replace(/\s/g, '_') + '_photo.jpg" href="' + thumbDataUrl + '" style="font-size:9px;color:#38bdf8;text-decoration:underline;cursor:pointer">\u2B07 Save Photo</a></div>' : '');
                            canvasEl.parentElement.appendChild(photoCard);
                            setTimeout(function() { photoCard.style.opacity = '1'; photoCard.style.transform = 'translateY(0)'; }, 50);
                            setTimeout(function() { photoCard.style.opacity = '0'; photoCard.style.transform = 'translateY(10px)'; }, 6000);
                            setTimeout(function() { if (photoCard.parentElement) photoCard.parentElement.removeChild(photoCard); }, 6500);
                            // Award XP
                            if (typeof awardStemXP === 'function') awardStemXP('solarSystem', 5);
                            addMissionEntry('\uD83D\uDCF8 Photo: ' + sel.name + ' ' + photoLabel + ' heading ' + dirLabel);
                          }

                        });



                        // â"€â"€ Trail Line (path history) - REMOVED â"€â"€

                        var trailPositions = []; var trailLine = null; var trailMaxPoints = 500;

                        function updateTrail() {

                          // Removed: User found the breadcrumb trail confusing as a "goal line".

                        }



                        // â"€â"€ Navigation Challenge System (N key) â"€â"€

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

                          navTargetMesh.position.set(navTargetX, isOcean ? -8 : isGas ? 4 : 4, navTargetZ);

                          scene.add(navTargetMesh);



                          // Draw Direct Goal Line

                          if (navGoalLine) scene.remove(navGoalLine);

                          var pts = [new THREE.Vector3(playerPos.x, isFluid ? playerPos.y - 0.5 : 0.5, playerPos.z), new THREE.Vector3(navTargetX, isOcean ? -8 : isGas ? 4 : 0.5, navTargetZ)];

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



                        // â"€â"€ Course Plotter System (P key) â"€â"€

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

                          var pts = plotterWaypoints.map(function (wp) { return new THREE.Vector3(wp.x, isOcean ? -8 : isGas ? 3 : 0.2, wp.z); });

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

                            mp.position.set(wp.x, isOcean ? -8 : isGas ? 3 : 0.5, wp.z);

                            scene.add(mp); plotterWPMeshes.push(mp);

                          });

                        }



                        // â"€â"€ Signal Triangulation System â"€â"€

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



                        // â"€â"€ Skills Badge System â"€â"€

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



                        // ── Entry descent animation state ──
                        var _descentPhase = 0; // 0 = descending, 1 = arrived, 2 = playing
                        var _descentTick = 0;
                        var _descentDuration = 180; // ~3 sec at 60fps
                        var _descentStartY = isOcean ? 30 : isGas ? 25 : 20;
                        var _descentTargetY = isFluid ? 5 : 1.6;
                        // Descent overlay
                        var descentOverlay = document.createElement('div');
                        descentOverlay.style.cssText = 'position:absolute;inset:0;z-index:30;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity 1s';
                        descentOverlay.innerHTML =
                          '<div style="font-size:24px;margin-bottom:8px">' + (isOcean ? '\uD83D\uDEA4' : isGas ? '\uD83D\uDEF8' : '\uD83D\uDE80') + '</div>' +
                          '<div style="font-weight:bold;font-size:16px;color:#38bdf8;letter-spacing:2px;text-shadow:0 2px 8px rgba(0,0,0,0.8)">' + (isOcean ? 'SUBMERSIBLE DEPLOYING' : isGas ? 'PROBE DESCENDING' : 'ROVER LANDING') + '</div>' +
                          '<div id="descent-status" style="font-size:11px;color:#94a3b8;margin-top:4px;text-shadow:0 1px 4px rgba(0,0,0,0.8)">Entering ' + sel.name + (isOcean ? "'s ocean..." : "'s " + (isGas ? 'atmosphere...' : 'atmosphere...')) + '</div>' +
                          '<div id="descent-alt" style="font-family:monospace;font-size:13px;color:#67e8f9;margin-top:12px;text-shadow:0 1px 4px rgba(0,0,0,0.8)">' + (isOcean ? 'DEPTH: 0m' : 'ALT: ' + Math.round(_descentStartY * scaleFactor) + 'm') + '</div>';
                        canvasEl.parentElement.appendChild(descentOverlay);

                        // Hide main HUD during descent
                        if (hud) hud.style.opacity = '0';

                        // â"€â"€ Animation loop with 3rd-person + compass â"€â"€

                        function animate3dV2() {

                          animId3d = requestAnimationFrame(animate3dV2);

                          tick3d++;

                          // ── Descent intro sequence ──
                          if (_descentPhase === 0) {
                            _descentTick++;
                            var t2 = Math.min(1, _descentTick / _descentDuration);
                            // Ease-out cubic
                            var eased = 1 - Math.pow(1 - t2, 3);
                            var curY = _descentStartY + (_descentTargetY - _descentStartY) * eased;
                            playerPos.y = curY;
                            playerPos.x = Math.sin(_descentTick * 0.01) * 2 * (1 - eased); // gentle spiral
                            playerPos.z = Math.cos(_descentTick * 0.01) * 2 * (1 - eased);
                            camera.position.copy(playerPos);
                            camera.position.y += 2 * (1 - eased);
                            pitch = -0.3 * (1 - eased); // look down during descent
                            camera.rotation.order = 'YXZ';
                            camera.rotation.y = _descentTick * 0.003;
                            camera.rotation.x = pitch;
                            // Update altitude readout
                            var altEl2 = document.getElementById('descent-alt');
                            if (altEl2) {
                              var dispAlt = Math.round(Math.abs(curY) * scaleFactor);
                              altEl2.textContent = (isOcean ? 'DEPTH: ' : 'ALT: ') + dispAlt + 'm';
                            }
                            var statusEl = document.getElementById('descent-status');
                            if (statusEl && t2 > 0.5) statusEl.textContent = isOcean ? 'Approaching dive depth...' : isGas ? 'Entering cloud layer...' : 'Final approach...';
                            // Transition to play mode
                            if (t2 >= 1) {
                              _descentPhase = 1;
                              descentOverlay.style.opacity = '0';
                              if (hud) hud.style.opacity = '1';
                              pitch = 0;
                              playerPos.x = 0; playerPos.z = 0;
                              setTimeout(function() {
                                if (descentOverlay.parentElement) descentOverlay.parentElement.removeChild(descentOverlay);
                                _descentPhase = 2;
                              }, 1200);
                            }
                            // Still render the scene during descent
                            roverGroup.position.copy(playerPos);
                            roverGroup.position.y -= 0.5;
                            roverGroup.visible = true;
                            renderer.render(scene, camera);
                            return; // skip normal movement during descent
                          }

                          // Movement

                          var dir = new THREE.Vector3();

                          if (moveState.forward) dir.z -= 1;

                          if (moveState.back) dir.z += 1;

                          if (moveState.left) dir.x -= 1;

                          if (moveState.right) dir.x += 1;

                          dir.normalize().multiplyScalar(speed3d);

                          dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

                          playerPos.add(dir);

                          if (isOcean) {
                            // Underwater sub: free-swimming with ocean floor collision
                            if (moveState.up) playerPos.y += speed3d;
                            if (moveState.down) {
                              var oceanFloor = _terrainHeightAt(playerPos.x, playerPos.z) + 1.0;
                              playerPos.y = Math.max(oceanFloor, playerPos.y - speed3d);
                            }
                            playerPos.y = Math.min(8, playerPos.y); // can't surface above water
                            // Gentle ocean current drift
                            playerPos.x += Math.sin(tick3d * 0.002 + playerPos.z * 0.01) * 0.003;
                            playerPos.z += Math.cos(tick3d * 0.0015 + playerPos.x * 0.01) * 0.002;
                          } else if (isGas) {
                            // Gas giant probe: free flight in atmosphere
                            if (moveState.up) playerPos.y += speed3d;
                            if (moveState.down) playerPos.y = Math.max(1.0, playerPos.y - speed3d);
                          } else {
                            // Rocky planet rover: ground-following, no vertical flight
                            var groundH = _terrainHeightAt(playerPos.x, playerPos.z);
                            playerPos.y = groundH + 1.6; // rover camera height above terrain
                          }



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



                          // Billboard corona to face camera
                          if (coronaMesh) {
                            coronaMesh.lookAt(camera.position);
                            // Subtle sun pulse
                            var sunPulse = 1 + Math.sin(tick3d * 0.015) * 0.05;
                            coronaMesh.scale.setScalar(sunPulse);
                          }

                          // Animate sky moons orbiting overhead
                          skyMoons.forEach(function(sm) {
                            var angle = tick3d * sm._orbitSpeed + sm._orbitPhase;
                            sm.position.set(
                              Math.cos(angle) * sm._orbitR,
                              40 + Math.sin(angle * 0.7 + sm._orbitPhase) * sm._orbitR * sm._orbitTilt,
                              Math.sin(angle) * sm._orbitR
                            );
                          });

                          // Animate clouds

                          scene.children.forEach(function (c) {
                            if (c._cloudSpeed) {
                              var drift = c._cloudDrift || 0;
                              c.position.x = Math.sin(tick3d * c._cloudSpeed + drift) * 4 + Math.cos(tick3d * c._cloudSpeed * 0.3) * 2;
                              c.position.z = Math.cos(tick3d * c._cloudSpeed * 0.7 + drift) * 3;
                              if (c.material && c.material.map) {
                                c.material.map.offset.x += c._cloudSpeed * 0.15; // texture scrolling for wind effect
                              }
                              if (c._isStorm) {
                                c.rotation.z += 0.008; // spin the storm vortex
                              }
                            }
                          });



                          // ═══ Ambient particle wind animation ═══
                          if (ambientPartMesh && ambientPartVelocities) {
                            var apArr = ambientPartMesh.geometry.attributes.position.array;
                            var isStormActive = sel.terrainType === 'desert' && !isOcean && (tick3d % 1800) > 1500;
                            var windMultiplier = isStormActive ? 4.0 : 1.0;
                            var gustPhase = Math.sin(tick3d * 0.003) * 0.5 + Math.sin(tick3d * 0.0017) * 0.3;
                            for (var api = 0; api < apArr.length; api += 3) {
                              // Apply velocity + wind gusts
                              apArr[api] += ambientPartVelocities[api] * windMultiplier + gustPhase * 0.008 * windMultiplier;
                              apArr[api + 1] += ambientPartVelocities[api + 1];
                              apArr[api + 2] += ambientPartVelocities[api + 2] * windMultiplier;
                              // Recycle particles that drift out of range
                              if (apArr[api] > playerPos.x + 45) apArr[api] = playerPos.x - 45;
                              if (apArr[api] < playerPos.x - 45) apArr[api] = playerPos.x + 45;
                              if (apArr[api + 2] > playerPos.z + 45) apArr[api + 2] = playerPos.z - 45;
                              if (apArr[api + 2] < playerPos.z - 45) apArr[api + 2] = playerPos.z + 45;
                              // Keep vertical range
                              if (apArr[api + 1] > 12) apArr[api + 1] = 0.2;
                              if (apArr[api + 1] < 0) apArr[api + 1] = 10;
                            }
                            // Opacity pulses during storms
                            ambientPartMesh.material.opacity = isStormActive ? 0.7 : 0.4;
                            ambientPartMesh.material.size = isStormActive ? 0.1 : (sel.terrainType === 'volcanic' ? 0.07 : 0.05);
                            ambientPartMesh.geometry.attributes.position.needsUpdate = true;
                          }

                          // ═══ Planet-Specific Environmental Events ═══

                          // Mars: periodic dust storm that reduces visibility + lateral wind push
                          if (sel.terrainType === 'desert' && !isOcean) {
                            var dustCycle = tick3d % 1800; // ~30 sec cycle at 60fps
                            if (dustCycle > 1500) { // storm active for last 5 sec
                              var stormIntensity = (dustCycle - 1500) / 300;
                              var stormFade = dustCycle > 1700 ? (1800 - dustCycle) / 100 : stormIntensity;
                              if (scene.fog) {
                                scene.fog.density = 0.008 + stormFade * 0.04; // heavier fog
                              }
                              // Tint scene reddish during storm
                              renderer.setClearColor(new THREE.Color('#c4856b').lerp(new THREE.Color('#6b2010'), stormFade * 0.6));
                              // Lateral wind push on rover during storm
                              var windPush = stormFade * 0.015;
                              playerPos.x += Math.sin(tick3d * 0.008) * windPush;
                              playerPos.z += Math.cos(tick3d * 0.006) * windPush * 0.7;
                              // Camera shake in first-person
                              if (!thirdPerson) {
                                camera.position.x += Math.sin(tick3d * 0.15) * stormFade * 0.008;
                                camera.position.y += Math.cos(tick3d * 0.12) * stormFade * 0.005;
                              }
                            } else if (scene.fog) {
                              scene.fog.density = 0.008;
                            }
                          }

                          // Venus: acid rain particles + heat shimmer + volcanic lightning
                          if (sel.terrainType === 'volcanic') {
                            // Heat shimmer: slight camera position wobble
                            if (!thirdPerson) {
                              camera.position.x += Math.sin(tick3d * 0.05) * 0.003;
                              camera.position.y += Math.cos(tick3d * 0.07) * 0.002;
                            }
                            // Acid rain streaks (animate existing particles as falling rain)
                            if (ambientPartMesh) {
                              var rainArr = ambientPartMesh.geometry.attributes.position.array;
                              for (var ri = 0; ri < rainArr.length; ri += 3) {
                                rainArr[ri + 1] -= 0.06; // fast rain fall
                                rainArr[ri] += Math.sin(tick3d * 0.01 + ri) * 0.003; // slight wind drift
                                if (rainArr[ri + 1] < 0) {
                                  rainArr[ri + 1] = 8 + Math.random() * 4;
                                  rainArr[ri] = playerPos.x + (Math.random() - 0.5) * 50;
                                  rainArr[ri + 2] = playerPos.z + (Math.random() - 0.5) * 50;
                                }
                              }
                              ambientPartMesh.geometry.attributes.position.needsUpdate = true;
                            }
                            // Periodic sulfuric lightning flash
                            if (tick3d % 900 < 3) {
                              var vFlashIntensity = 1 - (tick3d % 900) / 3;
                              renderer.setClearColor(new THREE.Color('#ffcc44').lerp(new THREE.Color(sel.skyColor || '#c25a00'), 1 - vFlashIntensity * 0.4));
                              if (!thirdPerson) camera.position.y += vFlashIntensity * 0.01;
                            }
                          }

                          // Mercury: solar flare flash events
                          if (sel.terrainType === 'cratered' && sel.name !== 'Pluto') {
                            if (tick3d % 600 < 4) { // brief flash every ~10 sec
                              var flareIntensity = 1 - (tick3d % 600) / 4;
                              renderer.setClearColor(new THREE.Color('#ffffff').lerp(new THREE.Color('#000000'), 1 - flareIntensity * 0.3));
                            }
                          }

                          // Pluto: nitrogen snow particles
                          if (sel.name === t('stem.solar_sys.pluto') || sel.terrainType === 'iceworld') {
                            if (typeof diamonds !== 'undefined' && diamonds) {
                              diamonds.material.opacity = 0.3 + Math.sin(tick3d * 0.02) * 0.15;
                            }
                          }

                          // Saturn rings shimmer + slow rotation + shadow bands
                          if (typeof saturnRingMeshes !== 'undefined' && saturnRingMeshes.length > 0) {
                            saturnRingMeshes.forEach(function(rm, ri2) {
                              rm.material.opacity = 0.2 + Math.sin(tick3d * 0.005 + ri2 * 0.5) * 0.05;
                              // Slow orbital rotation — rings drift across the sky
                              rm.rotation.z += 0.0001 + ri2 * 0.00003;
                              // Subtle tilt oscillation (precession effect)
                              rm.rotation.x = Math.PI / 2 + 0.3 + Math.sin(tick3d * 0.0003 + ri2) * 0.02;
                            });
                            // Ring shadow bands on terrain — periodic light dimming
                            if (sunDir && tick3d % 4 === 0) {
                              var ringShadow = Math.abs(Math.sin(tick3d * 0.001)) * 0.15;
                              sunDir.intensity = Math.max(0.5, 1.0 - ringShadow);
                            }
                          }

                          // Mars dust devils spin and wander
                          if (typeof dustDevils !== 'undefined' && dustDevils.length > 0) {
                            dustDevils.forEach(function(dd) {
                              dd._ddWander += 0.002;
                              dd.position.x = dd._ddBaseX + Math.sin(dd._ddWander) * 15;
                              dd.position.z = dd._ddBaseZ + Math.cos(dd._ddWander * 0.7) * 10;
                              dd.position.y = _terrainHeightAt(dd.position.x, dd.position.z);
                              // Spin the dust columns
                              dd.children.forEach(function(child) {
                                child.rotation.y += dd._ddSpeed;
                              });
                            });
                          }

                          // Venus volcanoes pulse and erupt
                          if (typeof venusVolcanoes !== 'undefined' && venusVolcanoes.length > 0) {
                            venusVolcanoes.forEach(function(vg) {
                              vg._volcanoPhase += 0.01;
                              // Pulsing crater glow
                              var eruptFactor = Math.max(0, Math.sin(vg._volcanoPhase));
                              vg.children.forEach(function(vc) {
                                if (vc.isLight) vc.intensity = 1.5 + eruptFactor * 3;
                                if (vc.material && vc.material.opacity !== undefined && vc.geometry && vc.geometry.type === 'SphereGeometry') {
                                  vc.material.opacity = 0.3 + eruptFactor * 0.4;
                                }
                              });
                            });
                          }

                          // Ocean creature animations
                          if (isOcean) {
                            // Sea turtles glide in slow circles
                            if (typeof seaTurtles !== 'undefined') {
                              seaTurtles.forEach(function(turtle) {
                                turtle._turtleAngle += turtle._turtleSpeed;
                                turtle.position.x = turtle._turtleBasePos.x + Math.cos(turtle._turtleAngle) * turtle._turtleRadius;
                                turtle.position.z = turtle._turtleBasePos.z + Math.sin(turtle._turtleAngle) * turtle._turtleRadius;
                                turtle.position.y = turtle._turtleBasePos.y + Math.sin(tick3d * 0.006 + turtle._turtleAngle) * 0.5;
                                turtle.rotation.y = turtle._turtleAngle + Math.PI / 2;
                                // Flipper animation
                                turtle.children.forEach(function(child, ci3) {
                                  if (ci3 >= 2) { // flippers are children 2-5
                                    child.rotation.x = Math.sin(tick3d * 0.05 + ci3) * 0.3;
                                  }
                                });
                              });
                            }
                            // Manta rays sweep gracefully
                            if (typeof mantaRays !== 'undefined') {
                              mantaRays.forEach(function(manta) {
                                manta._mantaAngle += manta._mantaSpeed;
                                manta.position.x = manta._mantaBasePos.x + Math.cos(manta._mantaAngle) * manta._mantaRadius;
                                manta.position.z = manta._mantaBasePos.z + Math.sin(manta._mantaAngle) * manta._mantaRadius;
                                manta.position.y = manta._mantaBasePos.y + Math.sin(tick3d * 0.004) * 0.8;
                                manta.rotation.z = -Math.PI / 2 + manta._mantaAngle;
                                // Wing flap
                                var wingFlap = Math.sin(tick3d * 0.03) * 0.1;
                                if (manta.children[0] && manta.children[0].geometry) {
                                  // Subtle body roll
                                  manta.children[0].rotation.x = wingFlap * 0.5;
                                }
                              });
                            }
                          }

                          // ═══ Gas Giant Atmosphere Simulation ═══
                          if (isGas && gasAtmo) {
                            var zone = gasAtmo.getZone(playerPos.y);

                            // Wind turbulence — push probe sideways based on zone wind speed
                            if (zone.windSpeed > 0) {
                              var windForce = zone.windSpeed / 8000;
                              var windAngle = tick3d * 0.002 + playerPos.x * 0.01;
                              playerPos.x += Math.sin(windAngle) * windForce;
                              playerPos.z += Math.cos(windAngle * 0.7) * windForce * 0.6;
                              // Micro-turbulence jolts
                              if (Math.random() < zone.windSpeed / 3000) {
                                playerPos.x += (Math.random() - 0.5) * windForce * 3;
                                playerPos.z += (Math.random() - 0.5) * windForce * 3;
                              }
                            }

                            // Dynamic fog density based on depth
                            if (scene.fog) {
                              scene.fog.density = 0.003 + zone.fogDensity * 0.02;
                              scene.fog.color.set(new THREE.Color(zone.color));
                            }

                            // Skybox color shift based on depth
                            if (scene.background) {
                              var depthColor = new THREE.Color(zone.color);
                              scene.background.lerp && scene.background.lerp(depthColor, 0.01);
                            }

                            // Shield damage from pressure/hazards
                            if (zone.hazard === 'crush' && tick3d % 30 === 0) {
                              gasShieldHP = Math.max(0, gasShieldHP - 0.5);
                            }
                            if (zone.hazard === 'lethal' && tick3d % 10 === 0) {
                              gasShieldHP = Math.max(0, gasShieldHP - 2);
                            }
                            // Shield regenerates in upper atmosphere
                            if (zone.hazard === null && gasShieldHP < 100 && tick3d % 20 === 0) {
                              gasShieldHP = Math.min(100, gasShieldHP + 1);
                            }

                            // Warning system
                            if (gasWarningTimer > 0) gasWarningTimer--;
                            if (zone.hazard === 'lethal' && gasWarningTimer <= 0) {
                              gasWarningText = '\u26A0\uFE0F CRITICAL: Core proximity! Shield failing! Ascend immediately!';
                              gasWarningTimer = 120;
                            } else if (zone.hazard === 'crush' && gasWarningTimer <= 0) {
                              gasWarningText = '\u26A0\uFE0F WARNING: Extreme pressure zone. Shield integrity: ' + Math.round(gasShieldHP) + '%';
                              gasWarningTimer = 90;
                            } else if (zone.hazard === 'pressure' && gasWarningTimer <= 0) {
                              gasWarningText = '\u26A0\uFE0F Entering deep troposphere. Pressure increasing rapidly.';
                              gasWarningTimer = 150;
                            } else if (zone.hazard === 'wind_shear' && Math.random() < 0.003) {
                              gasWarningText = '\uD83C\uDF2C\uFE0F Wind shear alert! ' + zone.windSpeed + ' km/h cross-winds detected.';
                              gasWarningTimer = 80;
                            }

                            // Lightning flashes in Deep Troposphere
                            if (zone.name === 'Deep Troposphere' && Math.random() < 0.008) {
                              var flash = new THREE.PointLight(0xffffff, 3, 80);
                              flash.position.set(playerPos.x + (Math.random() - 0.5) * 40, playerPos.y - Math.random() * 5, playerPos.z + (Math.random() - 0.5) * 40);
                              scene.add(flash);
                              setTimeout(function() { scene.remove(flash); flash.dispose(); }, 150);
                            }

                            // ═══ Great Red Spot Proximity Encounter (Jupiter) ═══
                            if (sel.name === 'Jupiter' || sel.name === t('stem.solar_sys.jupiter')) {
                              // GRS storm vortex is at (30, -4, -20)
                              var grsDist = Math.sqrt(Math.pow(playerPos.x - 30, 2) + Math.pow(playerPos.z + 20, 2));
                              if (grsDist < 25) {
                                var grsIntensity = Math.max(0, 1 - grsDist / 25);
                                // Spiraling vortex pull toward eye
                                var grsAngle = Math.atan2(playerPos.z + 20, playerPos.x - 30);
                                var tangentialPull = grsIntensity * 0.012;
                                playerPos.x += Math.cos(grsAngle + Math.PI * 0.4) * tangentialPull;
                                playerPos.z += Math.sin(grsAngle + Math.PI * 0.4) * tangentialPull;
                                // Intense turbulence near vortex
                                if (grsIntensity > 0.3) {
                                  var turbJolt = grsIntensity * 0.02;
                                  playerPos.x += (Math.random() - 0.5) * turbJolt;
                                  playerPos.z += (Math.random() - 0.5) * turbJolt;
                                  // Camera shake
                                  if (!thirdPerson) {
                                    camera.position.x += Math.sin(tick3d * 0.2) * grsIntensity * 0.01;
                                    camera.position.y += Math.cos(tick3d * 0.17) * grsIntensity * 0.008;
                                  }
                                }
                                // Fog color shifts to GRS orange-red
                                if (scene.fog && grsIntensity > 0.2) {
                                  var grsColor = new THREE.Color('#c85028').lerp(new THREE.Color(zone.color), 1 - grsIntensity * 0.6);
                                  scene.fog.color.lerp(grsColor, 0.05);
                                  scene.fog.density = Math.max(scene.fog.density, 0.003 + grsIntensity * 0.02);
                                }
                                // Frequent lightning within the storm
                                if (grsIntensity > 0.4 && Math.random() < 0.03 * grsIntensity) {
                                  var grsFlash = new THREE.PointLight(0xffcc44, 4, 60);
                                  grsFlash.position.set(30 + (Math.random() - 0.5) * 20, playerPos.y + (Math.random() - 0.5) * 4, -20 + (Math.random() - 0.5) * 20);
                                  scene.add(grsFlash);
                                  setTimeout(function() { scene.remove(grsFlash); grsFlash.dispose(); }, 120);
                                }
                                // Warning when very close
                                if (grsIntensity > 0.7 && gasWarningTimer <= 0) {
                                  gasWarningText = '\uD83C\uDF00 GREAT RED SPOT! Extreme vortex winds — 680 km/h! Steer clear of the eye!';
                                  gasWarningTimer = 180;
                                }
                              }
                            }

                            // Sample orb pulse animation + collection detection
                            if (gasSampleCooldown > 0) gasSampleCooldown--;
                            gasAtmo.sampleOrbs.forEach(function(orb) {
                              if (orb._collected) return;
                              // Pulse glow
                              var pulse = 0.5 + Math.sin(tick3d * 0.05 + orb._pulsePhase) * 0.3;
                              orb.children.forEach(function(child) {
                                if (child.material && child.material.opacity !== undefined) {
                                  child.material.opacity = pulse;
                                }
                              });
                              // Bobbing motion
                              orb.position.y += Math.sin(tick3d * 0.02 + orb._pulsePhase) * 0.003;

                              // Collection detection (proximity + press F or click)
                              var sampleDist = playerPos.distanceTo(orb.position);
                              if (sampleDist < 3 && gasSampleCooldown <= 0) {
                                // Show proximity indicator
                                if (sampleDist < 2 && moveState.sample) {
                                  orb._collected = true;
                                  orb.visible = false;
                                  gasSampleCooldown = 60;
                                  var sd = orb._sampleData;
                                  gasSamples.push({ name: sd.name, gas: sd.gas, icon: sd.icon, fact: sd.fact, depth: playerPos.y.toFixed(1), zone: zone.name });
                                  if (addToast) addToast(sd.icon + ' Collected: ' + sd.name + ' (' + sd.gas + ') \u2014 ' + sd.fact, 'success');
                                  awardXP(sd.xp, 'Gas sample: ' + sd.name);
                                  playBeep();

                                  // Update inventory panel
                                  var sampleListEl = document.getElementById('gas-sample-list');
                                  var sampleEmptyEl = document.getElementById('gas-sample-empty');
                                  if (sampleEmptyEl) sampleEmptyEl.style.display = 'none';
                                  if (sampleListEl) {
                                    var card = document.createElement('div');
                                    card.style.cssText = 'background:rgba(30,41,59,0.8);border:1px solid rgba(251,191,36,0.2);border-radius:10px;padding:10px 12px;margin-bottom:8px';
                                    card.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-size:18px">' + sd.icon + '</span><div><div style="font-weight:bold;font-size:13px;color:#fbbf24">' + sd.name + '</div><div style="font-size:10px;color:#94a3b8">' + sd.gas + ' \u2022 Depth: ' + playerPos.y.toFixed(1) + ' \u2022 ' + zone.name + '</div></div></div>' +
                                      '<div style="font-size:11px;color:#cbd5e1;line-height:1.4">' + sd.fact + '</div>';
                                    sampleListEl.appendChild(card);
                                  }
                                }
                              }
                            });
                          }

                          // ═══ Ocean Depth Simulation (Earth Underwater) ═══
                          if (isOcean && oceanAtmo) {
                            var oZone = oceanAtmo.getZone(playerPos.y);

                            // Dynamic fog based on depth
                            if (scene.fog) {
                              scene.fog.density = oZone.fogDensity;
                              scene.fog.color.set(new THREE.Color(oZone.color));
                            }

                            // Light attenuation with depth
                            if (causticLight) {
                              causticLight.position.x = playerPos.x + Math.sin(tick3d * 0.01) * 8;
                              causticLight.position.z = playerPos.z + Math.cos(tick3d * 0.008) * 8;
                              causticLight.intensity = Math.max(0, oZone.lightLevel * 0.8);
                            }
                            if (waterLight) {
                              waterLight.intensity = Math.max(0.05, oZone.lightLevel * 0.5);
                            }

                            // Hull damage from pressure
                            if (oZone.hazard === 'crush' && tick3d % 30 === 0) {
                              oceanHullHP = Math.max(0, oceanHullHP - 0.5);
                            }
                            if (oZone.hazard === 'lethal' && tick3d % 10 === 0) {
                              oceanHullHP = Math.max(0, oceanHullHP - 2);
                            }
                            if (oZone.hazard === null && oceanHullHP < 100 && tick3d % 20 === 0) {
                              oceanHullHP = Math.min(100, oceanHullHP + 1);
                            }

                            // Warning system
                            if (oceanWarningTimer > 0) oceanWarningTimer--;
                            if (oZone.hazard === 'lethal' && oceanWarningTimer <= 0) {
                              oceanWarningText = '\u26A0\uFE0F CRITICAL: Crush depth! Hull buckling! Ascend immediately!';
                              oceanWarningTimer = 120;
                            } else if (oZone.hazard === 'crush' && oceanWarningTimer <= 0) {
                              oceanWarningText = '\u26A0\uFE0F WARNING: Extreme pressure zone. Hull integrity: ' + Math.round(oceanHullHP) + '%';
                              oceanWarningTimer = 90;
                            } else if (oZone.hazard === 'pressure' && oceanWarningTimer <= 0) {
                              oceanWarningText = '\uD83C\uDF0A Entering midnight zone. Activating bioluminescence scanners.';
                              oceanWarningTimer = 150;
                            }

                            // Sample orb pulse + collection
                            if (oceanSampleCooldown > 0) oceanSampleCooldown--;
                            oceanAtmo.sampleOrbs.forEach(function(orb) {
                              if (orb._collected) return;
                              var pulse = 0.5 + Math.sin(tick3d * 0.05 + orb._pulsePhase) * 0.3;
                              orb.children.forEach(function(child) {
                                if (child.material && child.material.opacity !== undefined) child.material.opacity = pulse;
                              });
                              orb.position.y += Math.sin(tick3d * 0.015 + orb._pulsePhase) * 0.002;
                              var sDist = playerPos.distanceTo(orb.position);
                              if (sDist < 3 && oceanSampleCooldown <= 0 && sDist < 2 && moveState.sample) {
                                orb._collected = true; orb.visible = false;
                                oceanSampleCooldown = 60;
                                var sd = orb._sampleData;
                                oceanSamples.push({ name: sd.name, type: sd.type, icon: sd.icon, fact: sd.fact, depth: playerPos.y.toFixed(1), zone: oZone.name });
                                if (typeof addToast === 'function') addToast(sd.icon + ' Collected: ' + sd.name + ' (' + sd.type + ') \u2014 ' + sd.fact, 'success');
                                if (typeof awardStemXP === 'function') awardStemXP('solarSystem', sd.xp);
                                if (typeof playBeep === 'function') playBeep();
                                var sListEl = document.getElementById('ocean-sample-list');
                                var sEmptyEl = document.getElementById('ocean-sample-empty');
                                if (sEmptyEl) sEmptyEl.style.display = 'none';
                                if (sListEl) {
                                  var card = document.createElement('div');
                                  card.style.cssText = 'background:rgba(5,25,50,0.8);border:1px solid rgba(0,180,255,0.2);border-radius:10px;padding:10px 12px;margin-bottom:8px';
                                  card.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-size:18px">' + sd.icon + '</span><div><div style="font-weight:bold;font-size:13px;color:#00b4ff">' + sd.name + '</div><div style="font-size:10px;color:#94a3b8">' + sd.type + ' \u2022 Depth: ' + Math.abs(playerPos.y * 100).toFixed(0) + 'm \u2022 ' + oZone.name + '</div></div></div>' +
                                    '<div style="font-size:11px;color:#cbd5e1;line-height:1.4">' + sd.fact + '</div>';
                                  sListEl.appendChild(card);
                                }
                              }
                            });

                            // Depth record tracking
                            if (playerPos.y < oceanAtmo.deepestY) {
                              oceanAtmo.deepestY = playerPos.y;
                              oceanAtmo.depthRecord = Math.abs(playerPos.y * 100);
                            }
                            var curOceanZone = oZone.name;
                            if (!oceanAtmo.zonesVisited[curOceanZone]) {
                              oceanAtmo.zonesVisited[curOceanZone] = true;
                              if (typeof addToast === 'function' && Object.keys(oceanAtmo.zonesVisited).length > 1) addToast('\uD83C\uDF0A Entered: ' + curOceanZone, 'info');
                            }

                            // Bioluminescent creatures pulse and drift
                            if (typeof bioLights !== 'undefined') {
                              bioLights.forEach(function(bl) {
                                bl.intensity = (playerPos.y < -5 ? 0.3 + Math.sin(tick3d * 0.03 + bl._bioPhase) * 0.4 : 0.05);
                                bl.position.x = bl._bioBaseX + Math.sin(tick3d * 0.005 + bl._bioPhase) * 3;
                                bl.position.y = bl._bioBaseY + Math.sin(tick3d * 0.008 + bl._bioPhase * 2) * 1;
                                if (bl._orbMesh) bl._orbMesh.position.copy(bl.position);
                              });
                            }
                            // Coral bioluminescence — glow intensifies in deeper water
                            if (typeof coralLights !== 'undefined' && coralLights.length > 0) {
                              var depthGlow = Math.max(0, Math.min(1, (-playerPos.y - 2) / 10));
                              coralLights.forEach(function(cl2) {
                                cl2.intensity = depthGlow * (0.25 + Math.sin(tick3d * 0.02 + cl2._coralPhase) * 0.15);
                              });
                            }

                            // Animate underwater particles
                            if (typeof bubblePartMesh !== 'undefined') {
                              var bArr = bubblePartMesh.geometry.attributes.position.array;
                              for (var bi2 = 0; bi2 < bArr.length; bi2 += 3) {
                                bArr[bi2 + 1] += 0.015; // rise
                                bArr[bi2] += Math.sin(tick3d * 0.005 + bi2) * 0.005;
                                if (bArr[bi2 + 1] > 10) bArr[bi2 + 1] = -25;
                              }
                              bubblePartMesh.geometry.attributes.position.needsUpdate = true;
                            }
                            if (typeof planktonMesh !== 'undefined') {
                              var pArr = planktonMesh.geometry.attributes.position.array;
                              for (var pi3 = 0; pi3 < pArr.length; pi3 += 3) {
                                pArr[pi3] += Math.sin(tick3d * 0.003 + pi3) * 0.008;
                                pArr[pi3 + 2] += Math.cos(tick3d * 0.004 + pi3) * 0.006;
                                pArr[pi3 + 1] += Math.sin(tick3d * 0.002 + pi3 * 0.5) * 0.002;
                              }
                              planktonMesh.geometry.attributes.position.needsUpdate = true;
                              planktonMesh.material.opacity = playerPos.y > -3 ? 0.35 : 0.1;
                            }
                            if (typeof snowMesh !== 'undefined') {
                              var mArr = snowMesh.geometry.attributes.position.array;
                              for (var mi3 = 0; mi3 < mArr.length; mi3 += 3) {
                                mArr[mi3 + 1] -= 0.008; // fall
                                mArr[mi3] += Math.sin(tick3d * 0.002 + mi3) * 0.003;
                                if (mArr[mi3 + 1] < -25) mArr[mi3 + 1] = 10;
                              }
                              snowMesh.geometry.attributes.position.needsUpdate = true;
                            }

                            // Kelp swaying
                            if (typeof kelpGroup !== 'undefined') {
                              kelpGroup.forEach(function(k) {
                                k.position.x = k._kelpBaseX + Math.sin(tick3d * 0.008 + k._kelpPhase) * 0.3;
                                k.rotation.z = Math.sin(tick3d * 0.006 + k._kelpPhase) * 0.08;
                              });
                            }

                            // Bubble trail from submarine
                            if (typeof bubbleMesh !== 'undefined' && bubbleMesh) {
                              var btArr = bubbleMesh.geometry.attributes.position.array;
                              var subMoving = moveState.forward || moveState.back || moveState.left || moveState.right || moveState.up || moveState.down;
                              if (subMoving && tick3d % 2 === 0) {
                                var bIdx = bubbleIdx * 3;
                                btArr[bIdx] = playerPos.x + (Math.random() - 0.5) * 0.5;
                                btArr[bIdx + 1] = playerPos.y - 0.3;
                                btArr[bIdx + 2] = playerPos.z + (Math.random() - 0.5) * 0.5;
                                bubbleLife[bubbleIdx] = 80;
                                bubbleIdx = (bubbleIdx + 1) % 80;
                              }
                              for (var bti = 0; bti < 80; bti++) {
                                if (bubbleLife[bti] > 0) {
                                  bubbleLife[bti]--;
                                  btArr[bti * 3 + 1] += 0.02; // rise
                                  btArr[bti * 3] += (Math.random() - 0.5) * 0.01;
                                }
                              }
                              bubbleMesh.geometry.attributes.position.needsUpdate = true;
                            }

                            // Strobe light blink
                            if (typeof strobe !== 'undefined') {
                              strobe.material.emissiveIntensity = Math.sin(tick3d * 0.08) > 0.7 ? 1.5 : 0.1;
                            }

                            // Fish schools swimming in circular paths
                            if (typeof fishSchools !== 'undefined') {
                              fishSchools.forEach(function(school) {
                                school._swimAngle += school._swimSpeed;
                                school.position.x = school._basePos.x + Math.cos(school._swimAngle) * school._swimRadius;
                                school.position.z = school._basePos.z + Math.sin(school._swimAngle) * school._swimRadius;
                                school.position.y = school._basePos.y + Math.sin(tick3d * 0.01 + school._swimAngle) * 0.5;
                                school.rotation.y = school._swimAngle + Math.PI / 2;
                                // Individual fish wiggle
                                school.children.forEach(function(f) {
                                  if (f._fishPhase !== undefined) {
                                    f.rotation.y = Math.sin(tick3d * 0.1 + f._fishPhase) * 0.2;
                                  }
                                });
                              });
                            }

                            // Whale gliding slowly in a large circle
                            if (typeof whaleGroup !== 'undefined') {
                              whaleGroup._whaleAngle += 0.0008;
                              whaleGroup.position.x = Math.cos(whaleGroup._whaleAngle) * 60;
                              whaleGroup.position.z = Math.sin(whaleGroup._whaleAngle) * 60;
                              whaleGroup.position.y = -2 + Math.sin(tick3d * 0.003) * 1.5;
                              whaleGroup.rotation.y = whaleGroup._whaleAngle + Math.PI / 2;
                              // Gentle body undulation
                              whaleGroup.rotation.z = Math.sin(tick3d * 0.008) * 0.03;
                            }

                            // Jellyfish pulsing and drifting
                            if (typeof jellyfish !== 'undefined') {
                              jellyfish.forEach(function(jf) {
                                var pulse = Math.sin(tick3d * 0.04 + jf._jellyPhase);
                                jf.position.y = jf._jellyBaseY + Math.sin(tick3d * 0.008 + jf._jellyPhase) * 1 + pulse * 0.15;
                                jf.position.x += Math.sin(tick3d * 0.003 + jf._jellyPhase) * 0.005;
                                jf.scale.y = 0.85 + pulse * 0.15; // pulse the bell
                                // Glow brighter in deep water
                                jf.children[0].material.emissiveIntensity = playerPos.y < -5 ? 0.4 + pulse * 0.2 : 0.1;
                              });
                            }

                            // Vent smoke rising
                            if (typeof ventSmokeMesh !== 'undefined') {
                              var vsArr = ventSmokeMesh.geometry.attributes.position.array;
                              for (var vsi2 = 0; vsi2 < vsArr.length; vsi2 += 3) {
                                vsArr[vsi2 + 1] += 0.02;
                                vsArr[vsi2] += (Math.random() - 0.5) * 0.02;
                                vsArr[vsi2 + 2] += (Math.random() - 0.5) * 0.02;
                                if (vsArr[vsi2 + 1] > ventY + 10) {
                                  vsArr[vsi2] = 15 + (Math.random() - 0.5) * 2;
                                  vsArr[vsi2 + 1] = ventY + 2;
                                  vsArr[vsi2 + 2] = -5 + (Math.random() - 0.5) * 2;
                                }
                              }
                              ventSmokeMesh.geometry.attributes.position.needsUpdate = true;
                            }

                            // Animated caustic pattern (redraw every 10 frames)
                            if (typeof causticCtx2 !== 'undefined' && tick3d % 10 === 0 && playerPos.y > -8) {
                              causticCtx2.clearRect(0, 0, 256, 256);
                              causticCtx2.fillStyle = 'rgba(100,200,255,0.3)';
                              for (var cci = 0; cci < 25; cci++) {
                                var ccx2 = 128 + Math.sin(tick3d * 0.008 + cci * 1.7) * 80 + Math.cos(tick3d * 0.005 + cci * 2.3) * 40;
                                var ccy2 = 128 + Math.cos(tick3d * 0.006 + cci * 1.3) * 80 + Math.sin(tick3d * 0.009 + cci * 1.9) * 40;
                                var ccr2 = 15 + Math.sin(tick3d * 0.01 + cci * 3) * 10;
                                causticCtx2.beginPath();
                                causticCtx2.arc(ccx2, ccy2, ccr2, 0, Math.PI * 2);
                                causticCtx2.fill();
                              }
                              causticTex.needsUpdate = true;
                              // Fade caustics with depth
                              causticPlane.material.opacity = Math.max(0, 0.15 - Math.abs(playerPos.y) * 0.006);
                              causticPlane.position.x = playerPos.x;
                              causticPlane.position.z = playerPos.z;
                            }

                            // Shark cruising in large circle
                            if (typeof sharkGroup !== 'undefined') {
                              sharkGroup._sharkAngle += 0.0015;
                              sharkGroup.position.x = Math.cos(sharkGroup._sharkAngle) * 45;
                              sharkGroup.position.z = Math.sin(sharkGroup._sharkAngle) * 45;
                              sharkGroup.position.y = -1 + Math.sin(tick3d * 0.005) * 0.8;
                              sharkGroup.rotation.y = sharkGroup._sharkAngle + Math.PI / 2;
                              // Tail sweep
                              if (sharkGroup.children[2]) sharkGroup.children[2].rotation.y = Math.sin(tick3d * 0.08) * 0.3;
                            }

                            // Tropical fish school swirling near coral
                            if (typeof tropicalFish !== 'undefined') {
                              tropicalFish._swimAngle += 0.006;
                              tropicalFish.position.x = tropicalFish._basePos.x + Math.cos(tropicalFish._swimAngle) * 3;
                              tropicalFish.position.z = tropicalFish._basePos.z + Math.sin(tropicalFish._swimAngle) * 3;
                              tropicalFish.children.forEach(function(tf) {
                                if (tf._tfPhase !== undefined) {
                                  tf.position.x += Math.sin(tick3d * 0.08 + tf._tfPhase) * 0.02;
                                  tf.position.y += Math.cos(tick3d * 0.06 + tf._tfPhase) * 0.01;
                                  tf.rotation.y = Math.sin(tick3d * 0.1 + tf._tfPhase) * 0.3;
                                }
                              });
                            }

                            // Sonar readout update
                            if (tick3d % 20 === 0) {
                              var sonarReadout = document.getElementById('sonar-readout');
                              if (sonarReadout) {
                                var lifeHere = oZone.life || [];
                                var barsHTML2 = '';
                                lifeHere.forEach(function(creature, ci2) {
                                  var signal = Math.round(60 + Math.sin(tick3d * 0.02 + ci2 * 3) * 30);
                                  barsHTML2 += '<div style="display:flex;align-items:center;gap:4px"><span style="font-size:8px;color:#94a3b8;width:72px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + creature + '</span><div style="flex:1;height:5px;background:#0a1a2a;border-radius:3px;overflow:hidden"><div style="width:' + signal + '%;height:100%;background:#00b4ff;border-radius:3px;transition:width 0.3s"></div></div></div>';
                                });
                                sonarReadout.innerHTML = barsHTML2;
                              }
                            }

                            // HUD updates for ocean
                            if (tick3d % 3 === 0) {
                              var zoneEl = document.getElementById('hud-zone');
                              var pressEl = document.getElementById('hud-pressure');
                              var ztempEl = document.getElementById('hud-zonetemp');
                              var gasesEl = document.getElementById('hud-gases');
                              var shieldEl = document.getElementById('hud-shield');
                              var samplesEl = document.getElementById('hud-samples');
                              if (zoneEl) zoneEl.textContent = oZone.name;
                              if (pressEl) pressEl.textContent = oZone.pressure;
                              if (ztempEl) ztempEl.textContent = oZone.temp;
                              if (gasesEl) gasesEl.textContent = (oZone.life || []).slice(0, 3).join(', ');
                              if (shieldEl) {
                                shieldEl.textContent = Math.round(oceanHullHP) + '%';
                                shieldEl.style.color = oceanHullHP > 60 ? '#22c55e' : oceanHullHP > 30 ? '#f59e0b' : '#ef4444';
                              }
                              if (samplesEl) samplesEl.textContent = oceanSamples.length + ' / ' + oceanAtmo.sampleOrbs.length;
                              var depthRecEl = document.getElementById('hud-depth-record');
                              var zonesVisEl = document.getElementById('hud-zones-visited');
                              if (depthRecEl) depthRecEl.textContent = Math.round(oceanAtmo.depthRecord || 0) + ' m';
                              if (zonesVisEl) zonesVisEl.textContent = Object.keys(oceanAtmo.zonesVisited || {}).length + ' / 5';
                              // Dynamic warning overlay
                              if (oceanWarningTimer > 0 && hazardEl) {
                                hazardEl.textContent = oceanWarningText;
                                hazardEl.style.opacity = '1';
                                hazardEl.style.background = oceanHullHP < 30 ? 'rgba(220,38,38,0.9)' : 'rgba(14,165,233,0.85)';
                              }
                              // Proximity hint for specimens
                              var nearestOceanOrb = null; var nearestOceanDist = 999;
                              oceanAtmo.sampleOrbs.forEach(function(orb) {
                                if (orb._collected) return;
                                var d2 = playerPos.distanceTo(orb.position);
                                if (d2 < nearestOceanDist) { nearestOceanDist = d2; nearestOceanOrb = orb; }
                              });
                              var proxEl2 = document.getElementById('hud-sample-prox');
                              if (!proxEl2 && nearestOceanDist < 4) {
                                proxEl2 = document.createElement('div');
                                proxEl2.id = 'hud-sample-prox';
                                proxEl2.style.cssText = 'position:absolute;bottom:60px;left:50%;transform:translateX(-50%);background:rgba(0,180,255,0.9);backdrop-filter:blur(4px);color:#fff;font-weight:bold;font-size:13px;padding:8px 18px;border-radius:10px;z-index:20;text-align:center;pointer-events:none;transition:opacity 0.3s';
                                canvasEl.parentElement.appendChild(proxEl2);
                              }
                              if (proxEl2) {
                                if (nearestOceanDist < 4 && nearestOceanOrb) {
                                  var sd2 = nearestOceanOrb._sampleData;
                                  proxEl2.textContent = sd2.icon + ' ' + sd2.name + ' detected! ' + (nearestOceanDist < 2 ? 'Press F to collect' : 'Get closer... (' + nearestOceanDist.toFixed(1) + 'm)');
                                  proxEl2.style.opacity = '1';
                                } else {
                                  proxEl2.style.opacity = '0';
                                }
                              }
                            }
                          }

                          // ── Gas depth particle animation ──
                          if (isGas && typeof ammoniaMesh !== 'undefined') {
                            // Ammonia crystals drift and sparkle
                            var aArr = ammoniaMesh.geometry.attributes.position.array;
                            for (var ai2 = 0; ai2 < aArr.length; ai2 += 3) {
                              aArr[ai2] += Math.sin(tick3d * 0.003 + ai2) * 0.008;
                              aArr[ai2 + 1] -= 0.003;
                              if (aArr[ai2 + 1] < 1) aArr[ai2 + 1] = 12;
                            }
                            ammoniaMesh.geometry.attributes.position.needsUpdate = true;
                            ammoniaMesh.material.opacity = playerPos.y > 2 ? 0.5 : Math.max(0, 0.5 - (2 - playerPos.y) * 0.15);

                            // Helium rain falls faster
                            var hArr = heliumMesh.geometry.attributes.position.array;
                            for (var hi2 = 0; hi2 < hArr.length; hi2 += 3) {
                              hArr[hi2 + 1] -= 0.015;
                              hArr[hi2] += Math.sin(tick3d * 0.005 + hi2) * 0.003;
                              if (hArr[hi2 + 1] < -12) hArr[hi2 + 1] = 6;
                            }
                            heliumMesh.geometry.attributes.position.needsUpdate = true;
                            heliumMesh.material.opacity = (playerPos.y < 3 && playerPos.y > -10) ? 0.45 : 0.05;

                            // Deep embers rise slowly
                            var eArr = emberMesh.geometry.attributes.position.array;
                            for (var ei2 = 0; ei2 < eArr.length; ei2 += 3) {
                              eArr[ei2 + 1] += 0.008;
                              eArr[ei2] += Math.sin(tick3d * 0.01 + ei2) * 0.01;
                              if (eArr[ei2 + 1] > -5) eArr[ei2 + 1] = -22;
                            }
                            emberMesh.geometry.attributes.position.needsUpdate = true;
                            emberMesh.material.opacity = playerPos.y < -6 ? Math.min(0.5, (-6 - playerPos.y) * 0.05) : 0;

                            // Heat shield glow intensifies with depth
                            if (shieldGlow) {
                              var depthFactor = Math.max(0, -playerPos.y / 15);
                              shieldGlow.intensity = depthFactor * 3;
                              shieldGlow.color.setHSL(0.05 - depthFactor * 0.05, 1, 0.5);
                            }

                            // Depth record tracking
                            if (playerPos.y < gasAtmo.deepestY) {
                              gasAtmo.deepestY = playerPos.y;
                              gasAtmo.depthRecord = Math.abs(playerPos.y * scaleFactor);
                            }
                            var curZoneName = gasAtmo.getZone(playerPos.y).name;
                            if (!gasAtmo.zonesVisited[curZoneName]) {
                              gasAtmo.zonesVisited[curZoneName] = true;
                              var zoneCount = Object.keys(gasAtmo.zonesVisited).length;
                              if (zoneCount >= 3) { checkChallenges(); }
                              if (addToast && zoneCount > 1) addToast('\uD83C\uDF0A Entered: ' + curZoneName, 'info');
                            }

                            // Spectrometer bar chart update (every 15 frames)
                            if (tick3d % 15 === 0) {
                              var spectroBarsEl = document.getElementById('spectro-bars');
                              if (spectroBarsEl) {
                                var curZoneGases = gasAtmo.getZone(playerPos.y).gases || [];
                                var gasColors = { 'H\u2082': '#88ccff', 'He': '#ffdd88', 'NH\u2083': '#aaddff', 'NH\u2083 ice': '#ddeeff', 'NH\u2084SH': '#cc8844', 'H\u2082O': '#4488ff', 'H\u2082O vapor': '#6699ff', 'CH\u2084': '#44ffaa', 'Metallic H': '#ff8800', 'He rain': '#ffcc44', 'Diamond rain': '#ffffff', 'Liquid H\u2082': '#88aaff', 'Rock/ice core': '#ff4400', 'Exotic matter': '#ff00ff', 'PH\u2083': '#88ff44' };
                                var barsHTML = '';
                                curZoneGases.forEach(function(gas, gi) {
                                  var pct = Math.round(90 - gi * 20 + Math.sin(tick3d * 0.03 + gi * 2) * 8);
                                  var col = gasColors[gas] || '#67e8f9';
                                  barsHTML += '<div style="display:flex;align-items:center;gap:4px"><span style="font-size:8px;color:#94a3b8;width:50px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + gas + '</span><div style="flex:1;height:6px;background:#1e293b;border-radius:3px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:' + col + ';border-radius:3px;transition:width 0.3s"></div></div><span style="font-size:8px;color:' + col + ';width:24px">' + pct + '%</span></div>';
                                });
                                spectroBarsEl.innerHTML = barsHTML;
                              }
                            }
                          }

                          // ── Rover dust trail animation (rocky planets) ──
                          if (!isGas && typeof dustTrailMesh !== 'undefined' && dustTrailMesh) {
                            var dtArr = dustTrailMesh.geometry.attributes.position.array;
                            // Spawn dust when moving
                            var isMoving = moveState.forward || moveState.back || moveState.left || moveState.right;
                            if (isMoving && tick3d % 3 === 0) {
                              var dIdx = dustTrailIdx * 3;
                              dtArr[dIdx] = playerPos.x + (Math.random() - 0.5) * 0.8;
                              dtArr[dIdx + 1] = _terrainHeightAt(playerPos.x, playerPos.z) + 0.1;
                              dtArr[dIdx + 2] = playerPos.z + (Math.random() - 0.5) * 0.8;
                              dustTrailLife[dustTrailIdx] = 60;
                              dustTrailIdx = (dustTrailIdx + 1) % 60;
                            }
                            // Age and rise dust particles
                            for (var dti2 = 0; dti2 < 60; dti2++) {
                              if (dustTrailLife[dti2] > 0) {
                                dustTrailLife[dti2]--;
                                dtArr[dti2 * 3 + 1] += 0.01; // rise
                                dtArr[dti2 * 3] += (Math.random() - 0.5) * 0.02; // drift
                              }
                            }
                            dustTrailMesh.geometry.attributes.position.needsUpdate = true;
                            dustTrailMesh.material.opacity = 0.3;

                            // Animate rover wheels (spin them when moving)
                            if (isMoving) {
                              roverGroup.children.forEach(function(child) {
                                if (child.geometry && child.geometry.type === 'CylinderGeometry' && child.geometry.parameters && Math.abs(child.geometry.parameters.radiusTop - 0.15) < 0.01) {
                                  child.rotation.x += 0.15;
                                }
                              });
                            }

                            // ── Geological Sample Collection (rocky planets) ──
                            if (typeof geoSampleOrbs !== 'undefined' && geoSampleOrbs.length > 0) {
                              if (geoSampleCooldown > 0) geoSampleCooldown--;
                              geoSampleOrbs.forEach(function(orb) {
                                if (orb._collected) return;
                                // Pulse and bob
                                var gPulse = 0.5 + Math.sin(tick3d * 0.05 + orb._pulsePhase) * 0.25;
                                orb.children[0].material.opacity = gPulse;
                                orb.children[0].rotation.y += 0.02;
                                if (orb.children[1]) orb.children[1].material.opacity = gPulse * 0.4;
                                orb.position.y += Math.sin(tick3d * 0.02 + orb._pulsePhase) * 0.002;
                                // Collection
                                var gDist = playerPos.distanceTo(orb.position);
                                if (gDist < 3 && geoSampleCooldown <= 0 && gDist < 2 && moveState.sample) {
                                  orb._collected = true; orb.visible = false;
                                  geoSampleCooldown = 60;
                                  var gsd = orb._sampleData;
                                  geoSamples.push({ name: gsd.name, type: gsd.type, icon: gsd.icon, fact: gsd.fact });
                                  if (typeof addToast === 'function') addToast(gsd.icon + ' Collected: ' + gsd.name + ' (' + gsd.type + ') \u2014 ' + gsd.fact, 'success');
                                  if (typeof awardStemXP === 'function') awardStemXP('solarSystem', gsd.xp);
                                  if (typeof playBeep === 'function') playBeep();
                                }
                                // Proximity hint
                                if (gDist < 3.5 && !orb._collected && tick3d % 30 === 0) {
                                  var proxEl3 = document.getElementById('hud-sample-prox');
                                  if (!proxEl3) {
                                    proxEl3 = document.createElement('div');
                                    proxEl3.id = 'hud-sample-prox';
                                    proxEl3.style.cssText = 'position:absolute;bottom:60px;left:50%;transform:translateX(-50%);background:rgba(251,191,36,0.9);backdrop-filter:blur(4px);color:#000;font-weight:bold;font-size:13px;padding:8px 18px;border-radius:10px;z-index:20;text-align:center;pointer-events:none;transition:opacity 0.3s';
                                    canvasEl.parentElement.appendChild(proxEl3);
                                  }
                                  if (proxEl3) {
                                    proxEl3.textContent = orb._sampleData.icon + ' ' + orb._sampleData.name + (gDist < 2 ? ' \u2014 Press F to collect!' : ' nearby (' + gDist.toFixed(1) + 'm)');
                                    proxEl3.style.opacity = '1';
                                  }
                                } else if (gDist >= 3.5) {
                                  var proxEl3b = document.getElementById('hud-sample-prox');
                                  if (proxEl3b && tick3d % 30 === 0) proxEl3b.style.opacity = '0';
                                }
                              });
                            }
                          }

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



                          // â"€â"€ Live telemetry updates (every 3 frames for perf) â"€â"€

                          if (tick3d % 3 === 0) {

                            var dx = playerPos.x - prevPos.x, dz = playerPos.z - prevPos.z, dy = playerPos.y - prevPos.y;

                            var frameDist = Math.sqrt(dx * dx + dy * dy + dz * dz) * scaleFactor;

                            odometer += frameDist;

                            // Distance milestone check
                            for (var msi = 0; msi < _milestones.length; msi++) {
                              if (odometer >= _milestones[msi] && _lastMilestone < _milestones[msi]) {
                                _lastMilestone = _milestones[msi];
                                var msLabel = _milestoneNames[msi] || 'Traveler';
                                var msDistLabel = _milestones[msi] >= 1000 ? (_milestones[msi] / 1000) + ' km' : _milestones[msi] + 'm';
                                if (typeof addToast === 'function') addToast('\uD83C\uDFC5 Distance Milestone: ' + msDistLabel + ' \u2014 "' + msLabel + '" rank achieved!', 'success');
                                if (typeof awardStemXP === 'function') awardStemXP('solarSystem', 10 + msi * 5);
                                addMissionEntry('\uD83C\uDFC5 ' + msDistLabel + ' milestone \u2014 ' + msLabel + ' rank');
                                break;
                              }
                            }

                            lastSpeed = frameDist * 20; // ~60fps/3 = 20 updates/s

                            prevPos.copy(playerPos);



                            var altEl = document.getElementById('hud-alt');

                            var spdEl = document.getElementById('hud-spd');

                            var hdgEl = document.getElementById('hud-hdg');

                            var posEl = document.getElementById('hud-pos');

                            var odoEl = document.getElementById('hud-odo');

                            var dscEl = document.getElementById('hud-disc');

                            var altitude = isOcean ? (Math.abs(playerPos.y) * scaleFactor).toFixed(0) : ((playerPos.y - (isGas ? 0 : 1.6)) * scaleFactor).toFixed(0);

                            if (altEl) altEl.textContent = altitude + ' m';

                            if (spdEl) spdEl.textContent = lastSpeed.toFixed(1) + ' m/s';

                            if (hdgEl) hdgEl.textContent = dirLabel + ' ' + Math.round(deg) + '\u00B0';

                            if (posEl) posEl.textContent = (playerPos.x * 10).toFixed(1) + ', ' + (playerPos.z * 10).toFixed(1);

                            if (odoEl) odoEl.textContent = odometer > 1000 ? (odometer / 1000).toFixed(1) + ' km' : Math.round(odometer) + ' m';

                            if (dscEl) dscEl.textContent = Object.keys(discoveredPOIs).length + ' / ' + totalPOIs;

                            // ── Depth/Altitude Gauge Update ──
                            var gaugeFill = document.getElementById('depth-gauge-fill');
                            var gaugeMarker = document.getElementById('depth-gauge-marker');
                            var gaugeVal = document.getElementById('depth-gauge-val');
                            if (gaugeFill && gaugeMarker && gaugeVal) {
                              var maxH = isOcean ? 30 : isGas ? 30 : 15;
                              var minH = isOcean ? -30 : isGas ? -25 : 0;
                              var range = maxH - minH;
                              var normalizedPos = Math.max(0, Math.min(1, (playerPos.y - minH) / range));
                              gaugeFill.style.height = (normalizedPos * 100) + '%';
                              gaugeMarker.style.top = ((1 - normalizedPos) * 100) + '%';
                              gaugeVal.textContent = (isOcean ? '-' : '') + Math.abs(parseInt(altitude)) + 'm';
                              // Color based on danger zone
                              if (isOcean && playerPos.y < -12) {
                                gaugeFill.style.background = 'linear-gradient(to top, #dc2626, #ef4444)';
                              } else if (isOcean && playerPos.y < -5) {
                                gaugeFill.style.background = 'linear-gradient(to top, #0369a1, #0284c7)';
                              } else if (isGas && playerPos.y < -8) {
                                gaugeFill.style.background = 'linear-gradient(to top, #dc2626, #f97316)';
                              }
                            }

                            // ── POI Direction Arrow Update ──
                            var poiArrowEl = document.getElementById('poi-arrow');
                            var poiArrowIcon = document.getElementById('poi-arrow-icon');
                            var poiArrowLabel = document.getElementById('poi-arrow-label');
                            if (poiArrowEl && pois.length > 0) {
                              var nearestPOI = null, nearestPOIDist = 999, nearestPOIIdx = -1;
                              for (var np = 0; np < pois.length; np++) {
                                if (discoveredPOIs[np]) continue;
                                var npDist = Math.sqrt(Math.pow(playerPos.x - pois[np].x, 2) + Math.pow(playerPos.z - pois[np].z, 2));
                                if (npDist < nearestPOIDist) {
                                  nearestPOIDist = npDist;
                                  nearestPOI = pois[np];
                                  nearestPOIIdx = np;
                                }
                              }
                              if (nearestPOI && nearestPOIDist > 4) {
                                poiArrowEl.style.opacity = '1';
                                // Calculate angle from player to POI
                                var poiAngle = Math.atan2(nearestPOI.x - playerPos.x, -(nearestPOI.z - playerPos.z));
                                var relAngle = poiAngle - yaw; // relative to player facing direction
                                if (poiArrowIcon) poiArrowIcon.style.transform = 'rotate(' + (relAngle * 180 / Math.PI) + 'deg)';
                                if (poiArrowLabel) poiArrowLabel.textContent = '\uD83D\uDD2D ' + Math.round(nearestPOIDist * scaleFactor) + 'm';
                              } else {
                                poiArrowEl.style.opacity = Object.keys(discoveredPOIs).length >= totalPOIs ? '0' : (nearestPOIDist <= 4 ? '0' : '0.3');
                              }
                            }

                            // Atmospheric science HUD (gas giants only)
                            if (isGas && gasAtmo) {
                              var curZone = gasAtmo.getZone(playerPos.y);
                              var zoneEl = document.getElementById('hud-zone');
                              var pressEl = document.getElementById('hud-pressure');
                              var ztempEl = document.getElementById('hud-zonetemp');
                              var windEl = document.getElementById('hud-wind');
                              var gasesEl = document.getElementById('hud-gases');
                              var shieldEl = document.getElementById('hud-shield');
                              var samplesEl = document.getElementById('hud-samples');
                              if (zoneEl) zoneEl.textContent = curZone.name;
                              if (pressEl) pressEl.textContent = curZone.pressure;
                              if (ztempEl) ztempEl.textContent = curZone.temp;
                              if (windEl) windEl.textContent = curZone.windSpeed + ' km/h';
                              if (gasesEl) gasesEl.textContent = curZone.gases.join(', ');
                              if (shieldEl) {
                                shieldEl.textContent = Math.round(gasShieldHP) + '%';
                                shieldEl.style.color = gasShieldHP > 60 ? '#22c55e' : gasShieldHP > 30 ? '#f59e0b' : '#ef4444';
                              }
                              if (samplesEl) samplesEl.textContent = gasSamples.length + ' / ' + gasAtmo.sampleOrbs.length;
                              var depthRecEl = document.getElementById('hud-depth-record');
                              var zonesVisEl = document.getElementById('hud-zones-visited');
                              if (depthRecEl) depthRecEl.textContent = Math.round(gasAtmo.depthRecord || 0) + ' m';
                              if (zonesVisEl) zonesVisEl.textContent = Object.keys(gasAtmo.zonesVisited || {}).length + ' / 5';

                              // Dynamic warning overlay
                              if (gasWarningTimer > 0 && hazardEl) {
                                hazardEl.textContent = gasWarningText;
                                hazardEl.style.opacity = '1';
                                hazardEl.style.background = gasShieldHP < 30 ? 'rgba(220,38,38,0.9)' : 'rgba(245,158,11,0.85)';
                              }

                              // Show proximity hint when near a sample orb
                              var nearestOrb = null; var nearestDist = 999;
                              gasAtmo.sampleOrbs.forEach(function(orb) {
                                if (orb._collected) return;
                                var d2 = playerPos.distanceTo(orb.position);
                                if (d2 < nearestDist) { nearestDist = d2; nearestOrb = orb; }
                              });
                              var proxEl = document.getElementById('hud-sample-prox');
                              if (!proxEl && nearestDist < 4) {
                                proxEl = document.createElement('div');
                                proxEl.id = 'hud-sample-prox';
                                proxEl.style.cssText = 'position:absolute;bottom:60px;left:50%;transform:translateX(-50%);background:rgba(251,191,36,0.9);backdrop-filter:blur(4px);color:#000;font-weight:bold;font-size:13px;padding:8px 18px;border-radius:10px;z-index:20;text-align:center;pointer-events:none;transition:opacity 0.3s';
                                canvasEl.parentElement.appendChild(proxEl);
                              }
                              if (proxEl) {
                                if (nearestDist < 4 && nearestOrb) {
                                  var sd = nearestOrb._sampleData;
                                  proxEl.textContent = sd.icon + ' ' + sd.name + ' detected! ' + (nearestDist < 2 ? 'Press F to collect' : 'Get closer... (' + nearestDist.toFixed(1) + 'm)');
                                  proxEl.style.opacity = '1';
                                } else {
                                  proxEl.style.opacity = '0';
                                }
                              }
                            }

                          }



                          // â"€â"€ Update Goal Line Dynamic Vertex â"€â"€

                          if (navChallengeActive && navGoalLine) {

                            var pts = [new THREE.Vector3(playerPos.x, isFluid ? playerPos.y - 0.5 : 0.5, playerPos.z), new THREE.Vector3(navTargetX, isOcean ? -8 : isGas ? 4 : 0.5, navTargetZ)];

                            navGoalLine.geometry.setFromPoints(pts);

                            navGoalLine.computeLineDistances();

                          }



                          // â"€â"€ POI proximity detection (every 10 frames) â"€â"€

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



                          // â"€â"€ Feature updates (trail, nav, plotter, badges) â"€â"€

                          if (tick3d % 5 === 0) updateTrail();

                          if (tick3d % 10 === 0) { checkNavCompletion(); checkBadges(); }

                          // Scanner + photo cooldowns
                          if (scannerCooldown > 0) scannerCooldown--;
                          if (_photoCooldown > 0) _photoCooldown--;

                          // Pluto geyser particle animation
                          if (typeof geyserMesh !== 'undefined' && geyserMesh) {
                            var gArr = geyserMesh.geometry.attributes.position.array;
                            for (var gai = 0; gai < gArr.length; gai += 3) {
                              gArr[gai + 1] += 0.03;
                              gArr[gai] += (Math.random() - 0.5) * 0.03;
                              gArr[gai + 2] += (Math.random() - 0.5) * 0.03;
                              if (gArr[gai + 1] > 20) {
                                gArr[gai] = gArr[gai] - (Math.random() - 0.5) * 0.5;
                                gArr[gai + 1] = 5 + Math.random() * 2;
                              }
                            }
                            geyserMesh.geometry.attributes.position.needsUpdate = true;
                          }

                          // ── 3D POI Labels: billboard toward camera + proximity fade ──
                          if (typeof poiLabelMeshes !== 'undefined' && poiLabelMeshes.length > 0 && tick3d % 2 === 0) {
                            poiLabelMeshes.forEach(function(lm) {
                              // Always face camera
                              lm.lookAt(camera.position);
                              // Fade based on distance — visible when close, transparent when far
                              var lDist = playerPos.distanceTo(lm.position);
                              if (lDist < 20) {
                                lm.material.opacity = Math.min(0.9, 0.9 - (lDist - 5) * 0.04);
                              } else {
                                lm.material.opacity = Math.max(0, 0.3 - (lDist - 20) * 0.01);
                              }
                              // Dim discovered POIs
                              if (discoveredPOIs[lm._poiLabelIdx]) {
                                lm.material.opacity *= 0.4;
                              }
                            });
                          }

                          // ── Contextual HUD: auto-show telemetry near POIs/hazards ──
                          if (tick3d % 15 === 0 && hud) {
                            var nearestDist = 999;
                            for (var ch = 0; ch < pois.length; ch++) {
                              var chDist = Math.sqrt(Math.pow(playerPos.x - pois[ch].x, 2) + Math.pow(playerPos.z - pois[ch].z, 2));
                              if (chDist < nearestDist) nearestDist = chDist;
                            }
                            // Show full HUD when near a POI or in a hazard zone
                            var inHazard = (isGas && gasAtmo && gasAtmo.getZone(playerPos.y).hazard) ||
                                           (isOcean && oceanAtmo && oceanAtmo.getZone(playerPos.y).hazard);
                            var showFull = nearestDist < 8 || inHazard;
                            // Toggle extended rows visibility
                            var extRows = hud.querySelectorAll('[data-hud-ext]');
                            extRows.forEach(function(row) {
                              row.style.display = showFull ? 'block' : 'none';
                            });
                            // Pulse HUD border when near discovery
                            if (nearestDist < 5 && !discoveredPOIs[pois.indexOf(pois.find(function(p) { return Math.sqrt(Math.pow(playerPos.x - p.x, 2) + Math.pow(playerPos.z - p.z, 2)) < 5; }))]) {
                              hud.style.borderColor = 'rgba(251,191,36,0.6)';
                            } else if (inHazard) {
                              hud.style.borderColor = 'rgba(239,68,68,0.5)';
                            } else {
                              hud.style.borderColor = 'rgba(56,189,248,0.3)';
                            }
                          }

                          // ── Mini-Map Radar Rendering (every 5 frames) ──
                          if (tick3d % 5 === 0 && mmCtx) {
                            var mmW = 120, mmH = 120, mmCx = 60, mmCy = 60;
                            var mmScale = 1.8; // world units per pixel
                            mmCtx.clearRect(0, 0, mmW, mmH);
                            // Background
                            mmCtx.fillStyle = isOcean ? 'rgba(4,24,48,0.85)' : 'rgba(10,10,20,0.85)';
                            mmCtx.beginPath();
                            mmCtx.arc(mmCx, mmCy, 58, 0, Math.PI * 2);
                            mmCtx.fill();
                            // Grid circles
                            mmCtx.strokeStyle = 'rgba(56,189,248,0.1)';
                            mmCtx.lineWidth = 0.5;
                            [20, 40].forEach(function(r) {
                              mmCtx.beginPath();
                              mmCtx.arc(mmCx, mmCy, r, 0, Math.PI * 2);
                              mmCtx.stroke();
                            });
                            // Grid crosshairs
                            mmCtx.beginPath();
                            mmCtx.moveTo(mmCx, mmCy - 55);
                            mmCtx.lineTo(mmCx, mmCy + 55);
                            mmCtx.moveTo(mmCx - 55, mmCy);
                            mmCtx.lineTo(mmCx + 55, mmCy);
                            mmCtx.stroke();
                            // POIs
                            pois.forEach(function(poi, pi4) {
                              var poiMX = mmCx + (poi.x - playerPos.x) / mmScale;
                              var poiMY = mmCy + (poi.z - playerPos.z) / mmScale;
                              if (Math.sqrt(Math.pow(poiMX - mmCx, 2) + Math.pow(poiMY - mmCy, 2)) < 56) {
                                mmCtx.fillStyle = discoveredPOIs[pi4] ? 'rgba(52,211,153,0.8)' : 'rgba(251,191,36,' + (0.5 + Math.sin(tick3d * 0.05 + pi4) * 0.3) + ')';
                                mmCtx.beginPath();
                                mmCtx.arc(poiMX, poiMY, discoveredPOIs[pi4] ? 2 : 3, 0, Math.PI * 2);
                                mmCtx.fill();
                              }
                            });
                            // Beacons
                            beacons.forEach(function(bc) {
                              var bcMX = mmCx + (bc.x - playerPos.x) / mmScale;
                              var bcMY = mmCy + (bc.z - playerPos.z) / mmScale;
                              if (Math.sqrt(Math.pow(bcMX - mmCx, 2) + Math.pow(bcMY - mmCy, 2)) < 56) {
                                mmCtx.fillStyle = '#' + bc.color.toString(16).padStart(6, '0');
                                mmCtx.globalAlpha = 0.6;
                                mmCtx.beginPath();
                                mmCtx.arc(bcMX, bcMY, 2, 0, Math.PI * 2);
                                mmCtx.fill();
                                mmCtx.globalAlpha = 1;
                              }
                            });
                            // Nav target
                            if (navChallengeActive) {
                              var ntMX = mmCx + (navTargetX - playerPos.x) / mmScale;
                              var ntMY = mmCy + (navTargetZ - playerPos.z) / mmScale;
                              mmCtx.fillStyle = '#a78bfa';
                              mmCtx.beginPath();
                              mmCtx.arc(ntMX, ntMY, 3, 0, Math.PI * 2);
                              mmCtx.fill();
                            }
                            // Player (center, with heading indicator)
                            mmCtx.save();
                            mmCtx.translate(mmCx, mmCy);
                            mmCtx.rotate(-yaw);
                            mmCtx.fillStyle = '#38bdf8';
                            mmCtx.beginPath();
                            mmCtx.moveTo(0, -5);
                            mmCtx.lineTo(-3, 3);
                            mmCtx.lineTo(3, 3);
                            mmCtx.closePath();
                            mmCtx.fill();
                            // FOV cone
                            mmCtx.fillStyle = 'rgba(56,189,248,0.08)';
                            mmCtx.beginPath();
                            mmCtx.moveTo(0, 0);
                            mmCtx.lineTo(-25, -50);
                            mmCtx.lineTo(25, -50);
                            mmCtx.closePath();
                            mmCtx.fill();
                            mmCtx.restore();
                            // N/S/E/W labels
                            mmCtx.font = '7px system-ui';
                            mmCtx.fillStyle = 'rgba(148,163,184,0.5)';
                            mmCtx.textAlign = 'center';
                            mmCtx.fillText('N', mmCx, 10);
                            mmCtx.fillText('S', mmCx, mmH - 4);
                            mmCtx.fillText('E', mmW - 5, mmCy + 3);
                            mmCtx.fillText('W', 6, mmCy + 3);
                          }

                          // ── Screen Effects Update (every 30 frames) ──
                          if (tick3d % 30 === 0) {
                            var depthTint = document.getElementById('depth-tint-fx');
                            if (depthTint) {
                              if (isOcean) {
                                var oceanDepthFactor = Math.max(0, -playerPos.y / 25);
                                depthTint.style.background = 'rgba(0,10,30,' + (oceanDepthFactor * 0.3) + ')';
                              } else if (isGas) {
                                var gasDepthFactor = Math.max(0, -playerPos.y / 20);
                                depthTint.style.background = 'rgba(40,20,0,' + (gasDepthFactor * 0.25) + ')';
                              } else {
                                depthTint.style.background = 'transparent';
                              }
                            }
                          }

                          // Pulse beacon lights

                          beaconMeshes.forEach(function (bm) { bm.light.material.opacity = 0.5 + Math.abs(Math.sin(tick3d * 0.05)) * 0.5; });

                          // Pulse nav target

                          if (navTargetMesh) { navTargetMesh.material.opacity = 0.2 + Math.abs(Math.sin(tick3d * 0.08)) * 0.5; navTargetMesh.rotation.y = tick3d * 0.02; }



                          // â"€â"€ Pulse POI markers (animate opacity) â"€â"€

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



                          // â"€â"€ Update rover/probe model position â"€â"€

                          roverGroup.position.x = playerPos.x;

                          roverGroup.position.z = playerPos.z;

                          if (!isFluid) {

                            roverGroup.position.y = _terrainHeightAt(playerPos.x, playerPos.z); // wheels follow terrain

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

                          // General cleanup
                          var sonarPanel = document.getElementById('hud-sonar');
                          if (sonarPanel && sonarPanel.parentElement) sonarPanel.parentElement.removeChild(sonarPanel);
                          var oceanInv = document.getElementById('ocean-sample-inventory');
                          if (oceanInv && oceanInv.parentElement) oceanInv.parentElement.removeChild(oceanInv);
                          var sampleProx = document.getElementById('hud-sample-prox');
                          if (sampleProx && sampleProx.parentElement) sampleProx.parentElement.removeChild(sampleProx);
                          if (depthGauge && depthGauge.parentElement) depthGauge.parentElement.removeChild(depthGauge);
                          var poiArrowClean = document.getElementById('poi-arrow');
                          if (poiArrowClean && poiArrowClean.parentElement) poiArrowClean.parentElement.removeChild(poiArrowClean);
                          if (miniMap && miniMap.parentElement) miniMap.parentElement.removeChild(miniMap);
                          if (screenFx && screenFx.parentElement) screenFx.parentElement.removeChild(screenFx);
                          if (soundDesc && soundDesc.parentElement) soundDesc.parentElement.removeChild(soundDesc);
                          if (scannerOverlay && scannerOverlay.parentElement) scannerOverlay.parentElement.removeChild(scannerOverlay);
                          if (descentOverlay && descentOverlay.parentElement) descentOverlay.parentElement.removeChild(descentOverlay);
                          clearInterval(soundTimer);

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

                  // ═══ POE (Predict-Observe-Explain) Prompt ═══
                  sel && POE_PROMPTS[sel.name] && !d['poe_seen_' + sel.name] && React.createElement("div", {
                    className: "mt-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-300 shadow-sm"
                  },
                    React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                      React.createElement("span", { className: "text-lg" }, "\uD83E\uDD14"),
                      React.createElement("span", { className: "text-xs font-black text-amber-800 tracking-wide" }, "PREDICT BEFORE YOU EXPLORE")),
                    React.createElement("p", { className: "text-sm text-amber-900 font-medium mb-3" }, POE_PROMPTS[sel.name].predict),
                    React.createElement("div", { className: "flex gap-2" },
                      React.createElement("button", {
                        onClick: function() { upd('poe_seen_' + sel.name, 'predicted'); var seen = (d.poeSeen || []).concat([sel.name]); upd('poeSeen', seen); },
                        className: "flex-1 px-3 py-2 text-xs font-bold rounded-lg bg-amber-700 text-white hover:bg-amber-600 transition-all"
                      }, "\uD83D\uDCDD I have a prediction!"),
                      React.createElement("button", {
                        onClick: function() { upd('poe_seen_' + sel.name, 'skipped'); var seen = (d.poeSeen || []).concat([sel.name]); upd('poeSeen', seen); },
                        className: "px-3 py-2 text-xs font-bold rounded-lg bg-white text-amber-700 border border-amber-300 hover:bg-amber-50 transition-all"
                      }, "Skip for now"))
                  ),

                  // POE Reveal (after exploring, show the answer)
                  sel && POE_PROMPTS[sel.name] && d['poe_seen_' + sel.name] === 'predicted' && !d['poe_revealed_' + sel.name] && React.createElement("div", {
                    className: "mt-2 bg-emerald-50 rounded-xl p-3 border border-emerald-200"
                  },
                    React.createElement("p", { className: "text-xs font-bold text-emerald-700 mb-1" }, "\uD83D\uDD0D Ready to check your prediction?"),
                    React.createElement("button", {
                      onClick: function() { upd('poe_revealed_' + sel.name, true); },
                      className: "px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 transition-all"
                    }, "\u2705 Reveal the answer")
                  ),

                  sel && POE_PROMPTS[sel.name] && d['poe_revealed_' + sel.name] && React.createElement("div", {
                    className: "mt-2 bg-emerald-50 rounded-xl p-3 border border-emerald-300"
                  },
                    React.createElement("p", { className: "text-xs font-bold text-emerald-800 mb-1" }, "\uD83D\uDCA1 " + POE_PROMPTS[sel.name].concept.toUpperCase()),
                    React.createElement("p", { className: "text-xs text-emerald-700 leading-relaxed" }, POE_PROMPTS[sel.name].reveal),
                    VOCAB[POE_PROMPTS[sel.name].concept] && React.createElement("div", { className: "mt-2 bg-white rounded-lg p-2 border border-emerald-100" },
                      React.createElement("span", { className: "text-[9px] font-black text-emerald-600" }, "\uD83D\uDCD6 VOCABULARY: "),
                      React.createElement("span", { className: "text-[10px] font-bold text-slate-700" }, POE_PROMPTS[sel.name].concept),
                      React.createElement("span", { className: "text-[10px] text-slate-500" }, ' \u2014 ' + VOCAB[POE_PROMPTS[sel.name].concept].def))
                  ),

                  // ═══ Misconception Checkpoint ═══
                  (function() {
                    var mcTrigger = sel ? sel.name : 'overview';
                    var relevantMC = MISCONCEPTIONS.filter(function(mc) { return mc.trigger === mcTrigger && (d.misconceptionsSeen || []).indexOf(mc.statement) === -1; });
                    if (relevantMC.length === 0) return null;
                    var mc = relevantMC[0];
                    if (d['mc_answered_' + mcTrigger]) return null;
                    return React.createElement("div", { className: "mt-3 bg-purple-50 rounded-xl p-3 border border-purple-200" },
                      React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                        React.createElement("span", { className: "text-sm" }, "\u2753"),
                        React.createElement("span", { className: "text-[10px] font-black text-purple-700 tracking-wide" }, "TRUE OR FALSE?")),
                      React.createElement("p", { className: "text-xs font-bold text-purple-900 mb-2" }, '"' + mc.statement + '"'),
                      !d['mc_choice_' + mcTrigger] ? React.createElement("div", { className: "flex gap-2" },
                        React.createElement("button", { onClick: function() { upd('mc_choice_' + mcTrigger, true); upd('mc_answered_' + mcTrigger, mc.answer === true); }, className: "flex-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200 transition-all" }, "\u2705 True"),
                        React.createElement("button", { onClick: function() { upd('mc_choice_' + mcTrigger, false); upd('mc_answered_' + mcTrigger, mc.answer === false); }, className: "flex-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-all" }, "\u274C False")
                      ) : React.createElement("div", null,
                        React.createElement("p", { className: "text-xs font-bold " + (d['mc_choice_' + mcTrigger] === mc.answer ? 'text-emerald-600' : 'text-red-600') }, d['mc_choice_' + mcTrigger] === mc.answer ? '\u2705 Correct!' : '\u274C Not quite!'),
                        React.createElement("p", { className: "text-xs text-purple-700 mt-1 leading-relaxed" }, mc.explanation),
                        React.createElement("button", { onClick: function() { upd('mc_answered_' + mcTrigger, true); upd('misconceptionsSeen', (d.misconceptionsSeen || []).concat([mc.statement])); }, className: "mt-2 px-3 py-1 text-[10px] font-bold rounded bg-purple-200 text-purple-700 hover:bg-purple-300" }, "Got it \u2192"))
                    );
                  })(),

                  // ═══ Science Concept Cards ═══
                  sel && React.createElement("div", { className: "mt-3" },
                    Object.keys(CONCEPT_CARDS).filter(function(k) { return CONCEPT_CARDS[k].planets.indexOf(sel.name) !== -1; }).map(function(k) {
                      var card = CONCEPT_CARDS[k];
                      return React.createElement("div", { key: k, className: "mb-2" },
                        React.createElement("button", {
                          onClick: function() { upd('showConcept_' + k, !d['showConcept_' + k]); },
                          className: "w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all hover:shadow-sm",
                          style: { borderColor: card.color + '60', color: card.color, backgroundColor: card.color + '10' }
                        }, React.createElement("span", null, card.icon), card.title, React.createElement("span", { className: "ml-auto text-[10px]" }, d['showConcept_' + k] ? '\u25B2' : '\u25BC')),
                        d['showConcept_' + k] && React.createElement("div", {
                          className: "mt-1 p-3 rounded-lg border text-xs text-slate-700 leading-relaxed",
                          style: { borderColor: card.color + '30', backgroundColor: card.color + '08' }
                        }, card.content)
                      );
                    })
                  ),

                  // â"€â"€ Quiz Mode (Enhanced with Error-Correcting Feedback) â"€â"€

                  React.createElement("div", { className: "mt-4 border-t border-slate-200 pt-3" },

                    React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                      React.createElement("button", { "aria-label": "Start solar system quiz",
                        onClick: () => {
                          // Use QUIZ_BANK for richer feedback; avoid repeating recently asked questions
                          var asked = d.quizAsked || [];
                          var available = QUIZ_BANK.filter(function(q2) { return asked.indexOf(q2.q) === -1; });
                          if (available.length === 0) { available = QUIZ_BANK; asked = []; }
                          var q = available[Math.floor(Math.random() * available.length)];
                          upd('quiz', Object.assign({}, q, { answered: false, correct: null, chosen: null, score: d.quiz ? d.quiz.score : 0, streak: d.quiz ? d.quiz.streak : 0 }));
                          upd('quizAsked', asked.concat([q.q]));
                        }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.quiz ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600 text-white') + " hover:opacity-90 transition-all"
                      }, d.quiz ? "\uD83D\uDD04 Next Question" : "\uD83E\uDDE0 Quiz Mode"),

                      d.quiz && d.quiz.score > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, "\u2B50 " + d.quiz.score + " correct | \uD83D\uDD25 " + d.quiz.streak + " streak"),

                      React.createElement("span", { className: "ml-auto text-[9px] text-slate-400" }, (d.quizAsked || []).length + '/' + QUIZ_BANK.length + ' asked')

                    ),

                    d.quiz && React.createElement("div", { className: "bg-indigo-50 rounded-xl p-4 border border-indigo-200" },

                      d.quiz.concept && React.createElement("div", { className: "text-[9px] font-bold text-indigo-400 mb-1 tracking-wider" }, '\uD83C\uDFAF CONCEPT: ' + d.quiz.concept.toUpperCase()),

                      React.createElement("p", { className: "text-sm font-bold text-indigo-800 mb-3" }, d.quiz.q),

                      React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                        d.quiz.opts.map(function (opt) {

                          var isCorrect = opt === d.quiz.a;

                          var wasChosen = d.quiz.chosen === opt;

                          var cls = !d.quiz.answered ? 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50' : isCorrect ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : wasChosen && !isCorrect ? 'bg-red-100 text-red-800 border-red-300' : 'bg-slate-50 text-slate-500 border-slate-200';

                          return React.createElement("button", { "aria-label": "Select answer: " + opt,

                            key: opt, disabled: d.quiz.answered, onClick: function () {

                              var correct = opt === d.quiz.a;

                              upd('quiz', Object.assign({}, d.quiz, { answered: true, correct: correct, chosen: opt, score: d.quiz.score + (correct ? 1 : 0), streak: correct ? d.quiz.streak + 1 : 0 }));

                              if (correct) { addToast('\u2705 Correct! ' + d.quiz.tip, 'success'); playQuizCorrect(); if (typeof announceToSR === 'function') announceToSR('Correct! ' + d.quiz.tip); }
                              else { playQuizWrong(); if (typeof announceToSR === 'function') announceToSR('Incorrect. The answer is ' + d.quiz.a); }

                            }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all " + cls

                          }, opt);

                        })

                      ),

                      // Error-correcting feedback: explain WHY wrong answer is wrong
                      d.quiz.answered && !d.quiz.correct && d.quiz.wrongFeedback && d.quiz.wrongFeedback[d.quiz.chosen] && React.createElement("div", { className: "mt-3 bg-red-50 rounded-lg p-3 border border-red-200" },
                        React.createElement("p", { className: "text-xs font-bold text-red-700 mb-1" }, "\u274C Why \"" + d.quiz.chosen + "\" isn\u2019t right:"),
                        React.createElement("p", { className: "text-xs text-red-600 leading-relaxed" }, d.quiz.wrongFeedback[d.quiz.chosen]),
                        React.createElement("p", { className: "text-xs font-bold text-emerald-600 mt-2" }, "\u2705 The answer is " + d.quiz.a + ": " + d.quiz.tip),
                        // Link to vocabulary if concept matches
                        d.quiz.concept && VOCAB[d.quiz.concept] && React.createElement("div", { className: "mt-2 bg-white rounded p-2 border border-slate-100" },
                          React.createElement("span", { className: "text-[9px] font-black text-indigo-500" }, "\uD83D\uDCD6 "),
                          React.createElement("span", { className: "text-[10px] font-bold text-slate-700" }, d.quiz.concept + ': '),
                          React.createElement("span", { className: "text-[10px] text-slate-500" }, VOCAB[d.quiz.concept].def))
                      ),

                      d.quiz.answered && d.quiz.correct && React.createElement("p", { className: "mt-2 text-xs text-emerald-600 italic" }, "\uD83D\uDCA1 " + d.quiz.tip)

                    ),

                    // â"€â"€ Planet Comparison â"€â"€

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
                  React.createElement("button", { "aria-label": "Toggle moon explorer panel",
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
                      React.createElement("button", { "aria-label": "Listen",
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
                  React.createElement("button", { "aria-label": "Toggle night sky view",
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
                  React.createElement("button", { "aria-label": "Toggle atmosphere descent simulator",
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
                      onChange: function(e) { var alt = parseInt(e.target.value); upd('descentAlt', alt); playDescentTick(alt); },
                      className: "w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer",
                      style: { direction: 'rtl' } // 100 = top, 0 = bottom
                    }),
                    React.createElement("div", { className: "flex justify-between text-[11px] " + (isDark ? 'text-slate-400' : 'text-slate-500') },
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
                  React.createElement("button", { "aria-label": "Toggle planet size comparison",
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
                      React.createElement("span", { className: "text-[11px] w-14 " + (isDark ? 'text-slate-400' : 'text-slate-500') }, (PLANET_RADII[p.name] || '?').toLocaleString() + ' km')
                    );
                  })
                )
              ),

              // === ORBITAL MECHANICS MINI-LESSON ===
              React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-purple-50 border-purple-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-purple-300' : 'text-purple-700') }, "\uD83C\uDF0C Orbital Mechanics"),
                  React.createElement("button", { "aria-label": "Keplers Three Laws of Planetary Motion",
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
                        React.createElement("span", { className: "text-[11px] w-14 text-right " + (isSel2 ? 'font-bold ' : '') + (isDark ? 'text-slate-400' : 'text-slate-500') }, p.emoji + ' ' + p.name),
                        React.createElement("div", { className: "flex-1 h-2 " + (isDark ? 'bg-slate-700' : 'bg-purple-100') + " rounded-full overflow-hidden" },
                          React.createElement("div", {
                            className: "h-full rounded-full",
                            style: { width: speedPct + '%', background: 'linear-gradient(to right, #8b5cf6, #a78bfa)', opacity: isSel2 ? 1 : 0.5 }
                          })
                        ),
                        React.createElement("span", { className: "text-[11px] w-12 " + (isDark ? 'text-slate-400' : 'text-slate-500') }, (p.speed * 29.78).toFixed(1) + ' km/s')
                      );
                    })
                  )
                )
              ),

              // === PLANET BUILDER ===
              React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-pink-300' : 'text-pink-700') }, "\uD83C\uDFD7 Planet Builder"),
                  React.createElement("button", { "aria-label": "Design your own hypothetical planet!",
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
                  React.createElement("button", { "aria-label": "Toggle exoplanet comparison panel",
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
                        React.createElement("span", { className: "text-[11px] px-1.5 py-0.5 rounded-full " + (exo.habitable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600') }, exo.habitable ? 'Habitable zone' : 'Not habitable')
                      ),
                      React.createElement("div", { className: "grid grid-cols-3 gap-1 text-[11px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " mt-1" },
                        React.createElement("span", null, "\uD83D\uDCCD " + exo.dist),
                        React.createElement("span", null, "\u2696 " + exo.mass),
                        React.createElement("span", null, "\uD83C\uDF21 " + exo.temp)
                      ),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-teal-400' : 'text-teal-600') + " mt-1 italic" }, exo.note)
                    );
                  })
                )
              ),

              // === "WHAT IF?" SCENARIOS ===
              sel && WHAT_IF[sel.name] && React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-yellow-50 border-yellow-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-yellow-300' : 'text-yellow-700') }, "\uD83E\uDD14 What If? \u2014 " + sel.name),
                  React.createElement("button", { "aria-label": "Toggle What If scenarios panel",
                    onClick: function() { upd('showWhatIf', !d.showWhatIf); },
                    className: "text-[10px] text-yellow-500 hover:text-yellow-700"
                  }, d.showWhatIf ? 'Hide' : 'Think \u2192')
                ),
                d.showWhatIf && React.createElement("div", { className: "space-y-2" },
                  (WHAT_IF[sel.name] || []).map(function(wi, wii) {
                    return React.createElement("div", { key: wii, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-yellow-100') + " rounded-lg p-2.5 border" },
                      React.createElement("div", { className: "text-[10px] font-bold " + (isDark ? 'text-yellow-200' : 'text-yellow-800') + " mb-1" }, "\u2753 " + wi.q),
                      React.createElement("div", { className: "text-[10px] " + (isDark ? 'text-slate-300' : 'text-slate-600') }, wi.a),
                      React.createElement("button", { "aria-label": "Listen",
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
                  React.createElement("button", { "aria-label": "Toggle space exploration timeline",
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
                  React.createElement("button", { "aria-label": "Toggle Hohmann transfer calculator",
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
                    React.createElement("div", { className: "mt-2 text-[11px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " italic" },
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
                  React.createElement("button", { "aria-label": "Toggle escape velocity comparison",
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
                      React.createElement("span", { className: "text-[11px] w-14 font-mono " + (isDark ? 'text-slate-400' : 'text-slate-500') }, ev + ' km/s')
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
                React.createElement("button", { "aria-label": "Calculate for all planets",
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
                  React.createElement("button", { "aria-label": "Ask Space Tutor",
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
                    return React.createElement("button", { "aria-label": "Read aloud", key: qi, onClick: function() { askSpaceTutor(q); }, className: "text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors" }, q);
                  })
                ),
                d.aiAnswer && React.createElement("div", { className: "bg-white rounded-lg p-2 text-xs text-slate-700 border border-violet-100 relative" },
                  React.createElement("div", null, d.aiAnswer),
                  React.createElement("button", { "aria-label": "Read aloud",
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
                  React.createElement("button", { "aria-label": "No entries yet. Start exploring!",
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
              !d.tutorialDismissed && React.createElement("div", { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
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
                  React.createElement("button", { "aria-label": "Start Exploring!",
                    onClick: function() { upd('tutorialDismissed', true); playBeep(); },
                    className: "mt-4 w-full py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg"
                  }, "\uD83D\uDE80 Start Exploring!")
                )
              ),

              // ═══ PEDAGOGICAL PANELS ═══

              // ── Learning Path Selector ──
              React.createElement("div", { className: "mt-4 border-t border-slate-200 pt-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-black text-slate-600" }, "\uD83D\uDDFA\uFE0F Learning Path"),
                  d.learningPath && React.createElement("span", { className: "text-[9px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold" }, d.learningPath)
                ),
                React.createElement("div", { className: "grid grid-cols-3 gap-2" },
                  Object.keys(LEARNING_PATHS).map(function(k) {
                    var lp = LEARNING_PATHS[k];
                    var active = d.learningPath === k;
                    return React.createElement("button", { key: k, onClick: function() { upd('learningPath', active ? null : k); },
                      className: "p-2 rounded-lg border text-left transition-all " + (active ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300')
                    },
                      React.createElement("div", { className: "text-sm mb-0.5" }, lp.icon),
                      React.createElement("div", { className: "text-[10px] font-bold " + (active ? 'text-indigo-700' : 'text-slate-700') }, lp.name),
                      React.createElement("div", { className: "text-[9px] text-slate-400" }, lp.desc)
                    );
                  })
                ),
                // Show steps for active path
                d.learningPath && LEARNING_PATHS[d.learningPath] && React.createElement("div", { className: "mt-2 bg-indigo-50 rounded-lg p-3 border border-indigo-100" },
                  LEARNING_PATHS[d.learningPath].steps.map(function(step, si2) {
                    return React.createElement("div", { key: si2, className: "flex items-start gap-2 mb-1" },
                      React.createElement("span", { className: "text-[10px] font-bold text-indigo-400 mt-0.5" }, (si2 + 1) + '.'),
                      React.createElement("span", { className: "text-[10px] text-slate-600" }, step)
                    );
                  })
                )
              ),

              // ── Field Journal ──
              React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-black text-slate-600" }, "\uD83D\uDCD3 Field Journal"),
                  React.createElement("span", { className: "text-[9px] text-slate-400" }, journalEntries.length + ' entries')
                ),
                React.createElement("button", {
                  onClick: function() { upd('showJournal', !d.showJournal); },
                  className: "w-full px-3 py-1.5 text-xs font-bold rounded-lg " + (d.showJournal ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-amber-700 text-white hover:bg-amber-600') + " transition-all"
                }, d.showJournal ? 'Close Journal' : (sel ? 'Write about ' + sel.name : 'Open Journal')),
                d.showJournal && React.createElement("div", { className: "mt-2 space-y-2" },
                  // New entry form
                  sel && React.createElement("div", { className: "bg-amber-50 rounded-lg p-3 border border-amber-200 space-y-2" },
                    React.createElement("div", { className: "text-[10px] font-bold text-amber-800" }, "\uD83D\uDCDD New Entry: " + sel.name),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[9px] font-bold text-amber-600 block mb-0.5" }, "What I predicted:"),
                      React.createElement("textarea", { id: 'journal-predict', rows: 2, placeholder: "Before exploring, I thought...", className: "w-full text-[10px] p-2 rounded border border-amber-200 resize-none", style: { fontSize: '11px' } })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[9px] font-bold text-amber-600 block mb-0.5" }, "What I observed:"),
                      React.createElement("textarea", { id: 'journal-observe', rows: 2, placeholder: "I noticed that...", className: "w-full text-[10px] p-2 rounded border border-amber-200 resize-none", style: { fontSize: '11px' } })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[9px] font-bold text-amber-600 block mb-0.5" }, "What surprised me:"),
                      React.createElement("textarea", { id: 'journal-surprise', rows: 1, placeholder: "I was surprised that...", className: "w-full text-[10px] p-2 rounded border border-amber-200 resize-none", style: { fontSize: '11px' } })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[9px] font-bold text-amber-600 block mb-0.5" }, "One question I still have:"),
                      React.createElement("textarea", { id: 'journal-question', rows: 1, placeholder: "I wonder...", className: "w-full text-[10px] p-2 rounded border border-amber-200 resize-none", style: { fontSize: '11px' } })
                    ),
                    React.createElement("button", {
                      onClick: function() {
                        var p1 = document.getElementById('journal-predict'); var p2 = document.getElementById('journal-observe');
                        var p3 = document.getElementById('journal-surprise'); var p4 = document.getElementById('journal-question');
                        if (!p2 || !p2.value.trim()) { addToast('Please write at least an observation!', 'info'); return; }
                        addJournalEntry(sel.name, p1 ? p1.value : '', p2.value, p3 ? p3.value : '', p4 ? p4.value : '');
                        if (p1) p1.value = ''; p2.value = ''; if (p3) p3.value = ''; if (p4) p4.value = '';
                        if (awardStemXP) awardStemXP('solarSystem', 10);
                      },
                      className: "w-full px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-700 text-white hover:bg-amber-600 transition-all"
                    }, "\uD83D\uDCBE Save Entry (+10 XP)")
                  ),
                  // Previous entries
                  journalEntries.length > 0 && React.createElement("div", { className: "space-y-1" },
                    React.createElement("div", { className: "text-[9px] font-bold text-slate-400 mt-2" }, "Previous Entries:"),
                    journalEntries.slice().reverse().slice(0, 5).map(function(entry, ei) {
                      return React.createElement("div", { key: ei, className: "bg-white rounded-lg p-2 border border-slate-100 text-[10px]" },
                        React.createElement("div", { className: "flex justify-between items-center mb-1" },
                          React.createElement("span", { className: "font-bold text-slate-700" }, "\uD83C\uDF0D " + entry.planet),
                          React.createElement("span", { className: "text-[8px] text-slate-400" }, new Date(entry.timestamp).toLocaleDateString())
                        ),
                        entry.prediction && React.createElement("div", { className: "text-slate-500" }, "\uD83D\uDCDD " + entry.prediction),
                        React.createElement("div", { className: "text-slate-600" }, "\uD83D\uDD2D " + entry.observation),
                        entry.surprise && React.createElement("div", { className: "text-amber-600" }, "\u2757 " + entry.surprise),
                        entry.question && React.createElement("div", { className: "text-indigo-600" }, "\u2753 " + entry.question)
                      );
                    })
                  )
                )
              ),

              // ── Vocabulary Browser ──
              React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },
                React.createElement("button", {
                  onClick: function() { upd('showVocab', !d.showVocab); },
                  className: "flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                }, "\uD83D\uDCD6 Vocabulary Glossary (" + Object.keys(VOCAB).length + " terms)", React.createElement("span", { className: "text-[10px]" }, d.showVocab ? '\u25B2' : '\u25BC')),
                d.showVocab && React.createElement("div", { className: "mt-2 grid grid-cols-2 gap-1" },
                  Object.keys(VOCAB).sort().map(function(term) {
                    var v = VOCAB[term];
                    var looked = (d.vocabLookedUp || []).indexOf(term) !== -1;
                    return React.createElement("button", { key: term,
                      onClick: function() { upd('vocabSelected', d.vocabSelected === term ? null : term); if (!looked) upd('vocabLookedUp', (d.vocabLookedUp || []).concat([term])); },
                      className: "text-left p-1.5 rounded text-[10px] border transition-all " + (d.vocabSelected === term ? 'bg-indigo-50 border-indigo-300 font-bold text-indigo-700' : looked ? 'bg-emerald-50 border-emerald-100 text-slate-600' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200')
                    }, (looked ? '\u2705 ' : '') + term + (v.grade > 6 ? ' \u2B50' : ''));
                  })
                ),
                d.showVocab && d.vocabSelected && VOCAB[d.vocabSelected] && React.createElement("div", { className: "mt-2 bg-indigo-50 rounded-lg p-3 border border-indigo-200" },
                  React.createElement("div", { className: "text-xs font-bold text-indigo-800 mb-1" }, d.vocabSelected),
                  React.createElement("p", { className: "text-[10px] text-slate-600 leading-relaxed" }, VOCAB[d.vocabSelected].def),
                  React.createElement("div", { className: "text-[9px] text-slate-400 mt-1" }, "Grade level: " + VOCAB[d.vocabSelected].grade + "+")
                )
              ),

              // ── Assignment Mode ──
              React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },
                React.createElement("button", {
                  onClick: function() { upd('showAssignments', !d.showAssignments); },
                  className: "flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                }, "\uD83D\uDCCB Assignment Mode", React.createElement("span", { className: "text-[10px]" }, d.showAssignments ? '\u25B2' : '\u25BC')),
                d.showAssignments && React.createElement("div", { className: "mt-2 space-y-2" },
                  PRESET_ASSIGNMENTS.map(function(asn) {
                    var active = d.activeAssignment === asn.id;
                    var tasksDone = active ? (d['asn_done_' + asn.id] || []) : [];
                    return React.createElement("div", { key: asn.id, className: "rounded-lg border p-3 transition-all " + (active ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200') },
                      React.createElement("div", { className: "flex items-center justify-between mb-1" },
                        React.createElement("span", { className: "text-[10px] font-bold " + (active ? 'text-blue-700' : 'text-slate-700') }, asn.name),
                        React.createElement("span", { className: "text-[9px] text-slate-400" }, "Grades " + asn.gradeRange)
                      ),
                      React.createElement("div", { className: "space-y-1" },
                        asn.tasks.map(function(task, ti) {
                          var done = tasksDone.indexOf(ti) !== -1;
                          return React.createElement("div", { key: ti, className: "flex items-start gap-1.5" },
                            active && React.createElement("button", {
                              onClick: function() {
                                var updated = done ? tasksDone.filter(function(x) { return x !== ti; }) : tasksDone.concat([ti]);
                                upd('asn_done_' + asn.id, updated);
                                if (!done && updated.length === asn.tasks.length) { addToast('\uD83C\uDF89 Assignment complete: ' + asn.name + '!', 'success'); if (awardStemXP) awardStemXP('solarSystem', 25); }
                              },
                              className: "mt-0.5 w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[8px] " + (done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300')
                            }, done ? '\u2713' : ''),
                            React.createElement("span", { className: "text-[10px] " + (done ? 'text-slate-400 line-through' : 'text-slate-600') }, task)
                          );
                        })
                      ),
                      !active && React.createElement("button", {
                        onClick: function() { upd('activeAssignment', asn.id); },
                        className: "mt-2 w-full px-2 py-1 text-[10px] font-bold rounded bg-blue-500 text-white hover:bg-blue-600 transition-all"
                      }, "Start Assignment")
                    );
                  })
                )
              ),

              // ── Teacher Progress Export ──
              React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("button", {
                    onClick: exportProgressCSV,
                    className: "px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all"
                  }, "\uD83D\uDCCA Export Progress (CSV)"),
                  React.createElement("span", { className: "text-[9px] text-slate-400" }, "For teacher review")
                ),
                // Quick stats summary
                React.createElement("div", { className: "mt-2 grid grid-cols-4 gap-1" },
                  [
                    { label: 'Planets', value: planetsVisited.length + '/9', color: planetsVisited.length >= 9 ? '#22c55e' : '#64748b' },
                    { label: 'Quiz', value: (d.quiz ? d.quiz.score : 0) + '', color: (d.quiz && d.quiz.score >= 5) ? '#22c55e' : '#64748b' },
                    { label: 'Journal', value: journalEntries.length + '', color: journalEntries.length > 0 ? '#22c55e' : '#64748b' },
                    { label: 'Vocab', value: (d.vocabLookedUp || []).length + '/' + Object.keys(VOCAB).length, color: '#64748b' }
                  ].map(function(stat) {
                    return React.createElement("div", { key: stat.label, className: "text-center p-1.5 rounded bg-slate-50 border border-slate-100" },
                      React.createElement("div", { className: "text-sm font-bold", style: { color: stat.color } }, stat.value),
                      React.createElement("div", { className: "text-[8px] text-slate-400" }, stat.label)
                    );
                  })
                )
              ),

              React.createElement("button", { "aria-label": "Snapshot", onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ss-' + Date.now(), tool: 'solarSystem', label: sel ? sel.name : 'Solar System', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

            )

          );
      })();
    }
  });


})();

} // end dedup guard