// ═══════════════════════════════════════════
// stem_tool_ecosystem.js — Ecosystem Simulator Plugin (Enhanced v3)
// Predator-prey Lotka-Volterra canvas simulation with live population
// graph, phase portrait, food web diagram, day/night cycle, ambient
// creatures, event injection, sandbox mode, auto-observations,
// carrying capacity, pause/speed controls, quiz mode, 14 badges,
// AI tutor, TTS, grade-band content, sound effects & snapshots.
// Extracted & enhanced from monolith L6531-8578
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('ecosystem'))) {
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
    if (document.getElementById('allo-live-ecosystem')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-ecosystem';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ── Grade band helpers ──
  var getGradeBand = function(ctx) {
    var g = parseInt(ctx.gradeLevel, 10);
    if (isNaN(g) || g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  };

  var getGradeIntro = function(band) {
    if (band === 'k2') return 'Welcome! Watch the bunnies and foxes play in the meadow. Can you count how many there are?';
    if (band === 'g35') return 'Explore how predators and prey interact! Change the numbers and see what happens to the populations.';
    if (band === 'g68') return 'Investigate predator-prey dynamics using the Lotka\u2013Volterra model. Adjust birth and death rates to find equilibrium.';
    return 'Analyze coupled differential equations governing predator-prey oscillations. Explore phase portraits and stability conditions.';
  };

  // ── Sound effects ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* audio not available */ }
    }
    return _audioCtx;
  }

  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch (e) { /* audio not available */ }
  }

  function playSound(type) {
    try {
      switch (type) {
        case 'predation':
          playTone(120, 0.12, 'sine', 0.10);
          noiseBurst(0.04, 0.04, 600, 'bandpass');
          setTimeout(function() { playTone(80, 0.08, 'sine', 0.08); }, 60);
          break;
        case 'extinction':
          playTone(200, 0.3, 'sawtooth', 0.08);
          setTimeout(function() { playTone(150, 0.25, 'sawtooth', 0.06); }, 150);
          setTimeout(function() { playTone(100, 0.4, 'sine', 0.04); }, 300);
          break;
        case 'birth':
          playTone(440, 0.08, 'sine', 0.06);
          setTimeout(function() { playTone(554, 0.08, 'sine', 0.06); }, 60);
          setTimeout(function() { playTone(659, 0.12, 'sine', 0.08); }, 120);
          break;
        case 'simulate':
          playTone(880, 0.05, 'sine', 0.06);
          break;
        case 'quizCorrect':
          playTone(523, 0.1, 'sine', 0.12);
          setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80);
          setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160);
          break;
        case 'quizWrong':
          playTone(220, 0.25, 'sawtooth', 0.08);
          break;
        case 'badge':
          playTone(523, 0.08, 'sine', 0.1);
          setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70);
          setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140);
          setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210);
          break;
        case 'snapshot':
          playTone(1200, 0.04, 'sine', 0.08);
          setTimeout(function() { playTone(800, 0.06, 'sine', 0.06); }, 50);
          break;
        case 'dayNight':
          playTone(330, 0.2, 'triangle', 0.05);
          break;
        case 'event':
          playTone(220, 0.15, 'sawtooth', 0.10);
          setTimeout(function() { playTone(330, 0.12, 'square', 0.08); }, 80);
          setTimeout(function() { playTone(440, 0.18, 'sine', 0.12); }, 160);
          setTimeout(function() { playTone(660, 0.25, 'sine', 0.10); }, 250);
          break;
        case 'place':
          playTone(660, 0.06, 'sine', 0.08);
          setTimeout(function() { playTone(880, 0.04, 'sine', 0.06); }, 40);
          break;
        case 'pause':
          playTone(500, 0.05, 'sine', 0.06);
          break;
        default:
          playTone(440, 0.08, 'sine', 0.06);
      }
    } catch (e) { /* audio not available */ }
  }

  // ── Noise burst helper for richer audio textures ──
  function noiseBurst(dur, vol, filterFreq, filterType) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var bufSize = Math.floor(ac.sampleRate * (dur || 0.04));
      var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      var src = ac.createBufferSource(); src.buffer = buf;
      var filt = ac.createBiquadFilter(); filt.type = filterType || 'lowpass'; filt.frequency.value = filterFreq || 800;
      var g = ac.createGain(); g.gain.setValueAtTime(vol || 0.03, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.04));
      src.connect(filt); filt.connect(g); g.connect(ac.destination); src.start();
    } catch(e) {}
  }

  // ── Ambient ecosystem soundscape ──
  var _ecoAmbient = null;
  function startEcoAmbient(isDay, preyCount) {
    stopEcoAmbient();
    var ac = getAudioCtx(); if (!ac) return;
    try {
      // Base wind noise
      var bufSize = ac.sampleRate * 2;
      var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
      var src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      var filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = isDay ? 220 : 150;
      var lfo = ac.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.1;
      var lfoG = ac.createGain(); lfoG.gain.value = 30;
      lfo.connect(lfoG); lfoG.connect(filt.frequency);
      var master = ac.createGain(); master.gain.setValueAtTime(0, ac.currentTime);
      master.gain.linearRampToValueAtTime(0.008, ac.currentTime + 2);
      src.connect(filt); filt.connect(master); master.connect(ac.destination);
      src.start(); lfo.start();
      _ecoAmbient = { src: src, lfo: lfo, master: master };
      // Wildlife: birds during day (more with high prey = lots of food), crickets at night
      _ecoAmbient._interval = setInterval(function() {
        if (isDay) {
          if (Math.random() > 0.4) {
            // Bird chirp
            playTone(1600 + Math.random() * 800, 0.04, 'sine', 0.03);
            setTimeout(function() { playTone(2000 + Math.random() * 600, 0.03, 'sine', 0.025); }, 50);
          }
          if (Math.random() > 0.7) noiseBurst(0.02, 0.015, 300); // gentle wind rustle
        } else {
          if (Math.random() > 0.5) {
            // Cricket chirp
            playTone(4000, 0.015, 'sine', 0.015);
            setTimeout(function() { playTone(4200, 0.015, 'sine', 0.015); }, 25);
            setTimeout(function() { playTone(4000, 0.015, 'sine', 0.015); }, 50);
          }
          if (Math.random() > 0.85) {
            // Owl hoot
            playTone(300, 0.15, 'sine', 0.025);
            setTimeout(function() { playTone(250, 0.2, 'sine', 0.02); }, 200);
          }
        }
      }, 2500 + Math.random() * 3000);
    } catch(e) {}
  }
  function stopEcoAmbient() {
    if (_ecoAmbient) {
      try {
        var ac = getAudioCtx();
        if (ac && _ecoAmbient.master) _ecoAmbient.master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5);
        if (_ecoAmbient._interval) clearInterval(_ecoAmbient._interval);
        var nodes = _ecoAmbient;
        setTimeout(function() { try { nodes.src.stop(); nodes.lfo.stop(); } catch(e) {} }, 600);
      } catch(e) {}
      _ecoAmbient = null;
    }
  }

  // ── CSS animations for ecosystem UI ──
  if (!document.getElementById('eco-css-anims')) {
    var ecoStyle = document.createElement('style');
    ecoStyle.id = 'eco-css-anims';
    ecoStyle.textContent = [
      '@keyframes ecoSlideIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }',
      '@keyframes ecoPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }',
      '@keyframes ecoBadgePop { 0% { transform: scale(0); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }',
      '@keyframes ecoGlow { 0%, 100% { box-shadow: 0 0 6px rgba(74,222,128,0.2); } 50% { box-shadow: 0 0 16px rgba(74,222,128,0.4); } }',
      '@keyframes ecoExtinction { 0%, 100% { background-color: transparent; } 50% { background-color: rgba(239,68,68,0.08); } }',
      '@keyframes ecoBarFill { 0% { width: 0; } }',
      '.eco-card { animation: ecoSlideIn 0.35s ease-out; }',
      '.eco-badge { animation: ecoBadgePop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); }',
      '.eco-stat-bar { animation: ecoBarFill 0.6s ease-out; }',
      '.eco-extinction { animation: ecoExtinction 2s ease-in-out infinite; }',
      '.eco-glow { animation: ecoGlow 2s ease-in-out infinite; }'
    ].join('\n');
    document.head.appendChild(ecoStyle);
  }

  // ── Badge definitions (14 total) ──
  var BADGES = [
    { id: 'firstSim',          icon: '\u2B50',       label: 'First Simulation',    desc: 'Run your first graph simulation' },
    { id: 'presetExplorer',    icon: '\uD83C\uDF0D', label: 'Preset Explorer',     desc: 'Try all 4 presets' },
    { id: 'balanceKeeper',     icon: '\u2696\uFE0F', label: 'Balance Keeper',      desc: 'Achieve a stable prey:pred ratio between 2:1 and 4:1' },
    { id: 'extinctionWitness', icon: '\uD83D\uDC80', label: 'Extinction Witness',  desc: 'Witness a population crash to below 5' },
    { id: 'boomObserver',      icon: '\uD83D\uDCA5', label: 'Boom Observer',       desc: 'See prey population exceed 150' },
    { id: 'phasePortrait',     icon: '\uD83D\uDD04', label: 'Phase Portrait',      desc: 'View the phase portrait' },
    { id: 'graphToggler',      icon: '\uD83D\uDCCA', label: 'Graph Toggler',       desc: 'Switch between Population and Environment graph views' },
    { id: 'quizMaster',        icon: '\uD83C\uDFC6', label: 'Quiz Master',         desc: 'Answer 5 quiz questions correctly' },
    { id: 'aiScholar',         icon: '\uD83E\uDD16', label: 'AI Scholar',          desc: 'Use AI tutor 3 times' },
    { id: 'nightOwl',          icon: '\uD83E\uDD89', label: 'Night Owl',           desc: 'Observe the simulation during nighttime' },
    { id: 'eventSurvivor',     icon: '\u26A1',       label: 'Event Survivor',      desc: 'Trigger 3 different events' },
    { id: 'sandboxBuilder',    icon: '\uD83E\uDDF1', label: 'Sandbox Builder',     desc: 'Place 10 entities in sandbox mode' },
    { id: 'speedDemon',        icon: '\uD83D\uDE80', label: 'Speed Demon',         desc: 'Run simulation at 3x speed for 30 seconds' },
    { id: 'carryCapExplorer',  icon: '\uD83C\uDF31', label: 'Capacity Explorer',   desc: 'Change carrying capacity 3 times' }
  ];

  // ── Quiz questions ──
  var QUIZ_QUESTIONS = [
    { q: 'In a predator-prey relationship, what happens to predator populations when prey populations increase?', choices: ['Predators decrease', 'Predators increase after a lag', 'Predators stay the same', 'Predators immediately double'], answer: 1 },
    { q: 'What does the Lotka\u2013Volterra model describe?', choices: ['Rock formation', 'Predator-prey population dynamics', 'Weather patterns', 'Ocean currents'], answer: 1 },
    { q: 'Which term best describes a fox eating a rabbit?', choices: ['Mutualism', 'Parasitism', 'Predation', 'Commensalism'], answer: 2 },
    { q: 'What is carrying capacity?', choices: ['The weight an animal can lift', 'The maximum population an environment can sustain', 'The speed of population growth', 'The number of species in an area'], answer: 1 },
    { q: 'In a food web, which organisms are primary producers?', choices: ['Foxes', 'Rabbits', 'Plants', 'Decomposers'], answer: 2 },
    { q: 'What happens to prey when there are too many predators?', choices: ['Prey population increases', 'Prey population stays the same', 'Prey population decreases', 'Prey evolve instantly'], answer: 2 },
    { q: 'A trophic level is best described as:', choices: ['A step in a food chain', 'A type of habitat', 'A weather pattern', 'A rock layer'], answer: 0 },
    { q: 'If prey birth rate is very high and predator death rate is very high, what likely happens?', choices: ['Both go extinct', 'Prey boom, predators decline', 'Stable equilibrium', 'Nothing changes'], answer: 1 },
    { q: 'What does a phase portrait show?', choices: ['A photograph of the ecosystem', 'Prey vs predator population plotted against each other', 'Temperature over time', 'Rainfall data'], answer: 1 },
    { q: 'Decomposers are important because they:', choices: ['Hunt prey', 'Break down dead matter and recycle nutrients', 'Produce oxygen', 'Migrate south in winter'], answer: 1 },
    { q: 'In Lotka\u2013Volterra equations, what causes predator population growth?', choices: ['Sunlight', 'Encounters between predators and prey', 'Rain', 'Wind'], answer: 1 },
    { q: 'An ecosystem with only one predator and one prey species is called:', choices: ['A biome', 'A simple food chain', 'A rainforest', 'A tundra'], answer: 1 }
  ];

  // ═══════════════════════════════════════════

  // ── Biome color palettes ──
  var BIOME_COLORS = {
    grassland: { name: 'Grassland', emoji: '\uD83C\uDF3E', skyDay: [130, 180, 235], skyNight: '#0f172a', skyNightEnd: '#1e293b', groundDay: ['#4ade80','#22c55e','#166534'], groundNight: ['#1a3a2a','#14532d','#0a2e1a'] },
    forest:    { name: 'Forest',    emoji: '\uD83C\uDF32', skyDay: [90, 130, 170],  skyNight: '#0a1420', skyNightEnd: '#141e30', groundDay: ['#2d7a3e','#1a5c2e','#0d3b1a'], groundNight: ['#0d2618','#081c10','#051008'] },
    savanna:   { name: 'Savanna',   emoji: '\uD83E\uDD81', skyDay: [210, 180, 130], skyNight: '#1a1208', skyNightEnd: '#2a1e10', groundDay: ['#c4a265','#a8862b','#8b7040'], groundNight: ['#4a3520','#3d2b18','#2d2010'] },
    tundra:    { name: 'Tundra',    emoji: '\u2744\uFE0F', skyDay: [170, 195, 220], skyNight: '#0a0f1a', skyNightEnd: '#151c28', groundDay: ['#c8d0c8','#a8b0a8','#8a928a'], groundNight: ['#3a3e3a','#2d312d','#202420'] }
  };

  // ── Ecology challenges ──
  var ECO_CHALLENGES = [
    { id: 'balance60', emoji: '\u2696\uFE0F', name: 'Steady State', desc: 'Prey:pred ratio 2:1\u20135:1 for 60 samples', reward: 30,
      check: function(h) { if(h.length<60) return false; var r=h.slice(-60); for(var i=0;i<r.length;i++){var ratio=r[i].prey/Math.max(1,r[i].pred); if(ratio<2||ratio>5) return false;} return true; } },
    { id: 'survive_crash', emoji: '\uD83C\uDF31', name: 'Recovery', desc: 'Prey drops below 10, then recovers above 25', reward: 25,
      check: function(h) { var saw=false; for(var i=0;i<h.length;i++){if(h[i].prey<10)saw=true; if(saw&&h[i].prey>25) return true;} return false; } },
    { id: 'coexist', emoji: '\uD83E\uDD1D', name: 'Coexistence', desc: 'Both species above 5 for 100 samples', reward: 35,
      check: function(h) { if(h.length<100) return false; var r=h.slice(-100); for(var i=0;i<r.length;i++){if(r[i].prey<5||r[i].pred<5) return false;} return true; } },
    { id: 'apex_crash', emoji: '\uD83D\uDCA5', name: 'Trophic Cascade', desc: 'Predators hit 0 while prey exceed 40', reward: 20,
      check: function(h) { for(var i=0;i<h.length;i++){if(h[i].pred===0&&h[i].prey>40) return true;} return false; } }
  ];


  // REGISTER TOOL
  // ═══════════════════════════════════════════
  window.StemLab.registerTool('ecosystem', {
    icon: '\uD83E\uDD8A', label: 'Ecosystem Simulator',
    desc: 'Model predator-prey dynamics with Lotka\u2013Volterra equations, live canvas, sandbox mode, event injection, quiz & AI tutor.',
    color: 'emerald', category: 'science',
    questHooks: [
      { id: 'run_100_steps', label: 'Run the simulation for 100+ steps', icon: '\u25B6\uFE0F', check: function(d) { d = d.ecosystem || d; return (d.steps || 0) >= 100; }, progress: function(d) { d = d.ecosystem || d; return (d.steps || 0) + '/100 steps'; } },
      { id: 'quiz_3_correct', label: 'Answer 3+ ecology quiz questions correctly', icon: '\uD83E\uDDE0', check: function(d) { d = d.ecosystem || d; return (d.quizCorrect || 0) >= 3; }, progress: function(d) { d = d.ecosystem || d; return (d.quizCorrect || 0) + '/3'; } },
      { id: 'use_3_presets', label: 'Try 3 different ecosystem presets', icon: '\uD83C\uDF0D', check: function(d) { d = d.ecosystem || d; return Object.keys(d.presetsUsed || {}).length >= 3; }, progress: function(d) { d = d.ecosystem || d; return Object.keys(d.presetsUsed || {}).length + '/3 presets'; } },
      { id: 'use_all_graph_views', label: 'View all graph types (population, phase, energy)', icon: '\uD83D\uDCCA', check: function(d) { d = d.ecosystem || d; return Object.keys(d.graphViewsUsed || {}).length >= 3; }, progress: function(d) { d = d.ecosystem || d; return Object.keys(d.graphViewsUsed || {}).length + '/3 views'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var canvasNarrate = ctx.canvasNarrate;
      var setToolSnapshots = ctx.setToolSnapshots;
      var callGemini = ctx.callGemini || window.callGemini;
      var callTTS = ctx.callTTS || window.callTTS;

      // ── State via toolData ──
      var ld = ctx.toolData || {};
      var d = ld.ecosystem || {};

      var upd = function(key, val) {
        if (typeof ctx.setToolData === 'function') {
          ctx.setToolData(function(prev) {
            var eco = Object.assign({}, (prev && prev.ecosystem) || {});
            if (typeof key === 'object') {
              Object.assign(eco, key);
            } else {
              eco[key] = val;
            }
            return Object.assign({}, prev, { ecosystem: eco });
          });
        }
      };

      var updMulti = function(obj) {
        upd(obj);
      };

      // ── Default state ──
      var prey0 = d.prey0 !== undefined ? d.prey0 : 80;
      var pred0 = d.pred0 !== undefined ? d.pred0 : 30;
      var preyBirth = d.preyBirth !== undefined ? d.preyBirth : 0.1;
      var preyDeath = d.preyDeath !== undefined ? d.preyDeath : 0.01;
      var predBirth = d.predBirth !== undefined ? d.predBirth : 0.01;
      var predDeath = d.predDeath !== undefined ? d.predDeath : 0.1;
      var data = d.data || [];
      var steps = d.steps || 0;
      var livePopHistory = d.livePopHistory || [];
      var ecoGraphView = d.ecoGraphView || 'population';
      var ecoGraphOpen = d.ecoGraphOpen !== undefined ? d.ecoGraphOpen : true;

      // Mode tabs
      var tab = d.tab || 'explore';
      // Quiz state
      var quizIndex = d.quizIndex !== undefined ? d.quizIndex : 0;
      var quizAnswer = d.quizAnswer !== undefined ? d.quizAnswer : -1;
      var quizFeedback = d.quizFeedback || '';
      var quizCorrect = d.quizCorrect || 0;
      var quizTotal = d.quizTotal || 0;
      // Badge state
      var badges = d.badges || {};
      var presetsUsed = d.presetsUsed || {};
      var graphViewsUsed = d.graphViewsUsed || {};
      // AI state
      var showAI = d.showAI || false;
      var aiResponse = d.aiResponse || '';
      var aiLoading = d.aiLoading || false;
      var aiUseCount = d.aiUseCount || 0;
      // Night observed
      var nightObserved = d.nightObserved || false;

      // ── NEW state: pause/speed ──
      var simPaused = d.simPaused || false;
      var simSpeed = d.simSpeed !== undefined ? d.simSpeed : 2;

      // ── NEW state: carrying capacity ──
      var carryingCapacity = d.carryingCapacity !== undefined ? d.carryingCapacity : 100;
      var carryCapChanges = d.carryCapChanges || 0;

      // ── NEW state: sandbox ──
      var sandboxTool = d.sandboxTool || 'rabbit';
      var sandboxPlaceCount = d.sandboxPlaceCount || 0;

      // ── NEW state: events ──
      var eventsTriggered = d.eventsTriggered || {};
      var eventHistory = d.eventHistory || [];
      var lastObservation = d.lastObservation || 'Ecosystem running -- observe the predator-prey cycle.';

      // ── NEW state: speed demon badge tracking ──
      var speedAt3xStart = d.speedAt3xStart || 0;


      // ── NEW state: biome, challenges, RP, tutorial ──
      var biome = d.biome || 'grassland';
      var researchPoints = d.researchPoints || 0;
      var totalRP = d.totalRP || 0;
      var completedChallenges = d.completedChallenges || {};
      var tutorialStep = d.tutorialStep || 0;
      var tutorialDismissed = d.tutorialDismissed || false;


      var gradeBand = getGradeBand(ctx);

      // ── Badge checker (expanded for 14 badges) ──
      var checkBadges = function(overrides) {
        var state = Object.assign({
          simRun: steps > 0,
          presetsUsed: presetsUsed,
          data: data,
          quizCorrect: quizCorrect,
          aiUseCount: aiUseCount,
          nightObserved: nightObserved,
          graphViewsUsed: graphViewsUsed,
          livePopHistory: livePopHistory,
          eventsTriggered: eventsTriggered,
          sandboxPlaceCount: sandboxPlaceCount,
          speedAt3xStart: speedAt3xStart,
          carryCapChanges: carryCapChanges,
          simSpeed: simSpeed
        }, overrides || {});

        var newBadges = Object.assign({}, badges);
        var awarded = false;

        var checks = {
          firstSim: function() { return state.simRun; },
          presetExplorer: function() { var u = state.presetsUsed; return u.balanced && u.extinction && u.boom && u.equilibrium; },
          balanceKeeper: function() {
            var d2 = state.data;
            if (!d2 || d2.length < 50) return false;
            var last20 = d2.slice(d2.length - 20);
            var stable = true;
            for (var i = 0; i < last20.length; i++) {
              var ratio = last20[i].prey / Math.max(1, last20[i].pred);
              if (ratio < 2 || ratio > 4) { stable = false; break; }
            }
            return stable;
          },
          extinctionWitness: function() {
            var d2 = state.data;
            if (!d2) return false;
            for (var i = 0; i < d2.length; i++) {
              if (d2[i].prey < 5 || d2[i].pred < 5) return true;
            }
            return false;
          },
          boomObserver: function() {
            var d2 = state.data;
            if (!d2) return false;
            for (var i = 0; i < d2.length; i++) {
              if (d2[i].prey > 150) return true;
            }
            return false;
          },
          phasePortrait: function() { return state.simRun && state.data && state.data.length > 0; },
          graphToggler: function() { var gv = state.graphViewsUsed; return gv && gv.population && gv.environment; },
          quizMaster: function() { return state.quizCorrect >= 5; },
          aiScholar: function() { return state.aiUseCount >= 3; },
          nightOwl: function() { return state.nightObserved; },
          eventSurvivor: function() {
            var et = state.eventsTriggered;
            if (!et) return false;
            var count = 0;
            var keys = Object.keys(et);
            for (var i = 0; i < keys.length; i++) {
              if (et[keys[i]]) count++;
            }
            return count >= 3;
          },
          sandboxBuilder: function() { return state.sandboxPlaceCount >= 10; },
          speedDemon: function() {
            if (state.simSpeed < 6) return false;
            if (!state.speedAt3xStart) return false;
            return (Date.now() - state.speedAt3xStart) >= 30000;
          },
          carryCapExplorer: function() { return state.carryCapChanges >= 3; }
        };

        BADGES.forEach(function(b) {
          if (!newBadges[b.id] && checks[b.id] && checks[b.id]()) {
            newBadges[b.id] = true;
            awarded = true;
            playSound('badge');
            if (addToast) addToast(b.icon + ' Badge: ' + b.label + '!', 'success');
            if (typeof awardXP === 'function') awardXP('ecosystem', 15, 'badge');
          }
        });

        if (awarded) {
          upd('badges', newBadges);
        }
      };


      // ── Check ecology challenges ──
      var checkEcoChallenges = function(hist) {
        if (!hist || hist.length < 10) return;
        var nc = Object.assign({}, completedChallenges);
        var rpGain = 0;
        ECO_CHALLENGES.forEach(function(ch) {
          if (!nc[ch.id] && ch.check(hist)) {
            nc[ch.id] = true;
            rpGain += ch.reward;
            playSound('badge');
            if (addToast) addToast(ch.emoji + ' Challenge: ' + ch.name + '! +' + ch.reward + ' RP', 'success');
          }
        });
        if (rpGain > 0) {
          updMulti({ completedChallenges: nc, researchPoints: (researchPoints || 0) + rpGain, totalRP: (totalRP || 0) + rpGain });
        }
      };

      // ── Biome change ──
      var changeBiome = function(newBiome) {
        upd('biome', newBiome);
        // Reset canvas so new colors take effect
        var canvasEl = document.querySelector('canvas[data-eco-canvas]');
        if (canvasEl) canvasEl.dataset.biome = newBiome;
        if (addToast) addToast(BIOME_COLORS[newBiome].emoji + ' ' + BIOME_COLORS[newBiome].name, 'success');
      };

      // ── Tutorial helpers ──
      var advanceTutorial = function() { upd('tutorialStep', tutorialStep + 1); };
      var dismissTutorial = function() { upd('tutorialDismissed', true); };


      // ── Lotka-Volterra simulation (with carrying capacity logistic term) ──
      var simulate = function() {
        var prey = prey0, pred = pred0;
        var K = carryingCapacity;
        var simData = [{ step: 0, prey: prey, pred: pred }];
        for (var i = 1; i <= 100; i++) {
          var logisticFactor = Math.max(0, 1 - prey / K);
          var newPrey = Math.max(1, prey + preyBirth * prey * logisticFactor - preyDeath * prey * pred);
          var newPred = Math.max(1, pred + predBirth * prey * pred - predDeath * pred);
          prey = Math.min(500, Math.round(newPrey));
          pred = Math.min(500, Math.round(newPred));
          simData.push({ step: i, prey: prey, pred: pred });
        }
        playSound('simulate');
        updMulti({ data: simData, steps: simData.length });
        if (announceToSR) announceToSR('Simulation complete. ' + simData.length + ' steps generated.');
        setTimeout(function() {
          checkBadges({ simRun: true, data: simData });
        }, 100);
      };

      // ── SVG graph helpers ──
      var W = 420, H = 180, pad = 35;

      var buildPopSVG = function() {
        if (!data || data.length < 2) return null;
        var maxPrey = 1, maxPred = 1;
        for (var i = 0; i < data.length; i++) {
          if (data[i].prey > maxPrey) maxPrey = data[i].prey;
          if (data[i].pred > maxPred) maxPred = data[i].pred;
        }
        var maxY = Math.max(maxPrey, maxPred, 10);
        // Ensure carrying capacity line can be seen
        if (carryingCapacity > maxY) maxY = carryingCapacity + 10;
        var sx = function(v) { return pad + (v / (data.length - 1)) * (W - 2 * pad); };
        var sy = function(v) { return H - pad - (v / maxY) * (H - 2 * pad); };

        // Grid lines
        var gridLines = [];
        for (var gl = 0; gl <= 4; gl++) {
          var yy = pad + gl * ((H - 2 * pad) / 4);
          var val = Math.round(maxY - gl * (maxY / 4));
          gridLines.push(h('line', { key: 'gl' + gl, x1: pad, y1: yy, x2: W - pad, y2: yy, stroke: '#334155', strokeWidth: 0.5 }));
          gridLines.push(h('text', { key: 'gt' + gl, x: pad - 4, y: yy + 3, textAnchor: 'end', fill: '#94a3b8', fontSize: 8 }, val));
        }

        // X axis labels
        var xLabels = [];
        for (var xl = 0; xl <= 4; xl++) {
          var xIdx = Math.round(xl * (data.length - 1) / 4);
          xLabels.push(h('text', { key: 'xl' + xl, x: sx(xIdx), y: H - pad + 14, textAnchor: 'middle', fill: '#94a3b8', fontSize: 8 }, data[xIdx].step));
        }

        // Prey line
        var preyPts = '';
        var predPts = '';
        for (var pi = 0; pi < data.length; pi++) {
          preyPts += (pi === 0 ? '' : ' ') + sx(pi).toFixed(1) + ',' + sy(data[pi].prey).toFixed(1);
          predPts += (pi === 0 ? '' : ' ') + sx(pi).toFixed(1) + ',' + sy(data[pi].pred).toFixed(1);
        }

        // Prey area
        var preyAreaPts = pad.toFixed(1) + ',' + (H - pad).toFixed(1) + ' ' + preyPts + ' ' + (W - pad).toFixed(1) + ',' + (H - pad).toFixed(1);
        var predAreaPts = pad.toFixed(1) + ',' + (H - pad).toFixed(1) + ' ' + predPts + ' ' + (W - pad).toFixed(1) + ',' + (H - pad).toFixed(1);

        var lastData = data[data.length - 1];

        // Carrying capacity dashed line
        var carryY = sy(carryingCapacity);

        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'w-full', style: { maxHeight: 200 } },
          h('defs', null,
            h('linearGradient', { id: 'eco-prey-grad', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#22c55e', stopOpacity: 0.4 }),
              h('stop', { offset: '100%', stopColor: '#22c55e', stopOpacity: 0.05 })
            ),
            h('linearGradient', { id: 'eco-pred-grad', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#ef4444', stopOpacity: 0.4 }),
              h('stop', { offset: '100%', stopColor: '#ef4444', stopOpacity: 0.05 })
            )
          ),
          // Grid
          gridLines,
          xLabels,
          // Axes
          h('line', { x1: pad, y1: pad, x2: pad, y2: H - pad, stroke: '#475569', strokeWidth: 1 }),
          h('line', { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: '#475569', strokeWidth: 1 }),
          // Carrying capacity dashed line
          h('line', { x1: pad, y1: carryY, x2: W - pad, y2: carryY, stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '6,4', opacity: 0.7 }),
          h('text', { x: W - pad + 2, y: carryY + 3, fill: '#f59e0b', fontSize: 7 }, 'K=' + carryingCapacity),
          // Areas
          h('polygon', { points: preyAreaPts, fill: 'url(#eco-prey-grad)' }),
          h('polygon', { points: predAreaPts, fill: 'url(#eco-pred-grad)' }),
          // Lines
          h('polyline', { points: preyPts, fill: 'none', stroke: '#22c55e', strokeWidth: 2 }),
          h('polyline', { points: predPts, fill: 'none', stroke: '#ef4444', strokeWidth: 2 }),
          // End dots
          h('circle', { cx: sx(data.length - 1), cy: sy(lastData.prey), r: 4, fill: '#22c55e' }),
          h('circle', { cx: sx(data.length - 1), cy: sy(lastData.pred), r: 4, fill: '#ef4444' }),
          // End labels
          h('text', { x: sx(data.length - 1) + 6, y: sy(lastData.prey) + 3, fill: '#22c55e', fontSize: 11, fontWeight: 'bold' }, lastData.prey),
          h('text', { x: sx(data.length - 1) + 6, y: sy(lastData.pred) + 3, fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }, lastData.pred),
          // Axis labels
          h('text', { x: W / 2, y: H - 4, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, 'Time Steps'),
          h('text', { x: 8, y: H / 2, textAnchor: 'middle', fill: '#94a3b8', fontSize: 11, transform: 'rotate(-90, 8, ' + (H / 2) + ')' }, 'Population')
        );
      };

      // ── Phase portrait SVG ──
      var buildPhaseSVG = function() {
        if (!data || data.length < 2) return null;
        var maxPrey = 1, maxPred = 1;
        for (var i = 0; i < data.length; i++) {
          if (data[i].prey > maxPrey) maxPrey = data[i].prey;
          if (data[i].pred > maxPred) maxPred = data[i].pred;
        }
        var sx = function(v) { return pad + (v / maxPrey) * (W - 2 * pad); };
        var sy = function(v) { return H - pad - (v / maxPred) * (H - 2 * pad); };

        var pts = '';
        for (var pi = 0; pi < data.length; pi++) {
          pts += (pi === 0 ? '' : ' ') + sx(data[pi].prey).toFixed(1) + ',' + sy(data[pi].pred).toFixed(1);
        }

        // Detect cycles
        var cycles = 0;
        var prevDir = 0;
        for (var ci = 1; ci < data.length; ci++) {
          var dir = data[ci].prey > data[ci - 1].prey ? 1 : -1;
          if (prevDir === -1 && dir === 1) cycles++;
          prevDir = dir;
        }

        var peakPrey = 0, peakPred = 0;
        for (var pk = 0; pk < data.length; pk++) {
          if (data[pk].prey > peakPrey) peakPrey = data[pk].prey;
          if (data[pk].pred > peakPred) peakPred = data[pk].pred;
        }

        return h('div', null,
          h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'w-full', style: { maxHeight: 200 } },
            // Axes
            h('line', { x1: pad, y1: pad, x2: pad, y2: H - pad, stroke: '#475569', strokeWidth: 1 }),
            h('line', { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: '#475569', strokeWidth: 1 }),
            // Phase curve
            h('polyline', { points: pts, fill: 'none', stroke: '#a78bfa', strokeWidth: 2, strokeLinejoin: 'round' }),
            // Start dot
            h('circle', { cx: sx(data[0].prey), cy: sy(data[0].pred), r: 5, fill: '#22c55e', stroke: '#fff', strokeWidth: 1 }),
            // End dot
            h('circle', { cx: sx(data[data.length - 1].prey), cy: sy(data[data.length - 1].pred), r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 1 }),
            // Axis labels
            h('text', { x: W / 2, y: H - 4, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, 'Prey Population'),
            h('text', { x: 8, y: H / 2, textAnchor: 'middle', fill: '#94a3b8', fontSize: 11, transform: 'rotate(-90, 8, ' + (H / 2) + ')' }, 'Predator Population')
          ),
          h('div', { className: 'flex gap-3 text-xs text-slate-600 mt-1 justify-center' },
            h('span', null, '\uD83D\uDD04 Cycles: ' + cycles),
            h('span', null, '\uD83D\uDC07 Peak Prey: ' + peakPrey),
            h('span', null, '\uD83E\uDD8A Peak Pred: ' + peakPred)
          )
        );
      };

      // ── Environment graph (from livePopHistory) ──
      var buildEnvSVG = function() {
        var hist = livePopHistory;
        if (!hist || hist.length < 2) return h('p', { className: 'text-xs text-slate-600 text-center py-4' }, 'Run the canvas simulation to see environment data.');
        var sx = function(i) { return pad + (i / (hist.length - 1)) * (W - 2 * pad); };
        var sy = function(v) { return H - pad - v * (H - 2 * pad); };

        var vegPts = '';
        var dayPts = '';
        for (var i = 0; i < hist.length; i++) {
          var veg = hist[i].vegHealth !== undefined ? hist[i].vegHealth : 0.5;
          var dayP = hist[i].dayPhase !== undefined ? hist[i].dayPhase : 0.5;
          vegPts += (i === 0 ? '' : ' ') + sx(i).toFixed(1) + ',' + sy(veg).toFixed(1);
          dayPts += (i === 0 ? '' : ' ') + sx(i).toFixed(1) + ',' + sy(dayP).toFixed(1);
        }

        var lastVeg = hist[hist.length - 1].vegHealth !== undefined ? hist[hist.length - 1].vegHealth : 0.5;
        var lastDay = hist[hist.length - 1].dayPhase !== undefined ? hist[hist.length - 1].dayPhase : 0.5;

        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'w-full', style: { maxHeight: 200 } },
          // Grid
          h('line', { x1: pad, y1: pad, x2: pad, y2: H - pad, stroke: '#334155', strokeWidth: 0.5 }),
          h('line', { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: '#334155', strokeWidth: 0.5 }),
          // Lines
          h('polyline', { points: vegPts, fill: 'none', stroke: '#22c55e', strokeWidth: 2, strokeDasharray: '4,2' }),
          h('polyline', { points: dayPts, fill: 'none', stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '4,2' }),
          // End dots
          h('circle', { cx: sx(hist.length - 1), cy: sy(lastVeg), r: 4, fill: '#22c55e' }),
          h('circle', { cx: sx(hist.length - 1), cy: sy(lastDay), r: 4, fill: '#f59e0b' }),
          // Axis labels
          h('text', { x: W / 2, y: H - 4, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, 'Time'),
          h('text', { x: 8, y: H / 2, textAnchor: 'middle', fill: '#94a3b8', fontSize: 11, transform: 'rotate(-90, 8, ' + (H / 2) + ')' }, 'Level (0\u20131)')
        );
      };

      // ── Canvas ref callback (MAJOR ENHANCEMENTS) ──
      var canvasRef = function(canvas) {
        if (!canvas || canvas._ecoInit) return;
        canvas._ecoInit = true;

        var ctxC = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 2;
        var cw = canvas.clientWidth;
        var ch = canvas.clientHeight;
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
        ctxC.scale(dpr, dpr);

        var tick = 0;
        var animId = null;
        var wasDay = true;

        // Mouse tracking for sandbox
        canvas._mouseX = -1;
        canvas._mouseY = -1;
        canvas._pendingClick = false;
        canvas._pendingClickX = 0;
        canvas._pendingClickY = 0;
        canvas._dragging = false;
        canvas._dragEntity = null;
        canvas._dragType = '';

        var onMouseMove = function(e) {
          var rect = canvas.getBoundingClientRect();
          canvas._mouseX = e.clientX - rect.left;
          canvas._mouseY = e.clientY - rect.top;
        };

        var onMouseDown = function(e) {
          var rect = canvas.getBoundingClientRect();
          var mx = e.clientX - rect.left;
          var my = e.clientY - rect.top;
          var tool = canvas.dataset.sandboxTool || '';
          if (tool === 'move') {
            // Find nearest entity to start drag
            var bestDist = 20;
            var bestEnt = null;
            var bestType = '';
            for (var pi2 = 0; pi2 < preyEntities.length; pi2++) {
              if (!preyEntities[pi2].alive) continue;
              var dx2 = preyEntities[pi2].x - mx;
              var dy2 = preyEntities[pi2].y - my;
              var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
              if (dist2 < bestDist) { bestDist = dist2; bestEnt = preyEntities[pi2]; bestType = 'prey'; }
            }
            for (var fi2 = 0; fi2 < predEntities.length; fi2++) {
              if (!predEntities[fi2].alive) continue;
              var dx3 = predEntities[fi2].x - mx;
              var dy3 = predEntities[fi2].y - my;
              var dist3 = Math.sqrt(dx3 * dx3 + dy3 * dy3);
              if (dist3 < bestDist) { bestDist = dist3; bestEnt = predEntities[fi2]; bestType = 'pred'; }
            }
            if (bestEnt) {
              canvas._dragging = true;
              canvas._dragEntity = bestEnt;
              canvas._dragType = bestType;
            }
          }
        };

        var onMouseUp = function() {
          canvas._dragging = false;
          canvas._dragEntity = null;
          canvas._dragType = '';
        };

        var onClick = function(e) {
          var rect = canvas.getBoundingClientRect();
          canvas._pendingClick = true;
          canvas._pendingClickX = e.clientX - rect.left;
          canvas._pendingClickY = e.clientY - rect.top;
        };

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('click', onClick);

        // ── Ground level: animals stay on/below the terrain horizon ──
        var groundY = Math.round(ch * 0.46);
        var groundBottom = ch - 20;

        // ── Entities ──
        var preyEntities = [];
        for (var pi = 0; pi < 80; pi++) {
          preyEntities.push({
            x: Math.random() * cw, y: groundY + Math.random() * (groundBottom - groundY),
            vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 0.8,
            alive: pi < prey0, hop: Math.random() * Math.PI * 2, facing: Math.random() > 0.5 ? 1 : -1
          });
        }

        var predEntities = [];
        for (var fi = 0; fi < 35; fi++) {
          predEntities.push({
            x: Math.random() * cw, y: groundY + Math.random() * (groundBottom - groundY),
            vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.5,
            alive: fi < pred0, facing: Math.random() > 0.5 ? 1 : -1, hunting: false
          });
        }

        // Vegetation
        var vegetation = [];
        for (var vi = 0; vi < 30; vi++) {
          vegetation.push({
            x: Math.random() * cw,
            y: 100 + Math.random() * (ch - 140),
            type: Math.random() > 0.5 ? 'tree' : 'grass',
            size: 8 + Math.random() * 12,
            health: 1.0
          });
        }

        // Clouds
        var clouds = [];
        for (var ci = 0; ci < 5; ci++) {
          clouds.push({
            x: Math.random() * cw, y: 10 + Math.random() * 40,
            w: 40 + Math.random() * 60, speed: 0.15 + Math.random() * 0.25
          });
        }

        // Catch particles
        var catchParticles = [];

        // Pop history for live mini-graph
        var popHistory = [];

        // Stars
        var stars = [];
        for (var si = 0; si < 30; si++) {
          stars.push({ x: Math.random() * cw, y: Math.random() * 70, twinkle: Math.random() * Math.PI * 2 });
        }

        // Ambient bugs
        var bugs = [];
        for (var bi = 0; bi < 12; bi++) {
          bugs.push({
            x: Math.random() * cw, y: 30 + Math.random() * (ch - 60),
            vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.4,
            color: ['#f472b6', '#60a5fa', '#facc15', '#a78bfa', '#34d399'][Math.floor(Math.random() * 5)],
            phase: Math.random() * Math.PI * 2
          });
        }

        // Event state (local to canvas)
        var droughtTicks = 0;
        var droughtPreyReproMod = 1;

        // ── Draw function ──
        var draw = function() {
          // ── Read speed & pause from dataset ──
          var speed = parseInt(canvas.dataset.speed || '2', 10);
          var paused = canvas.dataset.paused === '1';

          // ── Read carrying capacity ──
          var carryK = parseInt(canvas.dataset.carryK || '100', 10);

          // ── Read sandbox tool ──
          var sandboxToolVal = canvas.dataset.sandboxTool || '';

          // ── Process pending event ──
          var pendingEvent = canvas.dataset.pendingEvent || '';
          if (pendingEvent) {
            canvas.dataset.pendingEvent = '';
            var preyAliveNow = 0;
            var predAliveNow = 0;
            for (var pec = 0; pec < preyEntities.length; pec++) { if (preyEntities[pec].alive) preyAliveNow++; }
            for (var pec2 = 0; pec2 < predEntities.length; pec2++) { if (predEntities[pec2].alive) predAliveNow++; }

            if (pendingEvent === 'drought') {
              // Kill 60% of vegetation health
              for (var dvi = 0; dvi < vegetation.length; dvi++) {
                vegetation[dvi].health = vegetation[dvi].health * 0.4;
              }
              droughtTicks = 400;
              droughtPreyReproMod = 0.5;
              canvas.dataset.eventFlash = '60';
              canvas.dataset.eventColor = 'rgba(255,165,0,0.3)';
            } else if (pendingEvent === 'disease') {
              // Kill 40% of prey randomly
              var preyToKill = Math.floor(preyAliveNow * 0.4);
              var shuffled = [];
              for (var dsi = 0; dsi < preyEntities.length; dsi++) { if (preyEntities[dsi].alive) shuffled.push(dsi); }
              // Fisher-Yates shuffle
              for (var fyi = shuffled.length - 1; fyi > 0; fyi--) {
                var j = Math.floor(Math.random() * (fyi + 1));
                var tmp = shuffled[fyi]; shuffled[fyi] = shuffled[j]; shuffled[j] = tmp;
              }
              for (var dki = 0; dki < preyToKill && dki < shuffled.length; dki++) {
                preyEntities[shuffled[dki]].alive = false;
              }
              canvas.dataset.eventFlash = '60';
              canvas.dataset.eventColor = 'rgba(0,200,0,0.25)';
            } else if (pendingEvent === 'foodBoom') {
              // Vegetation health boosted to 1.0, +10 prey spawned
              for (var fbi = 0; fbi < vegetation.length; fbi++) {
                vegetation[fbi].health = 1.0;
              }
              var spawned = 0;
              for (var fbs = 0; fbs < preyEntities.length && spawned < 10; fbs++) {
                if (!preyEntities[fbs].alive) {
                  preyEntities[fbs].alive = true;
                  preyEntities[fbs].x = Math.random() * cw;
                  preyEntities[fbs].y = groundY + Math.random() * (groundBottom - groundY);
                  preyEntities[fbs].vx = (Math.random() - 0.5) * 1.2;
                  preyEntities[fbs].vy = (Math.random() - 0.5) * 0.8;
                  spawned++;
                }
              }
              canvas.dataset.eventFlash = '60';
              canvas.dataset.eventColor = 'rgba(34,197,94,0.3)';
            } else if (pendingEvent === 'migration') {
              // 8 new predators arrive
              var migrated = 0;
              for (var mgi2 = 0; mgi2 < predEntities.length && migrated < 8; mgi2++) {
                if (!predEntities[mgi2].alive) {
                  predEntities[mgi2].alive = true;
                  predEntities[mgi2].x = Math.random() * cw;
                  predEntities[mgi2].y = groundY + Math.random() * (groundBottom - groundY);
                  predEntities[mgi2].vx = (Math.random() - 0.5) * 0.8;
                  predEntities[mgi2].vy = (Math.random() - 0.5) * 0.5;
                  migrated++;
                }
              }
              canvas.dataset.eventFlash = '60';
              canvas.dataset.eventColor = 'rgba(59,130,246,0.3)';
            } else if (pendingEvent === 'wildfire') {
              // Kill 50% vegetation, kills 30% of both species
              for (var wfi = 0; wfi < vegetation.length; wfi++) {
                if (Math.random() < 0.5) vegetation[wfi].health = 0.1;
              }
              // Kill 30% prey
              var preyShuf = [];
              for (var wps = 0; wps < preyEntities.length; wps++) { if (preyEntities[wps].alive) preyShuf.push(wps); }
              var preyKillCount = Math.floor(preyShuf.length * 0.3);
              for (var wfyi = preyShuf.length - 1; wfyi > 0; wfyi--) {
                var wj = Math.floor(Math.random() * (wfyi + 1));
                var wt = preyShuf[wfyi]; preyShuf[wfyi] = preyShuf[wj]; preyShuf[wj] = wt;
              }
              for (var wpk = 0; wpk < preyKillCount && wpk < preyShuf.length; wpk++) {
                preyEntities[preyShuf[wpk]].alive = false;
              }
              // Kill 30% predators
              var predShuf = [];
              for (var wds = 0; wds < predEntities.length; wds++) { if (predEntities[wds].alive) predShuf.push(wds); }
              var predKillCount = Math.floor(predShuf.length * 0.3);
              for (var wdyi = predShuf.length - 1; wdyi > 0; wdyi--) {
                var wdj = Math.floor(Math.random() * (wdyi + 1));
                var wdt = predShuf[wdyi]; predShuf[wdyi] = predShuf[wdj]; predShuf[wdj] = wdt;
              }
              for (var wdk = 0; wdk < predKillCount && wdk < predShuf.length; wdk++) {
                predEntities[predShuf[wdk]].alive = false;
              }
              canvas.dataset.eventFlash = '60';
              canvas.dataset.eventColor = 'rgba(239,68,68,0.35)';
            }
          }

          // Decrement drought ticks
          if (droughtTicks > 0) {
            droughtTicks--;
            if (droughtTicks <= 0) droughtPreyReproMod = 1;
          }

          // ── Run simulation ticks (speed multiplier) ──
          var ticksThisFrame = paused ? 0 : speed;

          for (var speedIter = 0; speedIter < ticksThisFrame; speedIter++) {
            tick++;

            // ── Sandbox: handle drag ──
            if (canvas._dragging && canvas._dragEntity) {
              canvas._dragEntity.x = canvas._mouseX;
              canvas._dragEntity.y = canvas._mouseY;
              canvas._dragEntity.vx = 0;
              canvas._dragEntity.vy = 0;
            }

            // ── Sandbox: handle click placement ──
            if (canvas._pendingClick && sandboxToolVal) {
              canvas._pendingClick = false;
              var clickX = canvas._pendingClickX;
              var clickY = canvas._pendingClickY;

              if (sandboxToolVal === 'rabbit') {
                for (var spr = 0; spr < preyEntities.length; spr++) {
                  if (!preyEntities[spr].alive) {
                    preyEntities[spr].alive = true;
                    preyEntities[spr].x = clickX;
                    preyEntities[spr].y = Math.max(groundY, Math.min(groundBottom, clickY));
                    preyEntities[spr].vx = (Math.random() - 0.5) * 1.2;
                    preyEntities[spr].vy = (Math.random() - 0.5) * 0.8;
                    playSound('place');
                    canvas.dataset.placeCount = (parseInt(canvas.dataset.placeCount || '0', 10) + 1).toString();
                    break;
                  }
                }
              } else if (sandboxToolVal === 'fox') {
                for (var spf = 0; spf < predEntities.length; spf++) {
                  if (!predEntities[spf].alive) {
                    predEntities[spf].alive = true;
                    predEntities[spf].x = clickX;
                    predEntities[spf].y = Math.max(groundY, Math.min(groundBottom, clickY));
                    predEntities[spf].vx = (Math.random() - 0.5) * 0.8;
                    predEntities[spf].vy = (Math.random() - 0.5) * 0.5;
                    playSound('place');
                    canvas.dataset.placeCount = (parseInt(canvas.dataset.placeCount || '0', 10) + 1).toString();
                    break;
                  }
                }
              } else if (sandboxToolVal === 'tree') {
                vegetation.push({
                  x: clickX,
                  y: Math.max(100, Math.min(ch - 30, clickY)),
                  type: Math.random() > 0.5 ? 'tree' : 'grass',
                  size: 8 + Math.random() * 12,
                  health: 1.0
                });
                playSound('place');
                canvas.dataset.placeCount = (parseInt(canvas.dataset.placeCount || '0', 10) + 1).toString();
              } else if (sandboxToolVal === 'erase') {
                var eraseDist = 15;
                var erased = false;
                for (var epi = 0; epi < preyEntities.length && !erased; epi++) {
                  if (!preyEntities[epi].alive) continue;
                  var edx = preyEntities[epi].x - clickX;
                  var edy = preyEntities[epi].y - clickY;
                  if (Math.sqrt(edx * edx + edy * edy) < eraseDist) {
                    preyEntities[epi].alive = false;
                    erased = true;
                  }
                }
                for (var efi = 0; efi < predEntities.length && !erased; efi++) {
                  if (!predEntities[efi].alive) continue;
                  var efdx = predEntities[efi].x - clickX;
                  var efdy = predEntities[efi].y - clickY;
                  if (Math.sqrt(efdx * efdx + efdy * efdy) < eraseDist) {
                    predEntities[efi].alive = false;
                    erased = true;
                  }
                }
                for (var evi = vegetation.length - 1; evi >= 0 && !erased; evi--) {
                  var evdx = vegetation[evi].x - clickX;
                  var evdy = vegetation[evi].y - clickY;
                  if (Math.sqrt(evdx * evdx + evdy * evdy) < eraseDist) {
                    vegetation.splice(evi, 1);
                    erased = true;
                  }
                }
              }
              // "move" tool clicks are handled by mousedown/drag
            } else if (canvas._pendingClick && !sandboxToolVal) {
              canvas._pendingClick = false;
            }

            var dayPhase = (Math.sin(tick * 0.004) + 1) / 2;
            var isDay = dayPhase > 0.35;

            // Track night observation
            if (!isDay && !canvas._nightSeen) {
              canvas._nightSeen = true;
              try {
                playSound('dayNight');
                upd('nightObserved', true);
                setTimeout(function() { checkBadges({ nightObserved: true }); }, 100);
              } catch (e) { /* ignore */ }
            }

            // Day/night transition sound + ambient switchover
            if (isDay !== wasDay) {
              wasDay = isDay;
              playSound('dayNight');
              startEcoAmbient(isDay, preyEntities ? preyEntities.filter(function(p) { return p.alive; }).length : 30);
            }

            // ── Count alive ──
            var preyAlive = 0;
            var predAlive = 0;
            for (var ca = 0; ca < preyEntities.length; ca++) {
              if (preyEntities[ca].alive) preyAlive++;
            }
            for (var cb = 0; cb < predEntities.length; cb++) {
              if (predEntities[cb].alive) predAlive++;
            }

            // ── Vegetation health ──
            var vegHealth = Math.max(0.2, Math.min(1, 1 - (preyAlive / 120)));
            for (var vgi = 0; vgi < vegetation.length; vgi++) {
              vegetation[vgi].health = vegetation[vgi].health * 0.95 + vegHealth * 0.05;
            }

            // ── Prey movement ──
            for (var pri = 0; pri < preyEntities.length; pri++) {
              var p = preyEntities[pri];
              if (!p.alive) continue;
              p.hop += 0.08;
              p.x += p.vx;
              p.y += p.vy;
              if (p.x < 10) { p.x = 10; p.vx = Math.abs(p.vx); p.facing = 1; }
              if (p.x > cw - 10) { p.x = cw - 10; p.vx = -Math.abs(p.vx); p.facing = -1; }
              if (p.y < groundY) { p.y = groundY; p.vy = Math.abs(p.vy); }
              if (p.y > groundBottom) { p.y = groundBottom; p.vy = -Math.abs(p.vy); }
              if (Math.random() < 0.02) {
                p.vx = (Math.random() - 0.5) * 1.5;
                p.vy = (Math.random() - 0.5) * 0.8;
                p.facing = p.vx > 0 ? 1 : -1;
              }
            }

            // ── Predator movement & hunting ──
            for (var fxi = 0; fxi < predEntities.length; fxi++) {
              var f = predEntities[fxi];
              if (!f.alive) continue;
              f.x += f.vx;
              f.y += f.vy;
              if (f.x < 15) { f.x = 15; f.vx = Math.abs(f.vx); f.facing = 1; }
              if (f.x > cw - 15) { f.x = cw - 15; f.vx = -Math.abs(f.vx); f.facing = -1; }
              if (f.y < groundY) { f.y = groundY; f.vy = Math.abs(f.vy); }
              if (f.y > groundBottom) { f.y = groundBottom; f.vy = -Math.abs(f.vy); }

              f.hunting = false;
              var nearDist = 100;
              var nearPrey = null;
              for (var np = 0; np < preyEntities.length; np++) {
                if (!preyEntities[np].alive) continue;
                var dx = preyEntities[np].x - f.x;
                var dy = preyEntities[np].y - f.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < nearDist) {
                  nearDist = dist;
                  nearPrey = preyEntities[np];
                }
              }

              if (nearPrey) {
                f.hunting = true;
                var chDx = nearPrey.x - f.x;
                var chDy = nearPrey.y - f.y;
                var chDist = Math.sqrt(chDx * chDx + chDy * chDy);
                if (chDist > 0) {
                  f.vx = f.vx * 0.9 + (chDx / chDist) * 0.4;
                  f.vy = f.vy * 0.9 + (chDy / chDist) * 0.3;
                }
                f.facing = chDx > 0 ? 1 : -1;

                if (chDist < 6) {
                  nearPrey.alive = false;
                  playSound('predation');
                  for (var cp = 0; cp < 5; cp++) {
                    catchParticles.push({
                      x: nearPrey.x, y: nearPrey.y,
                      vx: (Math.random() - 0.5) * 3,
                      vy: -Math.random() * 3,
                      life: 1.0,
                      color: '#fca5a5'
                    });
                  }
                }
              } else {
                if (Math.random() < 0.02) {
                  f.vx = (Math.random() - 0.5) * 1.0;
                  f.vy = (Math.random() - 0.5) * 0.6;
                  f.facing = f.vx > 0 ? 1 : -1;
                }
              }
            }

            // ── Catch particle updates ──
            for (var cpi = catchParticles.length - 1; cpi >= 0; cpi--) {
              var part = catchParticles[cpi];
              part.x += part.vx;
              part.y += part.vy;
              part.vy += 0.1;
              part.life -= 0.03;
              if (part.life <= 0) {
                catchParticles.splice(cpi, 1);
              }
            }

            // ── Bug movement ──
            for (var abi = 0; abi < bugs.length; abi++) {
              var bug = bugs[abi];
              bug.phase += 0.05;
              bug.x += bug.vx + Math.sin(bug.phase) * 0.3;
              bug.y += bug.vy + Math.cos(bug.phase * 0.7) * 0.2;
              if (bug.x < -10) bug.x = cw + 10;
              if (bug.x > cw + 10) bug.x = -10;
              if (bug.y < 20) bug.vy = Math.abs(bug.vy);
              if (bug.y > ch - 10) bug.vy = -Math.abs(bug.vy);
              if (Math.random() < 0.01) {
                bug.vx = (Math.random() - 0.5) * 0.8;
                bug.vy = (Math.random() - 0.5) * 0.5;
              }
            }

            // ── Cloud movement ──
            for (var cli = 0; cli < clouds.length; cli++) {
              clouds[cli].x += clouds[cli].speed;
              if (clouds[cli].x > cw + 60) clouds[cli].x = -80;
            }

            // ── Population dynamics (every 200 ticks) ──
            if (tick % 200 === 0) {
              // Recount alive
              preyAlive = 0;
              predAlive = 0;
              for (var rc1 = 0; rc1 < preyEntities.length; rc1++) { if (preyEntities[rc1].alive) preyAlive++; }
              for (var rc2 = 0; rc2 < predEntities.length; rc2++) { if (predEntities[rc2].alive) predAlive++; }

              // Prey reproduction (with carrying capacity and drought modifier)
              if (preyAlive < carryK) {
                var newPreyCount = Math.min(5, Math.floor(preyAlive * 0.15 * droughtPreyReproMod));
                for (var rpi = 0; rpi < preyEntities.length && newPreyCount > 0; rpi++) {
                  if (!preyEntities[rpi].alive) {
                    preyEntities[rpi].alive = true;
                    preyEntities[rpi].x = Math.random() * cw;
                    preyEntities[rpi].y = groundY + Math.random() * (groundBottom - groundY);
                    preyEntities[rpi].vx = (Math.random() - 0.5) * 1.2;
                    preyEntities[rpi].vy = (Math.random() - 0.5) * 0.8;
                    newPreyCount--;
                    playSound('birth');
                  }
                }
              }

              // Predator starvation
              if (predAlive > 2 && Math.random() < 0.2) {
                for (var svi = predEntities.length - 1; svi >= 0; svi--) {
                  if (predEntities[svi].alive) {
                    predEntities[svi].alive = false;
                    break;
                  }
                }
              }

              // Predator reproduction
              if (preyAlive > 20 && Math.random() < 0.3) {
                for (var rfi = 0; rfi < predEntities.length; rfi++) {
                  if (!predEntities[rfi].alive) {
                    predEntities[rfi].alive = true;
                    predEntities[rfi].x = Math.random() * cw;
                    predEntities[rfi].y = groundY + Math.random() * (groundBottom - groundY);
                    predEntities[rfi].vx = (Math.random() - 0.5) * 0.8;
                    predEntities[rfi].vy = (Math.random() - 0.5) * 0.5;
                    playSound('birth');
                    break;
                  }
                }
              }
            }

            // ── Track population history (every 10 ticks) ──
            if (tick % 10 === 0) {
              // Recount
              var phPrey = 0, phPred = 0;
              for (var ph1 = 0; ph1 < preyEntities.length; ph1++) { if (preyEntities[ph1].alive) phPrey++; }
              for (var ph2 = 0; ph2 < predEntities.length; ph2++) { if (predEntities[ph2].alive) phPred++; }
              popHistory.push({
                prey: phPrey, pred: phPred,
                vegHealth: vegHealth, dayPhase: dayPhase
              });
              if (popHistory.length > 200) popHistory.shift();
            }

            // Push to React state every 50 ticks
            if (tick % 50 === 0) {
              try {
                upd('livePopHistory', popHistory.slice());
              } catch (e) { /* ignore */ }

            // Check ecology challenges
            if (popHistory.length > 20 && canvas._checkEcoChallenges) {
              try { canvas._checkEcoChallenges(popHistory.slice()); } catch(e) {}
            }

            }

            // ── Auto-observation generation (every 250 ticks) ──
            if (tick % 250 === 0) {
              var obsPrey = 0, obsPred = 0;
              for (var ob1 = 0; ob1 < preyEntities.length; ob1++) { if (preyEntities[ob1].alive) obsPrey++; }
              for (var ob2 = 0; ob2 < predEntities.length; ob2++) { if (predEntities[ob2].alive) obsPred++; }
              var obsText = '\uD83D\uDD2C Ecosystem running -- observe the predator-prey cycle.';

              // Check recent event
              var recentEvent = canvas.dataset.lastEventName || '';
              if (recentEvent && tick - parseInt(canvas.dataset.lastEventTick || '0', 10) < 300) {
                obsText = '\u26A1 ' + recentEvent + ' struck! Watch how the ecosystem responds.';
              } else if (obsPrey > 40 && popHistory.length > 2 && popHistory[popHistory.length - 1].prey > popHistory[Math.max(0, popHistory.length - 3)].prey) {
                obsText = '\uD83D\uDC07 Rabbit population is booming -- vegetation under pressure!';
              } else if (obsPrey < 10) {
                obsText = '\u26A0\uFE0F Rabbit population critically low -- foxes may starve soon.';
              } else if (obsPred > 15 && obsPrey < 20) {
                obsText = '\uD83E\uDD8A Too many predators for the available prey -- expect a crash.';
              } else if (obsPred < 3) {
                obsText = '\uD83E\uDD8A Fox population dangerously low -- rabbits may overpopulate.';
              } else if (vegHealth < 0.3) {
                obsText = '\uD83C\uDF3F Vegetation severely degraded from overgrazing.';
              } else if (!isDay) {
                obsText = '\uD83C\uDF19 Nighttime -- foxes hunt more effectively in the dark.';
              }

              canvas.dataset.observation = obsText;
              try {
                upd('lastObservation', obsText);
              } catch (e) { /* ignore */ }
            }
          } // end speed loop

          // ═══════════════════════════════════
          // RENDERING (always runs, even when paused)
          // ═══════════════════════════════════

          var dayPhaseR = (Math.sin(tick * 0.004) + 1) / 2;
          var isDayR = dayPhaseR > 0.35;

          // Biome colors
          var biomeId = canvas.dataset.biome || 'grassland';
          var bC = BIOME_COLORS[biomeId] || BIOME_COLORS.grassland;



          // ── Sky gradient (biome-aware) ──
          var skyGrad = ctxC.createLinearGradient(0, 0, 0, ch * 0.5);
          var bSky = bC.skyDay;
          if (isDayR) {
            var dayBright = Math.min(1, dayPhaseR * 1.5);
            skyGrad.addColorStop(0, 'rgb(' + Math.round(bSky[0]+(255-bSky[0])*dayBright*0.3) + ',' + Math.round(bSky[1]+(255-bSky[1])*dayBright*0.2) + ',' + Math.round(bSky[2]+(255-bSky[2])*dayBright*0.15) + ')');
            skyGrad.addColorStop(1, 'rgb(' + Math.round(Math.min(255,bSky[0]+50)+(205-bSky[0])*dayBright*0.2) + ',' + Math.round(Math.min(255,bSky[1]+40)+(215-bSky[1])*dayBright*0.15) + ',' + Math.round(Math.min(255,bSky[2]+30)+(225-bSky[2])*dayBright*0.1) + ')');
          } else {
            skyGrad.addColorStop(0, bC.skyNight);
            skyGrad.addColorStop(1, bC.skyNightEnd);
          }
          ctxC.fillStyle = skyGrad;
          ctxC.fillRect(0, 0, cw, ch * 0.5);


          // ── Stars at night ──
          if (!isDayR) {
            for (var si2 = 0; si2 < stars.length; si2++) {
              var star = stars[si2];
              var twinkle = 0.3 + 0.7 * Math.abs(Math.sin(tick * 0.02 + star.twinkle));
              ctxC.globalAlpha = twinkle;
              ctxC.fillStyle = '#fff';
              ctxC.beginPath();
              ctxC.arc(star.x, star.y, 1 + Math.random() * 0.5, 0, Math.PI * 2);
              ctxC.fill();
            }
            ctxC.globalAlpha = 1;
          }

          // ── Sun / Moon ──
          if (isDayR) {
            var sunX = cw * 0.8;
            var sunY = 30 + (1 - dayPhaseR) * 20;
            ctxC.save();
            ctxC.shadowColor = '#fbbf24';
            ctxC.shadowBlur = 30;
            ctxC.fillStyle = '#fbbf24';
            ctxC.beginPath();
            ctxC.arc(sunX, sunY, 18, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.strokeStyle = 'rgba(251,191,36,0.3)';
            ctxC.lineWidth = 2;
            for (var ri = 0; ri < 8; ri++) {
              var angle = (ri / 8) * Math.PI * 2 + tick * 0.005;
              ctxC.beginPath();
              ctxC.moveTo(sunX + Math.cos(angle) * 22, sunY + Math.sin(angle) * 22);
              ctxC.lineTo(sunX + Math.cos(angle) * 30, sunY + Math.sin(angle) * 30);
              ctxC.stroke();
            }
            ctxC.restore();
          } else {
            var moonX = cw * 0.15;
            var moonY = 30;
            ctxC.save();
            ctxC.shadowColor = '#e2e8f0';
            ctxC.shadowBlur = 20;
            ctxC.fillStyle = '#e2e8f0';
            ctxC.beginPath();
            ctxC.arc(moonX, moonY, 14, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.fillStyle = '#0f172a';
            ctxC.beginPath();
            ctxC.arc(moonX + 5, moonY - 2, 12, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.restore();
          }

          // ── Clouds ──
          for (var cli2 = 0; cli2 < clouds.length; cli2++) {
            var cloud = clouds[cli2];
            ctxC.globalAlpha = isDayR ? 0.7 : 0.15;
            ctxC.fillStyle = isDayR ? '#fff' : '#475569';
            ctxC.beginPath();
            ctxC.arc(cloud.x, cloud.y, cloud.w * 0.25, 0, Math.PI * 2);
            ctxC.arc(cloud.x + cloud.w * 0.2, cloud.y - 6, cloud.w * 0.2, 0, Math.PI * 2);
            ctxC.arc(cloud.x + cloud.w * 0.4, cloud.y - 2, cloud.w * 0.22, 0, Math.PI * 2);
            ctxC.arc(cloud.x + cloud.w * 0.6, cloud.y, cloud.w * 0.18, 0, Math.PI * 2);
            ctxC.fill();
          }
          ctxC.globalAlpha = 1;

          // ── Ground: rolling hills (biome-aware) ──
          var groundGrad = ctxC.createLinearGradient(0, ch * 0.45, 0, ch);
          var gClr = isDayR ? bC.groundDay : bC.groundNight;
          groundGrad.addColorStop(0, gClr[0]);
          groundGrad.addColorStop(0.5, gClr[1]);
          groundGrad.addColorStop(1, gClr[2]);

          ctxC.fillStyle = groundGrad;
          ctxC.beginPath();
          ctxC.moveTo(0, ch * 0.5);
          for (var gx = 0; gx <= cw; gx += 2) {
            var gy = ch * 0.48 + Math.sin(gx * 0.015) * 8 + Math.sin(gx * 0.007 + 1) * 12;
            ctxC.lineTo(gx, gy);
          }
          ctxC.lineTo(cw, ch);
          ctxC.lineTo(0, ch);
          ctxC.closePath();
          ctxC.fill();

          // ── Vegetation rendering ──
          for (var vgi2 = 0; vgi2 < vegetation.length; vgi2++) {
            var veg2 = vegetation[vgi2];
            ctxC.save();
            ctxC.translate(veg2.x, veg2.y);

            if (veg2.type === 'tree') {
              var barkGrad = ctxC.createLinearGradient(-2, 0, 2, 0);
              barkGrad.addColorStop(0, '#92400e');
              barkGrad.addColorStop(0.5, '#78350f');
              barkGrad.addColorStop(1, '#92400e');
              ctxC.fillStyle = barkGrad;
              ctxC.fillRect(-2, -veg2.size * 0.3, 4, veg2.size * 0.5);

              var cAlpha = isDayR ? veg2.health : veg2.health * 0.5;
              var canopyColors = [
                'rgba(' + Math.round(34 * cAlpha + 20) + ',' + Math.round(197 * cAlpha + 30) + ',' + Math.round(94 * cAlpha + 20) + ',0.9)',
                'rgba(' + Math.round(22 * cAlpha + 30) + ',' + Math.round(163 * cAlpha + 40) + ',' + Math.round(74 * cAlpha + 25) + ',0.8)',
                'rgba(' + Math.round(74 * cAlpha + 10) + ',' + Math.round(222 * cAlpha + 20) + ',' + Math.round(128 * cAlpha + 15) + ',0.7)'
              ];
              var offsets = [{ dx: 0, dy: -veg2.size * 0.5, r: veg2.size * 0.35 }, { dx: -3, dy: -veg2.size * 0.4, r: veg2.size * 0.28 }, { dx: 3, dy: -veg2.size * 0.45, r: veg2.size * 0.3 }];
              for (var li = 0; li < 3; li++) {
                ctxC.fillStyle = canopyColors[li];
                ctxC.beginPath();
                ctxC.arc(offsets[li].dx, offsets[li].dy, offsets[li].r, 0, Math.PI * 2);
                ctxC.fill();
              }

              if (veg2.health > 0.6) {
                ctxC.fillStyle = '#fbbf24';
                for (var fri = 0; fri < 3; fri++) {
                  var fx = (Math.random() - 0.5) * veg2.size * 0.4;
                  var fy = -veg2.size * 0.4 + (Math.random() - 0.5) * veg2.size * 0.3;
                  ctxC.beginPath();
                  ctxC.arc(fx, fy, 1.5, 0, Math.PI * 2);
                  ctxC.fill();
                }
              }
            } else {
              ctxC.strokeStyle = isDayR
                ? 'rgba(' + Math.round(34 + 40 * veg2.health) + ',' + Math.round(140 + 57 * veg2.health) + ',60,0.8)'
                : 'rgba(20,80,40,0.6)';
              ctxC.lineWidth = 1.5;
              for (var gi2 = 0; gi2 < 4; gi2++) {
                var gxOff = (gi2 - 1.5) * 3;
                var sway = Math.sin(tick * 0.03 + veg2.x + gi2) * 2;
                ctxC.beginPath();
                ctxC.moveTo(gxOff, 0);
                ctxC.quadraticCurveTo(gxOff + sway, -veg2.size * 0.5, gxOff + sway * 1.5, -veg2.size * 0.8);
                ctxC.stroke();
                if (veg2.health > 0.5) {
                  ctxC.fillStyle = '#d4a574';
                  ctxC.beginPath();
                  ctxC.arc(gxOff + sway * 1.5, -veg2.size * 0.8, 1.5, 0, Math.PI * 2);
                  ctxC.fill();
                }
              }
            }
            ctxC.restore();
          }

          // ── Prey (rabbits) rendering ──
          for (var pri2 = 0; pri2 < preyEntities.length; pri2++) {
            var p2 = preyEntities[pri2];
            if (!p2.alive) continue;

            var hopAmt = Math.abs(Math.sin(p2.hop)) * 3;
            var squash = 1 + Math.sin(p2.hop) * 0.1;

            ctxC.save();
            ctxC.translate(p2.x, p2.y - hopAmt);
            ctxC.scale(p2.facing, 1);
            ctxC.scale(1, 1 / squash);

            // Shadow
            ctxC.fillStyle = 'rgba(0,0,0,0.15)';
            ctxC.beginPath();
            ctxC.ellipse(0, hopAmt * squash + 4, 6, 2, 0, 0, Math.PI * 2);
            ctxC.fill();

            // Body with fur gradient
            var furGrad = ctxC.createRadialGradient(0, 0, 1, 0, 0, 8);
            furGrad.addColorStop(0, '#e5e7eb');
            furGrad.addColorStop(1, '#9ca3af');
            ctxC.fillStyle = furGrad;
            ctxC.beginPath();
            ctxC.ellipse(0, 0, 7, 5.5 * squash, 0, 0, Math.PI * 2);
            ctxC.fill();

            // Belly highlight
            ctxC.fillStyle = 'rgba(255,255,255,0.3)';
            ctxC.beginPath();
            ctxC.ellipse(0, 2, 4, 3, 0, 0, Math.PI * 2);
            ctxC.fill();

            // Head
            ctxC.fillStyle = '#d1d5db';
            ctxC.beginPath();
            ctxC.arc(6, -3, 4, 0, Math.PI * 2);
            ctxC.fill();

            // Ears
            ctxC.fillStyle = '#d1d5db';
            ctxC.beginPath();
            ctxC.ellipse(5, -9, 1.5, 4, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.beginPath();
            ctxC.ellipse(7, -9, 1.5, 4, 0.2, 0, Math.PI * 2);
            ctxC.fill();

            // Inner ears (pink)
            ctxC.fillStyle = '#fca5a5';
            ctxC.beginPath();
            ctxC.ellipse(5, -9, 0.8, 2.5, -0.2, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.beginPath();
            ctxC.ellipse(7, -9, 0.8, 2.5, 0.2, 0, Math.PI * 2);
            ctxC.fill();

            // Eye
            ctxC.fillStyle = '#1f2937';
            ctxC.beginPath();
            ctxC.arc(8, -3.5, 1.2, 0, Math.PI * 2);
            ctxC.fill();
            // Specular
            ctxC.fillStyle = '#fff';
            ctxC.beginPath();
            ctxC.arc(8.3, -4, 0.5, 0, Math.PI * 2);
            ctxC.fill();

            // Nose
            ctxC.fillStyle = '#fca5a5';
            ctxC.beginPath();
            ctxC.arc(9.5, -2.5, 1, 0, Math.PI * 2);
            ctxC.fill();

            // White tail tuft
            ctxC.fillStyle = '#fff';
            ctxC.beginPath();
            ctxC.arc(-7, -1, 2.5, 0, Math.PI * 2);
            ctxC.fill();

            // Front paws when hopping
            if (Math.sin(p2.hop) > 0.3) {
              ctxC.fillStyle = '#d1d5db';
              ctxC.beginPath();
              ctxC.ellipse(4, 5, 1.5, 1, 0, 0, Math.PI * 2);
              ctxC.fill();
              ctxC.beginPath();
              ctxC.ellipse(6, 5, 1.5, 1, 0, 0, Math.PI * 2);
              ctxC.fill();
            }

            ctxC.restore();
          }

          // ── Predators (foxes) rendering ──
          for (var fxi2 = 0; fxi2 < predEntities.length; fxi2++) {
            var f2 = predEntities[fxi2];
            if (!f2.alive) continue;

            ctxC.save();
            ctxC.translate(f2.x, f2.y);
            ctxC.scale(f2.facing, 1);

            // Shadow
            ctxC.fillStyle = 'rgba(0,0,0,0.15)';
            ctxC.beginPath();
            ctxC.ellipse(0, 5, 9, 2.5, 0, 0, Math.PI * 2);
            ctxC.fill();

            var crouchY = f2.hunting ? 2 : 0;

            // Bushy tail
            ctxC.fillStyle = '#ea580c';
            ctxC.beginPath();
            ctxC.moveTo(-8, crouchY - 2);
            ctxC.quadraticCurveTo(-16, crouchY - 8, -14, crouchY + 1);
            ctxC.quadraticCurveTo(-12, crouchY + 4, -8, crouchY + 1);
            ctxC.fill();
            // White tail tip
            ctxC.fillStyle = '#fff';
            ctxC.beginPath();
            ctxC.arc(-14, crouchY - 2, 2.5, 0, Math.PI * 2);
            ctxC.fill();

            // Body with fur gradient
            var foxGrad = ctxC.createRadialGradient(0, crouchY, 2, 0, crouchY, 10);
            foxGrad.addColorStop(0, '#fb923c');
            foxGrad.addColorStop(1, '#ea580c');
            ctxC.fillStyle = foxGrad;
            ctxC.beginPath();
            ctxC.ellipse(0, crouchY, 9, 6, 0, 0, Math.PI * 2);
            ctxC.fill();

            // Belly
            ctxC.fillStyle = 'rgba(255,255,255,0.25)';
            ctxC.beginPath();
            ctxC.ellipse(0, crouchY + 3, 5, 3, 0, 0, Math.PI * 2);
            ctxC.fill();

            // Head
            ctxC.fillStyle = '#fb923c';
            ctxC.beginPath();
            ctxC.arc(8, crouchY - 3, 5, 0, Math.PI * 2);
            ctxC.fill();

            // Pointed snout
            ctxC.fillStyle = '#fb923c';
            ctxC.beginPath();
            ctxC.moveTo(12, crouchY - 4);
            ctxC.lineTo(16, crouchY - 2);
            ctxC.lineTo(12, crouchY);
            ctxC.fill();

            // Nose
            ctxC.fillStyle = '#1f2937';
            ctxC.beginPath();
            ctxC.arc(15.5, crouchY - 2, 1.2, 0, Math.PI * 2);
            ctxC.fill();

            // Ears (triangular)
            ctxC.fillStyle = '#ea580c';
            ctxC.beginPath();
            ctxC.moveTo(5, crouchY - 7);
            ctxC.lineTo(3, crouchY - 14);
            ctxC.lineTo(7, crouchY - 8);
            ctxC.fill();
            ctxC.beginPath();
            ctxC.moveTo(10, crouchY - 7);
            ctxC.lineTo(9, crouchY - 14);
            ctxC.lineTo(12, crouchY - 8);
            ctxC.fill();
            // Dark ear tips
            ctxC.fillStyle = '#78350f';
            ctxC.beginPath();
            ctxC.moveTo(3.5, crouchY - 12);
            ctxC.lineTo(3, crouchY - 14);
            ctxC.lineTo(5, crouchY - 11);
            ctxC.fill();
            ctxC.beginPath();
            ctxC.moveTo(9.5, crouchY - 12);
            ctxC.lineTo(9, crouchY - 14);
            ctxC.lineTo(11, crouchY - 11);
            ctxC.fill();

            // Eyes
            var eyeColor = f2.hunting ? '#ef4444' : '#f59e0b';
            ctxC.fillStyle = eyeColor;
            ctxC.beginPath();
            ctxC.arc(9, crouchY - 4, 1.8, 0, Math.PI * 2);
            ctxC.fill();
            // Vertical pupil
            ctxC.fillStyle = '#1f2937';
            ctxC.fillRect(8.6, crouchY - 5.5, 0.8, 3);
            // Eye glint
            ctxC.fillStyle = '#fff';
            ctxC.beginPath();
            ctxC.arc(9.5, crouchY - 4.5, 0.5, 0, Math.PI * 2);
            ctxC.fill();

            // Front legs with dark paws
            ctxC.fillStyle = '#ea580c';
            ctxC.fillRect(3, crouchY + 4, 2, 5);
            ctxC.fillRect(7, crouchY + 4, 2, 5);
            ctxC.fillStyle = '#78350f';
            ctxC.fillRect(3, crouchY + 8, 2, 2);
            ctxC.fillRect(7, crouchY + 8, 2, 2);

            // Hunting indicator (pulsing red dot)
            if (f2.hunting) {
              var pulseAlpha = 0.4 + 0.6 * Math.abs(Math.sin(tick * 0.1));
              ctxC.fillStyle = 'rgba(239,68,68,' + pulseAlpha.toFixed(2) + ')';
              ctxC.beginPath();
              ctxC.arc(0, crouchY - 16, 3, 0, Math.PI * 2);
              ctxC.fill();
            }

            ctxC.restore();
          }

          // ── Catch particles rendering ──
          for (var cpi2 = 0; cpi2 < catchParticles.length; cpi2++) {
            var part2 = catchParticles[cpi2];
            ctxC.globalAlpha = part2.life;
            ctxC.fillStyle = part2.color;
            ctxC.beginPath();
            ctxC.arc(part2.x, part2.y, 2, 0, Math.PI * 2);
            ctxC.fill();
          }
          ctxC.globalAlpha = 1;

          // ── Ambient creatures rendering ──
          for (var abi2 = 0; abi2 < bugs.length; abi2++) {
            var bug2 = bugs[abi2];
            ctxC.save();
            ctxC.translate(bug2.x, bug2.y);

            if (isDayR) {
              var wingFlap = Math.sin(tick * 0.15 + abi2) * 0.4;
              ctxC.fillStyle = bug2.color;
              ctxC.globalAlpha = 0.8;
              ctxC.save();
              ctxC.scale(1, 0.5 + wingFlap);
              ctxC.beginPath();
              ctxC.ellipse(-2, 0, 3, 4, -0.3, 0, Math.PI * 2);
              ctxC.fill();
              ctxC.restore();
              ctxC.save();
              ctxC.scale(1, 0.5 + wingFlap);
              ctxC.beginPath();
              ctxC.ellipse(2, 0, 3, 4, 0.3, 0, Math.PI * 2);
              ctxC.fill();
              ctxC.restore();
              ctxC.fillStyle = 'rgba(255,255,255,0.5)';
              ctxC.beginPath();
              ctxC.arc(-2, 0, 1, 0, Math.PI * 2);
              ctxC.fill();
              ctxC.beginPath();
              ctxC.arc(2, 0, 1, 0, Math.PI * 2);
              ctxC.fill();
              ctxC.fillStyle = '#1f2937';
              ctxC.fillRect(-0.5, -2, 1, 4);
              ctxC.globalAlpha = 1;
            } else {
              var glow = 0.3 + 0.7 * Math.abs(Math.sin(tick * 0.04 + abi2 * 2));
              ctxC.shadowColor = '#86efac';
              ctxC.shadowBlur = 8 * glow;
              ctxC.fillStyle = 'rgba(134,239,172,' + glow.toFixed(2) + ')';
              ctxC.beginPath();
              ctxC.arc(0, 0, 2, 0, Math.PI * 2);
              ctxC.fill();
              ctxC.shadowBlur = 0;
            }
            ctxC.restore();
          }

          // ── Event flash overlay ──
          var curFlash = parseInt(canvas.dataset.eventFlash || '0', 10);
          var curColor = canvas.dataset.eventColor || '';
          if (curFlash > 0) {
            var flashAlpha = curFlash / 60;
            ctxC.save();
            ctxC.globalAlpha = flashAlpha;
            ctxC.fillStyle = curColor || 'rgba(255,255,255,0.3)';
            ctxC.fillRect(0, 0, cw, ch);
            ctxC.restore();
            canvas.dataset.eventFlash = (curFlash - 1).toString();
          }

          // ── HUD: top-left overlay ──
          var hudPreyAlive = 0, hudPredAlive = 0;
          for (var ha = 0; ha < preyEntities.length; ha++) { if (preyEntities[ha].alive) hudPreyAlive++; }
          for (var hb = 0; hb < predEntities.length; hb++) { if (predEntities[hb].alive) hudPredAlive++; }

          ctxC.fillStyle = 'rgba(15,23,42,0.75)';
          var hudW = 130, hudH = 56;
          ctxC.beginPath();
          ctxC.moveTo(8 + 6, 8);
          ctxC.arcTo(8 + hudW, 8, 8 + hudW, 8 + hudH, 6);
          ctxC.arcTo(8 + hudW, 8 + hudH, 8, 8 + hudH, 6);
          ctxC.arcTo(8, 8 + hudH, 8, 8, 6);
          ctxC.arcTo(8, 8, 8 + hudW, 8, 6);
          ctxC.fill();

          ctxC.font = '10px sans-serif';
          ctxC.fillStyle = '#94a3b8';
          ctxC.fillText('\uD83D\uDC07 Prey: ' + hudPreyAlive, 14, 24);
          ctxC.fillText('\uD83E\uDD8A Predators: ' + hudPredAlive, 14, 38);

          // Population bars
          var barX = 100, barW = 30;
          ctxC.fillStyle = '#334155';
          ctxC.fillRect(barX, 16, barW, 6);
          ctxC.fillStyle = '#22c55e';
          ctxC.fillRect(barX, 16, barW * Math.min(1, hudPreyAlive / 60), 6);
          ctxC.fillStyle = '#334155';
          ctxC.fillRect(barX, 30, barW, 6);
          ctxC.fillStyle = '#ef4444';
          ctxC.fillRect(barX, 30, barW * Math.min(1, hudPredAlive / 25), 6);

          // Day/night indicator
          ctxC.fillStyle = '#94a3b8';
          ctxC.fillText(isDayR ? '\u2600 Day' : '\uD83C\uDF19 Night', 14, 52);

          // ── Sandbox tool indicator in HUD ──
          if (sandboxToolVal) {
            ctxC.fillStyle = 'rgba(16,185,129,0.85)';
            ctxC.font = 'bold 9px sans-serif';
            ctxC.fillText('Tool: ' + sandboxToolVal.toUpperCase(), 14, 62);
          }

          // ── PAUSED overlay ──
          if (paused) {
            ctxC.save();
            ctxC.fillStyle = 'rgba(15,23,42,0.4)';
            ctxC.fillRect(0, 0, cw, ch);
            ctxC.font = 'bold 24px sans-serif';
            ctxC.textAlign = 'center';
            ctxC.fillStyle = 'rgba(255,255,255,0.85)';
            ctxC.fillText('\u23F8 PAUSED', cw / 2, ch / 2);
            ctxC.textAlign = 'start';
            ctxC.restore();
          }

          // ── Live mini-graph (top-right) ──
          if (popHistory.length > 5) {
            var mgX = cw - 128, mgY = 8, mgW = 120, mgH = 50;
            ctxC.fillStyle = 'rgba(15,23,42,0.75)';
            ctxC.beginPath();
            ctxC.moveTo(mgX + 6, mgY);
            ctxC.arcTo(mgX + mgW, mgY, mgX + mgW, mgY + mgH, 6);
            ctxC.arcTo(mgX + mgW, mgY + mgH, mgX, mgY + mgH, 6);
            ctxC.arcTo(mgX, mgY + mgH, mgX, mgY, 6);
            ctxC.arcTo(mgX, mgY, mgX + mgW, mgY, 6);
            ctxC.fill();

            ctxC.strokeStyle = 'rgba(71,85,105,0.3)';
            ctxC.lineWidth = 0.5;
            for (var mgi3 = 1; mgi3 < 3; mgi3++) {
              ctxC.beginPath();
              ctxC.moveTo(mgX + 4, mgY + mgi3 * (mgH / 3));
              ctxC.lineTo(mgX + mgW - 4, mgY + mgi3 * (mgH / 3));
              ctxC.stroke();
            }

            var maxPop = 1;
            for (var mpi = 0; mpi < popHistory.length; mpi++) {
              if (popHistory[mpi].prey > maxPop) maxPop = popHistory[mpi].prey;
              if (popHistory[mpi].pred > maxPop) maxPop = popHistory[mpi].pred;
            }
            // Ensure carrying capacity visible on mini-graph
            if (carryK > maxPop) maxPop = carryK;

            // Prey line
            ctxC.strokeStyle = '#22c55e';
            ctxC.lineWidth = 1.5;
            ctxC.beginPath();
            for (var mli = 0; mli < popHistory.length; mli++) {
              var mx = mgX + 4 + (mli / (popHistory.length - 1)) * (mgW - 8);
              var my = mgY + mgH - 4 - (popHistory[mli].prey / maxPop) * (mgH - 8);
              if (mli === 0) ctxC.moveTo(mx, my); else ctxC.lineTo(mx, my);
            }
            ctxC.stroke();

            // Pred line
            ctxC.strokeStyle = '#ef4444';
            ctxC.lineWidth = 1.5;
            ctxC.beginPath();
            for (var mli2 = 0; mli2 < popHistory.length; mli2++) {
              var mx2 = mgX + 4 + (mli2 / (popHistory.length - 1)) * (mgW - 8);
              var my2 = mgY + mgH - 4 - (popHistory[mli2].pred / maxPop) * (mgH - 8);
              if (mli2 === 0) ctxC.moveTo(mx2, my2); else ctxC.lineTo(mx2, my2);
            }
            ctxC.stroke();

            // Carrying capacity dashed line on mini-graph
            var kcY = mgY + mgH - 4 - (carryK / maxPop) * (mgH - 8);
            ctxC.strokeStyle = '#f59e0b';
            ctxC.lineWidth = 1;
            ctxC.setLineDash([3, 3]);
            ctxC.beginPath();
            ctxC.moveTo(mgX + 4, kcY);
            ctxC.lineTo(mgX + mgW - 4, kcY);
            ctxC.stroke();
            ctxC.setLineDash([]);

            // Legend dots
            ctxC.fillStyle = '#22c55e';
            ctxC.beginPath();
            ctxC.arc(mgX + 8, mgY + mgH - 2, 2, 0, Math.PI * 2);
            ctxC.fill();
            ctxC.fillStyle = '#ef4444';
            ctxC.beginPath();
            ctxC.arc(mgX + 20, mgY + mgH - 2, 2, 0, Math.PI * 2);
            ctxC.fill();
          }

          // ── Sandbox: cursor preview ──
          if (sandboxToolVal && canvas._mouseX >= 0 && canvas._mouseY >= 0) {
            ctxC.save();
            ctxC.globalAlpha = 0.4;
            if (sandboxToolVal === 'rabbit') {
              ctxC.fillStyle = '#d1d5db';
              ctxC.beginPath();
              ctxC.ellipse(canvas._mouseX, canvas._mouseY, 7, 5.5, 0, 0, Math.PI * 2);
              ctxC.fill();
              ctxC.fillStyle = '#d1d5db';
              ctxC.beginPath();
              ctxC.ellipse(canvas._mouseX + 3, canvas._mouseY - 9, 1.5, 4, 0, 0, Math.PI * 2);
              ctxC.fill();
            } else if (sandboxToolVal === 'fox') {
              ctxC.fillStyle = '#ea580c';
              ctxC.beginPath();
              ctxC.ellipse(canvas._mouseX, canvas._mouseY, 9, 6, 0, 0, Math.PI * 2);
              ctxC.fill();
            } else if (sandboxToolVal === 'tree') {
              ctxC.fillStyle = '#78350f';
              ctxC.fillRect(canvas._mouseX - 2, canvas._mouseY - 5, 4, 10);
              ctxC.fillStyle = '#22c55e';
              ctxC.beginPath();
              ctxC.arc(canvas._mouseX, canvas._mouseY - 10, 8, 0, Math.PI * 2);
              ctxC.fill();
            } else if (sandboxToolVal === 'erase') {
              ctxC.strokeStyle = '#ef4444';
              ctxC.lineWidth = 2;
              ctxC.beginPath();
              ctxC.arc(canvas._mouseX, canvas._mouseY, 15, 0, Math.PI * 2);
              ctxC.stroke();
              ctxC.beginPath();
              ctxC.moveTo(canvas._mouseX - 8, canvas._mouseY - 8);
              ctxC.lineTo(canvas._mouseX + 8, canvas._mouseY + 8);
              ctxC.stroke();
            } else if (sandboxToolVal === 'move') {
              ctxC.strokeStyle = '#60a5fa';
              ctxC.lineWidth = 2;
              ctxC.beginPath();
              ctxC.moveTo(canvas._mouseX, canvas._mouseY - 10);
              ctxC.lineTo(canvas._mouseX, canvas._mouseY + 10);
              ctxC.stroke();
              ctxC.beginPath();
              ctxC.moveTo(canvas._mouseX - 10, canvas._mouseY);
              ctxC.lineTo(canvas._mouseX + 10, canvas._mouseY);
              ctxC.stroke();
            }
            ctxC.restore();
          }

          animId = requestAnimationFrame(draw);
        };

        animId = requestAnimationFrame(draw);

        canvas._checkEcoChallenges = function(hist) {
          try { checkEcoChallenges(hist); } catch(e) {}
        };

        // Cleanup on canvas removal
        canvas._ecoCleanup = function() {
          if (animId) cancelAnimationFrame(animId);
          canvas.removeEventListener('mousemove', onMouseMove);
          canvas.removeEventListener('mousedown', onMouseDown);
          canvas.removeEventListener('mouseup', onMouseUp);
          canvas.removeEventListener('click', onClick);
        };
      };

      // ── Preset configurations ──
      var applyPreset = function(name) {
        var presets = {
          balanced:    { prey0: 80,  pred0: 30, preyBirth: 0.10, preyDeath: 0.01, predBirth: 0.01, predDeath: 0.10 },
          extinction:  { prey0: 20,  pred0: 50, preyBirth: 0.05, preyDeath: 0.02, predBirth: 0.02, predDeath: 0.05 },
          boom:        { prey0: 120, pred0: 10, preyBirth: 0.20, preyDeath: 0.005, predBirth: 0.005, predDeath: 0.15 },
          equilibrium: { prey0: 60,  pred0: 25, preyBirth: 0.08, preyDeath: 0.008, predBirth: 0.008, predDeath: 0.08 }
        };
        var p = presets[name];
        if (!p) return;
        var newPresetsUsed = Object.assign({}, presetsUsed);
        newPresetsUsed[name] = true;
        updMulti(Object.assign({}, p, { presetsUsed: newPresetsUsed, data: [], steps: 0 }));
        if (announceToSR) announceToSR('Preset ' + name + ' applied.');
        setTimeout(function() {
          checkBadges({ presetsUsed: newPresetsUsed });
        }, 100);
      };

      // ── Switch graph view ──
      var switchGraphView = function(view) {
        var newViews = Object.assign({}, graphViewsUsed);
        newViews[view] = true;
        updMulti({ ecoGraphView: view, graphViewsUsed: newViews });
        setTimeout(function() {
          checkBadges({ graphViewsUsed: newViews });
        }, 100);
      };

      // ── Quiz handling ──
      var answerQuiz = function(choiceIdx) {
        var currentQ = QUIZ_QUESTIONS[quizIndex % QUIZ_QUESTIONS.length];
        var correct = choiceIdx === currentQ.answer;
        var newCorrect = quizCorrect + (correct ? 1 : 0);
        var newTotal = quizTotal + 1;
        if (correct) {
          playSound('quizCorrect');
          updMulti({ quizAnswer: choiceIdx, quizFeedback: 'Correct! Great job!', quizCorrect: newCorrect, quizTotal: newTotal });
          if (typeof awardXP === 'function') awardXP('ecosystem', 10, 'quiz');
        } else {
          playSound('quizWrong');
          updMulti({ quizAnswer: choiceIdx, quizFeedback: 'Not quite. The correct answer was: ' + currentQ.choices[currentQ.answer], quizTotal: newTotal });
        }
        setTimeout(function() {
          checkBadges({ quizCorrect: newCorrect });
        }, 100);
      };

      var nextQuiz = function() {
        updMulti({ quizIndex: (quizIndex + 1) % QUIZ_QUESTIONS.length, quizAnswer: -1, quizFeedback: '' });
      };

      // ── AI Tutor ──
      var askAI = function(question) {
        if (!callGemini || aiLoading) return;
        upd('aiLoading', true);
        var band = gradeBand;
        var prompt = 'You are an ecology tutor for a ' +
          (band === 'k2' ? 'K-2 student (age 5-7)' : band === 'g35' ? '3rd-5th grader' : band === 'g68' ? '6th-8th grader' : '9th-12th grader') +
          '. Answer this question about predator-prey dynamics and ecosystems in 2-3 sentences appropriate for their level: ' + question;
        callGemini(prompt, true, false, 0.8).then(function(resp) {
          var newCount = aiUseCount + 1;
          updMulti({ aiResponse: resp, aiLoading: false, aiUseCount: newCount });
          setTimeout(function() {
            checkBadges({ aiUseCount: newCount });
          }, 100);
        }).catch(function() {
          updMulti({ aiResponse: 'Sorry, AI tutor is not available right now.', aiLoading: false });
        });
      };

      // ── TTS (Kokoro-first) ──
      var speakText = function(text) {
        if (callTTS) { try { callTTS(text); return; } catch(e) {} }
        if (window._kokoroTTS && window._kokoroTTS.speak) {
          window._kokoroTTS.speak(String(text),'af_heart',1).then(function(url){if(url){var a=new Audio(url);a.playbackRate=0.95;a.play();}}).catch(function(){});
          return;
        }
        if (window.speechSynthesis) { var utter=new SpeechSynthesisUtterance(text); utter.rate=0.9; window.speechSynthesis.speak(utter); }
      };

      // ── Snapshot ──
      var takeSnapshot = function() {
        playSound('snapshot');
        var snap = {
          tool: 'ecosystem',
          timestamp: Date.now(),
          prey0: prey0, pred0: pred0,
          preyBirth: preyBirth, preyDeath: preyDeath,
          predBirth: predBirth, predDeath: predDeath,
          carryingCapacity: carryingCapacity,
          dataLength: data ? data.length : 0,
          steps: steps
        };
        if (typeof setToolSnapshots === 'function') {
          setToolSnapshots(function(prev) {
            return (prev || []).concat([snap]);
          });
        }
        if (addToast) addToast('\uD83D\uDCF7 Snapshot saved!', 'success');
      };

      // ── NEW: Event trigger function ──
      var triggerEvent = function(eventName) {
        var canvasEl = document.querySelector('canvas[data-eco-canvas]');
        if (!canvasEl) return;

        // Check cooldown
        var lastCooldown = parseInt(canvasEl.dataset.eventCooldown || '0', 10);
        if (Date.now() - lastCooldown < 5000) {
          if (addToast) addToast('Events on cooldown. Wait a moment.', 'warning');
          return;
        }

        canvasEl.dataset.pendingEvent = eventName;
        canvasEl.dataset.eventCooldown = Date.now().toString();
        canvasEl.dataset.lastEventName = eventName.charAt(0).toUpperCase() + eventName.slice(1);
        canvasEl.dataset.lastEventTick = (parseInt(canvasEl.dataset.speed || '2', 10) * 100).toString();
        playSound('event');

        // Track events triggered for badge
        var newEvents = Object.assign({}, eventsTriggered);
        newEvents[eventName] = true;
        var newHistory = eventHistory.concat([{ name: eventName, time: Date.now() }]);
        updMulti({ eventsTriggered: newEvents, eventHistory: newHistory });

        if (addToast) addToast('\u26A1 Event: ' + eventName + ' triggered!', 'info');
        if (announceToSR) announceToSR(eventName + ' event triggered.');

        setTimeout(function() {
          checkBadges({ eventsTriggered: newEvents });
        }, 200);
      };

      // ── NEW: Sandbox click handler (read placeCount from canvas) ──
      var syncSandboxCount = function() {
        var canvasEl = document.querySelector('canvas[data-eco-canvas]');
        if (canvasEl) {
          var count = parseInt(canvasEl.dataset.placeCount || '0', 10);
          if (count > sandboxPlaceCount) {
            upd('sandboxPlaceCount', count);
            setTimeout(function() {
              checkBadges({ sandboxPlaceCount: count });
            }, 200);
          }
        }
      };

      // ═══════════════════════════════════════════
      // RENDER
      // ═══════════════════════════════════════════
      var presetNames = ['balanced', 'extinction', 'boom', 'equilibrium'];
      var presetLabels = ['\u2696\uFE0F Balanced', '\uD83D\uDCA0 Extinction', '\uD83D\uDCA5 Boom', '\uD83D\uDD04 Equilibrium'];

      // Current quiz question
      var currentQ = QUIZ_QUESTIONS[quizIndex % QUIZ_QUESTIONS.length];

      // Stats from simulation data
      var peakPrey = 0, peakPred = 0, finalRatio = '\u2014';
      if (data && data.length > 0) {
        for (var si2 = 0; si2 < data.length; si2++) {
          if (data[si2].prey > peakPrey) peakPrey = data[si2].prey;
          if (data[si2].pred > peakPred) peakPred = data[si2].pred;
        }
        var lastD = data[data.length - 1];
        if (lastD.pred > 0) {
          finalRatio = (lastD.prey / lastD.pred).toFixed(1) + ':1';
        }
      }

      var badgeCount = Object.keys(badges).length;

      // Speed label helper
      var speedLabel = function(spd) {
        if (spd <= 1) return '0.5x';
        if (spd === 2) return '1x';
        if (spd === 3) return '1.5x';
        if (spd === 4) return '2x';
        if (spd === 5) return '2.5x';
        return '3x';
      };

      // Sandbox tool definitions
      var sandboxTools = [
        { id: 'rabbit', icon: '\uD83D\uDC07', label: 'Place Rabbit' },
        { id: 'fox',    icon: '\uD83E\uDD8A', label: 'Place Fox' },
        { id: 'tree',   icon: '\uD83C\uDF33', label: 'Place Tree' },
        { id: 'erase',  icon: '\u274C',        label: 'Erase' },
        { id: 'move',   icon: '\u2194\uFE0F',  label: 'Move' }
      ];

      // Event definitions for buttons
      var eventDefs = [
        { id: 'drought',   icon: '\u2600\uFE0F',  label: 'Drought',   color: 'bg-amber-500' },
        { id: 'disease',   icon: '\uD83E\uDDA0',   label: 'Disease',   color: 'bg-green-600' },
        { id: 'foodBoom',  icon: '\uD83C\uDF31',   label: 'Food Boom', color: 'bg-emerald-500' },
        { id: 'migration', icon: '\uD83E\uDD85',   label: 'Migration', color: 'bg-blue-500' },
        { id: 'wildfire',  icon: '\uD83D\uDD25',   label: 'Wildfire',  color: 'bg-red-500' }
      ];

      return h('div', { className: 'space-y-3 pb-4' },

        // ── Header ──
        h('div', { className: 'flex items-center gap-2 mb-2' },
          h('button', {
            className: 'p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700',
            onClick: function() {
              var canvasEl = document.querySelector('canvas[data-eco-canvas]');
              if (canvasEl && canvasEl._ecoCleanup) canvasEl._ecoCleanup();
              setStemLabTool(null);
            },
            'aria-label': 'Back'
          }, h(ArrowLeft, { size: 18 })),
          h('span', { className: 'text-lg font-bold' }, '\uD83E\uDD8A Ecosystem Simulator'),
          h('span', { className: 'ml-auto px-2 py-0.5 text-[11px] font-bold bg-emerald-700 text-white rounded-full animate-pulse' }, 'LIVE'),
          h('span', { className: 'text-xs font-bold text-amber-600 dark:text-amber-400 ml-1' }, '\u2B50 ' + researchPoints + ' RP'),
        ),

        // ── Grade intro ──
        h('p', { className: 'text-xs text-slate-600 dark:text-slate-200 italic' }, getGradeIntro(gradeBand)),


        // ── Biome Selector ──
        h('div', { className: 'flex gap-1 mb-1' },
          Object.keys(BIOME_COLORS).map(function(bId) {
            var bInfo = BIOME_COLORS[bId];
            return h('button', { 'aria-label': 'Change Biome',
              key: bId,
              className: 'flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all border ' +
                (biome === bId
                  ? 'border-emerald-500 bg-emerald-700 text-white shadow-md'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-400'),
              onClick: function() { changeBiome(bId); }
            }, bInfo.emoji + ' ' + bInfo.name);
          })
        ),


        // ── Mode tabs (4 tabs now) ──
        h('div', { className: 'flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1', role: 'tablist', 'aria-label': 'Ecosystem Explorer sections' },
          ['explore', 'sandbox', 'quiz', 'badges'].map(function(t2) {
            var tabLabel = '';
            if (t2 === 'explore') tabLabel = '\uD83C\uDF3F Explore';
            else if (t2 === 'sandbox') tabLabel = '\uD83E\uDDEA Sandbox';
            else if (t2 === 'quiz') tabLabel = '\u2753 Quiz';
            else tabLabel = '\uD83C\uDFC5 Badges (' + badgeCount + '/' + BADGES.length + ')';
            return h('button', { key: t2,
              role: 'tab', 'aria-selected': tab === t2,
              className: 'flex-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-all ' +
                (tab === t2 ? 'bg-emerald-700 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'),
              onClick: function() {
                upd('tab', t2);
                // When switching to sandbox, set sandbox tool on canvas
                var canvasEl = document.querySelector('canvas[data-eco-canvas]');
                if (canvasEl) {
                  if (t2 === 'sandbox') {
                    canvasEl.dataset.sandboxTool = sandboxTool;
                  } else {
                    canvasEl.dataset.sandboxTool = '';
                  }
                }
              }
            }, tabLabel);
          })
        ),

        // ── Topic-accent hero band (per tab) ──
        (function() {
          var TAB_META = {
            explore: { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)', icon: '\uD83C\uDF3F', title: 'Explore the food web',          hint: 'Click any species to see what it eats and what eats it. Trophic-level cascades become obvious \u2014 remove a top predator and watch the system reorganize.' },
            sandbox: { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\uD83E\uDDEA', title: 'Sandbox \u2014 your ecosystem', hint: 'Drop in producers, consumers, and predators; watch population dynamics emerge. Lotka-Volterra cycles appear when you have one predator + one prey + nothing else.' },
            quiz:    { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '\u2753', title: 'Quiz \u2014 concepts in context',     hint: 'Multi-choice items on energy flow (10% rule), keystone species, biomagnification, succession. Each question links back to the explore + sandbox modes.' },
            badges:  { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '\uD83C\uDFC5', title: 'Badges \u2014 what you have learned', hint: 'Achievements track which ecological concepts you have demonstrated, not just visited. Trophic-cascade badge requires you to actually trigger one in the sandbox.' }
          };
          var meta = TAB_META[tab] || TAB_META.explore;
          return h('div', {
            className: 'mt-2',
            style: {
              padding: '12px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: '#475569', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // ═══ EXPLORE TAB ═══
        tab === 'explore' && h('div', { className: 'space-y-3' },

          // Canvas container
          h('div', { className: 'relative rounded-xl overflow-hidden border-2 border-emerald-400', style: { height: 320 } },
            h('canvas', { 
              ref: canvasRef,
              role: 'img',
              'aria-label': 'Ecosystem simulation. ' + biome + ' biome. Prey: ' + (preyCount || '?') + ', Predators: ' + (predCount || '?') + '. ' + (simPaused ? 'Paused.' : 'Running.'),
              tabIndex: 0,
              'data-eco-canvas': 'true',
              'data-biome': biome,
              'data-paused': simPaused ? '1' : '0',
              'data-speed': simSpeed.toString(),
              'data-carry-k': carryingCapacity.toString(),
              'data-sandbox-tool': '',
              style: { width: '100%', height: '100%', display: 'block' }
            }),
            // Bottom info bar
            h('div', { className: 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-1.5 flex items-center gap-2' },
              h('span', { className: 'text-[11px] text-white/80' }, '\uD83D\uDC07 Prey: ' + prey0 + ' start'),
              h('span', { className: 'text-[11px] text-white/80' }, '\uD83E\uDD8A Pred: ' + pred0 + ' start'),
              h('span', { className: 'text-[11px] text-white/80 ml-auto' }, 'Watch the ecosystem evolve!')
            )
          ),

          // ── NEW: Canvas control bar: pause/resume + speed slider ──
          h('div', { className: 'flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2' },
            h('button', { className: 'px-3 py-1 text-xs font-bold rounded-lg transition-all ' +
                (simPaused
                  ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                  : 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-400'),
              onClick: function() {
                var newPaused = !simPaused;
                playSound('pause');
                upd('simPaused', newPaused);
                var canvasEl = document.querySelector('canvas[data-eco-canvas]');
                if (canvasEl) canvasEl.dataset.paused = newPaused ? '1' : '0';
              }
            }, simPaused ? '\u25B6 Resume' : '\u23F8 Pause'),
            // Start/stop ambient on pause/resume — first button triggers on click above
            !simPaused && !_ecoAmbient && (function() { startEcoAmbient(true, 30); return null; })(),
            h('div', { className: 'flex items-center gap-2 flex-1' },
              h('span', { className: 'text-[11px] font-semibold text-slate-200 dark:text-slate-200' }, 'Speed:'),
              h('input', {
                type: 'range', min: 1, max: 6, step: 1, value: simSpeed,
                'aria-label': 'Simulation speed',
                className: 'flex-1 h-1.5 accent-emerald-500',
                onChange: function(e) {
                  var newSpeed = parseInt(e.target.value, 10);
                  upd('simSpeed', newSpeed);
                  var canvasEl = document.querySelector('canvas[data-eco-canvas]');
                  if (canvasEl) canvasEl.dataset.speed = newSpeed.toString();
                  // Track speed demon badge
                  if (newSpeed >= 6 && !speedAt3xStart) {
                    upd('speedAt3xStart', Date.now());
                  } else if (newSpeed < 6 && speedAt3xStart) {
                    // Check if they held it long enough
                    if (Date.now() - speedAt3xStart >= 30000) {
                      setTimeout(function() {
                        checkBadges({ speedAt3xStart: speedAt3xStart, simSpeed: newSpeed });
                      }, 100);
                    }
                    upd('speedAt3xStart', 0);
                  }
                }
              }),
              h('span', { className: 'text-[11px] font-bold text-emerald-600 min-w-[28px] text-right' }, speedLabel(simSpeed))
            )
          ),

          // ── NEW: Event injection buttons row ──
          h('div', { className: 'flex gap-1 flex-wrap' },
            eventDefs.map(function(ev) {
              return h('button', { key: ev.id,
                className: 'flex-1 min-w-[60px] px-1.5 py-1.5 text-[11px] font-bold rounded-lg text-white transition-all hover:opacity-90 active:scale-95 ' + ev.color,
                onClick: function() { triggerEvent(ev.id); },
                title: ev.label
              }, ev.icon + ' ' + ev.label);
            })
          ),

          // ── NEW: Event history log ──
          eventHistory.length > 0 && h('div', { className: 'bg-slate-50 dark:bg-slate-800 rounded-lg p-2 border border-slate-400 dark:border-slate-700' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1' }, '\uD83D\uDCDC Event History'),
            h('div', { className: 'space-y-0.5 max-h-20 overflow-y-auto' },
              eventHistory.slice(-5).reverse().map(function(ev, idx) {
                var eventIcons = { drought: '\u2600\uFE0F', disease: '\uD83E\uDDA0', foodBoom: '\uD83C\uDF31', migration: '\uD83E\uDD85', wildfire: '\uD83D\uDD25' };
                var timeAgo = Math.round((Date.now() - ev.time) / 1000);
                var timeLabel = timeAgo < 60 ? timeAgo + 's ago' : Math.round(timeAgo / 60) + 'm ago';
                return h('div', {
                  key: 'eh' + idx,
                  className: 'flex items-center gap-2 text-[11px] text-slate-200 dark:text-slate-200'
                },
                  h('span', null, eventIcons[ev.name] || '\u26A1'),
                  h('span', { className: 'font-semibold' }, ev.name),
                  h('span', { className: 'ml-auto text-slate-600' }, timeLabel)
                );
              })
            ),
            h('div', { className: 'flex items-center gap-2 mt-1 pt-1 border-t border-slate-200 dark:border-slate-600' },
              h('span', { className: 'text-[11px] text-slate-600' }, 'Total events: ' + eventHistory.length),
              h('span', { className: 'text-[11px] text-slate-600 ml-auto' },
                'Unique: ' + Object.keys(eventsTriggered).length + '/5'
              )
            )
          ),

          // ── NEW: Auto-observation callout card ──
          h('div', {
            className: 'relative rounded-lg px-3 py-2 text-xs font-medium border-2 border-emerald-400/50',
            style: {
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.12))',
              animation: 'pulse 3s ease-in-out infinite'
            }
          },
            h('div', {
              className: 'absolute inset-0 rounded-lg',
              style: {
                border: '1px solid rgba(16,185,129,0.3)',
                animation: 'pulse 2s ease-in-out infinite'
              }
            }),
            h('span', { className: 'text-emerald-700 dark:text-emerald-300' }, lastObservation)
          ),

          // ── NEW: Carrying Capacity slider ──
          h('div', { className: 'space-y-1' },
            h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
              h('span', null, '\uD83C\uDF31 Carrying Capacity (K)'),
              h('span', { className: 'text-amber-600 font-bold' }, carryingCapacity)
            ),
            h('input', {
              type: 'range', min: 30, max: 200, step: 5, value: carryingCapacity,
              'aria-label': 'Carrying capacity',
              className: 'w-full h-1.5 accent-amber-500',
              onChange: function(e) {
                var newK = parseInt(e.target.value, 10);
                var newChanges = carryCapChanges + 1;
                updMulti({ carryingCapacity: newK, carryCapChanges: newChanges });
                var canvasEl = document.querySelector('canvas[data-eco-canvas]');
                if (canvasEl) canvasEl.dataset.carryK = newK.toString();
                setTimeout(function() {
                  checkBadges({ carryCapChanges: newChanges });
                }, 100);
              }
            })
          ),

          // ── Live Population Graph Panel ──
          h('div', { className: 'bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-400 dark:border-slate-700 overflow-hidden' },
            h('button', { className: 'w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700',
              onClick: function() { upd('ecoGraphOpen', !ecoGraphOpen); }
            },
              h('span', null, '\uD83D\uDCCA Live Population Graph'),
              h('span', { className: 'text-xs', style: { transform: ecoGraphOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' } }, '\u25BC')
            ),
            ecoGraphOpen && h('div', { className: 'px-3 pb-3 space-y-2' },
              // View tabs
              h('div', { className: 'flex gap-1' },
                h('button', { 'aria-label': 'Populations',
                  className: 'flex-1 px-2 py-1 text-[11px] font-semibold rounded ' +
                    (ecoGraphView === 'population' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'),
                  onClick: function() { switchGraphView('population'); }
                }, 'Populations'),
                h('button', { 'aria-label': 'Environment',
                  className: 'flex-1 px-2 py-1 text-[11px] font-semibold rounded ' +
                    (ecoGraphView === 'environment' ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'),
                  onClick: function() { switchGraphView('environment'); }
                }, 'Environment')
              ),
              // Graph content
              ecoGraphView === 'population' ? (
                livePopHistory && livePopHistory.length > 2 ? (function() {
                  var hist = livePopHistory;
                  var maxPop = 1;
                  for (var lpi = 0; lpi < hist.length; lpi++) {
                    if (hist[lpi].prey > maxPop) maxPop = hist[lpi].prey;
                    if (hist[lpi].pred > maxPop) maxPop = hist[lpi].pred;
                  }
                  // Ensure carrying capacity visible
                  if (carryingCapacity > maxPop) maxPop = carryingCapacity + 5;
                  var lsx = function(i) { return pad + (i / (hist.length - 1)) * (W - 2 * pad); };
                  var lsy = function(v) { return H - pad - (v / maxPop) * (H - 2 * pad); };
                  var preyPts = '';
                  var predPts = '';
                  for (var lpj = 0; lpj < hist.length; lpj++) {
                    preyPts += (lpj === 0 ? '' : ' ') + lsx(lpj).toFixed(1) + ',' + lsy(hist[lpj].prey).toFixed(1);
                    predPts += (lpj === 0 ? '' : ' ') + lsx(lpj).toFixed(1) + ',' + lsy(hist[lpj].pred).toFixed(1);
                  }
                  var lLast = hist[hist.length - 1];
                  var preyAreaPts2 = pad.toFixed(1) + ',' + (H - pad).toFixed(1) + ' ' + preyPts + ' ' + (W - pad).toFixed(1) + ',' + (H - pad).toFixed(1);
                  var predAreaPts2 = pad.toFixed(1) + ',' + (H - pad).toFixed(1) + ' ' + predPts + ' ' + (W - pad).toFixed(1) + ',' + (H - pad).toFixed(1);
                  // Carrying capacity dashed line Y position
                  var kcLineY = lsy(carryingCapacity);
                  return h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'w-full', style: { maxHeight: 180 } },
                    h('defs', null,
                      h('linearGradient', { id: 'eco-live-prey', x1: '0', y1: '0', x2: '0', y2: '1' },
                        h('stop', { offset: '0%', stopColor: '#22c55e', stopOpacity: 0.35 }),
                        h('stop', { offset: '100%', stopColor: '#22c55e', stopOpacity: 0.05 })
                      ),
                      h('linearGradient', { id: 'eco-live-pred', x1: '0', y1: '0', x2: '0', y2: '1' },
                        h('stop', { offset: '0%', stopColor: '#ef4444', stopOpacity: 0.35 }),
                        h('stop', { offset: '100%', stopColor: '#ef4444', stopOpacity: 0.05 })
                      )
                    ),
                    // Axes
                    h('line', { x1: pad, y1: pad, x2: pad, y2: H - pad, stroke: '#475569', strokeWidth: 1 }),
                    h('line', { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: '#475569', strokeWidth: 1 }),
                    // Carrying capacity dashed line
                    h('line', { x1: pad, y1: kcLineY, x2: W - pad, y2: kcLineY, stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '6,4', opacity: 0.7 }),
                    h('text', { x: W - pad + 2, y: kcLineY + 3, fill: '#f59e0b', fontSize: 7 }, 'K=' + carryingCapacity),
                    // Areas
                    h('polygon', { points: preyAreaPts2, fill: 'url(#eco-live-prey)' }),
                    h('polygon', { points: predAreaPts2, fill: 'url(#eco-live-pred)' }),
                    // Lines
                    h('polyline', { points: preyPts, fill: 'none', stroke: '#22c55e', strokeWidth: 2 }),
                    h('polyline', { points: predPts, fill: 'none', stroke: '#ef4444', strokeWidth: 2 }),
                    // End dots + labels
                    h('circle', { cx: lsx(hist.length - 1), cy: lsy(lLast.prey), r: 3, fill: '#22c55e' }),
                    h('circle', { cx: lsx(hist.length - 1), cy: lsy(lLast.pred), r: 3, fill: '#ef4444' }),
                    h('text', { x: lsx(hist.length - 1) + 5, y: lsy(lLast.prey) + 3, fill: '#22c55e', fontSize: 8, fontWeight: 'bold' }, lLast.prey),
                    h('text', { x: lsx(hist.length - 1) + 5, y: lsy(lLast.pred) + 3, fill: '#ef4444', fontSize: 8, fontWeight: 'bold' }, lLast.pred)
                  );
                })() : h('p', { className: 'text-xs text-slate-600 text-center py-4' }, 'Canvas simulation is generating live data...')
              ) : buildEnvSVG(),

              // Legend row
              h('div', { className: 'flex gap-3 justify-center text-[11px]' },
                ecoGraphView === 'population' ? [
                  h('span', { key: 'lp', className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-green-500' }), 'Prey'),
                  h('span', { key: 'lpd', className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-red-500' }), 'Predators'),
                  h('span', { key: 'lkc', className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-3 h-0.5 bg-amber-500', style: { borderBottom: '1px dashed #f59e0b' } }), 'Carrying Cap')
                ] : [
                  h('span', { key: 'le', className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-green-500' }), 'Vegetation'),
                  h('span', { key: 'led', className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-amber-500' }), 'Day/Night')
                ]
              ),

              // Stats row (from livePopHistory)
              livePopHistory && livePopHistory.length > 2 && h('div', { className: 'grid grid-cols-4 gap-1 text-center' },
                (function() {
                  var lpMax = 0, ldMax = 0, lRatio = '\u2014';
                  for (var lsi = 0; lsi < livePopHistory.length; lsi++) {
                    if (livePopHistory[lsi].prey > lpMax) lpMax = livePopHistory[lsi].prey;
                    if (livePopHistory[lsi].pred > ldMax) ldMax = livePopHistory[lsi].pred;
                  }
                  var last = livePopHistory[livePopHistory.length - 1];
                  if (last.pred > 0) lRatio = (last.prey / last.pred).toFixed(1) + ':1';
                  return [
                    h('div', { key: 'sp', className: 'bg-green-50 dark:bg-green-900/20 rounded p-1' },
                      h('div', { className: 'text-[11px] text-slate-600' }, 'Peak Prey'),
                      h('div', { className: 'text-sm font-bold text-green-600' }, lpMax)
                    ),
                    h('div', { key: 'sd', className: 'bg-red-50 dark:bg-red-900/20 rounded p-1' },
                      h('div', { className: 'text-[11px] text-slate-600' }, 'Peak Pred'),
                      h('div', { className: 'text-sm font-bold text-red-600' }, ldMax)
                    ),
                    h('div', { key: 'sr', className: 'bg-purple-50 dark:bg-purple-900/20 rounded p-1' },
                      h('div', { className: 'text-[11px] text-slate-600' }, 'Ratio'),
                      h('div', { className: 'text-sm font-bold text-purple-600' }, lRatio)
                    ),
                    h('div', { key: 'ss', className: 'bg-slate-50 dark:bg-slate-800 rounded p-1' },
                      h('div', { className: 'text-[11px] text-slate-600' }, 'Samples'),
                      h('div', { className: 'text-sm font-bold text-slate-600' }, livePopHistory.length)
                    )
                  ];
                })()
              )
            )
          ),

          // ── Food Web Diagram ──
          h('div', { className: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-700' },
            h('p', { className: 'text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2' }, '\uD83C\uDF3F Food Web'),
            h('div', { className: 'flex items-center justify-center gap-1 flex-wrap text-center' },
              h('div', { className: 'bg-yellow-100 dark:bg-yellow-900/30 rounded-lg px-2 py-1' },
                h('div', { className: 'text-lg' }, '\u2600\uFE0F'),
                h('div', { className: 'text-[11px] font-semibold' }, 'Sun')
              ),
              h('span', { className: 'text-slate-600 text-sm' }, '\u2192'),
              h('div', { className: 'bg-green-100 dark:bg-green-900/30 rounded-lg px-2 py-1' },
                h('div', { className: 'text-lg' }, '\uD83C\uDF3F'),
                h('div', { className: 'text-[11px] font-semibold' }, 'Plants')
              ),
              h('span', { className: 'text-slate-600 text-sm' }, '\u2192'),
              h('div', { className: 'bg-emerald-100 dark:bg-emerald-900/30 rounded-lg px-2 py-1' },
                h('div', { className: 'text-lg' }, '\uD83D\uDC07'),
                h('div', { className: 'text-[11px] font-semibold' }, 'Herbivores')
              ),
              h('span', { className: 'text-slate-600 text-sm' }, '\u2192'),
              h('div', { className: 'bg-orange-100 dark:bg-orange-900/30 rounded-lg px-2 py-1' },
                h('div', { className: 'text-lg' }, '\uD83E\uDD8A'),
                h('div', { className: 'text-[11px] font-semibold' }, 'Predators')
              ),
              h('span', { className: 'text-slate-600 text-sm' }, '\u2192'),
              h('div', { className: 'bg-amber-100 dark:bg-amber-900/30 rounded-lg px-2 py-1' },
                h('div', { className: 'text-lg' }, '\uD83C\uDF44'),
                h('div', { className: 'text-[11px] font-semibold' }, 'Decomposers')
              )
            )
          ),

          // ── Description ──
          h('div', { className: 'flex items-start gap-2' },
            h('p', { className: 'text-xs text-slate-600 dark:text-slate-200 flex-1' },
              'Model predator\u2013prey dynamics using the Lotka\u2013Volterra equations. Adjust starting populations and interaction rates to observe oscillations, extinction events, and equilibrium states.'
            ),
            callTTS && h('button', { 'aria-label': 'Read aloud',
              className: 'p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-300',
              onClick: function() { speakText('Model predator-prey dynamics using the Lotka-Volterra equations. Adjust starting populations and interaction rates to observe oscillations, extinction events, and equilibrium states.'); },
              title: 'Read aloud'
            }, '\uD83D\uDD0A')
          ),

          // ── Preset buttons ──
          h('div', { className: 'flex gap-1 flex-wrap' },
            presetNames.map(function(name, idx) {
              return h('button', { 'aria-label': 'Apply Preset',
                key: name,
                className: 'flex-1 min-w-[70px] px-2 py-1.5 text-[11px] font-semibold rounded-lg border transition-all ' +
                  (presetsUsed[name]
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'),
                onClick: function() { applyPreset(name); }
              }, presetLabels[idx]);
            })
          ),

          // ── Parameter sliders (2x3 grid with carrying capacity) ──
          h('div', { className: 'grid grid-cols-2 gap-2' },
            // Prey Start
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
                h('span', null, '\uD83D\uDC07 Prey Start'),
                h('span', { className: 'text-emerald-600 font-bold' }, prey0)
              ),
              h('input', {
                type: 'range', min: 5, max: 150, step: 5, value: prey0,
                'aria-label': 'Prey start population',
                className: 'w-full h-1.5 accent-emerald-500',
                onChange: function(e) { upd('prey0', parseInt(e.target.value, 10)); }
              })
            ),
            // Predators
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
                h('span', null, '\uD83E\uDD8A Predators'),
                h('span', { className: 'text-red-600 font-bold' }, pred0)
              ),
              h('input', {
                type: 'range', min: 2, max: 80, step: 2, value: pred0,
                'aria-label': 'Predator start population',
                className: 'w-full h-1.5 accent-red-500',
                onChange: function(e) { upd('pred0', parseInt(e.target.value, 10)); }
              })
            ),
            // Prey Birth Rate
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
                h('span', null, 'Prey Birth Rate'),
                h('span', { className: 'text-green-600 font-bold' }, preyBirth.toFixed(3))
              ),
              h('input', {
                type: 'range', 'aria-label': 'prey birth', min: 0.01, max: 0.3, step: 0.005, value: preyBirth,
                className: 'w-full h-1.5 accent-green-500',
                onChange: function(e) { upd('preyBirth', parseFloat(e.target.value)); }
              })
            ),
            // Pred Death Rate
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
                h('span', null, 'Pred Death Rate'),
                h('span', { className: 'text-red-600 font-bold' }, predDeath.toFixed(3))
              ),
              h('input', {
                type: 'range', 'aria-label': 'pred death', min: 0.01, max: 0.3, step: 0.005, value: predDeath,
                className: 'w-full h-1.5 accent-red-500',
                onChange: function(e) { upd('predDeath', parseFloat(e.target.value)); }
              })
            ),
            // Prey Death Rate (interaction)
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
                h('span', null, 'Prey Death Rate'),
                h('span', { className: 'text-orange-600 font-bold' }, preyDeath.toFixed(3))
              ),
              h('input', {
                type: 'range', 'aria-label': 'prey death', min: 0.001, max: 0.05, step: 0.001, value: preyDeath,
                className: 'w-full h-1.5 accent-orange-500',
                onChange: function(e) { upd('preyDeath', parseFloat(e.target.value)); }
              })
            ),
            // Pred Birth Rate (interaction)
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
                h('span', null, 'Pred Birth Rate'),
                h('span', { className: 'text-blue-600 font-bold' }, predBirth.toFixed(3))
              ),
              h('input', {
                type: 'range',  min: 0.001, max: 0.05, step: 0.001, value: predBirth,
                className: 'w-full h-1.5 accent-blue-500',
                onChange: function(e) { upd('predBirth', parseFloat(e.target.value)); }
              })
            )
          ),

          // ── Run Graph Simulation button ──
          h('button', { 'aria-label': 'Run Graph Simulation',
            className: 'w-full py-2.5 rounded-xl font-bold text-white text-sm shadow-lg transition-all ' +
              'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98]',
            onClick: simulate
          }, '\u25B6 Run Graph Simulation'),

          // ── Lotka-Volterra graph (post-simulation) ──
          data && data.length > 1 && h('div', { className: 'bg-white dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-700 p-3 space-y-2' },
            h('p', { className: 'text-xs font-bold text-slate-700 dark:text-slate-200' }, '\uD83D\uDCC8 Lotka\u2013Volterra Simulation'),
            buildPopSVG(),
            // Legend
            h('div', { className: 'flex gap-4 justify-center text-[11px]' },
              h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-green-500' }), 'Prey (\uD83D\uDC07)'),
              h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-red-500' }), 'Predators (\uD83E\uDD8A)'),
              h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-3 h-0.5 bg-amber-500', style: { borderBottom: '1px dashed #f59e0b' } }), 'K')
            ),
            // Stats
            h('div', { className: 'grid grid-cols-4 gap-1 text-center' },
              h('div', { className: 'bg-green-50 dark:bg-green-900/20 rounded p-1' },
                h('div', { className: 'text-[11px] text-slate-600' }, 'Peak Prey'),
                h('div', { className: 'text-sm font-bold text-green-600' }, peakPrey)
              ),
              h('div', { className: 'bg-red-50 dark:bg-red-900/20 rounded p-1' },
                h('div', { className: 'text-[11px] text-slate-600' }, 'Peak Pred'),
                h('div', { className: 'text-sm font-bold text-red-600' }, peakPred)
              ),
              h('div', { className: 'bg-purple-50 dark:bg-purple-900/20 rounded p-1' },
                h('div', { className: 'text-[11px] text-slate-600' }, 'Ratio'),
                h('div', { className: 'text-sm font-bold text-purple-600' }, finalRatio)
              ),
              h('div', { className: 'bg-slate-50 dark:bg-slate-800 rounded p-1' },
                h('div', { className: 'text-[11px] text-slate-600' }, 'Steps'),
                h('div', { className: 'text-sm font-bold text-slate-600' }, steps)
              )
            )
          ),

          // ── Phase Portrait (post-simulation) ──
          data && data.length > 1 && h('div', { className: 'bg-white dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-700 p-3 space-y-2' },
            h('p', { className: 'text-xs font-bold text-slate-700 dark:text-slate-200' }, '\uD83D\uDD04 Phase Portrait'),
            buildPhaseSVG(),
            h('div', { className: 'flex gap-3 justify-center text-[11px]' },
              h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-green-500' }), 'Start'),
              h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-red-500' }), 'End')
            )
          ),


          // ── Ecology Challenges ──
          h('div', { className: 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-3 border border-purple-200 dark:border-purple-700 space-y-2' },
            h('p', { className: 'text-xs font-bold text-purple-700 dark:text-purple-300' },
              '\uD83C\uDFAF Ecology Challenges (' + Object.keys(completedChallenges).length + '/' + ECO_CHALLENGES.length + ')'
            ),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              ECO_CHALLENGES.map(function(ch) {
                var done = !!completedChallenges[ch.id];
                return h('div', {
                  key: ch.id,
                  className: 'p-2 rounded-lg border transition-all ' +
                    (done ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800')
                },
                  h('div', { className: 'flex items-center gap-1 mb-1' },
                    h('span', { className: 'text-sm' }, ch.emoji),
                    h('span', { className: 'text-[11px] font-bold ' + (done ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200') }, ch.name),
                    done && h('span', { className: 'text-[11px] text-green-500 font-bold ml-auto' }, '\u2714')
                  ),
                  h('p', { className: 'text-[11px] text-slate-200 dark:text-slate-200 mb-1' }, ch.desc),
                  h('p', { className: 'text-[11px] font-bold ' + (done ? 'text-green-600' : 'text-amber-600') },
                    done ? '\u2714 Completed!' : '\u2B50 +' + ch.reward + ' RP')
                );
              })
            )
          ),


          // ── Snapshot button ──
          h('button', { 'aria-label': 'Take Snapshot',
            className: 'w-full py-1.5 rounded-lg text-xs font-semibold border border-slate-400 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all',
            onClick: takeSnapshot
          }, '\uD83D\uDCF7 Take Snapshot'),

          // ── AI Tutor ──
          callGemini && h('div', { className: 'bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-200 dark:border-indigo-700 space-y-2' },
            h('button', { className: 'w-full flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300',
              onClick: function() { upd('showAI', !showAI); }
            },
              h('span', null, '\uD83E\uDD16 AI Ecology Tutor'),
              h('span', null, showAI ? '\u25B2' : '\u25BC')
            ),
            showAI && h('div', { className: 'space-y-2' },
              h('div', { className: 'flex gap-1 flex-wrap' },
                ['What is Lotka-Volterra?', 'Why do populations oscillate?', 'What is carrying capacity?', 'Explain food webs'].map(function(question) {
                  return h('button', { key: question,
                    className: 'px-2 py-1 text-[11px] rounded-full border border-indigo-600 dark:border-indigo-600 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800',
                    onClick: function() { askAI(question); }
                  }, question);
                })
              ),
              aiLoading && h('p', { className: 'text-xs text-indigo-500 animate-pulse' }, 'Thinking...'),
              aiResponse && h('div', { className: 'bg-white dark:bg-slate-800 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-300 border border-indigo-100 dark:border-indigo-800' },
                h('p', null, aiResponse),
                callTTS && h('button', { 'aria-label': 'Read aloud',
                  className: 'mt-1 text-[11px] text-indigo-500 hover:text-indigo-700',
                  onClick: function() { speakText(aiResponse); }
                }, '\uD83D\uDD0A Read aloud')
              )
            )
          )
        ),

        // ═══ SANDBOX TAB ═══
        tab === 'sandbox' && h('div', { className: 'space-y-3' },

          // Canvas container (same canvas, with sandbox interactivity)
          h('div', { className: 'relative rounded-xl overflow-hidden border-2 border-teal-400', style: { height: 320 } },
            h('canvas', { 
              ref: canvasRef,
              role: 'img',
              'aria-label': 'Ecosystem sandbox. Click to place prey (left) or predators (right). ' + (simPaused ? 'Paused.' : 'Running.'),
              tabIndex: 0,
              'data-eco-canvas': 'true',
              'data-paused': simPaused ? '1' : '0',
              'data-speed': simSpeed.toString(),
              'data-carry-k': carryingCapacity.toString(),
              'data-sandbox-tool': sandboxTool,
              'data-place-count': sandboxPlaceCount.toString(),
              style: { width: '100%', height: '100%', display: 'block', cursor: sandboxTool === 'erase' ? 'crosshair' : sandboxTool === 'move' ? 'grab' : 'pointer' }
            }),
            // Bottom info bar
            h('div', { className: 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-1.5 flex items-center gap-2' },
              h('span', { className: 'text-[11px] text-white/80 font-bold' }, '\uD83E\uDDEA Sandbox Mode'),
              h('span', { className: 'text-[11px] text-white/80 ml-auto' }, 'Click to place entities')
            )
          ),

          // ── Tool selector row ──
          h('div', { className: 'flex gap-1' },
            sandboxTools.map(function(tool) {
              return h('button', { key: tool.id,
                className: 'flex-1 px-1.5 py-2 text-[11px] font-bold rounded-lg border-2 transition-all text-center ' +
                  (sandboxTool === tool.id
                    ? 'border-teal-400 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 shadow'
                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-teal-600'),
                onClick: function() {
                  upd('sandboxTool', tool.id);
                  var canvasEl = document.querySelector('canvas[data-eco-canvas]');
                  if (canvasEl) canvasEl.dataset.sandboxTool = tool.id;
                }
              },
                h('div', { className: 'text-lg' }, tool.icon),
                h('div', null, tool.label)
              );
            })
          ),

          // ── Placement count display ──
          h('div', { className: 'flex items-center justify-between bg-teal-50 dark:bg-teal-900/20 rounded-lg px-3 py-2' },
            h('span', { className: 'text-xs font-semibold text-teal-700 dark:text-teal-300' }, 'Entities Placed:'),
            h('span', { className: 'text-sm font-bold text-teal-600' }, sandboxPlaceCount),
            h('button', { 'aria-label': 'Sync Count',
              className: 'text-[11px] text-teal-500 hover:text-teal-700 underline',
              onClick: syncSandboxCount
            }, 'Sync Count')
          ),

          // ── Pause/Speed controls (shared) ──
          h('div', { className: 'flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2' },
            h('button', { className: 'px-3 py-1 text-xs font-bold rounded-lg transition-all ' +
                (simPaused
                  ? 'bg-teal-700 text-white hover:bg-teal-600'
                  : 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-400'),
              onClick: function() {
                var newPaused = !simPaused;
                playSound('pause');
                upd('simPaused', newPaused);
                var canvasEl = document.querySelector('canvas[data-eco-canvas]');
                if (canvasEl) canvasEl.dataset.paused = newPaused ? '1' : '0';
              }
            }, simPaused ? '\u25B6 Resume' : '\u23F8 Pause'),
            h('div', { className: 'flex items-center gap-2 flex-1' },
              h('span', { className: 'text-[11px] font-semibold text-slate-200 dark:text-slate-200' }, 'Speed:'),
              h('input', {
                type: 'range', min: 1, max: 6, step: 1, value: simSpeed,
                'aria-label': 'Sandbox simulation speed',
                className: 'flex-1 h-1.5 accent-teal-500',
                onChange: function(e) {
                  var newSpeed = parseInt(e.target.value, 10);
                  upd('simSpeed', newSpeed);
                  var canvasEl = document.querySelector('canvas[data-eco-canvas]');
                  if (canvasEl) canvasEl.dataset.speed = newSpeed.toString();
                }
              }),
              h('span', { className: 'text-[11px] font-bold text-teal-600 min-w-[28px] text-right' }, speedLabel(simSpeed))
            )
          ),

          // ── Event injection (sandbox version) ──
          h('div', { className: 'space-y-1' },
            h('p', { className: 'text-[11px] font-bold text-teal-700 dark:text-teal-300' }, '\u26A1 Inject Events'),
            h('div', { className: 'flex gap-1 flex-wrap' },
              eventDefs.map(function(ev) {
                return h('button', { 'aria-label': 'Trigger Event',
                  key: 'sb-' + ev.id,
                  className: 'flex-1 min-w-[55px] px-1 py-1 text-[11px] font-bold rounded-lg text-white transition-all hover:opacity-90 active:scale-95 ' + ev.color,
                  onClick: function() { triggerEvent(ev.id); },
                  title: ev.label
                }, ev.icon + ' ' + ev.label);
              })
            )
          ),

          // ── Carrying Capacity slider (sandbox version) ──
          h('div', { className: 'space-y-1' },
            h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
              h('span', null, '\uD83C\uDF31 Carrying Capacity (K)'),
              h('span', { className: 'text-amber-600 font-bold' }, carryingCapacity)
            ),
            h('input', {
              type: 'range', 'aria-label': 'carrying capacity', min: 30, max: 200, step: 5, value: carryingCapacity,
              className: 'w-full h-1.5 accent-amber-500',
              onChange: function(e) {
                var newK = parseInt(e.target.value, 10);
                var newChanges = carryCapChanges + 1;
                updMulti({ carryingCapacity: newK, carryCapChanges: newChanges });
                var canvasEl = document.querySelector('canvas[data-eco-canvas]');
                if (canvasEl) canvasEl.dataset.carryK = newK.toString();
              }
            })
          ),

          // ── Live population readout ──
          livePopHistory && livePopHistory.length > 0 && h('div', { className: 'grid grid-cols-3 gap-1 text-center' },
            (function() {
              var lastPop = livePopHistory[livePopHistory.length - 1];
              var preyNow = lastPop ? lastPop.prey : 0;
              var predNow = lastPop ? lastPop.pred : 0;
              var vegNow = lastPop && lastPop.vegHealth !== undefined ? Math.round(lastPop.vegHealth * 100) : 50;
              return [
                h('div', { key: 'sbp', className: 'bg-green-50 dark:bg-green-900/20 rounded p-1.5' },
                  h('div', { className: 'text-[11px] text-slate-600' }, '\uD83D\uDC07 Prey'),
                  h('div', { className: 'text-sm font-bold text-green-600' }, preyNow)
                ),
                h('div', { key: 'sbd', className: 'bg-red-50 dark:bg-red-900/20 rounded p-1.5' },
                  h('div', { className: 'text-[11px] text-slate-600' }, '\uD83E\uDD8A Predators'),
                  h('div', { className: 'text-sm font-bold text-red-600' }, predNow)
                ),
                h('div', { key: 'sbv', className: 'bg-emerald-50 dark:bg-emerald-900/20 rounded p-1.5' },
                  h('div', { className: 'text-[11px] text-slate-600' }, '\uD83C\uDF3F Vegetation'),
                  h('div', { className: 'text-sm font-bold text-emerald-600' }, vegNow + '%')
                )
              ];
            })()
          ),

          // ── Instructions text ──
          h('div', { className: 'bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-xs text-slate-600 dark:text-slate-600 space-y-1' },
            h('p', { className: 'font-bold text-slate-700 dark:text-slate-200' }, '\uD83D\uDCA1 Sandbox Instructions'),
            h('p', null, 'Select a tool above, then click on the canvas to interact:'),
            h('ul', { className: 'list-disc pl-4 space-y-0.5' },
              h('li', null, 'Place Rabbit/Fox/Tree: Click anywhere to spawn'),
              h('li', null, 'Erase: Click near an entity to remove it'),
              h('li', null, 'Move: Click and drag an entity to reposition it')
            ),
            h('p', { className: 'text-[11px] italic text-slate-600' }, 'Tip: Pause the simulation first for precise placement!')
          ),

          // ── Sandbox experiment suggestions ──
          h('div', { className: 'bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 border border-teal-200 dark:border-teal-700 space-y-1' },
            h('p', { className: 'text-[11px] font-bold text-teal-700 dark:text-teal-300' }, '\uD83E\uDD14 Experiment Ideas'),
            h('ul', { className: 'list-disc pl-4 text-[11px] text-slate-600 dark:text-slate-200 space-y-0.5' },
              h('li', null, 'Remove all predators and watch what happens to prey and vegetation'),
              h('li', null, 'Create a "wall" of trees and see if it affects hunting patterns'),
              h('li', null, 'Add many foxes at once, then trigger a Food Boom to save the rabbits'),
              h('li', null, 'Pause, place prey in one corner and predators in the other, then resume'),
              h('li', null, 'Trigger a Wildfire then immediately add trees to observe recovery')
            )
          ),

          // ── Auto-observation callout (shared) ──
          h('div', {
            className: 'relative rounded-lg px-3 py-2 text-xs font-medium border-2 border-teal-400/50',
            style: {
              background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(13,148,136,0.12))',
              animation: 'pulse 3s ease-in-out infinite'
            }
          },
            h('span', { className: 'text-teal-700 dark:text-teal-300' }, lastObservation)
          )
        ),

        // ═══ QUIZ TAB ═══
        tab === 'quiz' && h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-white dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-700 p-4 space-y-3' },
            h('div', { className: 'flex justify-between items-center' },
              h('span', { className: 'text-xs font-bold text-slate-700 dark:text-slate-200' }, 'Question ' + ((quizIndex % QUIZ_QUESTIONS.length) + 1) + ' of ' + QUIZ_QUESTIONS.length),
              h('span', { className: 'text-xs text-emerald-600 font-bold' }, '\u2714 ' + quizCorrect + '/' + quizTotal)
            ),
            h('p', { className: 'text-sm font-semibold text-slate-800 dark:text-slate-100' }, currentQ.q),
            callTTS && h('button', { 'aria-label': 'Read question',
              className: 'text-[11px] text-slate-600 hover:text-slate-700',
              onClick: function() { speakText(currentQ.q); }
            }, '\uD83D\uDD0A Read question'),
            h('div', { className: 'space-y-1.5' },
              currentQ.choices.map(function(choice, idx) {
                var isSelected = quizAnswer === idx;
                var isCorrectChoice = idx === currentQ.answer;
                var showResult = quizAnswer !== -1;
                var bgClass = 'border-slate-200 dark:border-slate-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20';
                if (showResult && isSelected && isCorrectChoice) {
                  bgClass = 'border-green-500 bg-green-50 dark:bg-green-900/30';
                } else if (showResult && isSelected && !isCorrectChoice) {
                  bgClass = 'border-red-500 bg-red-50 dark:bg-red-900/30';
                } else if (showResult && isCorrectChoice) {
                  bgClass = 'border-green-400 bg-green-50/50 dark:bg-green-900/20';
                }
                return h('button', { 'aria-label': 'Answer Quiz',
                  key: idx,
                  className: 'w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ' + bgClass,
                  disabled: quizAnswer !== -1,
                  onClick: function() { answerQuiz(idx); }
                },
                  h('span', { className: 'font-semibold mr-2' }, String.fromCharCode(65 + idx) + '.'),
                  choice,
                  showResult && isCorrectChoice && h('span', { className: 'ml-1 text-green-600' }, ' \u2714'),
                  showResult && isSelected && !isCorrectChoice && h('span', { className: 'ml-1 text-red-600' }, ' \u2718')
                );
              })
            ),
            quizFeedback && h('div', { 
              className: 'text-xs font-semibold p-2 rounded-lg ' +
                (quizAnswer === currentQ.answer ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300')
            }, quizFeedback),
            quizAnswer !== -1 && h('button', { 'aria-label': 'Next Question',
              className: 'w-full py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600 transition-all',
              onClick: nextQuiz
            }, 'Next Question \u2192')
          ),
          // Quiz progress
          h('div', { className: 'bg-slate-50 dark:bg-slate-800 rounded-xl p-3' },
            h('p', { className: 'text-xs font-bold text-slate-700 dark:text-slate-200 mb-1' }, 'Quiz Progress'),
            h('div', { className: 'w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden' },
              h('div', {
                className: 'h-full bg-emerald-500 rounded-full transition-all',
                style: { width: (quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0) + '%' }
              })
            ),
            h('p', { className: 'text-[11px] text-slate-600 mt-1' },
              quizTotal > 0
                ? Math.round((quizCorrect / quizTotal) * 100) + '% correct (' + quizCorrect + '/' + quizTotal + ')'
                : 'Answer questions to track your progress'
            )
          )
        ),

        // ═══ BADGES TAB (14 badges) ═══
        tab === 'badges' && h('div', { className: 'space-y-2' },
          h('p', { className: 'text-xs font-bold text-slate-700 dark:text-slate-200' },
            '\uD83C\uDFC5 Badges Earned: ' + badgeCount + ' / ' + BADGES.length
          ),
          h('div', { className: 'w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2' },
            h('div', {
              className: 'h-full bg-emerald-500 rounded-full transition-all',
              style: { width: Math.round((badgeCount / BADGES.length) * 100) + '%' }
            })
          ),
          h('div', { className: 'grid grid-cols-2 gap-2' },
            BADGES.map(function(b) {
              var earned = !!badges[b.id];
              return h('div', {
                key: b.id,
                className: 'flex items-start gap-2 p-2 rounded-lg border transition-all ' +
                  (earned
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 opacity-60')
              },
                h('span', { className: 'text-lg', style: { filter: earned ? 'none' : 'grayscale(1)' } }, b.icon),
                h('div', null,
                  h('p', { className: 'text-[11px] font-bold ' + (earned ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-200') }, b.label),
                  h('p', { className: 'text-[11px] text-slate-600' }, b.desc),
                  earned && h('span', { className: 'text-[11px] text-emerald-500 font-bold' }, '\u2714 EARNED')
                )
              );
            })
          )
        ),

        // ── Keyboard shortcuts (updated) ──
        h('div', { className: 'text-[11px] text-slate-600 text-center space-x-3' },
          h('span', null, 'E Explore'),
          h('span', null, 'S Sandbox'),
          h('span', null, 'Q Quiz'),
          h('span', null, 'B Badges'),
          h('span', null, 'R Simulate'),
          h('span', null, 'P Pause'),
          h('span', null, '? AI')
        ),

        // ── Tutorial Overlay ──
        !tutorialDismissed && tutorialStep < 5 && h('div', { 
          className: 'fixed inset-0 bg-black/40 flex items-center justify-center z-50',
          style: { backdropFilter: 'blur(2px)' }
        },
          h('div', { className: 'bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-sm mx-4 shadow-2xl border-2 border-emerald-400' },
            h('div', { className: 'flex items-center justify-between mb-3' },
              h('span', { className: 'text-sm font-bold text-emerald-700 dark:text-emerald-300' },
                '\uD83C\uDF3F Step ' + (tutorialStep + 1) + ' of 5'),
              h('button', { 'aria-label': 'Dismiss Tutorial', className: 'text-slate-600 hover:text-slate-600 text-sm', onClick: dismissTutorial }, '\u2715')
            ),
            h('p', { className: 'text-sm text-slate-700 dark:text-slate-200 mb-4 leading-relaxed' },
              [
                '\uD83C\uDF3F Welcome to the Ecosystem Simulator! Watch rabbits and foxes interact in the canvas above.',
                '\uD83C\uDF0E Choose a biome at the top to change the environment. Each has unique colors and ecology.',
                '\u26A1 Trigger environmental events to test the ecosystem\u2019s resilience! Try Drought or Wildfire.',
                '\uD83C\uDFAF Complete ecology challenges by maintaining specific population patterns. Earn RP!',
                '\uD83D\uDCCA Run the graph simulation with Lotka\u2013Volterra equations. Try all 4 presets!'
              ][tutorialStep]
            ),
            h('div', { className: 'flex gap-2' },
              tutorialStep > 0 && h('button', { 'aria-label': 'Back',
                className: 'px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
                onClick: function() { upd('tutorialStep', tutorialStep - 1); }
              }, '\u2190 Back'),
              h('button', { className: 'flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600 shadow-md',
                onClick: tutorialStep < 4 ? advanceTutorial : dismissTutorial
              }, tutorialStep < 4 ? 'Next \u2192' : '\u2714 Start Exploring!')
            )
          )
        )

      );
    }
  });
})();
}