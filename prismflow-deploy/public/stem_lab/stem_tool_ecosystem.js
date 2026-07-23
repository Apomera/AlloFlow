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
        case 'death':
          // starvation/predation cue — a short falling tone (was missing → fell through to the neutral default blip)
          playTone(330, 0.12, 'sawtooth', 0.07);
          setTimeout(function() { playTone(196, 0.22, 'sawtooth', 0.06); }, 90);
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

  // ── Badge definitions (20 total) ──
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
    { id: 'carryCapExplorer',  icon: '\uD83C\uDF31', label: 'Capacity Explorer',   desc: 'Change carrying capacity 3 times' },
    // Conservation Manager badges
    { id: 'wolfReintroducer',  icon: '\uD83D\uDC3A', label: 'Wolf Reintroducer',   desc: 'Successfully reintroduce wolves to Maine in the Conservation Manager' },
    { id: 'beaverEngineer',    icon: '\uD83E\uDDAB', label: 'Beaver Engineer',     desc: 'Bring the beaver population index above 75 in the Conservation Manager' },
    { id: 'salmonChampion',    icon: '\uD83D\uDC1F', label: 'Salmon Champion',     desc: 'Bring the Atlantic salmon population index above 50 in the Conservation Manager' },
    { id: 'troutDefender',     icon: '\uD83D\uDC20', label: 'Brook Trout Defender', desc: 'Bring the brook trout population index above 70 in the Conservation Manager' },
    { id: 'cascadeMaster',     icon: '\uD83D\uDD04', label: 'Cascade Master',      desc: 'Trigger a full trophic cascade (wolves up, deer down, habitat recovers) in the Conservation Manager' },
    { id: 'directorRank',      icon: '\uD83C\uDFC6', label: 'Conservation Director', desc: 'Complete a 10-year Conservation Manager campaign on Director difficulty' }
  ];

  // ── Quiz questions ──
  var QUIZ_QUESTIONS = [
    {
      q: 'In this simplified predator-prey model, what commonly happens after prey availability increases?',
      choices: ['Predators decrease', 'Predators increase after a lag', 'Predators stay the same', 'Predators immediately double'],
      answer: 1,
      concept: 'Lotka-Volterra cycle',
      wrongFeedback: [
        'Incorrect. More prey provides more food, which allows predator populations to grow, not shrink.',
        'Correct! As prey numbers grow, there is more food for predators. After a slight lag (time to reproduce), the predator population rises.',
        'Incorrect. Predator numbers are directly influenced by the availability of their food source.',
        'Incorrect. Predator growth is not instant; it requires time for gestation and birth.'
      ]
    },
    {
      q: 'What does the Lotka-Volterra model describe?',
      choices: ['Rock formation', 'Predator-prey population dynamics', 'Weather patterns', 'Ocean currents'],
      answer: 1,
      concept: 'Lotka-Volterra cycle',
      wrongFeedback: [
        'Incorrect. Geology studies rock formation, not biology.',
        'Correct! The Lotka-Volterra model uses differential equations to represent how predator and prey numbers oscillate over time.',
        'Incorrect. Weather modeling uses fluid dynamics and thermodynamics, not population models.',
        'Incorrect. Ocean currents are driven by wind and salinity, not predator-prey interactions.'
      ]
    },
    {
      q: 'Which term best describes a fox eating a rabbit?',
      choices: ['Mutualism', 'Parasitism', 'Predation', 'Commensalism'],
      answer: 2,
      concept: 'Predation',
      wrongFeedback: [
        'Incorrect. Mutualism is a symbiotic relationship where both species benefit.',
        'Incorrect. Parasites feed on hosts but usually do not kill them immediately.',
        'Correct! Predation is the act of one organism hunting, killing, and consuming another.',
        'Incorrect. Commensalism benefits one species while leaving the other unaffected.'
      ]
    },
    {
      q: 'In a population model, what does carrying capacity (K) represent?',
      choices: ['The weight an animal can lift', 'A limiting population level under specified environmental conditions', 'The speed of population growth', 'The number of species in an area'],
      answer: 1,
      concept: 'Carrying capacity',
      wrongFeedback: [
        'Incorrect. That is physical strength, not an ecological metric.',
        'Correct! K represents a limiting population level under a specified set of environmental conditions. Real carrying capacity can change as resources, habitat, climate, and species interactions change.',
        'Incorrect. Population growth rate is a separate parameter (r).',
        'Incorrect. The number of species in an area is biodiversity or species richness.'
      ]
    },
    {
      q: 'In a food web, which organisms are primary producers?',
      choices: ['Foxes', 'Rabbits', 'Plants', 'Decomposers'],
      answer: 2,
      concept: 'Primary producers',
      wrongFeedback: [
        'Incorrect. Foxes are tertiary or secondary consumers (carnivores).',
        'Incorrect. Rabbits are primary consumers (herbivores).',
        'Correct! Plants produce their own food using sunlight via photosynthesis, making them primary producers.',
        'Incorrect. Decomposers break down dead matter rather than creating new organic matter from sunlight.'
      ]
    },
    {
      q: 'A trophic level is best described as which of the following?',
      choices: ['A step in a food chain', 'A type of habitat', 'A weather pattern', 'A rock layer'],
      answer: 0,
      concept: 'Trophic level',
      wrongFeedback: [
        'Correct! A trophic level is the position an organism occupies in a food chain or food web.',
        'Incorrect. A habitat is a physical environment, not a step in food energy levels.',
        'Incorrect. Weather patterns are meteorological cycles.',
        'Incorrect. A rock layer is a geological stratum.'
      ]
    }
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
      check: function(h, d2) { if(!h || h.length<60) return false; var r=h.slice(-60); for(var i=0;i<r.length;i++){var ratio=r[i].prey/Math.max(1,r[i].pred); if(ratio<2||ratio>5) return false;} return true; } },
    { id: 'survive_crash', emoji: '\uD83C\uDF31', name: 'Recovery', desc: 'Prey drops below 10, then recovers above 25', reward: 25,
      check: function(h, d2) { if(!h) return false; var saw=false; for(var i=0;i<h.length;i++){if(h[i].prey<10)saw=true; if(saw&&h[i].prey>25) return true;} return false; } },
    { id: 'coexist', emoji: '\uD83E\uDD1D', name: 'Coexistence', desc: 'Both species above 5 for 100 samples', reward: 35,
      check: function(h, d2) { if(!h || h.length<100) return false; var r=h.slice(-100); for(var i=0;i<r.length;i++){if(r[i].prey<5||r[i].pred<5) return false;} return true; } },
    { id: 'apex_crash', emoji: '\uD83D\uDCA5', name: 'Trophic Cascade', desc: 'Predators hit 0 while prey exceed 40', reward: 20,
      check: function(h, d2) { if(!h) return false; for(var i=0;i<h.length;i++){if(h[i].pred===0&&h[i].prey>40) return true;} return false; } },
    { id: 'quiz_ace', emoji: '🎓', name: 'Ecology Scholar', desc: 'Correctly answer 3 questions in the quiz', reward: 20,
      check: function(h, d2) { return d2 && (d2.quizCorrect || 0) >= 3; } },
    { id: 'vocab_study', emoji: '🔍', name: 'Glossary Reader', desc: 'Study 3 key terminology definitions', reward: 15,
      check: function(h, d2) { return d2 && (d2.vocabLookedUp || []).length >= 3; } }
  ];


  // ═══════════════════════════════════════════
  // CONSERVATION MANAGER: 10-YEAR ACADIA / MAINE CAMPAIGN
  // Parallel to Fire Ecology's Wabanaki Cultural Mosaic, but the core
  // pedagogy is trophic cascade and keystone-species dynamics. Six
  // species each with population, habitat, and public support; actions
  // on one species ripple through the food web via cascade rules.
  // Sources: Maine IFW species reports, USFWS recovery plans, NEFSC
  // diadromous fish data, beaver re-establishment literature.
  // ═══════════════════════════════════════════

  var MAINE_SPECIES = [
    {
      id: 'grayWolf', name: 'Gray Wolf', icon: '🐺', color: 'var(--allo-stem-text-soft, #64748b)',
      role: 'Apex predator (extirpated)',
      desc: 'Locally extirpated in Maine for over a century. Reintroduction is the most dramatic conservation move possible: documented in Yellowstone to trigger a trophic cascade by reducing elk browse, letting streamside willows and aspen recover. (Whether wolves also reshaped stream channels themselves is still debated among scientists.)',
      defaultState: { pop: 0, habitat: 60, support: 35 },
      targets: { pop: 50, habitat: 70, support: 60 },
      deepDive: {
        knowledge: 'Wolves were extirpated from Maine by the 1890s through bounties and habitat loss. They have no surviving relict population in the Northeast. The closest wild population is in the western Great Lakes. Eastern timber wolves (Canis lycaon) and gray wolves (Canis lupus) overlap genetically and ecologically in the region.',
        casework: 'The Yellowstone reintroduction (1995-1996) is the most studied case of trophic cascade in North American ecology. Wolf return reduced overpopulated elk herds, allowed willows and aspens to regrow along streams, and helped recover beaver populations. (The popular further claim that wolves "reshaped the rivers" by changing channel morphology is contested — later studies argue the evidence is weaker than the famous videos suggest.) Eastern reintroduction faces different conditions: more roads, more livestock, more fragmented habitat, and a public that has not lived alongside wolves for 5+ generations.',
        modernContext: 'Maine has no active state reintroduction plan. The US Fish and Wildlife Service classifies the gray wolf as endangered in the Lower 48 outside the western Great Lakes. Public opinion in northern Maine is divided: many hunters and livestock owners are opposed; many conservation organizations support recovery. Wabanaki nations have varied positions; some see wolf return as cultural and ecological restoration.'
      }
    },
    {
      id: 'beaver', name: 'American Beaver', icon: '🦫', color: '#92400e',
      role: 'Keystone ecosystem engineer',
      desc: 'The defining engineer of New England wetlands. Their dams raise water tables, slow flooding, create wet meadows, and create firebreaks. Recovering from near-extinction in the 1800s fur trade.',
      defaultState: { pop: 45, habitat: 65, support: 55 },
      targets: { pop: 75, habitat: 75, support: 70 },
      deepDive: {
        knowledge: 'Beavers (Castor canadensis) are the textbook keystone species. A single beaver complex can create up to 10 acres of wetland habitat that supports moose, waterfowl, otters, brook trout, salmon parr, amphibians, and dozens of other species. The wetlands also slow flood pulses, recharge groundwater, and act as natural firebreaks during dry years.',
        casework: 'Beaver populations crashed from an estimated 60-400 million pre-contact to under 100,000 by 1900 across North America, driven by the European fur trade. Recovery since the 1930s has been one of the great wildlife stories on the continent, but recovery is uneven: many watersheds in the Northeast still have far fewer dams than historical records show. Beaver Dam Analog (BDA) restoration mimics the work of beavers to jump-start riparian recovery.',
        modernContext: 'In Maine, beavers face conflict with landowners and road managers over flooding. Lethal trapping continues; Beaver Deceiver flow-control devices are the modern non-lethal alternative. Wabanaki communities have led some of the strongest beaver-protection advocacy in the region.'
      }
    },
    {
      id: 'moose', name: 'Moose', icon: '🫎', color: '#854d0e',
      role: 'Megaherbivore',
      desc: 'Maine\'s iconic megaherbivore and a key prey species for any returning wolf population. Numbers have declined sharply since 2014 due to winter ticks, an outbreak driven by milder winters under climate change.',
      defaultState: { pop: 55, habitat: 70, support: 80 },
      targets: { pop: 70, habitat: 75, support: 75 },
      deepDive: {
        knowledge: 'Moose (Alces alces americana) are heat-stressed above about 23°C. Maine sits at the southern edge of their range. Calf mortality has reached 70-80% in some recent years due to winter tick infestations of 30,000 to 90,000 ticks per individual.',
        casework: 'Maine IFW has managed moose by lottery hunt since 1980. The Department\'s recent population estimates have dropped from over 70,000 in the early 2010s to roughly 60,000-65,000 now, with parts of the western mountains losing 50% or more. Reducing the hunt quota helps slightly but cannot offset the climate-driven tick load.',
        modernContext: 'Moose are central to Maine identity, tourism economy, and Wabanaki subsistence rights. Hunting permits and tribal allocations are negotiated annually. The long-term moose outlook in Maine is uncertain regardless of management; only a colder, longer winter (which we are losing) reliably suppresses winter ticks.'
      }
    },
    {
      id: 'deer', name: 'White-tailed Deer', icon: '🦌', color: '#a16207',
      role: 'Hyperabundant browser',
      desc: 'Hyperabundant in much of southern New England since predators were removed. Heavy browse pressure prevents oak and pine regeneration. In Maine the picture is mixed: dense in the south and along the coast, sparse in the deep north woods.',
      defaultState: { pop: 80, habitat: 80, support: 70 },
      targets: { pop: 55, habitat: 75, support: 70 },
      deepDive: {
        knowledge: 'White-tailed deer (Odocoileus virginianus) populations rebounded after near-extirpation in the late 1800s, then exploded in the absence of large predators and with edge-habitat suburbanization. In the absence of wolves and cougars, hunting is the only meaningful population control across most of the eastern US.',
        casework: 'Forest ecologists across New England have documented "deer browse lines" where oak regeneration is suppressed below about 1.5 meters, leading to long-term canopy turnover into less-preferred species (American beech, striped maple). Lyme disease risk also scales with deer density via the tick lifecycle.',
        modernContext: 'In Maine, hunting limits are set annually. In coastal towns where hunting is restricted, deer densities have reached 40 to 80 per square mile, far above the ecological carrying capacity of about 15. Public pressure to reduce deer is rising as forest impacts and tick-borne disease climb.'
      }
    },
    {
      id: 'salmon', name: 'Atlantic Salmon', icon: '🐟', color: '#ec4899',
      role: 'Anadromous keystone',
      desc: 'Critically endangered in the Gulf of Maine. The Penobscot River is the only Maine river with consistent returning runs. Dam removal has been the key conservation lever; in 2012 and 2013 the Veazie and Great Works dams came down through the Penobscot River Restoration Project.',
      defaultState: { pop: 15, habitat: 35, support: 75 },
      targets: { pop: 50, habitat: 65, support: 80 },
      deepDive: {
        knowledge: 'Atlantic salmon (Salmo salar) are anadromous: born in fresh water, mature at sea, return upstream to spawn. They are extraordinarily sensitive to dam barriers, warm water, and pollution. Maine\'s historic salmon runs are estimated at hundreds of thousands of returning adults per year pre-industrial; current returns are roughly 1,000 to 2,000 annually system-wide.',
        casework: 'The Penobscot River Restoration Project (Penobscot Nation, conservation NGOs, hydro companies) removed two major dams and bypassed a third while preserving most generation capacity through upgrades elsewhere. River herring returns increased over 1000-fold in the first decade post-removal. Atlantic salmon are recovering more slowly because they need both passage and a recovering ocean food web.',
        modernContext: 'The Penobscot Nation has led the legal, political, and ecological fight for salmon recovery on its ancestral river. Salmon are central to Wabanaki cultural identity and Wabanaki Public Health and Wellness food sovereignty work. The Kennebec, Saco, and other rivers have ongoing dam-removal campaigns.'
      }
    },
    {
      id: 'brookTrout', name: 'Brook Trout', icon: '🐠', color: '#0ea5e9',
      role: 'Cold-water indicator',
      desc: 'Maine state fish. Native to cold, clean streams. The Northeast holds the largest remaining wild brook trout populations in the continental United States. Climate warming and habitat fragmentation are the central threats.',
      defaultState: { pop: 50, habitat: 50, support: 65 },
      targets: { pop: 70, habitat: 70, support: 75 },
      deepDive: {
        knowledge: 'Brook trout (Salvelinus fontinalis) need water under about 20°C and high dissolved oxygen. They are functionally allergic to warm water. Hatchery stocking of brown and rainbow trout, both warmer-tolerant non-natives, has displaced wild brookies from many lower-elevation streams.',
        casework: 'The Eastern Brook Trout Joint Venture maps stream populations by status. Maine retains an unusually large portion of historic native brook trout range. Stream restoration (shade canopy, woody debris, undersized culvert replacement) is the main lever; beaver dams help indirectly by creating cold deep pools.',
        modernContext: 'Wabanaki communities and Maine Audubon have led stream-shade-tree planting and undersized-culvert replacement campaigns. Climate change is the long-term threat: every degree of warming pushes the southern range edge north and erases lower-elevation populations.'
      }
    }
  ];

  var CONSERVATION_TECHNIQUES = [
    {
      id: 'habitatProtect', name: 'Habitat Protection', icon: '🌲', hours: 6,
      desc: 'Easements, land-trust acquisition, or regulatory designation. Boosts habitat suitability anywhere.',
      effects: { habitat: 9, support: 1 },
      appliesTo: 'any'
    },
    {
      id: 'reintroduce', name: 'Reintroduction', icon: '🚛', hours: 18,
      desc: 'Capture, transport, and release a founding population. Requires habitat suitability above 60 and public support above 50.',
      effects: { pop: 45, support: -5 },
      appliesTo: ['grayWolf'],
      requires: 'reintroducible',
      oneTime: true
    },
    {
      id: 'quotaReduce', name: 'Lower hunting quota', icon: '🚫', hours: 4,
      desc: 'Reduce the legal harvest to grow population. Costs public support among hunting communities.',
      effects: { pop: 9, support: -6 },
      appliesTo: ['moose', 'deer']
    },
    {
      id: 'quotaIncrease', name: 'Raise hunting quota', icon: '🏹', hours: 4,
      desc: 'Raise the legal harvest. Reduces population. Boosts public support among hunters.',
      effects: { pop: -11, support: 6 },
      appliesTo: ['moose', 'deer']
    },
    {
      id: 'streamRestore', name: 'Stream restoration', icon: '🌊', hours: 8,
      desc: 'Remove barriers, add wood, restore riparian shade. Helps anadromous fish and cold-water species.',
      effects: { habitat: 13, pop: 4 },
      appliesTo: ['salmon', 'brookTrout', 'beaver']
    },
    {
      id: 'damRemoval', name: 'Dam removal', icon: '🪨', hours: 14,
      desc: 'Remove or breach a barrier dam. Big habitat win for salmon and beaver. Politically expensive.',
      effects: { habitat: 22, pop: 6, support: -8 },
      appliesTo: ['salmon']
    },
    {
      id: 'publicEd', name: 'Public education', icon: '📚', hours: 5,
      desc: 'Schools, public talks, media. Boosts public support on the targeted species.',
      effects: { support: 11 },
      appliesTo: 'any'
    },
    {
      id: 'compensate', name: 'Compensation fund', icon: '💰', hours: 6,
      desc: 'Pay livestock owners for predator-related losses. Builds public support for apex predators.',
      effects: { support: 14 },
      appliesTo: ['grayWolf']
    },
    {
      id: 'monitor', name: 'Monitor + document', icon: '📋', hours: 3,
      desc: 'Field surveys, camera traps, eDNA. Tiny direct effects, but builds the case for future funding.',
      effects: { habitat: 1, support: 3 },
      appliesTo: 'any'
    },
    {
      id: 'hold', name: 'Hold steady', icon: '🍃', hours: 0,
      desc: 'No active intervention this year. Some species recover naturally; others continue to drift.',
      effects: {},
      appliesTo: 'any'
    }
  ];

  var CONSERVATION_EVENTS = [
    { id: 'harshWinter',    name: 'Harsh Winter',          icon: '❄️', desc: 'A brutal winter slammed moose and deer populations.',  apply: function(species) { species.forEach(function(s) { if (s.id === 'moose') s.pop = clamp(s.pop - 12, 0, 100); if (s.id === 'deer') s.pop = clamp(s.pop - 7, 0, 100); }); } },
    { id: 'mildWinter',     name: 'Mild Winter',           icon: '🌤️', desc: 'A warm winter favored winter ticks. Moose calves suffered.', apply: function(species) { species.forEach(function(s) { if (s.id === 'moose') s.pop = clamp(s.pop - 8, 0, 100); }); } },
    { id: 'drought',        name: 'Drought Year',          icon: '☀️', desc: 'Low flows raised stream temperatures. Brook trout and salmon both took losses.', apply: function(species) { species.forEach(function(s) { if (s.id === 'brookTrout') { s.habitat = clamp(s.habitat - 9, 0, 100); s.pop = clamp(s.pop - 6, 0, 100); } if (s.id === 'salmon') s.pop = clamp(s.pop - 5, 0, 100); }); } },
    { id: 'majorFlood',     name: 'Major Flood',           icon: '🌊', desc: 'Spring flooding cleared spawning gravels for salmon but blew out beaver dams.', apply: function(species) { species.forEach(function(s) { if (s.id === 'salmon') s.habitat = clamp(s.habitat + 8, 0, 100); if (s.id === 'beaver') s.habitat = clamp(s.habitat - 6, 0, 100); }); } },
    { id: 'disease',        name: 'Disease Outbreak',      icon: '🦠', desc: 'A local pathogen pulse hit a wildlife population hard this year.', apply: function(species) { var pick = species[Math.floor(species.length * 0.5)]; pick.pop = clamp(pick.pop - 14, 0, 100); pick._diseaseHit = true; } },
    { id: 'tribalPartner',  name: 'Tribal Co-Management',   icon: '🤝', desc: 'A formal co-management agreement with Wabanaki nations boosted habitat protection and public support across the board.', apply: function(species) { species.forEach(function(s) { s.support = clamp(s.support + 6, 0, 100); if (s.id === 'salmon' || s.id === 'brookTrout') s.habitat = clamp(s.habitat + 4, 0, 100); }); } },
    { id: 'publicBacklash', name: 'Public Backlash',       icon: '😡', desc: 'A high-profile incident (livestock loss, dog attack, news cycle) cost wolf support.', apply: function(species) { species.forEach(function(s) { if (s.id === 'grayWolf') s.support = clamp(s.support - 14, 0, 100); }); } },
    { id: 'successStory',   name: 'Conservation Success Story', icon: '🌟', desc: 'A documentary, photo, or news feature shifted public mood positively across all species.', apply: function(species) { species.forEach(function(s) { s.support = clamp(s.support + 7, 0, 100); }); } },
    { id: 'climateWarming', name: 'Climate Warming Pulse', icon: '🌡️', desc: 'A multi-year warming pulse pushed cold-water species toward their thermal limits.', apply: function(species) { species.forEach(function(s) { if (s.id === 'brookTrout') s.pop = clamp(s.pop - 6, 0, 100); if (s.id === 'salmon') s.pop = clamp(s.pop - 4, 0, 100); if (s.id === 'moose') s.habitat = clamp(s.habitat - 4, 0, 100); }); } },
    { id: 'budgetShift',    name: 'Political Budget Shift', icon: '🏛️', desc: 'A state budget shake-up reduced field funding. Stewardship hours next year will not change here (you got lucky this round), but support sagged.', apply: function(species) { species.forEach(function(s) { s.support = clamp(s.support - 4, 0, 100); }); } }
  ];

  // Cascade rules: applied AFTER drift + event each year. Each rule reads
  // the post-event state and applies cross-species effects, so a wolf
  // recovery actually suppresses deer, deer hyperabundance degrades all
  // habitats, beavers help salmon and trout, etc.
  var CASCADE_RULES = [
    { id: 'wolfSuppressesDeer', when: function(s) { return getSp(s, 'grayWolf').pop > 25; }, apply: function(s) { var d = getSp(s, 'deer'); d.pop = clamp(d.pop - 8, 0, 100); }, msg: 'Wolves suppressed deer browse pressure.' },
    { id: 'deerHyperBrowse',    when: function(s) { return getSp(s, 'deer').pop > 75; }, apply: function(s) { s.forEach(function(sp) { sp.habitat = clamp(sp.habitat - 2, 0, 100); }); }, msg: 'Deer overbrowsing degraded forest habitat across the board.' },
    { id: 'beaverHelpsFish',    when: function(s) { return getSp(s, 'beaver').pop > 55; }, apply: function(s) { var bt = getSp(s, 'brookTrout'); var sa = getSp(s, 'salmon'); bt.habitat = clamp(bt.habitat + 4, 0, 100); sa.habitat = clamp(sa.habitat + 3, 0, 100); }, msg: 'Beaver wetlands raised water tables and shaded streams.' },
    { id: 'salmonFeedsTrout',   when: function(s) { return getSp(s, 'salmon').pop > 35; }, apply: function(s) { var bt = getSp(s, 'brookTrout'); bt.pop = clamp(bt.pop + 3, 0, 100); }, msg: 'Marine-derived nutrients from returning salmon can subsidize stream food webs in this teaching rule.' }
  ];

  function getSp(species, id) {
    for (var i = 0; i < species.length; i++) if (species[i].id === id) return species[i];
    return { id: id, pop: 0, habitat: 0, support: 0 };
  }

  // Difficulty: hours per year, event severity, harshness
  var CONSERVATION_DIFFICULTIES = {
    apprentice: { id: 'apprentice', label: 'Apprentice', hoursPerYear: 32, eventSkip: 0.3, severity: 0.8, desc: '32 hours / year, gentler events. Good for first runs.' },
    manager:    { id: 'manager',    label: 'Manager',    hoursPerYear: 24, eventSkip: 0,   severity: 1.0, desc: '24 hours / year, standard events. Default.' },
    director:   { id: 'director',   label: 'Director',   hoursPerYear: 18, eventSkip: 0,   severity: 1.4, desc: '18 hours / year, harsher events. Tight constraint.' }
  };

  function defaultConserveState() {
    var diff = CONSERVATION_DIFFICULTIES.manager;
    return {
      phase: 'setup',
      year: 1,
      maxYears: 10,
      difficulty: diff.id,
      hoursPerYear: diff.hoursPerYear,
      hoursLeft: diff.hoursPerYear,
      species: MAINE_SPECIES.map(function(s) { return Object.assign({ id: s.id }, s.defaultState); }),
      yearActions: [],
      yearLog: [],
      lastEvent: null,
      cascadeFiredThisYear: [],
      finalOutcome: null,
      wolfReintroduced: false,
      damRemovals: 0,
      // UI state
      deepDiveSpecies: null,
      firstTipDismissed: false,
      // Deterministic replay
      seed: 'conserve-' + (new Date()).getFullYear() + (new Date()).getMonth() + (new Date()).getDate() + '-' + Math.floor(Math.random() * 9999),
      // AI
      aiReadResponse: null,
      aiReadLoading: false
    };
  }

  function getSpeciesDef(id) {
    for (var i = 0; i < MAINE_SPECIES.length; i++) if (MAINE_SPECIES[i].id === id) return MAINE_SPECIES[i];
    return null;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function conserveRng(seed, year, purpose) {
    var s = (seed || 'default') + ':' + year + ':' + purpose;
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return function() {
      h |= 0; h = (h + 0x6D2B79F5) | 0;
      var t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

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
      { id: 'use_all_graph_views', label: 'View both live graph modes (population and environment)', icon: '\uD83D\uDCCA', check: function(d) { d = d.ecosystem || d; var v = d.graphViewsUsed || {}; return !!(v.population && v.environment); }, progress: function(d) { d = d.ecosystem || d; var v = d.graphViewsUsed || {}; return ((v.population ? 1 : 0) + (v.environment ? 1 : 0)) + '/2 views'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
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
      var vocabLookedUp = d.vocabLookedUp || [];

      var ECO_VOCAB = {
        'Trophic level': 'The position that an organism occupies in a food chain (such as producer, primary consumer, or secondary consumer).',
        'Lotka-Volterra cycle': 'A mathematical model describing how predator and prey populations oscillate out of phase with each other.',
        'Carrying capacity': 'A limiting population level that an environment can support over time under a specified set of conditions. Real carrying capacity can change.',
        'Predation': 'An ecological interaction where one organism (the predator) kills and eats another (the prey).',
        'Primary producers': 'Organisms, like plants or algae, that produce their own organic food from sunlight or chemistry.',
        'Food web': 'A network of interconnecting food chains representing all the energy pathways in an ecosystem.',
        'Phase portrait': 'A graph showing the states of two variables (like prey vs. predator populations) plotted against each other to reveal cyclic paths.',
        'Decomposers': 'Organisms, like bacteria and fungi, that break down dead organic material and recycle nutrients back into the soil.'
      };
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
         var h = hist || data || livePopHistory;
         var currentD = ld.ecosystem || d || {};
         var nc = Object.assign({}, currentD.completedChallenges || {});
         var rpGain = 0;
         ECO_CHALLENGES.forEach(function(ch) {
           if (!nc[ch.id] && ch.check(h, currentD)) {
             nc[ch.id] = true;
             rpGain += ch.reward;
             playSound('badge');
             if (addToast) addToast(ch.emoji + ' Challenge: ' + ch.name + '! +' + ch.reward + ' RP', 'success');
           }
         });
         if (rpGain > 0) {
           var newRP = (currentD.researchPoints || 0) + rpGain;
           var newTotal = (currentD.totalRP || 0) + rpGain;
           updMulti({ completedChallenges: nc, researchPoints: newRP, totalRP: newTotal });
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
          var logisticFactor = 1 - prey / K;
          var newPrey = Math.max(0, prey + preyBirth * prey * logisticFactor - preyDeath * prey * pred);
          var newPred = Math.max(0, pred + predBirth * prey * pred - predDeath * pred);
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
        // Scale to the DATA (with headroom) so the curves stay readable. The old code let a high
        // carrying-capacity line push maxY up to K+10, squashing a crashed population into the bottom
        // few % of the chart. Only expand to include K when it sits near the data; otherwise keep the
        // data-scaled view and flag K as off the top.
        var dataMax = Math.max(maxPrey, maxPred, 10);
        var maxY = dataMax * 1.18;
        var kVisible = carryingCapacity > 0 && carryingCapacity <= maxY;
        if (carryingCapacity > maxY && carryingCapacity <= dataMax * 1.8) { maxY = carryingCapacity * 1.06; kVisible = true; }
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

        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'w-full', style: { maxHeight: 200 }, role: 'img', 'aria-label': __alloT('stem.ecosystem.aria_pop_traj_pre', 'Predator and prey population trajectories over ') + (data.length - 1) + __alloT('stem.ecosystem.aria_modeled_time_steps', ' modeled time steps.') },
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
          // Carrying capacity dashed line — only when within the plotted range; the label is now
          // right-anchored INSIDE the plot (it used to overflow past the viewBox at x = W - pad + 2)
          kVisible && h('line', { x1: pad, y1: carryY, x2: W - pad, y2: carryY, stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '6,4', opacity: 0.7 }),
          kVisible
            ? h('text', { x: W - pad - 2, y: carryY - 3, textAnchor: 'end', fill: '#f59e0b', fontSize: 7 }, 'K=' + carryingCapacity)
            : h('text', { x: W - pad - 2, y: pad + 8, textAnchor: 'end', fill: '#f59e0b', fontSize: 7 }, 'K=' + carryingCapacity + ' ↑'),
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
          h('text', { x: W / 2, y: H - 4, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, __alloT('stem.ecosystem.axis_time_steps', 'Time Steps')),
          h('text', { x: 8, y: H / 2, textAnchor: 'middle', fill: '#94a3b8', fontSize: 11, transform: 'rotate(-90, 8, ' + (H / 2) + ')' }, __alloT('stem.ecosystem.axis_population', 'Population'))
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
        // 10% headroom so a final point at the max isn't clipped by the axis edge (the r=5 end dot used to be half-cut)
        var axPrey = maxPrey * 1.1, axPred = maxPred * 1.1;
        var sx = function(v) { return pad + (v / axPrey) * (W - 2 * pad); };
        var sy = function(v) { return H - pad - (v / axPred) * (H - 2 * pad); };

        // gridlines (mirrors the population chart so the phase plane is readable, not a bare box)
        var phaseGrid = [];
        for (var pg = 1; pg <= 3; pg++) {
          var gx = pad + pg * ((W - 2 * pad) / 4);
          var gy = pad + pg * ((H - 2 * pad) / 4);
          phaseGrid.push(h('line', { key: 'pgx' + pg, x1: gx, y1: pad, x2: gx, y2: H - pad, stroke: '#334155', strokeWidth: 0.4 }));
          phaseGrid.push(h('line', { key: 'pgy' + pg, x1: pad, y1: gy, x2: W - pad, y2: gy, stroke: '#334155', strokeWidth: 0.4 }));
        }

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
          h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'w-full', style: { maxHeight: 200 }, role: 'img', 'aria-label': __alloT('stem.ecosystem.aria_phase_portrait_pre', 'Phase portrait of predator abundance versus prey abundance across ') + (data.length - 1) + __alloT('stem.ecosystem.aria_modeled_time_steps', ' modeled time steps.') },
            phaseGrid,
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
            h('text', { x: W / 2, y: H - 4, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, __alloT('stem.ecosystem.axis_prey_population', 'Prey Population')),
            h('text', { x: 8, y: H / 2, textAnchor: 'middle', fill: '#94a3b8', fontSize: 11, transform: 'rotate(-90, 8, ' + (H / 2) + ')' }, __alloT('stem.ecosystem.axis_predator_population', 'Predator Population'))
          ),
          h('div', { className: 'flex gap-3 text-xs text-slate-600 mt-1 justify-center' },
            h('span', null, '\uD83D\uDD04 ' + __alloT('stem.ecosystem.cycles_label', 'Cycles: ') + cycles),
            h('span', null, '\uD83D\uDC07 ' + __alloT('stem.ecosystem.peak_prey_label', 'Peak Prey: ') + peakPrey),
            h('span', null, '\uD83E\uDD8A ' + __alloT('stem.ecosystem.peak_pred_label', 'Peak Pred: ') + peakPred)
          )
        );
      };

      // ── Environment graph (from livePopHistory) ──
      var buildEnvSVG = function() {
        var hist = livePopHistory;
        if (!hist || hist.length < 2) return h('p', { className: 'text-xs text-slate-600 text-center py-4' }, __alloT('stem.ecosystem.run_sim_env_data', 'Run the canvas simulation to see environment data.'));
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

        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'w-full', style: { maxHeight: 200 }, role: 'img', 'aria-label': __alloT('stem.ecosystem.aria_veg_day_pre', 'Vegetation-health and day-phase indices over ') + hist.length + __alloT('stem.ecosystem.aria_live_samples', ' live samples.') },
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
          h('text', { x: W / 2, y: H - 4, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, __alloT('stem.ecosystem.axis_time', 'Time')),
          h('text', { x: 8, y: H / 2, textAnchor: 'middle', fill: '#94a3b8', fontSize: 11, transform: 'rotate(-90, 8, ' + (H / 2) + ')' }, __alloT('stem.ecosystem.axis_level_0_1', 'Level (0\u20131)'))
        );
      };

      // ── Canvas ref callback (MAJOR ENHANCEMENTS) ──
      var canvasRef = function(canvas) {
        if (!canvas) {
          // React fires an inline ref (null)-then-(node) on EVERY re-render. Without
          // deferral the whole simulation is torn down and rebuilt each time the sim
          // pushes React state (e.g. livePopHistory) — resetting creatures continuously
          // (the stutter). Defer teardown so an immediate re-attach cancels it; a real
          // unmount (null with no re-attach) still cleans up after the timeout.
          if (typeof window !== 'undefined') {
            if (window._ecoCleanupTimer) return;
            window._ecoCleanupTimer = setTimeout(function() {
              window._ecoCleanupTimer = null;
              if (window._ecosystemCanvasCleanup) window._ecosystemCanvasCleanup();
            }, 60);
          }
          return;
        }
        if (typeof window !== 'undefined' && window._ecoCleanupTimer) { clearTimeout(window._ecoCleanupTimer); window._ecoCleanupTimer = null; }
        if (canvas._ecoInit) {
          if (canvas._ecoSchedule) canvas._ecoSchedule();
          return;
        }
        if (typeof window !== 'undefined' && window._ecosystemCanvasCleanup) window._ecosystemCanvasCleanup();
        canvas._ecoInit = true;

        var ctxC = canvas.getContext('2d');
        if (!ctxC) { canvas._ecoInit = false; return; }
        var dpr = window.devicePixelRatio || 2;
        var cw = canvas.clientWidth;
        var ch = canvas.clientHeight;
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
        ctxC.scale(dpr, dpr);

        var tick = 0;
        var animId = null;
        var ecoAlive = true;
        var wasDay = true;

        function isEcoHidden() {
          return typeof document !== 'undefined' && !!document.hidden;
        }

        function cancelEcoFrame() {
          if (animId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(animId);
          animId = null;
        }

        function scheduleEcoFrame() {
          if (!ecoAlive || animId || isEcoHidden()) return;
          if (typeof requestAnimationFrame !== 'function') return;
          animId = requestAnimationFrame(draw);
        }

        function cleanupEcoCanvas() {
          ecoAlive = false;
          cancelEcoFrame();
          canvas.removeEventListener('mousemove', onMouseMove);
          canvas.removeEventListener('mousedown', onMouseDown);
          canvas.removeEventListener('mouseup', onMouseUp);
          canvas.removeEventListener('click', onClick);
          canvas.removeEventListener('touchstart', onTouchStart);
          canvas.removeEventListener('touchmove', onTouchMove);
          canvas.removeEventListener('touchend', onMouseUp);
          canvas.removeEventListener('touchcancel', onMouseUp);
          if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onEcoVisibilityChange);
          canvas._ecoInit = false;
          canvas._ecoCleanup = null;
          canvas._ecoSchedule = null;
          if (typeof window !== 'undefined' && window._ecosystemCanvasCleanup === cleanupEcoCanvas) window._ecosystemCanvasCleanup = null;
        }

        function onEcoVisibilityChange() {
          if (!ecoAlive) return;
          if (!canvas.isConnected) { cleanupEcoCanvas(); return; }
          if (isEcoHidden()) cancelEcoFrame();
          else { cancelEcoFrame(); draw(); }
        }
        // Rolling population history for the phase explainer + live mini-chart.
        // Sampled every ~10 frames (6 samples/sec), capped at last 60 samples
        // = 10 seconds of history. Closed over the animation loop so it
        // persists across frames without state.dataset thrash.
        var popHistory = [];
        var POP_HISTORY_MAX = 60;
        var POP_SAMPLE_EVERY = 10;

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

        // Touch parity for the sandbox 'Move' (drag-to-reposition) tool on the
        // pilot's touchscreen Chromebooks — placement tools already work via the
        // synthesized click. Forward the single-touch point to the mouse handlers;
        // only preventDefault once a drag is actually in progress, so tap-to-place
        // and normal page scrolling over the canvas are unaffected.
        var onTouchStart = function(e) {
          if (e.touches && e.touches[0]) {
            onMouseDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
            if (canvas._dragging) e.preventDefault();
          }
        };
        var onTouchMove = function(e) {
          if (e.touches && e.touches[0]) {
            onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
            if (canvas._dragging) e.preventDefault();
          }
        };
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onMouseUp);
        canvas.addEventListener('touchcancel', onMouseUp);
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onEcoVisibilityChange);
        canvas._ecoCleanup = cleanupEcoCanvas;
        canvas._ecoSchedule = scheduleEcoFrame;
        if (typeof window !== 'undefined') window._ecosystemCanvasCleanup = cleanupEcoCanvas;

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
            alive: fi < pred0, facing: Math.random() > 0.5 ? 1 : -1, hunting: false,
            // Lotka-Volterra realism: predators that don't catch prey eventually
            // starve. hunger ticks up per frame, resets to 0 on a kill. When it
            // crosses STARVE_THRESHOLD the predator dies. huntCooldown gates
            // back-to-back kills so a single fox can't sprint through 5 rabbits
            // in 1 second. Both fields needed so the live canvas matches the
            // analytical Lotka-Volterra chart (boom-bust oscillation rather
            // than instant extinction).
            hunger: 0, huntCooldown: 0
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
          if (!ecoAlive) return;
          animId = null;
          if (!canvas.isConnected) { cleanupEcoCanvas(); return; }
          if (isEcoHidden()) { cancelEcoFrame(); return; }
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
            // Lotka-Volterra realism added here: predators have hunger that
            // ticks up each frame; a kill resets hunger to 0. Crossing
            // STARVE_THRESHOLD = death. A huntCooldown after each kill stops
            // a single fox from chain-killing several rabbits in one second.
            // Together with prey reproduction (below), the live canvas now
            // produces the boom-bust oscillation the analytical chart shows.
            //
            // Day/night realism: foxes are crepuscular/nocturnal hunters
            // in reality. At night they detect prey further (HUNT_RADIUS_DAY/NIGHT)
            // and close the gap faster (CHASE_SPEED_DAY/NIGHT). This honors
            // the "foxes hunt more effectively in the dark" toast that
            // previously had no code behind it.
            var STARVE_THRESHOLD = 720;  // ~12 seconds at 60fps without a kill
            var HUNT_COOLDOWN = 90;       // ~1.5 seconds before another kill
            // Drought-time hunt boost: weakened prey are easier to detect
            // and easier to chase. Real ecology — drought makes prey
            // dehydrated/slower, predators get a one-time advantage
            // window (which is itself short-lived because prey reproduce
            // less during drought, so the predator boost accelerates the
            // collapse rather than benefiting predators long-term).
            var droughtBoost = droughtTicks > 0 ? 1.15 : 1.0;
            var HUNT_RADIUS = (isDay ? 100 : 130) * droughtBoost;
            var CHASE_GAIN = (isDay ? 0.40 : 0.55) * droughtBoost;
            var CHASE_GAIN_Y = (isDay ? 0.30 : 0.42) * droughtBoost;
            for (var fxi = 0; fxi < predEntities.length; fxi++) {
              var f = predEntities[fxi];
              if (!f.alive) continue;
              // Hunger + cooldown tick
              f.hunger = (f.hunger || 0) + 1;
              if (f.huntCooldown > 0) f.huntCooldown--;
              // Starvation
              if (f.hunger >= STARVE_THRESHOLD) {
                f.alive = false;
                playSound('death');
                for (var cps = 0; cps < 4; cps++) {
                  catchParticles.push({
                    x: f.x, y: f.y,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: -Math.random() * 1.5,
                    life: 1.0,
                    color: 'var(--allo-stem-text-soft, #94a3b8)'  // gray puff = starved, distinct from kill puff
                  });
                }
                continue;
              }
              f.x += f.vx;
              f.y += f.vy;
              if (f.x < 15) { f.x = 15; f.vx = Math.abs(f.vx); f.facing = 1; }
              if (f.x > cw - 15) { f.x = cw - 15; f.vx = -Math.abs(f.vx); f.facing = -1; }
              if (f.y < groundY) { f.y = groundY; f.vy = Math.abs(f.vy); }
              if (f.y > groundBottom) { f.y = groundBottom; f.vy = -Math.abs(f.vy); }

              f.hunting = false;
              var nearDist = HUNT_RADIUS;
              var nearPrey = null;
              for (var np = 0; np < preyEntities.length; np++) {
                if (!preyEntities[np].alive) continue;
                var dx = preyEntities[np].x - f.x;
                var dy = preyEntities[np].y - f.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                // Vegetation cover: if this prey is near a healthy plant,
                // the predator's effective detection range shrinks. Real
                // ecology — habitat heterogeneity. Walks the vegetation
                // array once per prey scanned (acceptable cost — vegetation
                // count is ~30, prey ~80, so worst case 2400 ops/frame).
                // Only healthy plants (>0.5) provide meaningful cover —
                // wildfires/drought reduce a plant\'s cover value.
                var coverPenalty = 1.0;
                for (var cvi = 0; cvi < vegetation.length; cvi++) {
                  var v = vegetation[cvi];
                  if (v.health < 0.5) continue;
                  var vdx = preyEntities[np].x - v.x;
                  var vdy = preyEntities[np].y - v.y;
                  var vdSq = vdx * vdx + vdy * vdy;
                  if (vdSq < 400) {  // within 20px of a healthy plant
                    coverPenalty = 0.6;  // predator only sees 60% as far
                    break;
                  }
                }
                if (dist < nearDist * coverPenalty) {
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
                  f.vx = f.vx * 0.9 + (chDx / chDist) * CHASE_GAIN;
                  f.vy = f.vy * 0.9 + (chDy / chDist) * CHASE_GAIN_Y;
                }
                f.facing = chDx > 0 ? 1 : -1;

                // Kill only if cooldown has expired AND within strike range
                if (chDist < 6 && f.huntCooldown <= 0) {
                  // Capture whether this predator was well-fed BEFORE the
                  // kill resets hunger — needed for the reproduction check.
                  // A well-fed predator (hunger < 240, i.e. fed within the
                  // last ~4 seconds) has the calories to reproduce; a
                  // starving one is just keeping itself alive.
                  var wasWellFed = (f.hunger || 0) < 240;
                  nearPrey.alive = false;
                  f.hunger = 0;                 // satiated
                  f.huntCooldown = HUNT_COOLDOWN; // post-kill cooldown
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
                  // ── Predator reproduction ──
                  // Closes the Lotka-Volterra loop. Without this, the
                  // predator population only ever decreases (starvation
                  // with no births). When a well-fed predator catches
                  // prey AND there's a free pool slot AND a small random
                  // roll succeeds, respawn a dead predator near the
                  // parent. Birth rate kept low (10%) so the cycle has
                  // long enough phases for students to see boom/bust.
                  if (wasWellFed && Math.random() < 0.10) {
                    var predSpawnIdx = -1;
                    for (var ps = 0; ps < predEntities.length; ps++) {
                      if (!predEntities[ps].alive) { predSpawnIdx = ps; break; }
                    }
                    if (predSpawnIdx >= 0) {
                      var bornPred = predEntities[predSpawnIdx];
                      bornPred.alive = true;
                      bornPred.x = f.x + (Math.random() - 0.5) * 12;
                      bornPred.y = f.y + (Math.random() - 0.5) * 6;
                      bornPred.vx = (Math.random() - 0.5) * 0.8;
                      bornPred.vy = (Math.random() - 0.5) * 0.5;
                      bornPred.facing = Math.random() > 0.5 ? 1 : -1;
                      bornPred.hunting = false;
                      bornPred.hunger = 0;     // born well-fed (parent shared the kill)
                      bornPred.huntCooldown = HUNT_COOLDOWN; // can't immediately hunt
                      // Orange sparkle for predator birth (distinct from
                      // green prey birth + gray starvation puff).
                      for (var bps = 0; bps < 3; bps++) {
                        catchParticles.push({
                          x: bornPred.x, y: bornPred.y,
                          vx: (Math.random() - 0.5) * 1.5,
                          vy: -Math.random() * 1.5,
                          life: 1.0,
                          color: '#fb923c'
                        });
                      }
                    }
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

            // ── Prey reproduction ──
            // Lotka-Volterra births: when two living prey are near each other
            // AND we're below carrying capacity, occasionally respawn a dead
            // prey slot. Tuned so per-frame probability * average pairings
            // roughly matches the analytical preyBirth rate, producing
            // recoverable populations after predator pressure eases.
            //
            // Carrying capacity respects BOTH the pool size cap AND the
            // K slider in the side panel (whichever is smaller). Previously
            // the slider only affected the analytical chart, not the canvas
            // — now moving K visibly throttles the canvas reproduction too.
            //
            // Vegetation modifier: average vegetation health scales the
            // birth probability. Low veg = less food = slower prey
            // reproduction. Closes the "compute vegHealth then ignore it"
            // gap. Range 0.4 (healthy) → 0.1 (depleted) so the effect is
            // noticeable without being punitive.
            var CARRYING_K = Math.min(preyEntities.length, carryK);
            var aliveCount = 0;
            var firstDeadIdx = -1;
            for (var pcnt = 0; pcnt < preyEntities.length; pcnt++) {
              if (preyEntities[pcnt].alive) aliveCount++;
              else if (firstDeadIdx < 0) firstDeadIdx = pcnt;
            }
            // Average current vegetation health across the field
            var vegSum = 0, vegN = 0;
            for (var vhi = 0; vhi < vegetation.length; vhi++) {
              vegSum += vegetation[vhi].health || 0;
              vegN++;
            }
            var avgVegHealth = vegN > 0 ? (vegSum / vegN) : 1;
            // Map vegHealth (0-1) to a reproduction modifier (0.4-1.0)
            // so depleted vegetation slows but doesn\'t stop reproduction.
            var vegReproMod = 0.4 + 0.6 * avgVegHealth;
            // Only attempt reproduction if there's room + at least one dead slot
            if (firstDeadIdx >= 0 && aliveCount < CARRYING_K && aliveCount >= 2) {
              // Logistic damping — birth rate falls as we approach K
              var roomFactor = 1 - (aliveCount / CARRYING_K);
              // Sample a few pairs randomly per frame rather than O(n²).
              // 3 pair-checks per frame keeps cost low; if any are close, roll
              // the birth die (4% × roomFactor). Net effect: a healthy
              // population at 30% capacity births ~0.4 prey per second.
              for (var pairTry = 0; pairTry < 3; pairTry++) {
                var a = preyEntities[Math.floor(Math.random() * preyEntities.length)];
                var b = preyEntities[Math.floor(Math.random() * preyEntities.length)];
                if (a === b || !a.alive || !b.alive) continue;
                var pdx = a.x - b.x, pdy = a.y - b.y;
                if (pdx * pdx + pdy * pdy < 625) {  // within ~25px
                  // Drought modifier × vegetation modifier: when an active
                  // drought is reducing water OR the field's vegetation
                  // is generally depleted (heavy grazing pressure), prey
                  // reproduce slower. Drought returns to 1 when droughtTicks
                  // runs out; veg recovers passively as preyAlive falls.
                  if (Math.random() < 0.04 * roomFactor * droughtPreyReproMod * vegReproMod) {
                    // Find next dead slot fresh (state may have changed mid-loop)
                    var spawnIdx = -1;
                    for (var sps = 0; sps < preyEntities.length; sps++) {
                      if (!preyEntities[sps].alive) { spawnIdx = sps; break; }
                    }
                    if (spawnIdx >= 0) {
                      var born = preyEntities[spawnIdx];
                      born.alive = true;
                      born.x = (a.x + b.x) / 2 + (Math.random() - 0.5) * 8;
                      born.y = (a.y + b.y) / 2 + (Math.random() - 0.5) * 4;
                      born.vx = (Math.random() - 0.5) * 1.2;
                      born.vy = (Math.random() - 0.5) * 0.8;
                      born.hop = Math.random() * Math.PI * 2;
                      born.facing = Math.random() > 0.5 ? 1 : -1;
                      // Tiny green sparkle so the birth is visible (uses
                      // existing particle system, no new infrastructure).
                      for (var bps = 0; bps < 3; bps++) {
                        catchParticles.push({
                          x: born.x, y: born.y,
                          vx: (Math.random() - 0.5) * 1.5,
                          vy: -Math.random() * 1.5,
                          life: 1.0,
                          color: '#86efac'  // soft green = birth
                        });
                      }
                      break;  // one birth per frame max
                    }
                  }
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

            // ── Population dynamics ──
            // The per-frame Lotka-Volterra system above (predator hunger,
            // hunt cooldown, prey proximity reproduction, predator-on-kill
            // reproduction) supersedes the old every-200-tick bulk system
            // that used to live here. Removed in this pass — the per-frame
            // logic is finer-grained, causally tied to actual interactions
            // (kills, proximity), and doesn\'t produce the visible "spawn
            // pulse" the old bulk system did. Drought integration that
            // formerly lived in this block is now wired via
            // droughtPreyReproMod into the per-frame reproduction check.

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



          // ── Clear the canvas before redrawing ──
          // Without this, the sky-fill (top half) + ground-fill (wavy top
          // around y=0.48ch) leave an uncovered strip near the horizon when
          // the wavy ground line dips below the sky fill, OR when the
          // canvas's CSS-displayed size diverges from its bitmap size and
          // the cached cw/ch no longer fully covers the visible area.
          // Either way, ghost sprites from previous frames leak through as
          // a horizontal band of distortion. Explicit clearRect kills it.
          ctxC.clearRect(0, 0, cw, ch);

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
              ctxC.arc(star.x, star.y, 1 + (star.twinkle % 1) * 0.5, 0, Math.PI * 2);
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
            ctxC.shadowBlur = 28 + Math.sin(tick * 0.02) * 6;
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
          // Snap each plant's Y to the rolling-hill ground curve at the
          // plant's X. Previously plants used a random Y assigned at
          // creation, which made them visibly float above (or sink below)
          // the wavy ground line. Now they sit on the hill.
          // Ground curve formula MUST match the one above at line ~1699
          // (gy = ch * 0.48 + sin(gx*0.015)*8 + sin(gx*0.007+1)*12).
          for (var vgi2 = 0; vgi2 < vegetation.length; vgi2++) {
            var veg2 = vegetation[vgi2];
            var groundYHere = ch * 0.48 + Math.sin(veg2.x * 0.015) * 8 + Math.sin(veg2.x * 0.007 + 1) * 12;
            ctxC.save();
            ctxC.translate(veg2.x, groundYHere);

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

            // ── Hunger bar (Phase L8) ──
            // Rendered AFTER the scale/translate restore so it sits in
            // world coordinates (no mirror flip from facing). A tiny
            // 14px bar above each fox shows hunger as a fraction of
            // STARVE_THRESHOLD. Color shifts green→yellow→red as the
            // bar fills, so students can see WHICH predators are about
            // to starve before the population crash phase explainer
            // labels it. Skipped on freshly-fed foxes to reduce visual
            // noise — only shows once hunger crosses ~30%.
            var hungerFrac = Math.min(1, (f2.hunger || 0) / STARVE_THRESHOLD);
            if (hungerFrac > 0.3) {
              var hbarW = 14, hbarH = 2;
              var hbarX = f2.x - hbarW / 2;
              var hbarY = f2.y - 14;
              // Background track
              ctxC.fillStyle = 'rgba(15,23,42,0.6)';
              ctxC.fillRect(hbarX, hbarY, hbarW, hbarH);
              // Fill — color shifts with hunger
              var fillColor;
              if (hungerFrac > 0.85) fillColor = '#dc2626';        // critical red
              else if (hungerFrac > 0.6) fillColor = '#f59e0b';    // amber
              else fillColor = '#84cc16';                          // lime (lightly hungry)
              ctxC.fillStyle = fillColor;
              ctxC.fillRect(hbarX, hbarY, hbarW * hungerFrac, hbarH);
            }
          }

          // ── Catch particles rendering ──
          for (var cpi2 = 0; cpi2 < catchParticles.length; cpi2++) {
            var part2 = catchParticles[cpi2];
            ctxC.globalAlpha = part2.life;
            ctxC.fillStyle = part2.color;
            ctxC.beginPath();
            ctxC.arc(part2.x, part2.y, 1 + part2.life * 2, 0, Math.PI * 2);
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

          // ── Sample population history (every 10th frame) ──
          // Feeds the phase explainer + the live mini-chart below.
          if (tick % POP_SAMPLE_EVERY === 0) {
            popHistory.push({ p: hudPreyAlive, f: hudPredAlive });
            if (popHistory.length > POP_HISTORY_MAX) popHistory.shift();
          }

          // ── Phase detection ──
          // Read the rolling history to classify what part of the cycle the
          // ecosystem is in right now. Compares mean of recent 1/3 vs older
          // 2/3 of the buffer to detect trends. Pure inspection — never
          // changes simulation state, just labels what students are seeing.
          // Each phase gets a 1-sentence biology explainer for the bottom
          // tip strip — the difference between NAMING what's happening and
          // EXPLAINING the underlying mechanism.
          var phaseLabel = '';
          var phaseColor = 'rgba(100,116,139,0.85)';
          var phaseExplain = '';
          if (popHistory.length >= 12) {
            var splitIdx = Math.floor(popHistory.length * 0.66);
            var oldP = 0, oldF = 0, newP = 0, newF = 0;
            var oldN = 0, newN = 0;
            for (var phi = 0; phi < popHistory.length; phi++) {
              if (phi < splitIdx) { oldP += popHistory[phi].p; oldF += popHistory[phi].f; oldN++; }
              else { newP += popHistory[phi].p; newF += popHistory[phi].f; newN++; }
            }
            var pMean = oldN > 0 ? oldP / oldN : 0;
            var fMean = oldN > 0 ? oldF / oldN : 0;
            var pNew = newN > 0 ? newP / newN : 0;
            var fNew = newN > 0 ? newF / newN : 0;
            var pTrend = pNew - pMean;
            var fTrend = fNew - fMean;
            // Carrying capacity reference (pool sizes)
            var preyPool = preyEntities.length;
            var predPool = predEntities.length;
            // Phase rules — checked in priority order
            if (hudPreyAlive === 0) {
              phaseLabel = '☠ Prey extinct';
              phaseColor = 'rgba(127,29,29,0.85)';
              phaseExplain = 'All prey are dead. Predators will starve without a food source. Trigger Food-boom or Migration to restart the cycle.';
            } else if (hudPredAlive === 0) {
              phaseLabel = '🌱 Predator-free recovery';
              phaseColor = 'rgba(20,83,45,0.85)';
              phaseExplain = 'No predators left. Prey will multiply until they hit carrying capacity (K) and overgrazing slows reproduction.';
            } else if (pTrend < -2 && hudPreyAlive < preyPool * 0.3) {
              phaseLabel = '⚠ Prey crash';
              phaseColor = 'rgba(153,27,27,0.85)';
              phaseExplain = 'Predators are eating prey faster than prey can reproduce. Watch for predator starvation to follow as food runs out.';
            } else if (fTrend < -1 && hudPreyAlive < preyPool * 0.4) {
              phaseLabel = '🍃 Predator starvation';
              phaseColor = 'rgba(120,53,15,0.85)';
              phaseExplain = 'Predators are dying because they cannot catch enough prey. As predators drop, prey gets a chance to recover.';
            } else if (pTrend > 1.5 && hudPreyAlive < preyPool * 0.6) {
              phaseLabel = '🌿 Prey rebound';
              phaseColor = 'rgba(22,101,52,0.85)';
              phaseExplain = 'Prey are reproducing faster than predators can catch them. Predator births will lag this rebound by about a quarter-cycle.';
            } else if (fTrend > 0.5 && pTrend < 0) {
              phaseLabel = '🦊 Predator pressure';
              phaseColor = 'rgba(154,52,18,0.85)';
              phaseExplain = 'Predators are well-fed and reproducing. Their growing population is starting to outpace prey births — a crash may follow.';
            } else if (hudPreyAlive > preyPool * 0.75 && Math.abs(pTrend) < 1) {
              phaseLabel = '☀ Prey boom';
              phaseColor = 'rgba(21,128,61,0.85)';
              phaseExplain = 'Prey are abundant. Vegetation may start to deplete (over-grazing) and predators will breed in response to the food surplus.';
            } else {
              phaseLabel = '⚖ Equilibrium';
              phaseColor = 'rgba(30,64,175,0.85)';
              phaseExplain = 'Both populations are roughly stable. This is the textbook Lotka-Volterra balance — easy to disrupt with a Drought, Disease, or Wildfire event.';
            }
          }

          // ── Live mini-chart (top-right) ──
          // Shows the last ~10 seconds of prey + predator counts as
          // overlaid sparklines. Same data as the analytical chart\'s
          // model, but THIS is what the canvas actually did. Students
          // can compare model-vs-reality at a glance without leaving
          // the sim view.
          if (popHistory.length >= 2) {
            var miniW = 110, miniH = 44;
            var miniX = cw - miniW - 10, miniY = 10;
            // Backing pill
            ctxC.fillStyle = 'rgba(15,23,42,0.75)';
            ctxC.beginPath();
            ctxC.moveTo(miniX + 6, miniY);
            ctxC.arcTo(miniX + miniW, miniY, miniX + miniW, miniY + miniH, 6);
            ctxC.arcTo(miniX + miniW, miniY + miniH, miniX, miniY + miniH, 6);
            ctxC.arcTo(miniX, miniY + miniH, miniX, miniY, 6);
            ctxC.arcTo(miniX, miniY, miniX + miniW, miniY, 6);
            ctxC.fill();
            // Title
            ctxC.font = '8px sans-serif';
            ctxC.fillStyle = '#94a3b8';
            ctxC.fillText(__alloT('stem.ecosystem.last_10s', 'Last ~10s'), miniX + 6, miniY + 9);
            // Max-of-pools as the y-axis ceiling (so both lines fit)
            var miniMax = Math.max(preyEntities.length, predEntities.length, 1);
            var plotX = miniX + 4;
            var plotY = miniY + 13;
            var plotW = miniW - 8;
            var plotH = miniH - 16;
            // Faint baseline
            ctxC.strokeStyle = 'rgba(148,163,184,0.20)';
            ctxC.lineWidth = 1;
            ctxC.beginPath();
            ctxC.moveTo(plotX, plotY + plotH);
            ctxC.lineTo(plotX + plotW, plotY + plotH);
            ctxC.stroke();
            // Prey line (green)
            ctxC.strokeStyle = '#22c55e';
            ctxC.lineWidth = 1.5;
            ctxC.beginPath();
            for (var mli = 0; mli < popHistory.length; mli++) {
              var mx = plotX + (mli / (POP_HISTORY_MAX - 1)) * plotW;
              var my = plotY + plotH - (popHistory[mli].p / miniMax) * plotH;
              if (mli === 0) ctxC.moveTo(mx, my); else ctxC.lineTo(mx, my);
            }
            ctxC.stroke();
            // Predator line (red)
            ctxC.strokeStyle = '#ef4444';
            ctxC.lineWidth = 1.5;
            ctxC.beginPath();
            for (var mli2 = 0; mli2 < popHistory.length; mli2++) {
              var mx2 = plotX + (mli2 / (POP_HISTORY_MAX - 1)) * plotW;
              var my2 = plotY + plotH - (popHistory[mli2].f / miniMax) * plotH;
              if (mli2 === 0) ctxC.moveTo(mx2, my2); else ctxC.lineTo(mx2, my2);
            }
            ctxC.stroke();
          }

          ctxC.fillStyle = 'rgba(15,23,42,0.75)';
          var hudW = 130, hudH = 56;
          ctxC.beginPath();
          ctxC.moveTo(8 + 6, 8);
          ctxC.arcTo(8 + hudW, 8, 8 + hudW, 8 + hudH, 6);
          ctxC.arcTo(8 + hudW, 8 + hudH, 8, 8 + hudH, 6);
          ctxC.arcTo(8, 8 + hudH, 8, 8, 6);
          ctxC.arcTo(8, 8, 8 + hudW, 8, 6);
          ctxC.fill();

          // HUD text on the rgba(15,23,42,0.75) background needs strong
          // contrast against any biome's sky color (sometimes light blue).
          // slate-400 (#94a3b8) gave only ~3:1 over a daytime sky; slate-200
          // (#e2e8f0) gives ~12:1 over the dark HUD bg and stays legible
          // even when the gradient over a lit sky thins it out.
          ctxC.font = '10px sans-serif';
          ctxC.fillStyle = '#e2e8f0';
          ctxC.fillText('\uD83D\uDC07 ' + __alloT('stem.ecosystem.prey_colon', 'Prey: ') + hudPreyAlive, 14, 24);
          ctxC.fillText('\uD83E\uDD8A ' + __alloT('stem.ecosystem.predators_colon', 'Predators: ') + hudPredAlive, 14, 38);

          // Population bars — normalized to actual pool sizes so the bars
          // stay informative even when populations boom past the old
          // hardcoded 60/25 caps. Without this fix, a healthy prey
          // population of 75 vs 80 looks identical (both 100%) on the bar.
          var barX = 100, barW = 30;
          var preyCap = preyEntities.length || 1;
          var predCap = predEntities.length || 1;
          ctxC.fillStyle = '#334155';
          ctxC.fillRect(barX, 16, barW, 6);
          ctxC.fillStyle = '#22c55e';
          ctxC.fillRect(barX, 16, barW * Math.min(1, hudPreyAlive / preyCap), 6);
          ctxC.fillStyle = '#334155';
          ctxC.fillRect(barX, 30, barW, 6);
          ctxC.fillStyle = '#ef4444';
          ctxC.fillRect(barX, 30, barW * Math.min(1, hudPredAlive / predCap), 6);

          // Day/night indicator
          ctxC.fillStyle = '#e2e8f0';
          ctxC.fillText(isDayR ? '\u2600 Day' : '\uD83C\uDF19 Night', 14, 52);

          // ── Sandbox tool indicator in HUD ──
          if (sandboxToolVal) {
            ctxC.fillStyle = 'rgba(16,185,129,0.85)';
            ctxC.font = 'bold 9px sans-serif';
            ctxC.fillText('Tool: ' + sandboxToolVal.toUpperCase(), 14, 62);
          }

          // ── Phase explainer pill (right under the main HUD) ──
          if (phaseLabel) {
            ctxC.font = 'bold 10px sans-serif';
            var phaseTextW = ctxC.measureText(phaseLabel).width;
            var pillX = 8, pillY = 70, pillH = 18;
            var pillW = phaseTextW + 16;
            ctxC.fillStyle = phaseColor;
            ctxC.beginPath();
            ctxC.moveTo(pillX + 6, pillY);
            ctxC.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, 6);
            ctxC.arcTo(pillX + pillW, pillY + pillH, pillX, pillY + pillH, 6);
            ctxC.arcTo(pillX, pillY + pillH, pillX, pillY, 6);
            ctxC.arcTo(pillX, pillY, pillX + pillW, pillY, 6);
            ctxC.fill();
            ctxC.fillStyle = '#f8fafc';
            ctxC.fillText(phaseLabel, pillX + 8, pillY + 12);
          }

          // ── Educational explainer strip (bottom of canvas) ──
          // 1-sentence biology behind the current phase. Difference between
          // NAMING what's happening (the pill above) and EXPLAINING the
          // underlying mechanism. Word-wraps across up to 2 lines so the
          // sentence fits at common canvas widths. Renders behind the
          // existing bottom info bar so it doesn't fight HUD elements.
          if (phaseExplain) {
            var stripH = 36;
            var stripY = ch - stripH - 24;  // 24px above the React info bar
            var stripPad = 12;
            // Backing strip — full width, gradient fade so it doesn't
            // feel like a hard cut-off across the scene
            var stripGrad = ctxC.createLinearGradient(0, stripY, 0, stripY + stripH);
            stripGrad.addColorStop(0, 'rgba(15,23,42,0.78)');
            stripGrad.addColorStop(1, 'rgba(15,23,42,0.88)');
            ctxC.fillStyle = stripGrad;
            ctxC.fillRect(0, stripY, cw, stripH);
            // Accent line on top (uses the phase color for visual continuity
            // with the pill)
            ctxC.fillStyle = phaseColor;
            ctxC.fillRect(0, stripY, cw, 2);
            // Word-wrap the explainer to 2 lines max
            ctxC.font = '11px sans-serif';
            ctxC.fillStyle = '#e2e8f0';
            var words = phaseExplain.split(' ');
            var lines = [];
            var currentLine = '';
            var maxWidth = cw - stripPad * 2;
            for (var wi = 0; wi < words.length; wi++) {
              var testLine = currentLine ? currentLine + ' ' + words[wi] : words[wi];
              if (ctxC.measureText(testLine).width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = words[wi];
                if (lines.length >= 2) { currentLine = ''; break; }
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) lines.push(currentLine);
            for (var lni = 0; lni < lines.length && lni < 2; lni++) {
              ctxC.fillText(lines[lni], stripPad, stripY + 16 + lni * 14);
            }
          }

          // ── PAUSED overlay ──
          if (paused) {
            ctxC.save();
            ctxC.fillStyle = 'rgba(15,23,42,0.4)';
            ctxC.fillRect(0, 0, cw, ch);
            ctxC.font = 'bold 24px sans-serif';
            ctxC.textAlign = 'center';
            ctxC.fillStyle = 'rgba(255,255,255,0.85)';
            ctxC.fillText('\u23F8 ' + __alloT('stem.ecosystem.paused_caps', 'PAUSED'), cw / 2, ch / 2);
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

          scheduleEcoFrame();
        };

        scheduleEcoFrame();

        canvas._checkEcoChallenges = function(hist) {
          try { checkEcoChallenges(hist); } catch(e) {}
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
      var presetLabels = ['\u2696\uFE0F ' + __alloT('stem.ecosystem.preset_balanced', 'Balanced'), '\uD83D\uDCA0 ' + __alloT('stem.ecosystem.preset_extinction', 'Extinction'), '\uD83D\uDCA5 ' + __alloT('stem.ecosystem.preset_boom', 'Boom'), '\uD83D\uDD04 ' + __alloT('stem.ecosystem.preset_equilibrium', 'Equilibrium')];

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
        { id: 'rabbit', icon: '\uD83D\uDC07', label: __alloT('stem.ecosystem.place_rabbit', 'Place Rabbit') },
        { id: 'fox',    icon: '\uD83E\uDD8A', label: __alloT('stem.ecosystem.place_fox', 'Place Fox') },
        { id: 'tree',   icon: '\uD83C\uDF33', label: __alloT('stem.ecosystem.place_tree', 'Place Tree') },
        { id: 'erase',  icon: '\u274C',        label: __alloT('stem.ecosystem.erase', 'Erase') },
        { id: 'move',   icon: '\u2194\uFE0F',  label: __alloT('stem.ecosystem.move', 'Move') }
      ];

      // Event definitions for buttons
      var eventDefs = [
        { id: 'drought',   icon: '\u2600\uFE0F',  label: __alloT('stem.ecosystem.drought', 'Drought'),   color: 'bg-amber-500' },
        { id: 'disease',   icon: '\uD83E\uDDA0',   label: __alloT('stem.ecosystem.disease', 'Disease'),   color: 'bg-green-600' },
        { id: 'foodBoom',  icon: '\uD83C\uDF31',   label: __alloT('stem.ecosystem.food_boom', 'Food Boom'), color: 'bg-emerald-500' },
        { id: 'migration', icon: '\uD83E\uDD85',   label: __alloT('stem.ecosystem.migration', 'Migration'), color: 'bg-blue-500' },
        { id: 'wildfire',  icon: '\uD83D\uDD25',   label: __alloT('stem.ecosystem.wildfire', 'Wildfire'),  color: 'bg-red-500' }
      ];

      // ── Cleanup on unmount ──
      // The ambient soundscape uses setInterval to schedule random tones.
      // Without this cleanup, switching to a different tool leaves the audio loop
      // firing in the background indefinitely.
      React.useEffect(function() {
        return function() { stopEcoAmbient(); };
      }, []);

      var ecoRouteCards = [
        { id: 'explore', label: __alloT('stem.ecosystem.explore', 'Explore'), hint: __alloT('stem.ecosystem.route_explore_hint', 'Tune predator-prey dynamics.') },
        { id: 'sandbox', label: __alloT('stem.ecosystem.sandbox', 'Sandbox'), hint: __alloT('stem.ecosystem.route_sandbox_hint', 'Build a food web by hand.') },
        { id: 'conserve', label: __alloT('stem.ecosystem.conserve', 'Conserve'), hint: __alloT('stem.ecosystem.route_conserve_hint', 'Run the Maine campaign.') },
        { id: 'inquiry', label: __alloT('stem.ecosystem.inquiry', 'Inquiry'), hint: __alloT('stem.ecosystem.route_inquiry_hint', 'Sweep variables and observe.') }
      ];
      var ecoTabNames = { explore: __alloT('stem.ecosystem.explore', 'Explore'), sandbox: __alloT('stem.ecosystem.sandbox', 'Sandbox'), conserve: __alloT('stem.ecosystem.conservation', 'Conservation'), inquiry: __alloT('stem.ecosystem.inquiry', 'Inquiry'), quiz: __alloT('stem.ecosystem.quiz', 'Quiz'), badges: __alloT('stem.ecosystem.badges', 'Badges') };

      return h('div', { className: 'space-y-3 pb-4', 'data-ecosystem-tool': 'true' },

        // ── Header ──
        h('div', { className: 'flex items-center gap-2 mb-2' },
          h('button', {
            className: 'transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.97]',
            onClick: function() {
              var canvasEl = document.querySelector('canvas[data-eco-canvas]');
              if (canvasEl && canvasEl._ecoCleanup) canvasEl._ecoCleanup();
              setStemLabTool(null);
            },
            'aria-label': __alloT('stem.ecosystem.back', 'Back')
          }, h(ArrowLeft, { size: 18 })),
          h('span', { className: 'text-lg font-bold tracking-tight' }, '\uD83E\uDD8A ' + __alloT('stem.ecosystem.title', 'Ecosystem Simulator')),
          h('span', { className: 'ml-auto px-2 py-0.5 text-[11px] font-bold bg-emerald-700 text-white rounded-full animate-pulse motion-reduce:animate-none' }, __alloT('stem.ecosystem.live', 'LIVE')),
          h('span', { className: 'text-xs font-bold text-amber-600 dark:text-amber-400 ml-1' }, '\u2B50 ' + researchPoints + ' RP'),
        ),

        // ── Grade intro ──
        h('p', { className: 'text-xs text-slate-600 dark:text-slate-200 italic' }, getGradeIntro(gradeBand)),


        // ── Biome Selector ──
        h('section', { 'data-ecosystem-field-brief': 'true',
          style: {
            padding: '14px', borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(6,78,59,0.92), rgba(15,23,42,0.96))',
            border: '1px solid rgba(52,211,153,0.32)',
            boxShadow: '0 14px 34px rgba(2,8,23,0.20)',
            color: '#ecfdf5'
          } },
          h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(240px,0.85fr)', gap: 12, alignItems: 'stretch' } },
            h('div', null,
              h('div', { style: { fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#86efac', letterSpacing: 0, marginBottom: 4 } }, __alloT('stem.ecosystem.field_station', 'Field station')),
              h('div', { style: { fontSize: 20, fontWeight: 900, lineHeight: 1.15, marginBottom: 6 } }, ecoTabNames[tab] || __alloT('stem.ecosystem.explore', 'Explore')),
              h('p', { style: { margin: '0 0 10px', fontSize: 12, lineHeight: 1.5, color: '#cbd5e1' } },
                __alloT('stem.ecosystem.field_brief_lead', 'Pick a route, watch the live population system, and use the graph or campaign when you need evidence.')),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(116px,1fr))', gap: 8 } },
                ecoRouteCards.map(function(route) {
                  var active = tab === route.id;
                  return h('button', { key: route.id, type: 'button', 'aria-pressed': active ? 'true' : 'false',
                    onClick: function() { upd('tab', route.id); },
                    style: {
                      minHeight: 70, padding: 9, textAlign: 'left', borderRadius: 8,
                      border: '1px solid ' + (active ? 'rgba(134,239,172,0.72)' : 'rgba(134,239,172,0.24)'),
                      background: active ? 'rgba(16,185,129,0.18)' : 'rgba(15,23,42,0.55)',
                      color: '#ecfdf5', cursor: 'pointer'
                    } },
                    h('div', { style: { fontSize: 12, fontWeight: 900, marginBottom: 3 } }, route.label),
                    h('div', { style: { fontSize: 10, lineHeight: 1.35, color: '#bbf7d0' } }, route.hint)
                  );
                })
              )
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 } },
              [
                { label: __alloT('stem.ecosystem.biome', 'Biome'), value: (BIOME_COLORS[biome] && BIOME_COLORS[biome].name) || biome },
                { label: __alloT('stem.ecosystem.mode', 'Mode'), value: simPaused ? __alloT('stem.ecosystem.paused', 'Paused') : __alloT('stem.ecosystem.live_status', 'Live') },
                { label: __alloT('stem.ecosystem.research', 'Research'), value: researchPoints + ' RP' },
                { label: __alloT('stem.ecosystem.badges', 'Badges'), value: badgeCount + '/' + BADGES.length }
              ].map(function(card) {
                return h('div', { key: card.label, style: { padding: 9, borderRadius: 8, background: 'rgba(2,6,23,0.34)', border: '1px solid rgba(148,163,184,0.18)' } },
                  h('div', { style: { fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 } }, card.label),
                  h('div', { style: { fontSize: 15, fontWeight: 900, color: '#f8fafc' } }, card.value)
                );
              })
            )
          )
        ),

        h('div', { className: 'flex gap-1 mb-1' },
          Object.keys(BIOME_COLORS).map(function(bId) {
            var bInfo = BIOME_COLORS[bId];
            return h('button', { 'aria-label': __alloT('stem.ecosystem.change_biome', 'Change Biome'),
              key: bId,
              className: 'flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all border ' +
                (biome === bId
                  ? 'border-emerald-500 bg-emerald-700 text-white shadow-md'
                  : 'transition-colors border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-400'),
              onClick: function() { changeBiome(bId); }
            }, bInfo.emoji + ' ' + bInfo.name);
          })
        ),


        // ── Mode tabs (4 tabs now) ──
        h('div', { className: 'flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1', role: 'tablist', 'aria-label': __alloT('stem.ecosystem.aria_explorer_sections', 'Ecosystem Explorer sections') },
          ['explore', 'sandbox', 'conserve', 'inquiry', 'quiz', 'badges'].map(function(t2) {
            var tabLabel = '';
            if (t2 === 'explore') tabLabel = '\uD83C\uDF3F ' + __alloT('stem.ecosystem.explore', 'Explore');
            else if (t2 === 'sandbox') tabLabel = '\uD83E\uDDEA ' + __alloT('stem.ecosystem.sandbox', 'Sandbox');
            else if (t2 === 'conserve') tabLabel = '\uD83C\uDF32 ' + __alloT('stem.ecosystem.conservation', 'Conservation');
            else if (t2 === 'inquiry') tabLabel = '\u2754 ' + __alloT('stem.ecosystem.inquiry', 'Inquiry');
            else if (t2 === 'quiz') tabLabel = '\u2753 ' + __alloT('stem.ecosystem.quiz', 'Quiz');
            else tabLabel = '\uD83C\uDFC5 ' + __alloT('stem.ecosystem.badges', 'Badges') + ' (' + badgeCount + '/' + BADGES.length + ')';
            return h('button', { key: t2,
              role: 'tab', 'aria-selected': tab === t2,
              className: 'flex-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-all ' +
                (tab === t2 ? 'bg-emerald-700 text-white shadow' : 'transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.97]'),
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
            explore: { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)', icon: '\uD83C\uDF3F', title: __alloT('stem.ecosystem.hero_explore_title', 'Explore the food web'),          hint: __alloT('stem.ecosystem.hero_explore_hint', 'Click any species to see what it eats and what eats it. Trophic-level cascades become obvious \u2014 remove a top predator and watch the system reorganize.') },
            sandbox: { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\uD83E\uDDEA', title: __alloT('stem.ecosystem.hero_sandbox_title', 'Sandbox \u2014 your ecosystem'), hint: __alloT('stem.ecosystem.hero_sandbox_hint', 'Drop in producers, consumers, and predators; watch population dynamics emerge. Lotka-Volterra cycles appear when you have one predator + one prey + nothing else.') },
            conserve: { accent: '#15803d', soft: 'rgba(21,128,61,0.10)', icon: '\uD83C\uDF32', title: __alloT('stem.ecosystem.hero_conserve_title', 'Conservation Manager \u2014 Maine scenario'), hint: __alloT('stem.ecosystem.hero_conserve_hint', 'Explore a Maine-inspired 10-year teaching scenario. Population, habitat, and public-support values are 0-100 indices, and hand-authored cascade rules are not forecasts.') },
            inquiry: { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)', icon: '\u2754', title: __alloT('stem.ecosystem.hero_inquiry_title', 'Inquiry \u2014 predator-prey dynamics'), hint: __alloT('stem.ecosystem.hero_inquiry_hint', 'Adjust predator birth, prey lifespan, and resource scarcity. Watch which discrete regime the system settles into. No score, no reveal, no answer dump \u2014 just slider sweep and observation.') },
            quiz:    { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '\u2753', title: __alloT('stem.ecosystem.hero_quiz_title', 'Quiz \u2014 foundational concepts'), hint: __alloT('stem.ecosystem.hero_quiz_hint', 'Six questions cover predator-prey lag, model purpose, predation, carrying capacity, primary producers, and trophic levels.') },
            badges:  { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '\uD83C\uDFC5', title: __alloT('stem.ecosystem.hero_badges_title', 'Badges \u2014 what you have learned'), hint: __alloT('stem.ecosystem.hero_badges_hint', 'Achievements track which ecological concepts you have demonstrated, not just visited. Trophic-cascade badge requires you to actually trigger one in the sandbox.') }
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
              h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // ═══ EXPLORE TAB ═══
        tab === 'explore' && h('div', { className: 'space-y-3' },

          h('div', {
            role: 'note',
            style: {
              padding: '10px 14px', borderRadius: 12, marginBottom: 4,
              background: 'linear-gradient(135deg, rgba(22,163,74,0.14) 0%, rgba(22,163,74,0.04) 100%)',
              borderTop: '1px solid rgba(22,163,74,0.5)', borderRight: '1px solid rgba(22,163,74,0.5)', borderBottom: '1px solid rgba(22,163,74,0.5)', borderLeft: '3px solid #16a34a',
              color: '#bbf7d0', fontSize: 13, lineHeight: 1.55
            }
          },
            h('strong', { style: { color: '#16a34a' } }, __alloT('stem.ecosystem.goal_label', 'Goal: ')),
            __alloT('stem.ecosystem.explore_goal_body', 'compare settings that produce cycles, damping, or collapse in these teaching models. Predator peaks often lag prey peaks, but the amount of lag depends on the parameters. The animated canvas uses separate stochastic rules; the graph below uses a deterministic logistic predator-prey equation.')
          ),

          // Canvas container
          h('div', { className: 'relative rounded-xl overflow-hidden border-2 border-emerald-400', style: { height: 320 } },
            h('canvas', { 
              ref: canvasRef,
              role: 'img',
              'aria-label': __alloT('stem.ecosystem.aria_eco_sim_prefix', 'Ecosystem simulation. ') + biome + __alloT('stem.ecosystem.aria_biome_initial_prey', ' biome. Initial prey: ') + prey0 + __alloT('stem.ecosystem.aria_initial_predators', ', initial predators: ') + pred0 + '. ' + (simPaused ? __alloT('stem.ecosystem.paused_dot', 'Paused.') : __alloT('stem.ecosystem.running_dot', 'Running.')),
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
              h('span', { className: 'text-[11px] text-white/80' }, '\uD83D\uDC07 ' + __alloT('stem.ecosystem.prey_colon', 'Prey: ') + prey0 + __alloT('stem.ecosystem.start_suffix', ' start')),
              h('span', { className: 'text-[11px] text-white/80' }, '\uD83E\uDD8A ' + __alloT('stem.ecosystem.pred_colon', 'Pred: ') + pred0 + __alloT('stem.ecosystem.start_suffix', ' start')),
              h('span', { className: 'text-[11px] text-white/80 ml-auto' }, __alloT('stem.ecosystem.watch_evolve', 'Watch the ecosystem evolve!'))
            )
          ),

          // ── NEW: Canvas control bar: pause/resume + speed slider ──
          h('div', { className: 'flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2' },
            h('button', { className: 'px-3 py-1 text-xs font-bold rounded-lg transition-all ' +
                (simPaused
                  ? 'transition-colors bg-emerald-700 text-white hover:bg-emerald-600 active:scale-[0.97]'
                  : 'transition-colors bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-400 active:scale-[0.97]'),
              onClick: function() {
                var newPaused = !simPaused;
                playSound('pause');
                upd('simPaused', newPaused);
                var canvasEl = document.querySelector('canvas[data-eco-canvas]');
                if (canvasEl) canvasEl.dataset.paused = newPaused ? '1' : '0';
              }
            }, simPaused ? '\u25B6 ' + __alloT('stem.ecosystem.resume', 'Resume') : '\u23F8 ' + __alloT('stem.ecosystem.pause', 'Pause')),
            // Start/stop ambient on pause/resume — first button triggers on click above
            !simPaused && !_ecoAmbient && (function() { setTimeout(function() { if (!_ecoAmbient) startEcoAmbient(true, 30); }, 0); return null; })(),
            h('div', { className: 'flex items-center gap-2 flex-1' },
              h('span', { className: 'text-[11px] font-semibold text-slate-700 dark:text-slate-200' }, __alloT('stem.ecosystem.speed_label', 'Speed:')),
              h('input', {
                type: 'range', min: 1, max: 6, step: 1, value: simSpeed,
                'aria-label': __alloT('stem.ecosystem.aria_sim_speed', 'Simulation speed'),
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
              h('span', { className: 'text-[11px] font-bold text-emerald-700 dark:text-emerald-400 min-w-[28px] text-right' }, speedLabel(simSpeed))
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
            h('p', { className: 'text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1' }, '\uD83D\uDCDC ' + __alloT('stem.ecosystem.event_history', 'Event History')),
            h('div', { className: 'space-y-0.5 max-h-20 overflow-y-auto' },
              eventHistory.slice(-5).reverse().map(function(ev, idx) {
                var eventIcons = { drought: '\u2600\uFE0F', disease: '\uD83E\uDDA0', foodBoom: '\uD83C\uDF31', migration: '\uD83E\uDD85', wildfire: '\uD83D\uDD25' };
                var timeAgo = Math.round((Date.now() - ev.time) / 1000);
                var timeLabel = timeAgo < 60 ? timeAgo + __alloT('stem.ecosystem.secs_ago', 's ago') : Math.round(timeAgo / 60) + __alloT('stem.ecosystem.mins_ago', 'm ago');
                return h('div', {
                  key: 'eh' + idx,
                  className: 'flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-200'
                },
                  h('span', null, eventIcons[ev.name] || '\u26A1'),
                  h('span', { className: 'font-semibold' }, ev.name),
                  h('span', { className: 'ml-auto text-slate-600' }, timeLabel)
                );
              })
            ),
            h('div', { className: 'flex items-center gap-2 mt-1 pt-1 border-t border-slate-200 dark:border-slate-600' },
              h('span', { className: 'text-[11px] text-slate-600' }, __alloT('stem.ecosystem.total_events_label', 'Total events: ') + eventHistory.length),
              h('span', { className: 'text-[11px] text-slate-600 ml-auto' },
                __alloT('stem.ecosystem.unique_label', 'Unique: ') + Object.keys(eventsTriggered).length + '/5'
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
              h('span', null, '\uD83C\uDF31 ' + __alloT('stem.ecosystem.carrying_capacity_k', 'Carrying Capacity (K)')),
              h('span', { className: 'text-amber-600 font-bold' }, carryingCapacity)
            ),
            h('input', {
              type: 'range', min: 30, max: 200, step: 5, value: carryingCapacity,
              'aria-label': __alloT('stem.ecosystem.aria_carrying_capacity', 'Carrying capacity'),
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
            h('button', { className: 'transition-colors w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.97]',
              onClick: function() { upd('ecoGraphOpen', !ecoGraphOpen); }
            },
              h('span', null, '\uD83D\uDCCA ' + __alloT('stem.ecosystem.live_pop_graph', 'Live Population Graph')),
              h('span', { className: 'text-xs', style: { transform: ecoGraphOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' } }, '\u25BC')
            ),
            ecoGraphOpen && h('div', { className: 'px-3 pb-3 space-y-2' },
              // View tabs
              h('div', { className: 'flex gap-1' },
                h('button', { 'aria-label': __alloT('stem.ecosystem.populations', 'Populations'),
                  className: 'flex-1 px-2 py-1 text-[11px] font-semibold rounded ' +
                    (ecoGraphView === 'population' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'),
                  onClick: function() { switchGraphView('population'); }
                }, __alloT('stem.ecosystem.populations', 'Populations')),
                h('button', { 'aria-label': __alloT('stem.ecosystem.environment', 'Environment'),
                  className: 'flex-1 px-2 py-1 text-[11px] font-semibold rounded ' +
                    (ecoGraphView === 'environment' ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'),
                  onClick: function() { switchGraphView('environment'); }
                }, __alloT('stem.ecosystem.environment', 'Environment'))
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
                  // Scale to the data (with headroom) so crashes stay readable; only fold in K when it's
                  // near the data, otherwise flag it off the top (matches the analytical chart).
                  var lDataMax = maxPop;
                  maxPop = lDataMax * 1.18;
                  var lKVisible = carryingCapacity > 0 && carryingCapacity <= maxPop;
                  if (carryingCapacity > maxPop && carryingCapacity <= lDataMax * 1.8) { maxPop = carryingCapacity * 1.06; lKVisible = true; }
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
                  return h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'w-full', style: { maxHeight: 180 }, role: 'img', 'aria-label': __alloT('stem.ecosystem.aria_live_pop_hist_pre', 'Live predator and prey population history over ') + hist.length + __alloT('stem.ecosystem.aria_samples', ' samples.') },
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
                    // Carrying capacity dashed line — drawn only when in range; label right-anchored inside the plot
                    lKVisible && h('line', { x1: pad, y1: kcLineY, x2: W - pad, y2: kcLineY, stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '6,4', opacity: 0.7 }),
                    lKVisible
                      ? h('text', { x: W - pad - 2, y: kcLineY - 3, textAnchor: 'end', fill: '#f59e0b', fontSize: 7 }, 'K=' + carryingCapacity)
                      : h('text', { x: W - pad - 2, y: pad + 8, textAnchor: 'end', fill: '#f59e0b', fontSize: 7 }, 'K=' + carryingCapacity + ' ↑'),
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
                })() : h('p', { className: 'text-xs text-slate-600 text-center py-4' }, __alloT('stem.ecosystem.canvas_generating_data', 'Canvas simulation is generating live data...'))
              ) : buildEnvSVG(),

              // Legend row
              h('div', { className: 'flex gap-3 justify-center text-[11px]' },
                ecoGraphView === 'population' ? [
                  h('span', { key: 'lp', className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-green-500' }), __alloT('stem.ecosystem.prey', 'Prey')),
                  h('span', { key: 'lpd', className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-red-500' }), __alloT('stem.ecosystem.predators', 'Predators')),
                  h('span', { key: 'lkc', className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-3 h-0.5 bg-amber-500', style: { borderBottom: '1px dashed #f59e0b' } }), __alloT('stem.ecosystem.carrying_cap', 'Carrying Cap'))
                ] : [
                  h('span', { key: 'le', className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-green-500' }), __alloT('stem.ecosystem.vegetation', 'Vegetation')),
                  h('span', { key: 'led', className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-amber-500' }), __alloT('stem.ecosystem.day_night', 'Day/Night'))
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
                      h('div', { className: 'text-[11px] text-slate-600' }, __alloT('stem.ecosystem.peak_prey', 'Peak Prey')),
                      h('div', { className: 'text-sm font-bold text-green-600' }, lpMax)
                    ),
                    h('div', { key: 'sd', className: 'bg-red-50 dark:bg-red-900/20 rounded p-1' },
                      h('div', { className: 'text-[11px] text-slate-600' }, __alloT('stem.ecosystem.peak_pred', 'Peak Pred')),
                      h('div', { className: 'text-sm font-bold text-red-600' }, ldMax)
                    ),
                    h('div', { key: 'sr', className: 'bg-purple-50 dark:bg-purple-900/20 rounded p-1' },
                      h('div', { className: 'text-[11px] text-slate-600' }, __alloT('stem.ecosystem.ratio', 'Ratio')),
                      h('div', { className: 'text-sm font-bold text-purple-600' }, lRatio)
                    ),
                    h('div', { key: 'ss', className: 'bg-slate-50 dark:bg-slate-800 rounded p-1' },
                      h('div', { className: 'text-[11px] text-slate-600' }, __alloT('stem.ecosystem.samples', 'Samples')),
                      h('div', { className: 'text-sm font-bold text-slate-600' }, livePopHistory.length)
                    )
                  ];
                })()
              )
            )
          ),

          // ── Food Web Diagram ──
          h('div', { className: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-700' },
            h('p', { className: 'text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2' }, '\uD83C\uDF3F ' + __alloT('stem.ecosystem.food_web', 'Food Web')),
            h('div', { className: 'flex items-center justify-center gap-1 flex-wrap text-center' },
              h('div', { className: 'bg-yellow-100 dark:bg-yellow-900/30 rounded-lg px-2 py-1' },
                h('div', { className: 'text-lg' }, '\u2600\uFE0F'),
                h('div', { className: 'text-[11px] font-semibold' }, __alloT('stem.ecosystem.sun', 'Sun'))
              ),
              h('span', { className: 'text-slate-600 text-sm' }, '\u2192'),
              h('div', { className: 'bg-green-100 dark:bg-green-900/30 rounded-lg px-2 py-1' },
                h('div', { className: 'text-lg' }, '\uD83C\uDF3F'),
                h('div', { className: 'text-[11px] font-semibold' }, __alloT('stem.ecosystem.plants', 'Plants'))
              ),
              h('span', { className: 'text-slate-600 text-sm' }, '\u2192'),
              h('div', { className: 'bg-emerald-100 dark:bg-emerald-900/30 rounded-lg px-2 py-1' },
                h('div', { className: 'text-lg' }, '\uD83D\uDC07'),
                h('div', { className: 'text-[11px] font-semibold' }, __alloT('stem.ecosystem.herbivores', 'Herbivores'))
              ),
              h('span', { className: 'text-slate-600 text-sm' }, '\u2192'),
              h('div', { className: 'bg-orange-100 dark:bg-orange-900/30 rounded-lg px-2 py-1' },
                h('div', { className: 'text-lg' }, '\uD83E\uDD8A'),
                h('div', { className: 'text-[11px] font-semibold' }, __alloT('stem.ecosystem.predators', 'Predators'))
              ),
              h('span', { className: 'text-slate-600 text-sm' }, '\u2192'),
              h('div', { className: 'bg-amber-100 dark:bg-amber-900/30 rounded-lg px-2 py-1' },
                h('div', { className: 'text-lg' }, '\uD83C\uDF44'),
                h('div', { className: 'text-[11px] font-semibold' }, __alloT('stem.ecosystem.decomposers', 'Decomposers'))
              )
            )
          ),

          // ── Description ──
          h('div', { className: 'flex items-start gap-2' },
            h('p', { className: 'text-xs text-slate-600 dark:text-slate-200 flex-1' },
              __alloT('stem.ecosystem.explore_model_desc', 'Explore a logistic extension of the Lotka-Volterra predator-prey model. Adjust initial populations and coefficients to compare cycles, density dependence, and extinction in a discrete Euler approximation.')
            ),
            callTTS && h('button', { 'aria-label': __alloT('stem.ecosystem.read_aloud', 'Read aloud'),
              className: 'transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-[0.97]',
              onClick: function() { speakText('Model predator-prey dynamics using the Lotka-Volterra equations. Adjust starting populations and interaction rates to observe oscillations, extinction events, and equilibrium states.'); },
              title: __alloT('stem.ecosystem.read_aloud', 'Read aloud')
            }, '\uD83D\uDD0A')
          ),

          // ── Preset buttons ──
          h('div', { className: 'flex gap-1 flex-wrap' },
            presetNames.map(function(name, idx) {
              return h('button', { 'aria-label': __alloT('stem.ecosystem.aria_apply_pre', 'Apply ') + presetLabels[idx] + __alloT('stem.ecosystem.aria_preset_suffix', ' preset'),
                key: name,
                className: 'flex-1 min-w-[70px] px-2 py-1.5 text-[11px] font-semibold rounded-lg border transition-all ' +
                  (presetsUsed[name]
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'transition-colors border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-[0.97]'),
                onClick: function() { applyPreset(name); }
              }, presetLabels[idx]);
            })
          ),

          // ── Parameter sliders (2x3 grid with carrying capacity) ──
          h('div', { className: 'grid grid-cols-2 gap-2' },
            // Prey Start
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
                h('span', null, '\uD83D\uDC07 ' + __alloT('stem.ecosystem.prey_start', 'Prey Start')),
                h('span', { className: 'text-emerald-600 font-bold' }, prey0)
              ),
              h('input', {
                type: 'range', min: 5, max: 150, step: 5, value: prey0,
                'aria-label': __alloT('stem.ecosystem.aria_prey_start_pop', 'Prey start population'),
                className: 'w-full h-1.5 accent-emerald-500',
                onChange: function(e) { upd('prey0', parseInt(e.target.value, 10)); }
              })
            ),
            // Predators
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
                h('span', null, '\uD83E\uDD8A ' + __alloT('stem.ecosystem.predators', 'Predators')),
                h('span', { className: 'text-red-600 font-bold' }, pred0)
              ),
              h('input', {
                type: 'range', min: 2, max: 80, step: 2, value: pred0,
                'aria-label': __alloT('stem.ecosystem.aria_pred_start_pop', 'Predator start population'),
                className: 'w-full h-1.5 accent-red-500',
                onChange: function(e) { upd('pred0', parseInt(e.target.value, 10)); }
              })
            ),
            // Prey Birth Rate
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
                h('span', null, __alloT('stem.ecosystem.prey_growth_r', 'Prey intrinsic growth (r)')),
                h('span', { className: 'text-green-600 font-bold' }, preyBirth.toFixed(3))
              ),
              h('input', {
                type: 'range', 'aria-label': __alloT('stem.ecosystem.aria_prey_growth_r', 'prey intrinsic growth rate r'), min: 0.01, max: 0.3, step: 0.005, value: preyBirth,
                className: 'w-full h-1.5 accent-green-500',
                onChange: function(e) { upd('preyBirth', parseFloat(e.target.value)); }
              })
            ),
            // Pred Death Rate
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
                h('span', null, __alloT('stem.ecosystem.pred_mortality_d', 'Predator mortality (d)')),
                h('span', { className: 'text-red-600 font-bold' }, predDeath.toFixed(3))
              ),
              h('input', {
                type: 'range', 'aria-label': __alloT('stem.ecosystem.aria_pred_mortality_d', 'predator mortality coefficient d'), min: 0.01, max: 0.3, step: 0.005, value: predDeath,
                className: 'w-full h-1.5 accent-red-500',
                onChange: function(e) { upd('predDeath', parseFloat(e.target.value)); }
              })
            ),
            // Prey Death Rate (interaction)
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
                h('span', null, __alloT('stem.ecosystem.predation_coeff_a', 'Predation coefficient (a)')),
                h('span', { className: 'text-orange-600 font-bold' }, preyDeath.toFixed(3))
              ),
              h('input', {
                type: 'range', 'aria-label': __alloT('stem.ecosystem.aria_predation_coeff_a', 'predation coefficient a'), min: 0.001, max: 0.05, step: 0.001, value: preyDeath,
                className: 'w-full h-1.5 accent-orange-500',
                onChange: function(e) { upd('preyDeath', parseFloat(e.target.value)); }
              })
            ),
            // Pred Birth Rate (interaction)
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between' },
                h('span', null, __alloT('stem.ecosystem.pred_conversion_b', 'Predator conversion (b)')),
                h('span', { className: 'text-blue-600 font-bold' }, predBirth.toFixed(3))
              ),
              h('input', {
                type: 'range', 'aria-label': __alloT('stem.ecosystem.aria_pred_conversion_b', 'predator conversion coefficient b'), min: 0.001, max: 0.05, step: 0.001, value: predBirth,
                className: 'w-full h-1.5 accent-blue-500',
                onChange: function(e) { upd('predBirth', parseFloat(e.target.value)); }
              })
            )
          ),

          h('div', { className: 'rounded-lg border border-cyan-300 bg-cyan-50 p-3 text-[11px] text-slate-700 leading-relaxed' },
            h('div', { className: 'font-mono font-bold text-cyan-900' }, 'ΔN = rN(1 − N/K) − aNP    ΔP = bNP − dP'),
            h('div', { className: 'mt-1' }, __alloT('stem.ecosystem.teaching_model_note', 'Teaching model: one-step Euler updates with rounded counts. It omits age structure, space, seasons, stochasticity, handling time, disease, and changing K; parameter values are illustrative rather than fitted to rabbits and foxes.'))
          ),

          // ── Run Graph Simulation button ──
          h('button', { 'aria-label': __alloT('stem.ecosystem.run_graph_sim', 'Run Graph Simulation'),
            className: 'w-full py-2.5 rounded-xl font-bold text-white text-sm shadow-lg transition-all ' +
              'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2',
            onClick: simulate
          }, '\u25B6 ' + __alloT('stem.ecosystem.run_graph_sim', 'Run Graph Simulation')),

          // ── Lotka-Volterra graph (post-simulation) ──
          data && data.length > 1 && h('div', { className: 'bg-white dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-700 p-3 space-y-2' },
            h('p', { className: 'text-xs font-bold text-slate-700 dark:text-slate-200' }, '\uD83D\uDCC8 ' + __alloT('stem.ecosystem.logistic_pp_approx', 'Logistic Predator-Prey Approximation')),
            buildPopSVG(),
            // Legend
            h('div', { className: 'flex gap-4 justify-center text-[11px]' },
              h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-green-500' }), __alloT('stem.ecosystem.prey', 'Prey') + ' (\uD83D\uDC07)'),
              h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-red-500' }), __alloT('stem.ecosystem.predators', 'Predators') + ' (\uD83E\uDD8A)'),
              h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-3 h-0.5 bg-amber-500', style: { borderBottom: '1px dashed #f59e0b' } }), 'K')
            ),
            // Stats
            h('div', { className: 'grid grid-cols-4 gap-1 text-center' },
              h('div', { className: 'bg-green-50 dark:bg-green-900/20 rounded p-1' },
                h('div', { className: 'text-[11px] text-slate-600' }, __alloT('stem.ecosystem.peak_prey', 'Peak Prey')),
                h('div', { className: 'text-sm font-bold text-green-600' }, peakPrey)
              ),
              h('div', { className: 'bg-red-50 dark:bg-red-900/20 rounded p-1' },
                h('div', { className: 'text-[11px] text-slate-600' }, __alloT('stem.ecosystem.peak_pred', 'Peak Pred')),
                h('div', { className: 'text-sm font-bold text-red-600' }, peakPred)
              ),
              h('div', { className: 'bg-purple-50 dark:bg-purple-900/20 rounded p-1' },
                h('div', { className: 'text-[11px] text-slate-600' }, __alloT('stem.ecosystem.ratio', 'Ratio')),
                h('div', { className: 'text-sm font-bold text-purple-600' }, finalRatio)
              ),
              h('div', { className: 'bg-slate-50 dark:bg-slate-800 rounded p-1' },
                h('div', { className: 'text-[11px] text-slate-600' }, __alloT('stem.ecosystem.steps_label', 'Steps')),
                h('div', { className: 'text-sm font-bold text-slate-600' }, steps)
              )
            )
          ),

          // ── Phase Portrait (post-simulation) ──
          data && data.length > 1 && h('div', { className: 'bg-white dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-700 p-3 space-y-2' },
            h('p', { className: 'text-xs font-bold text-slate-700 dark:text-slate-200' }, '\uD83D\uDD04 ' + __alloT('stem.ecosystem.phase_portrait', 'Phase Portrait')),
            buildPhaseSVG(),
            h('div', { className: 'flex gap-3 justify-center text-[11px]' },
              h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-green-500' }), __alloT('stem.ecosystem.start', 'Start')),
              h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-red-500' }), __alloT('stem.ecosystem.end', 'End'))
            )
          ),


          // ── Ecology Challenges ──
          h('div', {
            className: 'mb-3 rounded-xl p-4 border bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 shadow-sm',
            style: { boxShadow: '0 2px 8px rgba(109,40,217,0.06)' }
          },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { style: { fontSize: '18px' } }, '⭐'),
                h('span', { className: 'text-sm font-bold text-purple-700' }, (d.researchPoints || 0) + ' RP')
              ),
              h('span', {
                className: 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-600'
              }, Object.keys(completedChallenges).length + '/' + ECO_CHALLENGES.length + __alloT('stem.ecosystem.challenges_suffix', ' challenges'))
            ),
            h('div', { className: 'w-full rounded-full h-2.5 bg-purple-100/50', style: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' } },
              h('div', {
                className: 'bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500',
                style: { width: Math.min(100, (Object.keys(completedChallenges).length / ECO_CHALLENGES.length) * 100) + '%', boxShadow: '0 0 8px rgba(139,92,246,0.4)' }
              })
            ),
            h('div', { className: 'grid grid-cols-2 gap-2 mt-3' },
              ECO_CHALLENGES.map(function(ch) {
                var done = !!completedChallenges[ch.id];
                return h('div', {
                  key: ch.id,
                  className: 'p-2 rounded-lg border transition-all ' +
                    (done ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white')
                },
                  h('div', { className: 'flex items-center gap-1 mb-1' },
                    h('span', { className: 'text-sm' }, ch.emoji),
                    h('span', { className: 'text-[11px] font-bold ' + (done ? 'text-green-700' : 'text-slate-700') }, ch.name),
                    done && h('span', { className: 'text-[11px] text-green-700 font-bold ml-auto' }, '✔')
                  ),
                  h('p', { className: 'text-[11px] text-slate-600 mb-1' }, __alloT('stem.ecosystem.' + (ch.id) + '_desc', ch.desc)),
                  h('p', { className: 'text-[11px] font-bold ' + (done ? 'text-green-600' : 'text-amber-600') },
                    done ? '✔ ' + __alloT('stem.ecosystem.completed_excl', 'Completed!') : '⭐ +' + ch.reward + ' RP')
                );
              })
            )
          ),


          // ── Snapshot button ──
          h('button', { 'aria-label': __alloT('stem.ecosystem.take_snapshot', 'Take Snapshot'),
            className: 'w-full py-1.5 rounded-lg text-xs font-semibold border border-slate-400 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-[0.97]',
            onClick: takeSnapshot
          }, '\uD83D\uDCF7 ' + __alloT('stem.ecosystem.take_snapshot', 'Take Snapshot')),
          h('button', { 'aria-label': __alloT('stem.ecosystem.export_csv', 'Export CSV'), onClick: function() { try { var _d = (typeof d !== 'undefined' && d && d.data) ? d.data : []; if (!_d.length) return; var _csv = 'step,prey,predator\n' + _d.map(function(p,i){ return i + ',' + (p.prey||0) + ',' + (p.pred||0); }).join('\n'); var _b = new Blob([_csv], { type: 'text/csv' }); var _a = document.createElement('a'); _a.href = URL.createObjectURL(_b); _a.download = 'ecosystem_' + Date.now() + '.csv'; _a.click(); if (typeof addToast === 'function') addToast('CSV saved!', 'success'); } catch(e){} }, className: 'w-full py-1.5 mt-1 rounded-lg text-xs font-semibold border border-emerald-500 text-emerald-700', style: { cursor: 'pointer' } }, __alloT('stem.ecosystem.export_csv', 'Export CSV')),

          // ── AI Tutor ──
          callGemini && h('div', { className: 'bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-200 dark:border-indigo-700 space-y-2' },
            h('button', { className: 'w-full flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300',
              onClick: function() { upd('showAI', !showAI); }
            },
              h('span', null, '\uD83E\uDD16 ' + __alloT('stem.ecosystem.ai_ecology_tutor', 'AI Ecology Tutor')),
              h('span', null, showAI ? '\u25B2' : '\u25BC')
            ),
            showAI && h('div', { className: 'space-y-2' },
              h('div', { className: 'flex gap-1 flex-wrap' },
                [__alloT('stem.ecosystem.q_what_lotka_volterra', 'What is Lotka-Volterra?'), __alloT('stem.ecosystem.q_why_oscillate', 'Why do populations oscillate?'), __alloT('stem.ecosystem.q_what_carrying_capacity', 'What is carrying capacity?'), __alloT('stem.ecosystem.q_explain_food_webs', 'Explain food webs')].map(function(question) {
                  return h('button', { key: question,
                    className: 'transition-colors px-2 py-1 text-[11px] rounded-full border border-indigo-600 dark:border-indigo-600 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]',
                    onClick: function() { askAI(question); },
                    disabled: aiLoading
                  }, question);
                })
              ),
              aiLoading && h('p', { className: 'text-xs text-indigo-500 animate-pulse motion-reduce:animate-none' }, __alloT('stem.ecosystem.thinking', 'Thinking...')),
              aiResponse && h('div', { className: 'bg-white dark:bg-slate-800 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-300 border border-indigo-100 dark:border-indigo-800' },
                h('p', null, aiResponse),
                callTTS && h('button', { 'aria-label': __alloT('stem.ecosystem.read_aloud', 'Read aloud'),
                  className: 'transition-colors mt-1 text-[11px] text-indigo-500 hover:text-indigo-700',
                  onClick: function() { speakText(aiResponse); }
                }, '\uD83D\uDD0A ' + __alloT('stem.ecosystem.read_aloud', 'Read aloud'))
              )
            )
          )
        ),

        // ═══ SANDBOX TAB ═══
        tab === 'sandbox' && h('div', { className: 'space-y-3' },

          h('div', {
            role: 'note',
            style: {
              padding: '10px 14px', borderRadius: 12, marginBottom: 4,
              background: 'linear-gradient(135deg, rgba(14,165,233,0.14) 0%, rgba(14,165,233,0.04) 100%)',
              borderTop: '1px solid rgba(14,165,233,0.5)', borderRight: '1px solid rgba(14,165,233,0.5)', borderBottom: '1px solid rgba(14,165,233,0.5)', borderLeft: '3px solid #0ea5e9',
              color: '#bae6fd', fontSize: 13, lineHeight: 1.55
            }
          },
            h('strong', { style: { color: '#0ea5e9' } }, __alloT('stem.ecosystem.goal_label', 'Goal: ')),
            __alloT('stem.ecosystem.sandbox_goal_body', 'design experiments. Try the textbook Lotka-Volterra setup (1 predator + 1 prey, nothing else) and watch the cycle. Then break it: add a second predator (competitive exclusion), or remove the predator entirely (prey overshoots carrying capacity and crashes). Inject events to test resilience. Every entity placed is graded by Carrying Capacity (K) on the slider below.')
          ),

          // Canvas container (same canvas, with sandbox interactivity)
          h('div', { className: 'relative rounded-xl overflow-hidden border-2 border-teal-400', style: { height: 320 } },
            h('canvas', { 
              ref: canvasRef,
              role: 'img',
              'aria-label': __alloT('stem.ecosystem.aria_sandbox_prefix', 'Ecosystem sandbox. Click to place prey (left) or predators (right). ') + (simPaused ? __alloT('stem.ecosystem.paused_dot', 'Paused.') : __alloT('stem.ecosystem.running_dot', 'Running.')),
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
              h('span', { className: 'text-[11px] text-white/80 font-bold' }, '\uD83E\uDDEA ' + __alloT('stem.ecosystem.sandbox_mode', 'Sandbox Mode')),
              h('span', { className: 'text-[11px] text-white/80 ml-auto' }, __alloT('stem.ecosystem.click_place_entities', 'Click to place entities'))
            )
          ),

          // ── Tool selector row ──
          h('div', { className: 'flex gap-1' },
            sandboxTools.map(function(tool) {
              return h('button', { key: tool.id,
                className: 'flex-1 px-1.5 py-2 text-[11px] font-bold rounded-lg border-2 transition-all text-center ' +
                  (sandboxTool === tool.id
                    ? 'border-teal-400 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 shadow'
                    : 'transition-colors border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-teal-600'),
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
            h('span', { className: 'text-xs font-semibold text-teal-700 dark:text-teal-300' }, __alloT('stem.ecosystem.entities_placed', 'Entities Placed:')),
            h('span', { className: 'text-sm font-bold text-teal-700 dark:text-teal-300' }, sandboxPlaceCount),
            h('button', { 'aria-label': __alloT('stem.ecosystem.sync_count', 'Sync Count'),
              className: 'transition-colors text-[11px] text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200 underline',
              onClick: syncSandboxCount
            }, __alloT('stem.ecosystem.sync_count', 'Sync Count'))
          ),

          // ── Pause/Speed controls (shared) ──
          h('div', { className: 'flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2' },
            h('button', { className: 'px-3 py-1 text-xs font-bold rounded-lg transition-all ' +
                (simPaused
                  ? 'transition-colors bg-teal-700 text-white hover:bg-teal-600 active:scale-[0.97]'
                  : 'transition-colors bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-400 active:scale-[0.97]'),
              onClick: function() {
                var newPaused = !simPaused;
                playSound('pause');
                upd('simPaused', newPaused);
                var canvasEl = document.querySelector('canvas[data-eco-canvas]');
                if (canvasEl) canvasEl.dataset.paused = newPaused ? '1' : '0';
              }
            }, simPaused ? '\u25B6 ' + __alloT('stem.ecosystem.resume', 'Resume') : '\u23F8 ' + __alloT('stem.ecosystem.pause', 'Pause')),
            h('div', { className: 'flex items-center gap-2 flex-1' },
              h('span', { className: 'text-[11px] font-semibold text-slate-700 dark:text-slate-200' }, __alloT('stem.ecosystem.speed_label', 'Speed:')),
              h('input', {
                type: 'range', min: 1, max: 6, step: 1, value: simSpeed,
                'aria-label': __alloT('stem.ecosystem.aria_sandbox_speed', 'Sandbox simulation speed'),
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
            h('p', { className: 'text-[11px] font-bold text-teal-700 dark:text-teal-300' }, '\u26A1 ' + __alloT('stem.ecosystem.inject_events', 'Inject Events')),
            h('div', { className: 'flex gap-1 flex-wrap' },
              eventDefs.map(function(ev) {
                return h('button', { 'aria-label': __alloT('stem.ecosystem.trigger_event', 'Trigger Event'),
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
              h('span', null, '\uD83C\uDF31 ' + __alloT('stem.ecosystem.carrying_capacity_k', 'Carrying Capacity (K)')),
              h('span', { className: 'text-amber-600 font-bold' }, carryingCapacity)
            ),
            h('input', {
              type: 'range', 'aria-label': __alloT('stem.ecosystem.aria_carrying_capacity_lc', 'carrying capacity'), min: 30, max: 200, step: 5, value: carryingCapacity,
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
                  h('div', { className: 'text-[11px] text-slate-600' }, '\uD83D\uDC07 ' + __alloT('stem.ecosystem.prey', 'Prey')),
                  h('div', { className: 'text-sm font-bold text-green-600' }, preyNow)
                ),
                h('div', { key: 'sbd', className: 'bg-red-50 dark:bg-red-900/20 rounded p-1.5' },
                  h('div', { className: 'text-[11px] text-slate-600' }, '\uD83E\uDD8A ' + __alloT('stem.ecosystem.predators', 'Predators')),
                  h('div', { className: 'text-sm font-bold text-red-600' }, predNow)
                ),
                h('div', { key: 'sbv', className: 'bg-emerald-50 dark:bg-emerald-900/20 rounded p-1.5' },
                  h('div', { className: 'text-[11px] text-slate-600' }, '\uD83C\uDF3F ' + __alloT('stem.ecosystem.vegetation', 'Vegetation')),
                  h('div', { className: 'text-sm font-bold text-emerald-600' }, vegNow + '%')
                )
              ];
            })()
          ),

          // ── Instructions text ──
          h('div', { className: 'bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-xs text-slate-600 dark:text-slate-300 space-y-1' },
            h('p', { className: 'font-bold text-slate-700 dark:text-slate-200' }, '\uD83D\uDCA1 ' + __alloT('stem.ecosystem.sandbox_instructions', 'Sandbox Instructions')),
            h('p', null, __alloT('stem.ecosystem.select_tool_intro', 'Select a tool above, then click on the canvas to interact:')),
            h('ul', { className: 'list-disc pl-4 space-y-0.5' },
              h('li', null, __alloT('stem.ecosystem.instr_place', 'Place Rabbit/Fox/Tree: Click anywhere to spawn')),
              h('li', null, __alloT('stem.ecosystem.instr_erase', 'Erase: Click near an entity to remove it')),
              h('li', null, __alloT('stem.ecosystem.instr_move', 'Move: Click and drag an entity to reposition it'))
            ),
            h('p', { className: 'text-[11px] italic text-slate-600 dark:text-slate-400' }, __alloT('stem.ecosystem.instr_tip', 'Tip: Pause the simulation first for precise placement!'))
          ),

          // ── Sandbox experiment suggestions ──
          h('div', { className: 'bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 border border-teal-200 dark:border-teal-700 space-y-1' },
            h('p', { className: 'text-[11px] font-bold text-teal-700 dark:text-teal-300' }, '\uD83E\uDD14 ' + __alloT('stem.ecosystem.experiment_ideas', 'Experiment Ideas')),
            h('ul', { className: 'list-disc pl-4 text-[11px] text-slate-600 dark:text-slate-200 space-y-0.5' },
              h('li', null, __alloT('stem.ecosystem.exp_idea_1', 'Remove all predators and watch what happens to prey and vegetation')),
              h('li', null, __alloT('stem.ecosystem.exp_idea_2', 'Create a "wall" of trees and see if it affects hunting patterns')),
              h('li', null, __alloT('stem.ecosystem.exp_idea_3', 'Add many foxes at once, then trigger a Food Boom to save the rabbits')),
              h('li', null, __alloT('stem.ecosystem.exp_idea_4', 'Pause, place prey in one corner and predators in the other, then resume')),
              h('li', null, __alloT('stem.ecosystem.exp_idea_5', 'Trigger a Wildfire then immediately add trees to observe recovery'))
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

        // ═══ CONSERVATION MANAGER TAB ═══
        tab === 'conserve' && (function() {
          var conserve = d.conserve || defaultConserveState();
          function setConserve(patch) { upd('conserve', Object.assign({}, conserve, patch)); }
          var T_GREEN = '#15803d', T_GREEN_HI = '#86efac';

          function startConserve(opts) {
            opts = opts || {};
            var fresh = defaultConserveState();
            var diffId = opts.difficulty || conserve.difficulty || 'manager';
            var diff = CONSERVATION_DIFFICULTIES[diffId] || CONSERVATION_DIFFICULTIES.manager;
            fresh.phase = 'year';
            fresh.difficulty = diff.id;
            fresh.hoursPerYear = diff.hoursPerYear;
            fresh.hoursLeft = diff.hoursPerYear;
            if (opts.seed) fresh.seed = opts.seed;
            setConserve(fresh);
            if (addToast) addToast('🌲 Conservation Manager begins. Year 1 of 10 on ' + diff.label + '.', 'success');
            awardXP && awardXP('conserve_start', 10, 'Conservation begins (' + diff.label + ')');
            if (announceToSR) announceToSR('Conservation Manager started on ' + diff.label + '. Year 1 of 10. ' + diff.hoursPerYear + ' stewardship hours.');
          }

          function resetConserve() { setConserve(defaultConserveState()); if (addToast) addToast('Conservation campaign reset.', 'info'); }

          function applyTech(techId, speciesId) {
            var tech = null;
            for (var i = 0; i < CONSERVATION_TECHNIQUES.length; i++) if (CONSERVATION_TECHNIQUES[i].id === techId) tech = CONSERVATION_TECHNIQUES[i];
            if (!tech) return;
            if (conserve.hoursLeft < tech.hours) { if (addToast) addToast('Not enough field-season hours left.', 'warn'); return; }

            // Eligibility checks
            if (tech.appliesTo !== 'any' && tech.appliesTo !== 'all') {
              var ok = false;
              for (var ai = 0; ai < tech.appliesTo.length; ai++) if (tech.appliesTo[ai] === speciesId) ok = true;
              if (!ok) { if (addToast) addToast(tech.name + ' does not apply to that species.', 'info'); return; }
            }
            if (tech.requires === 'reintroducible' && speciesId === 'grayWolf') {
              var wolf = getSp(conserve.species, 'grayWolf');
              if (wolf.habitat < 60 || wolf.support < 50) {
                if (addToast) addToast('Wolf reintroduction requires habitat 60+ AND support 50+.', 'warn');
                return;
              }
              if (conserve.wolfReintroduced) { if (addToast) addToast('Wolves have already been reintroduced.', 'info'); return; }
            }

            // Apply effects
            var newSpecies = conserve.species.map(function(s) {
              if (s.id !== speciesId && tech.appliesTo !== 'all') return s;
              var nz = Object.assign({}, s);
              if (tech.effects.pop)     nz.pop     = clamp(nz.pop + tech.effects.pop, 0, 100);
              if (tech.effects.habitat) nz.habitat = clamp(nz.habitat + tech.effects.habitat, 0, 100);
              if (tech.effects.support !== undefined) nz.support = clamp(nz.support + tech.effects.support, 0, 100);
              return nz;
            });

            var newAction = { tech: tech.name, species: getSpeciesDef(speciesId) ? getSpeciesDef(speciesId).name : speciesId, hours: tech.hours };
            var patch = {
              species: newSpecies,
              hoursLeft: conserve.hoursLeft - tech.hours,
              yearActions: conserve.yearActions.concat([newAction])
            };
            if (techId === 'reintroduce' && speciesId === 'grayWolf') patch.wolfReintroduced = true;
            if (techId === 'damRemoval') patch.damRemovals = (conserve.damRemovals || 0) + 1;
            setConserve(patch);
            if (techId === 'reintroduce' && speciesId === 'grayWolf') checkConsBadge('wolfReintroducer');
            if (announceToSR) announceToSR(tech.name + ' applied. ' + (conserve.hoursLeft - tech.hours) + ' hours left.');
          }

          function checkConsBadge(id) {
            if (badges[id]) return;
            var nb = Object.assign({}, badges); nb[id] = true; upd('badges', nb);
            var b = null; for (var i = 0; i < BADGES.length; i++) if (BADGES[i].id === id) b = BADGES[i];
            if (b && addToast) addToast('🏅 ' + b.label + ': ' + b.desc, 'success');
          }

          // Translate abstract pop scores to tangible conservation units.
          // Numbers are illustrative scales calibrated to plausible Maine
          // population levels at the indicated index.
          function speciesArtifact(s) {
            var p = Math.max(0, Math.round(s.pop));
            if (s.id === 'grayWolf')   return { icon: '🐺', text: p === 0 ? 'No breeding population' : (Math.max(2, Math.round(p / 5)) + ' wolves in roughly ' + Math.max(1, Math.round(p / 10)) + ' packs') };
            if (s.id === 'beaver')     return { icon: '🦫', text: Math.round(p * 60) + ' acres of beaver-engineered wetland' };
            if (s.id === 'moose')      return { icon: '🫎', text: Math.round(p * 850) + ' moose statewide' };
            if (s.id === 'deer')       return { icon: '🦌', text: Math.round(p / 2.5) + ' deer per square mile (15 to 20 is healthy)' };
            if (s.id === 'salmon')     return { icon: '🐟', text: (p < 5 ? 'Returns are below detection' : (Math.round(p * 35) + ' returning adult salmon per year')) };
            if (s.id === 'brookTrout') return { icon: '🐠', text: Math.round(p * 12) + ' stream miles holding wild brook trout' };
            return { icon: '🌿', text: '' };
          }

          // Run 10 years of pure neglect (no actions, no events) from the
          // default starting state. Cascades still fire, so deer hyperabundance
          // degrades habitats while wolves remain absent. Pedagogical hammer.
          function computeConserveDoNothing() {
            var sim = MAINE_SPECIES.map(function(s) { return Object.assign({ id: s.id }, s.defaultState); });
            for (var y = 0; y < conserve.maxYears; y++) {
              sim = sim.map(function(s) {
                var nz = Object.assign({}, s);
                if (nz.pop > 0 && nz.habitat > 50) nz.pop = clamp(nz.pop + 2, 0, 100);
                else if (nz.pop > 0 && nz.habitat < 30) nz.pop = clamp(nz.pop - 3, 0, 100);
                nz.support = clamp(nz.support + (nz.support < 50 ? 1 : -1), 0, 100);
                return nz;
              });
              CASCADE_RULES.forEach(function(rule) {
                if (rule.when(sim)) rule.apply(sim);
              });
            }
            return sim;
          }

          // Pick the highest-leverage opening play for Year 1
          function conserveCoachingTip() {
            // The deer-without-wolves trap is the most common failure mode.
            var deer = getSp(conserve.species, 'deer');
            var wolf = getSp(conserve.species, 'grayWolf');
            var salmon = getSp(conserve.species, 'salmon');
            if (deer.pop >= 75 && wolf.pop === 0) {
              return {
                priority: __alloT('stem.ecosystem.tip_wolf_priority', 'Build toward wolf reintroduction AND raise deer quota'),
                text: __alloT('stem.ecosystem.tip_wolf_text_pre', 'Deer are hyperabundant (') + Math.round(deer.pop) + __alloT('stem.ecosystem.tip_wolf_text_post', ' index) and wolves are absent. Without predators, deer degrade every habitat through browse pressure. Two parallel moves: raise the deer hunting quota for immediate relief, and start the long arc toward wolf reintroduction (Compensation fund + Public education to lift wolf support above 50, plus Habitat protection to lift wolf habitat above 60).')
              };
            }
            if (salmon.pop < 25) {
              return {
                priority: __alloT('stem.ecosystem.tip_salmon_priority', 'Stream restoration for salmon and trout'),
                text: __alloT('stem.ecosystem.tip_salmon_text_pre', 'Atlantic salmon are critically low (') + Math.round(salmon.pop) + __alloT('stem.ecosystem.tip_salmon_text_post', '). Stream restoration helps salmon, brook trout, and beaver in one move. Dam removal is a bigger lever but costs public support.')
              };
            }
            return {
              priority: __alloT('stem.ecosystem.tip_hold_priority', 'Hold steady and read the land'),
              text: __alloT('stem.ecosystem.tip_hold_text', 'No single zone is in crisis. Use Year 1 to monitor and protect habitat; the cascade rules will compound your moves in later years.')
            };
          }

          // ── AI CONSERVATION READING ──
          // Same safe-framing approach as Fire Ecology's AI Land Reading.
          // This is an AI conservation-biology educator, NOT a tribal voice
          // and NOT speaking for any wildlife professional, nation, or
          // organization. System prompt has hard constraints; visible
          // disclaimer renders with every response.
          function readEcosystem() {
            if (!callGemini || conserve.aiReadLoading) return;
            var summary = conserve.species.map(function(s) {
              var def = getSpeciesDef(s.id);
              return '- ' + def.name + ' (' + def.role + '): pop ' + Math.round(s.pop) + '/100 (target ' + def.targets.pop + '), habitat ' + Math.round(s.habitat) + '/100, public support ' + Math.round(s.support) + '/100';
            }).join('\n');
            var prompt = [
              'You are an AI conservation biology educator. You are NOT a Wabanaki person, NOT a wildlife professional, and you do NOT speak for any Wabanaki nation, agency, organization, or named individual.',
              '',
              'A student is managing a simulated Maine ecosystem across 10 years. Six species, each with population, habitat suitability, and public support.',
              '',
              'Current state (Year ' + conserve.year + ' of ' + conserve.maxYears + ', difficulty: ' + (CONSERVATION_DIFFICULTIES[conserve.difficulty] || CONSERVATION_DIFFICULTIES.manager).label + '):',
              summary,
              'Field hours this year: ' + conserve.hoursLeft + ' of ' + conserve.hoursPerYear,
              'Wolf reintroduced: ' + (conserve.wolfReintroduced ? 'yes' : 'no'),
              '',
              'Read this state and give 3 to 4 sentences of practical coaching grounded in real conservation biology.',
              '',
              'HARD CONSTRAINTS:',
              '- NEVER claim to be Wabanaki, Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq, Abenaki, a wildlife biologist, agency staff, or any named individual.',
              '- NEVER invoke sacred, ceremonial, or spiritual claims.',
              '- NEVER attribute statements to specific tribal individuals, elders, or named persons.',
              '- NEVER use "noble savage" framing or romanticized language about Indigenous peoples.',
              '- NEVER invent quotes.',
              '- DO frame as "conservation biology research" or "documented case studies" (Yellowstone wolves, Penobscot River dam removal, beaver re-establishment).',
              '- DO acknowledge that Wabanaki nations have led some of Maine\'s most important conservation work (especially Atlantic salmon and brown ash) when relevant, without speaking for them.',
              '- DO stay grounded in observable state and concrete techniques (reintroduction, stream restoration, dam removal, hunting quota, habitat protection, compensation fund, public education).',
              '- Name 1 or 2 highest-priority moves and explain why, grounded in trophic-cascade or keystone-species ecology.',
              '- Be direct, observational, useful. No flowery language.',
              '',
              'Respond in 3 to 4 sentences of plain prose. Do not use markdown.'
            ].join('\n');
            setConserve({ aiReadLoading: true, aiReadResponse: null });
            try {
              var p = callGemini(prompt);
              if (p && typeof p.then === 'function') {
                p.then(function(resp) {
                  var text = '';
                  if (typeof resp === 'string') text = resp;
                  else if (resp && typeof resp.text === 'string') text = resp.text;
                  else if (resp && resp.candidates) text = (resp.candidates[0] && resp.candidates[0].content && resp.candidates[0].content.parts && resp.candidates[0].content.parts[0] && resp.candidates[0].content.parts[0].text) || '';
                  text = (text || __alloT('stem.ecosystem.ai_no_text_fallback', 'The reader returned no text. Try again in a moment.')).replace(/\*\*/g, '').replace(/^[\s\n]+|[\s\n]+$/g, '');
                  setConserve({ aiReadResponse: text, aiReadLoading: false });
                  if (announceToSR) announceToSR('AI Conservation Reading complete.');
                }).catch(function() {
                  setConserve({ aiReadResponse: __alloT('stem.ecosystem.ai_offline', 'The AI reader is offline right now. Try again in a moment.'), aiReadLoading: false });
                });
              } else {
                setConserve({ aiReadResponse: __alloT('stem.ecosystem.ai_unavailable', 'AI is not available in this context.'), aiReadLoading: false });
              }
            } catch (e) {
              setConserve({ aiReadResponse: __alloT('stem.ecosystem.ai_offline', 'The AI reader is offline right now. Try again in a moment.'), aiReadLoading: false });
            }
          }

          function dismissConservAIRead() { setConserve({ aiReadResponse: null }); }

          function renderConservAIPanel() {
            if (conserve.aiReadLoading) {
              return h('div', { role: 'status', 'aria-live': 'polite',
                style: { padding: '12px 14px', borderRadius: 12, marginBottom: 12, background: 'rgba(56,189,248,0.10)', borderTop: '1px solid rgba(56,189,248,0.4)', borderRight: '1px solid rgba(56,189,248,0.4)', borderBottom: '1px solid rgba(56,189,248,0.4)', borderLeft: '3px solid #38bdf8', color: '#bae6fd', fontSize: 13 } },
                '⏳ ' + __alloT('stem.ecosystem.ai_reading_status', 'AI conservation biologist is reading your ecosystem...'));
            }
            if (!conserve.aiReadResponse) return null;
            return h('div', { role: 'region', 'aria-label': __alloT('stem.ecosystem.ai_cons_reading', 'AI Conservation Reading'),
              style: { padding: 14, borderRadius: 12, marginBottom: 12, background: 'linear-gradient(135deg, rgba(56,189,248,0.10) 0%, rgba(15,23,42,0.4) 100%)', borderTop: '1px solid rgba(56,189,248,0.5)', borderRight: '1px solid rgba(56,189,248,0.5)', borderBottom: '1px solid rgba(56,189,248,0.5)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                h('span', { style: { fontSize: 20 } }, '🔍'),
                h('strong', { style: { color: '#38bdf8', fontSize: 14 } }, __alloT('stem.ecosystem.ai_cons_reading', 'AI Conservation Reading')),
                h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 6 } },
                  h('button', { onClick: readEcosystem, 'aria-label': __alloT('stem.ecosystem.read_again', 'Read again'),
                    style: { background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, '↻ ' + __alloT('stem.ecosystem.re_read', 'Re-read')),
                  h('button', { onClick: dismissConservAIRead, 'aria-label': __alloT('stem.ecosystem.dismiss_reading', 'Dismiss reading'),
                    style: { background: 'transparent', border: '1px solid var(--allo-stem-border, #475569)', color: 'var(--allo-stem-text, #cbd5e1)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, '✕')
                )
              ),
              h('p', { style: { margin: '0 0 10px 0', color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 13.5, lineHeight: 1.6 } }, conserve.aiReadResponse),
              h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #64748b)', lineHeight: 1.5, paddingTop: 8, borderTop: '1px solid rgba(56,189,248,0.2)', fontStyle: 'italic' } },
                __alloT('stem.ecosystem.ai_educator_disclaimer1', 'AI conservation biology educator. '),
                h('strong', null, __alloT('stem.ecosystem.ai_disclaimer2', 'It is not a Wabanaki person, not a wildlife professional, and does not speak for any Wabanaki nation, agency, or organization.')),
                __alloT('stem.ecosystem.ai_disclaimer3', ' For authoritative voices on Maine conservation work, consult Penobscot Cultural and Historic Preservation Department, Passamaquoddy Cultural Heritage Museum, Wabanaki Public Health and Wellness, Maine Indian Basketmakers Alliance, Maine Department of Inland Fisheries and Wildlife, and the Atlantic Salmon Federation.')
              )
            );
          }

          // ── FOOD-WEB VISUALIZATION ──
          // Stylized food-web map: 6 species nodes arranged by trophic level,
          // arrows showing the cascade rules. Each node colored by population
          // health; each arrow brightened when its cascade rule is firing.
          function renderFoodWeb() {
            // Layout coordinates per species id
            var pos = {
              grayWolf:   { x: 300, y: 40 },
              deer:       { x: 180, y: 130 },
              moose:      { x: 420, y: 130 },
              beaver:     { x: 300, y: 220 },
              salmon:     { x: 180, y: 305 },
              brookTrout: { x: 420, y: 305 }
            };
            var species = conserve.species;
            var wolf = getSp(species, 'grayWolf'), deer = getSp(species, 'deer'), bea = getSp(species, 'beaver'), sal = getSp(species, 'salmon');
            // Which cascade rules are currently firing?
            var firing = {
              wolfDeer: wolf.pop > 25,
              deerHabitat: deer.pop > 75,
              beaverFish: bea.pop > 55,
              salmonTrout: sal.pop > 35
            };
            function arrowPath(from, to, curve) {
              // Quadratic curve via a midpoint offset perpendicular to the line
              var midX = (from.x + to.x) / 2;
              var midY = (from.y + to.y) / 2;
              var dx = to.x - from.x, dy = to.y - from.y;
              var len = Math.sqrt(dx * dx + dy * dy);
              var nx = -dy / len, ny = dx / len;
              var cx = midX + nx * (curve || 0);
              var cy = midY + ny * (curve || 0);
              return 'M ' + from.x + ' ' + from.y + ' Q ' + cx + ' ' + cy + ' ' + to.x + ' ' + to.y;
            }
            function nodeFill(s, def) {
              // intensity ~ population
              var alpha = Math.max(0.35, Math.min(1, s.pop / 100));
              return { color: def.color, alpha: alpha };
            }
            var w = 600, hgt = 360;
            return h('div', { style: { background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 12, padding: 8, marginBottom: 12, border: '1px solid var(--allo-stem-border, #1e293b)' } },
              h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', null, __alloT('stem.ecosystem.foodweb_cascade_caption', 'Food web: cascade rules active in real time')),
                h('span', { style: { marginLeft: 'auto', fontSize: 10, color: 'var(--allo-stem-text-soft, #64748b)', fontStyle: 'italic' } }, __alloT('stem.ecosystem.click_species_deepdive', 'Click any species for deep-dive →'))
              ),
              h('svg', { viewBox: '0 0 ' + w + ' ' + hgt, style: { width: '100%', height: 'auto', display: 'block', borderRadius: 8 }, role: 'img', 'aria-label': __alloT('stem.ecosystem.aria_foodweb_diagram', 'Food-web diagram of the 6 Maine species') },
                h('rect', { x: 0, y: 0, width: w, height: hgt, fill: '#020617', rx: 6 }),
                // Cascade arrows. Each one is rendered dim by default and
                // brightened + colored when its rule fires this year.
                // Wolf -> Deer (top-down suppression)
                (function() {
                  var p = arrowPath(pos.grayWolf, pos.deer, -10);
                  var color = firing.wolfDeer ? '#ef4444' : '#475569';
                  var width = firing.wolfDeer ? 3 : 1.5;
                  return h('g', null,
                    h('path', { d: p, stroke: color, strokeWidth: width, fill: 'none', strokeDasharray: firing.wolfDeer ? '' : '4 4', markerEnd: 'url(#arrow-' + (firing.wolfDeer ? 'red' : 'gray') + ')' }),
                    firing.wolfDeer ? h('text', { x: 220, y: 75, fontSize: 9, fill: '#fca5a5', fontWeight: 700 }, __alloT('stem.ecosystem.label_suppresses', 'suppresses')) : null
                  );
                })(),
                // Deer -> all (overbrowsing, drawn down to center)
                (function() {
                  var color = firing.deerHabitat ? '#f59e0b' : '#475569';
                  var width = firing.deerHabitat ? 3 : 1;
                  return h('g', null,
                    h('path', { d: 'M 200 145 Q 130 200 200 290', stroke: color, strokeWidth: width, fill: 'none', strokeDasharray: firing.deerHabitat ? '' : '4 4' }),
                    h('path', { d: 'M 200 145 Q 250 220 380 305', stroke: color, strokeWidth: width, fill: 'none', strokeDasharray: firing.deerHabitat ? '' : '4 4' }),
                    firing.deerHabitat ? h('text', { x: 135, y: 215, fontSize: 9, fill: '#fbbf24', fontWeight: 700 }, __alloT('stem.ecosystem.label_overbrowsing', 'overbrowsing')) : null
                  );
                })(),
                // Beaver -> Salmon
                (function() {
                  var p1 = arrowPath(pos.beaver, pos.salmon, 10);
                  var p2 = arrowPath(pos.beaver, pos.brookTrout, -10);
                  var color = firing.beaverFish ? '#38bdf8' : '#475569';
                  var width = firing.beaverFish ? 3 : 1.5;
                  return h('g', null,
                    h('path', { d: p1, stroke: color, strokeWidth: width, fill: 'none', strokeDasharray: firing.beaverFish ? '' : '4 4', markerEnd: 'url(#arrow-' + (firing.beaverFish ? 'blue' : 'gray') + ')' }),
                    h('path', { d: p2, stroke: color, strokeWidth: width, fill: 'none', strokeDasharray: firing.beaverFish ? '' : '4 4', markerEnd: 'url(#arrow-' + (firing.beaverFish ? 'blue' : 'gray') + ')' }),
                    firing.beaverFish ? h('text', { x: 300, y: 275, fontSize: 9, fill: '#bae6fd', fontWeight: 700, textAnchor: 'middle' }, __alloT('stem.ecosystem.label_engineers_habitat', 'engineers habitat')) : null
                  );
                })(),
                // Salmon -> Brook Trout (marine nutrients)
                (function() {
                  var p = arrowPath(pos.salmon, pos.brookTrout, 8);
                  var color = firing.salmonTrout ? '#06b6d4' : '#475569';
                  var width = firing.salmonTrout ? 3 : 1.2;
                  return h('g', null,
                    h('path', { d: p, stroke: color, strokeWidth: width, fill: 'none', strokeDasharray: firing.salmonTrout ? '' : '4 4', markerEnd: 'url(#arrow-' + (firing.salmonTrout ? 'cyan' : 'gray') + ')' }),
                    firing.salmonTrout ? h('text', { x: 300, y: 325, fontSize: 9, fill: '#a5f3fc', fontWeight: 700, textAnchor: 'middle' }, __alloT('stem.ecosystem.label_marine_nutrients', 'marine nutrients')) : null
                  );
                })(),
                // Arrow marker defs
                h('defs', null,
                  h('marker', { id: 'arrow-red', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#ef4444' })),
                  h('marker', { id: 'arrow-blue', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#38bdf8' })),
                  h('marker', { id: 'arrow-cyan', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#06b6d4' })),
                  h('marker', { id: 'arrow-gray', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#475569' }))
                ),
                // Species nodes
                species.map(function(s) {
                  var p = pos[s.id]; if (!p) return null;
                  var def = getSpeciesDef(s.id);
                  var fill = nodeFill(s, def);
                  return h('g', { key: s.id,
                    onClick: function() { openConservDeepDive(s.id); },
                    style: { cursor: 'pointer' },
                    role: 'button', tabIndex: 0,
                    'aria-label': __alloT('stem.ecosystem.aria_open_deepdive_pre', 'Open deep-dive for ') + def.name
                  },
                    h('circle', { cx: p.x, cy: p.y, r: 32, fill: def.color, opacity: fill.alpha }),
                    h('circle', { cx: p.x, cy: p.y, r: 32, fill: 'none', stroke: def.color, strokeWidth: 1.5 }),
                    h('text', { x: p.x, y: p.y + 4, fontSize: 22, textAnchor: 'middle', style: { pointerEvents: 'none' } }, def.icon),
                    h('text', { x: p.x, y: p.y + 50, fontSize: 11, textAnchor: 'middle', fontWeight: 700, fill: '#fff' }, def.name),
                    h('text', { x: p.x, y: p.y + 62, fontSize: 9, textAnchor: 'middle', fill: '#94a3b8' }, __alloT('stem.ecosystem.pop_prefix', 'pop ') + Math.round(s.pop))
                  );
                })
              )
            );
          }

          // Per-species deep-dive panel
          function openConservDeepDive(id) { setConserve({ deepDiveSpecies: id }); }
          function closeConservDeepDive() { setConserve({ deepDiveSpecies: null }); }

          function renderConservDeepDive(id) {
            var def = getSpeciesDef(id);
            if (!def || !def.deepDive) return null;
            var dd = def.deepDive;
            // What techniques actually apply here?
            var applicable = CONSERVATION_TECHNIQUES.filter(function(t) {
              if (t.appliesTo === 'any' || t.appliesTo === 'all') return true;
              return t.appliesTo.indexOf(id) >= 0;
            });
            return h('div', {
              role: 'dialog', 'aria-modal': 'true', 'aria-label': __alloT('stem.ecosystem.aria_cultural_deepdive_pre', 'Cultural deep-dive: ') + def.name,
              style: {
                background: 'linear-gradient(135deg, ' + def.color + '20 0%, rgba(15,23,42,0.85) 60%)',
                border: '1px solid ' + def.color + '88', borderLeft: '4px solid ' + def.color,
                borderRadius: 14, padding: 18, marginBottom: 16
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 } },
                h('span', { style: { fontSize: 36 } }, def.icon),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontSize: 11, color: def.color, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' } }, __alloT('stem.ecosystem.species_deepdive', 'Species deep-dive')),
                  h('h3', { style: { margin: '2px 0 0', color: '#fff', fontSize: 20 } }, def.name),
                  h('div', { style: { color: def.color, fontSize: 13, marginTop: 4, fontStyle: 'italic' } }, def.role)
                ),
                h('button', { onClick: closeConservDeepDive,
                  style: { background: 'rgba(15,23,42,0.6)', border: '1px solid var(--allo-stem-border, #334155)', color: 'var(--allo-stem-text, #cbd5e1)', cursor: 'pointer', borderRadius: 8, padding: '6px 12px', fontWeight: 700, fontSize: 13 } }, '✕ ' + __alloT('stem.ecosystem.close', 'Close'))
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 } },
                h('div', { style: { background: 'rgba(15,23,42,0.7)', borderRadius: 10, padding: 12 } },
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: '#86efac', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 } }, '🌿 ' + __alloT('stem.ecosystem.ecology', 'Ecology')),
                  h('p', { style: { margin: 0, color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 13, lineHeight: 1.55 } }, dd.knowledge)
                ),
                h('div', { style: { background: 'rgba(15,23,42,0.7)', borderRadius: 10, padding: 12 } },
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 } }, '📰 ' + __alloT('stem.ecosystem.case_work', 'Case work')),
                  h('p', { style: { margin: 0, color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 13, lineHeight: 1.55 } }, dd.casework)
                ),
                h('div', { style: { background: 'rgba(15,23,42,0.7)', borderRadius: 10, padding: 12 } },
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: '#38bdf8', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 } }, '🌍 ' + __alloT('stem.ecosystem.modern_context', 'Modern context')),
                  h('p', { style: { margin: 0, color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 13, lineHeight: 1.55 } }, dd.modernContext)
                )
              ),
              applicable.length > 0 ? h('div', { style: { marginTop: 12, padding: 12, background: 'rgba(21,128,61,0.10)', borderTop: '1px solid rgba(21,128,61,0.4)', borderRight: '1px solid rgba(21,128,61,0.4)', borderBottom: '1px solid rgba(21,128,61,0.4)', borderLeft: '3px solid #15803d', borderRadius: 10 } },
                h('div', { style: { fontSize: 11, fontWeight: 700, color: '#86efac', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 } }, '🛠 ' + __alloT('stem.ecosystem.what_you_can_do', 'What you can do for this species in the sim')),
                applicable.map(function(t, i) {
                  return h('div', { key: i, style: { margin: '4px 0', fontSize: 12.5, color: '#d1fae5', lineHeight: 1.5 } },
                    h('strong', { style: { color: '#bbf7d0' } }, t.icon + ' ' + t.name), ' (' + t.hours + 'h): ', t.desc
                  );
                })
              ) : null
            );
          }

          // Multi-line year-by-year trend chart
          function renderConservTrendChart(yearLog) {
            if (!yearLog || yearLog.length === 0) return null;
            var w = 600, hgt = 220, padL = 36, padR = 90, padT = 12, padB = 24;
            var ix = w - padL - padR;
            var iy = hgt - padT - padB;
            var species = MAINE_SPECIES;
            function ptsFor(spId) {
              return yearLog.map(function(snap, i) {
                var post = (snap.post || []).find(function(p) { return p.id === spId; });
                var v = post ? post.pop : 0;
                var x = padL + (yearLog.length === 1 ? ix / 2 : (i / (yearLog.length - 1)) * ix);
                var y = padT + iy - (v / 100) * iy;
                return { x: x, y: y, v: v };
              });
            }
            function pathStr(pts) {
              return pts.map(function(p, i) { return (i === 0 ? 'M' : 'L') + p.x + ',' + p.y; }).join(' ');
            }
            return h('div', { style: { background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 12, padding: 12, marginBottom: 14, border: '1px solid var(--allo-stem-border, #1e293b)' } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: 'var(--allo-stem-text, #e2e8f0)', marginBottom: 8 } }, '📈 ' + __alloT('stem.ecosystem.pop_trends_campaign', 'Population trends across the campaign')),
              h('svg', { viewBox: '0 0 ' + w + ' ' + hgt, style: { width: '100%', height: 'auto', display: 'block' }, role: 'img', 'aria-label': __alloT('stem.ecosystem.aria_trend_chart', 'Population-index trend chart by species year-by-year') },
                // gridlines
                [0, 25, 50, 75, 100].map(function(g, gi) {
                  var y = padT + iy - (g / 100) * iy;
                  return h('g', { key: 'g' + gi },
                    h('line', { x1: padL, y1: y, x2: padL + ix, y2: y, stroke: '#1e293b', strokeWidth: 1 }),
                    h('text', { x: padL - 4, y: y + 3, fontSize: 9, fill: '#64748b', textAnchor: 'end' }, g)
                  );
                }),
                // x labels
                yearLog.map(function(snap, i) {
                  var x = padL + (yearLog.length === 1 ? ix / 2 : (i / (yearLog.length - 1)) * ix);
                  return h('text', { key: 'xl' + i, x: x, y: hgt - 8, fontSize: 9, fill: '#64748b', textAnchor: 'middle' }, 'Y' + snap.year);
                }),
                // species lines
                species.map(function(sp) {
                  var pts = ptsFor(sp.id);
                  return h('g', { key: sp.id },
                    h('path', { d: pathStr(pts), stroke: sp.color, strokeWidth: 2, fill: 'none', strokeLinejoin: 'round' }),
                    pts.map(function(p, i) {
                      return h('circle', { key: i, cx: p.x, cy: p.y, r: 2, fill: sp.color });
                    })
                  );
                }),
                // legend (right side)
                species.map(function(sp, si) {
                  return h('g', { key: 'leg' + sp.id },
                    h('line', { x1: w - padR + 6, y1: padT + 8 + si * 16, x2: w - padR + 20, y2: padT + 8 + si * 16, stroke: sp.color, strokeWidth: 2.5 }),
                    h('text', { x: w - padR + 24, y: padT + 12 + si * 16, fontSize: 10, fill: '#cbd5e1' }, sp.icon + ' ' + sp.name.split(' ')[0])
                  );
                })
              )
            );
          }

          function endConserveYear() {
            // Pre-drift snapshot for delta display
            var pre = conserve.species.map(function(s) { return Object.assign({}, s); });

            // Natural drift
            var drifted = conserve.species.map(function(s) {
              var def = getSpeciesDef(s.id);
              var nz = Object.assign({}, s);
              // Each species drifts based on whether it is at carrying capacity
              if (nz.pop > 0 && nz.habitat > 50) nz.pop = clamp(nz.pop + 2, 0, 100);
              else if (nz.pop > 0 && nz.habitat < 30) nz.pop = clamp(nz.pop - 3, 0, 100);
              nz.support = clamp(nz.support + (nz.support < 50 ? 1 : -1), 0, 100);
              return nz;
            });

            // Seeded event
            var diff = CONSERVATION_DIFFICULTIES[conserve.difficulty || 'manager'] || CONSERVATION_DIFFICULTIES.manager;
            var skipRng = conserveRng(conserve.seed, conserve.year, 'skip');
            var pickRng = conserveRng(conserve.seed, conserve.year, 'pick');
            var ev;
            if (skipRng() < (diff.eventSkip || 0)) {
              ev = { id: 'quietYear', name: __alloT('stem.ecosystem.event_quiet_year_name', 'A Quiet Year'), icon: '🌤️', desc: __alloT('stem.ecosystem.event_quiet_year_desc', 'No major event. Routine fieldwork, steady progress.'), apply: function() {} };
            } else {
              ev = CONSERVATION_EVENTS[Math.floor(pickRng() * CONSERVATION_EVENTS.length)];
            }
            // Snapshot post-drift state before event so severity can scale event delta
            var postDrift = drifted.map(function(s) { return Object.assign({}, s); });
            // Apply event once on the full array (so cross-species events work)
            ev.apply(drifted);
            // Severity scaling: stretch or shrink the event's delta on top of post-drift
            var sev = diff.severity || 1;
            if (sev !== 1) {
              for (var di = 0; di < drifted.length; di++) {
                var sp = drifted[di]; var base = postDrift[di];
                sp.pop     = clamp(base.pop     + (sp.pop     - base.pop)     * sev, 0, 100);
                sp.habitat = clamp(base.habitat + (sp.habitat - base.habitat) * sev, 0, 100);
                sp.support = clamp(base.support + (sp.support - base.support) * sev, 0, 100);
              }
            }

            // Apply cascade rules
            var cascadesFired = [];
            CASCADE_RULES.forEach(function(rule) {
              if (rule.when(drifted)) {
                rule.apply(drifted);
                cascadesFired.push({ id: rule.id, msg: rule.msg });
              }
            });

            // Cascade Master badge: wolf established + deer suppressed
            if (getSp(drifted, 'grayWolf').pop > 35 && getSp(drifted, 'deer').pop < 60) checkConsBadge('cascadeMaster');
            // Per-species threshold badges
            if (getSp(drifted, 'beaver').pop > 75) checkConsBadge('beaverEngineer');
            if (getSp(drifted, 'salmon').pop > 50) checkConsBadge('salmonChampion');
            if (getSp(drifted, 'brookTrout').pop > 70) checkConsBadge('troutDefender');

            var snap = {
              year: conserve.year, event: ev.name, eventIcon: ev.icon, eventDesc: ev.desc,
              pre: pre, post: drifted.map(function(s) { return Object.assign({}, s); }),
              actions: conserve.yearActions.slice(),
              cascades: cascadesFired
            };

            setConserve({
              phase: 'review',
              species: drifted,
              lastEvent: ev,
              cascadeFiredThisYear: cascadesFired,
              yearLog: conserve.yearLog.concat([snap])
            });
            if (announceToSR) announceToSR('Year ' + conserve.year + ' complete. Event: ' + ev.name + '.');
          }

          function advanceConserveFromReview() {
            if (conserve.year >= conserve.maxYears) {
              // Compute final outcome
              var sp = conserve.species;
              var defs = MAINE_SPECIES;
              var targetsMet = 0;
              defs.forEach(function(def) {
                var s = getSp(sp, def.id);
                var hit = (s.pop >= def.targets.pop) && (s.habitat >= def.targets.habitat) && (s.support >= def.targets.support);
                if (hit) targetsMet++;
              });
              var avgPop = Math.round(sp.reduce(function(a, s) { return a + s.pop; }, 0) / sp.length);
              var avgHab = Math.round(sp.reduce(function(a, s) { return a + s.habitat; }, 0) / sp.length);
              var outcome;
              if (targetsMet >= 5 && avgPop >= 55) outcome = { tier: 'mastery', label: __alloT('stem.ecosystem.outcome_mastery_label', 'Conservation Mastery'), color: '#16a34a', icon: '🏆', desc: __alloT('stem.ecosystem.outcome_mastery_desc', 'You held the whole web together. Wolves are back. Beavers are reshaping streams. Salmon are running. Brook trout hold the headwaters. This is what landscape-scale recovery looks like.') };
              else if (targetsMet >= 3 && avgPop >= 45) outcome = { tier: 'skilled', label: __alloT('stem.ecosystem.outcome_skilled_label', 'Skilled Conservation Manager'), color: '#22c55e', icon: '🌲', desc: __alloT('stem.ecosystem.outcome_skilled_desc', 'You met most of the recovery targets. Some species are thriving, others are still climbing. The trajectory is good.') };
              else if (avgPop >= 35) outcome = { tier: 'mixed', label: __alloT('stem.ecosystem.outcome_mixed_label', 'Mixed Results'), color: '#f59e0b', icon: '🍃', desc: __alloT('stem.ecosystem.outcome_mixed_desc', 'A few species made meaningful gains. Others stalled or slipped. Conservation is rarely clean.') };
              else outcome = { tier: 'losing', label: __alloT('stem.ecosystem.outcome_losing_label', 'Losing Ground'), color: '#ef4444', icon: '⚠️', desc: __alloT('stem.ecosystem.outcome_losing_desc', 'The ecosystem is slipping. Populations are low, habitat is degraded, public support is fragile. This is how species disappear quietly.') };
              if (conserve.difficulty === 'director' && (outcome.tier === 'mastery' || outcome.tier === 'skilled')) checkConsBadge('directorRank');
              setConserve({ phase: 'debrief', finalOutcome: outcome, targetsMet: targetsMet });
              awardXP && awardXP('conserve_complete', 50, outcome.label);
            } else {
              setConserve({ phase: 'year', year: conserve.year + 1, hoursLeft: conserve.hoursPerYear, yearActions: [], lastEvent: null });
              if (announceToSR) announceToSR('Year ' + (conserve.year + 1) + ' begins. ' + conserve.hoursPerYear + ' hours.');
            }
          }

          // Deep-dive panel renders at the top of every phase when active
          var conservDeepDive = conserve.deepDiveSpecies ? renderConservDeepDive(conserve.deepDiveSpecies) : null;

          // ── SETUP PHASE ──
          if (conserve.phase === 'setup') {
            return h('div', { className: 'space-y-4' },
              conservDeepDive,
              h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(21,128,61,0.18) 0%, rgba(56,189,248,0.06) 100%)', border: '1px solid ' + T_GREEN + '66', borderLeft: '4px solid ' + T_GREEN } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 } },
                  h('span', { style: { fontSize: 36 } }, '🌲'),
                  h('div', null,
                    h('h3', { style: { margin: 0, color: T_GREEN_HI, fontSize: 22 } }, __alloT('stem.ecosystem.cons_manager_maine', 'Conservation Manager: Maine')),
                    h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #cbd5e1)', marginTop: 2 } }, __alloT('stem.ecosystem.steward_intro', 'Steward six species across 10 years of fieldwork.'))
                  )
                ),
                h('p', { style: { margin: '8px 0 0', color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 14, lineHeight: 1.6 } },
                  __alloT('stem.ecosystem.setup_intro_1', 'You are the lead manager in a Maine-inspired teaching scenario. Six species. Ten modeled years. The catch: '),
                  h('strong', null, __alloT('stem.ecosystem.setup_intro_connected', 'these species are connected.')),
                  __alloT('stem.ecosystem.setup_intro_2', ' The scenario links wolves, deer browse, beaver wetlands, migratory fish, and stream habitat through hand-authored rules. Population, habitat, and support values are relative indices, not animal counts; outcomes are not forecasts or management recommendations.')
                )
              ),

              // Food-web visualization at the top
              renderFoodWeb(),

              // Species preview cards
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 } },
                MAINE_SPECIES.map(function(s) {
                  return h('div', { key: s.id, style: { background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid ' + s.color, borderRadius: 10, padding: 12 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                      h('span', { style: { fontSize: 22 } }, s.icon),
                      h('strong', { style: { color: s.color } }, s.name)
                    ),
                    h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 4 } }, s.role),
                    h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5, marginBottom: 8 } }, __alloT('stem.ecosystem.' + (s.id) + '_desc', s.desc)),
                    h('button', { onClick: function() { openConservDeepDive(s.id); },
                      'aria-label': __alloT('stem.ecosystem.aria_open_deepdive_pre', 'Open deep-dive for ') + s.name,
                      style: { width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid ' + s.color + '88', background: s.color + '22', color: s.color, cursor: 'pointer', fontWeight: 700, fontSize: 11.5 }
                    }, '📚 ' + __alloT('stem.ecosystem.species_deepdive', 'Species deep-dive') + ' →')
                  );
                })
              ),

              // Difficulty
              h('div', { style: { background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 10, padding: 12, border: '1px solid var(--allo-stem-border, #1e293b)' } },
                h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontWeight: 700 } }, __alloT('stem.ecosystem.difficulty', 'Difficulty')),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 } },
                  Object.keys(CONSERVATION_DIFFICULTIES).map(function(dkey) {
                    var df = CONSERVATION_DIFFICULTIES[dkey];
                    var picked = (conserve.difficulty || 'manager') === dkey;
                    return h('button', { key: dkey,
                      onClick: function() { setConserve({ difficulty: dkey }); },
                      'aria-pressed': picked,
                      style: { background: picked ? 'rgba(21,128,61,0.20)' : '#1e293b', border: '1px solid ' + (picked ? '#15803d' : '#334155'), color: picked ? '#86efac' : '#cbd5e1', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', textAlign: 'left' }
                    },
                      h('div', { style: { fontWeight: 800, fontSize: 13 } }, df.label),
                      h('div', { style: { fontSize: 11, color: picked ? '#a7f3d0' : '#94a3b8', marginTop: 2, lineHeight: 1.4 } }, __alloT('stem.ecosystem.' + (dkey) + '_desc', df.desc))
                    );
                  })
                )
              ),

              h('button', { onClick: function() { startConserve(); },
                style: { width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, ' + T_GREEN + ' 0%, #166534 100%)', color: '#fff', fontWeight: 800, fontSize: 16, boxShadow: '0 6px 14px rgba(21,128,61,0.35)' }
              }, '🌲 ' + __alloT('stem.ecosystem.begin_campaign', 'Begin 10-year Conservation Campaign'))
            );
          }

          // ── DEBRIEF PHASE ──
          if (conserve.phase === 'debrief' && conserve.finalOutcome) {
            var o = conserve.finalOutcome;
            var baseline = computeConserveDoNothing();
            var actualAvgPop = Math.round(conserve.species.reduce(function(a, s) { return a + s.pop; }, 0) / conserve.species.length);
            var baselineAvgPop = Math.round(baseline.reduce(function(a, s) { return a + s.pop; }, 0) / baseline.length);
            return h('div', { className: 'space-y-3' },
              conservDeepDive,
              renderFoodWeb(),
              h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, ' + o.color + '24 0%, rgba(15,23,42,0) 100%)', border: '1px solid ' + o.color + '88', borderLeft: '4px solid ' + o.color } },
                h('div', { style: { fontSize: 40, marginBottom: 6 } }, o.icon),
                h('h3', { style: { margin: 0, color: o.color, fontSize: 22 } }, o.label),
                h('p', { style: { margin: '8px 0 0', color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 14, lineHeight: 1.6 } }, o.desc)
              ),
              // Year-by-year trend chart
              renderConservTrendChart(conserve.yearLog),

              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 } },
                conserve.species.map(function(s) {
                  var def = getSpeciesDef(s.id);
                  var targets = def.targets;
                  var hit = s.pop >= targets.pop && s.habitat >= targets.habitat && s.support >= targets.support;
                  var artifact = speciesArtifact(s);
                  return h('div', { key: s.id, style: { background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid ' + def.color, borderRadius: 10, padding: 12, fontSize: 12 } },
                    h('div', { style: { fontWeight: 700, color: def.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', null, def.icon + ' ' + def.name + (hit ? ' ✓' : '')),
                      def.deepDive ? h('button', { onClick: function() { openConservDeepDive(s.id); }, 'aria-label': __alloT('stem.ecosystem.aria_deepdive', 'Deep-dive'), title: __alloT('stem.ecosystem.species_deepdive', 'Species deep-dive'),
                        style: { marginLeft: 'auto', background: 'transparent', border: '1px solid ' + def.color + '66', color: def.color, cursor: 'pointer', borderRadius: 6, padding: '0 6px', fontSize: 11 } }, '📚') : null
                    ),
                    h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55 } },
                      __alloT('stem.ecosystem.population_colon', 'Population: ') + Math.round(s.pop) + ' / ' + targets.pop,
                      h('br'),
                      __alloT('stem.ecosystem.habitat_colon', 'Habitat: ') + Math.round(s.habitat) + ' / ' + targets.habitat,
                      h('br'),
                      __alloT('stem.ecosystem.public_support_colon', 'Public support: ') + Math.round(s.support) + ' / ' + targets.support
                    ),
                    artifact.text ? h('div', { style: { marginTop: 6, padding: 6, background: 'var(--allo-stem-panel, #1e293b)', borderRadius: 6, fontSize: 11.5, color: 'var(--allo-stem-text, #fde68a)' } },
                      h('span', { style: { fontSize: 14, marginRight: 4 } }, artifact.icon), artifact.text
                    ) : null
                  );
                })
              ),
              h('div', { style: { padding: 10, background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 8, fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)' } },
                h('strong', { style: { color: '#86efac' } }, __alloT('stem.ecosystem.targets_met_label', 'Targets met: ')), conserve.targetsMet + ' / 6'
              ),

              // Do-nothing baseline comparison
              h('div', { style: { padding: 12, borderRadius: 12, background: 'linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(127,29,29,0.18) 100%)', border: '1px solid rgba(248,113,113,0.4)' } },
                h('strong', { style: { color: '#fecaca', fontSize: 14, display: 'block', marginBottom: 8 } }, '↔ ' + __alloT('stem.ecosystem.what_if_nothing', 'What if you had done nothing for 10 years?')),
                h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
                  h('div', { style: { background: 'var(--allo-stem-canvas, #0f172a)', padding: 10, borderRadius: 8, borderLeft: '3px solid ' + o.color } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: o.color, marginBottom: 4 } }, __alloT('stem.ecosystem.your_campaign', 'Your campaign')),
                    h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 13 } }, __alloT('stem.ecosystem.avg_pop_prefix', 'Avg pop ') + actualAvgPop + __alloT('stem.ecosystem.targets_met_mid', ' · Targets met ') + conserve.targetsMet + '/6')
                  ),
                  h('div', { style: { background: 'var(--allo-stem-canvas, #0f172a)', padding: 10, borderRadius: 8, borderLeft: '3px solid #ef4444' } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fca5a5', marginBottom: 4 } }, __alloT('stem.ecosystem.pure_neglect', 'Pure neglect')),
                    h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 13 } }, __alloT('stem.ecosystem.avg_pop_prefix', 'Avg pop ') + baselineAvgPop + __alloT('stem.ecosystem.deer_hit_mid', ' · Deer hit ') + Math.round(getSp(baseline, 'deer').pop) + __alloT('stem.ecosystem.wolves_mid', ' · Wolves ') + Math.round(getSp(baseline, 'grayWolf').pop))
                  )
                ),
                h('div', { style: { marginTop: 8, fontSize: 12, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.5, fontStyle: 'italic' } },
                  baselineAvgPop > actualAvgPop
                    ? __alloT('stem.ecosystem.neglect_outperformed', 'Pure neglect outperformed active management this run. Trophic cascade went poorly. Look at which interventions cost you ground.')
                    : (actualAvgPop > baselineAvgPop + 12
                        ? __alloT('stem.ecosystem.moved_ahead', 'You moved the ecosystem substantially ahead of where neglect would have left it. The gap is the conservation infrastructure you built.')
                        : __alloT('stem.ecosystem.held_the_line', 'You roughly held the line against drift. Conservation that matches the do-nothing baseline still counts: stasis is the holding ground for everything you build later.'))
                )
              ),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', { onClick: resetConserve, style: { padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--allo-stem-panel, #1e293b)', color: 'var(--allo-stem-text, #cbd5e1)', fontWeight: 700 } }, '↻ ' + __alloT('stem.ecosystem.new_campaign', 'New campaign')),
                h('button', { onClick: function() { startConserve({ seed: conserve.seed, difficulty: conserve.difficulty }); },
                  style: { padding: '10px 16px', borderRadius: 10, border: '1px solid #38bdf8', cursor: 'pointer', background: 'rgba(56,189,248,0.15)', color: '#bae6fd', fontWeight: 700 } }, '🔁 ' + __alloT('stem.ecosystem.replay_same', 'Replay same conditions'))
              ),
              h('div', { style: { marginTop: 8, padding: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 8, fontSize: 11.5, color: 'var(--allo-stem-text-soft, #94a3b8)', fontFamily: 'ui-monospace, monospace' } },
                h('span', { style: { color: 'var(--allo-stem-text-soft, #64748b)' } }, __alloT('stem.ecosystem.campaign_seed', 'Campaign seed: ')),
                h('strong', { style: { color: 'var(--allo-stem-text, #cbd5e1)' } }, conserve.seed)
              )
            );
          }

          // ── REVIEW PHASE ──
          if (conserve.phase === 'review') {
            var lastSnap = conserve.yearLog[conserve.yearLog.length - 1] || {};
            var ev2 = conserve.lastEvent || {};
            return h('div', { className: 'space-y-3' },
              conservDeepDive,
              renderFoodWeb(),
              h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid #fbbf24' } },
                h('div', { style: { fontSize: 22, marginBottom: 4 } }, ev2.icon || '🌿'),
                h('strong', { style: { color: '#fbbf24', fontSize: 16 } }, __alloT('stem.ecosystem.year_prefix', 'Year ') + conserve.year + __alloT('stem.ecosystem.event_mid', ' event: ') + (ev2.name || __alloT('stem.ecosystem.quiet_fallback', 'quiet'))),
                h('p', { style: { margin: '6px 0 0', color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 13, lineHeight: 1.55 } }, ev2.desc || '')
              ),

              // Cascade rules that fired
              (lastSnap.cascades && lastSnap.cascades.length > 0) ? h('div', { style: { padding: 10, borderRadius: 10, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8', fontSize: 13, color: '#bae6fd' } },
                h('strong', { style: { color: '#38bdf8' } }, '🔄 ' + __alloT('stem.ecosystem.trophic_cascade_year', 'Trophic cascade this year')),
                lastSnap.cascades.map(function(c, ci) {
                  return h('div', { key: ci, style: { margin: '6px 0 0', fontStyle: 'italic' } }, '· ' + c.msg);
                })
              ) : null,

              // Per-species deltas
              h('div', { style: { background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 10, padding: 10 } },
                h('div', { style: { fontWeight: 700, color: 'var(--allo-stem-text, #e2e8f0)', marginBottom: 6, fontSize: 13 } }, __alloT('stem.ecosystem.what_changed_year', 'What changed this year')),
                (lastSnap.pre || []).map(function(preS) {
                  var postS = (lastSnap.post || []).find(function(p) { return p.id === preS.id; }) || preS;
                  var def = getSpeciesDef(preS.id);
                  function delta(label, before, after, goodIfDown) {
                    var dlt = Math.round(after - before);
                    var color = '#64748b'; var arrow = '·';
                    if (Math.abs(dlt) >= 1) {
                      if ((dlt > 0 && !goodIfDown) || (dlt < 0 && goodIfDown)) color = '#86efac';
                      else color = '#fca5a5';
                      arrow = dlt > 0 ? '▲' : '▼';
                    }
                    return h('span', { style: { color: color, fontSize: 11, fontWeight: 700, marginRight: 8 } }, label + ' ' + Math.round(after) + ' ' + arrow + ' ' + (dlt > 0 ? '+' : '') + dlt);
                  }
                  // Deer is "good if down" since the conservation target is lower
                  var popGoodIfDown = (preS.id === 'deer');
                  return h('div', { key: preS.id, style: { fontSize: 12, padding: '4px 0', borderTop: '1px solid var(--allo-stem-border, #1e293b)' } },
                    h('strong', { style: { color: def.color, marginRight: 8 } }, def.icon + ' ' + def.name),
                    delta(__alloT('stem.ecosystem.delta_pop', 'Pop'), preS.pop, postS.pop, popGoodIfDown),
                    delta(__alloT('stem.ecosystem.delta_hab', 'Hab'), preS.habitat, postS.habitat, false),
                    delta(__alloT('stem.ecosystem.delta_sup', 'Sup'), preS.support, postS.support, false)
                  );
                })
              ),

              h('button', { onClick: advanceConserveFromReview,
                style: { width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, ' + T_GREEN + ' 0%, #166534 100%)', color: '#fff', fontWeight: 700, fontSize: 14 }
              }, conserve.year >= conserve.maxYears ? __alloT('stem.ecosystem.see_final_outcome', 'See final outcome →') : __alloT('stem.ecosystem.begin_year_pre', 'Begin Year ') + (conserve.year + 1) + ' →')
            );
          }

          // ── YEAR PHASE ──
          var diff2 = CONSERVATION_DIFFICULTIES[conserve.difficulty || 'manager'];
          var coachingTip = (conserve.year === 1 && !conserve.firstTipDismissed && conserve.yearActions.length === 0) ? conserveCoachingTip() : null;
          return h('div', { className: 'space-y-3' },
            conservDeepDive,
            coachingTip ? h('div', { role: 'note', style: { padding: '10px 14px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(168,85,247,0.16) 0%, rgba(168,85,247,0.04) 100%)', borderTop: '1px solid rgba(168,85,247,0.6)', borderRight: '1px solid rgba(168,85,247,0.6)', borderBottom: '1px solid rgba(168,85,247,0.6)', borderLeft: '3px solid #a855f7', color: '#e9d5ff', fontSize: 13, lineHeight: 1.55, display: 'flex', alignItems: 'flex-start', gap: 10 } },
              h('span', { style: { fontSize: 20, flexShrink: 0 } }, '🪶'),
              h('div', { style: { flex: 1 } },
                h('strong', { style: { color: '#a855f7' } }, __alloT('stem.ecosystem.year1_priority_label', 'Year 1 priority: ')),
                h('span', { style: { color: '#fde68a' } }, coachingTip.priority),
                h('div', { style: { marginTop: 4, color: '#e9d5ff' } }, coachingTip.text)
              ),
              h('button', { onClick: function() { setConserve({ firstTipDismissed: true }); }, 'aria-label': __alloT('stem.ecosystem.dismiss_tip', 'Dismiss tip'),
                style: { background: 'transparent', border: 'none', color: '#a855f7', cursor: 'pointer', fontSize: 16, padding: 0, marginLeft: 6 } }, '✕')
            ) : null,
            // HUD
            h('div', { style: { padding: '10px 14px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(21,128,61,0.18) 0%, rgba(15,23,42,0) 100%)', border: '1px solid ' + T_GREEN + '66', borderLeft: '4px solid ' + T_GREEN, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' } },
              h('div', null,
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, __alloT('stem.ecosystem.year_label', 'Year')),
                h('div', { style: { fontSize: 20, fontWeight: 800, color: T_GREEN_HI } }, conserve.year + ' / ' + conserve.maxYears)
              ),
              h('div', null,
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, __alloT('stem.ecosystem.field_hours', 'Field hours')),
                h('div', { style: { fontSize: 20, fontWeight: 800, color: '#fbbf24' } }, conserve.hoursLeft + ' / ' + conserve.hoursPerYear)
              ),
              h('div', null,
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, __alloT('stem.ecosystem.difficulty', 'Difficulty')),
                h('div', { style: { fontSize: 14, fontWeight: 700, color: '#38bdf8' } }, diff2 ? diff2.label : __alloT('stem.ecosystem.manager', 'Manager'))
              ),
              h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
                callGemini ? h('button', { onClick: readEcosystem, disabled: conserve.aiReadLoading,
                  'aria-label': __alloT('stem.ecosystem.aria_ask_ai_read', 'Ask AI conservation biologist to read your ecosystem state'),
                  title: __alloT('stem.ecosystem.title_ai_reads_state', 'AI conservation educator reads your current state'),
                  style: { padding: '8px 12px', borderRadius: 10, border: '1px solid #38bdf8', cursor: conserve.aiReadLoading ? 'wait' : 'pointer', background: 'rgba(56,189,248,0.10)', color: '#38bdf8', fontWeight: 700, fontSize: 12, opacity: conserve.aiReadLoading ? 0.6 : 1 }
                }, conserve.aiReadLoading ? '⏳ ' + __alloT('stem.ecosystem.reading_status', 'Reading...') : '🔍 ' + __alloT('stem.ecosystem.read_ecosystem_ai', 'Read the ecosystem (AI)')) : null,
                h('button', { onClick: endConserveYear, 'aria-label': __alloT('stem.ecosystem.aria_end_year', 'End this year'),
                  style: { padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13 } }, __alloT('stem.ecosystem.end_year', 'End Year →'))
              )
            ),

            // AI Reading response (below HUD when present)
            renderConservAIPanel(),

            // Food-web visualization
            renderFoodWeb(),

            // Species cards with actions
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 10 } },
              conserve.species.map(function(s) {
                var def = getSpeciesDef(s.id);
                if (!def) return null;
                // What techniques apply to this species?
                var applicable = CONSERVATION_TECHNIQUES.filter(function(t) {
                  if (t.appliesTo === 'any' || t.appliesTo === 'all') return true;
                  return t.appliesTo.indexOf(s.id) >= 0;
                });
                return h('div', { key: s.id, style: { background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 12, padding: 12, borderLeft: '3px solid ' + def.color } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                    h('span', { style: { fontSize: 22 } }, def.icon),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontWeight: 700, color: def.color, fontSize: 14 } }, def.name),
                      h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, def.role)
                    ),
                    def.deepDive ? h('button', { onClick: function() { openConservDeepDive(s.id); }, 'aria-label': __alloT('stem.ecosystem.aria_deepdive_for_pre', 'Deep-dive for ') + def.name, title: __alloT('stem.ecosystem.species_deepdive', 'Species deep-dive'),
                      style: { background: 'transparent', border: '1px solid ' + def.color + '66', color: def.color, cursor: 'pointer', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 } }, '📚') : null
                  ),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 } },
                    [[__alloT('stem.ecosystem.delta_pop', 'Pop'), Math.round(s.pop), s.pop < 25 ? '#ef4444' : s.pop < 50 ? '#f59e0b' : '#22c55e', def.targets.pop],
                     [__alloT('stem.ecosystem.delta_hab', 'Hab'), Math.round(s.habitat), s.habitat < 40 ? '#ef4444' : s.habitat < 60 ? '#f59e0b' : '#22c55e', def.targets.habitat],
                     [__alloT('stem.ecosystem.delta_sup', 'Sup'), Math.round(s.support), s.support < 40 ? '#ef4444' : s.support < 60 ? '#f59e0b' : '#22c55e', def.targets.support]
                    ].map(function(st, si) {
                      return h('div', { key: si, style: { background: 'var(--allo-stem-panel, #1e293b)', padding: 6, borderRadius: 6, textAlign: 'center' } },
                        h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, st[0]),
                        h('div', { style: { fontSize: 15, fontWeight: 800, color: st[2] } }, st[1]),
                        h('div', { style: { fontSize: 9, color: 'var(--allo-stem-text-soft, #64748b)' } }, __alloT('stem.ecosystem.goal_prefix', 'goal ') + st[3])
                      );
                    })
                  ),
                  h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
                    applicable.map(function(t) {
                      var disabled = conserve.hoursLeft < t.hours;
                      if (t.requires === 'reintroducible' && s.id === 'grayWolf') {
                        if (s.habitat < 60 || s.support < 50 || conserve.wolfReintroduced) disabled = true;
                      }
                      return h('button', { key: t.id,
                        onClick: function() { applyTech(t.id, s.id); },
                        disabled: disabled,
                        title: t.desc,
                        style: { padding: '4px 8px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? '#1e293b' : '#15803d', color: disabled ? '#475569' : '#fff', opacity: disabled ? 0.5 : 1 }
                      }, t.icon + ' ' + t.name + ' (' + t.hours + 'h)');
                    })
                  )
                );
              })
            ),

            // Year action log
            conserve.yearActions.length > 0 ? h('div', { style: { background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 10, padding: 10, fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)' } },
              h('div', { style: { fontWeight: 700, color: 'var(--allo-stem-text, #e2e8f0)', marginBottom: 4 } }, __alloT('stem.ecosystem.year_prefix', 'Year ') + conserve.year + __alloT('stem.ecosystem.actions_suffix', ' actions')),
              conserve.yearActions.map(function(a, ai) {
                return h('div', { key: ai }, '· ' + a.tech + ' → ' + a.species + ' (' + a.hours + 'h)');
              })
            ) : h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #64748b)', fontStyle: 'italic' } }, __alloT('stem.ecosystem.no_actions_yet', 'No actions yet this year. Pick a species, pick a technique.'))
          );
        })(),

        // ═══ INQUIRY TAB (Cycle 15 — H7b'' validated design pattern) ═══
        tab === 'inquiry' && (function() {
          var iq = d.inquiry || { predBirth: 50, preyLife: 50, resScarcity: 30, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
          function setIQ(patch) { upd('inquiry', Object.assign({}, iq, patch)); }
          // Simple Lotka-Volterra-style outcome classifier with resource scarcity penalty
          var birthRate = iq.predBirth / 100;
          var prey = iq.preyLife / 100;
          var scarcity = iq.resScarcity / 100;
          var boomIndex = birthRate - prey * 0.6 - scarcity * 0.3;
          var collapseIndex = scarcity * 1.3 - prey * 0.5;
          var outcome = collapseIndex > 0.4 ? 'collapse' : (boomIndex > 0.25 ? 'boom' : 'balanced');
          var outcomeMeta = {
            boom: { label: '📈 ' + __alloT('stem.ecosystem.iq_boom_label', 'Predator-weighted regime'), desc: __alloT('stem.ecosystem.iq_boom_desc', 'In this teaching rule, the predator-birth input outweighs prey-lifespan and scarcity terms.'), color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
            balanced: { label: '🔄 ' + __alloT('stem.ecosystem.iq_balanced_label', 'Middle weighted regime'), desc: __alloT('stem.ecosystem.iq_balanced_desc', 'Neither arbitrary score crosses the classifier threshold; this does not demonstrate ecological equilibrium.'), color: '#059669', bg: '#ecfdf5', border: '#86efac' },
            collapse: { label: '⬇️ ' + __alloT('stem.ecosystem.iq_collapse_label', 'Scarcity-weighted regime'), desc: __alloT('stem.ecosystem.iq_collapse_desc', 'In this teaching rule, the scarcity score crosses its classifier threshold.'), color: '#b91c1c', bg: '#fef2f2', border: '#fb7185' }
          }[outcome];
          function logObs() {
            var obs = { pb: iq.predBirth, pl: iq.preyLife, rs: iq.resScarcity, out: outcome };
            setIQ({ log: (iq.log || []).concat([obs]).slice(-8) });
          }
          return h('div', { className: 'space-y-3' },
            h('div', { className: 'p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm' },
              h('h4', { className: 'text-sm font-black text-slate-800 dark:text-slate-200 mb-1' }, '❔ ' + __alloT('stem.ecosystem.iq_discovery_title', 'Predator-prey discovery')),
              h('p', { className: 'text-[12px] text-slate-700 dark:text-slate-300 mb-3 leading-relaxed' },
                __alloT('stem.ecosystem.iq_intro', 'Sweep three conceptual sliders and compare an arbitrary weighted classifier. The labels are prompts for inquiry, not Lotka-Volterra solutions, population forecasts, or measured ecological rates.')),
              // Discrete outcome marker
              h('div', { className: 'mb-3 p-3 rounded-lg text-center', role: 'status', 'aria-live': 'polite', style: { background: outcomeMeta.bg, border: '2px solid ' + outcomeMeta.border } },
                h('div', { className: 'text-lg font-black mb-1 tracking-tight', style: { color: outcomeMeta.color } }, outcomeMeta.label),
                h('div', { className: 'text-[11px] text-slate-700' }, outcomeMeta.desc)
              ),
              // 3 sliders
              h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 mb-3' },
                [
                  { key: 'predBirth', label: __alloT('stem.ecosystem.iq_slider_pred_birth', 'Predator birth rate'), val: iq.predBirth },
                  { key: 'preyLife', label: __alloT('stem.ecosystem.iq_slider_prey_life', 'Prey lifespan'), val: iq.preyLife },
                  { key: 'resScarcity', label: __alloT('stem.ecosystem.iq_slider_res_scarcity', 'Resource scarcity'), val: iq.resScarcity }
                ].map(function(s) {
                  return h('div', { key: s.key },
                    h('label', { htmlFor: 'eq-' + s.key, className: 'block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1' },
                      s.label + ': ', h('span', { className: 'font-mono text-emerald-700 dark:text-emerald-400' }, s.val + '%')),
                    h('input', { id: 'eq-' + s.key, type: 'range', min: 0, max: 100, step: 1, value: s.val,
                      onChange: function(e) { var p = {}; p[s.key] = parseInt(e.target.value, 10); setIQ(p); },
                      className: 'w-full', 'aria-label': s.label }));
                })
              ),
              // Log + reset
              h('div', { className: 'flex gap-2 items-center mb-3 flex-wrap' },
                h('button', { onClick: logObs, className: 'transition-colors px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 active:scale-[0.97]' }, '📋 ' + __alloT('stem.ecosystem.log_observation', 'Log observation')),
                h('button', { onClick: function() { setIQ({ predBirth: 50, preyLife: 50, resScarcity: 30, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); },
                  className: 'transition-colors px-2 py-1 rounded bg-white dark:bg-slate-900 hover:bg-slate-50 text-[11px] font-semibold text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 active:scale-[0.97]' }, '↺ ' + __alloT('stem.ecosystem.reset', 'Reset')),
                (iq.log || []).length > 0 && h('span', { className: 'text-[10px] text-slate-500 italic' }, (iq.log || []).length + __alloT('stem.ecosystem.observations_logged_suffix', ' observations logged'))
              ),
              // Log table
              (iq.log || []).length > 0 && h('div', { className: 'mb-3 overflow-x-auto' },
                h('table', { className: 'text-[10px] w-full border-collapse text-slate-700 dark:text-slate-300' },
                  h('thead', null, h('tr', { className: 'bg-slate-100 dark:bg-slate-700' },
                    [__alloT('stem.ecosystem.th_pred_birth', 'pred birth %'), __alloT('stem.ecosystem.th_prey_life', 'prey life %'), __alloT('stem.ecosystem.th_res_scarcity', 'resource scarcity %'), __alloT('stem.ecosystem.th_outcome', 'outcome')].map(function(c, i) {
                      return h('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 border border-slate-200 dark:border-slate-600 text-left' }, c);
                    }))),
                  h('tbody', null, iq.log.map(function(o, idx) {
                    var rowBg = o.out === 'balanced' ? 'rgba(16,185,129,0.08)' : (o.out === 'boom' ? 'rgba(220,38,38,0.08)' : 'rgba(127,29,29,0.10)');
                    return h('tr', { key: 'lr' + idx, style: { background: rowBg } },
                      h('td', { className: 'px-2 py-1 border border-slate-200 dark:border-slate-600 font-mono' }, o.pb),
                      h('td', { className: 'px-2 py-1 border border-slate-200 dark:border-slate-600 font-mono' }, o.pl),
                      h('td', { className: 'px-2 py-1 border border-slate-200 dark:border-slate-600 font-mono' }, o.rs),
                      h('td', { className: 'px-2 py-1 border border-slate-200 dark:border-slate-600' }, o.out));
                  })))
              ),
              // Free-text hypothesis
              h('div', { className: 'mb-3' },
                h('label', { htmlFor: 'eq-hypo', className: 'block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1' },
                  __alloT('stem.ecosystem.hypothesis_label', 'Your hypothesis (free text — no right answer):')),
                h('textarea', { id: 'eq-hypo', value: iq.hypothesis || '',
                  onChange: function(e) { setIQ({ hypothesis: e.target.value }); },
                  placeholder: __alloT('stem.ecosystem.iq_hypo_placeholder', 'Which slider matters MOST for triggering a collapse? Can you balance the system with predator birth at 80%? Type your own theory.'),
                  className: 'w-full text-[12px] border border-slate-300 dark:border-slate-600 rounded p-2 font-mono leading-snug bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200', rows: 3 })
              ),
              // Opt-in
              h('div', { className: 'mb-3' },
                !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); },
                  className: 'transition-colors px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 text-[11px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 active:scale-[0.97]' },
                  '🤔 ' + __alloT('stem.ecosystem.iq_stuck_btn', 'I\'m stuck — show me questions to think about (no answers)')),
                iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed' },
                  h('div', { className: 'font-bold text-amber-900 dark:text-amber-300 mb-1' }, __alloT('stem.ecosystem.open_questions', 'Open questions — investigate by manipulating:')),
                  h('ul', { className: 'list-disc pl-5 space-y-1' },
                    h('li', null, __alloT('stem.ecosystem.iq_q1', 'Start with all three at 50%. What outcome do you get? Now raise predator birth slowly. At what point does the regime flip?')),
                    h('li', null, __alloT('stem.ecosystem.iq_q2', 'Set predator birth high (80%). Can you save the system by changing ONLY prey lifespan? What if you change only resource scarcity?')),
                    h('li', null, __alloT('stem.ecosystem.iq_q3', 'Try to find TWO different settings that both produce a balanced cycle. What do they have in common?')),
                    h('li', null, __alloT('stem.ecosystem.iq_q4', 'Log 4-5 observations of each regime (boom, balanced, collapse). Look for patterns in the table — are there single-variable thresholds, or do they interact?')),
                    h('li', null, __alloT('stem.ecosystem.iq_q5', 'Ecological transfer efficiency varies among systems; about 10% is only a rough teaching heuristic. What additional information would you need to connect energy flow to predator abundance?'))),
                  h('div', { className: 'text-[10px] italic text-amber-700 dark:text-amber-400 mt-2' }, __alloT('stem.ecosystem.no_answers_revealed', 'No answers will be revealed. Investigate.')))
              ),
              // Self-mark
              h('div', { className: 'p-3 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700' },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('input', { type: 'checkbox', id: 'eq-und', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                  h('label', { htmlFor: 'eq-und', className: 'text-[12px] font-bold text-emerald-800 dark:text-emerald-300 cursor-pointer' },
                    __alloT('stem.ecosystem.iq_understand_label', 'I think I understand the trade-offs — let me explain them in my own words'))),
                iq.understood && h('textarea', { value: iq.explanation || '',
                  onChange: function(e) { setIQ({ explanation: e.target.value }); },
                  placeholder: __alloT('stem.ecosystem.iq_explain_placeholder', 'Explain in your own words: how do predator birth, prey lifespan, and resource scarcity interact? Why does balanced cycling require something specific? When do predators win? When does the system collapse?'),
                  className: 'w-full text-[12px] border border-emerald-300 dark:border-emerald-700 rounded p-2 font-mono leading-snug bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200', rows: 4 }),
                iq.understood && (iq.explanation || '').trim().length >= 40 && h('div', { className: 'mt-2 text-[10px] italic text-emerald-700 dark:text-emerald-400' },
                  '✓ ' + __alloT('stem.ecosystem.iq_saved_note', 'Saved. Notice — nobody checked your answer. That is what learner-driven inquiry looks like.'))
              ),
              h('div', { className: 'mt-3 p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] italic text-slate-600 dark:text-slate-400' },
                __alloT('stem.ecosystem.iq_model_limit', 'Model limit: two arbitrary weighted scores create three regime labels. This inquiry widget is not a population-dynamics model, does not calculate trophic energy transfer, and should not be interpreted as a forecast.'))
            )
          );
        })(),

        // ═══ QUIZ TAB ═══
        tab === 'quiz' && h('div', { className: 'space-y-3' },
          h('details', {
            open: quizTotal === 0,
            style: {
              padding: '10px 14px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(168,85,247,0.14) 0%, rgba(168,85,247,0.04) 100%)',
              borderTop: '1px solid rgba(168,85,247,0.5)', borderRight: '1px solid rgba(168,85,247,0.5)', borderBottom: '1px solid rgba(168,85,247,0.5)', borderLeft: '3px solid #a855f7',
              color: '#e9d5ff', fontSize: 13, lineHeight: 1.55
            }
          },
            h('summary', { style: { fontWeight: 700, color: '#a855f7', cursor: 'pointer', fontSize: 14 } }, '📜 ' + __alloT('stem.ecosystem.quiz_covers_title', 'What this quiz covers')),
            h('div', { style: { marginTop: 8, color: '#f3e8ff' } },
              h('div', null, __alloT('stem.ecosystem.quiz_covers_intro', '6 multiple-choice questions on foundational ecology concepts:')),
              h('ul', { style: { margin: '6px 0 0 18px', padding: 0, lineHeight: 1.7 } },
                h('li', null, __alloT('stem.ecosystem.quiz_topic_1', 'Predator response after prey availability increases')),
                h('li', null, __alloT('stem.ecosystem.quiz_topic_2', 'What the Lotka-Volterra family of models represents')),
                h('li', null, __alloT('stem.ecosystem.quiz_topic_3', 'Predation as an ecological interaction')),
                h('li', null, __alloT('stem.ecosystem.quiz_topic_4', 'Carrying capacity under specified conditions')),
                h('li', null, __alloT('stem.ecosystem.quiz_topic_5', 'Primary producers')),
                h('li', null, __alloT('stem.ecosystem.quiz_topic_6', 'Trophic levels in food chains and webs'))
              ),
              h('div', { style: { marginTop: 8 } }, __alloT('stem.ecosystem.quiz_covers_footer', 'Each question links back to behavior you can produce in Explore or Sandbox. If a concept feels abstract, swap to Sandbox and rebuild the scenario.'))
            )
          ),
          h('div', { className: 'bg-white dark:bg-slate-900 rounded-xl border border-slate-400 dark:border-slate-700 p-4 space-y-3' },
            h('div', { className: 'flex justify-between items-center' },
              h('span', { className: 'text-xs font-bold text-slate-700 dark:text-slate-200' }, __alloT('stem.ecosystem.question_prefix', 'Question ') + ((quizIndex % QUIZ_QUESTIONS.length) + 1) + __alloT('stem.ecosystem.of_mid', ' of ') + QUIZ_QUESTIONS.length),
              h('span', { className: 'text-xs text-emerald-600 font-bold' }, '\u2714 ' + quizCorrect + '/' + quizTotal)
            ),
            h('p', { className: 'text-sm font-semibold text-slate-800 dark:text-slate-100' }, currentQ.q),
            callTTS && h('button', { 'aria-label': __alloT('stem.ecosystem.read_question', 'Read question'),
              className: 'transition-colors text-[11px] text-slate-600 hover:text-slate-700',
              onClick: function() { speakText(currentQ.q); }
            }, '\uD83D\uDD0A ' + __alloT('stem.ecosystem.read_question', 'Read question')),
            h('div', { className: 'space-y-1.5' },
              currentQ.choices.map(function(choice, idx) {
                var isSelected = quizAnswer === idx;
                var isCorrectChoice = idx === currentQ.answer;
                var showResult = quizAnswer !== -1;
                var bgClass = 'transition-colors border-slate-200 dark:border-slate-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-[0.97]';
                if (showResult && isSelected && isCorrectChoice) {
                  bgClass = 'border-green-500 bg-green-50 dark:bg-green-900/30';
                } else if (showResult && isSelected && !isCorrectChoice) {
                  bgClass = 'border-red-500 bg-red-50 dark:bg-red-900/30';
                } else if (showResult && isCorrectChoice) {
                  bgClass = 'border-green-400 bg-green-50/50 dark:bg-green-900/20';
                }
                return h('button', { 'aria-label': __alloT('stem.ecosystem.answer_prefix', 'Answer ') + String.fromCharCode(65 + idx) + ': ' + choice,
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
            quizAnswer !== -1 && h('div', { className: 'space-y-3' },
              h('div', { 
                className: 'text-xs font-semibold p-3 rounded-lg border ' +
                  (quizAnswer === currentQ.answer ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800')
              }, 
                h('p', { className: 'font-bold' }, quizAnswer === currentQ.answer ? '🎉 ' + __alloT('stem.ecosystem.correct_excl', 'Correct!') : '🤔 ' + __alloT('stem.ecosystem.not_quite_excl', 'Not quite!')),
                h('p', { className: 'text-slate-600 mt-1 font-normal' }, currentQ.wrongFeedback ? currentQ.wrongFeedback[quizAnswer] : quizFeedback)
              ),

              // Concept glossary helper card
              currentQ.concept && ECO_VOCAB[currentQ.concept] && (function() {
                var lookedUp = (vocabLookedUp || []).indexOf(currentQ.concept) !== -1;
                return h('div', { className: 'p-3 rounded-lg border border-orange-200 bg-orange-50/50' },
                  h('div', { className: 'flex items-center justify-between' },
                    h('span', { className: 'text-xs font-bold text-orange-700' }, '🔍 ' + __alloT('stem.ecosystem.concept_prefix', 'Concept: ') + currentQ.concept),
                    !lookedUp && h('button', {
                      onClick: function() {
                        var newList = (vocabLookedUp || []).slice();
                        if (newList.indexOf(currentQ.concept) === -1) {
                          newList.push(currentQ.concept);
                          upd('vocabLookedUp', newList);
                          upd('researchPoints', (researchPoints || 0) + 5);
                          upd('totalRP', (totalRP || 0) + 5);
                          playSound('quizCorrect');
                          setTimeout(function() { checkEcoChallenges(); }, 50);
                        }
                      },
                      className: 'px-2 py-0.5 rounded bg-orange-100 hover:bg-orange-200 text-orange-700 text-[10px] font-bold transition-all active:scale-[0.97]'
                    }, __alloT('stem.ecosystem.study_term', 'Study Term (+5 RP)'))
                  ),
                  lookedUp && h('div', { className: 'text-xs text-slate-600 mt-1 font-normal' }, ECO_VOCAB[currentQ.concept])
                );
              })(),

              h('button', { 'aria-label': __alloT('stem.ecosystem.next_question', 'Next Question'),
                className: 'w-full py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600 transition-all active:scale-[0.97]',
                onClick: nextQuiz
              }, __alloT('stem.ecosystem.next_question', 'Next Question') + ' ➔')
            )
          ),
          // Quiz progress
          h('div', { className: 'bg-slate-50 dark:bg-slate-800 rounded-xl p-3' },
            h('p', { className: 'text-xs font-bold text-slate-700 dark:text-slate-200 mb-1' }, __alloT('stem.ecosystem.quiz_progress', 'Quiz Progress')),
            h('div', { className: 'w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden' },
              h('div', {
                className: 'h-full bg-emerald-500 rounded-full transition-all',
                style: { width: (quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0) + '%' }
              })
            ),
            h('p', { className: 'text-[11px] text-slate-600 mt-1' },
              quizTotal > 0
                ? Math.round((quizCorrect / quizTotal) * 100) + __alloT('stem.ecosystem.percent_correct_mid', '% correct (') + quizCorrect + '/' + quizTotal + ')'
                : __alloT('stem.ecosystem.answer_to_track', 'Answer questions to track your progress')
            )
          )
        ),

        // ═══ BADGES TAB (14 badges) ═══
        tab === 'badges' && h('div', { className: 'space-y-2' },
          h('p', { className: 'text-xs font-bold text-slate-700 dark:text-slate-200' },
            '\uD83C\uDFC5 ' + __alloT('stem.ecosystem.badges_earned', 'Badges Earned: ') + badgeCount + ' / ' + BADGES.length
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
                  h('p', { className: 'text-[11px] font-bold ' + (earned ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300') }, b.label),
                  h('p', { className: 'text-[11px] text-slate-600' }, __alloT('stem.ecosystem.' + (b.id) + '_desc', b.desc)),
                  earned && h('span', { className: 'text-[11px] text-emerald-700 dark:text-emerald-400 font-bold' }, '\u2714 ' + __alloT('stem.ecosystem.earned', 'EARNED'))
                )
              );
            })
          )
        ),

        // ── Keyboard shortcuts (updated) ──
        h('div', { className: 'text-[11px] text-slate-600 text-center space-x-3' },
          h('span', null, 'E ' + __alloT('stem.ecosystem.explore', 'Explore')),
          h('span', null, 'S ' + __alloT('stem.ecosystem.sandbox', 'Sandbox')),
          h('span', null, 'C ' + __alloT('stem.ecosystem.conservation', 'Conservation')),
          h('span', null, 'Q ' + __alloT('stem.ecosystem.quiz', 'Quiz')),
          h('span', null, 'B ' + __alloT('stem.ecosystem.badges', 'Badges')),
          h('span', null, 'R ' + __alloT('stem.ecosystem.simulate', 'Simulate')),
          h('span', null, 'P ' + __alloT('stem.ecosystem.pause', 'Pause')),
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
                '\uD83C\uDF3F ' + __alloT('stem.ecosystem.step_prefix', 'Step ') + (tutorialStep + 1) + __alloT('stem.ecosystem.of_5_suffix', ' of 5')),
              h('button', { 'aria-label': __alloT('stem.ecosystem.aria_dismiss_tutorial', 'Dismiss Tutorial'), className: 'transition-colors text-slate-600 hover:text-slate-900 text-sm rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500', onClick: dismissTutorial }, '\u2715')
            ),
            h('p', { className: 'text-sm text-slate-700 dark:text-slate-200 mb-4 leading-relaxed' },
              [
                '\uD83C\uDF3F ' + __alloT('stem.ecosystem.tut_step_1', 'Welcome to the Ecosystem Simulator! Watch rabbits and foxes interact in the canvas above.'),
                '\uD83C\uDF0E ' + __alloT('stem.ecosystem.tut_step_2', 'Choose a biome at the top to change the environment. Each has unique colors and ecology.'),
                '\u26A1 ' + __alloT('stem.ecosystem.tut_step_3', 'Trigger environmental events to test the ecosystem\u2019s resilience! Try Drought or Wildfire.'),
                '\uD83C\uDFAF ' + __alloT('stem.ecosystem.tut_step_4', 'Complete ecology challenges by maintaining specific population patterns. Earn RP!'),
                '\uD83D\uDCCA ' + __alloT('stem.ecosystem.tut_step_5', 'Run the graph simulation with Lotka\u2013Volterra equations. Try all 4 presets!')
              ][tutorialStep]
            ),
            h('div', { className: 'flex gap-2' },
              tutorialStep > 0 && h('button', { 'aria-label': __alloT('stem.ecosystem.back', 'Back'),
                className: 'transition-colors px-4 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.97]',
                onClick: function() { upd('tutorialStep', tutorialStep - 1); }
              }, '\u2190 ' + __alloT('stem.ecosystem.back', 'Back')),
              h('button', { className: 'transition-colors flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600 shadow-md active:scale-[0.97]',
                onClick: tutorialStep < 4 ? advanceTutorial : dismissTutorial
              }, tutorialStep < 4 ? __alloT('stem.ecosystem.next', 'Next') + ' \u2192' : '\u2714 ' + __alloT('stem.ecosystem.start_exploring', 'Start Exploring!'))
            )
          )
        )

      );
    }
  });
})();
}
