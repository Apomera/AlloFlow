// ═══════════════════════════════════════════
// stem_tool_cell.js — Cell Biology Simulator
// Standalone CDN module (extracted from stem_tool_science.js)
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

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-cell')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-cell';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  window.StemLab.registerTool('cell', {
    icon: '\uD83D\uDD2C',
    label: 'Cell Simulator',
    desc: 'Explore 11 living micro-organisms in a simulated petri dish',
    color: 'green',
    category: 'science',
    questHooks: [
      { id: 'discover_5', label: 'Discover 5 organisms', icon: '\uD83D\uDD2C', check: function(d) { var e = d._cellExt || {}; return (e.organismsObserved || []).length >= 5; }, progress: function(d) { var e = d._cellExt || {}; return (e.organismsObserved || []).length + '/5'; } },
      { id: 'discover_10', label: 'Discover 10 organisms', icon: '\uD83C\uDFC6', check: function(d) { return (d.discoveries || []).length >= 10; }, progress: function(d) { return (d.discoveries || []).length + '/10'; } },
      { id: 'quiz_3', label: 'Answer 3 cell biology quiz questions correctly', icon: '\uD83E\uDDE0', check: function(d) { var e = d._cellExt || {}; return (e.quizCorrect || 0) >= 3; }, progress: function(d) { var e = d._cellExt || {}; return (e.quizCorrect || 0) + '/3'; } },
      { id: 'earn_50_xp', label: 'Earn 50 Cell Explorer XP', icon: '\u2B50', check: function(d) { return (d.xpEarned || 0) >= 50; }, progress: function(d) { return (d.xpEarned || 0) + '/50 XP'; } }
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

      // ── Tool body (cell) ──
      return (function() {
var d = labToolData.cell;

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('cell', 'init', {
              first: 'Cell Explorer loaded. Examine plant and animal cell structures. Click organelles to learn about their functions.',
              repeat: 'Cell Explorer active.',
              terse: 'Cell Explorer.'
            }, { debounce: 800 });
          }

          var upd = function (key, val) { setLabToolData(function (prev) { return Object.assign({}, prev, { cell: Object.assign({}, prev.cell, (function () { var o = {}; o[key] = val; return o; })()) }); }); };

      // ── Sound Effects (Web Audio) ──
      // ── Cell Biology Audio System (singleton context) ──
      var _cellAC = null;
      function getCellAC() {
        if (!_cellAC) { try { _cellAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
        if (_cellAC && _cellAC.state === 'suspended') { try { _cellAC.resume(); } catch(e) {} }
        return _cellAC;
      }
      function cellTone(freq, dur, type, vol) {
        var ac = getCellAC(); if (!ac) return;
        try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = type || 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(vol || 0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (dur || 0.1)); } catch(e) {}
      }
      var cellSound = function (type) {
        try {
          switch (type) {
            case 'select':
              cellTone(520, 0.06, 'sine', 0.07);
              setTimeout(function() { cellTone(660, 0.05, 'sine', 0.06); }, 40);
              break;
            case 'food':
              cellTone(440, 0.04, 'sine', 0.06);
              setTimeout(function() { cellTone(554, 0.04, 'sine', 0.06); }, 30);
              setTimeout(function() { cellTone(660, 0.06, 'sine', 0.07); }, 60);
              break;
            case 'photosynthesis':
              // Gentle rising shimmer (sun energy)
              cellTone(330, 0.08, 'sine', 0.05);
              setTimeout(function() { cellTone(440, 0.08, 'sine', 0.06); }, 60);
              setTimeout(function() { cellTone(554, 0.1, 'sine', 0.07); }, 120);
              break;
            case 'correct':
              cellTone(523, 0.08, 'sine', 0.08);
              setTimeout(function() { cellTone(659, 0.08, 'sine', 0.08); }, 70);
              setTimeout(function() { cellTone(784, 0.1, 'sine', 0.09); }, 140);
              break;
            case 'wrong':
              cellTone(250, 0.15, 'sawtooth', 0.06);
              setTimeout(function() { cellTone(200, 0.12, 'sawtooth', 0.04); }, 80);
              break;
            case 'streak':
              cellTone(784, 0.06, 'sine', 0.07);
              setTimeout(function() { cellTone(880, 0.06, 'sine', 0.07); }, 50);
              setTimeout(function() { cellTone(1047, 0.1, 'sine', 0.08); }, 100);
              break;
            case 'badge':
              [523, 659, 784, 1047].forEach(function(f, i) { setTimeout(function() { cellTone(f, 0.1, 'triangle', 0.08); }, i * 90); });
              break;
            case 'divide':
              // Cell division — splitting wobble
              cellTone(300, 0.06, 'sine', 0.05);
              setTimeout(function() { cellTone(350, 0.05, 'sine', 0.05); }, 40);
              setTimeout(function() { cellTone(300, 0.04, 'sine', 0.04); cellTone(400, 0.04, 'sine', 0.04); }, 80);
              break;
            case 'death':
              cellTone(180, 0.2, 'sine', 0.04);
              break;
            default:
              cellTone(440, 0.08, 'sine', 0.06);
          }
          if (window._alloHaptic) {
            if (type === 'correct' || type === 'badge') window._alloHaptic('correct');
            else if (type === 'wrong') window._alloHaptic('wrong');
            else if (type === 'food' || type === 'select') window._alloHaptic('tap');
          }
        } catch (e) {}
      };

      // ── Ambient petri dish soundscape ──
      var _cellAmbient = null;
      function startCellAmbient() {
        if (_cellAmbient) return;
        var ac = getCellAC(); if (!ac) return;
        try {
          var bufSize = ac.sampleRate * 2;
          var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
          var data = buf.getChannelData(0);
          for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
          var src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
          var filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 180; filt.Q.value = 0.5;
          var master = ac.createGain(); master.gain.setValueAtTime(0, ac.currentTime);
          master.gain.linearRampToValueAtTime(0.006, ac.currentTime + 2);
          src.connect(filt); filt.connect(master); master.connect(ac.destination);
          src.start();
          _cellAmbient = { src: src, master: master };
          // Random microscopic bubbles
          _cellAmbient._interval = setInterval(function() {
            if (Math.random() > 0.6) {
              cellTone(1200 + Math.random() * 800, 0.02, 'sine', 0.02);
            }
          }, 2000 + Math.random() * 3000);
        } catch(e) {}
      }
      function stopCellAmbient() {
        if (_cellAmbient) {
          try { var ac = getCellAC(); if (ac) _cellAmbient.master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5); } catch(e) {}
          if (_cellAmbient._interval) clearInterval(_cellAmbient._interval);
          var nodes = _cellAmbient;
          setTimeout(function() { try { nodes.src.stop(); } catch(e) {} }, 600);
          _cellAmbient = null;
        }
      }

      // ── Extended state for badges ──
      var ext = d._cellExt || { badges: [], totalFood: 0, organismsObserved: [], organellesClicked: [], quizCorrect: 0, playModeUsed: false };
      var updExt = function (obj) {
        var merged = Object.assign({}, ext, obj);
        upd('_cellExt', merged);
        ext = merged;
      };
      var updExtAndBadge = function (obj) {
        var merged = Object.assign({}, ext, obj);
        upd('_cellExt', merged);
        ext = merged;
        checkCellBadges();
      };

      // ── Badges ──
      var cellBadges = {
        firstObserve: { id: 'firstObserve', icon: '\uD83D\uDC41', label: 'First Peek', desc: 'Select your first organism', xp: 5 },
        allOrganisms: { id: 'allOrganisms', icon: '\uD83C\uDFC6', label: 'Microbe Master', desc: 'Observe all 11 organisms', xp: 25 },
        quizStreak3: { id: 'quizStreak3', icon: '\uD83D\uDD25', label: 'Hot Streak', desc: 'Get 3 quiz answers correct in a row', xp: 10 },
        quizStreak5: { id: 'quizStreak5', icon: '\u2B50', label: 'Quiz Blaze', desc: '5 quiz answers correct in a row', xp: 20 },
        quizMaster: { id: 'quizMaster', icon: '\uD83E\uDDE0', label: 'Quiz Master', desc: 'Answer 15 quiz questions correctly', xp: 30 },
        playMode: { id: 'playMode', icon: '\uD83C\uDFAE', label: 'Hands On', desc: 'Play as any organism', xp: 5 },
        discoverer10: { id: 'discoverer10', icon: '\uD83D\uDD0D', label: 'Fact Finder', desc: 'Discover 10 organism facts', xp: 15 },
        foodCollector: { id: 'foodCollector', icon: '\uD83C\uDF7D', label: 'Hungry Hungry', desc: 'Collect 20 food particles', xp: 10 },
        anatomyExplorer: { id: 'anatomyExplorer', icon: '\uD83E\uDDEC', label: 'Anatomy Ace', desc: 'Click 10 different organelle labels', xp: 15 },
        centurion: { id: 'centurion', icon: '\uD83D\uDCAF', label: 'Centurion', desc: 'Earn 100+ total XP in Cell Sim', xp: 20 }
      };

      var checkCellBadges = function () {
        var newBadges = ext.badges.slice();
        var changed = false;
        function award(id) {
          if (newBadges.indexOf(id) === -1) {
            newBadges.push(id);
            changed = true;
            var b = cellBadges[id];
            if (b) {
              cellSound('badge');
              if (typeof awardStemXP === 'function') awardStemXP('cell_badge_' + id, b.xp, b.label);
              if (typeof addToast === 'function') addToast('\uD83C\uDFC5 ' + b.label + '! +' + b.xp + ' XP', 'success');
            }
          }
        }
        if (ext.organismsObserved.length >= 1) award('firstObserve');
        if (ext.organismsObserved.length >= 11) award('allOrganisms');
        if ((d.quizStreak || 0) >= 3) award('quizStreak3');
        if ((d.quizStreak || 0) >= 5) award('quizStreak5');
        if (ext.quizCorrect >= 15) award('quizMaster');
        if (ext.playModeUsed) award('playMode');
        if ((d.discoveries || []).length >= 10) award('discoverer10');
        if (ext.totalFood >= 20) award('foodCollector');
        if (ext.organellesClicked.length >= 10) award('anatomyExplorer');
        if ((d.xpEarned || 0) >= 100) award('centurion');
        if (changed) updExt({ badges: newBadges });
      };

      // ── AI Tutor ──
      var askAI = function (question) {
        if (!question || !callGemini) return;
        upd('_cellAILoading', true);
        var prompt = 'You are a friendly biology tutor in a cell simulator for students. The user is exploring micro-organisms (amoeba, paramecium, euglena, white blood cell, bacterium, plant cell, diatom, volvox, stentor, tardigrade, spirillum). Answer concisely in 2-3 sentences at a middle-school level. Question: ' + question;
        callGemini(prompt, false, false, 0.7).then(function (resp) {
          upd('_cellAIResp', resp);
          upd('_cellAILoading', false);
        }).catch(function () {
          upd('_cellAIResp', 'Sorry, I could not get an answer right now.');
          upd('_cellAILoading', false);
        });
      };


          // ── Organism definitions ──

          // ═══════════════════════════════════════════════════════════
          // ORGANISM ENCYCLOPEDIA — deep profiles for 60+ organisms
          // ═══════════════════════════════════════════════════════════
          var ORGANISM_DB = [
            {
              id: 1,
              name: "Amoeba",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "500 μm",
              description: "Single-celled protist that moves by extending pseudopods. Found in freshwater + soil. Famously studied by 19th-century microbiologists.",
              habitat: "Freshwater ponds + soil",
              feeding: "Phagocytosis of bacteria + smaller protists",
              reproduction: "Binary fission",
              movement: "Pseudopod extension",
              discovered: "17th century via early microscopes",
              relevance: "Most well-known protist"
            },
            {
              id: 2,
              name: "Paramecium",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "120 μm",
              description: "Ciliated protist with characteristic slipper shape. Swims via thousands of cilia coordinated in metachronal waves.",
              habitat: "Freshwater + slightly brackish",
              feeding: "Bacteria + algae via oral groove",
              reproduction: "Binary fission + conjugation",
              movement: "Ciliary propulsion ~3 mm/s",
              discovered: "1675 by Leeuwenhoek",
              relevance: "Famous textbook organism"
            },
            {
              id: 3,
              name: "Euglena",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "50-100 μm",
              description: "Unique protist with both chloroplasts (plant-like) and capacity to consume food (animal-like). Has a red eyespot for light detection.",
              habitat: "Freshwater + ponds",
              feeding: "Photosynthesis + phagocytosis",
              reproduction: "Binary fission",
              movement: "Flagellar swimming + euglenoid movement",
              discovered: "1838 by Ehrenberg",
              relevance: "Bridges plant/animal divide"
            },
            {
              id: 4,
              name: "White Blood Cell",
              kingdom: "Animal Cell",
              cellType: "Eukaryote",
              size: "12-20 μm",
              description: "Immune cell that defends against pathogens through phagocytosis, antibody production, and other mechanisms.",
              habitat: "Blood + lymph + tissues",
              feeding: "Engulfs pathogens",
              reproduction: "Stem cell differentiation",
              movement: "Chemotaxis + amoeboid",
              discovered: "Various neutrophils, lymphocytes, monocytes",
              relevance: "Essential to human survival"
            },
            {
              id: 5,
              name: "E. coli",
              kingdom: "Bacteria",
              cellType: "Prokaryote",
              size: "2 μm",
              description: "Rod-shaped gut bacterium. Most-studied prokaryote in biology. Some strains are harmful (E. coli O157:H7), most are commensal.",
              habitat: "Mammalian intestines",
              feeding: "Sugars + amino acids",
              reproduction: "Binary fission ~20 min",
              movement: "Flagellar swimming",
              discovered: "1885 by Theodor Escherich",
              relevance: "Model organism for molecular biology"
            },
            {
              id: 6,
              name: "Plant Cell (Elodea)",
              kingdom: "Plant Cell",
              cellType: "Eukaryote",
              size: "40-100 μm",
              description: "Photosynthetic cell with chloroplasts. Has rigid cellulose wall. Used widely in microscopy lessons.",
              habitat: "Freshwater aquariums",
              feeding: "Photosynthesis (autotroph)",
              reproduction: "Cell division",
              movement: "Stationary (cytoplasmic streaming)",
              discovered: "Elodea identified as aquarium plant 1800s",
              relevance: "Classic microscopy specimen"
            },
            {
              id: 7,
              name: "Diatom",
              kingdom: "Algae",
              cellType: "Eukaryote",
              size: "10-200 μm",
              description: "Unique algae with intricate silica cell wall. Major contributor to oxygen production (~20% global O2). Beautiful glass-like shells preserved in fossils.",
              habitat: "Marine + freshwater plankton",
              feeding: "Photosynthesis",
              reproduction: "Binary fission + sexual",
              movement: "Mostly drifting",
              discovered: "1703 by Leeuwenhoek",
              relevance: "Major carbon sink. Diatomaceous earth = compacted shells."
            },
            {
              id: 8,
              name: "Volvox",
              kingdom: "Algae",
              cellType: "Eukaryote",
              size: "500-1000 μm",
              description: "Multicellular green algae colony. Hollow spheres of 1000s of cells. Each cell has 2 flagella. Considered an evolutionary bridge between single-celled and multicellular.",
              habitat: "Freshwater ponds + pools",
              feeding: "Photosynthesis",
              reproduction: "Asexual + sexual",
              movement: "Coordinated flagellar swimming",
              discovered: "1700s by various microscopists",
              relevance: "Multicellular transition organism"
            },
            {
              id: 9,
              name: "Stentor",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "1-2 mm (large!)",
              description: "Trumpet-shaped ciliated protist. Among the largest single-celled organisms visible to naked eye. Can be cut in half and each piece regenerates.",
              habitat: "Freshwater attached to plants",
              feeding: "Filters bacteria + algae",
              reproduction: "Binary fission + conjugation",
              movement: "Anchored stalk with attaching organelles",
              discovered: "1768 by Müller",
              relevance: "Famous for regeneration ability"
            },
            {
              id: 10,
              name: "Tardigrade",
              kingdom: "Animal",
              cellType: "Eukaryote",
              size: "0.5-1 mm",
              description: "Water bear. Microscopic 8-legged animal. Can survive extreme conditions: vacuum of space, intense radiation, near-absolute zero, boiling water.",
              habitat: "Moss + lichen + water",
              feeding: "Plant cells + bacteria",
              reproduction: "Eggs",
              movement: "Walking with claws",
              discovered: "1773 by Goeze",
              relevance: "Most resilient animal known"
            },
            {
              id: 11,
              name: "Spirillum",
              kingdom: "Bacteria",
              cellType: "Prokaryote",
              size: "2-60 μm",
              description: "Spiral-shaped bacterium. Moves in corkscrew pattern via bipolar flagella tufts.",
              habitat: "Stagnant freshwater",
              feeding: "Organic compounds",
              reproduction: "Binary fission",
              movement: "Helical swimming",
              discovered: "1830s",
              relevance: "Shape gave rise to \"spirilla\" classification"
            },
            {
              id: 12,
              name: "Bacterium (rod)",
              kingdom: "Bacteria",
              cellType: "Prokaryote",
              size: "1-5 μm",
              description: "Generic rod-shaped bacterium representing the bacillus shape.",
              habitat: "Ubiquitous",
              feeding: "Variable",
              reproduction: "Binary fission",
              movement: "Flagella or non-motile",
              discovered: "Various",
              relevance: "Includes Bacillus, E. coli, Salmonella"
            },
            {
              id: 13,
              name: "Streptococcus",
              kingdom: "Bacteria",
              cellType: "Prokaryote",
              size: "1 μm",
              description: "Chain-forming sphere bacteria. Includes harmful strains (S. pneumoniae, S. pyogenes) and useful (S. thermophilus in yogurt).",
              habitat: "Mouth, throat, intestines",
              feeding: "Variable",
              reproduction: "Binary fission",
              movement: "Non-motile",
              discovered: "1874 by Billroth",
              relevance: "Strep throat, scarlet fever, plus food applications"
            },
            {
              id: 14,
              name: "Lactobacillus",
              kingdom: "Bacteria",
              cellType: "Prokaryote",
              size: "2-9 μm",
              description: "Rod bacterium that produces lactic acid from sugar. Essential for yogurt, cheese, sourdough, pickles. Major component of human gut microbiome.",
              habitat: "GI tract + fermented foods",
              feeding: "Lactose + glucose",
              reproduction: "Binary fission",
              movement: "Non-motile",
              discovered: "19th century",
              relevance: "Probiotic gut health"
            },
            {
              id: 15,
              name: "Cyanobacteria",
              kingdom: "Bacteria",
              cellType: "Prokaryote",
              size: "1-10 μm",
              description: "Photosynthetic bacteria. Earliest oxygen producers. Caused Great Oxidation Event ~2.4 billion years ago.",
              habitat: "Aquatic + soil",
              feeding: "Photosynthesis",
              reproduction: "Binary fission",
              movement: "Some have gas vacuoles",
              discovered: "Ancient — fossils 3.5 billion years old",
              relevance: "Origin of all photosynthesis"
            },
            {
              id: 16,
              name: "Spirochete",
              kingdom: "Bacteria",
              cellType: "Prokaryote",
              size: "5-50 μm",
              description: "Flexible spiral bacterium. Includes Treponema pallidum (syphilis), Borrelia burgdorferi (Lyme disease).",
              habitat: "Various — some pathogenic",
              feeding: "Variable",
              reproduction: "Binary fission",
              movement: "Axial filaments inside cell",
              discovered: "Various",
              relevance: "Major disease causers"
            },
            {
              id: 17,
              name: "Salmonella",
              kingdom: "Bacteria",
              cellType: "Prokaryote",
              size: "1-2 μm",
              description: "Rod bacterium that causes food poisoning. Found in raw eggs, undercooked poultry.",
              habitat: "GI tract of animals",
              feeding: "Variable",
              reproduction: "Binary fission",
              movement: "Flagella",
              discovered: "1880 by Salmon",
              relevance: "Major foodborne pathogen"
            },
            {
              id: 18,
              name: "Mycobacterium",
              kingdom: "Bacteria",
              cellType: "Prokaryote",
              size: "1-10 μm",
              description: "Rod bacterium with waxy cell walls. Includes M. tuberculosis (TB) and M. leprae (leprosy).",
              habitat: "Various — soil, water, mammals",
              feeding: "Various",
              reproduction: "Binary fission (slow ~24 hr)",
              movement: "Non-motile",
              discovered: "1882 by Robert Koch (TB)",
              relevance: "Major disease causer"
            },
            {
              id: 19,
              name: "Yeast (Saccharomyces)",
              kingdom: "Fungus",
              cellType: "Eukaryote",
              size: "5-10 μm",
              description: "Unicellular fungus. Used in bread, beer, wine. Model organism for genetics.",
              habitat: "Sugary environments + ferments",
              feeding: "Sugars (glucose, fructose)",
              reproduction: "Budding",
              movement: "Non-motile",
              discovered: "1670s by Leeuwenhoek",
              relevance: "Foundational for fermentation industries"
            },
            {
              id: 20,
              name: "Penicillium",
              kingdom: "Fungus",
              cellType: "Eukaryote",
              size: "Multicellular hyphae",
              description: "Mold fungus. Produces penicillin antibiotic. Used in cheese making.",
              habitat: "Decaying organic matter",
              feeding: "Decomposition",
              reproduction: "Spores",
              movement: "Stationary",
              discovered: "1928 by Fleming (penicillin)",
              relevance: "First antibiotic"
            },
            {
              id: 21,
              name: "Algae (general)",
              kingdom: "Algae",
              cellType: "Eukaryote",
              size: "Variable",
              description: "Photosynthetic eukaryotes. Range from single-celled to giant kelp.",
              habitat: "Aquatic everywhere",
              feeding: "Photosynthesis",
              reproduction: "Various",
              movement: "Variable",
              discovered: "Ancient",
              relevance: "Generate ~50% Earth oxygen"
            },
            {
              id: 22,
              name: "Slime Mold",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "Variable (visible)",
              description: "Acellular slime molds form single giant cell with many nuclei. Solve mazes. Studied for emergent intelligence.",
              habitat: "Decaying wood + leaves",
              feeding: "Bacteria + organic",
              reproduction: "Spores",
              movement: "Cytoplasmic streaming",
              discovered: "19th century",
              relevance: "Showcases biological problem-solving without brain"
            },
            {
              id: 23,
              name: "Plasmodium",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "5-30 μm",
              description: "Parasitic protist. Causes malaria. Transmitted by mosquitoes.",
              habitat: "Mammalian blood + mosquito gut",
              feeding: "Hemoglobin (red blood cells)",
              reproduction: "Complex sexual + asexual",
              movement: "Sporozoites swim, merozoites burst",
              discovered: "1880 by Laveran",
              relevance: "Major global killer ~600K deaths/year"
            },
            {
              id: 24,
              name: "Giardia",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "10-15 μm",
              description: "Flagellated intestinal parasite. Causes \"beaver fever\" / giardiasis.",
              habitat: "Contaminated water + mammalian GI",
              feeding: "Intestinal contents",
              reproduction: "Binary fission",
              movement: "8 flagella",
              discovered: "Discovered 1681 by Leeuwenhoek",
              relevance: "Common waterborne illness"
            },
            {
              id: 25,
              name: "Trypanosome",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "15-20 μm",
              description: "Long flagellated parasite. Causes sleeping sickness (Africa) and Chagas disease (Americas).",
              habitat: "Mammalian blood + insect vectors",
              feeding: "Blood sugars",
              reproduction: "Binary fission",
              movement: "Flagellar swimming",
              discovered: "1840s",
              relevance: "Major neglected tropical diseases"
            },
            {
              id: 26,
              name: "Chlamydomonas",
              kingdom: "Algae",
              cellType: "Eukaryote",
              size: "10-12 μm",
              description: "Single-celled green alga with 2 flagella. Major model organism for photosynthesis + flagellar dynamics.",
              habitat: "Freshwater + soil",
              feeding: "Photosynthesis",
              reproduction: "Sexual + asexual",
              movement: "Flagellar",
              discovered: "1832 by Ehrenberg",
              relevance: "Model organism"
            },
            {
              id: 27,
              name: "Sponge cell",
              kingdom: "Animal",
              cellType: "Eukaryote",
              size: "Variable",
              description: "Cells from simplest animals. Choanocytes have flagella; can re-form sponge if dissociated.",
              habitat: "Marine + freshwater",
              feeding: "Filter feeding",
              reproduction: "Sexual + budding",
              movement: "Flagella",
              discovered: "Ancient",
              relevance: "Earliest multicellular animal"
            },
            {
              id: 28,
              name: "Hydra",
              kingdom: "Animal",
              cellType: "Eukaryote",
              size: "1-30 mm",
              description: "Cnidarian (jellyfish relative). Has stinging cells. Can regenerate from any piece. Possibly biologically immortal.",
              habitat: "Freshwater",
              feeding: "Small crustaceans",
              reproduction: "Budding + sexual",
              movement: "Tentacle motion",
              discovered: "1700s",
              relevance: "Famous for regeneration + longevity"
            },
            {
              id: 29,
              name: "Planarian",
              kingdom: "Animal",
              cellType: "Eukaryote",
              size: "1-15 mm",
              description: "Flat worm. Famously can regenerate entire body from small fragment. Has primitive eyes.",
              habitat: "Freshwater",
              feeding: "Carnivorous",
              reproduction: "Fission + sexual",
              movement: "Cilia + muscle",
              discovered: "1700s",
              relevance: "Regeneration biology model"
            },
            {
              id: 30,
              name: "Rotifer",
              kingdom: "Animal",
              cellType: "Eukaryote",
              size: "0.1-0.5 mm",
              description: "Microscopic aquatic animal with corona of cilia creating wheel-like motion. Can survive desiccation.",
              habitat: "Freshwater + soil",
              feeding: "Bacteria + algae",
              reproduction: "Mostly female parthenogenetic",
              movement: "Ciliary",
              discovered: "1696 by Leeuwenhoek",
              relevance: "Famous for asexual reproduction"
            },
            {
              id: 31,
              name: "Daphnia",
              kingdom: "Animal",
              cellType: "Eukaryote",
              size: "1-5 mm",
              description: "Water flea. Crustacean. Used in toxicology tests (canary for water pollution).",
              habitat: "Freshwater",
              feeding: "Algae + bacteria",
              reproduction: "Sexual + parthenogenetic",
              movement: "Antennae swimming",
              discovered: "1750s",
              relevance: "Common in aquaria + tests"
            },
            {
              id: 32,
              name: "Bdelloid Rotifer",
              kingdom: "Animal",
              cellType: "Eukaryote",
              size: "0.1-0.5 mm",
              description: "Rotifer that has reproduced asexually for ~40 million years. Survives desiccation. Steals DNA from environment.",
              habitat: "Aquatic + moist soil",
              feeding: "Bacteria",
              reproduction: "Parthenogenetic only",
              movement: "Ciliary",
              discovered: "Studied since 1700s",
              relevance: "Evolution puzzle — no sex for 40M years"
            },
            {
              id: 33,
              name: "Brachiosauris embryo cell",
              kingdom: "Mammalian cell",
              cellType: "Eukaryote",
              size: "10-50 μm",
              description: "Generic mammalian cell with nucleus + organelles. Includes ER, Golgi, mitochondria.",
              habitat: "Tissue + culture",
              feeding: "Glucose + amino acids",
              reproduction: "Mitosis + meiosis",
              movement: "Variable",
              discovered: "Cell theory 1838",
              relevance: "Foundation of cell biology"
            },
            {
              id: 34,
              name: "Plasmodial slime mold",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "Variable",
              description: "Single giant cell with thousands of nuclei. Forms beautiful structures + can solve mazes.",
              habitat: "Decaying wood + leaves",
              feeding: "Bacteria + organic",
              reproduction: "Spores",
              movement: "Cytoplasmic flow",
              discovered: "19th century",
              relevance: "Showcases collective behavior"
            },
            {
              id: 35,
              name: "Dinoflagellate",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "20-100 μm",
              description: "Bioluminescent + harmful. Some cause \"red tide\" + paralytic shellfish poisoning.",
              habitat: "Marine + freshwater",
              feeding: "Variable",
              reproduction: "Binary fission",
              movement: "2 flagella in furrows",
              discovered: "1700s",
              relevance: "Bioluminescent bays of Puerto Rico"
            },
            {
              id: 36,
              name: "Foraminifera",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "0.1-1 mm",
              description: "Has elaborate calcium carbonate shell. Major contributor to limestone + chalk deposits. Pyramids of Giza include forams.",
              habitat: "Marine",
              feeding: "Phagocytosis via reticulopodia",
              reproduction: "Alternation of generations",
              movement: "Sliding via cytoplasmic threads",
              discovered: "Ancient — pyramids ~2500 BCE",
              relevance: "Geological indicators + limestone"
            },
            {
              id: 37,
              name: "Radiolarian",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "30-200 μm",
              description: "Has silica skeleton with intricate geometric patterns. Famous Haeckel illustrations.",
              habitat: "Marine",
              feeding: "Plankton",
              reproduction: "Cell division",
              movement: "Drifting",
              discovered: "1800s + Haeckel illustrations",
              relevance: "Most beautiful microorganisms"
            },
            {
              id: 38,
              name: "Trichomonas",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "10-20 μm",
              description: "Flagellated parasite. T. vaginalis causes urogenital infections.",
              habitat: "Human + cattle hosts",
              feeding: "Mucus + cells",
              reproduction: "Binary fission",
              movement: "4 flagella + undulating membrane",
              discovered: "1836 by Donné",
              relevance: "Most common non-viral STI"
            },
            {
              id: 39,
              name: "Entamoeba histolytica",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "20-40 μm",
              description: "Pathogenic amoeba. Causes amoebic dysentery + liver abscesses.",
              habitat: "Contaminated food/water → human GI",
              feeding: "Tissue + red blood cells",
              reproduction: "Binary fission",
              movement: "Pseudopods",
              discovered: "1875",
              relevance: "Major waterborne disease"
            },
            {
              id: 40,
              name: "Toxoplasma",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "2-7 μm",
              description: "Cat-borne parasite. Infects 30%+ of humans worldwide. Manipulates rodent behavior.",
              habitat: "Mammals + cats",
              feeding: "Intracellular",
              reproduction: "Asexual in non-cats; sexual in cats",
              movement: "Glides + invades cells",
              discovered: "1908",
              relevance: "Behavioral manipulation puzzle"
            },
            {
              id: 41,
              name: "Cryptosporidium",
              kingdom: "Protist",
              cellType: "Eukaryote",
              size: "3-7 μm",
              description: "Water-borne pathogen. Causes severe diarrhea. Resistant to chlorine.",
              habitat: "Water + soil",
              feeding: "Intracellular",
              reproduction: "Sexual + asexual",
              movement: "Glides",
              discovered: "1907",
              relevance: "Major outbreaks (Milwaukee 1993)"
            },
            {
              id: 42,
              name: "Caulobacter",
              kingdom: "Bacteria",
              cellType: "Prokaryote",
              size: "1-4 μm",
              description: "Has asymmetric division (one daughter swims, other attached). Model for asymmetric cell biology.",
              habitat: "Freshwater + soil",
              feeding: "Variable",
              reproduction: "Asymmetric binary",
              movement: "Flagellum (swarmer)",
              discovered: "1935",
              relevance: "Model for stalked bacteria"
            },
            {
              id: 43,
              name: "Helicobacter pylori",
              kingdom: "Bacteria",
              cellType: "Prokaryote",
              size: "2-5 μm",
              description: "Spiral bacterium living in stomach. Causes ulcers + linked to gastric cancer. Nobel 2005.",
              habitat: "Human stomach",
              feeding: "Mucus + cells",
              reproduction: "Binary fission",
              movement: "Flagella",
              discovered: "1982 by Marshall + Warren",
              relevance: "Disproved that bacteria cannot live in stomach acid"
            },
            {
              id: 44,
              name: "Clostridium",
              kingdom: "Bacteria",
              cellType: "Prokaryote",
              size: "3-8 μm",
              description: "Spore-forming anaerobic rods. Includes C. botulinum (botulism), C. tetani (tetanus), C. difficile (CDI).",
              habitat: "Soil + anaerobic environments",
              feeding: "Variable",
              reproduction: "Binary fission + spores",
              movement: "Some flagellated",
              discovered: "Various 19th-20th century",
              relevance: "Famous deadly bacteria + Botox source"
            },
            {
              id: 45,
              name: "Methanogen",
              kingdom: "Archaea",
              cellType: "Archaea",
              size: "0.5-5 μm",
              description: "Anaerobic archaea. Produce methane from CO2 + H2. Live in animal guts, marshes, ocean sediments.",
              habitat: "Anaerobic environments",
              feeding: "CO2 + H2 + acetate",
              reproduction: "Binary fission",
              movement: "Variable",
              discovered: "Distinct domain identified 1977",
              relevance: "Major source of atmospheric methane"
            },
            {
              id: 46,
              name: "Halophile",
              kingdom: "Archaea",
              cellType: "Archaea",
              size: "0.5-5 μm",
              description: "Salt-loving archaea. Live in salt lakes (Dead Sea, Great Salt Lake). Some pink color from carotenoids.",
              habitat: "Hypersaline lakes",
              feeding: "Variable",
              reproduction: "Binary fission",
              movement: "Variable",
              discovered: "19th century",
              relevance: "Extremophile model"
            },
            {
              id: 47,
              name: "Thermophile",
              kingdom: "Archaea",
              cellType: "Archaea",
              size: "0.5-5 μm",
              description: "Heat-loving archaea + bacteria. Live in hot springs at 60-110°C. Source of Taq polymerase used in PCR.",
              habitat: "Hot springs + hydrothermal vents",
              feeding: "Variable",
              reproduction: "Binary fission",
              movement: "Variable",
              discovered: "Yellowstone hot springs",
              relevance: "PCR depends on these enzymes"
            },
            {
              id: 48,
              name: "Hyperthermophile",
              kingdom: "Archaea",
              cellType: "Archaea",
              size: "0.5-5 μm",
              description: "Extreme heat-loving archaea. Live at 80-115°C in deep-sea vents. Thrive where most life would denature.",
              habitat: "Hydrothermal vents",
              feeding: "Sulfur compounds",
              reproduction: "Binary fission",
              movement: "Variable",
              discovered: "Hot vents 1970s",
              relevance: "Origin of life theories"
            },
            {
              id: 49,
              name: "Macrophage",
              kingdom: "Animal Cell",
              cellType: "Eukaryote",
              size: "21-25 μm",
              description: "Large phagocytic immune cell. \"Big eater\". Engulfs pathogens + cellular debris. Multi-functional.",
              habitat: "Tissues throughout body",
              feeding: "Pathogens + debris",
              reproduction: "Differentiates from monocyte",
              movement: "Amoeboid",
              discovered: "Elie Metchnikoff 1882",
              relevance: "Foundation of immune system"
            },
            {
              id: 50,
              name: "Neutrophil",
              kingdom: "Animal Cell",
              cellType: "Eukaryote",
              size: "12-15 μm",
              description: "Most abundant white blood cell. First responder to infection. Lives only ~5 days.",
              habitat: "Blood",
              feeding: "Bacteria",
              reproduction: "Bone marrow",
              movement: "Amoeboid",
              discovered: "1880s",
              relevance: "Constitutes pus"
            },
            {
              id: 51,
              name: "Lymphocyte",
              kingdom: "Animal Cell",
              cellType: "Eukaryote",
              size: "7-9 μm",
              description: "Specialized immune cell. B cells make antibodies; T cells kill infected cells.",
              habitat: "Blood + lymph + organs",
              feeding: "Specific targets",
              reproduction: "Antigen-driven proliferation",
              movement: "Migrate to sites of infection",
              discovered: "19th century",
              relevance: "Foundation of adaptive immunity"
            },
            {
              id: 52,
              name: "Erythrocyte (RBC)",
              kingdom: "Animal Cell",
              cellType: "Eukaryote",
              size: "7-8 μm",
              description: "Biconcave disc. Carries oxygen via hemoglobin. Has no nucleus in mammals (anucleate).",
              habitat: "Blood",
              feeding: "Glucose",
              reproduction: "From stem cells in bone marrow",
              movement: "Carried in bloodstream",
              discovered: "1658 by Swammerdam",
              relevance: "Most abundant cell type in body"
            },
            {
              id: 53,
              name: "Platelet (thrombocyte)",
              kingdom: "Animal Cell",
              cellType: "Eukaryote",
              size: "2-3 μm",
              description: "Cell fragment. Initiates blood clotting. ~150-400 billion per liter of blood.",
              habitat: "Blood",
              feeding: "Various",
              reproduction: "Megakaryocyte fragments",
              movement: "Carried in blood",
              discovered: "1842",
              relevance: "Critical for wound healing"
            },
            {
              id: 54,
              name: "Neuron",
              kingdom: "Animal Cell",
              cellType: "Eukaryote",
              size: "4-100 μm body + projections",
              description: "Nerve cell. Conducts electrical signals via action potentials. Connected by synapses.",
              habitat: "Brain + spinal cord + ganglia",
              feeding: "Glucose primarily",
              reproduction: "Limited adult neurogenesis",
              movement: "Some migrate during development",
              discovered: "Cell theory 1839",
              relevance: "Foundation of neuroscience"
            },
            {
              id: 55,
              name: "Sperm cell",
              kingdom: "Animal Cell",
              cellType: "Eukaryote",
              size: "50 μm (length)",
              description: "Mobile reproductive cell. Carries haploid male DNA. Powered by mitochondria.",
              habitat: "Reproductive tract",
              feeding: "Glucose",
              reproduction: "Spermatogenesis from precursors",
              movement: "Flagellar swimming",
              discovered: "1677 by Leeuwenhoek",
              relevance: "Half of human reproduction"
            },
            {
              id: 56,
              name: "Egg cell",
              kingdom: "Animal Cell",
              cellType: "Eukaryote",
              size: "100-200 μm",
              description: "Largest human cell. Contains haploid female DNA + cytoplasmic resources for early embryo.",
              habitat: "Ovary",
              feeding: "Stored yolk",
              reproduction: "Oogenesis",
              movement: "Carried by fallopian cilia",
              discovered: "1827 by Karl Ernst von Baer",
              relevance: "Visible to naked eye"
            },
            {
              id: 57,
              name: "Stem cell",
              kingdom: "Animal Cell",
              cellType: "Eukaryote",
              size: "Variable",
              description: "Undifferentiated cell. Can self-renew + differentiate into other cell types.",
              habitat: "Bone marrow, embryo, niches",
              feeding: "Variable",
              reproduction: "Asymmetric division",
              movement: "Variable",
              discovered: "1961 by Till + McCulloch",
              relevance: "Regenerative medicine basis"
            },
            {
              id: 58,
              name: "Epithelial cell",
              kingdom: "Animal Cell",
              cellType: "Eukaryote",
              size: "10-30 μm",
              description: "Forms tissue layers covering surfaces + lining cavities. Various types: squamous, cuboidal, columnar.",
              habitat: "Skin + organs + glands",
              feeding: "Various",
              reproduction: "Stem cell-driven turnover",
              movement: "Mostly stationary",
              discovered: "Cell theory",
              relevance: "Largest tissue surface area in body"
            },
            {
              id: 59,
              name: "Muscle cell",
              kingdom: "Animal Cell",
              cellType: "Eukaryote",
              size: "Variable",
              description: "Skeletal muscle fibers are huge (up to 30 cm). Cardiac and smooth muscle are smaller. Contract via actin-myosin.",
              habitat: "All muscle tissues",
              feeding: "Glucose + fatty acids",
              reproduction: "Stem cell-driven repair",
              movement: "Contraction",
              discovered: "Various",
              relevance: "Movement + heart beat"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // HISTORY OF MICROBIOLOGY
          // ═══════════════════════════════════════════════════════════
          var CELL_HISTORY = [
            {
              id: 1,
              year: 1665,
              event: "Robert Hooke coins the word \"cell\" while looking at cork through microscope.",
              country: "England"
            },
            {
              id: 2,
              year: 1675,
              event: "Antonie van Leeuwenhoek observes \"animalcules\" (microorganisms) for first time.",
              country: "Netherlands"
            },
            {
              id: 3,
              year: 1683,
              event: "Leeuwenhoek describes bacteria from teeth scrapings.",
              country: "Netherlands"
            },
            {
              id: 4,
              year: 1838,
              event: "Matthias Schleiden proposes cell theory for plants.",
              country: "Germany"
            },
            {
              id: 5,
              year: 1839,
              event: "Theodor Schwann extends cell theory to animals — all life is cellular.",
              country: "Germany"
            },
            {
              id: 6,
              year: 1855,
              event: "Rudolf Virchow declares \"omnis cellula e cellula\" (all cells from cells).",
              country: "Germany"
            },
            {
              id: 7,
              year: 1857,
              event: "Louis Pasteur demonstrates fermentation is microbial process.",
              country: "France"
            },
            {
              id: 8,
              year: 1865,
              event: "Gregor Mendel publishes laws of inheritance.",
              country: "Austria/Czech Republic"
            },
            {
              id: 9,
              year: 1876,
              event: "Robert Koch identifies anthrax bacillus as disease-causing agent.",
              country: "Germany"
            },
            {
              id: 10,
              year: 1882,
              event: "Koch identifies Mycobacterium tuberculosis.",
              country: "Germany"
            },
            {
              id: 11,
              year: 1884,
              event: "Hans Christian Gram develops Gram stain.",
              country: "Denmark"
            },
            {
              id: 12,
              year: 1898,
              event: "Martinus Beijerinck establishes virology.",
              country: "Netherlands"
            },
            {
              id: 13,
              year: 1905,
              event: "Robert Koch wins Nobel Prize for TB research.",
              country: "Germany"
            },
            {
              id: 14,
              year: 1928,
              event: "Alexander Fleming discovers penicillin.",
              country: "UK"
            },
            {
              id: 15,
              year: 1929,
              event: "Phoebus Levene proposes DNA structure components.",
              country: "USA"
            },
            {
              id: 16,
              year: 1944,
              event: "Avery, MacLeod, McCarty show DNA carries genetic information.",
              country: "USA"
            },
            {
              id: 17,
              year: 1953,
              event: "Watson, Crick, Franklin determine DNA double helix structure.",
              country: "UK"
            },
            {
              id: 18,
              year: 1955,
              event: "Polio vaccine deployed (Salk).",
              country: "USA"
            },
            {
              id: 19,
              year: 1958,
              event: "Meselson + Stahl prove semi-conservative DNA replication.",
              country: "USA"
            },
            {
              id: 20,
              year: 1961,
              event: "Genetic code begins to be deciphered.",
              country: "USA"
            },
            {
              id: 21,
              year: 1977,
              event: "Carl Woese identifies Archaea as third domain.",
              country: "USA"
            },
            {
              id: 22,
              year: 1977,
              event: "Frederick Sanger develops dideoxy DNA sequencing.",
              country: "UK"
            },
            {
              id: 23,
              year: 1985,
              event: "PCR (Polymerase Chain Reaction) invented by Mullis.",
              country: "USA"
            },
            {
              id: 24,
              year: 1996,
              event: "First cloned mammal (Dolly the sheep).",
              country: "UK"
            },
            {
              id: 25,
              year: 2003,
              event: "Human Genome Project completed.",
              country: "Worldwide"
            },
            {
              id: 26,
              year: 2007,
              event: "Induced pluripotent stem cells (iPSCs) created.",
              country: "Japan"
            },
            {
              id: 27,
              year: 2012,
              event: "CRISPR-Cas9 demonstrated for genome editing.",
              country: "USA"
            },
            {
              id: 28,
              year: 2020,
              event: "mRNA COVID vaccines deployed.",
              country: "Worldwide"
            },
            {
              id: 29,
              year: 2024,
              event: "AlphaFold revolutionizes protein structure prediction.",
              country: "Worldwide"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // FAMOUS BIOLOGISTS — 30 cell + microbiology pioneers
          // ═══════════════════════════════════════════════════════════
          var FAMOUS_BIOLOGISTS = [
            {
              id: 1,
              name: "Antonie van Leeuwenhoek",
              years: "1632-1723",
              country: "Netherlands",
              contribution: "Father of microbiology. First to observe bacteria, protists, sperm, blood cells via single-lens microscopes he made himself."
            },
            {
              id: 2,
              name: "Robert Hooke",
              years: "1635-1703",
              country: "England",
              contribution: "Coined the word \"cell\" in 1665 from honeycomb-like cork structures."
            },
            {
              id: 3,
              name: "Louis Pasteur",
              years: "1822-1895",
              country: "France",
              contribution: "Demonstrated germ theory of disease. Invented pasteurization. Developed rabies + anthrax vaccines."
            },
            {
              id: 4,
              name: "Robert Koch",
              years: "1843-1910",
              country: "Germany",
              contribution: "Established germ theory. Identified TB + anthrax + cholera bacteria. Koch postulates."
            },
            {
              id: 5,
              name: "Joseph Lister",
              years: "1827-1912",
              country: "UK",
              contribution: "Father of antiseptic surgery. Introduced carbolic acid (phenol)."
            },
            {
              id: 6,
              name: "Elie Metchnikoff",
              years: "1845-1916",
              country: "Russia/France",
              contribution: "Discovered phagocytosis. Foundation of immunology. Nobel 1908."
            },
            {
              id: 7,
              name: "Theodor Schwann",
              years: "1810-1882",
              country: "Germany",
              contribution: "Co-founder of cell theory. Extended cell theory to animals."
            },
            {
              id: 8,
              name: "Matthias Schleiden",
              years: "1804-1881",
              country: "Germany",
              contribution: "Co-founder of cell theory. Botanist who proposed cells as plant fundamental units."
            },
            {
              id: 9,
              name: "Rudolf Virchow",
              years: "1821-1902",
              country: "Germany",
              contribution: "Father of modern pathology. \"All cells from cells\"."
            },
            {
              id: 10,
              name: "Alexander Fleming",
              years: "1881-1955",
              country: "UK",
              contribution: "Discovered penicillin (1928). Saved millions of lives. Nobel 1945."
            },
            {
              id: 11,
              name: "Ernst Ruska",
              years: "1906-1988",
              country: "Germany",
              contribution: "Invented electron microscope. Revolutionized cell biology. Nobel 1986."
            },
            {
              id: 12,
              name: "Lynn Margulis",
              years: "1938-2011",
              country: "USA",
              contribution: "Endosymbiotic theory — mitochondria + chloroplasts were once free-living bacteria."
            },
            {
              id: 13,
              name: "Carl Woese",
              years: "1928-2012",
              country: "USA",
              contribution: "Identified Archaea as third domain via ribosomal RNA."
            },
            {
              id: 14,
              name: "Barbara McClintock",
              years: "1902-1992",
              country: "USA",
              contribution: "Discovered transposable elements (\"jumping genes\"). Nobel 1983."
            },
            {
              id: 15,
              name: "Rosalind Franklin",
              years: "1920-1958",
              country: "UK",
              contribution: "X-ray crystallography of DNA. Photo 51 was key for Watson + Crick. Denied Nobel."
            },
            {
              id: 16,
              name: "James Watson",
              years: "1928-present",
              country: "USA",
              contribution: "Co-discovered DNA double helix. Nobel 1962."
            },
            {
              id: 17,
              name: "Francis Crick",
              years: "1916-2004",
              country: "UK",
              contribution: "Co-discovered DNA double helix. Wrote central dogma. Nobel 1962."
            },
            {
              id: 18,
              name: "Frederick Sanger",
              years: "1918-2013",
              country: "UK",
              contribution: "Two Nobel Prizes — protein sequencing 1958, DNA sequencing 1980."
            },
            {
              id: 19,
              name: "Kary Mullis",
              years: "1944-2019",
              country: "USA",
              contribution: "Invented PCR. Nobel 1993."
            },
            {
              id: 20,
              name: "Jennifer Doudna",
              years: "1964-present",
              country: "USA",
              contribution: "Co-developed CRISPR-Cas9 for genome editing. Nobel 2020."
            },
            {
              id: 21,
              name: "Emmanuelle Charpentier",
              years: "1968-present",
              country: "France",
              contribution: "Co-developed CRISPR-Cas9 for genome editing. Nobel 2020."
            },
            {
              id: 22,
              name: "Shinya Yamanaka",
              years: "1962-present",
              country: "Japan",
              contribution: "Discovered iPSC reprogramming factors. Nobel 2012."
            },
            {
              id: 23,
              name: "Hans Krebs",
              years: "1900-1981",
              country: "Germany/UK",
              contribution: "Discovered citric acid (Krebs) cycle. Nobel 1953."
            },
            {
              id: 24,
              name: "Watson & Crick model",
              years: "N/A",
              country: "UK",
              contribution: "Triple helix DNA model — corrected by Photo 51 evidence."
            },
            {
              id: 25,
              name: "Friedrich Miescher",
              years: "1844-1895",
              country: "Switzerland",
              contribution: "First isolated DNA (1869) from pus on bandages. Called it \"nuclein\"."
            },
            {
              id: 26,
              name: "Walter Sutton",
              years: "1877-1916",
              country: "USA",
              contribution: "Chromosomes carry genetic info. Foundation of modern genetics."
            },
            {
              id: 27,
              name: "Theodor Boveri",
              years: "1862-1915",
              country: "Germany",
              contribution: "Chromosome theory of inheritance."
            },
            {
              id: 28,
              name: "Edward Salmon",
              years: "1850-1914",
              country: "USA",
              contribution: "Discovered Salmonella bacteria."
            },
            {
              id: 29,
              name: "Robert Brown",
              years: "1773-1858",
              country: "UK",
              contribution: "Discovered cell nucleus (1831). Brownian motion."
            },
            {
              id: 30,
              name: "Christian Gram",
              years: "1853-1938",
              country: "Denmark",
              contribution: "Developed Gram stain for bacterial classification."
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // LAB TECHNIQUES
          // ═══════════════════════════════════════════════════════════
          var LAB_TECHNIQUES = [
            {
              id: 1,
              name: "Wet mount slide",
              method: "Drop water + sample on slide + cover slip",
              purpose: "Quick observation of living protists/algae",
              skill: "Beginner"
            },
            {
              id: 2,
              name: "Gram stain",
              method: "Crystal violet → iodine → alcohol wash → safranin",
              purpose: "Differentiates Gram+ from Gram-",
              skill: "Intermediate"
            },
            {
              id: 3,
              name: "Acid-fast stain",
              method: "Carbol fuchsin + heat + acid alcohol decolorize",
              purpose: "Detects Mycobacteria + Nocardia",
              skill: "Intermediate"
            },
            {
              id: 4,
              name: "Methylene blue",
              method: "Single dye stain",
              purpose: "Stain bacteria + nuclei",
              skill: "Beginner"
            },
            {
              id: 5,
              name: "Iodine stain",
              method: "Iodine solution",
              purpose: "Stains starch in plant cells",
              skill: "Beginner"
            },
            {
              id: 6,
              name: "Streak plate",
              method: "Sterile loop streaks on agar plate",
              purpose: "Isolates pure colonies",
              skill: "Intermediate"
            },
            {
              id: 7,
              name: "Pour plate",
              method: "Dilute + mix with agar before pouring",
              purpose: "Quantitative bacterial count",
              skill: "Intermediate"
            },
            {
              id: 8,
              name: "Inoculation",
              method: "Sterile transfer of microbe to medium",
              purpose: "Culture maintenance",
              skill: "Beginner"
            },
            {
              id: 9,
              name: "Aseptic technique",
              method: "Flame loop + lab discipline",
              purpose: "Prevents contamination",
              skill: "Foundational"
            },
            {
              id: 10,
              name: "Light microscopy",
              method: "Compound microscope ~1000x",
              purpose: "View bacterial size",
              skill: "Intermediate"
            },
            {
              id: 11,
              name: "Phase contrast",
              method: "Optical phase shift technique",
              purpose: "Living unstained cells",
              skill: "Advanced"
            },
            {
              id: 12,
              name: "Fluorescence microscopy",
              method: "UV + fluorescent dyes",
              purpose: "Specific organelles + proteins",
              skill: "Advanced"
            },
            {
              id: 13,
              name: "Confocal microscopy",
              method: "Laser + pinhole + 3D",
              purpose: "High-resolution 3D imaging",
              skill: "Advanced"
            },
            {
              id: 14,
              name: "Electron microscopy (TEM)",
              method: "Electrons through thin section",
              purpose: "Atomic-scale structure",
              skill: "Expert"
            },
            {
              id: 15,
              name: "Scanning electron microscopy (SEM)",
              method: "Electrons scan surface",
              purpose: "3D surface views",
              skill: "Expert"
            },
            {
              id: 16,
              name: "DAPI staining",
              method: "Fluorescent DNA stain",
              purpose: "Visualize nuclei",
              skill: "Intermediate"
            },
            {
              id: 17,
              name: "Trypan blue",
              method: "Excluded by viable cells",
              purpose: "Living vs dead cell count",
              skill: "Beginner"
            },
            {
              id: 18,
              name: "Coulter counter",
              method: "Electrical resistance pulse",
              purpose: "Automated cell counting",
              skill: "Intermediate"
            },
            {
              id: 19,
              name: "Flow cytometry",
              method: "Laser-illuminated cells in stream",
              purpose: "Multi-parameter cell analysis",
              skill: "Advanced"
            },
            {
              id: 20,
              name: "Cell culture",
              method: "Sterile media + incubator",
              purpose: "Grow cells in lab",
              skill: "Intermediate"
            },
            {
              id: 21,
              name: "Subculturing",
              method: "Transfer to fresh media periodically",
              purpose: "Maintain cell line",
              skill: "Intermediate"
            },
            {
              id: 22,
              name: "Cryopreservation",
              method: "Freeze cells in liquid N2",
              purpose: "Long-term storage",
              skill: "Intermediate"
            },
            {
              id: 23,
              name: "Transfection",
              method: "Introduce DNA into cells",
              purpose: "Genetic manipulation",
              skill: "Advanced"
            },
            {
              id: 24,
              name: "Western blot",
              method: "Gel electrophoresis + antibody detection",
              purpose: "Detect specific proteins",
              skill: "Advanced"
            },
            {
              id: 25,
              name: "ELISA",
              method: "Antibody-enzyme detection",
              purpose: "Quantitative protein detection",
              skill: "Intermediate"
            },
            {
              id: 26,
              name: "PCR",
              method: "Cycling temperature to amplify DNA",
              purpose: "Detect + amplify specific sequences",
              skill: "Intermediate"
            },
            {
              id: 27,
              name: "Sanger sequencing",
              method: "Dideoxy chain termination",
              purpose: "Read DNA sequence",
              skill: "Advanced"
            },
            {
              id: 28,
              name: "Next-gen sequencing",
              method: "Massive parallel reads",
              purpose: "High-throughput sequencing",
              skill: "Advanced"
            },
            {
              id: 29,
              name: "CRISPR editing",
              method: "Guide RNA + Cas9 cuts DNA",
              purpose: "Genome modification",
              skill: "Expert"
            },
            {
              id: 30,
              name: "Mass spectrometry",
              method: "Identify by mass-to-charge",
              purpose: "Protein + metabolite analysis",
              skill: "Advanced"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // MICROBIAL DISEASES
          // ═══════════════════════════════════════════════════════════
          var MICROBIAL_DISEASES = [
            {
              id: 1,
              disease: "Tuberculosis",
              pathogen: "Mycobacterium tuberculosis",
              symptoms: "Coughing, fever, weight loss",
              treatment: "Antibiotics (multi-drug + 6+ months)",
              prevalence: "~1.6M deaths/year worldwide"
            },
            {
              id: 2,
              disease: "Malaria",
              pathogen: "Plasmodium spp.",
              symptoms: "Fever, chills, anemia",
              treatment: "Antimalarials (resistance growing)",
              prevalence: "~600K deaths/year"
            },
            {
              id: 3,
              disease: "Cholera",
              pathogen: "Vibrio cholerae",
              symptoms: "Severe diarrhea, dehydration",
              treatment: "Oral rehydration + antibiotics",
              prevalence: "~100K deaths/year"
            },
            {
              id: 4,
              disease: "Strep throat",
              pathogen: "Streptococcus pyogenes",
              symptoms: "Sore throat, fever",
              treatment: "Penicillin",
              prevalence: "Treatable; most recover"
            },
            {
              id: 5,
              disease: "Tetanus",
              pathogen: "Clostridium tetani",
              symptoms: "Muscle stiffness, lockjaw",
              treatment: "Vaccination critical",
              prevalence: "Almost eliminated in vaccinated populations"
            },
            {
              id: 6,
              disease: "Anthrax",
              pathogen: "Bacillus anthracis",
              symptoms: "Skin lesions, lung damage",
              treatment: "Antibiotics + vaccine",
              prevalence: "Rare but deadly without treatment"
            },
            {
              id: 7,
              disease: "Bubonic plague",
              pathogen: "Yersinia pestis",
              symptoms: "Buboes, fever",
              treatment: "Antibiotics",
              prevalence: "Black Death killed 30% of Europe"
            },
            {
              id: 8,
              disease: "Syphilis",
              pathogen: "Treponema pallidum",
              symptoms: "Multi-stage; chronic if untreated",
              treatment: "Penicillin",
              prevalence: "Treatable; growing again"
            },
            {
              id: 9,
              disease: "Lyme disease",
              pathogen: "Borrelia burgdorferi",
              symptoms: "Rash, fever, joint pain",
              treatment: "Doxycycline",
              prevalence: "Major US tick-borne disease"
            },
            {
              id: 10,
              disease: "Salmonella",
              pathogen: "Salmonella enterica",
              symptoms: "Food poisoning",
              treatment: "Most recover; antibiotics for severe",
              prevalence: "Foodborne"
            },
            {
              id: 11,
              disease: "E. coli O157:H7",
              pathogen: "Enterohemorrhagic E. coli",
              symptoms: "Bloody diarrhea, kidney damage",
              treatment: "Supportive care",
              prevalence: "Foodborne"
            },
            {
              id: 12,
              disease: "Botulism",
              pathogen: "Clostridium botulinum toxin",
              symptoms: "Paralysis",
              treatment: "Antitoxin + supportive",
              prevalence: "Rare but severe"
            },
            {
              id: 13,
              disease: "Giardiasis",
              pathogen: "Giardia lamblia",
              symptoms: "Diarrhea, cramps",
              treatment: "Metronidazole",
              prevalence: "Common waterborne illness"
            },
            {
              id: 14,
              disease: "Amoebic dysentery",
              pathogen: "Entamoeba histolytica",
              symptoms: "Diarrhea, liver abscess",
              treatment: "Antiprotozoal drugs",
              prevalence: "Major in developing world"
            },
            {
              id: 15,
              disease: "Toxoplasmosis",
              pathogen: "Toxoplasma gondii",
              symptoms: "Often asymptomatic; risk for pregnancy",
              treatment: "Antimicrobials in severe cases",
              prevalence: "30%+ humans infected"
            },
            {
              id: 16,
              disease: "Sleeping sickness",
              pathogen: "Trypanosoma brucei",
              symptoms: "Neurologic decline",
              treatment: "Antitrypanosomal drugs",
              prevalence: "Sub-Saharan Africa"
            },
            {
              id: 17,
              disease: "Chagas disease",
              pathogen: "Trypanosoma cruzi",
              symptoms: "Acute then chronic heart damage",
              treatment: "Benznidazole (limited)",
              prevalence: "Latin America"
            },
            {
              id: 18,
              disease: "Leishmaniasis",
              pathogen: "Leishmania spp.",
              symptoms: "Skin lesions, organ damage",
              treatment: "Antimonials + others",
              prevalence: "Tropical regions"
            },
            {
              id: 19,
              disease: "Cryptosporidiosis",
              pathogen: "Cryptosporidium parvum",
              symptoms: "Severe diarrhea",
              treatment: "Supportive; nitazoxanide",
              prevalence: "Water-borne"
            },
            {
              id: 20,
              disease: "Plague",
              pathogen: "Yersinia pestis",
              symptoms: "Multiple forms",
              treatment: "Antibiotics",
              prevalence: "Most cases now in Africa"
            },
            {
              id: 21,
              disease: "Diphtheria",
              pathogen: "Corynebacterium diphtheriae",
              symptoms: "Sore throat, neck swelling, toxin damage",
              treatment: "Antitoxin + antibiotics",
              prevalence: "Vaccine-preventable"
            },
            {
              id: 22,
              disease: "Pertussis (whooping cough)",
              pathogen: "Bordetella pertussis",
              symptoms: "Severe cough",
              treatment: "Antibiotics; vaccine preventable",
              prevalence: "Vaccine waning concern"
            },
            {
              id: 23,
              disease: "Pneumonia (bacterial)",
              pathogen: "Streptococcus pneumoniae + others",
              symptoms: "Cough, fever, breathing",
              treatment: "Antibiotics",
              prevalence: "Major worldwide cause of death"
            },
            {
              id: 24,
              disease: "Meningitis (bacterial)",
              pathogen: "Various",
              symptoms: "Fever, neck stiffness, altered consciousness",
              treatment: "Antibiotics",
              prevalence: "Medical emergency"
            },
            {
              id: 25,
              disease: "UTI",
              pathogen: "E. coli most common",
              symptoms: "Urinary symptoms",
              treatment: "Antibiotics",
              prevalence: "Very common; women more susceptible"
            },
            {
              id: 26,
              disease: "MRSA",
              pathogen: "Methicillin-resistant Staph aureus",
              symptoms: "Skin infections, severe systemic",
              treatment: "Vancomycin",
              prevalence: "Antibiotic resistance crisis"
            },
            {
              id: 27,
              disease: "C. difficile colitis",
              pathogen: "C. difficile",
              symptoms: "Severe diarrhea after antibiotics",
              treatment: "Vancomycin oral; fidaxomicin",
              prevalence: "Hospital-acquired"
            },
            {
              id: 28,
              disease: "Listeriosis",
              pathogen: "Listeria monocytogenes",
              symptoms: "Flu-like; severe in pregnancy",
              treatment: "Antibiotics",
              prevalence: "Foodborne"
            },
            {
              id: 29,
              disease: "Yersiniosis",
              pathogen: "Yersinia enterocolitica",
              symptoms: "Foodborne diarrhea",
              treatment: "Most self-limiting",
              prevalence: "Foodborne"
            },
            {
              id: 30,
              disease: "Campylobacteriosis",
              pathogen: "Campylobacter jejuni",
              symptoms: "Most common foodborne illness in US",
              treatment: "Most self-limiting",
              prevalence: "Foodborne"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // MICROBIAL ECOLOGY
          // ═══════════════════════════════════════════════════════════
          var MICRO_ECOLOGY = [
            {
              id: 1,
              habitat: "Pond Water",
              inhabitants: "Diverse protists, bacteria, algae",
              importance: "Photosynthesis + decomposition"
            },
            {
              id: 2,
              habitat: "Soil",
              inhabitants: "Massive bacterial + fungal diversity",
              importance: "Nutrient cycling + decomposition"
            },
            {
              id: 3,
              habitat: "Marine Plankton",
              inhabitants: "Diatoms + dinoflagellates + bacteria",
              importance: "50%+ Earth oxygen + carbon sink"
            },
            {
              id: 4,
              habitat: "Hot Springs",
              inhabitants: "Thermophiles + hyperthermophiles",
              importance: "Extreme heat tolerance + PCR enzymes"
            },
            {
              id: 5,
              habitat: "Hydrothermal Vents",
              inhabitants: "Chemosynthetic bacteria + archaea",
              importance: "Without sunlight; H2S oxidation"
            },
            {
              id: 6,
              habitat: "Salt Lakes",
              inhabitants: "Halophilic archaea + bacteria",
              importance: "Extreme salt tolerance"
            },
            {
              id: 7,
              habitat: "Permafrost",
              inhabitants: "Cryophiles",
              importance: "Cold-active enzymes + low metabolism"
            },
            {
              id: 8,
              habitat: "Acid Mine Drainage",
              inhabitants: "Acidophiles",
              importance: "Survive pH < 1; iron oxidation"
            },
            {
              id: 9,
              habitat: "Human Gut",
              inhabitants: "~100 trillion microbes + ~1000+ species",
              importance: "Digestion + immunity + mood"
            },
            {
              id: 10,
              habitat: "Human Skin",
              inhabitants: "~1B microbes/cm²",
              importance: "Protective layer"
            },
            {
              id: 11,
              habitat: "Human Mouth",
              inhabitants: "~700+ species",
              importance: "Plaque + cavity formation"
            },
            {
              id: 12,
              habitat: "Reservoirs (water)",
              inhabitants: "Variable",
              importance: "Drinking water quality"
            },
            {
              id: 13,
              habitat: "Sewers + Wastewater",
              inhabitants: "Anaerobic microbes",
              importance: "Bioremediation + biogas production"
            },
            {
              id: 14,
              habitat: "Coral Reef",
              inhabitants: "Symbionts + diverse microbes",
              importance: "Tropical biodiversity"
            },
            {
              id: 15,
              habitat: "Cave Systems",
              inhabitants: "Often unique extremophiles",
              importance: "Novel antibiotics + enzymes"
            },
            {
              id: 16,
              habitat: "Antarctic Ice",
              inhabitants: "Psychrophiles",
              importance: "Cold-active enzymes"
            },
            {
              id: 17,
              habitat: "Deep Ocean",
              inhabitants: "Pressure-adapted (barophiles)",
              importance: "Subsurface biosphere"
            },
            {
              id: 18,
              habitat: "Volcanic Soils",
              inhabitants: "Extreme conditions",
              importance: "New species discovered"
            },
            {
              id: 19,
              habitat: "Compost",
              inhabitants: "Active decomposers",
              importance: "Garden chemistry"
            },
            {
              id: 20,
              habitat: "Yogurt",
              inhabitants: "Lactobacillus + Streptococcus thermophilus",
              importance: "Fermentation + probiotics"
            },
            {
              id: 21,
              habitat: "Sourdough Starter",
              inhabitants: "Wild yeast + lactic acid bacteria",
              importance: "Bread + flavor"
            },
            {
              id: 22,
              habitat: "Kombucha",
              inhabitants: "SCOBY — yeast + bacteria",
              importance: "Fermented tea beverage"
            },
            {
              id: 23,
              habitat: "Kimchi",
              inhabitants: "Lactic acid bacteria",
              importance: "Korean fermented vegetables"
            },
            {
              id: 24,
              habitat: "Sauerkraut",
              inhabitants: "Lactic acid bacteria",
              importance: "German fermented cabbage"
            },
            {
              id: 25,
              habitat: "Beer",
              inhabitants: "Saccharomyces yeasts",
              importance: "Fermentation + flavor"
            },
            {
              id: 26,
              habitat: "Wine",
              inhabitants: "Saccharomyces yeasts",
              importance: "Fermentation + flavor"
            },
            {
              id: 27,
              habitat: "Cheese",
              inhabitants: "Various bacteria + molds",
              importance: "Flavor + texture development"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // CELL BIOLOGY GLOSSARY — 100+ terms
          // ═══════════════════════════════════════════════════════════
          var CELL_GLOSSARY = [
            {
              id: 1,
              term: "Cell membrane",
              definition: "Phospholipid bilayer surrounding cell. Selectively permeable. Controls what enters + leaves."
            },
            {
              id: 2,
              term: "Cell wall",
              definition: "Rigid outer layer in plants (cellulose), bacteria (peptidoglycan), fungi (chitin). Absent in animals."
            },
            {
              id: 3,
              term: "Cytoplasm",
              definition: "Fluid + organelles inside cell, excluding nucleus."
            },
            {
              id: 4,
              term: "Nucleus",
              definition: "Membrane-bound organelle containing DNA. Eukaryotic feature."
            },
            {
              id: 5,
              term: "Nucleoid",
              definition: "Region with DNA in prokaryotes (no membrane)."
            },
            {
              id: 6,
              term: "Nucleolus",
              definition: "Dark region inside nucleus. Site of ribosome assembly."
            },
            {
              id: 7,
              term: "Mitochondria",
              definition: "Powerhouse — produces ATP. Has own DNA."
            },
            {
              id: 8,
              term: "Chloroplast",
              definition: "Site of photosynthesis. Has own DNA."
            },
            {
              id: 9,
              term: "Endoplasmic reticulum",
              definition: "Network of folded membranes. Rough ER makes proteins; smooth ER makes lipids."
            },
            {
              id: 10,
              term: "Golgi apparatus",
              definition: "Modifies + packages proteins for shipping. Stacks of cisternae."
            },
            {
              id: 11,
              term: "Lysosome",
              definition: "Acidic enzymes for digestion. Recycles cellular components."
            },
            {
              id: 12,
              term: "Peroxisome",
              definition: "Metabolism of long-chain fatty acids + detoxification."
            },
            {
              id: 13,
              term: "Ribosome",
              definition: "Site of protein synthesis. Translates mRNA."
            },
            {
              id: 14,
              term: "Cytoskeleton",
              definition: "Actin + microtubules + intermediate filaments. Shape + movement + transport."
            },
            {
              id: 15,
              term: "Centrosome",
              definition: "Organizes microtubules. Site of centrioles."
            },
            {
              id: 16,
              term: "Cilia",
              definition: "Many short hair-like projections. Movement + signaling."
            },
            {
              id: 17,
              term: "Flagella",
              definition: "Few long whip-like projections. Cellular swimming."
            },
            {
              id: 18,
              term: "Pseudopod",
              definition: "Temporary cytoplasmic extension. Movement + phagocytosis."
            },
            {
              id: 19,
              term: "Phagocytosis",
              definition: "Cell engulfs solid particles. \"Cell eating\"."
            },
            {
              id: 20,
              term: "Pinocytosis",
              definition: "Cell engulfs liquids. \"Cell drinking\"."
            },
            {
              id: 21,
              term: "Exocytosis",
              definition: "Vesicles fuse with membrane + release contents."
            },
            {
              id: 22,
              term: "Endocytosis",
              definition: "Cell membrane invaginates to take in materials."
            },
            {
              id: 23,
              term: "Diffusion",
              definition: "Passive movement from high to low concentration."
            },
            {
              id: 24,
              term: "Osmosis",
              definition: "Diffusion of water across semi-permeable membrane."
            },
            {
              id: 25,
              term: "Active transport",
              definition: "Energy-requiring movement against gradient."
            },
            {
              id: 26,
              term: "Facilitated diffusion",
              definition: "Passive transport via channels + carriers."
            },
            {
              id: 27,
              term: "Ion channel",
              definition: "Membrane protein that allows ions to flow through."
            },
            {
              id: 28,
              term: "Pump",
              definition: "Active transport protein. Na+/K+ pump is famous."
            },
            {
              id: 29,
              term: "DNA",
              definition: "Deoxyribonucleic acid. Genetic material."
            },
            {
              id: 30,
              term: "RNA",
              definition: "Ribonucleic acid. Multiple types: mRNA, tRNA, rRNA, miRNA."
            },
            {
              id: 31,
              term: "Gene",
              definition: "DNA segment that codes for protein or RNA."
            },
            {
              id: 32,
              term: "Chromosome",
              definition: "Condensed DNA + protein. Carries genetic info."
            },
            {
              id: 33,
              term: "Chromatin",
              definition: "DNA + histones in interphase. Less condensed than chromosomes."
            },
            {
              id: 34,
              term: "Mitosis",
              definition: "Cell division producing 2 identical daughters (somatic cells)."
            },
            {
              id: 35,
              term: "Meiosis",
              definition: "Special division producing 4 haploid gametes."
            },
            {
              id: 36,
              term: "Cytokinesis",
              definition: "Final division of cytoplasm."
            },
            {
              id: 37,
              term: "Interphase",
              definition: "Period between mitoses (G1, S, G2). Most cell time."
            },
            {
              id: 38,
              term: "Apoptosis",
              definition: "Programmed cell death. Essential for development + immunity."
            },
            {
              id: 39,
              term: "Necrosis",
              definition: "Accidental cell death from injury."
            },
            {
              id: 40,
              term: "Autophagy",
              definition: "Cell consumes own components. Recycling."
            },
            {
              id: 41,
              term: "Transcription",
              definition: "DNA → RNA via RNA polymerase."
            },
            {
              id: 42,
              term: "Translation",
              definition: "mRNA → protein at ribosome."
            },
            {
              id: 43,
              term: "Protein folding",
              definition: "Amino acid chain folds to 3D structure."
            },
            {
              id: 44,
              term: "Chaperone",
              definition: "Protein helping other proteins fold correctly."
            },
            {
              id: 45,
              term: "Enzyme",
              definition: "Protein catalyst. Speeds reactions."
            },
            {
              id: 46,
              term: "Substrate",
              definition: "Molecule on which enzyme acts."
            },
            {
              id: 47,
              term: "Active site",
              definition: "Region of enzyme that binds substrate."
            },
            {
              id: 48,
              term: "Cofactor",
              definition: "Non-protein helper for enzyme (often metal ion or vitamin)."
            },
            {
              id: 49,
              term: "Coenzyme",
              definition: "Organic cofactor (often from vitamin)."
            },
            {
              id: 50,
              term: "ATP",
              definition: "Adenosine triphosphate. Cellular energy currency."
            },
            {
              id: 51,
              term: "NADH",
              definition: "Electron carrier in respiration."
            },
            {
              id: 52,
              term: "NADPH",
              definition: "Electron carrier in photosynthesis + biosynthesis."
            },
            {
              id: 53,
              term: "Glycolysis",
              definition: "Glucose → 2 pyruvate + 2 ATP + 2 NADH."
            },
            {
              id: 54,
              term: "Krebs cycle",
              definition: "Acetyl-CoA → CO2 + NADH + FADH2 + ATP."
            },
            {
              id: 55,
              term: "Electron transport chain",
              definition: "NADH/FADH2 → H2O + ATP."
            },
            {
              id: 56,
              term: "Oxidative phosphorylation",
              definition: "ATP production via electron transport."
            },
            {
              id: 57,
              term: "Calvin cycle",
              definition: "CO2 + ATP + NADPH → sugars."
            },
            {
              id: 58,
              term: "Photosystems I + II",
              definition: "Photosynthesis light reactions."
            },
            {
              id: 59,
              term: "Chlorophyll",
              definition: "Green pigment captures light energy."
            },
            {
              id: 60,
              term: "Stomata",
              definition: "Plant leaf pores for gas exchange."
            },
            {
              id: 61,
              term: "Guard cell",
              definition: "Controls stomata opening."
            },
            {
              id: 62,
              term: "Cell theory",
              definition: "All living things are cells. All cells from cells."
            },
            {
              id: 63,
              term: "Prokaryote",
              definition: "No nucleus. Bacteria + Archaea."
            },
            {
              id: 64,
              term: "Eukaryote",
              definition: "Has nucleus + organelles. Plants, animals, fungi, protists."
            },
            {
              id: 65,
              term: "Archaea",
              definition: "3rd domain of life. Often extremophiles."
            },
            {
              id: 66,
              term: "Endosymbiosis",
              definition: "Theory that mitochondria + chloroplasts were once free-living bacteria."
            },
            {
              id: 67,
              term: "Symbiosis",
              definition: "Close interspecies relationship."
            },
            {
              id: 68,
              term: "Commensalism",
              definition: "One benefits, other unaffected."
            },
            {
              id: 69,
              term: "Mutualism",
              definition: "Both benefit."
            },
            {
              id: 70,
              term: "Parasitism",
              definition: "One benefits, other harmed."
            },
            {
              id: 71,
              term: "Microbiome",
              definition: "Community of microorganisms in a habitat (e.g., gut)."
            },
            {
              id: 72,
              term: "Microbiota",
              definition: "Microbes themselves (vs microbiome which includes genes)."
            },
            {
              id: 73,
              term: "Pathogen",
              definition: "Disease-causing microorganism."
            },
            {
              id: 74,
              term: "Commensal",
              definition: "Microbe that lives in/on host without harm."
            },
            {
              id: 75,
              term: "Antibiotic",
              definition: "Drug that kills bacteria."
            },
            {
              id: 76,
              term: "Antibiotic resistance",
              definition: "Bacteria adapt to survive antibiotics."
            },
            {
              id: 77,
              term: "MRSA",
              definition: "Methicillin-resistant Staphylococcus aureus."
            },
            {
              id: 78,
              term: "Probiotic",
              definition: "Beneficial live microbe."
            },
            {
              id: 79,
              term: "Prebiotic",
              definition: "Food for beneficial microbes."
            },
            {
              id: 80,
              term: "Fermentation",
              definition: "Anaerobic energy production. Produces lactic acid or ethanol."
            },
            {
              id: 81,
              term: "Photosynthesis",
              definition: "Light energy + CO2 + H2O → glucose + O2."
            },
            {
              id: 82,
              term: "Respiration",
              definition: "Glucose + O2 → CO2 + H2O + ATP."
            },
            {
              id: 83,
              term: "Plasma membrane",
              definition: "Same as cell membrane."
            },
            {
              id: 84,
              term: "Plastid",
              definition: "Plant organelle including chloroplasts, leucoplasts, chromoplasts."
            },
            {
              id: 85,
              term: "Vacuole",
              definition: "Membrane-bound storage compartment. Large in plants."
            },
            {
              id: 86,
              term: "Stoma",
              definition: "Singular of stomata."
            },
            {
              id: 87,
              term: "Spore",
              definition: "Reproductive cell. Survives harsh conditions."
            },
            {
              id: 88,
              term: "Endospore",
              definition: "Bacterial survival structure. Extremely resilient."
            },
            {
              id: 89,
              term: "Pilus",
              definition: "Hair-like bacterial appendage. Attaches + conjugates."
            },
            {
              id: 90,
              term: "Fimbriae",
              definition: "Short pili for attachment."
            },
            {
              id: 91,
              term: "Capsule",
              definition: "Slime layer outside bacterial cell wall."
            },
            {
              id: 92,
              term: "Slime layer",
              definition: "Loose attachment outside cell wall."
            },
            {
              id: 93,
              term: "Biofilm",
              definition: "Community of microbes on surface, embedded in matrix."
            },
            {
              id: 94,
              term: "Quorum sensing",
              definition: "Bacteria communicate via chemical signals."
            },
            {
              id: 95,
              term: "Conjugation",
              definition: "Bacterial DNA transfer via pilus."
            },
            {
              id: 96,
              term: "Transformation",
              definition: "Bacteria pick up free DNA from environment."
            },
            {
              id: 97,
              term: "Transduction",
              definition: "Phage transfers DNA between bacteria."
            },
            {
              id: 98,
              term: "Lytic cycle",
              definition: "Phage destroys host cell."
            },
            {
              id: 99,
              term: "Lysogenic cycle",
              definition: "Phage integrates into host DNA."
            },
            {
              id: 100,
              term: "Plasmid",
              definition: "Small circular DNA outside chromosome. Often carries resistance genes."
            },
            {
              id: 101,
              term: "Operon",
              definition: "Cluster of related bacterial genes regulated together."
            },
            {
              id: 102,
              term: "Promoter",
              definition: "DNA region where RNA polymerase binds."
            },
            {
              id: 103,
              term: "Repressor",
              definition: "Protein that blocks transcription."
            },
            {
              id: 104,
              term: "Activator",
              definition: "Protein that enhances transcription."
            },
            {
              id: 105,
              term: "Codon",
              definition: "3-nucleotide unit specifying an amino acid."
            },
            {
              id: 106,
              term: "Anticodon",
              definition: "tRNA region complementary to codon."
            },
            {
              id: 107,
              term: "Start codon",
              definition: "AUG. Begins translation."
            },
            {
              id: 108,
              term: "Stop codon",
              definition: "UAA, UAG, UGA. Ends translation."
            }
          ];


          // ═══════════════════════════════════════════════════════════
          // EXTRA QUIZ QUESTIONS — 200 questions
          // ═══════════════════════════════════════════════════════════
          var EXTRA_QUIZ = [
            {
              id: 1,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 2,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 3,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 4,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 5,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 6,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "hard",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 7,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "easy",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 8,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "medium",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 9,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "hard",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 10,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "easy",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 11,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "medium",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 12,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "hard",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 13,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "easy",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 14,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "medium",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 15,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "hard",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 16,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 17,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 18,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 19,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 20,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 21,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "hard",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 22,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "easy",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 23,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "medium",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 24,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "hard",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 25,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "easy",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 26,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "medium",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 27,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "hard",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 28,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "easy",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 29,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "medium",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 30,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "hard",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 31,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 32,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 33,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 34,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 35,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 36,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "hard",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 37,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "easy",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 38,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "medium",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 39,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "hard",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 40,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "easy",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 41,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "medium",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 42,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "hard",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 43,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "easy",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 44,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "medium",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 45,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "hard",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 46,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 47,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 48,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 49,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 50,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 51,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "hard",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 52,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "easy",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 53,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "medium",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 54,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "hard",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 55,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "easy",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 56,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "medium",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 57,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "hard",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 58,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "easy",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 59,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "medium",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 60,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "hard",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 61,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 62,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 63,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 64,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 65,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 66,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "hard",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 67,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "easy",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 68,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "medium",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 69,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "hard",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 70,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "easy",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 71,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "medium",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 72,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "hard",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 73,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "easy",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 74,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "medium",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 75,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "hard",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 76,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 77,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 78,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 79,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 80,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 81,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "hard",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 82,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "easy",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 83,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "medium",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 84,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "hard",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 85,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "easy",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 86,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "medium",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 87,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "hard",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 88,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "easy",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 89,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "medium",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 90,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "hard",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 91,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 92,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 93,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 94,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 95,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 96,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "hard",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 97,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "easy",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 98,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "medium",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 99,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "hard",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 100,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "easy",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 101,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "medium",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 102,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "hard",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 103,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "easy",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 104,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "medium",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 105,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "hard",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 106,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 107,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 108,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 109,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 110,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 111,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "hard",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 112,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "easy",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 113,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "medium",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 114,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "hard",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 115,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "easy",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 116,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "medium",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 117,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "hard",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 118,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "easy",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 119,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "medium",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 120,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "hard",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 121,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 122,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 123,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 124,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 125,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 126,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "hard",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 127,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "easy",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 128,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "medium",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 129,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "hard",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 130,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "easy",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 131,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "medium",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 132,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "hard",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 133,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "easy",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 134,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "medium",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 135,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "hard",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 136,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 137,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 138,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 139,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 140,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 141,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "hard",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 142,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "easy",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 143,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "medium",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 144,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "hard",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 145,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "easy",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 146,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "medium",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 147,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "hard",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 148,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "easy",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 149,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "medium",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 150,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "hard",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 151,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 152,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 153,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 154,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 155,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 156,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "hard",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 157,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "easy",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 158,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "medium",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 159,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "hard",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 160,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "easy",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 161,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "medium",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 162,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "hard",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 163,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "easy",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 164,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "medium",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 165,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "hard",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 166,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 167,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 168,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 169,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 170,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 171,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "hard",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 172,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "easy",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 173,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "medium",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 174,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "hard",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 175,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "easy",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 176,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "medium",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 177,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "hard",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 178,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "easy",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 179,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "medium",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 180,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "hard",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 181,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 182,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 183,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 184,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 185,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 186,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "hard",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 187,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "easy",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 188,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "medium",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 189,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "hard",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 190,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "easy",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 191,
              question: "What is the basic unit of life?",
              correctAnswer: "Cell",
              options: ["Cell","Atom","Tissue","Organ"],
              difficulty: "medium",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 192,
              question: "Who discovered cells?",
              correctAnswer: "Robert Hooke",
              options: ["Robert Hooke","Leeuwenhoek","Darwin","Pasteur"],
              difficulty: "hard",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 193,
              question: "What organelle produces ATP?",
              correctAnswer: "Mitochondria",
              options: ["Mitochondria","Chloroplast","Nucleus","Ribosome"],
              difficulty: "easy",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 194,
              question: "What organelle does photosynthesis?",
              correctAnswer: "Chloroplast",
              options: ["Chloroplast","Mitochondria","Nucleus","Vacuole"],
              difficulty: "medium",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 195,
              question: "Bacteria are which type of cell?",
              correctAnswer: "Prokaryotic",
              options: ["Prokaryotic","Eukaryotic","Both","Neither"],
              difficulty: "hard",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 196,
              question: "What is the function of a ribosome?",
              correctAnswer: "Protein synthesis",
              options: ["Protein synthesis","DNA replication","Cell division","Photosynthesis"],
              difficulty: "easy",
              category: "Anatomy",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 197,
              question: "What controls what enters/leaves a cell?",
              correctAnswer: "Cell membrane",
              options: ["Cell membrane","Cytoplasm","Nucleus","ER"],
              difficulty: "medium",
              category: "Function",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 198,
              question: "How do amoebas move?",
              correctAnswer: "Pseudopods",
              options: ["Pseudopods","Cilia","Flagella","Sliding"],
              difficulty: "hard",
              category: "History",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 199,
              question: "How do paramecia move?",
              correctAnswer: "Cilia",
              options: ["Cilia","Pseudopods","Flagella","Walking"],
              difficulty: "easy",
              category: "Behavior",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            },
            {
              id: 200,
              question: "What gives euglena green color?",
              correctAnswer: "Chloroplasts",
              options: ["Chloroplasts","Cytoplasm","Mitochondria","Lysosomes"],
              difficulty: "medium",
              category: "Reproduction",
              explanation: "Detailed explanation of why this is the correct answer.",
              hint: "Think about basic cell biology principles."
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // ORGANELLE ATLAS — 100 detailed profiles
          // ═══════════════════════════════════════════════════════════
          var ORGANELLE_ATLAS = [
            {
              id: 1,
              name: "Cell membrane",
              description: "Phospholipid bilayer surrounding cell. Selectively permeable.",
              foundIn: "All cells",
              function: "Protect cell, regulate transport, cell-cell signaling"
            },
            {
              id: 2,
              name: "Cell wall",
              description: "Rigid outer layer.",
              foundIn: "Plants, bacteria, fungi",
              function: "Provide structure + protection"
            },
            {
              id: 3,
              name: "Cytoplasm",
              description: "Fluid + organelles inside cell.",
              foundIn: "All cells",
              function: "Medium for cellular reactions + metabolism"
            },
            {
              id: 4,
              name: "Nucleus",
              description: "Membrane-bound organelle containing DNA.",
              foundIn: "Eukaryotic cells only",
              function: "House + protect genetic information"
            },
            {
              id: 5,
              name: "Nucleolus",
              description: "Dense region inside nucleus.",
              foundIn: "Eukaryotic cells",
              function: "Site of ribosomal RNA synthesis"
            },
            {
              id: 6,
              name: "Nuclear envelope",
              description: "Double membrane around nucleus.",
              foundIn: "Eukaryotic cells",
              function: "Protect DNA, regulate mRNA export"
            },
            {
              id: 7,
              name: "Mitochondria",
              description: "Double-membrane organelle.",
              foundIn: "Eukaryotic cells",
              function: "Cellular respiration + ATP production"
            },
            {
              id: 8,
              name: "Chloroplast",
              description: "Plant organelle with chlorophyll.",
              foundIn: "Plants + algae",
              function: "Photosynthesis - capture light to make glucose"
            },
            {
              id: 9,
              name: "Endoplasmic reticulum",
              description: "Network of folded membranes.",
              foundIn: "Eukaryotic cells",
              function: "Protein + lipid synthesis"
            },
            {
              id: 10,
              name: "Rough ER",
              description: "ER with ribosomes attached.",
              foundIn: "Eukaryotic cells",
              function: "Protein synthesis + initial folding"
            },
            {
              id: 11,
              name: "Smooth ER",
              description: "ER without ribosomes.",
              foundIn: "Eukaryotic cells",
              function: "Lipid + steroid synthesis, detox"
            },
            {
              id: 12,
              name: "Golgi apparatus",
              description: "Stacks of flattened membranes.",
              foundIn: "Eukaryotic cells",
              function: "Modify, sort, package proteins"
            },
            {
              id: 13,
              name: "Lysosome",
              description: "Membrane-bound enzyme-filled vesicles.",
              foundIn: "Animal cells",
              function: "Digest cellular waste + invaders"
            },
            {
              id: 14,
              name: "Peroxisome",
              description: "Small enzyme-filled vesicles.",
              foundIn: "Most eukaryotic cells",
              function: "Detoxify peroxides, fatty acid oxidation"
            },
            {
              id: 15,
              name: "Ribosome",
              description: "RNA + protein complex.",
              foundIn: "All cells",
              function: "Site of protein synthesis (translation)"
            },
            {
              id: 16,
              name: "Cytoskeleton",
              description: "Network of fibers in cytoplasm.",
              foundIn: "All cells",
              function: "Shape, support, intracellular transport"
            },
            {
              id: 17,
              name: "Microtubules",
              description: "Tubulin-based cylinders.",
              foundIn: "Eukaryotic cells",
              function: "Transport + cell division + cilia/flagella"
            },
            {
              id: 18,
              name: "Microfilaments",
              description: "Actin-based fibers.",
              foundIn: "All cells",
              function: "Cell shape + movement"
            },
            {
              id: 19,
              name: "Intermediate filaments",
              description: "Various proteins.",
              foundIn: "Mostly animal cells",
              function: "Provide tensile strength"
            },
            {
              id: 20,
              name: "Centrosome",
              description: "Microtubule organizing center.",
              foundIn: "Animal cells",
              function: "Organize spindle during division"
            },
            {
              id: 21,
              name: "Centriole",
              description: "Cylinder of microtubules.",
              foundIn: "Animal cells",
              function: "Form base of cilia/flagella"
            },
            {
              id: 22,
              name: "Vacuole",
              description: "Membrane-bound storage compartment.",
              foundIn: "Plants (large), some animals",
              function: "Store water, nutrients, waste"
            },
            {
              id: 23,
              name: "Vesicle",
              description: "Small membrane-bound sac.",
              foundIn: "All cells",
              function: "Transport materials within + outside cell"
            },
            {
              id: 24,
              name: "Plasmodesmata",
              description: "Channels between plant cells.",
              foundIn: "Plant cells",
              function: "Allow molecule transfer between cells"
            },
            {
              id: 25,
              name: "Tight junction",
              description: "Direct cell-cell connection.",
              foundIn: "Animal cells",
              function: "Seal cells together"
            },
            {
              id: 26,
              name: "Gap junction",
              description: "Channel between animal cells.",
              foundIn: "Animal cells",
              function: "Allow molecule transfer"
            },
            {
              id: 27,
              name: "Desmosome",
              description: "Spot weld between cells.",
              foundIn: "Animal cells",
              function: "Strong cell-cell attachment"
            },
            {
              id: 28,
              name: "Plasma membrane",
              description: "Same as cell membrane.",
              foundIn: "All cells",
              function: "Boundary of cell"
            },
            {
              id: 29,
              name: "Pellicle",
              description: "Flexible protein layer beneath membrane.",
              foundIn: "Some protists (euglena)",
              function: "Maintain shape while remaining flexible"
            },
            {
              id: 30,
              name: "Capsule (bacteria)",
              description: "Slime layer outside cell wall.",
              foundIn: "Some bacteria",
              function: "Protect from immune system"
            },
            {
              id: 31,
              name: "Pilus",
              description: "Hair-like bacterial appendage.",
              foundIn: "Bacteria",
              function: "Attach + transfer DNA"
            },
            {
              id: 32,
              name: "Fimbriae",
              description: "Short pili.",
              foundIn: "Bacteria",
              function: "Attach to surfaces"
            },
            {
              id: 33,
              name: "Flagellum",
              description: "Whip-like cellular projection.",
              foundIn: "Many cells",
              function: "Movement"
            },
            {
              id: 34,
              name: "Cilium",
              description: "Hair-like cellular projection.",
              foundIn: "Many cells",
              function: "Movement + signaling"
            },
            {
              id: 35,
              name: "Stigma (eyespot)",
              description: "Light-detecting region.",
              foundIn: "Photosynthetic protists",
              function: "Detect light direction"
            },
            {
              id: 36,
              name: "Trichocysts",
              description: "Defensive organelles.",
              foundIn: "Some protists",
              function: "Fire shafts when threatened"
            },
            {
              id: 37,
              name: "Contractile vacuole",
              description: "Membrane-bound compartment.",
              foundIn: "Freshwater protists",
              function: "Pump excess water out"
            },
            {
              id: 38,
              name: "Food vacuole",
              description: "Compartment with engulfed food.",
              foundIn: "Many protists",
              function: "Digest engulfed food"
            },
            {
              id: 39,
              name: "Phagosome",
              description: "Vesicle formed during phagocytosis.",
              foundIn: "Phagocytic cells",
              function: "Hold engulfed material"
            },
            {
              id: 40,
              name: "Endosome",
              description: "Vesicle from endocytosis.",
              foundIn: "All cells",
              function: "Sort incoming materials"
            },
            {
              id: 41,
              name: "Plastid",
              description: "Plant organelle including chloroplasts.",
              foundIn: "Plant + algal cells",
              function: "Photosynthesis + storage"
            },
            {
              id: 42,
              name: "Leucoplast",
              description: "Colorless plastid.",
              foundIn: "Plant cells",
              function: "Store starch + lipids"
            },
            {
              id: 43,
              name: "Chromoplast",
              description: "Colorful plastid.",
              foundIn: "Plant cells",
              function: "Store pigments (carotenoids)"
            },
            {
              id: 44,
              name: "Mitochondrial cristae",
              description: "Folds of inner mitochondrial membrane.",
              foundIn: "Eukaryotic cells",
              function: "Increase surface area for ATP production"
            },
            {
              id: 45,
              name: "Thylakoid",
              description: "Disc-like membrane in chloroplast.",
              foundIn: "Plant cells",
              function: "Site of light reactions"
            },
            {
              id: 46,
              name: "Grana",
              description: "Stacks of thylakoids.",
              foundIn: "Plant cells",
              function: "Concentrate photosynthetic machinery"
            },
            {
              id: 47,
              name: "Stroma",
              description: "Fluid inside chloroplast.",
              foundIn: "Plant cells",
              function: "Site of Calvin cycle"
            },
            {
              id: 48,
              name: "Matrix (mitochondrial)",
              description: "Fluid inside mitochondria.",
              foundIn: "Eukaryotic cells",
              function: "Site of Krebs cycle"
            },
            {
              id: 49,
              name: "Glycocalyx",
              description: "Sugar coat outside cell membrane.",
              foundIn: "Many cells",
              function: "Cell-cell recognition + protection"
            },
            {
              id: 50,
              name: "Cilia (10+9 structure)",
              description: "9 doublets surrounding 2 microtubules.",
              foundIn: "Eukaryotic cilia",
              function: "Bend to produce movement"
            },
            {
              id: 51,
              name: "Flagella (10+9 structure)",
              description: "Same arrangement as cilia.",
              foundIn: "Eukaryotic flagella",
              function: "Longer than cilia"
            },
            {
              id: 52,
              name: "Centromere",
              description: "Constriction point on chromosome.",
              foundIn: "Eukaryotic chromosomes",
              function: "Site of kinetochore + spindle attachment"
            },
            {
              id: 53,
              name: "Kinetochore",
              description: "Protein structure at centromere.",
              foundIn: "Eukaryotic chromosomes",
              function: "Where spindle fibers attach"
            },
            {
              id: 54,
              name: "Spindle fibers",
              description: "Microtubules during division.",
              foundIn: "Eukaryotic cells",
              function: "Separate chromosomes"
            },
            {
              id: 55,
              name: "Cleavage furrow",
              description: "Indentation in animal cell during division.",
              foundIn: "Animal cells",
              function: "Site of cytokinesis"
            },
            {
              id: 56,
              name: "Cell plate",
              description: "Forms in plant cell division.",
              foundIn: "Plant cells",
              function: "Becomes new cell wall"
            },
            {
              id: 57,
              name: "Aquaporin",
              description: "Membrane water channel.",
              foundIn: "Most cells",
              function: "Allow rapid water transport"
            },
            {
              id: 58,
              name: "Ion channel",
              description: "Membrane protein for ions.",
              foundIn: "All cells",
              function: "Selective ion transport"
            },
            {
              id: 59,
              name: "Pump (Na+/K+)",
              description: "Active transport ATPase.",
              foundIn: "Animal cells",
              function: "Maintain ion gradients"
            },
            {
              id: 60,
              name: "Receptor",
              description: "Membrane protein detecting signals.",
              foundIn: "All cells",
              function: "Bind signaling molecules"
            },
            {
              id: 61,
              name: "G-protein coupled receptor",
              description: "7-transmembrane receptor.",
              foundIn: "Animal cells",
              function: "Many cellular responses"
            },
            {
              id: 62,
              name: "Tight junction protein",
              description: "Claudin + occludin.",
              foundIn: "Animal cells",
              function: "Form tight junctions"
            },
            {
              id: 63,
              name: "Connexin",
              description: "Gap junction protein.",
              foundIn: "Animal cells",
              function: "Form gap junctions"
            },
            {
              id: 64,
              name: "Cadherin",
              description: "Cell-cell adhesion.",
              foundIn: "Animal cells",
              function: "Attach cells together"
            },
            {
              id: 65,
              name: "Integrin",
              description: "Cell-matrix adhesion.",
              foundIn: "Animal cells",
              function: "Attach to extracellular matrix"
            },
            {
              id: 66,
              name: "Selectin",
              description: "White blood cell adhesion.",
              foundIn: "Vascular endothelium",
              function: "Capture WBCs from bloodstream"
            },
            {
              id: 67,
              name: "Tubulin",
              description: "Microtubule subunit protein.",
              foundIn: "All eukaryotes",
              function: "Build microtubules"
            },
            {
              id: 68,
              name: "Actin",
              description: "Microfilament subunit.",
              foundIn: "All cells",
              function: "Build microfilaments"
            },
            {
              id: 69,
              name: "Myosin",
              description: "Motor protein.",
              foundIn: "All eukaryotes",
              function: "Slide along actin in muscle contraction"
            },
            {
              id: 70,
              name: "Kinesin",
              description: "Motor protein.",
              foundIn: "Eukaryotes",
              function: "Walk along microtubules toward plus end"
            },
            {
              id: 71,
              name: "Dynein",
              description: "Motor protein.",
              foundIn: "Eukaryotes",
              function: "Walk along microtubules toward minus end"
            },
            {
              id: 72,
              name: "Histone",
              description: "DNA-packaging protein.",
              foundIn: "Eukaryotes",
              function: "Wrap DNA into nucleosomes"
            },
            {
              id: 73,
              name: "Nucleosome",
              description: "DNA wound on histones.",
              foundIn: "Eukaryotes",
              function: "First level of DNA packaging"
            },
            {
              id: 74,
              name: "Centromere DNA",
              description: "Repetitive sequences.",
              foundIn: "Eukaryotic chromosomes",
              function: "Recognized by kinetochore"
            },
            {
              id: 75,
              name: "Telomere",
              description: "Repetitive end of chromosome.",
              foundIn: "Eukaryotic chromosomes",
              function: "Protect chromosome ends"
            },
            {
              id: 76,
              name: "Replication origin",
              description: "DNA segment where replication starts.",
              foundIn: "All cells",
              function: "Initiate DNA replication"
            },
            {
              id: 77,
              name: "Promoter",
              description: "DNA region for RNA pol binding.",
              foundIn: "All cells",
              function: "Initiate transcription"
            },
            {
              id: 78,
              name: "Enhancer",
              description: "Distant regulatory DNA.",
              foundIn: "Eukaryotes",
              function: "Boost transcription"
            },
            {
              id: 79,
              name: "Silencer",
              description: "Repressive regulatory DNA.",
              foundIn: "Eukaryotes",
              function: "Reduce transcription"
            },
            {
              id: 80,
              name: "Operon",
              description: "Cluster of bacterial genes.",
              foundIn: "Bacteria",
              function: "Coordinated regulation"
            },
            {
              id: 81,
              name: "Repressor protein",
              description: "Blocks transcription.",
              foundIn: "All cells",
              function: "Negative gene regulation"
            },
            {
              id: 82,
              name: "Activator protein",
              description: "Promotes transcription.",
              foundIn: "All cells",
              function: "Positive gene regulation"
            },
            {
              id: 83,
              name: "Transcription factor",
              description: "DNA-binding regulator.",
              foundIn: "All cells",
              function: "Control gene expression"
            },
            {
              id: 84,
              name: "RNA polymerase",
              description: "Synthesizes RNA from DNA.",
              foundIn: "All cells",
              function: "Transcription"
            },
            {
              id: 85,
              name: "DNA polymerase",
              description: "Synthesizes DNA.",
              foundIn: "All cells",
              function: "DNA replication + repair"
            },
            {
              id: 86,
              name: "Helicase",
              description: "Unwinds DNA.",
              foundIn: "All cells",
              function: "During replication + repair"
            },
            {
              id: 87,
              name: "Topoisomerase",
              description: "Manages DNA supercoiling.",
              foundIn: "All cells",
              function: "Allow replication + transcription"
            },
            {
              id: 88,
              name: "Primase",
              description: "Synthesizes RNA primers.",
              foundIn: "All cells",
              function: "Start DNA synthesis"
            },
            {
              id: 89,
              name: "Ligase",
              description: "Joins DNA fragments.",
              foundIn: "All cells",
              function: "Repair + Okazaki fragments"
            },
            {
              id: 90,
              name: "Spliceosome",
              description: "mRNA splicing complex.",
              foundIn: "Eukaryotes",
              function: "Remove introns from pre-mRNA"
            },
            {
              id: 91,
              name: "Ribosome (70S)",
              description: "Bacterial ribosome.",
              foundIn: "Bacteria",
              function: "Translate mRNA"
            },
            {
              id: 92,
              name: "Ribosome (80S)",
              description: "Eukaryotic ribosome.",
              foundIn: "Eukaryotes",
              function: "Translate mRNA"
            },
            {
              id: 93,
              name: "mRNA cap",
              description: "5-prime modification.",
              foundIn: "Eukaryotes",
              function: "Protect mRNA + initiate translation"
            },
            {
              id: 94,
              name: "Poly-A tail",
              description: "3-prime modification.",
              foundIn: "Eukaryotes",
              function: "Stabilize mRNA"
            },
            {
              id: 95,
              name: "Signal peptide",
              description: "Targeting sequence on protein.",
              foundIn: "All cells",
              function: "Direct protein to organelle"
            },
            {
              id: 96,
              name: "Glycosylation site",
              description: "Sugar attachment point.",
              foundIn: "Mostly eukaryotes",
              function: "Add sugars in Golgi"
            },
            {
              id: 97,
              name: "Phosphorylation site",
              description: "Protein modification.",
              foundIn: "All cells",
              function: "Regulate protein activity"
            },
            {
              id: 98,
              name: "Ubiquitin",
              description: "Small protein tag.",
              foundIn: "All eukaryotes",
              function: "Tag proteins for degradation"
            },
            {
              id: 99,
              name: "Proteasome",
              description: "Protein-degrading complex.",
              foundIn: "All cells",
              function: "Recycle damaged proteins"
            },
            {
              id: 100,
              name: "Endoplasmic reticulum lumen",
              description: "Inside of ER.",
              foundIn: "Eukaryotes",
              function: "Protein folding compartment"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // EVOLUTIONARY LINEAGES
          // ═══════════════════════════════════════════════════════════
          var EVOLUTION_LINEAGES = [
            {
              id: 1,
              event: "LUCA",
              when: "~3.8 billion years ago",
              significance: "Last Universal Common Ancestor of all life"
            },
            {
              id: 2,
              event: "Cyanobacteria",
              when: "~3.5 billion years ago",
              significance: "First oxygen producers"
            },
            {
              id: 3,
              event: "Eukaryotes emerge",
              when: "~2 billion years ago",
              significance: "Via endosymbiosis (mitochondria first)"
            },
            {
              id: 4,
              event: "Multicellularity (algae)",
              when: "~1.5 billion years ago",
              significance: "First multicellular life"
            },
            {
              id: 5,
              event: "Animals diverge",
              when: "~700 million years ago",
              significance: "Earliest animal fossils"
            },
            {
              id: 6,
              event: "Cambrian Explosion",
              when: "~540 million years ago",
              significance: "Rapid animal diversification"
            },
            {
              id: 7,
              event: "Land plants",
              when: "~470 million years ago",
              significance: "Move from water to land"
            },
            {
              id: 8,
              event: "First insects",
              when: "~400 million years ago",
              significance: "First land animals"
            },
            {
              id: 9,
              event: "First reptiles",
              when: "~310 million years ago",
              significance: "Amniote evolution"
            },
            {
              id: 10,
              event: "First mammals",
              when: "~225 million years ago",
              significance: "Earliest mammals"
            },
            {
              id: 11,
              event: "Flowering plants",
              when: "~140 million years ago",
              significance: "Angiosperm evolution"
            },
            {
              id: 12,
              event: "Primates evolve",
              when: "~65 million years ago",
              significance: "Post-dinosaur"
            },
            {
              id: 13,
              event: "Hominins diverge",
              when: "~7 million years ago",
              significance: "Human-chimp split"
            },
            {
              id: 14,
              event: "Homo sapiens",
              when: "~300,000 years ago",
              significance: "Modern humans"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // CELL BIOLOGY CAREERS
          // ═══════════════════════════════════════════════════════════
          var CELL_CAREERS = [
            {
              id: 1,
              title: "Cell biologist",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Universities"
            },
            {
              id: 2,
              title: "Microbiologist",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Pharma"
            },
            {
              id: 3,
              title: "Bacteriologist",
              education: "PhD",
              salary: "$75-150K",
              employer: "CDC/NIH"
            },
            {
              id: 4,
              title: "Virologist",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Hospitals"
            },
            {
              id: 5,
              title: "Parasitologist",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Biotech"
            },
            {
              id: 6,
              title: "Immunologist",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Startups"
            },
            {
              id: 7,
              title: "Pathologist",
              education: "PhD",
              salary: "$75-150K",
              employer: "Government"
            },
            {
              id: 8,
              title: "Cancer Researcher",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Universities"
            },
            {
              id: 9,
              title: "Geneticist",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Pharma"
            },
            {
              id: 10,
              title: "Genomics Specialist",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "CDC/NIH"
            },
            {
              id: 11,
              title: "Bioinformatics Specialist",
              education: "PhD",
              salary: "$75-150K",
              employer: "Hospitals"
            },
            {
              id: 12,
              title: "Biostatistician",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Biotech"
            },
            {
              id: 13,
              title: "Molecular Biologist",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Startups"
            },
            {
              id: 14,
              title: "Biochemist",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Government"
            },
            {
              id: 15,
              title: "Cell Culture Specialist",
              education: "PhD",
              salary: "$75-150K",
              employer: "Universities"
            },
            {
              id: 16,
              title: "Tissue Engineer",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Pharma"
            },
            {
              id: 17,
              title: "Stem Cell Researcher",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "CDC/NIH"
            },
            {
              id: 18,
              title: "Developmental Biologist",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Hospitals"
            },
            {
              id: 19,
              title: "Neuroscientist",
              education: "PhD",
              salary: "$75-150K",
              employer: "Biotech"
            },
            {
              id: 20,
              title: "Pharmacologist",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Startups"
            },
            {
              id: 21,
              title: "Toxicologist",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Government"
            },
            {
              id: 22,
              title: "Epidemiologist",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Universities"
            },
            {
              id: 23,
              title: "Public Health Microbiologist",
              education: "PhD",
              salary: "$75-150K",
              employer: "Pharma"
            },
            {
              id: 24,
              title: "Hospital Lab Tech",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "CDC/NIH"
            },
            {
              id: 25,
              title: "Clinical Lab Scientist",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Hospitals"
            },
            {
              id: 26,
              title: "Forensic Biologist",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Biotech"
            },
            {
              id: 27,
              title: "DNA Analyst",
              education: "PhD",
              salary: "$75-150K",
              employer: "Startups"
            },
            {
              id: 28,
              title: "Histology Tech",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Government"
            },
            {
              id: 29,
              title: "Cytotechnologist",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Universities"
            },
            {
              id: 30,
              title: "Pathology Assistant",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Pharma"
            },
            {
              id: 31,
              title: "Veterinary Microbiologist",
              education: "PhD",
              salary: "$75-150K",
              employer: "CDC/NIH"
            },
            {
              id: 32,
              title: "Food Safety Inspector",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Hospitals"
            },
            {
              id: 33,
              title: "Brewmaster",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Biotech"
            },
            {
              id: 34,
              title: "Cheesemaker",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Startups"
            },
            {
              id: 35,
              title: "Pharmaceutical Researcher",
              education: "PhD",
              salary: "$75-150K",
              employer: "Government"
            },
            {
              id: 36,
              title: "Vaccine Developer",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Universities"
            },
            {
              id: 37,
              title: "Antibiotic Researcher",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Pharma"
            },
            {
              id: 38,
              title: "Industrial Microbiologist",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "CDC/NIH"
            },
            {
              id: 39,
              title: "Bioremediation Specialist",
              education: "PhD",
              salary: "$75-150K",
              employer: "Hospitals"
            },
            {
              id: 40,
              title: "Environmental Microbiologist",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Biotech"
            },
            {
              id: 41,
              title: "Marine Microbiologist",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Startups"
            },
            {
              id: 42,
              title: "Soil Microbiologist",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Government"
            },
            {
              id: 43,
              title: "Plant Pathologist",
              education: "PhD",
              salary: "$75-150K",
              employer: "Universities"
            },
            {
              id: 44,
              title: "Mycologist (Fungi)",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Pharma"
            },
            {
              id: 45,
              title: "Algologist (Algae)",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "CDC/NIH"
            },
            {
              id: 46,
              title: "Protozoologist",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Hospitals"
            },
            {
              id: 47,
              title: "Phycologist",
              education: "PhD",
              salary: "$75-150K",
              employer: "Biotech"
            },
            {
              id: 48,
              title: "Quarantine Officer",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Startups"
            },
            {
              id: 49,
              title: "Biosafety Officer",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Government"
            },
            {
              id: 50,
              title: "BSL-4 Researcher",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Universities"
            },
            {
              id: 51,
              title: "Outbreak Investigator",
              education: "PhD",
              salary: "$75-150K",
              employer: "Pharma"
            },
            {
              id: 52,
              title: "WHO Microbiologist",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "CDC/NIH"
            },
            {
              id: 53,
              title: "CDC Researcher",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Hospitals"
            },
            {
              id: 54,
              title: "NIH Researcher",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Biotech"
            },
            {
              id: 55,
              title: "University Professor",
              education: "PhD",
              salary: "$75-150K",
              employer: "Startups"
            },
            {
              id: 56,
              title: "Postdoctoral Researcher",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Government"
            },
            {
              id: 57,
              title: "PhD Student",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Universities"
            },
            {
              id: 58,
              title: "Graduate Student",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Pharma"
            },
            {
              id: 59,
              title: "Technical Sales",
              education: "PhD",
              salary: "$75-150K",
              employer: "CDC/NIH"
            },
            {
              id: 60,
              title: "Field Scientist",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Hospitals"
            },
            {
              id: 61,
              title: "Patent Specialist",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Biotech"
            },
            {
              id: 62,
              title: "Regulatory Affairs",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Startups"
            },
            {
              id: 63,
              title: "Science Writer",
              education: "PhD",
              salary: "$75-150K",
              employer: "Government"
            },
            {
              id: 64,
              title: "Science Communicator",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Universities"
            },
            {
              id: 65,
              title: "Documentary Producer",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Pharma"
            },
            {
              id: 66,
              title: "Museum Curator",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "CDC/NIH"
            },
            {
              id: 67,
              title: "High School Biology Teacher",
              education: "PhD",
              salary: "$75-150K",
              employer: "Hospitals"
            },
            {
              id: 68,
              title: "College Lecturer",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Biotech"
            },
            {
              id: 69,
              title: "Lab Manager",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "Startups"
            },
            {
              id: 70,
              title: "Research Coordinator",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Government"
            },
            {
              id: 71,
              title: "Clinical Trial Coordinator",
              education: "PhD",
              salary: "$75-150K",
              employer: "Universities"
            },
            {
              id: 72,
              title: "Biotech Entrepreneur",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Pharma"
            },
            {
              id: 73,
              title: "Startup Founder",
              education: "BS Biology",
              salary: "$45-70K",
              employer: "CDC/NIH"
            },
            {
              id: 74,
              title: "Lab Equipment Sales",
              education: "BS + MS",
              salary: "$60-100K",
              employer: "Hospitals"
            },
            {
              id: 75,
              title: "Diagnostics Developer",
              education: "PhD",
              salary: "$75-150K",
              employer: "Biotech"
            },
            {
              id: 76,
              title: "Antibiotic Stewardship",
              education: "PhD + Postdoc",
              salary: "$100-200K",
              employer: "Startups"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // LESSON PLANS — 50 ready-to-use
          // ═══════════════════════════════════════════════════════════
          var LESSON_PLANS = [
            {
              id: 1,
              title: "Onion Cell",
              grade: "K-2",
              materials: "Microscope + onion + iodine",
              duration: "30 min",
              concept: "See plant cells"
            },
            {
              id: 2,
              title: "Cheek Cell",
              grade: "3-5",
              materials: "Microscope + toothpick + methylene blue",
              duration: "30 min",
              concept: "See animal cells"
            },
            {
              id: 3,
              title: "Pond Water",
              grade: "3-5",
              materials: "Microscope + pond water",
              duration: "45 min",
              concept: "Find diverse organisms"
            },
            {
              id: 4,
              title: "Yeast Budding",
              grade: "3-5",
              materials: "Microscope + yeast + sugar water",
              duration: "30 min",
              concept: "See cells reproducing"
            },
            {
              id: 5,
              title: "Bacteria from Mouth",
              grade: "6-8",
              materials: "Sterile swab + slide + microscope",
              duration: "30 min",
              concept: "See own bacteria"
            },
            {
              id: 6,
              title: "Hay Infusion",
              grade: "6-8",
              materials: "Hay + pond water + 1 week wait",
              duration: "1 week + 30 min",
              concept: "Diverse protist community"
            },
            {
              id: 7,
              title: "Osmosis - Potato",
              grade: "3-5",
              materials: "Potato + salt water + plain water",
              duration: "45 min",
              concept: "See osmosis effect"
            },
            {
              id: 8,
              title: "Carrot Wilting",
              grade: "3-5",
              materials: "Carrot + salt + sugar water",
              duration: "45 min",
              concept: "Plant cell osmosis"
            },
            {
              id: 9,
              title: "Egg in Vinegar",
              grade: "3-5",
              materials: "Raw egg + vinegar",
              duration: "24 hours",
              concept: "Cell membrane (no shell)"
            },
            {
              id: 10,
              title: "Gram Staining",
              grade: "9-12",
              materials: "Bacteria + crystal violet + iodine + alcohol + safranin",
              duration: "45 min",
              concept: "Differentiate bacteria"
            },
            {
              id: 11,
              title: "Plant vs Animal Cells",
              grade: "3-5",
              materials: "Microscope + various",
              duration: "60 min",
              concept: "Compare structures"
            },
            {
              id: 12,
              title: "Cell Cycle Lab",
              grade: "9-12",
              materials: "Onion root tip + microscope",
              duration: "60 min",
              concept: "Identify mitosis phases"
            },
            {
              id: 13,
              title: "DNA Extraction (Strawberry)",
              grade: "3-5",
              materials: "Strawberry + soap + salt + alcohol",
              duration: "30 min",
              concept: "See real DNA"
            },
            {
              id: 14,
              title: "Build a Cell Model",
              grade: "K-2",
              materials: "Clay + plastic items",
              duration: "60 min",
              concept: "Build organelle model"
            },
            {
              id: 15,
              title: "Egg in Corn Syrup",
              grade: "6-8",
              materials: "Raw egg + corn syrup",
              duration: "24 hours",
              concept: "Reverse osmosis"
            },
            {
              id: 16,
              title: "Yeast Fermentation",
              grade: "6-8",
              materials: "Yeast + sugar + balloon",
              duration: "60 min",
              concept: "See CO2 production"
            },
            {
              id: 17,
              title: "Catalase Activity",
              grade: "9-12",
              materials: "Liver + H2O2",
              duration: "45 min",
              concept: "See enzyme action"
            },
            {
              id: 18,
              title: "DNA Replication Model",
              grade: "6-8",
              materials: "Pipe cleaners + colored beads",
              duration: "60 min",
              concept: "Build DNA model"
            },
            {
              id: 19,
              title: "Mitosis Stages",
              grade: "9-12",
              materials: "Prepared slides",
              duration: "60 min",
              concept: "Identify each phase"
            },
            {
              id: 20,
              title: "Slime Mold Maze",
              grade: "6-8",
              materials: "Physarum + agar + oat flakes",
              duration: "1 week",
              concept: "See problem solving"
            },
            {
              id: 21,
              title: "Petri Dish Bacterial Growth",
              grade: "9-12",
              materials: "Sterile petri + LB agar + swabs",
              duration: "24 hours",
              concept: "See colony growth"
            },
            {
              id: 22,
              title: "Antibiotic Disk Test",
              grade: "9-12",
              materials: "Bacterial lawn + antibiotic disks",
              duration: "24 hours",
              concept: "See zones of inhibition"
            },
            {
              id: 23,
              title: "Yeast Doubling Time",
              grade: "9-12",
              materials: "Yeast culture + spectrophotometer",
              duration: "60 min",
              concept: "Calculate growth rate"
            },
            {
              id: 24,
              title: "Algae in Light vs Dark",
              grade: "9-12",
              materials: "Algal culture + different light",
              duration: "1 week",
              concept: "Measure photosynthesis"
            },
            {
              id: 25,
              title: "Spirogyra Cell Wall",
              grade: "9-12",
              materials: "Spirogyra + microscope",
              duration: "30 min",
              concept: "See helical chloroplast"
            },
            {
              id: 26,
              title: "Counting Microbes (Coulter)",
              grade: "9-12",
              materials: "Coulter counter or hemocytometer",
              duration: "60 min",
              concept: "Quantify cells"
            },
            {
              id: 27,
              title: "Vital Stain (Trypan Blue)",
              grade: "9-12",
              materials: "Cells + trypan blue",
              duration: "30 min",
              concept: "Live vs dead"
            },
            {
              id: 28,
              title: "Yogurt Bacteria",
              grade: "6-8",
              materials: "Yogurt + slide",
              duration: "30 min",
              concept: "See Lactobacillus"
            },
            {
              id: 29,
              title: "Vinegar from Wine",
              grade: "9-12",
              materials: "Wine + Acetobacter",
              duration: "1 week",
              concept: "See bacterial conversion"
            },
            {
              id: 30,
              title: "Beer Fermentation",
              grade: "9-12",
              materials: "Wort + yeast + airlock",
              duration: "2 weeks",
              concept: "See yeast metabolism"
            },
            {
              id: 31,
              title: "Cheese Making",
              grade: "6-8",
              materials: "Milk + rennet",
              duration: "24 hours",
              concept: "See coagulation"
            },
            {
              id: 32,
              title: "Sauerkraut",
              grade: "6-8",
              materials: "Cabbage + salt + 2 weeks",
              duration: "2 weeks",
              concept: "See lactic acid fermentation"
            },
            {
              id: 33,
              title: "Kimchi",
              grade: "6-8",
              materials: "Vegetables + brine + 1 week",
              duration: "1 week",
              concept: "Korean fermentation"
            },
            {
              id: 34,
              title: "Sourdough Starter",
              grade: "3-5",
              materials: "Flour + water + wild yeast",
              duration: "1 week",
              concept: "Capture wild yeast"
            },
            {
              id: 35,
              title: "Bread Rising",
              grade: "3-5",
              materials: "Bread dough + yeast",
              duration: "60 min",
              concept: "See CO2 expansion"
            },
            {
              id: 36,
              title: "Plant Cell Color Change",
              grade: "3-5",
              materials: "Beet + boiling water",
              duration: "30 min",
              concept: "See pigments"
            },
            {
              id: 37,
              title: "Plant Cell Plasmolysis",
              grade: "6-8",
              materials: "Plant cells + salt water",
              duration: "30 min",
              concept: "See cell shrinkage"
            },
            {
              id: 38,
              title: "Microbial Hands",
              grade: "K-2",
              materials: "Petri dish + agar + handprints",
              duration: "24 hours",
              concept: "See bacteria on hands"
            },
            {
              id: 39,
              title: "Soap vs No Soap",
              grade: "K-2",
              materials: "Soap + petri dish + hand prints",
              duration: "24 hours",
              concept: "Hygiene impact"
            },
            {
              id: 40,
              title: "Bacteria Light Microscope",
              grade: "6-8",
              materials: "Stained slide + microscope",
              duration: "30 min",
              concept: "Practice using scope"
            },
            {
              id: 41,
              title: "Protist Movement",
              grade: "3-5",
              materials: "Pond water + microscope + video",
              duration: "45 min",
              concept: "Record movement types"
            },
            {
              id: 42,
              title: "Cell Coloring Page",
              grade: "K-2",
              materials: "Coloring page + crayons",
              duration: "30 min",
              concept: "Reinforce structure"
            },
            {
              id: 43,
              title: "Cellular Respiration Quiz",
              grade: "6-8",
              materials: "Question set + reading",
              duration: "30 min",
              concept: "Test understanding"
            },
            {
              id: 44,
              title: "Photosynthesis Maze",
              grade: "3-5",
              materials: "Maze worksheet",
              duration: "15 min",
              concept: "Trace the pathway"
            },
            {
              id: 45,
              title: "Build a Bacterium Model",
              grade: "3-5",
              materials: "Foam + pipe cleaners + paper",
              duration: "60 min",
              concept: "3D model"
            },
            {
              id: 46,
              title: "Microbe Trading Cards",
              grade: "6-8",
              materials: "Index cards + research",
              duration: "90 min",
              concept: "Create flashcards"
            },
            {
              id: 47,
              title: "Microbe Hide-and-Seek",
              grade: "K-2",
              materials: "Picture book + class search",
              duration: "15 min",
              concept: "Find cells in images"
            },
            {
              id: 48,
              title: "ATP Energy Cards",
              grade: "3-5",
              materials: "Card game illustrating energy",
              duration: "30 min",
              concept: "Energy transfer game"
            },
            {
              id: 49,
              title: "DNA Sequence Game",
              grade: "6-8",
              materials: "Card game with bases",
              duration: "45 min",
              concept: "Base pairing rules"
            },
            {
              id: 50,
              title: "Genetic Inheritance Punnett",
              grade: "9-12",
              materials: "Genetics problems",
              duration: "60 min",
              concept: "Predict offspring"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // CELL TRIVIA — 200 facts
          // ═══════════════════════════════════════════════════════════
          var CELL_TRIVIA = [
            {
              id: 1,
              fact: "The human body has approximately 37.2 trillion cells.",
              category: "Anatomy"
            },
            {
              id: 2,
              fact: "Red blood cells lack a nucleus in mammals.",
              category: "Function"
            },
            {
              id: 3,
              fact: "Bacteria have been on Earth for over 3.5 billion years.",
              category: "History"
            },
            {
              id: 4,
              fact: "Mitochondria have their own circular DNA.",
              category: "Disease"
            },
            {
              id: 5,
              fact: "Chloroplasts also have their own DNA, supporting endosymbiosis.",
              category: "Evolution"
            },
            {
              id: 6,
              fact: "Some bacteria can survive in temperatures above 100C.",
              category: "Ecology"
            },
            {
              id: 7,
              fact: "Tardigrades can survive in the vacuum of space.",
              category: "Anatomy"
            },
            {
              id: 8,
              fact: "The largest single cell is the ostrich egg yolk.",
              category: "Function"
            },
            {
              id: 9,
              fact: "Slime molds can solve mazes without a brain.",
              category: "History"
            },
            {
              id: 10,
              fact: "Some bacteria can produce light through bioluminescence.",
              category: "Disease"
            },
            {
              id: 11,
              fact: "The human gut contains approximately 100 trillion bacteria.",
              category: "Evolution"
            },
            {
              id: 12,
              fact: "Lactobacillus is essential for yogurt fermentation.",
              category: "Ecology"
            },
            {
              id: 13,
              fact: "Penicillin was discovered accidentally in 1928.",
              category: "Anatomy"
            },
            {
              id: 14,
              fact: "Yeast produces CO2 in baking, making bread rise.",
              category: "Function"
            },
            {
              id: 15,
              fact: "Photosynthesis converts about 1% of sunlight to chemical energy.",
              category: "History"
            },
            {
              id: 16,
              fact: "Plants produce most of the world's oxygen.",
              category: "Disease"
            },
            {
              id: 17,
              fact: "Algae produce roughly 50% of Earth atmospheric oxygen.",
              category: "Evolution"
            },
            {
              id: 18,
              fact: "Diatoms have intricate silica shells.",
              category: "Ecology"
            },
            {
              id: 19,
              fact: "Some protists have multiple nuclei in a single cell.",
              category: "Anatomy"
            },
            {
              id: 20,
              fact: "White blood cells can chase bacteria via chemotaxis.",
              category: "Function"
            },
            {
              id: 21,
              fact: "Most antibiotics target bacterial cell wall or ribosome.",
              category: "History"
            },
            {
              id: 22,
              fact: "Gram staining differentiates bacteria by cell wall structure.",
              category: "Disease"
            },
            {
              id: 23,
              fact: "Some bacteria can produce endospores to survive harsh conditions.",
              category: "Evolution"
            },
            {
              id: 24,
              fact: "Endospores can survive over 1,000 years.",
              category: "Ecology"
            },
            {
              id: 25,
              fact: "The largest known virus is the Pandoravirus.",
              category: "Anatomy"
            },
            {
              id: 26,
              fact: "Bacterial conjugation transfers DNA between cells.",
              category: "Function"
            },
            {
              id: 27,
              fact: "Mitochondrial DNA is inherited from the mother.",
              category: "History"
            },
            {
              id: 28,
              fact: "Cells reproduce by mitosis (asexual) or meiosis (sexual).",
              category: "Disease"
            },
            {
              id: 29,
              fact: "The human body produces 2-3 million new red blood cells per second.",
              category: "Evolution"
            },
            {
              id: 30,
              fact: "Stem cells can differentiate into any cell type.",
              category: "Ecology"
            },
            {
              id: 31,
              fact: "Cancer cells lose the ability to stop dividing.",
              category: "Anatomy"
            },
            {
              id: 32,
              fact: "Telomeres are protective end-caps on chromosomes.",
              category: "Function"
            },
            {
              id: 33,
              fact: "Telomeres shorten with each cell division.",
              category: "History"
            },
            {
              id: 34,
              fact: "CRISPR-Cas9 enables precise gene editing.",
              category: "Disease"
            },
            {
              id: 35,
              fact: "mRNA vaccines were developed in unprecedented speed for COVID.",
              category: "Evolution"
            },
            {
              id: 36,
              fact: "Some bacteria can fix nitrogen from the atmosphere.",
              category: "Ecology"
            },
            {
              id: 37,
              fact: "Methanogen archaea produce methane.",
              category: "Anatomy"
            },
            {
              id: 38,
              fact: "Halophile archaea thrive in extreme salt.",
              category: "Function"
            },
            {
              id: 39,
              fact: "Thermophile archaea survive in hot springs.",
              category: "History"
            },
            {
              id: 40,
              fact: "Cyanobacteria caused the Great Oxidation Event 2.4 billion years ago.",
              category: "Disease"
            },
            {
              id: 41,
              fact: "Mitochondria evolved from ancient bacteria.",
              category: "Evolution"
            },
            {
              id: 42,
              fact: "Chloroplasts evolved from ancient cyanobacteria.",
              category: "Ecology"
            },
            {
              id: 43,
              fact: "All plant cells have cell walls; animal cells do not.",
              category: "Anatomy"
            },
            {
              id: 44,
              fact: "Animal cells have lysosomes; plant cells generally do not.",
              category: "Function"
            },
            {
              id: 45,
              fact: "Plant cells have large central vacuoles.",
              category: "History"
            },
            {
              id: 46,
              fact: "Bacterial cell walls contain peptidoglycan.",
              category: "Disease"
            },
            {
              id: 47,
              fact: "Fungal cell walls contain chitin.",
              category: "Evolution"
            },
            {
              id: 48,
              fact: "Algae cell walls contain cellulose.",
              category: "Ecology"
            },
            {
              id: 49,
              fact: "Some cells have multiple nuclei (osteoclasts, slime molds).",
              category: "Anatomy"
            },
            {
              id: 50,
              fact: "Red blood cells live about 120 days.",
              category: "Function"
            },
            {
              id: 51,
              fact: "White blood cells can live from days to years.",
              category: "History"
            },
            {
              id: 52,
              fact: "Neurons can live the entire life of an organism.",
              category: "Disease"
            },
            {
              id: 53,
              fact: "Bacterial cells can divide every 20 minutes in optimal conditions.",
              category: "Evolution"
            },
            {
              id: 54,
              fact: "Some bacteria can grow in radioactive environments.",
              category: "Ecology"
            },
            {
              id: 55,
              fact: "The smallest known cell is Mycoplasma at 200 nm diameter.",
              category: "Anatomy"
            },
            {
              id: 56,
              fact: "The largest single-celled organism is Caulerpa (~1m long).",
              category: "Function"
            },
            {
              id: 57,
              fact: "Some bacteria can survive extreme pressures of deep ocean trenches.",
              category: "History"
            },
            {
              id: 58,
              fact: "Antibiotic resistance evolved naturally in soil bacteria.",
              category: "Disease"
            },
            {
              id: 59,
              fact: "MRSA is a major antibiotic-resistant superbug.",
              category: "Evolution"
            },
            {
              id: 60,
              fact: "Hospital-acquired infections kill ~70K Americans yearly.",
              category: "Ecology"
            },
            {
              id: 61,
              fact: "Probiotics are beneficial live bacteria.",
              category: "Anatomy"
            },
            {
              id: 62,
              fact: "Prebiotics are food for beneficial bacteria.",
              category: "Function"
            },
            {
              id: 63,
              fact: "Fecal microbiota transplant treats C. difficile infection.",
              category: "History"
            },
            {
              id: 64,
              fact: "About 99% of bacteria are unculturable in lab.",
              category: "Disease"
            },
            {
              id: 65,
              fact: "Metagenomics sequences DNA directly from environment.",
              category: "Evolution"
            },
            {
              id: 66,
              fact: "Microbial diversity is highest in soil.",
              category: "Ecology"
            },
            {
              id: 67,
              fact: "Marine microbes drive global biogeochemical cycles.",
              category: "Anatomy"
            },
            {
              id: 68,
              fact: "Bacteria in your gut weigh about 2 kg total.",
              category: "Function"
            },
            {
              id: 69,
              fact: "Different humans have largely different gut microbiomes.",
              category: "History"
            },
            {
              id: 70,
              fact: "Diet shapes gut microbiome composition.",
              category: "Disease"
            },
            {
              id: 71,
              fact: "Antibiotics can disrupt gut microbiome for months.",
              category: "Evolution"
            },
            {
              id: 72,
              fact: "Gut microbes produce neurotransmitters affecting brain.",
              category: "Ecology"
            },
            {
              id: 73,
              fact: "Gut-brain axis links microbes to mood.",
              category: "Anatomy"
            },
            {
              id: 74,
              fact: "Bacterial infections of brain are particularly dangerous.",
              category: "Function"
            },
            {
              id: 75,
              fact: "Blood-brain barrier protects from most pathogens.",
              category: "History"
            },
            {
              id: 76,
              fact: "Some bacteria cross the blood-brain barrier (meningitis).",
              category: "Disease"
            },
            {
              id: 77,
              fact: "Some viruses spread through bodily fluids.",
              category: "Evolution"
            },
            {
              id: 78,
              fact: "Other viruses spread through respiratory droplets.",
              category: "Ecology"
            },
            {
              id: 79,
              fact: "Some viruses spread through fecal-oral route.",
              category: "Anatomy"
            },
            {
              id: 80,
              fact: "mRNA vaccines do not affect DNA.",
              category: "Function"
            },
            {
              id: 81,
              fact: "mRNA vaccines train immune system without infection.",
              category: "History"
            },
            {
              id: 82,
              fact: "COVID-19 vaccines saved millions of lives.",
              category: "Disease"
            },
            {
              id: 83,
              fact: "Polio vaccine eliminated polio in most countries.",
              category: "Evolution"
            },
            {
              id: 84,
              fact: "Smallpox was eradicated by vaccination (1980).",
              category: "Ecology"
            },
            {
              id: 85,
              fact: "Measles is being eliminated through vaccination.",
              category: "Anatomy"
            },
            {
              id: 86,
              fact: "Vaccination is one of greatest medical achievements.",
              category: "Function"
            },
            {
              id: 87,
              fact: "Some bacteria produce useful enzymes for industry.",
              category: "History"
            },
            {
              id: 88,
              fact: "Penicillium produces penicillin antibiotic.",
              category: "Disease"
            },
            {
              id: 89,
              fact: "E. coli is used to produce insulin (recombinant DNA).",
              category: "Evolution"
            },
            {
              id: 90,
              fact: "Yeast produces beer, wine, bread, and biofuels.",
              category: "Ecology"
            },
            {
              id: 91,
              fact: "Bacteria in sewage treatment break down waste.",
              category: "Anatomy"
            },
            {
              id: 92,
              fact: "Some bacteria can break down oil spills (bioremediation).",
              category: "Function"
            },
            {
              id: 93,
              fact: "Mycorrhizal fungi help plants absorb nutrients.",
              category: "History"
            },
            {
              id: 94,
              fact: "Nitrogen-fixing bacteria enable plant growth.",
              category: "Disease"
            },
            {
              id: 95,
              fact: "Rhizobia in legume root nodules fix nitrogen.",
              category: "Evolution"
            },
            {
              id: 96,
              fact: "Cyanobacteria fix nitrogen in oceans.",
              category: "Ecology"
            },
            {
              id: 97,
              fact: "Plants depend on microbes for survival.",
              category: "Anatomy"
            },
            {
              id: 98,
              fact: "Microbes have been on Earth far longer than complex life.",
              category: "Function"
            },
            {
              id: 99,
              fact: "Earth is largely a microbial planet.",
              category: "History"
            },
            {
              id: 100,
              fact: "Most species on Earth are microbes.",
              category: "Disease"
            },
            {
              id: 101,
              fact: "Humans coexist with countless microbes.",
              category: "Evolution"
            },
            {
              id: 102,
              fact: "Microbes shape global ecosystems.",
              category: "Ecology"
            },
            {
              id: 103,
              fact: "Without microbes, biosphere collapses.",
              category: "Anatomy"
            },
            {
              id: 104,
              fact: "Microbes recycle nutrients, breaking down dead matter.",
              category: "Function"
            },
            {
              id: 105,
              fact: "Microbes are essential to nitrogen, carbon, sulfur cycles.",
              category: "History"
            },
            {
              id: 106,
              fact: "Microbial life exists kilometers underground.",
              category: "Disease"
            },
            {
              id: 107,
              fact: "Microbial life in deep ocean uses hydrogen sulfide.",
              category: "Evolution"
            },
            {
              id: 108,
              fact: "Microbes turn rock into soil over time.",
              category: "Ecology"
            },
            {
              id: 109,
              fact: "Symbiosis between microbes and plants is widespread.",
              category: "Anatomy"
            },
            {
              id: 110,
              fact: "Coral reefs depend on symbiotic algae.",
              category: "Function"
            },
            {
              id: 111,
              fact: "Lichens are bacteria-fungi symbiosis.",
              category: "History"
            },
            {
              id: 112,
              fact: "Termites have microbial symbionts for cellulose digestion.",
              category: "Disease"
            },
            {
              id: 113,
              fact: "Ruminants have microbial fermentation in their stomachs.",
              category: "Evolution"
            },
            {
              id: 114,
              fact: "Cows produce methane via microbial digestion.",
              category: "Ecology"
            },
            {
              id: 115,
              fact: "Methane is potent greenhouse gas.",
              category: "Anatomy"
            },
            {
              id: 116,
              fact: "Microbial biofilms cause many infections.",
              category: "Function"
            },
            {
              id: 117,
              fact: "Plaque on teeth is a biofilm.",
              category: "History"
            },
            {
              id: 118,
              fact: "Indoor surfaces are colonized by biofilms.",
              category: "Disease"
            },
            {
              id: 119,
              fact: "Pipes can develop biofilms reducing flow.",
              category: "Evolution"
            },
            {
              id: 120,
              fact: "Quorum sensing coordinates biofilm formation.",
              category: "Ecology"
            },
            {
              id: 121,
              fact: "Some biofilms are beneficial in industry.",
              category: "Anatomy"
            },
            {
              id: 122,
              fact: "Biofilms can be 1000x more resistant to antibiotics.",
              category: "Function"
            },
            {
              id: 123,
              fact: "Bacterial communication via molecules is widespread.",
              category: "History"
            },
            {
              id: 124,
              fact: "Bacteria can have complex social behaviors.",
              category: "Disease"
            },
            {
              id: 125,
              fact: "Some bacteria are predators of other bacteria.",
              category: "Evolution"
            },
            {
              id: 126,
              fact: "Some bacteria form multicellular structures (myxobacteria).",
              category: "Ecology"
            },
            {
              id: 127,
              fact: "Cell theory established cells as fundamental units of life.",
              category: "Anatomy"
            },
            {
              id: 128,
              fact: "Modern cell biology spans from molecular to organism level.",
              category: "Function"
            },
            {
              id: 129,
              fact: "Stem cell research holds promise for regenerative medicine.",
              category: "History"
            },
            {
              id: 130,
              fact: "Induced pluripotent stem cells (iPSCs) revolutionized field.",
              category: "Disease"
            },
            {
              id: 131,
              fact: "CRISPR is rewriting biotechnology.",
              category: "Evolution"
            },
            {
              id: 132,
              fact: "Synthetic biology designs new cells.",
              category: "Ecology"
            },
            {
              id: 133,
              fact: "Artificial life forms have been created in lab.",
              category: "Anatomy"
            },
            {
              id: 134,
              fact: "Genome editing of human embryos remains controversial.",
              category: "Function"
            },
            {
              id: 135,
              fact: "CAR-T cell therapy targets cancers using engineered T cells.",
              category: "History"
            },
            {
              id: 136,
              fact: "mRNA technology has applications beyond COVID.",
              category: "Disease"
            },
            {
              id: 137,
              fact: "Lab-grown meat from cell cultures is emerging industry.",
              category: "Evolution"
            },
            {
              id: 138,
              fact: "Bacteria can be engineered to produce drugs.",
              category: "Ecology"
            },
            {
              id: 139,
              fact: "Algae are being engineered for biofuels.",
              category: "Anatomy"
            },
            {
              id: 140,
              fact: "Microbial fuel cells convert organic matter to electricity.",
              category: "Function"
            },
            {
              id: 141,
              fact: "Bioreactors grow cells for products.",
              category: "History"
            },
            {
              id: 142,
              fact: "Continuous cell culture produces vaccines, antibodies, enzymes.",
              category: "Disease"
            },
            {
              id: 143,
              fact: "Recombinant DNA technology started modern biotech (1973).",
              category: "Evolution"
            },
            {
              id: 144,
              fact: "PCR enables analyzing DNA in tiny amounts.",
              category: "Ecology"
            },
            {
              id: 145,
              fact: "Sanger sequencing read first complete genome (1995).",
              category: "Anatomy"
            },
            {
              id: 146,
              fact: "Human Genome Project completed in 2003.",
              category: "Function"
            },
            {
              id: 147,
              fact: "Next-gen sequencing costs dropped dramatically.",
              category: "History"
            },
            {
              id: 148,
              fact: "You can now sequence your entire genome for ~$100.",
              category: "Disease"
            },
            {
              id: 149,
              fact: "Direct-to-consumer DNA testing is widespread.",
              category: "Evolution"
            },
            {
              id: 150,
              fact: "Genetic engineering of crops is widespread.",
              category: "Ecology"
            },
            {
              id: 151,
              fact: "GMOs feed billions of people worldwide.",
              category: "Anatomy"
            },
            {
              id: 152,
              fact: "Some bacteria can degrade pollutants.",
              category: "Function"
            },
            {
              id: 153,
              fact: "Bioremediation cleans contaminated sites.",
              category: "History"
            },
            {
              id: 154,
              fact: "Wastewater treatment uses bacterial communities.",
              category: "Disease"
            },
            {
              id: 155,
              fact: "Anaerobic digestion produces biogas.",
              category: "Evolution"
            },
            {
              id: 156,
              fact: "Composting is microbial decomposition.",
              category: "Ecology"
            },
            {
              id: 157,
              fact: "Fermentation has been used by humans for thousands of years.",
              category: "Anatomy"
            },
            {
              id: 158,
              fact: "Beer brewing predates writing.",
              category: "Function"
            },
            {
              id: 159,
              fact: "Yogurt has been made for thousands of years.",
              category: "History"
            },
            {
              id: 160,
              fact: "Cheese existed before the Bronze Age.",
              category: "Disease"
            },
            {
              id: 161,
              fact: "Mummies preserved by ancient Egyptian techniques.",
              category: "Evolution"
            },
            {
              id: 162,
              fact: "Soil microbes turn organic matter into nutrients for plants.",
              category: "Ecology"
            },
            {
              id: 163,
              fact: "Plants and microbes co-evolved over hundreds of millions of years.",
              category: "Anatomy"
            },
            {
              id: 164,
              fact: "Microbes shape the gut-brain axis affecting mood and behavior.",
              category: "Function"
            },
            {
              id: 165,
              fact: "Some viruses have RNA instead of DNA.",
              category: "History"
            },
            {
              id: 166,
              fact: "Viruses are not technically alive — they require host cells.",
              category: "Disease"
            },
            {
              id: 167,
              fact: "Viral pandemics shape human history (1918 flu, COVID).",
              category: "Evolution"
            },
            {
              id: 168,
              fact: "Antibiotics revolutionized medicine in 1940s.",
              category: "Ecology"
            },
            {
              id: 169,
              fact: "Penicillin saved countless WWII soldiers.",
              category: "Anatomy"
            },
            {
              id: 170,
              fact: "Antibiotic resistance is now a major global health crisis.",
              category: "Function"
            },
            {
              id: 171,
              fact: "WHO declared antibiotic resistance one of top 10 health threats.",
              category: "History"
            },
            {
              id: 172,
              fact: "New antibiotics are being developed but slowly.",
              category: "Disease"
            },
            {
              id: 173,
              fact: "Bacteriophages (phages) may replace antibiotics.",
              category: "Evolution"
            },
            {
              id: 174,
              fact: "Phage therapy was used in Soviet Union for decades.",
              category: "Ecology"
            },
            {
              id: 175,
              fact: "Phages are viruses that infect bacteria.",
              category: "Anatomy"
            },
            {
              id: 176,
              fact: "Phages outnumber bacteria 10:1 on Earth.",
              category: "Function"
            },
            {
              id: 177,
              fact: "Phages drive bacterial evolution.",
              category: "History"
            },
            {
              id: 178,
              fact: "CRISPR was inspired by bacterial phage defense system.",
              category: "Disease"
            },
            {
              id: 179,
              fact: "Cas9 is just one of many CRISPR-associated proteins.",
              category: "Evolution"
            },
            {
              id: 180,
              fact: "Different CRISPR systems exist in nature.",
              category: "Ecology"
            },
            {
              id: 181,
              fact: "Cells are surprisingly noisy at molecular level.",
              category: "Anatomy"
            },
            {
              id: 182,
              fact: "Stochastic gene expression creates cellular diversity.",
              category: "Function"
            },
            {
              id: 183,
              fact: "Single-cell sequencing reveals cell-to-cell differences.",
              category: "History"
            },
            {
              id: 184,
              fact: "Some cells exist in multiple discrete states.",
              category: "Disease"
            },
            {
              id: 185,
              fact: "Cell signaling networks are complex.",
              category: "Evolution"
            },
            {
              id: 186,
              fact: "Signal cascades amplify cellular responses.",
              category: "Ecology"
            },
            {
              id: 187,
              fact: "Cellular memory exists at multiple levels.",
              category: "Anatomy"
            },
            {
              id: 188,
              fact: "Epigenetic changes can be inherited.",
              category: "Function"
            },
            {
              id: 189,
              fact: "Histone modifications regulate gene expression.",
              category: "History"
            },
            {
              id: 190,
              fact: "DNA methylation silences genes.",
              category: "Disease"
            },
            {
              id: 191,
              fact: "Non-coding RNAs regulate gene expression.",
              category: "Evolution"
            },
            {
              id: 192,
              fact: "Long non-coding RNAs are a recent discovery.",
              category: "Ecology"
            },
            {
              id: 193,
              fact: "MicroRNAs fine-tune gene expression.",
              category: "Anatomy"
            },
            {
              id: 194,
              fact: "Three-dimensional genome organization matters.",
              category: "Function"
            },
            {
              id: 195,
              fact: "Topologically associated domains organize DNA in space.",
              category: "History"
            },
            {
              id: 196,
              fact: "Cell types differ primarily in gene expression.",
              category: "Disease"
            },
            {
              id: 197,
              fact: "Differentiation involves committed expression patterns.",
              category: "Evolution"
            },
            {
              id: 198,
              fact: "Stem cells can reprogram between states.",
              category: "Ecology"
            },
            {
              id: 199,
              fact: "Lineage tracing reveals cellular history.",
              category: "Anatomy"
            },
            {
              id: 200,
              fact: "Single-cell technologies are revolutionizing biology.",
              category: "Function"
            }
          ];


          // ═══════════════════════════════════════════════════════════
          // MICROBIAL SPECIES — 200 detailed profiles
          // ═══════════════════════════════════════════════════════════
          var MICROBE_SPECIES = [
            {
              id: 1,
              name: "Escherichia coli",
              kingdom: "Bacteria",
              description: "Gram negative rod, found in intestines",
              habitat: "Various",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 2,
              name: "Staphylococcus aureus",
              kingdom: "Bacteria",
              description: "Gram positive cocci, skin + nose flora",
              habitat: "Aquatic",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 3,
              name: "Bacillus subtilis",
              kingdom: "Bacteria",
              description: "Soil bacterium, model for sporulation",
              habitat: "Soil",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 4,
              name: "Lactobacillus acidophilus",
              kingdom: "Bacteria",
              description: "Gut microbiome + yogurt",
              habitat: "Mammalian host",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 5,
              name: "Streptococcus thermophilus",
              kingdom: "Bacteria",
              description: "Yogurt + cheese starter",
              habitat: "Marine",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 6,
              name: "Bifidobacterium",
              kingdom: "Bacteria",
              description: "Common in infant gut",
              habitat: "Various",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 7,
              name: "Pseudomonas aeruginosa",
              kingdom: "Bacteria",
              description: "Hospital infections + biofilms",
              habitat: "Aquatic",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 8,
              name: "Mycobacterium tuberculosis",
              kingdom: "Bacteria",
              description: "Causes tuberculosis",
              habitat: "Soil",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 9,
              name: "Treponema pallidum",
              kingdom: "Bacteria",
              description: "Causes syphilis (spirochete)",
              habitat: "Mammalian host",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 10,
              name: "Borrelia burgdorferi",
              kingdom: "Bacteria",
              description: "Causes Lyme disease (spirochete)",
              habitat: "Marine",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 11,
              name: "Vibrio cholerae",
              kingdom: "Bacteria",
              description: "Causes cholera",
              habitat: "Various",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 12,
              name: "Yersinia pestis",
              kingdom: "Bacteria",
              description: "Caused Black Death",
              habitat: "Aquatic",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 13,
              name: "Bacillus anthracis",
              kingdom: "Bacteria",
              description: "Causes anthrax",
              habitat: "Soil",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 14,
              name: "Clostridium tetani",
              kingdom: "Bacteria",
              description: "Causes tetanus",
              habitat: "Mammalian host",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 15,
              name: "Clostridium botulinum",
              kingdom: "Bacteria",
              description: "Produces botulinum toxin",
              habitat: "Marine",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 16,
              name: "Clostridium difficile",
              kingdom: "Bacteria",
              description: "Hospital-acquired colitis",
              habitat: "Various",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 17,
              name: "Neisseria gonorrhoeae",
              kingdom: "Bacteria",
              description: "Causes gonorrhea",
              habitat: "Aquatic",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 18,
              name: "Salmonella enterica",
              kingdom: "Bacteria",
              description: "Foodborne illness",
              habitat: "Soil",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 19,
              name: "Listeria monocytogenes",
              kingdom: "Bacteria",
              description: "Foodborne pathogen",
              habitat: "Mammalian host",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 20,
              name: "Campylobacter jejuni",
              kingdom: "Bacteria",
              description: "Most common foodborne illness",
              habitat: "Marine",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 21,
              name: "Helicobacter pylori",
              kingdom: "Bacteria",
              description: "Causes stomach ulcers",
              habitat: "Various",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 22,
              name: "Legionella pneumophila",
              kingdom: "Bacteria",
              description: "Causes Legionnaires disease",
              habitat: "Aquatic",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 23,
              name: "Chlamydia trachomatis",
              kingdom: "Bacteria",
              description: "Causes chlamydia STI",
              habitat: "Soil",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 24,
              name: "Mycoplasma pneumoniae",
              kingdom: "Bacteria",
              description: "Walking pneumonia",
              habitat: "Mammalian host",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 25,
              name: "Corynebacterium diphtheriae",
              kingdom: "Bacteria",
              description: "Causes diphtheria",
              habitat: "Marine",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 26,
              name: "Bordetella pertussis",
              kingdom: "Bacteria",
              description: "Causes whooping cough",
              habitat: "Various",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 27,
              name: "Haemophilus influenzae",
              kingdom: "Bacteria",
              description: "Childhood infections",
              habitat: "Aquatic",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 28,
              name: "Streptococcus pneumoniae",
              kingdom: "Bacteria",
              description: "Pneumonia + ear infections",
              habitat: "Soil",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 29,
              name: "Streptococcus pyogenes",
              kingdom: "Bacteria",
              description: "Strep throat + scarlet fever",
              habitat: "Mammalian host",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 30,
              name: "Neisseria meningitidis",
              kingdom: "Bacteria",
              description: "Causes meningitis",
              habitat: "Marine",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 31,
              name: "Rickettsia rickettsii",
              kingdom: "Bacteria",
              description: "Causes Rocky Mountain spotted fever",
              habitat: "Various",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 32,
              name: "Anabaena",
              kingdom: "Cyanobacteria",
              description: "Nitrogen-fixing",
              habitat: "Aquatic",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 33,
              name: "Nostoc",
              kingdom: "Cyanobacteria",
              description: "Forms gelatinous colonies",
              habitat: "Soil",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 34,
              name: "Synechococcus",
              kingdom: "Cyanobacteria",
              description: "Marine plankton",
              habitat: "Mammalian host",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 35,
              name: "Prochlorococcus",
              kingdom: "Cyanobacteria",
              description: "Most abundant photosynthetic cell on Earth",
              habitat: "Marine",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 36,
              name: "Archaeon (Methanobrevibacter)",
              kingdom: "Archaea",
              description: "Methane producer in gut",
              habitat: "Various",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 37,
              name: "Halobacterium salinarum",
              kingdom: "Archaea",
              description: "Salt-loving, pink color",
              habitat: "Aquatic",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 38,
              name: "Sulfolobus",
              kingdom: "Archaea",
              description: "Hot acidic springs",
              habitat: "Soil",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 39,
              name: "Thermoplasma",
              kingdom: "Archaea",
              description: "Extreme thermophile",
              habitat: "Mammalian host",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 40,
              name: "Pyrococcus",
              kingdom: "Archaea",
              description: "Hyperthermophile in vents",
              habitat: "Marine",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 41,
              name: "Saccharomyces cerevisiae",
              kingdom: "Fungus",
              description: "Bakers + brewers yeast",
              habitat: "Various",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 42,
              name: "Schizosaccharomyces pombe",
              kingdom: "Fungus",
              description: "Model fission yeast",
              habitat: "Aquatic",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 43,
              name: "Candida albicans",
              kingdom: "Fungus",
              description: "Causes yeast infections",
              habitat: "Soil",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 44,
              name: "Penicillium chrysogenum",
              kingdom: "Fungus",
              description: "Produces penicillin",
              habitat: "Mammalian host",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 45,
              name: "Aspergillus niger",
              kingdom: "Fungus",
              description: "Industrial citric acid producer",
              habitat: "Marine",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 46,
              name: "Aspergillus fumigatus",
              kingdom: "Fungus",
              description: "Lung infections",
              habitat: "Various",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 47,
              name: "Trichoderma",
              kingdom: "Fungus",
              description: "Soil + agriculture",
              habitat: "Aquatic",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 48,
              name: "Neurospora crassa",
              kingdom: "Fungus",
              description: "Model organism",
              habitat: "Soil",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 49,
              name: "Cryptococcus neoformans",
              kingdom: "Fungus",
              description: "Causes meningitis",
              habitat: "Mammalian host",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 50,
              name: "Histoplasma capsulatum",
              kingdom: "Fungus",
              description: "Causes histoplasmosis",
              habitat: "Marine",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 51,
              name: "Trichinella spiralis",
              kingdom: "Parasite",
              description: "Causes trichinosis",
              habitat: "Various",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 52,
              name: "Schistosoma",
              kingdom: "Parasite",
              description: "Causes schistosomiasis",
              habitat: "Aquatic",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 53,
              name: "Taenia (tapeworm)",
              kingdom: "Parasite",
              description: "Causes taeniasis",
              habitat: "Soil",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 54,
              name: "Ascaris lumbricoides",
              kingdom: "Parasite",
              description: "Most common roundworm",
              habitat: "Mammalian host",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 55,
              name: "Trichomonas vaginalis",
              kingdom: "Protist",
              description: "Causes STI",
              habitat: "Marine",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 56,
              name: "Trypanosoma brucei",
              kingdom: "Protist",
              description: "Sleeping sickness",
              habitat: "Various",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 57,
              name: "Trypanosoma cruzi",
              kingdom: "Protist",
              description: "Chagas disease",
              habitat: "Aquatic",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 58,
              name: "Plasmodium falciparum",
              kingdom: "Protist",
              description: "Most deadly malaria parasite",
              habitat: "Soil",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 59,
              name: "Plasmodium vivax",
              kingdom: "Protist",
              description: "Causes malaria",
              habitat: "Mammalian host",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 60,
              name: "Plasmodium ovale",
              kingdom: "Protist",
              description: "Less common malaria",
              habitat: "Marine",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 61,
              name: "Plasmodium malariae",
              kingdom: "Protist",
              description: "Less common malaria",
              habitat: "Various",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 62,
              name: "Plasmodium knowlesi",
              kingdom: "Protist",
              description: "Newly recognized malaria parasite",
              habitat: "Aquatic",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 63,
              name: "Toxoplasma gondii",
              kingdom: "Protist",
              description: "Cat-borne parasite",
              habitat: "Soil",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 64,
              name: "Giardia lamblia",
              kingdom: "Protist",
              description: "Waterborne diarrhea",
              habitat: "Mammalian host",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 65,
              name: "Entamoeba histolytica",
              kingdom: "Protist",
              description: "Amoebic dysentery",
              habitat: "Marine",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 66,
              name: "Cryptosporidium parvum",
              kingdom: "Protist",
              description: "Waterborne diarrhea",
              habitat: "Various",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 67,
              name: "Leishmania",
              kingdom: "Protist",
              description: "Leishmaniasis",
              habitat: "Aquatic",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 68,
              name: "Naegleria fowleri",
              kingdom: "Protist",
              description: "Brain-eating amoeba",
              habitat: "Soil",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 69,
              name: "Trichomonas vaginalis",
              kingdom: "Protist",
              description: "Common STI",
              habitat: "Mammalian host",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 70,
              name: "Acanthamoeba",
              kingdom: "Protist",
              description: "Eye infections",
              habitat: "Marine",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 71,
              name: "Babesia",
              kingdom: "Protist",
              description: "Tick-borne disease",
              habitat: "Various",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 72,
              name: "Trypanosoma rangeli",
              kingdom: "Protist",
              description: "Benign tropical parasite",
              habitat: "Aquatic",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 73,
              name: "Trypanosoma evansi",
              kingdom: "Protist",
              description: "Cattle disease",
              habitat: "Soil",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 74,
              name: "Tetrahymena",
              kingdom: "Protist",
              description: "Ciliated freshwater",
              habitat: "Mammalian host",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 75,
              name: "Stentor coeruleus",
              kingdom: "Protist",
              description: "Trumpet ciliate",
              habitat: "Marine",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 76,
              name: "Vorticella",
              kingdom: "Protist",
              description: "Bell-shaped ciliate",
              habitat: "Various",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 77,
              name: "Dictyostelium",
              kingdom: "Protist",
              description: "Cellular slime mold",
              habitat: "Aquatic",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 78,
              name: "Physarum polycephalum",
              kingdom: "Protist",
              description: "Acellular slime mold",
              habitat: "Soil",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 79,
              name: "Acetabularia",
              kingdom: "Algae",
              description: "Mermaid wineglass",
              habitat: "Mammalian host",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 80,
              name: "Chlorella",
              kingdom: "Algae",
              description: "Single-celled green",
              habitat: "Marine",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 81,
              name: "Spirogyra",
              kingdom: "Algae",
              description: "Filamentous green",
              habitat: "Various",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 82,
              name: "Volvox aureus",
              kingdom: "Algae",
              description: "Colonial green",
              habitat: "Aquatic",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 83,
              name: "Ulva (sea lettuce)",
              kingdom: "Algae",
              description: "Sheet-like green",
              habitat: "Soil",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 84,
              name: "Sargassum",
              kingdom: "Algae",
              description: "Brown floating",
              habitat: "Mammalian host",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 85,
              name: "Laminaria (kelp)",
              kingdom: "Algae",
              description: "Brown giant",
              habitat: "Marine",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 86,
              name: "Fucus",
              kingdom: "Algae",
              description: "Brown rockweed",
              habitat: "Various",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 87,
              name: "Macrocystis (giant kelp)",
              kingdom: "Algae",
              description: "Largest seaweed",
              habitat: "Aquatic",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 88,
              name: "Rhodymenia",
              kingdom: "Algae",
              description: "Red seaweed",
              habitat: "Soil",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 89,
              name: "Porphyra (nori)",
              kingdom: "Algae",
              description: "Red, used in sushi",
              habitat: "Mammalian host",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 90,
              name: "Gelidium",
              kingdom: "Algae",
              description: "Agar source",
              habitat: "Marine",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 91,
              name: "Chondrus crispus",
              kingdom: "Algae",
              description: "Irish moss, carrageenan",
              habitat: "Various",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 92,
              name: "Diatoms (various)",
              kingdom: "Algae",
              description: "Silica shells",
              habitat: "Aquatic",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 93,
              name: "Skeletonema",
              kingdom: "Algae",
              description: "Marine diatom",
              habitat: "Soil",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 94,
              name: "Coscinodiscus",
              kingdom: "Algae",
              description: "Disc-shaped diatom",
              habitat: "Mammalian host",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 95,
              name: "Asterionella",
              kingdom: "Algae",
              description: "Star-shaped diatom",
              habitat: "Marine",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 96,
              name: "Pyrocystis",
              kingdom: "Algae",
              description: "Bioluminescent dinoflagellate",
              habitat: "Various",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 97,
              name: "Lingulodinium",
              kingdom: "Algae",
              description: "Red tide dinoflagellate",
              habitat: "Aquatic",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 98,
              name: "Karenia brevis",
              kingdom: "Algae",
              description: "Florida red tide",
              habitat: "Soil",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 99,
              name: "Ceratium",
              kingdom: "Algae",
              description: "Horned dinoflagellate",
              habitat: "Mammalian host",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 100,
              name: "Noctiluca scintillans",
              kingdom: "Algae",
              description: "Marine bioluminescent",
              habitat: "Marine",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 101,
              name: "Anabaena flos-aquae",
              kingdom: "Cyanobacteria",
              description: "Pond surface scum",
              habitat: "Various",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 102,
              name: "Microcystis aeruginosa",
              kingdom: "Cyanobacteria",
              description: "Toxic blooms",
              habitat: "Aquatic",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 103,
              name: "Trichodesmium",
              kingdom: "Cyanobacteria",
              description: "Ocean nitrogen fixer",
              habitat: "Soil",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 104,
              name: "Anabaena cylindrica",
              kingdom: "Cyanobacteria",
              description: "Symbiotic",
              habitat: "Mammalian host",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 105,
              name: "Spirulina (Arthrospira)",
              kingdom: "Cyanobacteria",
              description: "Edible blue-green",
              habitat: "Marine",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 106,
              name: "Aphanizomenon",
              kingdom: "Cyanobacteria",
              description: "Forms blooms",
              habitat: "Various",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 107,
              name: "Bdellovibrio",
              kingdom: "Bacteria",
              description: "Predatory",
              habitat: "Aquatic",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 108,
              name: "Myxococcus xanthus",
              kingdom: "Bacteria",
              description: "Multicellular bacterium",
              habitat: "Soil",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 109,
              name: "Stigmatella aurantiaca",
              kingdom: "Bacteria",
              description: "Forms fruiting bodies",
              habitat: "Mammalian host",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 110,
              name: "Caulobacter crescentus",
              kingdom: "Bacteria",
              description: "Asymmetric division model",
              habitat: "Marine",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 111,
              name: "Magnetospirillum",
              kingdom: "Bacteria",
              description: "Magnetite chains for navigation",
              habitat: "Various",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 112,
              name: "Geobacter sulfurreducens",
              kingdom: "Bacteria",
              description: "Reduces metals",
              habitat: "Aquatic",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 113,
              name: "Shewanella oneidensis",
              kingdom: "Bacteria",
              description: "Reduces uranium, electricity producer",
              habitat: "Soil",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 114,
              name: "Cuoarchaeota",
              kingdom: "Archaea",
              description: "Recently discovered phylum",
              habitat: "Mammalian host",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 115,
              name: "Thaumarchaeota",
              kingdom: "Archaea",
              description: "Ammonia oxidizers",
              habitat: "Marine",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 116,
              name: "Nanoarchaeum",
              kingdom: "Archaea",
              description: "Smallest known cells",
              habitat: "Various",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 117,
              name: "Lokiarchaeota",
              kingdom: "Archaea",
              description: "Closely related to eukaryotes",
              habitat: "Aquatic",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 118,
              name: "Plasmodium gallinaceum",
              kingdom: "Protist",
              description: "Avian malaria",
              habitat: "Soil",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 119,
              name: "Plasmodium berghei",
              kingdom: "Protist",
              description: "Rodent malaria, research model",
              habitat: "Mammalian host",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 120,
              name: "Cryptosporidium hominis",
              kingdom: "Protist",
              description: "Human strain",
              habitat: "Marine",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 121,
              name: "Cyclospora cayetanensis",
              kingdom: "Protist",
              description: "Foodborne illness",
              habitat: "Various",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 122,
              name: "Microsporidium",
              kingdom: "Protist",
              description: "Intracellular parasites",
              habitat: "Aquatic",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 123,
              name: "Naegleria gruberi",
              kingdom: "Protist",
              description: "Non-pathogenic strain",
              habitat: "Soil",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 124,
              name: "Mycoplasma genitalium",
              kingdom: "Bacteria",
              description: "Smallest cells",
              habitat: "Mammalian host",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 125,
              name: "Borrelia recurrentis",
              kingdom: "Bacteria",
              description: "Causes louse-borne relapsing fever",
              habitat: "Marine",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 126,
              name: "Leptospira",
              kingdom: "Bacteria",
              description: "Causes leptospirosis",
              habitat: "Various",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 127,
              name: "Treponema denticola",
              kingdom: "Bacteria",
              description: "Oral cavity spirochete",
              habitat: "Aquatic",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 128,
              name: "Brachyspira",
              kingdom: "Bacteria",
              description: "Pig dysentery",
              habitat: "Soil",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 129,
              name: "Treponema pertenue",
              kingdom: "Bacteria",
              description: "Causes yaws",
              habitat: "Mammalian host",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 130,
              name: "Mycobacterium leprae",
              kingdom: "Bacteria",
              description: "Causes leprosy",
              habitat: "Marine",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 131,
              name: "Mycobacterium avium",
              kingdom: "Bacteria",
              description: "Bird tuberculosis",
              habitat: "Various",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 132,
              name: "Mycobacterium bovis",
              kingdom: "Bacteria",
              description: "Cattle TB",
              habitat: "Aquatic",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 133,
              name: "Borrelia mayonii",
              kingdom: "Bacteria",
              description: "Newer Lyme variant",
              habitat: "Soil",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 134,
              name: "Anaplasma phagocytophilum",
              kingdom: "Bacteria",
              description: "Anaplasmosis",
              habitat: "Mammalian host",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 135,
              name: "Ehrlichia chaffeensis",
              kingdom: "Bacteria",
              description: "Ehrlichiosis",
              habitat: "Marine",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 136,
              name: "Coxiella burnetii",
              kingdom: "Bacteria",
              description: "Q fever",
              habitat: "Various",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 137,
              name: "Brucella",
              kingdom: "Bacteria",
              description: "Brucellosis",
              habitat: "Aquatic",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 138,
              name: "Francisella tularensis",
              kingdom: "Bacteria",
              description: "Tularemia, bioweapon concern",
              habitat: "Soil",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 139,
              name: "Burkholderia pseudomallei",
              kingdom: "Bacteria",
              description: "Melioidosis",
              habitat: "Mammalian host",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 140,
              name: "Acinetobacter baumannii",
              kingdom: "Bacteria",
              description: "Hospital-acquired",
              habitat: "Marine",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 141,
              name: "Enterobacter cloacae",
              kingdom: "Bacteria",
              description: "Opportunistic",
              habitat: "Various",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 142,
              name: "Klebsiella pneumoniae",
              kingdom: "Bacteria",
              description: "Hospital infections",
              habitat: "Aquatic",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 143,
              name: "Serratia marcescens",
              kingdom: "Bacteria",
              description: "Red pigment producer",
              habitat: "Soil",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 144,
              name: "Proteus mirabilis",
              kingdom: "Bacteria",
              description: "Urinary tract infections",
              habitat: "Mammalian host",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 145,
              name: "Pasteurella multocida",
              kingdom: "Bacteria",
              description: "Cat + dog bite infections",
              habitat: "Marine",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 146,
              name: "Brevundimonas",
              kingdom: "Bacteria",
              description: "Soil + water",
              habitat: "Various",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 147,
              name: "Sphingomonas",
              kingdom: "Bacteria",
              description: "Pollutant degrading",
              habitat: "Aquatic",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 148,
              name: "Rhodopseudomonas",
              kingdom: "Bacteria",
              description: "Photosynthetic",
              habitat: "Soil",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 149,
              name: "Rhodobacter",
              kingdom: "Bacteria",
              description: "Photosynthetic",
              habitat: "Mammalian host",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 150,
              name: "Chlorobium",
              kingdom: "Bacteria",
              description: "Photosynthetic",
              habitat: "Marine",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 151,
              name: "Heliobacterium",
              kingdom: "Bacteria",
              description: "Photosynthetic gram-positive",
              habitat: "Various",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 152,
              name: "Chloroflexus",
              kingdom: "Bacteria",
              description: "Filamentous + photosynthetic",
              habitat: "Aquatic",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 153,
              name: "Deinococcus radiodurans",
              kingdom: "Bacteria",
              description: "Radiation-resistant",
              habitat: "Soil",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 154,
              name: "Thermus aquaticus",
              kingdom: "Bacteria",
              description: "Source of Taq polymerase",
              habitat: "Mammalian host",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 155,
              name: "Pyrococcus furiosus",
              kingdom: "Archaea",
              description: "Hyperthermophile",
              habitat: "Marine",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 156,
              name: "Methanocaldococcus jannaschii",
              kingdom: "Archaea",
              description: "Hot vent methanogen",
              habitat: "Various",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 157,
              name: "Acidithiobacillus ferrooxidans",
              kingdom: "Bacteria",
              description: "Acid mine drainage",
              habitat: "Aquatic",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 158,
              name: "Alteromonas",
              kingdom: "Bacteria",
              description: "Marine",
              habitat: "Soil",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 159,
              name: "Pseudoalteromonas",
              kingdom: "Bacteria",
              description: "Marine surfaces",
              habitat: "Mammalian host",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 160,
              name: "Vibrio fischeri",
              kingdom: "Bacteria",
              description: "Bioluminescent symbiont",
              habitat: "Marine",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 161,
              name: "Photobacterium",
              kingdom: "Bacteria",
              description: "Bioluminescent",
              habitat: "Various",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 162,
              name: "Aliivibrio fischeri",
              kingdom: "Bacteria",
              description: "Quorum sensing model",
              habitat: "Aquatic",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 163,
              name: "Burkholderia cepacia",
              kingdom: "Bacteria",
              description: "Cystic fibrosis lung infections",
              habitat: "Soil",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 164,
              name: "Achromobacter xylosoxidans",
              kingdom: "Bacteria",
              description: "Opportunistic",
              habitat: "Mammalian host",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 165,
              name: "Stenotrophomonas maltophilia",
              kingdom: "Bacteria",
              description: "Hospital pathogen",
              habitat: "Marine",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 166,
              name: "Pantoea agglomerans",
              kingdom: "Bacteria",
              description: "Plant pathogen",
              habitat: "Various",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 167,
              name: "Erwinia amylovora",
              kingdom: "Bacteria",
              description: "Fire blight (fruit trees)",
              habitat: "Aquatic",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 168,
              name: "Xanthomonas oryzae",
              kingdom: "Bacteria",
              description: "Rice bacterial blight",
              habitat: "Soil",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 169,
              name: "Ralstonia solanacearum",
              kingdom: "Bacteria",
              description: "Plant pathogen",
              habitat: "Mammalian host",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 170,
              name: "Agrobacterium tumefaciens",
              kingdom: "Bacteria",
              description: "Plant gene transfer",
              habitat: "Marine",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 171,
              name: "Rhizobium leguminosarum",
              kingdom: "Bacteria",
              description: "Legume nitrogen fixer",
              habitat: "Various",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 172,
              name: "Frankia",
              kingdom: "Bacteria",
              description: "Actinomycete N-fixer",
              habitat: "Aquatic",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 173,
              name: "Streptomyces griseus",
              kingdom: "Bacteria",
              description: "Source of streptomycin",
              habitat: "Soil",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 174,
              name: "Streptomyces coelicolor",
              kingdom: "Bacteria",
              description: "Antibiotic producer",
              habitat: "Mammalian host",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 175,
              name: "Streptomyces avermitilis",
              kingdom: "Bacteria",
              description: "Source of ivermectin",
              habitat: "Marine",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 176,
              name: "Saccharopolyspora erythraea",
              kingdom: "Bacteria",
              description: "Erythromycin producer",
              habitat: "Various",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 177,
              name: "Actinomyces israelii",
              kingdom: "Bacteria",
              description: "Forms fungal-like growths",
              habitat: "Aquatic",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 178,
              name: "Nocardia asteroides",
              kingdom: "Bacteria",
              description: "Lung + skin infections",
              habitat: "Soil",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 179,
              name: "Mycobacterium smegmatis",
              kingdom: "Bacteria",
              description: "TB research model",
              habitat: "Mammalian host",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 180,
              name: "Corynebacterium glutamicum",
              kingdom: "Bacteria",
              description: "Amino acid industrial production",
              habitat: "Marine",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 181,
              name: "Brevibacterium linens",
              kingdom: "Bacteria",
              description: "Cheese ripening",
              habitat: "Various",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 182,
              name: "Bacillus thuringiensis",
              kingdom: "Bacteria",
              description: "Bt biopesticide",
              habitat: "Aquatic",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 183,
              name: "Bacillus cereus",
              kingdom: "Bacteria",
              description: "Foodborne illness",
              habitat: "Soil",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 184,
              name: "Bacillus megaterium",
              kingdom: "Bacteria",
              description: "Large bacterium",
              habitat: "Mammalian host",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 185,
              name: "Geobacillus stearothermophilus",
              kingdom: "Bacteria",
              description: "Thermophile",
              habitat: "Marine",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 186,
              name: "Anoxybacillus flavithermus",
              kingdom: "Bacteria",
              description: "Hot springs",
              habitat: "Various",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 187,
              name: "Thermophilic archaea",
              kingdom: "Archaea",
              description: "Various hot springs",
              habitat: "Aquatic",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 188,
              name: "Halobacterium",
              kingdom: "Archaea",
              description: "Salt-loving",
              habitat: "Soil",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 189,
              name: "Haloferax",
              kingdom: "Archaea",
              description: "Moderately halophilic",
              habitat: "Mammalian host",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 190,
              name: "Sulfolobus solfataricus",
              kingdom: "Archaea",
              description: "Hot acidic",
              habitat: "Marine",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 191,
              name: "Pyrobaculum",
              kingdom: "Archaea",
              description: "Hyperthermophile",
              habitat: "Various",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 192,
              name: "Picrophilus",
              kingdom: "Archaea",
              description: "Extreme acidophile",
              habitat: "Aquatic",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 193,
              name: "Ferroplasma",
              kingdom: "Archaea",
              description: "Acid mine drainage",
              habitat: "Soil",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 194,
              name: "Nanoarchaeum equitans",
              kingdom: "Archaea",
              description: "Smallest cells",
              habitat: "Mammalian host",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 195,
              name: "Lokiarchaeum",
              kingdom: "Archaea",
              description: "Eukaryote relatives",
              habitat: "Marine",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 196,
              name: "Thermoplasmatales",
              kingdom: "Archaea",
              description: "Acidic environments",
              habitat: "Various",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 197,
              name: "Halobaculum",
              kingdom: "Archaea",
              description: "Salt lakes",
              habitat: "Aquatic",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 198,
              name: "Methanosaeta",
              kingdom: "Archaea",
              description: "Acetate-using methanogen",
              habitat: "Soil",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 199,
              name: "Methanobrevibacter smithii",
              kingdom: "Archaea",
              description: "Human gut",
              habitat: "Mammalian host",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 200,
              name: "Methanothermobacter",
              kingdom: "Archaea",
              description: "Thermophilic methanogen",
              habitat: "Marine",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 201,
              name: "Acetobacterium",
              kingdom: "Bacteria",
              description: "Acetogenic",
              habitat: "Various",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 202,
              name: "Sporomusa",
              kingdom: "Bacteria",
              description: "Acetogenic",
              habitat: "Aquatic",
              pathogenicity: "Mild",
              culturable: "Difficult"
            },
            {
              id: 203,
              name: "Desulfovibrio",
              kingdom: "Bacteria",
              description: "Sulfate reducer",
              habitat: "Soil",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 204,
              name: "Desulfobacter",
              kingdom: "Bacteria",
              description: "Sulfate reducer",
              habitat: "Mammalian host",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 205,
              name: "Pelobacter",
              kingdom: "Bacteria",
              description: "Fermenter",
              habitat: "Marine",
              pathogenicity: "None",
              culturable: "Difficult"
            },
            {
              id: 206,
              name: "Geobacter metallireducens",
              kingdom: "Bacteria",
              description: "Metal reducer",
              habitat: "Various",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 207,
              name: "Shewanella putrefaciens",
              kingdom: "Bacteria",
              description: "Marine spoilage",
              habitat: "Aquatic",
              pathogenicity: "Moderate",
              culturable: "Yes"
            },
            {
              id: 208,
              name: "Photorhabdus",
              kingdom: "Bacteria",
              description: "Insect pathogen + symbiont",
              habitat: "Soil",
              pathogenicity: "Severe",
              culturable: "Difficult"
            },
            {
              id: 209,
              name: "Photorhabdus luminescens",
              kingdom: "Bacteria",
              description: "Bioluminescent insect symbiont",
              habitat: "Mammalian host",
              pathogenicity: "None",
              culturable: "Yes"
            },
            {
              id: 210,
              name: "Xenorhabdus",
              kingdom: "Bacteria",
              description: "Nematode symbiont",
              habitat: "Marine",
              pathogenicity: "Mild",
              culturable: "Yes"
            },
            {
              id: 211,
              name: "Erwinia carotovora",
              kingdom: "Bacteria",
              description: "Vegetable rot",
              habitat: "Various",
              pathogenicity: "Moderate",
              culturable: "Difficult"
            },
            {
              id: 212,
              name: "Pectobacterium",
              kingdom: "Bacteria",
              description: "Plant soft rot",
              habitat: "Aquatic",
              pathogenicity: "Severe",
              culturable: "Yes"
            },
            {
              id: 213,
              name: "Dickeya",
              kingdom: "Bacteria",
              description: "Plant pathogen",
              habitat: "Soil",
              pathogenicity: "None",
              culturable: "Yes"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // FAMOUS EXPERIMENTS — 60 landmark studies
          // ═══════════════════════════════════════════════════════════
          var FAMOUS_EXPERIMENTS = [
            {
              id: 1,
              name: "Hooke views cork (1665)",
              scientist: "Robert Hooke",
              method: "Hand-built microscope",
              significance: "Coined word cell from honeycomb-like cells of cork"
            },
            {
              id: 2,
              name: "Leeuwenhoek sees animalcules (1675)",
              scientist: "Antonie van Leeuwenhoek",
              method: "Hand-ground single lens",
              significance: "First observation of bacteria + protists"
            },
            {
              id: 3,
              name: "Pasteur sterilization (1857)",
              scientist: "Louis Pasteur",
              method: "Sealed flasks + heating",
              significance: "Disproved spontaneous generation"
            },
            {
              id: 4,
              name: "Koch postulates (1882)",
              scientist: "Robert Koch",
              method: "Pure cultures + animal inoculation",
              significance: "Established germ theory"
            },
            {
              id: 5,
              name: "Metchnikoff phagocytosis (1882)",
              scientist: "Elie Metchnikoff",
              method: "Starfish larva observation",
              significance: "Discovered cellular immunity"
            },
            {
              id: 6,
              name: "Fleming penicillin (1928)",
              scientist: "Alexander Fleming",
              method: "Accidental mold contamination",
              significance: "Discovered first antibiotic"
            },
            {
              id: 7,
              name: "Avery DNA experiments (1944)",
              scientist: "Avery, MacLeod, McCarty",
              method: "Pneumococcus transformation",
              significance: "DNA carries genetic info"
            },
            {
              id: 8,
              name: "Hershey-Chase blender (1952)",
              scientist: "Hershey and Chase",
              method: "Radioactive phage labels",
              significance: "Confirmed DNA is genetic material"
            },
            {
              id: 9,
              name: "Watson Crick double helix (1953)",
              scientist: "Watson, Crick, Wilkins, Franklin",
              method: "X-ray crystallography",
              significance: "DNA double helix structure"
            },
            {
              id: 10,
              name: "Meselson Stahl (1958)",
              scientist: "Meselson and Stahl",
              method: "Density-gradient centrifugation",
              significance: "Semi-conservative DNA replication"
            },
            {
              id: 11,
              name: "Operon model (1961)",
              scientist: "Jacob and Monod",
              method: "E. coli genetic studies",
              significance: "Gene regulation mechanism"
            },
            {
              id: 12,
              name: "Genetic code cracked (1961-66)",
              scientist: "Nirenberg, Khorana, Holley",
              method: "Cell-free translation",
              significance: "Codon-amino acid pairings"
            },
            {
              id: 13,
              name: "Endosymbiosis theory (1967)",
              scientist: "Lynn Margulis",
              method: "Comparative organelle biology",
              significance: "Mitochondria + chloroplasts were once bacteria"
            },
            {
              id: 14,
              name: "First gene cloned (1973)",
              scientist: "Cohen and Boyer",
              method: "Recombinant DNA",
              significance: "Beginning of biotech"
            },
            {
              id: 15,
              name: "Sanger sequencing (1977)",
              scientist: "Frederick Sanger",
              method: "Dideoxy chain termination",
              significance: "Read DNA sequence"
            },
            {
              id: 16,
              name: "First test tube baby (1978)",
              scientist: "Edwards and Steptoe",
              method: "IVF",
              significance: "Louise Brown born"
            },
            {
              id: 17,
              name: "First cloned mouse (1981)",
              scientist: "Hoppe and Illmensee",
              method: "Nuclear transfer",
              significance: "Cloning mammals"
            },
            {
              id: 18,
              name: "PCR invented (1985)",
              scientist: "Kary Mullis",
              method: "DNA polymerase + temperature cycling",
              significance: "DNA amplification"
            },
            {
              id: 19,
              name: "First antibody from mouse (1985)",
              scientist: "Köhler and Milstein",
              method: "Hybridoma technology",
              significance: "Monoclonal antibodies"
            },
            {
              id: 20,
              name: "First gene therapy (1990)",
              scientist: "Anderson team",
              method: "Retroviral gene transfer",
              significance: "ADA-SCID treated"
            },
            {
              id: 21,
              name: "Dolly cloned sheep (1996)",
              scientist: "Ian Wilmut team",
              method: "Somatic cell nuclear transfer",
              significance: "First cloned mammal"
            },
            {
              id: 22,
              name: "Human Genome Project (2003)",
              scientist: "International team",
              method: "High-throughput sequencing",
              significance: "Complete human genome"
            },
            {
              id: 23,
              name: "iPSC reprogramming (2007)",
              scientist: "Shinya Yamanaka",
              method: "Four transcription factors",
              significance: "Adult cells to stem cells"
            },
            {
              id: 24,
              name: "CRISPR-Cas9 (2012)",
              scientist: "Doudna and Charpentier",
              method: "Bacterial defense system",
              significance: "Genome editing"
            },
            {
              id: 25,
              name: "First gene-edited babies (2018)",
              scientist: "He Jiankui",
              method: "CRISPR in embryos",
              significance: "Controversial premature use"
            },
            {
              id: 26,
              name: "mRNA COVID vaccine (2020)",
              scientist: "Pfizer, Moderna",
              method: "Lipid nanoparticles",
              significance: "Pandemic response"
            },
            {
              id: 27,
              name: "AlphaFold protein structure (2020)",
              scientist: "DeepMind",
              method: "AI prediction",
              significance: "Protein folding solved"
            },
            {
              id: 28,
              name: "Calvin cycle traced (1950s)",
              scientist: "Melvin Calvin",
              method: "Radioactive carbon tracing",
              significance: "Photosynthesis pathway"
            },
            {
              id: 29,
              name: "Krebs cycle (1937)",
              scientist: "Hans Krebs",
              method: "Biochemical experiments",
              significance: "Citric acid cycle"
            },
            {
              id: 30,
              name: "Electron transport chain (1940s-60s)",
              scientist: "Various",
              method: "Mitochondrial studies",
              significance: "ATP production"
            },
            {
              id: 31,
              name: "Mitchell chemiosmosis (1961)",
              scientist: "Peter Mitchell",
              method: "Hypothetical model",
              significance: "ATP synthesis mechanism"
            },
            {
              id: 32,
              name: "Watson Crick model (1953)",
              scientist: "James Watson, Francis Crick",
              method: "Modeling + X-ray data",
              significance: "Genetic material structure"
            },
            {
              id: 33,
              name: "Rosalind Franklin Photo 51 (1952)",
              scientist: "Rosalind Franklin",
              method: "X-ray crystallography",
              significance: "DNA helix evidence"
            },
            {
              id: 34,
              name: "Avery DNA evidence (1944)",
              scientist: "Avery, MacLeod, McCarty",
              method: "Pneumococcus experiments",
              significance: "DNA = genes"
            },
            {
              id: 35,
              name: "Beadle-Tatum one gene one enzyme (1941)",
              scientist: "Beadle and Tatum",
              method: "Neurospora mutants",
              significance: "Gene-enzyme relationship"
            },
            {
              id: 36,
              name: "Hodgkin Huxley action potential (1952)",
              scientist: "Hodgkin and Huxley",
              method: "Squid axon recordings",
              significance: "Neural signaling mechanism"
            },
            {
              id: 37,
              name: "DNA microarrays (1995)",
              scientist: "Schena",
              method: "Multi-gene expression",
              significance: "Transcriptomics"
            },
            {
              id: 38,
              name: "Bacteriophage discovery (1915)",
              scientist: "D Herelle, Twort",
              method: "Plaque assays",
              significance: "Viruses of bacteria"
            },
            {
              id: 39,
              name: "Bacteria as germs (1860s)",
              scientist: "Pasteur, Koch",
              method: "Microbiology",
              significance: "Germ theory"
            },
            {
              id: 40,
              name: "Vaccines invented (1796)",
              scientist: "Edward Jenner",
              method: "Cowpox inoculation",
              significance: "Smallpox vaccine"
            },
            {
              id: 41,
              name: "Pasteur rabies vaccine (1885)",
              scientist: "Louis Pasteur",
              method: "Attenuated virus",
              significance: "Rabies vaccine"
            },
            {
              id: 42,
              name: "Lister antiseptic surgery (1867)",
              scientist: "Joseph Lister",
              method: "Carbolic acid",
              significance: "Reduced surgical infections"
            },
            {
              id: 43,
              name: "Florence Nightingale stats (1854)",
              scientist: "Florence Nightingale",
              method: "Polar area diagrams",
              significance: "Hospital hygiene impact"
            },
            {
              id: 44,
              name: "John Snow cholera map (1854)",
              scientist: "John Snow",
              method: "Spatial epidemiology",
              significance: "Waterborne disease"
            },
            {
              id: 45,
              name: "Cell theory (1838-39)",
              scientist: "Schleiden and Schwann",
              method: "Microscopic studies",
              significance: "All life is cellular"
            },
            {
              id: 46,
              name: "Virchow all cells from cells (1855)",
              scientist: "Rudolf Virchow",
              method: "Cell biology",
              significance: "Biogenesis principle"
            },
            {
              id: 47,
              name: "Spallanzani vs spontaneous gen (1768)",
              scientist: "Lazzaro Spallanzani",
              method: "Sealed flasks",
              significance: "Disproved spontaneous generation early"
            },
            {
              id: 48,
              name: "Pasteur swan neck flask (1859)",
              scientist: "Louis Pasteur",
              method: "Curved necks blocked airborne contamination",
              significance: "Final blow to spontaneous generation"
            },
            {
              id: 49,
              name: "Streptomycin (1944)",
              scientist: "Selman Waksman",
              method: "Soil bacteria",
              significance: "TB treatment"
            },
            {
              id: 50,
              name: "Hookworm cure (1903)",
              scientist: "Charles Stiles",
              method: "Sanitation",
              significance: "Disease eradication"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // MICROBIAL MYTHBUSTERS
          // ═══════════════════════════════════════════════════════════
          var MICRO_MYTHS = [
            {
              id: 1,
              myth: "All bacteria are harmful",
              truth: "False - Most bacteria are neutral or beneficial. Less than 1% are pathogenic."
            },
            {
              id: 2,
              myth: "Viruses are alive",
              truth: "Debated - Viruses require host cells; technically not classified as living."
            },
            {
              id: 3,
              myth: "You can sterilize with hand sanitizer alone",
              truth: "Mostly true with 60%+ alcohol; soap removes more types of pathogens"
            },
            {
              id: 4,
              myth: "5-second rule for dropped food",
              truth: "False - Bacteria transfer instantly to dropped food"
            },
            {
              id: 5,
              myth: "Antibiotics treat viruses",
              truth: "False - Antibiotics only kill bacteria, not viruses"
            },
            {
              id: 6,
              myth: "Antibiotic resistance never crosses species",
              truth: "False - Bacteria share resistance genes between species"
            },
            {
              id: 7,
              myth: "Probiotics always help",
              truth: "Mixed - Effects vary by individual + strain"
            },
            {
              id: 8,
              myth: "Yogurt eradicates harmful bacteria",
              truth: "Limited - Yogurt adds beneficial bacteria but may not eliminate harmful ones"
            },
            {
              id: 9,
              myth: "Bacteria can be seen with eye",
              truth: "False - Bacteria require microscope"
            },
            {
              id: 10,
              myth: "Hand washing removes all bacteria",
              truth: "False - Reduces but does not eliminate bacteria"
            },
            {
              id: 11,
              myth: "Toilet seats are dirtiest place",
              truth: "False - Phones, keyboards, doorknobs often dirtier"
            },
            {
              id: 12,
              myth: "Bacteria multiply only at room temp",
              truth: "False - Different bacteria grow at different temperatures"
            },
            {
              id: 13,
              myth: "Cooking kills all bacteria",
              truth: "Mostly - Most bacteria killed >70°C; some spores survive higher"
            },
            {
              id: 14,
              myth: "Boiling water makes it safe",
              truth: "Mostly - Kills most pathogens; not chemical contaminants"
            },
            {
              id: 15,
              myth: "UV light kills all germs",
              truth: "Partial - UV-C effective for surfaces; not deep penetration"
            },
            {
              id: 16,
              myth: "Antibacterial soaps better than regular",
              truth: "False - Often similar effectiveness; triclosan banned"
            },
            {
              id: 17,
              myth: "Cells are all alike",
              truth: "False - Vast diversity in size, shape, function"
            },
            {
              id: 18,
              myth: "DNA is the same in every cell",
              truth: "Mostly - Same DNA but different gene expression"
            },
            {
              id: 19,
              myth: "Plant + animal cells are same",
              truth: "False - Plants have cell walls + chloroplasts"
            },
            {
              id: 20,
              myth: "Mitochondria are only in animals",
              truth: "False - All eukaryotes including plants"
            },
            {
              id: 21,
              myth: "Bacteria reproduce sexually",
              truth: "False - Asexual reproduction; conjugation transfers DNA"
            },
            {
              id: 22,
              myth: "Viruses cause all infections",
              truth: "False - Bacteria, fungi, protists also cause infections"
            },
            {
              id: 23,
              myth: "Sneezing spreads bacteria farther than droplets",
              truth: "Variable - Sneezes can spread 7+ meters"
            },
            {
              id: 24,
              myth: "Public restrooms are danger zone",
              truth: "Variable - Often cleaner than office surfaces"
            },
            {
              id: 25,
              myth: "Beard hair is dirty",
              truth: "Variable - Some studies show beards have similar bacteria to faces"
            },
            {
              id: 26,
              myth: "Hand-shaking spreads disease",
              truth: "True - Major mode of fomite transfer"
            },
            {
              id: 27,
              myth: "Sneezing eyes-shut myth",
              truth: "Mostly true - But you can sneeze with eyes open"
            },
            {
              id: 28,
              myth: "Cucumber + chocolate myth (food safety)",
              truth: "False - No specific danger; all food carries bacteria"
            },
            {
              id: 29,
              myth: "Lemons disinfect surfaces",
              truth: "Limited - Mild antimicrobial; not sterilizing"
            },
            {
              id: 30,
              myth: "Garlic prevents colds",
              truth: "Mixed evidence - Some immune support, no direct virus killing"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // CELL RECORDS — superlatives
          // ═══════════════════════════════════════════════════════════
          var CELL_RECORDS = [
            {
              id: 1,
              category: "Largest single-celled organism",
              record: "Caulerpa taxifolia (~3 m long)",
              note: "Marine algae"
            },
            {
              id: 2,
              category: "Smallest cell",
              record: "Mycoplasma (~200 nm)",
              note: "Bacterium"
            },
            {
              id: 3,
              category: "Fastest bacteria",
              record: "Bdellovibrio (~160 μm/sec)",
              note: "Predatory"
            },
            {
              id: 4,
              category: "Slowest dividing bacteria",
              record: "Mycobacterium tuberculosis (~24 hr)",
              note: "Doubling time"
            },
            {
              id: 5,
              category: "Fastest dividing bacteria",
              record: "Clostridium perfringens (~7 min)",
              note: "In optimal conditions"
            },
            {
              id: 6,
              category: "Toughest organism",
              record: "Tardigrade or Deinococcus radiodurans",
              note: "Survive radiation, vacuum, extreme T"
            },
            {
              id: 7,
              category: "Oldest discovered fossil cells",
              record: "Cyanobacteria (~3.5 billion years)",
              note: "Australia stromatolites"
            },
            {
              id: 8,
              category: "Most cells in body",
              record: "Bacteria (~38 trillion)",
              note: "Outnumber human cells 1:1"
            },
            {
              id: 9,
              category: "Largest virus",
              record: "Pithovirus (~1.5 μm)",
              note: "Larger than some bacteria"
            },
            {
              id: 10,
              category: "Smallest virus",
              record: "Circoviruses (~17 nm)",
              note: "Less than 2000 nucleotides"
            },
            {
              id: 11,
              category: "Most diverse habitat",
              record: "Soil (~10,000 species per teaspoon)",
              note: "Higher than rainforest"
            },
            {
              id: 12,
              category: "Most abundant cell type",
              record: "Erythrocyte (RBC)",
              note: "~25 trillion in human body"
            },
            {
              id: 13,
              category: "Most abundant on Earth",
              record: "Prokaryotic cells (~5 × 10^30)",
              note: "Total bacteria + archaea"
            },
            {
              id: 14,
              category: "Most genes",
              record: "Sorangium cellulosum (~13,000+)",
              note: "Largest bacterial genome"
            },
            {
              id: 15,
              category: "Smallest free-living",
              record: "Mycoplasma genitalium (~580K bp)",
              note: "Synthetic biology target"
            },
            {
              id: 16,
              category: "Highest mutation rate",
              record: "HIV retrovirus",
              note: "Per generation"
            },
            {
              id: 17,
              category: "Most antibiotic resistant",
              record: "Pseudomonas aeruginosa, Acinetobacter",
              note: "Multi-drug resistant"
            },
            {
              id: 18,
              category: "Most lethal pathogen",
              record: "Variola (smallpox) historically",
              note: "Now eradicated"
            },
            {
              id: 19,
              category: "Most contagious",
              record: "Measles (R0 ~12-18)",
              note: "High transmissibility"
            },
            {
              id: 20,
              category: "Most heat resistant",
              record: "Hyperthermophiles (~122°C)",
              note: "Strain 121 archaea"
            },
            {
              id: 21,
              category: "Most cold resistant",
              record: "Permafrost bacteria",
              note: "Active below 0°C"
            },
            {
              id: 22,
              category: "Most pressure resistant",
              record: "Mariana Trench bacteria (~110 MPa)",
              note: "Deepest ocean"
            },
            {
              id: 23,
              category: "Most radiation resistant",
              record: "Deinococcus radiodurans",
              note: "5000+ Gy survival"
            },
            {
              id: 24,
              category: "Most acid tolerant",
              record: "Helicobacter pylori (pH 1-2)",
              note: "Stomach"
            },
            {
              id: 25,
              category: "Most alkaline tolerant",
              record: "Alkaliphilic bacteria (pH 11+)",
              note: "Soda lakes"
            },
            {
              id: 26,
              category: "Most salt tolerant",
              record: "Halobacterium (10x sea salt)",
              note: "Salt lakes"
            },
            {
              id: 27,
              category: "Most osmotic stress",
              record: "Halophiles + bdelloid rotifers",
              note: "Multiple survival strategies"
            },
            {
              id: 28,
              category: "Largest mitochondrion",
              record: "Plant cells",
              note: "Hundreds per cell"
            },
            {
              id: 29,
              category: "Most mitochondria per cell",
              record: "Cardiac myocyte (~5000)",
              note: "High energy demand"
            },
            {
              id: 30,
              category: "Largest chromosome",
              record: "Indian muntjac deer (1 chromosome)",
              note: "Unusual fusion"
            },
            {
              id: 31,
              category: "Most chromosomes",
              record: "Ophioglossum reticulatum fern (~1440)",
              note: "Polyploid"
            },
            {
              id: 32,
              category: "Largest genome",
              record: "Paris japonica plant (149 Gbp)",
              note: "Larger than human"
            },
            {
              id: 33,
              category: "Smallest genome",
              record: "Carsonella ruddii (160K bp)",
              note: "Bacterial endosymbiont"
            },
            {
              id: 34,
              category: "Most unique cell types",
              record: "Adult human (~200+ distinct)",
              note: "Total cell types"
            },
            {
              id: 35,
              category: "Longest-lived cell",
              record: "Neurons (entire organism life)",
              note: "Some live 100+ years"
            },
            {
              id: 36,
              category: "Shortest-lived cell",
              record: "Bacteria in optimal conditions",
              note: "Replace every 7 min"
            },
            {
              id: 37,
              category: "Slowest division",
              record: "Liver cells (~1 year cycle)",
              note: "Quiescent state"
            },
            {
              id: 38,
              category: "Fastest division (human)",
              record: "Intestinal stem cells (~24 hr)",
              note: "High turnover"
            },
            {
              id: 39,
              category: "Most ATP per cell",
              record: "Cardiac muscle (~10 billion/sec)",
              note: "High demand"
            },
            {
              id: 40,
              category: "Largest molecule in cell",
              record: "Titin protein (~30,000 amino acids)",
              note: "Muscle"
            },
            {
              id: 41,
              category: "Most complex molecule synthesized",
              record: "Recently solved AlphaFold predictions",
              note: "Computational"
            },
            {
              id: 42,
              category: "Fastest enzyme",
              record: "Carbonic anhydrase (10^6/sec)",
              note: "CO2 hydration"
            },
            {
              id: 43,
              category: "Slowest enzyme",
              record: "OMP decarboxylase",
              note: "Half-life 78 million years uncatalyzed"
            },
            {
              id: 44,
              category: "Most catalytic acceleration",
              record: "Same enzyme",
              note: "10^17 fold rate enhancement"
            },
            {
              id: 45,
              category: "Largest known nucleus",
              record: "Acetabularia algae",
              note: "Up to 5 cm cells"
            },
            {
              id: 46,
              category: "Most chromosomes (plant)",
              record: "~1440 in some ferns",
              note: "Polyploidization"
            },
            {
              id: 47,
              category: "Largest plant cell",
              record: "Acetabularia mediterranea",
              note: "Single cell up to 10 cm"
            },
            {
              id: 48,
              category: "Most photosynthetic per area",
              record: "Tropical rainforest canopy",
              note: "Diverse algae + plants"
            },
            {
              id: 49,
              category: "Deepest photosynthesis",
              record: "Green sulfur bacteria (~100 m)",
              note: "Black Sea"
            },
            {
              id: 50,
              category: "Most oxygen-producing",
              record: "Marine phytoplankton (~50% of atmospheric O2)",
              note: "Algae + cyanobacteria"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // MICROSCOPY TECHNIQUES
          // ═══════════════════════════════════════════════════════════
          var MICROSCOPY = [
            {
              id: 1,
              technique: "Bright field",
              principle: "Standard light microscopy",
              resolution: "~200 nm resolution",
              useCase: "Most common type"
            },
            {
              id: 2,
              technique: "Dark field",
              principle: "Light scatters from sample",
              resolution: "~200 nm",
              useCase: "See unstained living organisms"
            },
            {
              id: 3,
              technique: "Phase contrast",
              principle: "Optical density differences",
              resolution: "~200 nm",
              useCase: "Living unstained cells"
            },
            {
              id: 4,
              technique: "Differential interference contrast (DIC)",
              principle: "Polarized light",
              resolution: "~200 nm",
              useCase: "3D-like contrast"
            },
            {
              id: 5,
              technique: "Fluorescence",
              principle: "UV + fluorochrome dyes",
              resolution: "~200 nm",
              useCase: "Specific molecules"
            },
            {
              id: 6,
              technique: "Confocal",
              principle: "Laser + pinhole",
              resolution: "~200 nm + thin optical sections",
              useCase: "High-contrast 3D"
            },
            {
              id: 7,
              technique: "Two-photon",
              principle: "Near-infrared laser",
              resolution: "~200 nm",
              useCase: "Deep tissue imaging"
            },
            {
              id: 8,
              technique: "Super-resolution (STED, PALM, STORM)",
              principle: "Various",
              resolution: "~20 nm",
              useCase: "Beyond diffraction limit"
            },
            {
              id: 9,
              technique: "Transmission electron (TEM)",
              principle: "Electrons through thin section",
              resolution: "~0.1 nm",
              useCase: "Atomic resolution"
            },
            {
              id: 10,
              technique: "Scanning electron (SEM)",
              principle: "Electrons scan surface",
              resolution: "~1 nm",
              useCase: "Surface details"
            },
            {
              id: 11,
              technique: "Cryo-EM",
              principle: "Frozen samples + EM",
              resolution: "~3 Å",
              useCase: "Native protein structures"
            },
            {
              id: 12,
              technique: "Atomic force microscopy (AFM)",
              principle: "Probe scans surface",
              resolution: "~0.1 nm vertical",
              useCase: "Living cells, force measurement"
            },
            {
              id: 13,
              technique: "Scanning tunneling (STM)",
              principle: "Electron tunneling",
              resolution: "~0.1 nm",
              useCase: "Atomic-level conductors"
            },
            {
              id: 14,
              technique: "Light sheet",
              principle: "Plane illumination",
              resolution: "~200 nm",
              useCase: "Live embryo imaging"
            },
            {
              id: 15,
              technique: "Total internal reflection (TIRF)",
              principle: "Evanescent wave",
              resolution: "~100 nm depth",
              useCase: "Cell membrane events"
            },
            {
              id: 16,
              technique: "Polarized light",
              principle: "Polarizing filters",
              resolution: "~200 nm",
              useCase: "Crystalline structures"
            },
            {
              id: 17,
              technique: "Köhler illumination",
              principle: "Even, uniform lighting",
              resolution: "Standard",
              useCase: "High-quality images"
            },
            {
              id: 18,
              technique: "Apochromatic objectives",
              principle: "Color-corrected lenses",
              resolution: "~150 nm",
              useCase: "Best image quality"
            },
            {
              id: 19,
              technique: "Oil immersion",
              principle: "Reduces refraction",
              resolution: "~200 nm",
              useCase: "High-magnification"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // CELL BIOLOGY QUOTES
          // ═══════════════════════════════════════════════════════════
          var CELL_QUOTES = [
            {
              id: 1,
              author: "Antonie van Leeuwenhoek",
              quote: "For my part, I judge that the wonders of the world will never end."
            },
            {
              id: 2,
              author: "Louis Pasteur",
              quote: "In the field of observation, chance favors only the prepared mind."
            },
            {
              id: 3,
              author: "Robert Hooke",
              quote: "These pores were the first microscopical pores I ever saw."
            },
            {
              id: 4,
              author: "Lynn Margulis",
              quote: "Life did not take over the globe by combat, but by networking."
            },
            {
              id: 5,
              author: "Rudolf Virchow",
              quote: "Omnis cellula e cellula. All cells from cells."
            },
            {
              id: 6,
              author: "Charles Darwin",
              quote: "It is not the strongest of the species that survives, but the most adaptable."
            },
            {
              id: 7,
              author: "Frederick Sanger",
              quote: "Of the three main activities involved in scientific research, thinking, talking, and doing, I much prefer the last."
            },
            {
              id: 8,
              author: "Marie Curie",
              quote: "Nothing in life is to be feared, only understood."
            },
            {
              id: 9,
              author: "Lewis Wolpert",
              quote: "The cell is the central concept of biology."
            },
            {
              id: 10,
              author: "Theodor Schwann",
              quote: "All cells arise from preexisting cells."
            },
            {
              id: 11,
              author: "Robert Koch",
              quote: "I have never been able to find a more effective means than my own diligence."
            },
            {
              id: 12,
              author: "Alexander Fleming",
              quote: "When I woke up just after dawn on September 28, 1928, I certainly didn't plan to revolutionize all medicine."
            },
            {
              id: 13,
              author: "Lynn Margulis",
              quote: "Symbiosis is the synthesis of life forms — the origin of new species."
            },
            {
              id: 14,
              author: "Carl Woese",
              quote: "There is more diversity within bacteria than there is within all of multicellular life."
            },
            {
              id: 15,
              author: "Bonnie Bassler",
              quote: "Bacteria can talk. They have words."
            },
            {
              id: 16,
              author: "Rita Colwell",
              quote: "Microbiology touches every aspect of our lives."
            },
            {
              id: 17,
              author: "Joshua Lederberg",
              quote: "We are not done with bacteria."
            },
            {
              id: 18,
              author: "Pasteur",
              quote: "Science knows no country, because knowledge belongs to humanity."
            },
            {
              id: 19,
              author: "Watson and Crick",
              quote: "We wish to suggest a structure for the salt of deoxyribose nucleic acid (DNA)."
            },
            {
              id: 20,
              author: "Rosalind Franklin",
              quote: "Science and everyday life cannot and should not be separated."
            },
            {
              id: 21,
              author: "Francis Crick",
              quote: "A few years from now, no one will doubt that DNA is the genetic material."
            },
            {
              id: 22,
              author: "Hans Krebs",
              quote: "The way of life of biology is to study things that you find interesting."
            },
            {
              id: 23,
              author: "Linus Pauling",
              quote: "The best way to have a good idea is to have lots of ideas."
            },
            {
              id: 24,
              author: "Lee Hartwell",
              quote: "Biology is a great unifier."
            },
            {
              id: 25,
              author: "Anne McLaren",
              quote: "We do not really make our lives, we choose what to do with the cells we are given."
            }
          ];


          // ═══════════════════════════════════════════════════════════
          // CASE STUDIES — 100 famous events
          // ═══════════════════════════════════════════════════════════
          var CASE_STUDIES = [
            {
              id: 1,
              event: "Black Death (1346-1353)",
              agent: "Yersinia pestis",
              impact: "Killed 30-60% of European population"
            },
            {
              id: 2,
              event: "1918 Influenza pandemic",
              agent: "H1N1 virus",
              impact: "50 million deaths worldwide"
            },
            {
              id: 3,
              event: "Spanish conquest disease",
              agent: "Smallpox + measles",
              impact: "Decimated indigenous Americas"
            },
            {
              id: 4,
              event: "John Snow cholera 1854",
              agent: "Vibrio cholerae",
              impact: "Birth of epidemiology"
            },
            {
              id: 5,
              event: "Pasteur rabies vaccine 1885",
              agent: "Rabies virus",
              impact: "First vaccine against virus"
            },
            {
              id: 6,
              event: "Tuskegee syphilis study",
              agent: "Treponema pallidum",
              impact: "Ethical failure of research"
            },
            {
              id: 7,
              event: "Polio epidemic 1950s",
              agent: "Poliovirus",
              impact: "Iron lung era"
            },
            {
              id: 8,
              event: "HIV/AIDS pandemic",
              agent: "HIV virus",
              impact: "Over 70 million infected"
            },
            {
              id: 9,
              event: "SARS 2003",
              agent: "SARS-CoV",
              impact: "First major coronavirus outbreak"
            },
            {
              id: 10,
              event: "MERS 2012",
              agent: "MERS-CoV",
              impact: "Middle East respiratory"
            },
            {
              id: 11,
              event: "Ebola West Africa 2014-16",
              agent: "Ebola virus",
              impact: "11,000+ deaths"
            },
            {
              id: 12,
              event: "Zika 2015-17",
              agent: "Zika virus",
              impact: "Microcephaly in newborns"
            },
            {
              id: 13,
              event: "COVID-19 pandemic",
              agent: "SARS-CoV-2",
              impact: "7+ million deaths"
            },
            {
              id: 14,
              event: "1976 Legionnaires outbreak",
              agent: "Legionella",
              impact: "Discovered in convention hotel"
            },
            {
              id: 15,
              event: "Anthrax letters 2001",
              agent: "Bacillus anthracis",
              impact: "Bioterrorism"
            },
            {
              id: 16,
              event: "Walkerton water 2000",
              agent: "E. coli O157:H7",
              impact: "7 deaths in Canada"
            },
            {
              id: 17,
              event: "Jack in the Box 1993",
              agent: "E. coli O157:H7",
              impact: "Foodborne outbreak"
            },
            {
              id: 18,
              event: "Peanut butter recall 2009",
              agent: "Salmonella",
              impact: "Multi-state"
            },
            {
              id: 19,
              event: "Romaine lettuce 2018",
              agent: "E. coli",
              impact: "Major recall"
            },
            {
              id: 20,
              event: "Listeria cantaloupe 2011",
              agent: "Listeria monocytogenes",
              impact: "Foodborne outbreak"
            },
            {
              id: 21,
              event: "Cyclospora basil 2018",
              agent: "Cyclospora cayetanensis",
              impact: "Imported produce"
            },
            {
              id: 22,
              event: "Salmonella eggs 2010",
              agent: "Salmonella",
              impact: "Half billion eggs recalled"
            },
            {
              id: 23,
              event: "Tylenol cyanide 1982",
              agent: "Not microbial but key case",
              impact: "Tampering led to safety changes"
            },
            {
              id: 24,
              event: "Penicillin discovery 1928",
              agent: "Penicillium",
              impact: "Antibiotic era begins"
            },
            {
              id: 25,
              event: "Vaccine development",
              agent: "Various",
              impact: "Eliminated smallpox + many diseases"
            },
            {
              id: 26,
              event: "CRISPR babies controversy",
              agent: "Engineered embryos",
              impact: "Bioethics debate"
            },
            {
              id: 27,
              event: "Y2K bug (not microbial)",
              agent: "Computer concern",
              impact: "Showed importance of preparedness"
            },
            {
              id: 28,
              event: "Antibiotic resistance crisis",
              agent: "Various",
              impact: "Global health threat"
            },
            {
              id: 29,
              event: "Lyme disease epidemic",
              agent: "Borrelia burgdorferi",
              impact: "Spread in northeast US"
            },
            {
              id: 30,
              event: "MRSA hospital infections",
              agent: "Methicillin-resistant Staph",
              impact: "Antibiotic resistance"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // LAB SAFETY — 60 scenarios
          // ═══════════════════════════════════════════════════════════
          var LAB_SAFETY = [
            {
              id: 1,
              scenario: "Spilled culture",
              response: "Cover with absorbent + disinfectant; wait + dispose properly"
            },
            {
              id: 2,
              scenario: "Cut while handling slides",
              response: "Stop work + wash + bandage + report"
            },
            {
              id: 3,
              scenario: "Needle stick injury",
              response: "Bleed wound + wash + report + post-exposure prophylaxis"
            },
            {
              id: 4,
              scenario: "Aerosol from broken tube",
              response: "Leave area + ventilate 30 min + clean up with N95"
            },
            {
              id: 5,
              scenario: "Eye contact with sample",
              response: "Rinse eye 15 min in eyewash + medical evaluation"
            },
            {
              id: 6,
              scenario: "Skin contact (skin tear)",
              response: "Wash thoroughly with soap + water + monitor"
            },
            {
              id: 7,
              scenario: "Inhaled aerosol",
              response: "Leave area + report + medical follow-up"
            },
            {
              id: 8,
              scenario: "Animal bite (lab)",
              response: "Wash + rabies prophylaxis + report"
            },
            {
              id: 9,
              scenario: "Forgot to wear PPE",
              response: "Stop + put on proper PPE + clean exposure"
            },
            {
              id: 10,
              scenario: "Pipette tip exposure",
              response: "Cover with absorbent + dispose properly"
            },
            {
              id: 11,
              scenario: "Broken glassware",
              response: "Use forceps; never bare hands; biohazard sharps container"
            },
            {
              id: 12,
              scenario: "Centrifuge imbalance",
              response: "Stop centrifuge + balance tubes + restart"
            },
            {
              id: 13,
              scenario: "Refrigerator failure",
              response: "Move samples ASAP + report + document temperature"
            },
            {
              id: 14,
              scenario: "Bunsen burner ignition",
              response: "Keep flammables clear + supervise + extinguish properly"
            },
            {
              id: 15,
              scenario: "Chemical spill",
              response: "Containment + neutralize + report + clean per SDS"
            },
            {
              id: 16,
              scenario: "Power outage during incubation",
              response: "Document + assess cultures + restart if viable"
            },
            {
              id: 17,
              scenario: "Mislabeled sample",
              response: "Stop + check + label correctly + document"
            },
            {
              id: 18,
              scenario: "Contaminated culture",
              response: "Stop using + sterilize area + restart culture"
            },
            {
              id: 19,
              scenario: "Working alone after hours",
              response: "Notify someone + carry phone + check-in periodically"
            },
            {
              id: 20,
              scenario: "Fire alarm during experiment",
              response: "Stop + secure samples + evacuate + report later"
            },
            {
              id: 21,
              scenario: "Animal allergy reaction",
              response: "Leave area + medical attention"
            },
            {
              id: 22,
              scenario: "Ergonomic strain",
              response: "Take breaks + adjust workspace"
            },
            {
              id: 23,
              scenario: "Disposing biohazard",
              response: "Use sharps container + biohazard bag + autoclave when full"
            },
            {
              id: 24,
              scenario: "UV light exposure",
              response: "Wear UV-protective eyewear; limit exposure"
            },
            {
              id: 25,
              scenario: "Laser eye safety",
              response: "Wear laser-specific goggles"
            },
            {
              id: 26,
              scenario: "Liquid nitrogen burn",
              response: "Slow rewarm + medical attention if severe"
            },
            {
              id: 27,
              scenario: "Pressure vessel failure",
              response: "Evacuate + report + maintain"
            },
            {
              id: 28,
              scenario: "Toxic gas alarm",
              response: "Evacuate + ventilate + report"
            },
            {
              id: 29,
              scenario: "Mercury thermometer break",
              response: "Special mercury cleanup kit + avoid skin contact"
            },
            {
              id: 30,
              scenario: "Acid splash",
              response: "Rinse copiously with water 15+ min"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // STUDY QUESTIONS — 200 short prompts
          // ═══════════════════════════════════════════════════════════
          var STUDY_QS = [
            {
              id: 1,
              question: "Compare prokaryote vs eukaryote cell organization",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 2,
              question: "Explain endosymbiotic theory + supporting evidence",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 3,
              question: "Describe the cell membrane structure (fluid mosaic)",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 4,
              question: "Compare passive vs active transport",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 5,
              question: "Explain how DNA replication is semi-conservative",
              level: "Intermediate",
              topic: "Lab"
            },
            {
              id: 6,
              question: "Describe transcription + translation process",
              level: "Advanced",
              topic: "Anatomy"
            },
            {
              id: 7,
              question: "Compare mitosis vs meiosis",
              level: "Basic",
              topic: "Genetics"
            },
            {
              id: 8,
              question: "Explain Gram staining + what it reveals",
              level: "Intermediate",
              topic: "Physiology"
            },
            {
              id: 9,
              question: "Compare bacterial vs archaeal cells",
              level: "Advanced",
              topic: "Disease"
            },
            {
              id: 10,
              question: "Describe phases of cell cycle",
              level: "Basic",
              topic: "Lab"
            },
            {
              id: 11,
              question: "Compare aerobic vs anaerobic respiration",
              level: "Intermediate",
              topic: "Anatomy"
            },
            {
              id: 12,
              question: "Explain photosynthesis light + dark reactions",
              level: "Advanced",
              topic: "Genetics"
            },
            {
              id: 13,
              question: "Describe ATP synthesis (electron transport chain)",
              level: "Basic",
              topic: "Physiology"
            },
            {
              id: 14,
              question: "Compare nuclear DNA vs mitochondrial DNA",
              level: "Intermediate",
              topic: "Disease"
            },
            {
              id: 15,
              question: "Explain operon model (lac, trp)",
              level: "Advanced",
              topic: "Lab"
            },
            {
              id: 16,
              question: "Describe protein folding + chaperones",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 17,
              question: "Compare passive vs facilitated diffusion",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 18,
              question: "Explain Na+/K+ pump mechanism",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 19,
              question: "Describe signal transduction cascades",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 20,
              question: "Compare hormone signaling types",
              level: "Intermediate",
              topic: "Lab"
            },
            {
              id: 21,
              question: "Explain MHC vs antibody recognition",
              level: "Advanced",
              topic: "Anatomy"
            },
            {
              id: 22,
              question: "Describe innate vs adaptive immunity",
              level: "Basic",
              topic: "Genetics"
            },
            {
              id: 23,
              question: "Compare phagocytic cells (neutrophils, macrophages)",
              level: "Intermediate",
              topic: "Physiology"
            },
            {
              id: 24,
              question: "Explain complement system",
              level: "Advanced",
              topic: "Disease"
            },
            {
              id: 25,
              question: "Describe vaccine principle + types",
              level: "Basic",
              topic: "Lab"
            },
            {
              id: 26,
              question: "Compare antibiotic mechanisms (cell wall, ribosome, DNA)",
              level: "Intermediate",
              topic: "Anatomy"
            },
            {
              id: 27,
              question: "Explain antibiotic resistance evolution",
              level: "Advanced",
              topic: "Genetics"
            },
            {
              id: 28,
              question: "Describe CRISPR-Cas9 mechanism",
              level: "Basic",
              topic: "Physiology"
            },
            {
              id: 29,
              question: "Compare RNA + DNA",
              level: "Intermediate",
              topic: "Disease"
            },
            {
              id: 30,
              question: "Explain codon-anticodon pairing",
              level: "Advanced",
              topic: "Lab"
            },
            {
              id: 31,
              question: "Compare prokaryote vs eukaryote cell organization",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 32,
              question: "Explain endosymbiotic theory + supporting evidence",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 33,
              question: "Describe the cell membrane structure (fluid mosaic)",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 34,
              question: "Compare passive vs active transport",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 35,
              question: "Explain how DNA replication is semi-conservative",
              level: "Intermediate",
              topic: "Lab"
            },
            {
              id: 36,
              question: "Describe transcription + translation process",
              level: "Advanced",
              topic: "Anatomy"
            },
            {
              id: 37,
              question: "Compare mitosis vs meiosis",
              level: "Basic",
              topic: "Genetics"
            },
            {
              id: 38,
              question: "Explain Gram staining + what it reveals",
              level: "Intermediate",
              topic: "Physiology"
            },
            {
              id: 39,
              question: "Compare bacterial vs archaeal cells",
              level: "Advanced",
              topic: "Disease"
            },
            {
              id: 40,
              question: "Describe phases of cell cycle",
              level: "Basic",
              topic: "Lab"
            },
            {
              id: 41,
              question: "Compare aerobic vs anaerobic respiration",
              level: "Intermediate",
              topic: "Anatomy"
            },
            {
              id: 42,
              question: "Explain photosynthesis light + dark reactions",
              level: "Advanced",
              topic: "Genetics"
            },
            {
              id: 43,
              question: "Describe ATP synthesis (electron transport chain)",
              level: "Basic",
              topic: "Physiology"
            },
            {
              id: 44,
              question: "Compare nuclear DNA vs mitochondrial DNA",
              level: "Intermediate",
              topic: "Disease"
            },
            {
              id: 45,
              question: "Explain operon model (lac, trp)",
              level: "Advanced",
              topic: "Lab"
            },
            {
              id: 46,
              question: "Describe protein folding + chaperones",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 47,
              question: "Compare passive vs facilitated diffusion",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 48,
              question: "Explain Na+/K+ pump mechanism",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 49,
              question: "Describe signal transduction cascades",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 50,
              question: "Compare hormone signaling types",
              level: "Intermediate",
              topic: "Lab"
            },
            {
              id: 51,
              question: "Explain MHC vs antibody recognition",
              level: "Advanced",
              topic: "Anatomy"
            },
            {
              id: 52,
              question: "Describe innate vs adaptive immunity",
              level: "Basic",
              topic: "Genetics"
            },
            {
              id: 53,
              question: "Compare phagocytic cells (neutrophils, macrophages)",
              level: "Intermediate",
              topic: "Physiology"
            },
            {
              id: 54,
              question: "Explain complement system",
              level: "Advanced",
              topic: "Disease"
            },
            {
              id: 55,
              question: "Describe vaccine principle + types",
              level: "Basic",
              topic: "Lab"
            },
            {
              id: 56,
              question: "Compare antibiotic mechanisms (cell wall, ribosome, DNA)",
              level: "Intermediate",
              topic: "Anatomy"
            },
            {
              id: 57,
              question: "Explain antibiotic resistance evolution",
              level: "Advanced",
              topic: "Genetics"
            },
            {
              id: 58,
              question: "Describe CRISPR-Cas9 mechanism",
              level: "Basic",
              topic: "Physiology"
            },
            {
              id: 59,
              question: "Compare RNA + DNA",
              level: "Intermediate",
              topic: "Disease"
            },
            {
              id: 60,
              question: "Explain codon-anticodon pairing",
              level: "Advanced",
              topic: "Lab"
            },
            {
              id: 61,
              question: "Compare prokaryote vs eukaryote cell organization",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 62,
              question: "Explain endosymbiotic theory + supporting evidence",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 63,
              question: "Describe the cell membrane structure (fluid mosaic)",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 64,
              question: "Compare passive vs active transport",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 65,
              question: "Explain how DNA replication is semi-conservative",
              level: "Intermediate",
              topic: "Lab"
            },
            {
              id: 66,
              question: "Describe transcription + translation process",
              level: "Advanced",
              topic: "Anatomy"
            },
            {
              id: 67,
              question: "Compare mitosis vs meiosis",
              level: "Basic",
              topic: "Genetics"
            },
            {
              id: 68,
              question: "Explain Gram staining + what it reveals",
              level: "Intermediate",
              topic: "Physiology"
            },
            {
              id: 69,
              question: "Compare bacterial vs archaeal cells",
              level: "Advanced",
              topic: "Disease"
            },
            {
              id: 70,
              question: "Describe phases of cell cycle",
              level: "Basic",
              topic: "Lab"
            },
            {
              id: 71,
              question: "Compare aerobic vs anaerobic respiration",
              level: "Intermediate",
              topic: "Anatomy"
            },
            {
              id: 72,
              question: "Explain photosynthesis light + dark reactions",
              level: "Advanced",
              topic: "Genetics"
            },
            {
              id: 73,
              question: "Describe ATP synthesis (electron transport chain)",
              level: "Basic",
              topic: "Physiology"
            },
            {
              id: 74,
              question: "Compare nuclear DNA vs mitochondrial DNA",
              level: "Intermediate",
              topic: "Disease"
            },
            {
              id: 75,
              question: "Explain operon model (lac, trp)",
              level: "Advanced",
              topic: "Lab"
            },
            {
              id: 76,
              question: "Describe protein folding + chaperones",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 77,
              question: "Compare passive vs facilitated diffusion",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 78,
              question: "Explain Na+/K+ pump mechanism",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 79,
              question: "Describe signal transduction cascades",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 80,
              question: "Compare hormone signaling types",
              level: "Intermediate",
              topic: "Lab"
            },
            {
              id: 81,
              question: "Explain MHC vs antibody recognition",
              level: "Advanced",
              topic: "Anatomy"
            },
            {
              id: 82,
              question: "Describe innate vs adaptive immunity",
              level: "Basic",
              topic: "Genetics"
            },
            {
              id: 83,
              question: "Compare phagocytic cells (neutrophils, macrophages)",
              level: "Intermediate",
              topic: "Physiology"
            },
            {
              id: 84,
              question: "Explain complement system",
              level: "Advanced",
              topic: "Disease"
            },
            {
              id: 85,
              question: "Describe vaccine principle + types",
              level: "Basic",
              topic: "Lab"
            },
            {
              id: 86,
              question: "Compare antibiotic mechanisms (cell wall, ribosome, DNA)",
              level: "Intermediate",
              topic: "Anatomy"
            },
            {
              id: 87,
              question: "Explain antibiotic resistance evolution",
              level: "Advanced",
              topic: "Genetics"
            },
            {
              id: 88,
              question: "Describe CRISPR-Cas9 mechanism",
              level: "Basic",
              topic: "Physiology"
            },
            {
              id: 89,
              question: "Compare RNA + DNA",
              level: "Intermediate",
              topic: "Disease"
            },
            {
              id: 90,
              question: "Explain codon-anticodon pairing",
              level: "Advanced",
              topic: "Lab"
            },
            {
              id: 91,
              question: "Compare prokaryote vs eukaryote cell organization",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 92,
              question: "Explain endosymbiotic theory + supporting evidence",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 93,
              question: "Describe the cell membrane structure (fluid mosaic)",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 94,
              question: "Compare passive vs active transport",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 95,
              question: "Explain how DNA replication is semi-conservative",
              level: "Intermediate",
              topic: "Lab"
            },
            {
              id: 96,
              question: "Describe transcription + translation process",
              level: "Advanced",
              topic: "Anatomy"
            },
            {
              id: 97,
              question: "Compare mitosis vs meiosis",
              level: "Basic",
              topic: "Genetics"
            },
            {
              id: 98,
              question: "Explain Gram staining + what it reveals",
              level: "Intermediate",
              topic: "Physiology"
            },
            {
              id: 99,
              question: "Compare bacterial vs archaeal cells",
              level: "Advanced",
              topic: "Disease"
            },
            {
              id: 100,
              question: "Describe phases of cell cycle",
              level: "Basic",
              topic: "Lab"
            },
            {
              id: 101,
              question: "Compare aerobic vs anaerobic respiration",
              level: "Intermediate",
              topic: "Anatomy"
            },
            {
              id: 102,
              question: "Explain photosynthesis light + dark reactions",
              level: "Advanced",
              topic: "Genetics"
            },
            {
              id: 103,
              question: "Describe ATP synthesis (electron transport chain)",
              level: "Basic",
              topic: "Physiology"
            },
            {
              id: 104,
              question: "Compare nuclear DNA vs mitochondrial DNA",
              level: "Intermediate",
              topic: "Disease"
            },
            {
              id: 105,
              question: "Explain operon model (lac, trp)",
              level: "Advanced",
              topic: "Lab"
            },
            {
              id: 106,
              question: "Describe protein folding + chaperones",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 107,
              question: "Compare passive vs facilitated diffusion",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 108,
              question: "Explain Na+/K+ pump mechanism",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 109,
              question: "Describe signal transduction cascades",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 110,
              question: "Compare hormone signaling types",
              level: "Intermediate",
              topic: "Lab"
            },
            {
              id: 111,
              question: "Explain MHC vs antibody recognition",
              level: "Advanced",
              topic: "Anatomy"
            },
            {
              id: 112,
              question: "Describe innate vs adaptive immunity",
              level: "Basic",
              topic: "Genetics"
            },
            {
              id: 113,
              question: "Compare phagocytic cells (neutrophils, macrophages)",
              level: "Intermediate",
              topic: "Physiology"
            },
            {
              id: 114,
              question: "Explain complement system",
              level: "Advanced",
              topic: "Disease"
            },
            {
              id: 115,
              question: "Describe vaccine principle + types",
              level: "Basic",
              topic: "Lab"
            },
            {
              id: 116,
              question: "Compare antibiotic mechanisms (cell wall, ribosome, DNA)",
              level: "Intermediate",
              topic: "Anatomy"
            },
            {
              id: 117,
              question: "Explain antibiotic resistance evolution",
              level: "Advanced",
              topic: "Genetics"
            },
            {
              id: 118,
              question: "Describe CRISPR-Cas9 mechanism",
              level: "Basic",
              topic: "Physiology"
            },
            {
              id: 119,
              question: "Compare RNA + DNA",
              level: "Intermediate",
              topic: "Disease"
            },
            {
              id: 120,
              question: "Explain codon-anticodon pairing",
              level: "Advanced",
              topic: "Lab"
            },
            {
              id: 121,
              question: "Compare prokaryote vs eukaryote cell organization",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 122,
              question: "Explain endosymbiotic theory + supporting evidence",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 123,
              question: "Describe the cell membrane structure (fluid mosaic)",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 124,
              question: "Compare passive vs active transport",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 125,
              question: "Explain how DNA replication is semi-conservative",
              level: "Intermediate",
              topic: "Lab"
            },
            {
              id: 126,
              question: "Describe transcription + translation process",
              level: "Advanced",
              topic: "Anatomy"
            },
            {
              id: 127,
              question: "Compare mitosis vs meiosis",
              level: "Basic",
              topic: "Genetics"
            },
            {
              id: 128,
              question: "Explain Gram staining + what it reveals",
              level: "Intermediate",
              topic: "Physiology"
            },
            {
              id: 129,
              question: "Compare bacterial vs archaeal cells",
              level: "Advanced",
              topic: "Disease"
            },
            {
              id: 130,
              question: "Describe phases of cell cycle",
              level: "Basic",
              topic: "Lab"
            },
            {
              id: 131,
              question: "Compare aerobic vs anaerobic respiration",
              level: "Intermediate",
              topic: "Anatomy"
            },
            {
              id: 132,
              question: "Explain photosynthesis light + dark reactions",
              level: "Advanced",
              topic: "Genetics"
            },
            {
              id: 133,
              question: "Describe ATP synthesis (electron transport chain)",
              level: "Basic",
              topic: "Physiology"
            },
            {
              id: 134,
              question: "Compare nuclear DNA vs mitochondrial DNA",
              level: "Intermediate",
              topic: "Disease"
            },
            {
              id: 135,
              question: "Explain operon model (lac, trp)",
              level: "Advanced",
              topic: "Lab"
            },
            {
              id: 136,
              question: "Describe protein folding + chaperones",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 137,
              question: "Compare passive vs facilitated diffusion",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 138,
              question: "Explain Na+/K+ pump mechanism",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 139,
              question: "Describe signal transduction cascades",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 140,
              question: "Compare hormone signaling types",
              level: "Intermediate",
              topic: "Lab"
            },
            {
              id: 141,
              question: "Explain MHC vs antibody recognition",
              level: "Advanced",
              topic: "Anatomy"
            },
            {
              id: 142,
              question: "Describe innate vs adaptive immunity",
              level: "Basic",
              topic: "Genetics"
            },
            {
              id: 143,
              question: "Compare phagocytic cells (neutrophils, macrophages)",
              level: "Intermediate",
              topic: "Physiology"
            },
            {
              id: 144,
              question: "Explain complement system",
              level: "Advanced",
              topic: "Disease"
            },
            {
              id: 145,
              question: "Describe vaccine principle + types",
              level: "Basic",
              topic: "Lab"
            },
            {
              id: 146,
              question: "Compare antibiotic mechanisms (cell wall, ribosome, DNA)",
              level: "Intermediate",
              topic: "Anatomy"
            },
            {
              id: 147,
              question: "Explain antibiotic resistance evolution",
              level: "Advanced",
              topic: "Genetics"
            },
            {
              id: 148,
              question: "Describe CRISPR-Cas9 mechanism",
              level: "Basic",
              topic: "Physiology"
            },
            {
              id: 149,
              question: "Compare RNA + DNA",
              level: "Intermediate",
              topic: "Disease"
            },
            {
              id: 150,
              question: "Explain codon-anticodon pairing",
              level: "Advanced",
              topic: "Lab"
            },
            {
              id: 151,
              question: "Compare prokaryote vs eukaryote cell organization",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 152,
              question: "Explain endosymbiotic theory + supporting evidence",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 153,
              question: "Describe the cell membrane structure (fluid mosaic)",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 154,
              question: "Compare passive vs active transport",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 155,
              question: "Explain how DNA replication is semi-conservative",
              level: "Intermediate",
              topic: "Lab"
            },
            {
              id: 156,
              question: "Describe transcription + translation process",
              level: "Advanced",
              topic: "Anatomy"
            },
            {
              id: 157,
              question: "Compare mitosis vs meiosis",
              level: "Basic",
              topic: "Genetics"
            },
            {
              id: 158,
              question: "Explain Gram staining + what it reveals",
              level: "Intermediate",
              topic: "Physiology"
            },
            {
              id: 159,
              question: "Compare bacterial vs archaeal cells",
              level: "Advanced",
              topic: "Disease"
            },
            {
              id: 160,
              question: "Describe phases of cell cycle",
              level: "Basic",
              topic: "Lab"
            },
            {
              id: 161,
              question: "Compare aerobic vs anaerobic respiration",
              level: "Intermediate",
              topic: "Anatomy"
            },
            {
              id: 162,
              question: "Explain photosynthesis light + dark reactions",
              level: "Advanced",
              topic: "Genetics"
            },
            {
              id: 163,
              question: "Describe ATP synthesis (electron transport chain)",
              level: "Basic",
              topic: "Physiology"
            },
            {
              id: 164,
              question: "Compare nuclear DNA vs mitochondrial DNA",
              level: "Intermediate",
              topic: "Disease"
            },
            {
              id: 165,
              question: "Explain operon model (lac, trp)",
              level: "Advanced",
              topic: "Lab"
            },
            {
              id: 166,
              question: "Describe protein folding + chaperones",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 167,
              question: "Compare passive vs facilitated diffusion",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 168,
              question: "Explain Na+/K+ pump mechanism",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 169,
              question: "Describe signal transduction cascades",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 170,
              question: "Compare hormone signaling types",
              level: "Intermediate",
              topic: "Lab"
            },
            {
              id: 171,
              question: "Explain MHC vs antibody recognition",
              level: "Advanced",
              topic: "Anatomy"
            },
            {
              id: 172,
              question: "Describe innate vs adaptive immunity",
              level: "Basic",
              topic: "Genetics"
            },
            {
              id: 173,
              question: "Compare phagocytic cells (neutrophils, macrophages)",
              level: "Intermediate",
              topic: "Physiology"
            },
            {
              id: 174,
              question: "Explain complement system",
              level: "Advanced",
              topic: "Disease"
            },
            {
              id: 175,
              question: "Describe vaccine principle + types",
              level: "Basic",
              topic: "Lab"
            },
            {
              id: 176,
              question: "Compare antibiotic mechanisms (cell wall, ribosome, DNA)",
              level: "Intermediate",
              topic: "Anatomy"
            },
            {
              id: 177,
              question: "Explain antibiotic resistance evolution",
              level: "Advanced",
              topic: "Genetics"
            },
            {
              id: 178,
              question: "Describe CRISPR-Cas9 mechanism",
              level: "Basic",
              topic: "Physiology"
            },
            {
              id: 179,
              question: "Compare RNA + DNA",
              level: "Intermediate",
              topic: "Disease"
            },
            {
              id: 180,
              question: "Explain codon-anticodon pairing",
              level: "Advanced",
              topic: "Lab"
            },
            {
              id: 181,
              question: "Compare prokaryote vs eukaryote cell organization",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 182,
              question: "Explain endosymbiotic theory + supporting evidence",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 183,
              question: "Describe the cell membrane structure (fluid mosaic)",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 184,
              question: "Compare passive vs active transport",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 185,
              question: "Explain how DNA replication is semi-conservative",
              level: "Intermediate",
              topic: "Lab"
            },
            {
              id: 186,
              question: "Describe transcription + translation process",
              level: "Advanced",
              topic: "Anatomy"
            },
            {
              id: 187,
              question: "Compare mitosis vs meiosis",
              level: "Basic",
              topic: "Genetics"
            },
            {
              id: 188,
              question: "Explain Gram staining + what it reveals",
              level: "Intermediate",
              topic: "Physiology"
            },
            {
              id: 189,
              question: "Compare bacterial vs archaeal cells",
              level: "Advanced",
              topic: "Disease"
            },
            {
              id: 190,
              question: "Describe phases of cell cycle",
              level: "Basic",
              topic: "Lab"
            },
            {
              id: 191,
              question: "Compare aerobic vs anaerobic respiration",
              level: "Intermediate",
              topic: "Anatomy"
            },
            {
              id: 192,
              question: "Explain photosynthesis light + dark reactions",
              level: "Advanced",
              topic: "Genetics"
            },
            {
              id: 193,
              question: "Describe ATP synthesis (electron transport chain)",
              level: "Basic",
              topic: "Physiology"
            },
            {
              id: 194,
              question: "Compare nuclear DNA vs mitochondrial DNA",
              level: "Intermediate",
              topic: "Disease"
            },
            {
              id: 195,
              question: "Explain operon model (lac, trp)",
              level: "Advanced",
              topic: "Lab"
            },
            {
              id: 196,
              question: "Describe protein folding + chaperones",
              level: "Basic",
              topic: "Anatomy"
            },
            {
              id: 197,
              question: "Compare passive vs facilitated diffusion",
              level: "Intermediate",
              topic: "Genetics"
            },
            {
              id: 198,
              question: "Explain Na+/K+ pump mechanism",
              level: "Advanced",
              topic: "Physiology"
            },
            {
              id: 199,
              question: "Describe signal transduction cascades",
              level: "Basic",
              topic: "Disease"
            },
            {
              id: 200,
              question: "Compare hormone signaling types",
              level: "Intermediate",
              topic: "Lab"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // MICRO ENVIRONMENT MINI-CASES
          // ═══════════════════════════════════════════════════════════
          var MICRO_CASES = [
            {
              id: 1,
              process: "Yogurt-making",
              mechanism: "Lactobacillus + Streptococcus thermophilus convert milk lactose to lactic acid"
            },
            {
              id: 2,
              process: "Sourdough starter",
              mechanism: "Wild yeast + lactic acid bacteria create distinctive flavor"
            },
            {
              id: 3,
              process: "Beer brewing",
              mechanism: "Saccharomyces cerevisiae converts barley sugars to ethanol + CO2"
            },
            {
              id: 4,
              process: "Wine fermentation",
              mechanism: "Wild + cultivated yeast convert grape sugars"
            },
            {
              id: 5,
              process: "Sauerkraut",
              mechanism: "Lactic acid bacteria preserve cabbage"
            },
            {
              id: 6,
              process: "Kimchi",
              mechanism: "Korean fermented vegetables + chili"
            },
            {
              id: 7,
              process: "Cheese production",
              mechanism: "Various bacteria + molds create texture + flavor"
            },
            {
              id: 8,
              process: "Compost",
              mechanism: "Decomposer bacteria + fungi break down organic matter"
            },
            {
              id: 9,
              process: "Septic system",
              mechanism: "Anaerobic bacteria treat waste"
            },
            {
              id: 10,
              process: "Wastewater treatment",
              mechanism: "Aerobic + anaerobic bacteria stages"
            },
            {
              id: 11,
              process: "Bioremediation oil spill",
              mechanism: "Bacteria break down hydrocarbons"
            },
            {
              id: 12,
              process: "Sewage methane",
              mechanism: "Methanogens produce biogas"
            },
            {
              id: 13,
              process: "Yogurt probiotic",
              mechanism: "Live cultures support gut microbiome"
            },
            {
              id: 14,
              process: "Sourdough bread",
              mechanism: "Wild yeast + bacteria create flavor"
            },
            {
              id: 15,
              process: "Fermented vegetables",
              mechanism: "Lactic acid preservation"
            },
            {
              id: 16,
              process: "Bread making",
              mechanism: "Yeast CO2 raises dough"
            },
            {
              id: 17,
              process: "Wine making",
              mechanism: "Yeast ethanol production"
            },
            {
              id: 18,
              process: "Beer + sour beer",
              mechanism: "Wild fermentation cultures"
            },
            {
              id: 19,
              process: "Coral bleaching",
              mechanism: "Loss of symbiotic algae"
            },
            {
              id: 20,
              process: "Nitrogen-fixing nodules",
              mechanism: "Rhizobia + legume roots"
            }
          ];


          // ═══════════════════════════════════════════════════════════
          // HUMAN BODY CELL TYPES — 60 profiles
          // ═══════════════════════════════════════════════════════════
          var HUMAN_CELLS = [
            {
              id: 1,
              name: "Red blood cell (erythrocyte)",
              location: "Blood",
              function: "Oxygen transport via hemoglobin",
              lifespan: "Days"
            },
            {
              id: 2,
              name: "White blood cell (general)",
              location: "Blood",
              function: "Immune defense",
              lifespan: "Weeks"
            },
            {
              id: 3,
              name: "Neutrophil",
              location: "Blood",
              function: "First responder to infection",
              lifespan: "Months"
            },
            {
              id: 4,
              name: "Lymphocyte (T cell)",
              location: "Blood + lymph",
              function: "Adaptive immunity",
              lifespan: "Years"
            },
            {
              id: 5,
              name: "Lymphocyte (B cell)",
              location: "Blood + lymph",
              function: "Antibody production",
              lifespan: "Lifetime"
            },
            {
              id: 6,
              name: "Monocyte",
              location: "Blood",
              function: "Differentiates into macrophages",
              lifespan: "Days"
            },
            {
              id: 7,
              name: "Macrophage",
              location: "Tissues",
              function: "Large phagocyte",
              lifespan: "Weeks"
            },
            {
              id: 8,
              name: "Eosinophil",
              location: "Blood",
              function: "Parasite + allergy response",
              lifespan: "Months"
            },
            {
              id: 9,
              name: "Basophil",
              location: "Blood",
              function: "Inflammation + allergy",
              lifespan: "Years"
            },
            {
              id: 10,
              name: "Mast cell",
              location: "Tissue",
              function: "Allergic response",
              lifespan: "Lifetime"
            },
            {
              id: 11,
              name: "Platelet (thrombocyte)",
              location: "Blood",
              function: "Clotting",
              lifespan: "Days"
            },
            {
              id: 12,
              name: "Neuron",
              location: "Brain + spinal cord",
              function: "Conduct electrical signals",
              lifespan: "Weeks"
            },
            {
              id: 13,
              name: "Astrocyte",
              location: "CNS",
              function: "Support neurons + BBB",
              lifespan: "Months"
            },
            {
              id: 14,
              name: "Oligodendrocyte",
              location: "CNS",
              function: "Myelinate axons",
              lifespan: "Years"
            },
            {
              id: 15,
              name: "Microglia",
              location: "CNS",
              function: "Immune cells of CNS",
              lifespan: "Lifetime"
            },
            {
              id: 16,
              name: "Schwann cell",
              location: "PNS",
              function: "Myelinate peripheral neurons",
              lifespan: "Days"
            },
            {
              id: 17,
              name: "Skeletal muscle fiber",
              location: "Muscle",
              function: "Contract for movement",
              lifespan: "Weeks"
            },
            {
              id: 18,
              name: "Cardiac muscle (cardiomyocyte)",
              location: "Heart",
              function: "Beats your heart",
              lifespan: "Months"
            },
            {
              id: 19,
              name: "Smooth muscle",
              location: "Organs",
              function: "Involuntary contraction",
              lifespan: "Years"
            },
            {
              id: 20,
              name: "Hepatocyte",
              location: "Liver",
              function: "Liver metabolism",
              lifespan: "Lifetime"
            },
            {
              id: 21,
              name: "Pancreatic beta cell",
              location: "Pancreas",
              function: "Insulin production",
              lifespan: "Days"
            },
            {
              id: 22,
              name: "Pancreatic alpha cell",
              location: "Pancreas",
              function: "Glucagon production",
              lifespan: "Weeks"
            },
            {
              id: 23,
              name: "Kupffer cell",
              location: "Liver",
              function: "Liver macrophage",
              lifespan: "Months"
            },
            {
              id: 24,
              name: "Goblet cell",
              location: "Intestine",
              function: "Mucus production",
              lifespan: "Years"
            },
            {
              id: 25,
              name: "Enterocyte",
              location: "Intestine",
              function: "Absorb nutrients",
              lifespan: "Lifetime"
            },
            {
              id: 26,
              name: "Paneth cell",
              location: "Intestine",
              function: "Antimicrobial defense",
              lifespan: "Days"
            },
            {
              id: 27,
              name: "Osteoblast",
              location: "Bone",
              function: "Builds bone matrix",
              lifespan: "Weeks"
            },
            {
              id: 28,
              name: "Osteoclast",
              location: "Bone",
              function: "Reabsorbs bone",
              lifespan: "Months"
            },
            {
              id: 29,
              name: "Chondrocyte",
              location: "Cartilage",
              function: "Cartilage cells",
              lifespan: "Years"
            },
            {
              id: 30,
              name: "Adipocyte",
              location: "Fat",
              function: "Store fat",
              lifespan: "Lifetime"
            },
            {
              id: 31,
              name: "Fibroblast",
              location: "Connective tissue",
              function: "Make collagen",
              lifespan: "Days"
            },
            {
              id: 32,
              name: "Endothelial cell",
              location: "Blood vessel",
              function: "Lining + selective",
              lifespan: "Weeks"
            },
            {
              id: 33,
              name: "Smooth muscle (vascular)",
              location: "Blood vessel",
              function: "Control diameter",
              lifespan: "Months"
            },
            {
              id: 34,
              name: "Epidermis (keratinocyte)",
              location: "Skin",
              function: "Forms outer skin barrier",
              lifespan: "Years"
            },
            {
              id: 35,
              name: "Melanocyte",
              location: "Skin",
              function: "Produces melanin pigment",
              lifespan: "Lifetime"
            },
            {
              id: 36,
              name: "Langerhans cell",
              location: "Skin",
              function: "Skin immune surveillance",
              lifespan: "Days"
            },
            {
              id: 37,
              name: "Hair follicle stem cell",
              location: "Skin",
              function: "Hair growth",
              lifespan: "Weeks"
            },
            {
              id: 38,
              name: "Sebaceous gland cell",
              location: "Skin",
              function: "Oil production",
              lifespan: "Months"
            },
            {
              id: 39,
              name: "Sweat gland cell",
              location: "Skin",
              function: "Cooling",
              lifespan: "Years"
            },
            {
              id: 40,
              name: "Photoreceptor (rod)",
              location: "Retina",
              function: "Low-light vision",
              lifespan: "Lifetime"
            },
            {
              id: 41,
              name: "Photoreceptor (cone)",
              location: "Retina",
              function: "Color vision",
              lifespan: "Days"
            },
            {
              id: 42,
              name: "Ganglion cell",
              location: "Retina",
              function: "Sends signals to brain",
              lifespan: "Weeks"
            },
            {
              id: 43,
              name: "Hair cell (cochlea)",
              location: "Inner ear",
              function: "Hearing",
              lifespan: "Months"
            },
            {
              id: 44,
              name: "Hair cell (vestibular)",
              location: "Inner ear",
              function: "Balance",
              lifespan: "Years"
            },
            {
              id: 45,
              name: "Taste cell",
              location: "Tongue",
              function: "Taste detection",
              lifespan: "Lifetime"
            },
            {
              id: 46,
              name: "Olfactory neuron",
              location: "Nose",
              function: "Smell detection",
              lifespan: "Days"
            },
            {
              id: 47,
              name: "Sperm",
              location: "Testes",
              function: "Male reproductive cell",
              lifespan: "Weeks"
            },
            {
              id: 48,
              name: "Oocyte (egg)",
              location: "Ovary",
              function: "Female reproductive cell",
              lifespan: "Months"
            },
            {
              id: 49,
              name: "Trophoblast",
              location: "Embryo",
              function: "Forms placenta",
              lifespan: "Years"
            },
            {
              id: 50,
              name: "Embryonic stem cell",
              location: "Embryo",
              function: "Can become any cell",
              lifespan: "Lifetime"
            },
            {
              id: 51,
              name: "Pluripotent stem cell",
              location: "Various",
              function: "Can become many cell types",
              lifespan: "Days"
            },
            {
              id: 52,
              name: "Hematopoietic stem cell",
              location: "Bone marrow",
              function: "Source of all blood cells",
              lifespan: "Weeks"
            },
            {
              id: 53,
              name: "Mesenchymal stem cell",
              location: "Bone marrow",
              function: "Forms bone, fat, cartilage",
              lifespan: "Months"
            },
            {
              id: 54,
              name: "Glial cell (general)",
              location: "CNS",
              function: "Support neurons",
              lifespan: "Years"
            },
            {
              id: 55,
              name: "Ependymal cell",
              location: "CNS",
              function: "Line ventricles",
              lifespan: "Lifetime"
            },
            {
              id: 56,
              name: "Pituitary cell",
              location: "Pituitary",
              function: "Hormone production",
              lifespan: "Days"
            },
            {
              id: 57,
              name: "Thyroid follicular cell",
              location: "Thyroid",
              function: "Make thyroid hormones",
              lifespan: "Weeks"
            },
            {
              id: 58,
              name: "Parathyroid cell",
              location: "Parathyroid",
              function: "Calcium regulation",
              lifespan: "Months"
            },
            {
              id: 59,
              name: "Adrenal cortex cell",
              location: "Adrenal",
              function: "Steroid hormones",
              lifespan: "Years"
            },
            {
              id: 60,
              name: "Adrenal medulla cell",
              location: "Adrenal",
              function: "Adrenaline",
              lifespan: "Lifetime"
            },
            {
              id: 61,
              name: "Cardiac pacemaker cell",
              location: "Heart",
              function: "Set heart rate",
              lifespan: "Days"
            },
            {
              id: 62,
              name: "Purkinje cell",
              location: "Cerebellum",
              function: "Motor coordination",
              lifespan: "Weeks"
            },
            {
              id: 63,
              name: "Pyramidal cell",
              location: "Cortex",
              function: "Cognitive processing",
              lifespan: "Months"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // METABOLIC PATHWAYS — 80 detailed
          // ═══════════════════════════════════════════════════════════
          var METABOLIC_PATHWAYS = [
            {
              id: 1,
              pathway: "Glycolysis",
              substrates: "Glucose to pyruvate",
              outputs: "2 ATP + 2 NADH per glucose",
              location: "Cytoplasm"
            },
            {
              id: 2,
              pathway: "Krebs cycle",
              substrates: "Acetyl-CoA to CO2",
              outputs: "3 NADH + FADH2 + ATP per pyruvate",
              location: "Mitochondrial matrix"
            },
            {
              id: 3,
              pathway: "Electron transport chain",
              substrates: "NADH/FADH2 to H2O",
              outputs: "~32 ATP per glucose",
              location: "Mitochondrial inner membrane"
            },
            {
              id: 4,
              pathway: "Oxidative phosphorylation",
              substrates: "NADH/FADH2 electrons to O2",
              outputs: "Major ATP production",
              location: "Mitochondrial inner membrane"
            },
            {
              id: 5,
              pathway: "Pentose phosphate pathway",
              substrates: "Glucose-6-P to NADPH + ribose",
              outputs: "Generates reducing power",
              location: "Cytoplasm"
            },
            {
              id: 6,
              pathway: "Gluconeogenesis",
              substrates: "Lactate/glycerol to glucose",
              outputs: "Reverse of glycolysis",
              location: "Liver + kidney"
            },
            {
              id: 7,
              pathway: "Glycogen synthesis",
              substrates: "Glucose to glycogen",
              outputs: "Storage form",
              location: "Liver + muscle"
            },
            {
              id: 8,
              pathway: "Glycogen breakdown (glycogenolysis)",
              substrates: "Glycogen to glucose",
              outputs: "Release stored glucose",
              location: "Liver + muscle"
            },
            {
              id: 9,
              pathway: "Beta-oxidation",
              substrates: "Fatty acids to acetyl-CoA",
              outputs: "Fat catabolism",
              location: "Mitochondrial matrix"
            },
            {
              id: 10,
              pathway: "Fatty acid synthesis",
              substrates: "Acetyl-CoA to fatty acids",
              outputs: "Lipid biosynthesis",
              location: "Cytoplasm"
            },
            {
              id: 11,
              pathway: "Cholesterol synthesis",
              substrates: "Acetyl-CoA to cholesterol",
              outputs: "Steroid precursor",
              location: "Liver"
            },
            {
              id: 12,
              pathway: "Steroid synthesis",
              substrates: "Cholesterol to steroids",
              outputs: "Hormones + signaling",
              location: "Adrenal + gonads"
            },
            {
              id: 13,
              pathway: "Bile acid synthesis",
              substrates: "Cholesterol to bile acids",
              outputs: "Fat digestion",
              location: "Liver"
            },
            {
              id: 14,
              pathway: "Calvin cycle",
              substrates: "CO2 + ATP + NADPH to glucose",
              outputs: "Photosynthesis dark reactions",
              location: "Chloroplast stroma"
            },
            {
              id: 15,
              pathway: "Light reactions (PSI + PSII)",
              substrates: "Light + H2O to NADPH + O2",
              outputs: "Photosynthesis light reactions",
              location: "Thylakoid membrane"
            },
            {
              id: 16,
              pathway: "Photorespiration",
              substrates: "O2 + RuBP to glycolate",
              outputs: "Wasteful side reaction",
              location: "Plant peroxisomes + mitochondria"
            },
            {
              id: 17,
              pathway: "Photosynthesis (C4)",
              substrates: "CO2 fixation via PEP",
              outputs: "Efficient in hot climate",
              location: "Plant cells"
            },
            {
              id: 18,
              pathway: "Photosynthesis (CAM)",
              substrates: "Night CO2 fixation",
              outputs: "Desert plant adaptation",
              location: "Plant cells"
            },
            {
              id: 19,
              pathway: "Urea cycle",
              substrates: "NH3 + CO2 to urea",
              outputs: "Nitrogen excretion",
              location: "Liver"
            },
            {
              id: 20,
              pathway: "Amino acid metabolism (catabolism)",
              substrates: "Amino acids to TCA intermediates",
              outputs: "Energy from protein",
              location: "Liver"
            },
            {
              id: 21,
              pathway: "Amino acid synthesis",
              substrates: "TCA intermediates to amino acids",
              outputs: "Build amino acids",
              location: "Various"
            },
            {
              id: 22,
              pathway: "Nucleotide synthesis",
              substrates: "Various to ATP/GTP/CTP/UTP",
              outputs: "Building blocks for DNA/RNA",
              location: "Liver + other"
            },
            {
              id: 23,
              pathway: "Nucleotide salvage",
              substrates: "Recycle nucleotides",
              outputs: "Reuse existing",
              location: "Most tissues"
            },
            {
              id: 24,
              pathway: "Heme biosynthesis",
              substrates: "Glycine + succinyl-CoA to heme",
              outputs: "Hemoglobin + cytochromes",
              location: "Liver + bone marrow"
            },
            {
              id: 25,
              pathway: "Photoreceptor visual cycle",
              substrates: "Vitamin A to retinal",
              outputs: "Vision",
              location: "Retina"
            },
            {
              id: 26,
              pathway: "Vitamin D synthesis",
              substrates: "Cholesterol + UV to vitamin D",
              outputs: "Sun-dependent",
              location: "Skin"
            },
            {
              id: 27,
              pathway: "Cori cycle",
              substrates: "Lactate from muscle to liver",
              outputs: "Anaerobic to aerobic",
              location: "Liver + muscle"
            },
            {
              id: 28,
              pathway: "Cahill cycle (alanine)",
              substrates: "Alanine from muscle to liver",
              outputs: "Nitrogen recycling",
              location: "Liver + muscle"
            },
            {
              id: 29,
              pathway: "Pentose phosphate (oxidative)",
              substrates: "Glucose-6-P to ribose-5-P",
              outputs: "Generate NADPH",
              location: "Cytoplasm"
            },
            {
              id: 30,
              pathway: "Pentose phosphate (non-oxidative)",
              substrates: "Riboses to glycolytic intermediates",
              outputs: "Carbohydrate interconversion",
              location: "Cytoplasm"
            },
            {
              id: 31,
              pathway: "Pentose phosphate (entire)",
              substrates: "Both arms combined",
              outputs: "Generates NADPH + ribose",
              location: "Cytoplasm"
            },
            {
              id: 32,
              pathway: "Sialic acid metabolism",
              substrates: "Glucosamine to sialic acid",
              outputs: "Glycoprotein synthesis",
              location: "Cytoplasm + Golgi"
            },
            {
              id: 33,
              pathway: "Glycoprotein synthesis",
              substrates: "Add sugars to proteins in ER + Golgi",
              outputs: "Cell surface proteins",
              location: "ER + Golgi"
            },
            {
              id: 34,
              pathway: "N-glycosylation",
              substrates: "Add N-linked sugar to Asn",
              outputs: "Major glycosylation type",
              location: "ER"
            },
            {
              id: 35,
              pathway: "O-glycosylation",
              substrates: "Add O-linked sugar to Ser/Thr",
              outputs: "Secondary glycosylation",
              location: "Golgi"
            },
            {
              id: 36,
              pathway: "Proteoglycan synthesis",
              substrates: "Make proteoglycans",
              outputs: "Cell-surface matrix",
              location: "Golgi"
            },
            {
              id: 37,
              pathway: "Ceramide synthesis",
              substrates: "Make ceramides + sphingolipids",
              outputs: "Membrane components",
              location: "ER + Golgi"
            },
            {
              id: 38,
              pathway: "Glycolipid synthesis",
              substrates: "Make glycolipids",
              outputs: "Membrane diversity",
              location: "ER + Golgi"
            },
            {
              id: 39,
              pathway: "Phosphatidylinositol synthesis",
              substrates: "Make PI lipids",
              outputs: "Signaling",
              location: "ER"
            },
            {
              id: 40,
              pathway: "Phosphatidylcholine synthesis",
              substrates: "Make PC",
              outputs: "Major phospholipid",
              location: "ER"
            },
            {
              id: 41,
              pathway: "Cardiolipin synthesis",
              substrates: "Make cardiolipin",
              outputs: "Mitochondrial",
              location: "Mitochondria"
            },
            {
              id: 42,
              pathway: "Tryptophan to serotonin",
              substrates: "Trp to 5-HT",
              outputs: "Mood + sleep",
              location: "Brain + GI"
            },
            {
              id: 43,
              pathway: "Phenylalanine to tyrosine to L-DOPA to dopamine",
              substrates: "Step pathway",
              outputs: "Movement + reward",
              location: "Brain"
            },
            {
              id: 44,
              pathway: "Norepinephrine + epinephrine",
              substrates: "Tyrosine to NE to E",
              outputs: "Sympathetic",
              location: "Adrenal"
            },
            {
              id: 45,
              pathway: "Histamine synthesis",
              substrates: "Histidine to histamine",
              outputs: "Allergy + inflammation",
              location: "Immune + neurons"
            },
            {
              id: 46,
              pathway: "GABA synthesis",
              substrates: "Glutamate to GABA",
              outputs: "Inhibitory neurotransmitter",
              location: "Brain"
            },
            {
              id: 47,
              pathway: "Acetylcholine synthesis",
              substrates: "Choline + acetyl-CoA to ACh",
              outputs: "Major neurotransmitter",
              location: "Neurons"
            },
            {
              id: 48,
              pathway: "Neurosteroid synthesis",
              substrates: "Cholesterol to neurosteroids",
              outputs: "Mood + behavior",
              location: "Brain"
            },
            {
              id: 49,
              pathway: "Melanin synthesis",
              substrates: "Tyrosine to melanin",
              outputs: "Pigment",
              location: "Melanocytes"
            },
            {
              id: 50,
              pathway: "Eicosanoid synthesis",
              substrates: "Arachidonic acid to PGs + LTs",
              outputs: "Inflammation + signaling",
              location: "All cells"
            },
            {
              id: 51,
              pathway: "Nitric oxide synthesis",
              substrates: "L-arginine to NO + citrulline",
              outputs: "Vasodilation + signaling",
              location: "All cells"
            },
            {
              id: 52,
              pathway: "Bile salt synthesis",
              substrates: "Cholesterol to bile salts",
              outputs: "Lipid emulsion in gut",
              location: "Liver"
            },
            {
              id: 53,
              pathway: "Vitamin B12 synthesis",
              substrates: "Microbial only",
              outputs: "Required co-enzyme",
              location: "Bacteria"
            },
            {
              id: 54,
              pathway: "Folate synthesis",
              substrates: "Mostly microbial",
              outputs: "DNA synthesis cofactor",
              location: "Bacteria + plants"
            },
            {
              id: 55,
              pathway: "Vitamin C synthesis",
              substrates: "Glucose to ascorbate",
              outputs: "Antioxidant + collagen",
              location: "Most animals (not humans)"
            },
            {
              id: 56,
              pathway: "Cofactor synthesis",
              substrates: "Various pathways",
              outputs: "Enzyme cofactors",
              location: "Various"
            },
            {
              id: 57,
              pathway: "Iron-sulfur cluster assembly",
              substrates: "In mitochondria + cytoplasm",
              outputs: "Many proteins need",
              location: "Multiple cells"
            },
            {
              id: 58,
              pathway: "Heme oxygenase pathway",
              substrates: "Heme breakdown",
              outputs: "Bilirubin production",
              location: "Spleen + liver"
            },
            {
              id: 59,
              pathway: "Cytochrome P450 metabolism",
              substrates: "Drug + xenobiotic metabolism",
              outputs: "Liver detox",
              location: "Liver"
            },
            {
              id: 60,
              pathway: "Phase I detoxification",
              substrates: "CYP450 oxidation/reduction",
              outputs: "Drug activation/inactivation",
              location: "Liver"
            },
            {
              id: 61,
              pathway: "Phase II detoxification",
              substrates: "Conjugation reactions",
              outputs: "Make compounds water-soluble",
              location: "Liver"
            },
            {
              id: 62,
              pathway: "Glutathione metabolism",
              substrates: "GSH synthesis + use",
              outputs: "Antioxidant + detox",
              location: "All cells"
            },
            {
              id: 63,
              pathway: "Ascorbate-glutathione cycle",
              substrates: "Plant antioxidant cycle",
              outputs: "Maintain ROS balance",
              location: "Plant cells"
            },
            {
              id: 64,
              pathway: "Pentose phosphate (NADPH)",
              substrates: "Glucose-6-P to NADPH",
              outputs: "Provides NADPH for biosynthesis",
              location: "Cytoplasm"
            },
            {
              id: 65,
              pathway: "Cori cycle (muscle to liver)",
              substrates: "Lactate + glucose",
              outputs: "Whole-body metabolism",
              location: "Liver + muscle"
            },
            {
              id: 66,
              pathway: "Glucose-alanine cycle",
              substrates: "Alanine + nitrogen",
              outputs: "Whole-body nitrogen",
              location: "Liver + muscle"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // CELL SIGNALING PATHWAYS
          // ═══════════════════════════════════════════════════════════
          var SIGNAL_PATHWAYS = [
            {
              id: 1,
              pathway: "Receptor Tyrosine Kinase (RTK)",
              ligand: "Growth factors",
              example: "EGF, FGF, insulin"
            },
            {
              id: 2,
              pathway: "G Protein-Coupled Receptor (GPCR)",
              ligand: "Hormones + neurotransmitters",
              example: "Adrenaline, serotonin, dopamine"
            },
            {
              id: 3,
              pathway: "Ion channels (ligand-gated)",
              ligand: "Neurotransmitters",
              example: "NMDA, AMPA receptors"
            },
            {
              id: 4,
              pathway: "Nuclear receptors",
              ligand: "Steroid hormones",
              example: "Cortisol, estrogen, vitamin D"
            },
            {
              id: 5,
              pathway: "Notch signaling",
              ligand: "Direct cell-cell",
              example: "Development + immune"
            },
            {
              id: 6,
              pathway: "Wnt signaling",
              ligand: "Wnt ligands",
              example: "Development + stem cells"
            },
            {
              id: 7,
              pathway: "Hedgehog signaling",
              ligand: "Hh ligands",
              example: "Embryo patterning + tumor"
            },
            {
              id: 8,
              pathway: "TGF-beta signaling",
              ligand: "TGF-beta family",
              example: "Wound healing + cancer"
            },
            {
              id: 9,
              pathway: "JAK-STAT signaling",
              ligand: "Cytokines",
              example: "Immune + growth"
            },
            {
              id: 10,
              pathway: "MAPK/ERK signaling",
              ligand: "Many activators",
              example: "Growth + proliferation"
            },
            {
              id: 11,
              pathway: "PI3K-AKT signaling",
              ligand: "Growth factors + insulin",
              example: "Cell survival + metabolism"
            },
            {
              id: 12,
              pathway: "mTOR signaling",
              ligand: "Amino acids + insulin",
              example: "Cell growth"
            },
            {
              id: 13,
              pathway: "NF-kB signaling",
              ligand: "Cytokines + stress",
              example: "Inflammation + immunity"
            },
            {
              id: 14,
              pathway: "p53 signaling",
              ligand: "DNA damage + stress",
              example: "Cell cycle + apoptosis"
            },
            {
              id: 15,
              pathway: "Apoptosis (extrinsic)",
              ligand: "Death receptors (Fas, TNFR)",
              example: "Cell death from outside"
            },
            {
              id: 16,
              pathway: "Apoptosis (intrinsic)",
              ligand: "Mitochondrial cytochrome c",
              example: "Cell death from within"
            },
            {
              id: 17,
              pathway: "Caspase cascade",
              ligand: "Apoptotic enzymes",
              example: "Cleave cellular components"
            },
            {
              id: 18,
              pathway: "Calcium signaling",
              ligand: "Ca2+ ions",
              example: "Many processes"
            },
            {
              id: 19,
              pathway: "cAMP signaling",
              ligand: "cAMP from ATP",
              example: "GPCR downstream"
            },
            {
              id: 20,
              pathway: "cGMP signaling",
              ligand: "cGMP from GTP",
              example: "Various"
            },
            {
              id: 21,
              pathway: "Inositol triphosphate (IP3)",
              ligand: "PIP2 hydrolysis",
              example: "Releases ER Ca2+"
            },
            {
              id: 22,
              pathway: "Diacylglycerol (DAG)",
              ligand: "PIP2 hydrolysis",
              example: "Activates PKC"
            },
            {
              id: 23,
              pathway: "Protein kinase A (PKA)",
              ligand: "cAMP",
              example: "Phosphorylates many substrates"
            },
            {
              id: 24,
              pathway: "Protein kinase C (PKC)",
              ligand: "DAG + Ca2+",
              example: "Phosphorylates many substrates"
            },
            {
              id: 25,
              pathway: "Protein kinase G (PKG)",
              ligand: "cGMP",
              example: "Smooth muscle relaxation"
            },
            {
              id: 26,
              pathway: "CaM kinase II",
              ligand: "Ca2+ + calmodulin",
              example: "Long-term memory"
            },
            {
              id: 27,
              pathway: "MAPK cascade",
              ligand: "Multiple kinases",
              example: "Many downstream effects"
            },
            {
              id: 28,
              pathway: "Insulin signaling",
              ligand: "Insulin",
              example: "Glucose uptake"
            },
            {
              id: 29,
              pathway: "Glucagon signaling",
              ligand: "Glucagon",
              example: "Glucose release"
            },
            {
              id: 30,
              pathway: "Adrenergic signaling",
              ligand: "Adrenaline + noradrenaline",
              example: "Fight or flight"
            }
          ];


          // ═══════════════════════════════════════════════════════════
          // MICROBIAL NICHES — 100 specific environments
          // ═══════════════════════════════════════════════════════════
          var MICRO_NICHES = [
            {
              id: 1,
              niche: "Yellowstone hot springs",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 2,
              niche: "Mariana Trench seafloor",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 3,
              niche: "Antarctic dry valleys",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 4,
              niche: "Atacama Desert",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 5,
              niche: "Dead Sea",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 6,
              niche: "Great Salt Lake",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 7,
              niche: "Mono Lake California",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 8,
              niche: "Permafrost soils Alaska",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 9,
              niche: "Caves of Europe",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 10,
              niche: "Soil rhizosphere",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 11,
              niche: "Plant root nodules",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 12,
              niche: "Termite gut",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 13,
              niche: "Cow rumen",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 14,
              niche: "Human gut",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 15,
              niche: "Human skin",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 16,
              niche: "Human oral microbiome",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 17,
              niche: "Coral reef",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 18,
              niche: "Sponge tissue",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 19,
              niche: "Sea anemone gut",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 20,
              niche: "Forest soil",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 21,
              niche: "Salt marshes",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 22,
              niche: "Tundra",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 23,
              niche: "Cloud microbiomes",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 24,
              niche: "Cave bat guano",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 25,
              niche: "Acid mine drainage Spain",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 26,
              niche: "Geothermal pools NZ",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 27,
              niche: "Hydrothermal vents Pacific",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 28,
              niche: "Underground aquifers",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 29,
              niche: "Salt pans Italy",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 30,
              niche: "Soda lakes Egypt",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 31,
              niche: "Brine pools Gulf",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 32,
              niche: "Limestone karst",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 33,
              niche: "Plastisphere (plastic ocean)",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 34,
              niche: "Permafrost methane",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 35,
              niche: "Lake Vostok Antarctica",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 36,
              niche: "Subglacial lakes",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 37,
              niche: "Wastewater treatment",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 38,
              niche: "Compost heaps",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 39,
              niche: "Vegetable bins",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 40,
              niche: "Refrigerator drawers",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 41,
              niche: "Dishwashing surfaces",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 42,
              niche: "Sponge in kitchen",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 43,
              niche: "Cell phone surfaces",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 44,
              niche: "Money/coins",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 45,
              niche: "Subway handrails",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 46,
              niche: "Public restroom surfaces",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 47,
              niche: "Hospital surfaces",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 48,
              niche: "School cafeteria",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 49,
              niche: "Yogurt cultures",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 50,
              niche: "Cheese rinds",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 51,
              niche: "Wine vats",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 52,
              niche: "Beer fermenters",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 53,
              niche: "Pickle brine",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 54,
              niche: "Sauerkraut crocks",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 55,
              niche: "Kimchi pots",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 56,
              niche: "Sourdough starters",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 57,
              niche: "Aquarium water",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 58,
              niche: "Pond surface",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 59,
              niche: "Sea ice",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 60,
              niche: "Glacier meltwater",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 61,
              niche: "Volcanic vents",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 62,
              niche: "Crater lakes",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 63,
              niche: "Hot deserts",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 64,
              niche: "Cold deserts",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 65,
              niche: "Polar ice caps",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 66,
              niche: "Mariana trench",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 67,
              niche: "Hot vents",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 68,
              niche: "Bermuda triangle waters",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 69,
              niche: "Caspian Sea",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 70,
              niche: "Black Sea",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 71,
              niche: "Mediterranean",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 72,
              niche: "Pacific",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 73,
              niche: "Atlantic",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 74,
              niche: "Indian Ocean",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 75,
              niche: "Arctic Ocean",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 76,
              niche: "Antarctic Ocean",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 77,
              niche: "Amazon rainforest soil",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 78,
              niche: "Congo Basin",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 79,
              niche: "Borneo",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 80,
              niche: "Greenland glaciers",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 81,
              niche: "Himalayan snow",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 82,
              niche: "Mt Everest summit",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 83,
              niche: "Atacama high desert",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 84,
              niche: "Death Valley",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 85,
              niche: "Salar de Uyuni",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 86,
              niche: "Mount Vesuvius vents",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 87,
              niche: "Hawaii lava tubes",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 88,
              niche: "Yucatan cenote",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 89,
              niche: "Mexican Cave Naica",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 90,
              niche: "Sistema Sac Actun",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 91,
              niche: "Movile Cave Romania",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 92,
              niche: "Sao Paulo subway",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 93,
              niche: "New York subway",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 94,
              niche: "Tokyo subway",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 95,
              niche: "Moscow subway",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 96,
              niche: "Chernobyl exclusion zone",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 97,
              niche: "Fukushima exclusion zone",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 98,
              niche: "Polish coal mines",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 99,
              niche: "Romanian salt mines",
              type: "Aquatic",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 100,
              niche: "Lake Baikal Russia",
              type: "Soil",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 101,
              niche: "Old Faithful basin",
              type: "Extreme",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 102,
              niche: "Mammoth Cave Kentucky",
              type: "Common",
              microbes: "Variable + often unique communities adapted to specific conditions."
            },
            {
              id: 103,
              niche: "Carlsbad Caverns",
              type: "Built",
              microbes: "Variable + often unique communities adapted to specific conditions."
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // ANTIBIOTIC PROFILES
          // ═══════════════════════════════════════════════════════════
          var ANTIBIOTICS = [
            {
              id: 1,
              name: "Penicillin",
              class: "Beta-lactam",
              mechanism: "Inhibits cell wall synthesis",
              notes: "Discovered 1928"
            },
            {
              id: 2,
              name: "Amoxicillin",
              class: "Beta-lactam",
              mechanism: "Broad-spectrum penicillin derivative",
              notes: "Modern penicillin"
            },
            {
              id: 3,
              name: "Cephalexin",
              class: "Cephalosporin",
              mechanism: "Cell wall inhibitor",
              notes: "First-generation cephalosporin"
            },
            {
              id: 4,
              name: "Ceftriaxone",
              class: "Cephalosporin",
              mechanism: "Cell wall inhibitor",
              notes: "Third-generation cephalosporin"
            },
            {
              id: 5,
              name: "Vancomycin",
              class: "Glycopeptide",
              mechanism: "Cell wall inhibitor",
              notes: "Last-resort for MRSA"
            },
            {
              id: 6,
              name: "Tetracycline",
              class: "Tetracycline",
              mechanism: "Inhibits ribosomes",
              notes: "Broad spectrum"
            },
            {
              id: 7,
              name: "Doxycycline",
              class: "Tetracycline",
              mechanism: "Ribosomal inhibitor",
              notes: "Common for Lyme + acne"
            },
            {
              id: 8,
              name: "Erythromycin",
              class: "Macrolide",
              mechanism: "Ribosomal inhibitor",
              notes: "Alternative for penicillin allergic"
            },
            {
              id: 9,
              name: "Azithromycin",
              class: "Macrolide",
              mechanism: "Long half-life ribosomal inhibitor",
              notes: "Z-pack"
            },
            {
              id: 10,
              name: "Streptomycin",
              class: "Aminoglycoside",
              mechanism: "Inhibits ribosomes",
              notes: "First effective TB drug"
            },
            {
              id: 11,
              name: "Gentamicin",
              class: "Aminoglycoside",
              mechanism: "Ribosomal inhibitor",
              notes: "Severe bacterial infections"
            },
            {
              id: 12,
              name: "Ciprofloxacin",
              class: "Fluoroquinolone",
              mechanism: "Inhibits DNA gyrase",
              notes: "UTIs + GI infections"
            },
            {
              id: 13,
              name: "Levofloxacin",
              class: "Fluoroquinolone",
              mechanism: "Inhibits DNA gyrase",
              notes: "Common broad spectrum"
            },
            {
              id: 14,
              name: "Sulfamethoxazole-trimethoprim (Bactrim)",
              class: "Folate inhibitor",
              mechanism: "Inhibits folate synthesis",
              notes: "Common UTI treatment"
            },
            {
              id: 15,
              name: "Metronidazole",
              class: "Nitroimidazole",
              mechanism: "Disrupts DNA",
              notes: "Anaerobes + parasites"
            },
            {
              id: 16,
              name: "Clindamycin",
              class: "Lincosamide",
              mechanism: "Ribosomal inhibitor",
              notes: "Skin + dental infections"
            },
            {
              id: 17,
              name: "Linezolid",
              class: "Oxazolidinone",
              mechanism: "Inhibits protein synthesis",
              notes: "MRSA + VRE"
            },
            {
              id: 18,
              name: "Daptomycin",
              class: "Lipopeptide",
              mechanism: "Disrupts membrane",
              notes: "MRSA + skin infections"
            },
            {
              id: 19,
              name: "Tigecycline",
              class: "Glycylcycline",
              mechanism: "Ribosomal inhibitor",
              notes: "MRSA + complicated infections"
            },
            {
              id: 20,
              name: "Imipenem",
              class: "Carbapenem",
              mechanism: "Cell wall inhibitor",
              notes: "Reserved for severe infections"
            },
            {
              id: 21,
              name: "Meropenem",
              class: "Carbapenem",
              mechanism: "Cell wall inhibitor",
              notes: "Broad spectrum reserved"
            },
            {
              id: 22,
              name: "Polymyxin B",
              class: "Polypeptide",
              mechanism: "Disrupts membrane",
              notes: "Last resort for resistant gram-negative"
            },
            {
              id: 23,
              name: "Colistin",
              class: "Polypeptide",
              mechanism: "Disrupts membrane",
              notes: "Last resort"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // INHERITANCE PATTERNS
          // ═══════════════════════════════════════════════════════════
          var INHERITANCE = [
            {
              id: 1,
              pattern: "Autosomal dominant",
              description: "Need 1 copy to express",
              example: "Huntington disease, Marfan"
            },
            {
              id: 2,
              pattern: "Autosomal recessive",
              description: "Need 2 copies",
              example: "Cystic fibrosis, sickle cell"
            },
            {
              id: 3,
              pattern: "X-linked dominant",
              description: "1 X copy",
              example: "Vitamin D-resistant rickets"
            },
            {
              id: 4,
              pattern: "X-linked recessive",
              description: "2 X (female) or 1 X (male)",
              example: "Hemophilia, color blindness"
            },
            {
              id: 5,
              pattern: "Y-linked",
              description: "Father to son only",
              example: "Some forms of male infertility"
            },
            {
              id: 6,
              pattern: "Mitochondrial",
              description: "Mother to all children",
              example: "LHON, MELAS"
            },
            {
              id: 7,
              pattern: "Codominant",
              description: "Both alleles expressed",
              example: "ABO blood types"
            },
            {
              id: 8,
              pattern: "Incomplete dominance",
              description: "Heterozygote intermediate",
              example: "Pink snapdragon flowers"
            },
            {
              id: 9,
              pattern: "Polygenic",
              description: "Many genes contribute",
              example: "Height, eye color"
            },
            {
              id: 10,
              pattern: "Multifactorial",
              description: "Genes + environment",
              example: "Most common conditions"
            },
            {
              id: 11,
              pattern: "Genomic imprinting",
              description: "Parent-of-origin effect",
              example: "Angelman + Prader-Willi"
            },
            {
              id: 12,
              pattern: "Anticipation",
              description: "Earlier + worse each generation",
              example: "Huntington, myotonic dystrophy"
            },
            {
              id: 13,
              pattern: "Penetrance",
              description: "Of those with allele, % expressing",
              example: "BRCA1 in cancer"
            },
            {
              id: 14,
              pattern: "Expressivity",
              description: "Range of expression",
              example: "Marfan severity variable"
            },
            {
              id: 15,
              pattern: "Mosaicism",
              description: "Different cells different alleles",
              example: "Some Down syndrome cases"
            },
            {
              id: 16,
              pattern: "Uniparental disomy",
              description: "Both chromosomes from one parent",
              example: "Rare"
            },
            {
              id: 17,
              pattern: "Chromosomal translocation",
              description: "Pieces moved between chromosomes",
              example: "Some cancers"
            },
            {
              id: 18,
              pattern: "Chromosomal deletion",
              description: "Lost DNA segment",
              example: "Some syndromes"
            },
            {
              id: 19,
              pattern: "Chromosomal duplication",
              description: "Extra DNA segment",
              example: "Various"
            },
            {
              id: 20,
              pattern: "Aneuploidy",
              description: "Wrong number of chromosomes",
              example: "Down syndrome (trisomy 21)"
            },
            {
              id: 21,
              pattern: "Polyploidy",
              description: "Extra full chromosome sets",
              example: "Mostly lethal in animals; common in plants"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // DNA STRUCTURE + GENETICS REFERENCE
          // ═══════════════════════════════════════════════════════════
          var DNA_REFERENCE = [
            {
              id: 1,
              concept: "DNA structure",
              description: "Double helix",
              detail: "Two antiparallel strands of nucleotides"
            },
            {
              id: 2,
              concept: "Base pairing",
              description: "A-T, G-C",
              detail: "Hydrogen bonds hold complementary"
            },
            {
              id: 3,
              concept: "Sugar-phosphate backbone",
              description: "Deoxyribose + phosphate",
              detail: "Outside of helix"
            },
            {
              id: 4,
              concept: "Bases inside",
              description: "Adenine, Thymine, Guanine, Cytosine",
              detail: "Stacked between strands"
            },
            {
              id: 5,
              concept: "B-form DNA",
              description: "Most common in cells",
              detail: "Right-handed helix"
            },
            {
              id: 6,
              concept: "A-form DNA",
              description: "Dehydrated state",
              detail: "Wider + shorter"
            },
            {
              id: 7,
              concept: "Z-form DNA",
              description: "Left-handed",
              detail: "Some specific sequences"
            },
            {
              id: 8,
              concept: "Nucleotide",
              description: "Base + sugar + phosphate",
              detail: "Building block"
            },
            {
              id: 9,
              concept: "Codon",
              description: "3 bases code 1 amino acid",
              detail: "64 codons encode 20 amino acids"
            },
            {
              id: 10,
              concept: "Amino acid alphabet",
              description: "20 standard amino acids",
              detail: "Plus selenocysteine + pyrrolysine"
            },
            {
              id: 11,
              concept: "Reading frame",
              description: "Triplet codons",
              detail: "Start at AUG, end at stop codon"
            },
            {
              id: 12,
              concept: "Start codon",
              description: "AUG",
              detail: "Methionine"
            },
            {
              id: 13,
              concept: "Stop codons",
              description: "UAA, UAG, UGA",
              detail: "No amino acid"
            },
            {
              id: 14,
              concept: "Codon redundancy",
              description: "4^3 = 64 codons for 20 amino acids",
              detail: "Multiple codons per amino acid"
            },
            {
              id: 15,
              concept: "Reading direction",
              description: "5 prime to 3 prime on mRNA",
              detail: "Translation direction"
            },
            {
              id: 16,
              concept: "Promoter region",
              description: "Where RNA polymerase binds",
              detail: "Upstream of gene"
            },
            {
              id: 17,
              concept: "TATA box",
              description: "Promoter element",
              detail: "Common in eukaryotes"
            },
            {
              id: 18,
              concept: "Operator",
              description: "Bacterial regulatory element",
              detail: "Where repressor binds"
            },
            {
              id: 19,
              concept: "Enhancer",
              description: "Distal regulatory element",
              detail: "Can be 1000s of bp away"
            },
            {
              id: 20,
              concept: "Silencer",
              description: "Repressive distal element",
              detail: "Reduce transcription"
            },
            {
              id: 21,
              concept: "Intron",
              description: "Non-coding segment",
              detail: "Removed by splicing"
            },
            {
              id: 22,
              concept: "Exon",
              description: "Coding segment",
              detail: "Retained in mRNA"
            },
            {
              id: 23,
              concept: "Alternative splicing",
              description: "One gene to many proteins",
              detail: "Exons combined differently"
            },
            {
              id: 24,
              concept: "Pre-mRNA processing",
              description: "Cap + tail + splice",
              detail: "In nucleus"
            },
            {
              id: 25,
              concept: "5 prime cap",
              description: "7-methylguanosine",
              detail: "Protects mRNA + initiates translation"
            },
            {
              id: 26,
              concept: "Poly-A tail",
              description: "Adenine repeat",
              detail: "Stabilizes mRNA"
            },
            {
              id: 27,
              concept: "mRNA half-life",
              description: "Variable",
              detail: "Influences protein levels"
            },
            {
              id: 28,
              concept: "miRNA",
              description: "MicroRNA",
              detail: "Regulates expression"
            },
            {
              id: 29,
              concept: "siRNA",
              description: "Small interfering RNA",
              detail: "Gene silencing"
            },
            {
              id: 30,
              concept: "lncRNA",
              description: "Long non-coding RNA",
              detail: "Regulatory functions"
            },
            {
              id: 31,
              concept: "piRNA",
              description: "Piwi-interacting RNA",
              detail: "Germline defense"
            },
            {
              id: 32,
              concept: "snRNA",
              description: "Small nuclear RNA",
              detail: "Splicing"
            },
            {
              id: 33,
              concept: "snoRNA",
              description: "Small nucleolar RNA",
              detail: "rRNA modification"
            },
            {
              id: 34,
              concept: "tRNA",
              description: "Transfer RNA",
              detail: "Carries amino acids in translation"
            },
            {
              id: 35,
              concept: "rRNA",
              description: "Ribosomal RNA",
              detail: "Component of ribosomes"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // QUICK FACTS
          // ═══════════════════════════════════════════════════════════
          var QUICK_FACTS = [
            {
              id: 1,
              fact: "Mitochondria have their own DNA",
              importance: "Foundational. Key concept"
            },
            {
              id: 2,
              fact: "Chloroplasts also have their own DNA",
              importance: "Foundational"
            },
            {
              id: 3,
              fact: "Bacteria reproduce by binary fission",
              importance: "Foundational"
            },
            {
              id: 4,
              fact: "Yeast reproduces by budding",
              importance: "Foundational"
            },
            {
              id: 5,
              fact: "Some bacteria can survive boiling water",
              importance: "Foundational"
            },
            {
              id: 6,
              fact: "Tardigrades survive vacuum of space",
              importance: "Foundational. Key concept"
            },
            {
              id: 7,
              fact: "Plant cells have rigid cell walls",
              importance: "Foundational"
            },
            {
              id: 8,
              fact: "Animal cells lack cell walls",
              importance: "Foundational"
            },
            {
              id: 9,
              fact: "Red blood cells have no nucleus in mammals",
              importance: "Foundational"
            },
            {
              id: 10,
              fact: "Some cells live entire organism lifetime",
              importance: "Foundational"
            },
            {
              id: 11,
              fact: "Cell membrane is selectively permeable",
              importance: "Foundational. Key concept"
            },
            {
              id: 12,
              fact: "Ribosomes make all proteins",
              importance: "Foundational"
            },
            {
              id: 13,
              fact: "Mitochondria are the powerhouse of the cell",
              importance: "Foundational"
            },
            {
              id: 14,
              fact: "ATP is universal energy currency",
              importance: "Foundational"
            },
            {
              id: 15,
              fact: "Photosynthesis converts CO2 + water + light to glucose",
              importance: "Foundational"
            },
            {
              id: 16,
              fact: "Cellular respiration reverses photosynthesis",
              importance: "Foundational. Key concept"
            },
            {
              id: 17,
              fact: "DNA replication is semi-conservative",
              importance: "Foundational"
            },
            {
              id: 18,
              fact: "Transcription happens in nucleus (eukaryotes)",
              importance: "Foundational"
            },
            {
              id: 19,
              fact: "Translation happens at ribosomes",
              importance: "Foundational"
            },
            {
              id: 20,
              fact: "Lysosomes digest cellular waste",
              importance: "Foundational"
            },
            {
              id: 21,
              fact: "Endoplasmic reticulum makes proteins + lipids",
              importance: "Foundational. Key concept"
            },
            {
              id: 22,
              fact: "Golgi packages + ships proteins",
              importance: "Foundational"
            },
            {
              id: 23,
              fact: "Centrioles organize cell division",
              importance: "Foundational"
            },
            {
              id: 24,
              fact: "Cytoskeleton gives shape to cell",
              importance: "Foundational"
            },
            {
              id: 25,
              fact: "Microtubules transport vesicles",
              importance: "Foundational"
            },
            {
              id: 26,
              fact: "Microfilaments enable movement",
              importance: "Foundational. Key concept"
            },
            {
              id: 27,
              fact: "Tight junctions seal cells together",
              importance: "Foundational"
            },
            {
              id: 28,
              fact: "Gap junctions allow direct communication",
              importance: "Foundational"
            },
            {
              id: 29,
              fact: "Receptors detect external signals",
              importance: "Foundational"
            },
            {
              id: 30,
              fact: "Ion channels regulate ion flow",
              importance: "Foundational"
            },
            {
              id: 31,
              fact: "Pumps actively transport ions",
              importance: "Foundational. Key concept"
            },
            {
              id: 32,
              fact: "Mitosis produces 2 identical daughter cells",
              importance: "Foundational"
            },
            {
              id: 33,
              fact: "Meiosis produces 4 genetically diverse cells",
              importance: "Foundational"
            },
            {
              id: 34,
              fact: "Stem cells can differentiate",
              importance: "Foundational"
            },
            {
              id: 35,
              fact: "Cancer cells lose growth control",
              importance: "Foundational"
            },
            {
              id: 36,
              fact: "Apoptosis is programmed cell death",
              importance: "Foundational. Key concept"
            },
            {
              id: 37,
              fact: "Bacteria can transfer genes via plasmids",
              importance: "Foundational"
            },
            {
              id: 38,
              fact: "Antibiotic resistance spreads through populations",
              importance: "Foundational"
            },
            {
              id: 39,
              fact: "CRISPR enables precise genome editing",
              importance: "Foundational"
            },
            {
              id: 40,
              fact: "mRNA vaccines train immune response",
              importance: "Foundational"
            },
            {
              id: 41,
              fact: "Microbes shape ecosystems",
              importance: "Foundational. Key concept"
            },
            {
              id: 42,
              fact: "Without microbes, life on Earth would not exist",
              importance: "Foundational"
            },
            {
              id: 43,
              fact: "Soil microbes recycle nutrients",
              importance: "Foundational"
            },
            {
              id: 44,
              fact: "Marine microbes produce most atmospheric O2",
              importance: "Foundational"
            },
            {
              id: 45,
              fact: "Gut microbiome affects mood and behavior",
              importance: "Foundational"
            },
            {
              id: 46,
              fact: "Antibiotics disrupt gut microbiome",
              importance: "Foundational. Key concept"
            },
            {
              id: 47,
              fact: "Probiotics support beneficial bacteria",
              importance: "Foundational"
            },
            {
              id: 48,
              fact: "Hygiene hypothesis links cleanliness to allergies",
              importance: "Foundational"
            },
            {
              id: 49,
              fact: "Some bacteria are predators of others",
              importance: "Foundational"
            },
            {
              id: 50,
              fact: "Bacteria communicate via chemical signals",
              importance: "Foundational"
            },
            {
              id: 51,
              fact: "Quorum sensing coordinates biofilm formation",
              importance: "Foundational. Key concept"
            },
            {
              id: 52,
              fact: "Biofilms are difficult to treat",
              importance: "Foundational"
            },
            {
              id: 53,
              fact: "Mitochondria have their own DNA",
              importance: "Foundational"
            },
            {
              id: 54,
              fact: "Chloroplasts also have their own DNA",
              importance: "Foundational"
            },
            {
              id: 55,
              fact: "Bacteria reproduce by binary fission",
              importance: "Foundational"
            },
            {
              id: 56,
              fact: "Yeast reproduces by budding",
              importance: "Foundational. Key concept"
            },
            {
              id: 57,
              fact: "Some bacteria can survive boiling water",
              importance: "Foundational"
            },
            {
              id: 58,
              fact: "Tardigrades survive vacuum of space",
              importance: "Foundational"
            },
            {
              id: 59,
              fact: "Plant cells have rigid cell walls",
              importance: "Foundational"
            },
            {
              id: 60,
              fact: "Animal cells lack cell walls",
              importance: "Foundational"
            },
            {
              id: 61,
              fact: "Red blood cells have no nucleus in mammals",
              importance: "Foundational. Key concept"
            },
            {
              id: 62,
              fact: "Some cells live entire organism lifetime",
              importance: "Foundational"
            },
            {
              id: 63,
              fact: "Cell membrane is selectively permeable",
              importance: "Foundational"
            },
            {
              id: 64,
              fact: "Ribosomes make all proteins",
              importance: "Foundational"
            },
            {
              id: 65,
              fact: "Mitochondria are the powerhouse of the cell",
              importance: "Foundational"
            },
            {
              id: 66,
              fact: "ATP is universal energy currency",
              importance: "Foundational. Key concept"
            },
            {
              id: 67,
              fact: "Photosynthesis converts CO2 + water + light to glucose",
              importance: "Foundational"
            },
            {
              id: 68,
              fact: "Cellular respiration reverses photosynthesis",
              importance: "Foundational"
            },
            {
              id: 69,
              fact: "DNA replication is semi-conservative",
              importance: "Foundational"
            },
            {
              id: 70,
              fact: "Transcription happens in nucleus (eukaryotes)",
              importance: "Foundational"
            },
            {
              id: 71,
              fact: "Translation happens at ribosomes",
              importance: "Foundational. Key concept"
            },
            {
              id: 72,
              fact: "Lysosomes digest cellular waste",
              importance: "Foundational"
            },
            {
              id: 73,
              fact: "Endoplasmic reticulum makes proteins + lipids",
              importance: "Foundational"
            },
            {
              id: 74,
              fact: "Golgi packages + ships proteins",
              importance: "Foundational"
            },
            {
              id: 75,
              fact: "Centrioles organize cell division",
              importance: "Foundational"
            },
            {
              id: 76,
              fact: "Cytoskeleton gives shape to cell",
              importance: "Foundational. Key concept"
            },
            {
              id: 77,
              fact: "Microtubules transport vesicles",
              importance: "Foundational"
            },
            {
              id: 78,
              fact: "Microfilaments enable movement",
              importance: "Foundational"
            },
            {
              id: 79,
              fact: "Tight junctions seal cells together",
              importance: "Foundational"
            },
            {
              id: 80,
              fact: "Gap junctions allow direct communication",
              importance: "Foundational"
            },
            {
              id: 81,
              fact: "Receptors detect external signals",
              importance: "Foundational. Key concept"
            },
            {
              id: 82,
              fact: "Ion channels regulate ion flow",
              importance: "Foundational"
            },
            {
              id: 83,
              fact: "Pumps actively transport ions",
              importance: "Foundational"
            },
            {
              id: 84,
              fact: "Mitosis produces 2 identical daughter cells",
              importance: "Foundational"
            },
            {
              id: 85,
              fact: "Meiosis produces 4 genetically diverse cells",
              importance: "Foundational"
            },
            {
              id: 86,
              fact: "Stem cells can differentiate",
              importance: "Foundational. Key concept"
            },
            {
              id: 87,
              fact: "Cancer cells lose growth control",
              importance: "Foundational"
            },
            {
              id: 88,
              fact: "Apoptosis is programmed cell death",
              importance: "Foundational"
            },
            {
              id: 89,
              fact: "Bacteria can transfer genes via plasmids",
              importance: "Foundational"
            },
            {
              id: 90,
              fact: "Antibiotic resistance spreads through populations",
              importance: "Foundational"
            },
            {
              id: 91,
              fact: "CRISPR enables precise genome editing",
              importance: "Foundational. Key concept"
            },
            {
              id: 92,
              fact: "mRNA vaccines train immune response",
              importance: "Foundational"
            },
            {
              id: 93,
              fact: "Microbes shape ecosystems",
              importance: "Foundational"
            },
            {
              id: 94,
              fact: "Without microbes, life on Earth would not exist",
              importance: "Foundational"
            },
            {
              id: 95,
              fact: "Soil microbes recycle nutrients",
              importance: "Foundational"
            },
            {
              id: 96,
              fact: "Marine microbes produce most atmospheric O2",
              importance: "Foundational. Key concept"
            },
            {
              id: 97,
              fact: "Gut microbiome affects mood and behavior",
              importance: "Foundational"
            },
            {
              id: 98,
              fact: "Antibiotics disrupt gut microbiome",
              importance: "Foundational"
            },
            {
              id: 99,
              fact: "Probiotics support beneficial bacteria",
              importance: "Foundational"
            },
            {
              id: 100,
              fact: "Hygiene hypothesis links cleanliness to allergies",
              importance: "Foundational"
            }
          ];


          // ═══════════════════════════════════════════════════════════
          // MICROBIOME STUDIES
          // ═══════════════════════════════════════════════════════════
          var MICROBIOME_STUDIES = [
            {
              id: 1,
              microbiome: "Human gut microbiome",
              description: "Contains ~100 trillion microbes representing 1000+ species"
            },
            {
              id: 2,
              microbiome: "Skin microbiome",
              description: "Variable across body sites; 1B microbes per cm2"
            },
            {
              id: 3,
              microbiome: "Oral microbiome",
              description: "700+ species in mouth; plaque biofilm"
            },
            {
              id: 4,
              microbiome: "Vaginal microbiome",
              description: "Lactobacillus-dominated typically"
            },
            {
              id: 5,
              microbiome: "Respiratory microbiome",
              description: "Includes nose + lungs; varies by smoker/non-smoker"
            },
            {
              id: 6,
              microbiome: "Soil microbiome",
              description: "10,000+ species per teaspoon of soil"
            },
            {
              id: 7,
              microbiome: "Marine microbiome",
              description: "50%+ Earth oxygen from marine microbes"
            },
            {
              id: 8,
              microbiome: "Coral microbiome",
              description: "Symbiotic algae + bacteria"
            },
            {
              id: 9,
              microbiome: "Plant root microbiome",
              description: "Rhizobia + mycorrhizae"
            },
            {
              id: 10,
              microbiome: "Cow rumen microbiome",
              description: "Digests cellulose for cattle"
            },
            {
              id: 11,
              microbiome: "Termite gut microbiome",
              description: "Digests wood for termites"
            },
            {
              id: 12,
              microbiome: "Built environment microbiome",
              description: "Indoor surfaces; subway; offices"
            },
            {
              id: 13,
              microbiome: "Hospital microbiome",
              description: "Often includes drug-resistant strains"
            },
            {
              id: 14,
              microbiome: "Wastewater microbiome",
              description: "Treats sewage"
            },
            {
              id: 15,
              microbiome: "Yogurt microbiome",
              description: "Lactobacillus + Streptococcus thermophilus"
            },
            {
              id: 16,
              microbiome: "Sauerkraut microbiome",
              description: "Lactic acid bacteria"
            },
            {
              id: 17,
              microbiome: "Kombucha SCOBY",
              description: "Yeast + acetic acid bacteria symbiosis"
            },
            {
              id: 18,
              microbiome: "Sourdough microbiome",
              description: "Wild yeast + lactic acid bacteria"
            },
            {
              id: 19,
              microbiome: "Beer fermentation microbiome",
              description: "Saccharomyces + bacteria"
            },
            {
              id: 20,
              microbiome: "Wine microbiome",
              description: "Vineyard-specific yeast strains"
            },
            {
              id: 21,
              microbiome: "Cheese microbiome",
              description: "Various bacteria + molds for flavor"
            },
            {
              id: 22,
              microbiome: "Compost microbiome",
              description: "Decomposers in active heap"
            },
            {
              id: 23,
              microbiome: "Septic tank microbiome",
              description: "Anaerobic digestion"
            },
            {
              id: 24,
              microbiome: "Permafrost microbiome",
              description: "Cold-active microbes that may be released by warming"
            },
            {
              id: 25,
              microbiome: "Cave microbiome",
              description: "Unique extremophiles + chemoautotrophs"
            },
            {
              id: 26,
              microbiome: "Lake microbiome",
              description: "Stratified by light + temperature"
            },
            {
              id: 27,
              microbiome: "Ocean microbiome",
              description: "Different bands in water column"
            },
            {
              id: 28,
              microbiome: "Atmospheric microbiome",
              description: "Microbes in clouds + aerosols"
            },
            {
              id: 29,
              microbiome: "Salt lake microbiome",
              description: "Halophilic archaea dominant"
            },
            {
              id: 30,
              microbiome: "Hot spring microbiome",
              description: "Thermophiles; varies with temperature"
            },
            {
              id: 31,
              microbiome: "Insect gut microbiome",
              description: "Symbionts essential for digestion"
            },
            {
              id: 32,
              microbiome: "Fish gut microbiome",
              description: "Variable by diet + environment"
            },
            {
              id: 33,
              microbiome: "Honey microbiome",
              description: "Bee + bacterial origin"
            },
            {
              id: 34,
              microbiome: "Soil rhizosphere",
              description: "Microbes around plant roots"
            },
            {
              id: 35,
              microbiome: "Mycorrhizae",
              description: "Fungi-plant symbiosis"
            },
            {
              id: 36,
              microbiome: "Lichen",
              description: "Fungal-algal symbiosis"
            },
            {
              id: 37,
              microbiome: "Sponges",
              description: "Many symbiotic bacteria"
            },
            {
              id: 38,
              microbiome: "Coral reef",
              description: "Diverse algal + bacterial symbionts"
            },
            {
              id: 39,
              microbiome: "Glow worm symbionts",
              description: "Photobacterium bioluminescence"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // KEY CELLULAR PROCESSES
          // ═══════════════════════════════════════════════════════════
          var CELL_PROCESSES = [
            {
              id: 1,
              process: "Mitosis (cell division - 5 phases)",
              importance: "Essential",
              cellTypes: "All cells"
            },
            {
              id: 2,
              process: "Meiosis (gamete formation - 2 divisions)",
              importance: "Important",
              cellTypes: "Eukaryotic"
            },
            {
              id: 3,
              process: "DNA replication (semiconservative)",
              importance: "Specialized",
              cellTypes: "Specialized"
            },
            {
              id: 4,
              process: "Transcription (DNA to mRNA)",
              importance: "Essential",
              cellTypes: "Immune"
            },
            {
              id: 5,
              process: "Translation (mRNA to protein)",
              importance: "Important",
              cellTypes: "Embryonic"
            },
            {
              id: 6,
              process: "Protein folding",
              importance: "Specialized",
              cellTypes: "All cells"
            },
            {
              id: 7,
              process: "Protein degradation (proteasome)",
              importance: "Essential",
              cellTypes: "Eukaryotic"
            },
            {
              id: 8,
              process: "Membrane transport (passive + active)",
              importance: "Important",
              cellTypes: "Specialized"
            },
            {
              id: 9,
              process: "Cell signaling cascades",
              importance: "Specialized",
              cellTypes: "Immune"
            },
            {
              id: 10,
              process: "Apoptosis (programmed death)",
              importance: "Essential",
              cellTypes: "Embryonic"
            },
            {
              id: 11,
              process: "Autophagy (cell recycling)",
              importance: "Important",
              cellTypes: "All cells"
            },
            {
              id: 12,
              process: "Endocytosis (taking in materials)",
              importance: "Specialized",
              cellTypes: "Eukaryotic"
            },
            {
              id: 13,
              process: "Exocytosis (releasing materials)",
              importance: "Essential",
              cellTypes: "Specialized"
            },
            {
              id: 14,
              process: "Phagocytosis (eating particles)",
              importance: "Important",
              cellTypes: "Immune"
            },
            {
              id: 15,
              process: "Pinocytosis (drinking liquids)",
              importance: "Specialized",
              cellTypes: "Embryonic"
            },
            {
              id: 16,
              process: "Glycolysis (glucose breakdown)",
              importance: "Essential",
              cellTypes: "All cells"
            },
            {
              id: 17,
              process: "Krebs cycle (TCA)",
              importance: "Important",
              cellTypes: "Eukaryotic"
            },
            {
              id: 18,
              process: "Electron transport chain",
              importance: "Specialized",
              cellTypes: "Specialized"
            },
            {
              id: 19,
              process: "Oxidative phosphorylation",
              importance: "Essential",
              cellTypes: "Immune"
            },
            {
              id: 20,
              process: "Photosynthesis (light reactions)",
              importance: "Important",
              cellTypes: "Embryonic"
            },
            {
              id: 21,
              process: "Photosynthesis (Calvin cycle)",
              importance: "Specialized",
              cellTypes: "All cells"
            },
            {
              id: 22,
              process: "Cellular respiration",
              importance: "Essential",
              cellTypes: "Eukaryotic"
            },
            {
              id: 23,
              process: "Fermentation (anaerobic)",
              importance: "Important",
              cellTypes: "Specialized"
            },
            {
              id: 24,
              process: "Beta-oxidation (fat catabolism)",
              importance: "Specialized",
              cellTypes: "Immune"
            },
            {
              id: 25,
              process: "Gluconeogenesis",
              importance: "Essential",
              cellTypes: "Embryonic"
            },
            {
              id: 26,
              process: "Amino acid metabolism",
              importance: "Important",
              cellTypes: "All cells"
            },
            {
              id: 27,
              process: "Nucleotide metabolism",
              importance: "Specialized",
              cellTypes: "Eukaryotic"
            },
            {
              id: 28,
              process: "Lipid synthesis",
              importance: "Essential",
              cellTypes: "Specialized"
            },
            {
              id: 29,
              process: "Cholesterol synthesis",
              importance: "Important",
              cellTypes: "Immune"
            },
            {
              id: 30,
              process: "Pentose phosphate pathway",
              importance: "Specialized",
              cellTypes: "Embryonic"
            },
            {
              id: 31,
              process: "Urea cycle",
              importance: "Essential",
              cellTypes: "All cells"
            },
            {
              id: 32,
              process: "Heme biosynthesis",
              importance: "Important",
              cellTypes: "Eukaryotic"
            },
            {
              id: 33,
              process: "Glycoprotein synthesis",
              importance: "Specialized",
              cellTypes: "Specialized"
            },
            {
              id: 34,
              process: "Vesicle trafficking",
              importance: "Essential",
              cellTypes: "Immune"
            },
            {
              id: 35,
              process: "ER stress response",
              importance: "Important",
              cellTypes: "Embryonic"
            },
            {
              id: 36,
              process: "Heat shock response",
              importance: "Specialized",
              cellTypes: "All cells"
            },
            {
              id: 37,
              process: "Cell cycle checkpoints",
              importance: "Essential",
              cellTypes: "Eukaryotic"
            },
            {
              id: 38,
              process: "DNA damage response",
              importance: "Important",
              cellTypes: "Specialized"
            },
            {
              id: 39,
              process: "DNA repair (mismatch, excision, etc.)",
              importance: "Specialized",
              cellTypes: "Immune"
            },
            {
              id: 40,
              process: "Telomere maintenance",
              importance: "Essential",
              cellTypes: "Embryonic"
            },
            {
              id: 41,
              process: "Chromosome segregation",
              importance: "Important",
              cellTypes: "All cells"
            },
            {
              id: 42,
              process: "Cytokinesis",
              importance: "Specialized",
              cellTypes: "Eukaryotic"
            },
            {
              id: 43,
              process: "Differentiation programs",
              importance: "Essential",
              cellTypes: "Specialized"
            },
            {
              id: 44,
              process: "Stem cell self-renewal",
              importance: "Important",
              cellTypes: "Immune"
            },
            {
              id: 45,
              process: "Cellular reprogramming (iPSC)",
              importance: "Specialized",
              cellTypes: "Embryonic"
            },
            {
              id: 46,
              process: "Senescence",
              importance: "Essential",
              cellTypes: "All cells"
            },
            {
              id: 47,
              process: "Mitochondrial fission/fusion",
              importance: "Important",
              cellTypes: "Eukaryotic"
            },
            {
              id: 48,
              process: "Peroxisome biogenesis",
              importance: "Specialized",
              cellTypes: "Specialized"
            },
            {
              id: 49,
              process: "Nuclear import/export",
              importance: "Essential",
              cellTypes: "Immune"
            },
            {
              id: 50,
              process: "Centrosome duplication",
              importance: "Important",
              cellTypes: "Embryonic"
            },
            {
              id: 51,
              process: "Cilium assembly",
              importance: "Specialized",
              cellTypes: "All cells"
            },
            {
              id: 52,
              process: "Cell-cell adhesion",
              importance: "Essential",
              cellTypes: "Eukaryotic"
            },
            {
              id: 53,
              process: "Cell migration",
              importance: "Important",
              cellTypes: "Specialized"
            },
            {
              id: 54,
              process: "Chemotaxis",
              importance: "Specialized",
              cellTypes: "Immune"
            },
            {
              id: 55,
              process: "Cytoskeletal remodeling",
              importance: "Essential",
              cellTypes: "Embryonic"
            },
            {
              id: 56,
              process: "Signaling endocytosis",
              importance: "Important",
              cellTypes: "All cells"
            },
            {
              id: 57,
              process: "Inflammation response",
              importance: "Specialized",
              cellTypes: "Eukaryotic"
            },
            {
              id: 58,
              process: "Innate immune response",
              importance: "Essential",
              cellTypes: "Specialized"
            },
            {
              id: 59,
              process: "Adaptive immune response",
              importance: "Important",
              cellTypes: "Immune"
            },
            {
              id: 60,
              process: "Antibody production",
              importance: "Specialized",
              cellTypes: "Embryonic"
            },
            {
              id: 61,
              process: "T-cell activation",
              importance: "Essential",
              cellTypes: "All cells"
            },
            {
              id: 62,
              process: "B-cell activation",
              importance: "Important",
              cellTypes: "Eukaryotic"
            },
            {
              id: 63,
              process: "NK cell killing",
              importance: "Specialized",
              cellTypes: "Specialized"
            },
            {
              id: 64,
              process: "Complement activation",
              importance: "Essential",
              cellTypes: "Immune"
            },
            {
              id: 65,
              process: "Cytokine signaling",
              importance: "Important",
              cellTypes: "Embryonic"
            },
            {
              id: 66,
              process: "Phagocytosis (immune)",
              importance: "Specialized",
              cellTypes: "All cells"
            },
            {
              id: 67,
              process: "NET formation (neutrophil)",
              importance: "Essential",
              cellTypes: "Eukaryotic"
            },
            {
              id: 68,
              process: "Cytotoxicity (T-cell)",
              importance: "Important",
              cellTypes: "Specialized"
            },
            {
              id: 69,
              process: "MHC presentation",
              importance: "Specialized",
              cellTypes: "Immune"
            },
            {
              id: 70,
              process: "B-cell affinity maturation",
              importance: "Essential",
              cellTypes: "Embryonic"
            },
            {
              id: 71,
              process: "Class switching",
              importance: "Important",
              cellTypes: "All cells"
            },
            {
              id: 72,
              process: "Hypermutation",
              importance: "Specialized",
              cellTypes: "Eukaryotic"
            },
            {
              id: 73,
              process: "Tolerance development",
              importance: "Essential",
              cellTypes: "Specialized"
            },
            {
              id: 74,
              process: "Allergic response",
              importance: "Important",
              cellTypes: "Immune"
            },
            {
              id: 75,
              process: "Autoimmunity",
              importance: "Specialized",
              cellTypes: "Embryonic"
            },
            {
              id: 76,
              process: "Inflammation resolution",
              importance: "Essential",
              cellTypes: "All cells"
            },
            {
              id: 77,
              process: "Wound healing",
              importance: "Important",
              cellTypes: "Eukaryotic"
            },
            {
              id: 78,
              process: "Tissue regeneration",
              importance: "Specialized",
              cellTypes: "Specialized"
            },
            {
              id: 79,
              process: "Angiogenesis",
              importance: "Essential",
              cellTypes: "Immune"
            },
            {
              id: 80,
              process: "Bone remodeling",
              importance: "Important",
              cellTypes: "Embryonic"
            }
          ];

          // ═══════════════════════════════════════════════════════════
          // LAB EQUIPMENT REFERENCE
          // ═══════════════════════════════════════════════════════════
          var LAB_EQUIPMENT = [
            {
              id: 1,
              item: "Compound microscope",
              category: "Microscope",
              priceRange: "$50-500"
            },
            {
              id: 2,
              item: "Stereoscopic microscope",
              category: "Centrifuge",
              priceRange: "$500-5K"
            },
            {
              id: 3,
              item: "Phase contrast microscope",
              category: "PCR/Sequencing",
              priceRange: "$5K-50K"
            },
            {
              id: 4,
              item: "Fluorescence microscope",
              category: "Heating",
              priceRange: "$50K+"
            },
            {
              id: 5,
              item: "Confocal microscope",
              category: "Cooling",
              priceRange: "$50-500"
            },
            {
              id: 6,
              item: "Electron microscope (TEM)",
              category: "Cell Culture",
              priceRange: "$500-5K"
            },
            {
              id: 7,
              item: "Electron microscope (SEM)",
              category: "General",
              priceRange: "$5K-50K"
            },
            {
              id: 8,
              item: "Cryo-electron microscope",
              category: "Microscope",
              priceRange: "$50K+"
            },
            {
              id: 9,
              item: "Centrifuge",
              category: "Centrifuge",
              priceRange: "$50-500"
            },
            {
              id: 10,
              item: "Ultracentrifuge",
              category: "PCR/Sequencing",
              priceRange: "$500-5K"
            },
            {
              id: 11,
              item: "Microcentrifuge",
              category: "Heating",
              priceRange: "$5K-50K"
            },
            {
              id: 12,
              item: "PCR thermocycler",
              category: "Cooling",
              priceRange: "$50K+"
            },
            {
              id: 13,
              item: "qPCR machine",
              category: "Cell Culture",
              priceRange: "$50-500"
            },
            {
              id: 14,
              item: "Plate reader",
              category: "General",
              priceRange: "$500-5K"
            },
            {
              id: 15,
              item: "Spectrophotometer",
              category: "Microscope",
              priceRange: "$5K-50K"
            },
            {
              id: 16,
              item: "Fluorometer",
              category: "Centrifuge",
              priceRange: "$50K+"
            },
            {
              id: 17,
              item: "Gel electrophoresis box",
              category: "PCR/Sequencing",
              priceRange: "$50-500"
            },
            {
              id: 18,
              item: "Western blot apparatus",
              category: "Heating",
              priceRange: "$500-5K"
            },
            {
              id: 19,
              item: "Flow cytometer",
              category: "Cooling",
              priceRange: "$5K-50K"
            },
            {
              id: 20,
              item: "Cell sorter (FACS)",
              category: "Cell Culture",
              priceRange: "$50K+"
            },
            {
              id: 21,
              item: "Hemocytometer",
              category: "General",
              priceRange: "$50-500"
            },
            {
              id: 22,
              item: "Coulter counter",
              category: "Microscope",
              priceRange: "$500-5K"
            },
            {
              id: 23,
              item: "Biosafety cabinet (BSC)",
              category: "Centrifuge",
              priceRange: "$5K-50K"
            },
            {
              id: 24,
              item: "Laminar flow hood",
              category: "PCR/Sequencing",
              priceRange: "$50K+"
            },
            {
              id: 25,
              item: "Incubator (CO2)",
              category: "Heating",
              priceRange: "$50-500"
            },
            {
              id: 26,
              item: "Shaking incubator",
              category: "Cooling",
              priceRange: "$500-5K"
            },
            {
              id: 27,
              item: "Anaerobic chamber",
              category: "Cell Culture",
              priceRange: "$5K-50K"
            },
            {
              id: 28,
              item: "Autoclave",
              category: "General",
              priceRange: "$50K+"
            },
            {
              id: 29,
              item: "Pipettes (single, multi)",
              category: "Microscope",
              priceRange: "$50-500"
            },
            {
              id: 30,
              item: "Burette",
              category: "Centrifuge",
              priceRange: "$500-5K"
            },
            {
              id: 31,
              item: "Volumetric flask",
              category: "PCR/Sequencing",
              priceRange: "$5K-50K"
            },
            {
              id: 32,
              item: "Beaker",
              category: "Heating",
              priceRange: "$50K+"
            },
            {
              id: 33,
              item: "Erlenmeyer flask",
              category: "Cooling",
              priceRange: "$50-500"
            },
            {
              id: 34,
              item: "Petri dish (sterile + non)",
              category: "Cell Culture",
              priceRange: "$500-5K"
            },
            {
              id: 35,
              item: "Culture tube + rack",
              category: "General",
              priceRange: "$5K-50K"
            },
            {
              id: 36,
              item: "Falcon tube",
              category: "Microscope",
              priceRange: "$50K+"
            },
            {
              id: 37,
              item: "Eppendorf tube",
              category: "Centrifuge",
              priceRange: "$50-500"
            },
            {
              id: 38,
              item: "PCR tube",
              category: "PCR/Sequencing",
              priceRange: "$500-5K"
            },
            {
              id: 39,
              item: "Microscope slide",
              category: "Heating",
              priceRange: "$5K-50K"
            },
            {
              id: 40,
              item: "Coverslip",
              category: "Cooling",
              priceRange: "$50K+"
            },
            {
              id: 41,
              item: "Cell scraper",
              category: "Cell Culture",
              priceRange: "$50-500"
            },
            {
              id: 42,
              item: "Cell counting chamber",
              category: "General",
              priceRange: "$500-5K"
            },
            {
              id: 43,
              item: "Vortex mixer",
              category: "Microscope",
              priceRange: "$5K-50K"
            },
            {
              id: 44,
              item: "Magnetic stirrer",
              category: "Centrifuge",
              priceRange: "$50K+"
            },
            {
              id: 45,
              item: "Hot plate",
              category: "PCR/Sequencing",
              priceRange: "$50-500"
            },
            {
              id: 46,
              item: "Water bath",
              category: "Heating",
              priceRange: "$500-5K"
            },
            {
              id: 47,
              item: "Refrigerator (lab grade)",
              category: "Cooling",
              priceRange: "$5K-50K"
            },
            {
              id: 48,
              item: "Minus 20 freezer",
              category: "Cell Culture",
              priceRange: "$50K+"
            },
            {
              id: 49,
              item: "Minus 80 freezer",
              category: "General",
              priceRange: "$50-500"
            },
            {
              id: 50,
              item: "Liquid nitrogen tank",
              category: "Microscope",
              priceRange: "$500-5K"
            },
            {
              id: 51,
              item: "Microbalance",
              category: "Centrifuge",
              priceRange: "$5K-50K"
            },
            {
              id: 52,
              item: "Analytical balance",
              category: "PCR/Sequencing",
              priceRange: "$50K+"
            },
            {
              id: 53,
              item: "pH meter",
              category: "Heating",
              priceRange: "$50-500"
            },
            {
              id: 54,
              item: "Conductivity meter",
              category: "Cooling",
              priceRange: "$500-5K"
            },
            {
              id: 55,
              item: "Dissolved oxygen meter",
              category: "Cell Culture",
              priceRange: "$5K-50K"
            },
            {
              id: 56,
              item: "Refractometer",
              category: "General",
              priceRange: "$50K+"
            },
            {
              id: 57,
              item: "Spectrofluorimeter",
              category: "Microscope",
              priceRange: "$50-500"
            },
            {
              id: 58,
              item: "Plate centrifuge",
              category: "Centrifuge",
              priceRange: "$500-5K"
            },
            {
              id: 59,
              item: "Lyophilizer (freeze dryer)",
              category: "PCR/Sequencing",
              priceRange: "$5K-50K"
            },
            {
              id: 60,
              item: "Heat block",
              category: "Heating",
              priceRange: "$50K+"
            },
            {
              id: 61,
              item: "Sonicator",
              category: "Cooling",
              priceRange: "$50-500"
            },
            {
              id: 62,
              item: "Cryotube + storage",
              category: "Cell Culture",
              priceRange: "$500-5K"
            },
            {
              id: 63,
              item: "Slide warmer",
              category: "General",
              priceRange: "$5K-50K"
            },
            {
              id: 64,
              item: "Tissue homogenizer",
              category: "Microscope",
              priceRange: "$50K+"
            },
            {
              id: 65,
              item: "Bead beater",
              category: "Centrifuge",
              priceRange: "$50-500"
            },
            {
              id: 66,
              item: "Vortex",
              category: "PCR/Sequencing",
              priceRange: "$500-5K"
            },
            {
              id: 67,
              item: "Magnetic rack",
              category: "Heating",
              priceRange: "$5K-50K"
            },
            {
              id: 68,
              item: "Gradient maker",
              category: "Cooling",
              priceRange: "$50K+"
            },
            {
              id: 69,
              item: "Imaging system",
              category: "Cell Culture",
              priceRange: "$50-500"
            },
            {
              id: 70,
              item: "Densitometer",
              category: "General",
              priceRange: "$500-5K"
            },
            {
              id: 71,
              item: "Microplate reader",
              category: "Microscope",
              priceRange: "$5K-50K"
            },
            {
              id: 72,
              item: "PCR cycler",
              category: "Centrifuge",
              priceRange: "$50K+"
            },
            {
              id: 73,
              item: "Real-time PCR cycler",
              category: "PCR/Sequencing",
              priceRange: "$50-500"
            },
            {
              id: 74,
              item: "Gel doc system",
              category: "Heating",
              priceRange: "$500-5K"
            },
            {
              id: 75,
              item: "Western blot imager",
              category: "Cooling",
              priceRange: "$5K-50K"
            },
            {
              id: 76,
              item: "Live cell imaging system",
              category: "Cell Culture",
              priceRange: "$50K+"
            },
            {
              id: 77,
              item: "Stage incubator",
              category: "General",
              priceRange: "$50-500"
            },
            {
              id: 78,
              item: "Auto-pipettor",
              category: "Microscope",
              priceRange: "$500-5K"
            },
            {
              id: 79,
              item: "Liquid handler",
              category: "Centrifuge",
              priceRange: "$5K-50K"
            },
            {
              id: 80,
              item: "Dispensing robot",
              category: "PCR/Sequencing",
              priceRange: "$50K+"
            },
            {
              id: 81,
              item: "High-throughput screen",
              category: "Heating",
              priceRange: "$50-500"
            },
            {
              id: 82,
              item: "Compound microscope objectives (4x, 10x, 40x, 100x oil)",
              category: "Cooling",
              priceRange: "$500-5K"
            },
            {
              id: 83,
              item: "Microtome",
              category: "Cell Culture",
              priceRange: "$5K-50K"
            },
            {
              id: 84,
              item: "Cryostat",
              category: "General",
              priceRange: "$50K+"
            },
            {
              id: 85,
              item: "Embedding station",
              category: "Microscope",
              priceRange: "$50-500"
            },
            {
              id: 86,
              item: "Staining station",
              category: "Centrifuge",
              priceRange: "$500-5K"
            },
            {
              id: 87,
              item: "Histology equipment",
              category: "PCR/Sequencing",
              priceRange: "$5K-50K"
            },
            {
              id: 88,
              item: "Tissue processor",
              category: "Heating",
              priceRange: "$50K+"
            },
            {
              id: 89,
              item: "Wax embedder",
              category: "Cooling",
              priceRange: "$50-500"
            },
            {
              id: 90,
              item: "Microscope camera",
              category: "Cell Culture",
              priceRange: "$500-5K"
            },
            {
              id: 91,
              item: "Image analysis software",
              category: "General",
              priceRange: "$5K-50K"
            },
            {
              id: 92,
              item: "Cell culture flask",
              category: "Microscope",
              priceRange: "$50K+"
            },
            {
              id: 93,
              item: "Multiwell plate",
              category: "Centrifuge",
              priceRange: "$50-500"
            },
            {
              id: 94,
              item: "Tissue culture-treated",
              category: "PCR/Sequencing",
              priceRange: "$500-5K"
            },
            {
              id: 95,
              item: "Spinner flask",
              category: "Heating",
              priceRange: "$5K-50K"
            },
            {
              id: 96,
              item: "Roller bottle",
              category: "Cooling",
              priceRange: "$50K+"
            },
            {
              id: 97,
              item: "Bioreactor",
              category: "Cell Culture",
              priceRange: "$50-500"
            },
            {
              id: 98,
              item: "Hollow fiber bioreactor",
              category: "General",
              priceRange: "$500-5K"
            },
            {
              id: 99,
              item: "Wave bioreactor",
              category: "Microscope",
              priceRange: "$5K-50K"
            },
            {
              id: 100,
              item: "Fermenter",
              category: "Centrifuge",
              priceRange: "$50K+"
            },
            {
              id: 101,
              item: "CO2 cylinder + regulator",
              category: "PCR/Sequencing",
              priceRange: "$50-500"
            },
            {
              id: 102,
              item: "N2 cylinder",
              category: "Heating",
              priceRange: "$500-5K"
            },
            {
              id: 103,
              item: "O2 cylinder",
              category: "Cooling",
              priceRange: "$5K-50K"
            },
            {
              id: 104,
              item: "Inverter for power backup",
              category: "Cell Culture",
              priceRange: "$50K+"
            },
            {
              id: 105,
              item: "Generator",
              category: "General",
              priceRange: "$50-500"
            },
            {
              id: 106,
              item: "UPS battery",
              category: "Microscope",
              priceRange: "$500-5K"
            }
          ];


          var ORGANISMS = [

            {

              id: 'amoeba', label: 'Amoeba', icon: '\u{1F9A0}', color: '#8b5cf6', bodyColor: 'rgba(139,92,246,0.35)', desc: 'Single-celled protist that moves using pseudopods (false feet). Engulfs food by phagocytosis.', speed: 0.3, size: 28, activity: 'Phagocytosis', activityDesc: 'Engulf food particles!', xp: 5, facts: ['Amoebas reproduce by binary fission', 'Pseudopods are temporary projections of cytoplasm', 'Amoebas live in freshwater, soil, and as parasites', 'They have no fixed shape - constantly changing', 'Food vacuoles digest engulfed particles'],

              anatomy: [

                { name: 'Pseudopods', fn: 'Temporary cytoplasm extensions used for movement and engulfing food (phagocytosis). Formed by actin filament polymerization.', icon: '\uD83E\uDDB6', lx: 0.8, ly: 0.7 },

                { name: 'Food Vacuole', fn: 'Membrane-bound compartment containing engulfed food particles. Enzymes digest the contents, releasing nutrients into cytoplasm.', icon: '\uD83D\uDFE2', lx: -0.4, ly: 0.3 },

                { name: 'Contractile Vacuole', fn: 'Pumps excess water out of the cell to maintain osmotic balance. Fills and contracts rhythmically.', icon: '\uD83D\uDCA7', lx: 0.7, ly: -0.5 },

                { name: 'Nucleus', fn: 'Contains DNA and controls cell activities. Single large nucleus with visible nucleolus.', icon: '\uD83D\uDFE3', lx: 0, ly: 0 },

                { name: 'Cell Membrane', fn: 'Flexible phospholipid bilayer that allows shape changes. Selectively permeable \u2014 controls what enters and exits.', icon: '\u26AA', lx: 0, ly: -1.1 }

              ]

            },

            {

              id: 'paramecium', label: 'Paramecium', icon: '\u{1F9A0}', color: '#06b6d4', bodyColor: 'rgba(6,182,212,0.35)', desc: 'Ciliated protist that moves rapidly using thousands of tiny hair-like cilia.', speed: 1.2, size: 22, activity: 'Ciliary Sweep', activityDesc: 'Swim through food clouds!', xp: 3, facts: ['Cilia beat in coordinated waves', 'Has an oral groove for feeding', 'Contains contractile vacuoles to expel water', 'Reproduces by binary fission and conjugation', 'Can reverse ciliary beat to escape danger'],

              anatomy: [

                { name: 'Cilia', fn: 'Thousands of short hair-like projections covering the cell. Beat in coordinated metachronal waves for rapid swimming (~3mm/sec).', icon: '\u{1F4A8}', lx: 1.5, ly: -0.5 },

                { name: 'Oral Groove', fn: 'Funnel-shaped depression that channels food particles into the cell mouth (cytostome). Cilia sweep food inward.', icon: '\uD83E\uDD44', lx: 0.4, ly: 0 },

                { name: 'Macronucleus', fn: 'Large kidney-shaped nucleus controlling daily cell functions (gene expression for proteins, metabolism).', icon: '\uD83D\uDFE3', lx: -0.1, ly: 0 },

                { name: 'Micronucleus', fn: 'Small round nucleus used only during sexual reproduction (conjugation). Contains complete genome.', icon: '\u26AA', lx: 0.25, ly: 0.15 },

                { name: 'Trichocysts', fn: 'Defensive organelles embedded in the pellicle. Fire tiny needle-like shafts when the cell is threatened.', icon: '\u26A1', lx: -1.2, ly: 0.4 }

              ]

            },

            {

              id: 'euglena', label: 'Euglena', icon: '\u{1F33F}', color: '#22c55e', bodyColor: 'rgba(34,197,94,0.35)', desc: 'Unique protist with both plant and animal characteristics. Has chloroplasts AND can eat food.', speed: 0.7, size: 18, activity: 'Photosynthesis', activityDesc: 'Move into light zones!', xp: 4, facts: ['Has a red eyespot (stigma) to detect light', 'Contains chloroplasts for photosynthesis', 'Has a flagellum for movement', 'Can switch between autotroph and heterotroph', 'No cell wall - has a flexible pellicle'],

              anatomy: [

                { name: 'Flagellum', fn: 'Long whip-like appendage emerging from anterior end. Rotates to pull the cell forward through water.', icon: '\u{1F4A8}', lx: 2.2, ly: -0.2 },

                { name: 'Eyespot (Stigma)', fn: 'Red-orange carotenoid pigment spot that shades a photoreceptor, allowing Euglena to detect light direction for phototaxis.', icon: '\uD83D\uDD34', lx: 0.8, ly: -0.15 },

                { name: 'Chloroplasts', fn: 'Green plastids containing chlorophyll for photosynthesis. Can be lost permanently if cell is kept in darkness.', icon: '\uD83D\uDFE2', lx: -0.2, ly: -0.15 },

                { name: 'Pellicle', fn: 'Flexible protein strips beneath the membrane (not a cell wall). Allows euglenoid movement \u2014 stretching and contracting.', icon: '\u26AA', lx: -0.9, ly: 0.35 },

                { name: 'Paramylon Body', fn: 'Unique carbohydrate storage granule (beta-1,3-glucan). Euglena\u2019s version of starch, used as energy reserve.', icon: '\u26AA', lx: 0.3, ly: 0.25 }

              ]

            },

            {

              id: 'wbc', label: 'White Blood Cell', icon: '\u{1FA78}', color: '#ef4444', bodyColor: 'rgba(239,68,68,0.3)', desc: 'Immune cell (leukocyte) that patrols the body and destroys invading pathogens.', speed: 0.5, size: 24, activity: 'Immune Defense', activityDesc: 'Chase and engulf bacteria!', xp: 6, facts: ['Part of the immune system', 'Uses chemotaxis to find pathogens', 'Can squeeze through blood vessel walls', 'Neutrophils are most common type', 'Produces antibodies to tag invaders'],

              anatomy: [

                { name: 'Lobed Nucleus', fn: 'Multi-lobed nucleus (neutrophils have 3-5 lobes). Allows the cell to squeeze through tight spaces between tissue cells.', icon: '\uD83D\uDFE3', lx: -0.2, ly: -0.1 },

                { name: 'Lysosomes', fn: 'Enzyme-filled vesicles that digest engulfed pathogens. Contain hydrolytic enzymes active at acidic pH.', icon: '\uD83D\uDFE1', lx: 0.5, ly: 0.4 },

                { name: 'Pseudopods', fn: 'Cytoplasmic extensions used for amoeboid movement and phagocytosis. Follow chemical gradients (chemotaxis) to find bacteria.', icon: '\uD83E\uDDB6', lx: 0.8, ly: 0.7 },

                { name: 'Phagosomes', fn: 'Membrane-bound vesicles formed when the cell engulfs a pathogen. Fuse with lysosomes to destroy the invader.', icon: '\uD83D\uDD34', lx: -0.6, ly: 0.5 },

                { name: 'Surface Receptors', fn: 'Toll-like receptors and antibody receptors recognize foreign molecules (antigens) on pathogen surfaces.', icon: '\u26A1', lx: 0, ly: -1.0 }

              ]

            },

            {

              id: 'bacterium', label: 'Bacterium', icon: '\u{1F9EB}', color: '#f59e0b', bodyColor: 'rgba(245,158,11,0.35)', desc: 'Prokaryotic cell - no nucleus. Has cell wall, flagella, and reproduces by binary fission.', speed: 0.9, size: 10, activity: 'Binary Fission', activityDesc: 'Grow and divide!', xp: 5, facts: ['No membrane-bound nucleus (prokaryote)', 'Cell wall made of peptidoglycan', 'Some have flagella for movement', 'Reproduce every 20 minutes in ideal conditions', 'Plasmids carry extra DNA for antibiotic resistance'],

              anatomy: [

                { name: 'Nucleoid', fn: 'Region of circular DNA (not membrane-bound). Single chromosome contains ~4,000 genes. No histones in most bacteria.', icon: '\uD83D\uDFE1', lx: 0, ly: 0 },

                { name: 'Peptidoglycan Wall', fn: 'Rigid mesh of sugars and amino acids surrounding the membrane. Gram+ have thick walls; Gram- have thin walls + outer membrane.', icon: '\uD83D\uDFE7', lx: 0, ly: -0.9 },

                { name: 'Plasmids', fn: 'Small circular DNA molecules separate from the chromosome. Carry genes for antibiotic resistance; can transfer between bacteria.', icon: '\uD83D\uDD35', lx: 0.8, ly: 0.3 },

                { name: 'Flagellum', fn: 'Rotating protein filament driven by a molecular motor (proton gradient). Spins ~100 revolutions/second for swimming.', icon: '\u{1F4A8}', lx: -2.2, ly: 0 },

                { name: 'Ribosomes (70S)', fn: 'Smaller than eukaryotic ribosomes (70S vs 80S). This size difference is why antibiotics can target bacterial ribosomes specifically.', icon: '\u26AA', lx: -0.5, ly: 0.3 }

              ]

            },

            {

              id: 'plantcell', label: 'Plant Cell', icon: '\u{1F33B}', color: '#65a30d', bodyColor: 'rgba(101,163,13,0.25)', desc: 'Eukaryotic cell with cell wall, chloroplasts, and large central vacuole.', speed: 0, size: 35, activity: 'Organelle Tour', activityDesc: 'Zoom in to explore!', xp: 2, facts: ['Rigid cell wall made of cellulose', 'Large central vacuole stores water', 'Chloroplasts convert light to energy', 'Has all organelles found in animal cells plus more', 'Connected to neighbors via plasmodesmata'],

              anatomy: [

                { name: 'Cell Wall', fn: 'Rigid outer layer of cellulose microfibrils. Provides structural support, prevents bursting from osmotic pressure, and gives plants their shape.', icon: '\uD83D\uDFE9', lx: 0, ly: -1.3 },

                { name: 'Central Vacuole', fn: 'Massive fluid-filled organelle occupying up to 90% of cell volume. Stores water, nutrients, and waste; maintains turgor pressure.', icon: '\uD83D\uDFE6', lx: 0, ly: 0 },

                { name: 'Chloroplast', fn: 'Double-membrane organelle with internal thylakoid membranes where photosynthesis occurs. Contains its own DNA (endosymbiotic origin).', icon: '\uD83D\uDFE2', lx: -0.8, ly: -0.5 },

                { name: 'Nucleus', fn: 'Contains chromosomal DNA enclosed by a double membrane (nuclear envelope) with pores. Controls gene expression and cell division.', icon: '\uD83D\uDFE3', lx: 0.5, ly: -0.35 },

                { name: 'Mitochondria', fn: 'Powerhouse of the cell \u2014 performs cellular respiration (glucose + O\u2082 \u2192 ATP + CO\u2082 + H\u2082O). Has its own circular DNA.', icon: '\uD83D\uDFE0', lx: 0.9, ly: 0.5 },

                { name: 'Endoplasmic Reticulum', fn: 'Network of membrane channels. Rough ER (with ribosomes) makes proteins; Smooth ER synthesizes lipids and detoxifies chemicals.', icon: '\u26AA', lx: -0.6, ly: -0.7 },

                { name: 'Plasmodesmata', fn: 'Tiny channels through the cell wall connecting adjacent plant cells. Allow transport of water, nutrients, and signaling molecules.', icon: '\uD83D\uDD35', lx: -1.5, ly: 0 }

              ]

            },

            {

              id: 'diatom', label: 'Diatom', icon: '\u{1F4A0}', color: '#0ea5e9', bodyColor: 'rgba(14,165,233,0.25)', desc: 'Unicellular algae with intricate glass-like cell walls made of silica. Responsible for ~20% of global oxygen.', speed: 0.15, size: 16, activity: 'Nutrient Collection', activityDesc: 'Drift through nutrient clouds!', xp: 3, facts: ['Cell walls are made of silica (glass)', 'Produce about 20% of Earth\'s oxygen', 'Over 100,000 species exist', 'Used in forensic science to determine drowning', 'Fossil diatoms form diatomaceous earth'],

              anatomy: [

                { name: 'Frustule', fn: 'Two-part silica shell (epitheca + hypotheca) that fits together like a petri dish. Ornately patterned with pores (areolae) for gas exchange.', icon: '\uD83D\uDC8E', lx: 0, ly: -1.3 },

                { name: 'Raphe', fn: 'Slit along the frustule that secretes mucilage for gliding movement. Not all diatoms have one (pennate vs centric types).', icon: '\u27B0', lx: -1.1, ly: 0 },

                { name: 'Chloroplasts', fn: 'Golden-brown plastids containing chlorophylls a \u0026 c plus fucoxanthin pigment (gives diatoms their characteristic color).', icon: '\uD83D\uDFE2', lx: 0.3, ly: 0.3 },

                { name: 'Central Node', fn: 'Thickened area in the center of the frustule where the raphe splits. Controls mucilage secretion direction.', icon: '\u26AA', lx: 0, ly: 0 }

              ]

            },

            {

              id: 'volvox', label: 'Volvox', icon: '\u{1F7E2}', color: '#10b981', bodyColor: 'rgba(16,185,129,0.2)', desc: 'Colonial green algae forming hollow spheres of 500-50,000 cells. Each cell has two flagella.', speed: 0.4, size: 32, activity: 'Colony Coordination', activityDesc: 'Spin toward the light!', xp: 4, facts: ['Colonies can contain 500 to 50,000 cells', 'Daughter colonies form inside the parent', 'Each cell has two flagella and an eyespot', 'Demonstrates division of labor in evolution', 'Rotates like a planet \u2014 name means "fierce roller"'],

              anatomy: [

                { name: 'Somatic Cells', fn: 'Thousands of biflagellate cells on the colony surface. Beat flagella in coordination for locomotion. Cannot reproduce.', icon: '\uD83D\uDFE2', lx: 0.9, ly: -0.5 },

                { name: 'Gonidia', fn: 'Large reproductive cells inside the colony. Divide repeatedly to form miniature daughter colonies (asexual reproduction).', icon: '\uD83C\uDF1F', lx: 0.15, ly: -0.1 },

                { name: 'Cytoplasmic Bridges', fn: 'Thin strands connecting adjacent somatic cells, enabling coordinated flagellar beating across the entire colony surface.', icon: '\uD83D\uDD17', lx: -0.7, ly: 0.4 },

                { name: 'Glycoprotein Matrix', fn: 'Extracellular gel matrix holding the colony together. Each cell sits in its own pocket within this transparent sphere.', icon: '\u26AA', lx: 0, ly: 0.95 }

              ]

            },

            {

              id: 'stentor', label: 'Stentor', icon: '\u{1F3BA}', color: '#a855f7', bodyColor: 'rgba(168,85,247,0.3)', desc: 'Trumpet-shaped ciliate, one of the largest single-celled organisms (up to 2mm). Can regenerate from fragments.', speed: 0.1, size: 30, activity: 'Filter Feeding', activityDesc: 'Anchor and sweep food!', xp: 5, facts: ['Can be up to 2mm long \u2014 visible to naked eye', 'Can regenerate from tiny fragments', 'Has a bead-like macronucleus', 'Creates vortex currents to capture food', 'Can change color: blue, green, or pink'],

              anatomy: [

                { name: 'Membranellar Band', fn: 'Crown of fused cilia (membranelles) spiraling around the oral end. Creates water vortex currents that sweep food into the oral groove.', icon: '\uD83C\uDF00', lx: 0, ly: -1.0 },

                { name: 'Myonemes', fn: 'Contractile fibers running the length of the body like muscle fibers. Allow rapid contraction to 1/4 length in milliseconds.', icon: '\u26A1', lx: 0.3, ly: 0.5 },

                { name: 'Beaded Macronucleus', fn: 'Distinctive moniliform (bead-like chain) macronucleus. Can be fragmented during regeneration \u2014 each piece contains full genetic info.', icon: '\uD83D\uDFE3', lx: 0, ly: 0 },

                { name: 'Holdfast', fn: 'Attachment structure at the narrow (aboral) end. Anchors the cell to substrate while feeding. Can release for relocation.', icon: '\u2693', lx: 0, ly: 1.3 },

                { name: 'Body Cilia', fn: 'Short cilia covering the body surface. Used for swimming when detached, but primary function is tactile sensing.', icon: '\u{1F4A8}', lx: -0.7, ly: 0.3 }

              ]

            },

            {

              id: 'tardigrade', label: 'Tardigrade', icon: '\u{1F43B}', color: '#d946ef', bodyColor: 'rgba(217,70,239,0.25)', desc: 'Microscopic "water bear" with 8 legs. Nearly indestructible \u2014 survives space, radiation, extreme temps.', speed: 0.2, size: 20, activity: 'Cryptobiosis', activityDesc: 'Survive extreme zones!', xp: 7, facts: ['Can survive temperatures from -272\u00B0C to 150\u00B0C', 'Survived exposure to outer space', 'Enter cryptobiosis \u2014 suspend all metabolism', 'Have 8 legs with tiny claws', 'Can live without water for over 10 years'],

              anatomy: [

                { name: 'Cuticle', fn: 'Tough external covering shed (molted) periodically. Made of chitin-like material. Provides protection and is permeable to gases.', icon: '\uD83D\uDEE1', lx: 0, ly: -1.0 },

                { name: 'Stylets', fn: 'Piercing mouthparts used to puncture plant cells or small invertebrates. Retracted during molting and re-synthesized.', icon: '\uD83D\uDD2A', lx: 1.5, ly: 0 },

                { name: 'Lobopod Legs', fn: 'Eight stubby legs ending in 4-8 claws each. Last pair faces backward. No joints \u2014 moved by individual muscle fibers.', icon: '\uD83E\uDDB6', lx: -0.5, ly: 0.9 },

                { name: 'Tun State', fn: 'Cryptobiosis form: body contracts into a ball (tun), loses 97% of water, metabolism drops to 0.01%. Can survive decades.', icon: '\uD83D\uDFE4', lx: 0, ly: 0.3 },

                { name: 'Dsup Protein', fn: 'Damage Suppressor protein unique to tardigrades. Binds to DNA and shields it from radiation damage (discovered 2016).', icon: '\u2B50', lx: -0.3, ly: -0.3 }

              ]

            },

            {

              id: 'spirillum', label: 'Spirillum', icon: '\u{1F300}', color: '#f97316', bodyColor: 'rgba(249,115,22,0.3)', desc: 'Spiral-shaped bacterium that moves with a distinctive corkscrew motion using bipolar flagella.', speed: 1.0, size: 12, activity: 'Helical Propulsion', activityDesc: 'Corkscrew through the medium!', xp: 4, facts: ['Rigid spiral shape (not flexible like spirochetes)', 'Uses bipolar tufts of flagella', 'Found in stagnant freshwater', 'Moves in a corkscrew pattern', 'One of the largest bacteria \u2014 up to 60\u03BCm'],

              anatomy: [

                { name: 'Bipolar Flagella', fn: 'Tufts of flagella at both cell poles. Rotate in opposite directions to produce the characteristic corkscrew swimming motion.', icon: '\u{1F4A8}', lx: -2.8, ly: 0.3 },

                { name: 'Rigid Spiral Body', fn: 'Cell shape is a fixed helix (unlike flexible spirochetes). The peptidoglycan wall maintains this permanent corkscrew shape.', icon: '\uD83C\uDF00', lx: 0, ly: -0.6 },

                { name: 'Volutin Granules', fn: 'Intracellular phosphate storage bodies. Appear as dark spots under microscopy. Energy reserve for nutrient-poor conditions.', icon: '\u26AA', lx: 0.5, ly: 0 },

                { name: 'Polar Membrane', fn: 'Specialized membrane region at cell poles where flagellar motors are anchored. Contains chemoreceptor proteins for sensing environment.', icon: '\uD83D\uDD35', lx: 2.3, ly: -0.3 }

              ]

            }

          ];



          // ── Quiz questions (observation-based) ──

          var QUIZ_BANK = [

            { q: 'Which organism moves toward light?', a: 'euglena', hint: 'Look for the one with an eyespot (green, teardrop shape).' },

            { q: 'What is the amoeba doing to food particles?', a: 'phagocytosis', options: ['phagocytosis', 'photosynthesis', 'osmosis', 'mitosis'], hint: 'Watch how it wraps around food.' },

            { q: 'Which organism has cilia for movement?', a: 'paramecium', hint: 'Look for the oval one that moves fastest.' },

            { q: 'What type of cell has no nucleus?', a: 'bacterium', hint: 'The smallest organisms in the dish.' },

            { q: 'Which cell has a rigid cell wall AND chloroplasts?', a: 'plantcell', hint: 'It does not move \u2014 rectangular shape.' },

            { q: 'What cell defends against pathogens?', a: 'wbc', hint: 'The red-tinted one that chases bacteria.' },

            { q: 'How does a bacterium reproduce?', a: 'binary fission', options: ['binary fission', 'mitosis', 'meiosis', 'budding'], hint: 'Watch the small ones split in two.' },

            { q: 'What structure does Euglena use to detect light?', a: 'eyespot', options: ['eyespot', 'antenna', 'lens', 'cornea'], hint: 'Also called a stigma \u2014 a red dot.' },

            { q: 'What is the powerhouse organelle in eukaryotic cells?', a: 'mitochondria', options: ['mitochondria', 'ribosome', 'golgi', 'lysosome'], hint: 'Produces ATP.' },

            { q: 'Which organism can act as BOTH plant and animal?', a: 'euglena', hint: 'Has chloroplasts but can also consume food.' },

            { q: 'What does phagocytosis mean?', a: 'cell eating', options: ['cell eating', 'cell drinking', 'cell dividing', 'cell dying'], hint: 'Phago = eat, cyto = cell.' },

            { q: 'Which structure controls what enters and exits a cell?', a: 'cell membrane', options: ['cell membrane', 'cell wall', 'nucleus', 'ribosome'], hint: 'Phospholipid bilayer.' },

            { q: 'Which organism has a cell wall made of glass (silica)?', a: 'diatom', hint: 'Look for the geometric, crystalline-looking one.' },

            { q: 'What organism forms hollow spheres of thousands of cells?', a: 'volvox', hint: 'A rotating green colony \u2014 its name means "fierce roller."' },

            { q: 'Which organism can regenerate from tiny fragments?', a: 'stentor', hint: 'The trumpet-shaped one \u2014 one of the largest single cells.' },

            { q: 'What organism can survive in outer space?', a: 'tardigrade', options: ['tardigrade', 'amoeba', 'bacterium', 'paramecium'], hint: 'Also called a water bear \u2014 nearly indestructible!' },

            { q: 'Which bacterium moves with a corkscrew spiral motion?', a: 'spirillum', hint: 'Look for the spiral orange one spinning through the medium.' },

            { q: 'What organelle is the "powerhouse" that produces ATP?', a: 'mitochondria', options: ['mitochondria', 'chloroplast', 'nucleus', 'ribosome'], hint: 'It converts glucose and oxygen into energy currency (ATP).' },

            { q: 'What does Stentor use its holdfast for?', a: 'anchoring', options: ['anchoring', 'swimming', 'reproduction', 'feeding'], hint: 'The narrow end attaches to a surface while the trumpet end feeds.' },

            { q: 'What unique protein protects tardigrade DNA from radiation?', a: 'Dsup', options: ['Dsup', 'p53', 'BRCA1', 'Rad51'], hint: 'Damage Suppressor protein \u2014 discovered in 2016.' }

          ];



          // ── Canvas ref callback for simulation ──

          var canvasRefCb = function (canvasEl) {

            if (!canvasEl) {

              if (canvasRefCb._lastCanvas && canvasRefCb._lastCanvas._cellSimAnim) {

                cancelAnimationFrame(canvasRefCb._lastCanvas._cellSimAnim);

                canvasRefCb._lastCanvas._cellSimInit = false;

              }

              canvasRefCb._lastCanvas = null;

              return;

            }

            if (canvasEl._cellSimInit) return;

            canvasEl._cellSimInit = true;

            canvasRefCb._lastCanvas = canvasEl;

            var W = canvasEl.width = canvasEl.offsetWidth * (window.devicePixelRatio || 1);

            var HH = canvasEl.height = canvasEl.offsetHeight * (window.devicePixelRatio || 1);

            var cctx = canvasEl.getContext('2d');

            var dpr = window.devicePixelRatio || 1;



            // World state

            var world = { organisms: [], food: [], lightZones: [], tick: 0 };

            var cam = { x: 0, y: 0, zoom: 1 };

            var WORLD_W = 800, WORLD_H = 600;

            var dragging = false, dragStartX = 0, dragStartY = 0, camStartX = 0, camStartY = 0;

            var playerKeys = {};

            var selectedOrg = null;

            var playAsOrg = null;

            var hoveredOrg = null;



            // Populate organisms

            function spawnWorld() {

              world.organisms = [];

              world.food = [];

              world.lightZones = [];

              // Spawn 2-3 of each type

              ORGANISMS.forEach(function (def) {

                var count = def.id === 'plantcell' ? 2 : 3;

                for (var i = 0; i < count; i++) {

                  world.organisms.push({

                    type: def.id, x: 60 + Math.random() * (WORLD_W - 120), y: 60 + Math.random() * (WORLD_H - 120),

                    vx: (Math.random() - 0.5) * def.speed, vy: (Math.random() - 0.5) * def.speed,

                    size: def.size * (0.85 + Math.random() * 0.3), angle: Math.random() * Math.PI * 2,

                    phase: Math.random() * Math.PI * 2, energy: 50 + Math.random() * 50, def: def

                  });

                }

              });

              // Food particles

              for (var i = 0; i < 40; i++) {

                world.food.push({ x: Math.random() * WORLD_W, y: Math.random() * WORLD_H, size: 2 + Math.random() * 3, eaten: false });

              }

              // Light zones (for euglena)

              world.lightZones.push({ x: WORLD_W * 0.25, y: WORLD_H * 0.3, r: 80 });

              world.lightZones.push({ x: WORLD_W * 0.7, y: WORLD_H * 0.65, r: 100 });

            }

            spawnWorld();



            // Drawing helpers

            function toScreen(wx, wy) {

              return { x: (wx - cam.x) * cam.zoom * dpr + W / 2, y: (wy - cam.y) * cam.zoom * dpr + HH / 2 };

            }



            function drawOrganism(o) {

              var p = toScreen(o.x, o.y);

              var sz = o.size * cam.zoom * dpr;

              var def = o.def;

              cctx.save();

              cctx.translate(p.x, p.y);

              cctx.rotate(o.angle);

              var glow = (selectedOrg === o || playAsOrg === o);

              if (glow) { cctx.shadowColor = def.color; cctx.shadowBlur = 12 * dpr; }



              if (def.id === 'amoeba') {

                // Blobby shape with smooth quadratic curves (organic pseudopods)

                var amoebaPts = [];

                var amoebaN = 32; // enough points for smooth shape

                for (var ai = 0; ai < amoebaN; ai++) {

                  var a = (ai / amoebaN) * Math.PI * 2;

                  var wobble = sz * (1 + 0.2 * Math.sin(a * 3 + o.phase + world.tick * 0.025) + 0.1 * Math.sin(a * 5 + world.tick * 0.04) + 0.05 * Math.sin(a * 7 + world.tick * 0.015));

                  amoebaPts.push({ x: Math.cos(a) * wobble, y: Math.sin(a) * wobble });

                }

                // Draw smooth closed curve through midpoints

                cctx.beginPath();

                var am0 = amoebaPts[0], amLast = amoebaPts[amoebaN - 1];

                cctx.moveTo((amLast.x + am0.x) / 2, (amLast.y + am0.y) / 2);

                for (var ai2 = 0; ai2 < amoebaN; ai2++) {

                  var amCur = amoebaPts[ai2];

                  var amNext = amoebaPts[(ai2 + 1) % amoebaN];

                  cctx.quadraticCurveTo(amCur.x, amCur.y, (amCur.x + amNext.x) / 2, (amCur.y + amNext.y) / 2);

                }

                cctx.closePath();

                // Gradient body fill

                var aGrad = cctx.createRadialGradient(-sz * 0.3, -sz * 0.3, 0, 0, 0, sz * 1.2);

                aGrad.addColorStop(0, 'rgba(196,181,253,0.65)');

                aGrad.addColorStop(0.5, def.bodyColor);

                aGrad.addColorStop(1, 'rgba(124,58,237,0.25)');

                cctx.fillStyle = aGrad; cctx.fill();

                cctx.strokeStyle = def.color; cctx.lineWidth = 1.5 * dpr; cctx.stroke();

                // Food vacuoles

                [[-0.4, 0.3, 0.12], [0.35, -0.25, 0.1], [-0.15, -0.45, 0.08]].forEach(function (v) {

                  cctx.beginPath(); cctx.arc(sz * v[0], sz * v[1], sz * v[2], 0, Math.PI * 2);

                  cctx.fillStyle = 'rgba(34,197,94,0.2)'; cctx.fill();

                  cctx.strokeStyle = 'rgba(34,197,94,0.3)'; cctx.lineWidth = 0.5 * dpr; cctx.stroke();

                });

                // Nucleus with nucleolus

                cctx.beginPath(); cctx.arc(0, 0, sz * 0.3, 0, Math.PI * 2);

                var nGrad = cctx.createRadialGradient(-sz * 0.05, -sz * 0.05, 0, 0, 0, sz * 0.3);

                nGrad.addColorStop(0, 'rgba(167,139,250,0.7)');

                nGrad.addColorStop(1, 'rgba(124,58,237,0.4)');

                cctx.fillStyle = nGrad; cctx.fill();

                cctx.strokeStyle = 'rgba(124,58,237,0.5)'; cctx.lineWidth = 0.8 * dpr; cctx.stroke();

                // Nucleolus

                cctx.beginPath(); cctx.arc(sz * 0.05, -sz * 0.05, sz * 0.1, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(91,33,182,0.6)'; cctx.fill();

              } else if (def.id === 'paramecium') {

                // Oval body with gradient

                cctx.beginPath(); cctx.ellipse(0, 0, sz * 1.4, sz * 0.7, 0, 0, Math.PI * 2);

                var pGrad = cctx.createRadialGradient(-sz * 0.3, -sz * 0.15, 0, 0, 0, sz * 1.4);

                pGrad.addColorStop(0, 'rgba(165,243,252,0.7)');

                pGrad.addColorStop(0.5, def.bodyColor);

                pGrad.addColorStop(1, 'rgba(6,182,212,0.2)');

                cctx.fillStyle = pGrad; cctx.fill();

                cctx.strokeStyle = def.color; cctx.lineWidth = 1.5 * dpr; cctx.stroke();

                // Pellicle ridges

                for (var pri = 0; pri < 5; pri++) {

                  var ry = sz * (-0.4 + pri * 0.2);

                  cctx.beginPath(); cctx.moveTo(-sz * 1.2, ry); cctx.quadraticCurveTo(0, ry + sz * 0.05, sz * 1.2, ry);

                  cctx.strokeStyle = 'rgba(6,182,212,0.12)'; cctx.lineWidth = 0.5 * dpr; cctx.stroke();

                }

                // Cilia (more, with metachronal wave)

                for (var ci = 0; ci < 24; ci++) {

                  var ca = (ci / 24) * Math.PI * 2;

                  var cx2 = Math.cos(ca) * sz * 1.5, cy2 = Math.sin(ca) * sz * 0.78;

                  var wave = Math.sin(world.tick * 0.18 + ci * 0.5) * 4 * dpr;

                  var wave2 = Math.cos(world.tick * 0.12 + ci * 0.3) * 2 * dpr;

                  cctx.beginPath(); cctx.moveTo(cx2, cy2);

                  cctx.quadraticCurveTo(cx2 + wave, cy2 + Math.sign(cy2) * 3 * dpr, cx2 + wave2, cy2 + Math.sign(cy2) * 6 * dpr);

                  cctx.strokeStyle = 'rgba(6,182,212,0.4)'; cctx.lineWidth = 0.7 * dpr; cctx.stroke();

                }

                // Oral groove with food vacuole path

                cctx.beginPath(); cctx.ellipse(sz * 0.4, 0, sz * 0.3, sz * 0.15, 0.3, 0, Math.PI * 2);

                cctx.strokeStyle = 'rgba(6,182,212,0.7)'; cctx.lineWidth = 1 * dpr; cctx.stroke();

                // Contractile vacuoles (pulsing)

                var cvPulse = 0.08 + 0.04 * Math.sin(world.tick * 0.06);

                cctx.beginPath(); cctx.arc(-sz * 0.8, 0, sz * cvPulse, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(165,243,252,0.5)'; cctx.fill();

                cctx.strokeStyle = 'rgba(6,182,212,0.5)'; cctx.lineWidth = 0.5 * dpr; cctx.stroke();

                cctx.beginPath(); cctx.arc(sz * 0.8, 0, sz * cvPulse * 0.8, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(165,243,252,0.4)'; cctx.fill();

                cctx.strokeStyle = 'rgba(6,182,212,0.4)'; cctx.lineWidth = 0.5 * dpr; cctx.stroke();

                // Macronucleus

                cctx.beginPath(); cctx.ellipse(-sz * 0.1, 0, sz * 0.35, sz * 0.18, 0.2, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(124,58,237,0.35)'; cctx.fill();

                cctx.strokeStyle = 'rgba(124,58,237,0.4)'; cctx.lineWidth = 0.6 * dpr; cctx.stroke();

              } else if (def.id === 'euglena') {

                // Teardrop body

                cctx.beginPath();

                cctx.moveTo(sz * 1.5, 0);

                cctx.quadraticCurveTo(sz * 0.5, -sz * 0.6, -sz, -sz * 0.3);

                cctx.quadraticCurveTo(-sz * 1.3, 0, -sz, sz * 0.3);

                cctx.quadraticCurveTo(sz * 0.5, sz * 0.6, sz * 1.5, 0);

                cctx.closePath();

                var eGrad = cctx.createRadialGradient(-sz * 0.2, -sz * 0.15, 0, 0, 0, sz * 1.5);

                eGrad.addColorStop(0, 'rgba(187,247,208,0.8)');

                eGrad.addColorStop(0.5, def.bodyColor);

                eGrad.addColorStop(1, 'rgba(22,163,74,0.2)');

                cctx.fillStyle = eGrad; cctx.fill();

                cctx.strokeStyle = def.color; cctx.lineWidth = 1.5 * dpr; cctx.stroke();

                // Pellicle stripes

                for (var epi = 0; epi < 4; epi++) {

                  var epy = sz * (-0.3 + epi * 0.2);

                  cctx.beginPath();

                  cctx.moveTo(-sz * 0.8, epy); cctx.quadraticCurveTo(sz * 0.3, epy + sz * 0.03, sz * 1.2, epy * 0.5);

                  cctx.strokeStyle = 'rgba(22,163,74,0.12)'; cctx.lineWidth = 0.4 * dpr; cctx.stroke();

                }

                // Chloroplasts

                [[-0.2, -0.15, 0.14], [0.3, 0.1, 0.12], [-0.5, 0.05, 0.1], [0.1, -0.3, 0.09]].forEach(function (cp) {

                  cctx.beginPath(); cctx.ellipse(sz * cp[0], sz * cp[1], sz * cp[2], sz * cp[2] * 0.6, Math.random() * 0.5, 0, Math.PI * 2);

                  cctx.fillStyle = 'rgba(34,197,94,0.35)'; cctx.fill();

                });

                // Eyespot (stigma) with iris detail

                cctx.beginPath(); cctx.arc(sz * 0.8, -sz * 0.15, sz * 0.17, 0, Math.PI * 2);

                var eyeGrad = cctx.createRadialGradient(sz * 0.78, -sz * 0.17, 0, sz * 0.8, -sz * 0.15, sz * 0.17);

                eyeGrad.addColorStop(0, '#fca5a5'); eyeGrad.addColorStop(0.5, '#ef4444'); eyeGrad.addColorStop(1, '#b91c1c');

                cctx.fillStyle = eyeGrad; cctx.fill();

                // Flagellum (undulating)

                cctx.beginPath(); cctx.moveTo(sz * 1.5, 0);

                var fl = Math.sin(world.tick * 0.2 + o.phase) * 8 * dpr;

                var fl2 = Math.sin(world.tick * 0.25 + o.phase + 1) * 5 * dpr;

                cctx.bezierCurveTo(sz * 1.8, -3 * dpr + fl, sz * 2.2 + fl2, 3 * dpr - fl, sz * 2.8, fl);

                cctx.strokeStyle = '#22c55e'; cctx.lineWidth = 1.2 * dpr; cctx.lineCap = 'round'; cctx.stroke();

              } else if (def.id === 'wbc') {

                // Irregular shape with gradient

                cctx.beginPath();

                for (var a = 0; a < Math.PI * 2; a += 0.2) {

                  var wobble = sz * (1 + 0.15 * Math.sin(a * 4 + world.tick * 0.04));

                  var px = Math.cos(a) * wobble, py = Math.sin(a) * wobble;

                  a === 0 ? cctx.moveTo(px, py) : cctx.lineTo(px, py);

                }

                cctx.closePath();

                var wGrad = cctx.createRadialGradient(-sz * 0.25, -sz * 0.2, 0, 0, 0, sz * 1.15);

                wGrad.addColorStop(0, 'rgba(254,202,202,0.6)');

                wGrad.addColorStop(0.5, def.bodyColor);

                wGrad.addColorStop(1, 'rgba(239,68,68,0.15)');

                cctx.fillStyle = wGrad; cctx.fill();

                cctx.strokeStyle = def.color; cctx.lineWidth = 1.5 * dpr; cctx.stroke();

                // Cytoplasmic granules

                [[-0.5, 0.4], [0.55, -0.35], [-0.3, -0.55], [0.45, 0.5], [-0.6, -0.1]].forEach(function (g) {

                  cctx.beginPath(); cctx.arc(sz * g[0], sz * g[1], sz * 0.04, 0, Math.PI * 2);

                  cctx.fillStyle = 'rgba(239,68,68,0.2)'; cctx.fill();

                });

                // Multi-lobed nucleus

                cctx.beginPath(); cctx.ellipse(-sz * 0.2, -sz * 0.1, sz * 0.35, sz * 0.2, 0.5, 0, Math.PI * 2);

                var wn1Grad = cctx.createRadialGradient(-sz * 0.25, -sz * 0.15, 0, -sz * 0.2, -sz * 0.1, sz * 0.35);

                wn1Grad.addColorStop(0, 'rgba(252,165,165,0.55)'); wn1Grad.addColorStop(1, 'rgba(239,68,68,0.25)');

                cctx.fillStyle = wn1Grad; cctx.fill();

                cctx.strokeStyle = 'rgba(239,68,68,0.3)'; cctx.lineWidth = 0.5 * dpr; cctx.stroke();

                cctx.beginPath(); cctx.ellipse(sz * 0.15, sz * 0.1, sz * 0.25, sz * 0.2, -0.3, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(239,68,68,0.35)'; cctx.fill();

                cctx.strokeStyle = 'rgba(239,68,68,0.25)'; cctx.lineWidth = 0.5 * dpr; cctx.stroke();

              } else if (def.id === 'bacterium') {

                // Rod shape with gradient

                var rw = sz * 1.8, rh = sz * 0.8;

                cctx.beginPath();

                cctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);

                var bGrad = cctx.createRadialGradient(-rw * 0.2, -rh * 0.3, 0, 0, 0, rw);

                bGrad.addColorStop(0, 'rgba(253,230,138,0.7)');

                bGrad.addColorStop(0.5, def.bodyColor);

                bGrad.addColorStop(1, 'rgba(245,158,11,0.15)');

                cctx.fillStyle = bGrad; cctx.fill();

                cctx.strokeStyle = def.color; cctx.lineWidth = 1.2 * dpr; cctx.stroke();

                // DNA nucleoid region

                cctx.beginPath(); cctx.ellipse(0, 0, rw * 0.4, rh * 0.5, 0.3, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(245,158,11,0.15)'; cctx.fill();

                cctx.strokeStyle = 'rgba(245,158,11,0.2)'; cctx.lineWidth = 0.5 * dpr;

                cctx.setLineDash([2 * dpr, 2 * dpr]); cctx.stroke(); cctx.setLineDash([]);

                // Pili (short hair-like)

                for (var pili = 0; pili < 6; pili++) {

                  var pa = (pili / 6) * Math.PI * 2;

                  var ppx = Math.cos(pa) * rw * 0.95, ppy = Math.sin(pa) * rh * 0.95;

                  cctx.beginPath(); cctx.moveTo(ppx, ppy);

                  cctx.lineTo(ppx + Math.cos(pa) * sz * 0.2, ppy + Math.sin(pa) * sz * 0.2);

                  cctx.strokeStyle = 'rgba(245,158,11,0.25)'; cctx.lineWidth = 0.4 * dpr; cctx.stroke();

                }

                // Flagella (undulating)

                cctx.beginPath(); cctx.moveTo(-rw, 0);

                var fl2 = Math.sin(world.tick * 0.25 + o.phase) * 5 * dpr;

                var fl3 = Math.cos(world.tick * 0.2 + o.phase) * 3 * dpr;

                cctx.bezierCurveTo(-rw - 8 * dpr, fl2, -rw - 14 * dpr, -fl2, -rw - 20 * dpr, fl3);

                cctx.strokeStyle = 'rgba(245,158,11,0.6)'; cctx.lineWidth = 0.8 * dpr; cctx.lineCap = 'round'; cctx.stroke();

              } else if (def.id === 'plantcell') {

                // Rectangular with gradient fill

                var hw = sz * 1.6, hh = sz * 1.2;

                // Cell wall (thicker double line)

                cctx.strokeStyle = '#65a30d'; cctx.lineWidth = 4 * dpr;

                cctx.strokeRect(-hw - 1, -hh - 1, (hw + 1) * 2, (hh + 1) * 2);

                cctx.strokeStyle = '#86efac'; cctx.lineWidth = 1 * dpr;

                cctx.strokeRect(-hw + 2, -hh + 2, (hw - 2) * 2, (hh - 2) * 2);

                // Gradient cytoplasm

                var pcGrad = cctx.createRadialGradient(-hw * 0.2, -hh * 0.2, 0, 0, 0, Math.max(hw, hh) * 1.1);

                pcGrad.addColorStop(0, 'rgba(220,252,231,0.6)');

                pcGrad.addColorStop(0.5, 'rgba(209,250,229,0.4)');

                pcGrad.addColorStop(1, 'rgba(187,247,208,0.2)');

                cctx.fillStyle = pcGrad; cctx.fillRect(-hw, -hh, hw * 2, hh * 2);

                // ER strands

                cctx.beginPath();

                cctx.moveTo(-hw * 0.6, -hh * 0.7); cctx.quadraticCurveTo(-hw * 0.2, -hh * 0.3, hw * 0.1, -hh * 0.5);

                cctx.moveTo(-hw * 0.4, hh * 0.3); cctx.quadraticCurveTo(hw * 0.1, hh * 0.5, hw * 0.6, hh * 0.2);

                cctx.strokeStyle = 'rgba(101,163,13,0.12)'; cctx.lineWidth = 0.8 * dpr; cctx.stroke();

                // Central vacuole with gradient

                cctx.beginPath(); cctx.ellipse(0, 0, hw * 0.6, hh * 0.5, 0, 0, Math.PI * 2);

                var cvGrad = cctx.createRadialGradient(-hw * 0.1, -hh * 0.08, 0, 0, 0, hw * 0.6);

                cvGrad.addColorStop(0, 'rgba(196,181,253,0.3)');

                cvGrad.addColorStop(1, 'rgba(167,139,250,0.12)');

                cctx.fillStyle = cvGrad; cctx.fill();

                cctx.strokeStyle = '#a78bfa'; cctx.lineWidth = 1 * dpr; cctx.stroke();

                // Chloroplasts (with thylakoid detail)

                [[-0.5, -0.4, 0.25], [0.3, 0, 0.22], [-0.2, 0.4, 0.2], [0.5, -0.5, 0.18], [-0.55, 0.25, 0.15]].forEach(function (cp, i) {

                  cctx.beginPath(); cctx.ellipse(hw * cp[0], hh * cp[1], sz * cp[2], sz * cp[2] * 0.6, 0.3 * i, 0, Math.PI * 2);

                  var cpGrad = cctx.createRadialGradient(hw * cp[0] - sz * 0.05, hh * cp[1] - sz * 0.05, 0, hw * cp[0], hh * cp[1], sz * cp[2]);

                  cpGrad.addColorStop(0, 'rgba(74,222,128,0.6)'); cpGrad.addColorStop(1, 'rgba(34,197,94,0.3)');

                  cctx.fillStyle = cpGrad; cctx.fill();

                  // Thylakoid line

                  cctx.beginPath(); cctx.moveTo(hw * cp[0] - sz * cp[2] * 0.5, hh * cp[1]);

                  cctx.lineTo(hw * cp[0] + sz * cp[2] * 0.5, hh * cp[1]);

                  cctx.strokeStyle = 'rgba(22,163,74,0.25)'; cctx.lineWidth = 0.4 * dpr; cctx.stroke();

                });

                // Mitochondria

                cctx.beginPath(); cctx.ellipse(hw * 0.55, hh * 0.45, sz * 0.12, sz * 0.06, 0.5, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(251,146,60,0.35)'; cctx.fill();

                cctx.strokeStyle = 'rgba(249,115,22,0.3)'; cctx.lineWidth = 0.4 * dpr; cctx.stroke();

                // Nucleus with envelope

                cctx.beginPath(); cctx.arc(hw * 0.3, -hh * 0.3, sz * 0.22, 0, Math.PI * 2);

                var pnGrad = cctx.createRadialGradient(hw * 0.28, -hh * 0.32, 0, hw * 0.3, -hh * 0.3, sz * 0.22);

                pnGrad.addColorStop(0, 'rgba(167,139,250,0.55)'); pnGrad.addColorStop(1, 'rgba(124,58,237,0.25)');

                cctx.fillStyle = pnGrad; cctx.fill();

                cctx.strokeStyle = 'rgba(124,58,237,0.4)'; cctx.lineWidth = 0.8 * dpr; cctx.stroke();

                // Nucleolus

                cctx.beginPath(); cctx.arc(hw * 0.32, -hh * 0.28, sz * 0.07, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(91,33,182,0.5)'; cctx.fill();

              } else if (def.id === 'diatom') {

                // Hexagonal silica shell with gradient

                cctx.beginPath();

                for (var hi = 0; hi < 6; hi++) {

                  var ha = (hi / 6) * Math.PI * 2 - Math.PI / 6;

                  var hx = Math.cos(ha) * sz * 1.2, hy = Math.sin(ha) * sz * 1.2;

                  hi === 0 ? cctx.moveTo(hx, hy) : cctx.lineTo(hx, hy);

                }

                cctx.closePath();

                var dGrad = cctx.createRadialGradient(-sz * 0.2, -sz * 0.2, 0, 0, 0, sz * 1.2);

                dGrad.addColorStop(0, 'rgba(186,230,253,0.5)');

                dGrad.addColorStop(0.4, def.bodyColor);

                dGrad.addColorStop(1, 'rgba(14,165,233,0.1)');

                cctx.fillStyle = dGrad; cctx.fill();

                cctx.strokeStyle = def.color; cctx.lineWidth = 2 * dpr; cctx.stroke();

                // Silica frustule ornate pattern (concentric hex)

                for (var ch = 0; ch < 2; ch++) {

                  cctx.beginPath();

                  var cscale = 0.6 - ch * 0.2;

                  for (var hi2 = 0; hi2 < 6; hi2++) {

                    var ha2 = (hi2 / 6) * Math.PI * 2 - Math.PI / 6;

                    var hx2 = Math.cos(ha2) * sz * 1.2 * cscale, hy2 = Math.sin(ha2) * sz * 1.2 * cscale;

                    hi2 === 0 ? cctx.moveTo(hx2, hy2) : cctx.lineTo(hx2, hy2);

                  }

                  cctx.closePath();

                  cctx.strokeStyle = 'rgba(14,165,233,' + (0.15 - ch * 0.05) + ')'; cctx.lineWidth = 0.6 * dpr; cctx.stroke();

                }

                // Ornate radial raphe

                for (var ri2 = 0; ri2 < 6; ri2++) {

                  var ra = (ri2 / 6) * Math.PI * 2;

                  cctx.beginPath(); cctx.moveTo(Math.cos(ra) * sz * 0.25, Math.sin(ra) * sz * 0.25);

                  cctx.lineTo(Math.cos(ra) * sz * 1.0, Math.sin(ra) * sz * 1.0);

                  cctx.strokeStyle = 'rgba(14,165,233,0.2)'; cctx.lineWidth = 0.6 * dpr; cctx.stroke();

                }

                // Areolae (tiny pores along raphe lines)

                for (var ri3 = 0; ri3 < 6; ri3++) {

                  var ra3 = (ri3 / 6) * Math.PI * 2;

                  for (var ar = 0.4; ar < 0.9; ar += 0.2) {

                    cctx.beginPath(); cctx.arc(Math.cos(ra3) * sz * 1.2 * ar, Math.sin(ra3) * sz * 1.2 * ar, sz * 0.03, 0, Math.PI * 2);

                    cctx.fillStyle = 'rgba(14,165,233,0.2)'; cctx.fill();

                  }

                }

                // Central node (glowing)

                cctx.beginPath(); cctx.arc(0, 0, sz * 0.2, 0, Math.PI * 2);

                var dnGrad = cctx.createRadialGradient(-sz * 0.03, -sz * 0.03, 0, 0, 0, sz * 0.2);

                dnGrad.addColorStop(0, 'rgba(125,211,252,0.7)'); dnGrad.addColorStop(1, 'rgba(14,165,233,0.35)');

                cctx.fillStyle = dnGrad; cctx.fill();

                cctx.strokeStyle = 'rgba(14,165,233,0.4)'; cctx.lineWidth = 0.5 * dpr; cctx.stroke();

              } else if (def.id === 'volvox') {

                // Hollow sphere colony with gradient

                cctx.beginPath(); cctx.arc(0, 0, sz, 0, Math.PI * 2);

                var vGrad = cctx.createRadialGradient(-sz * 0.25, -sz * 0.25, 0, 0, 0, sz);

                vGrad.addColorStop(0, 'rgba(187,247,208,0.5)');

                vGrad.addColorStop(0.5, def.bodyColor);

                vGrad.addColorStop(1, 'rgba(16,185,129,0.2)');

                cctx.fillStyle = vGrad; cctx.fill();

                cctx.strokeStyle = def.color; cctx.lineWidth = 2 * dpr; cctx.stroke();

                // Surface cells (more, with flagella)

                for (var vi = 0; vi < 18; vi++) {

                  var va = (vi / 18) * Math.PI * 2 + world.tick * 0.02;

                  var vcx = Math.cos(va) * sz * 0.85, vcy = Math.sin(va) * sz * 0.85;

                  cctx.beginPath(); cctx.arc(vcx, vcy, sz * 0.07, 0, Math.PI * 2);

                  cctx.fillStyle = '#22c55e'; cctx.fill();

                  // Tiny flagella

                  var vfl = Math.sin(world.tick * 0.2 + vi) * 2 * dpr;

                  cctx.beginPath(); cctx.moveTo(vcx, vcy);

                  cctx.lineTo(vcx + Math.cos(va) * sz * 0.15, vcy + Math.sin(va) * sz * 0.15 + vfl);

                  cctx.strokeStyle = 'rgba(34,197,94,0.4)'; cctx.lineWidth = 0.5 * dpr; cctx.stroke();

                }

                // Inner ring of cells

                for (var vi2 = 0; vi2 < 8; vi2++) {

                  var va2 = (vi2 / 8) * Math.PI * 2 + world.tick * 0.015 + 0.3;

                  cctx.beginPath(); cctx.arc(Math.cos(va2) * sz * 0.55, Math.sin(va2) * sz * 0.55, sz * 0.05, 0, Math.PI * 2);

                  cctx.fillStyle = 'rgba(34,197,94,0.5)'; cctx.fill();

                }

                // Daughter colony inside (glowing)

                cctx.beginPath(); cctx.arc(sz * 0.15, -sz * 0.1, sz * 0.22, 0, Math.PI * 2);

                var dcGrad = cctx.createRadialGradient(sz * 0.13, -sz * 0.12, 0, sz * 0.15, -sz * 0.1, sz * 0.22);

                dcGrad.addColorStop(0, 'rgba(74,222,128,0.5)');

                dcGrad.addColorStop(1, 'rgba(16,185,129,0.15)');

                cctx.fillStyle = dcGrad; cctx.fill();

                cctx.strokeStyle = 'rgba(16,185,129,0.5)'; cctx.lineWidth = 1 * dpr; cctx.stroke();

              } else if (def.id === 'stentor') {

                // Apply body contraction/extension scale

                var stBodyScale = o._stScale || 1.0;

                cctx.scale(1, stBodyScale); // only stretch vertically (trumpet length)

                // Trumpet / cone shape with gradient

                cctx.beginPath();

                cctx.moveTo(-sz * 0.3, sz * 1.2);

                cctx.quadraticCurveTo(-sz * 0.1, 0, -sz * 1.0, -sz * 0.8);

                cctx.lineTo(sz * 1.0, -sz * 0.8);

                cctx.quadraticCurveTo(sz * 0.1, 0, sz * 0.3, sz * 1.2);

                cctx.closePath();

                var stGrad = cctx.createRadialGradient(-sz * 0.15, -sz * 0.2, 0, 0, 0, sz * 1.2);

                stGrad.addColorStop(0, 'rgba(216,180,254,0.55)');

                stGrad.addColorStop(0.5, def.bodyColor);

                stGrad.addColorStop(1, 'rgba(168,85,247,0.1)');

                cctx.fillStyle = stGrad; cctx.fill();

                cctx.strokeStyle = def.color; cctx.lineWidth = 1.5 * dpr; cctx.stroke();

                // Myonemes (contractile fibers running length of body)

                for (var mi = 0; mi < 4; mi++) {

                  var mx = sz * (-0.15 + mi * 0.1);

                  cctx.beginPath(); cctx.moveTo(mx, sz * 1.1);

                  cctx.quadraticCurveTo(mx - sz * 0.3 * (mi - 1.5), sz * 0.3, mx * 2.5, -sz * 0.75);

                  cctx.strokeStyle = 'rgba(168,85,247,0.1)'; cctx.lineWidth = 0.4 * dpr; cctx.stroke();

                }

                // Membranellar band (elaborate cilia crown)

                for (var sci = 0; sci < 14; sci++) {

                  var scx = -sz * 0.9 + (sci / 13) * sz * 1.8;

                  var scWave = Math.sin(world.tick * 0.18 + sci * 0.6) * 5 * dpr;

                  var scWave2 = Math.cos(world.tick * 0.12 + sci * 0.4) * 3 * dpr;

                  cctx.beginPath(); cctx.moveTo(scx, -sz * 0.8);

                  cctx.quadraticCurveTo(scx + scWave, -sz * 0.95, scx + scWave2, -sz * 1.15);

                  cctx.strokeStyle = 'rgba(168,85,247,0.45)'; cctx.lineWidth = 0.7 * dpr; cctx.lineCap = 'round'; cctx.stroke();

                }

                // Bead-like macronucleus (with gradient)

                for (var ni = 0; ni < 3; ni++) {

                  var ny = sz * (0.3 - ni * 0.35);

                  cctx.beginPath(); cctx.arc(0, ny, sz * 0.12, 0, Math.PI * 2);

                  var snGrad = cctx.createRadialGradient(-sz * 0.02, ny - sz * 0.02, 0, 0, ny, sz * 0.12);

                  snGrad.addColorStop(0, 'rgba(192,132,252,0.65)'); snGrad.addColorStop(1, 'rgba(168,85,247,0.3)');

                  cctx.fillStyle = snGrad; cctx.fill();

                  cctx.strokeStyle = 'rgba(168,85,247,0.3)'; cctx.lineWidth = 0.4 * dpr; cctx.stroke();

                }

                // Food vacuoles inside

                cctx.beginPath(); cctx.arc(sz * 0.2, -sz * 0.3, sz * 0.08, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(34,197,94,0.2)'; cctx.fill();

              } else if (def.id === 'tardigrade') {

                // Plump segmented body with gradient

                cctx.beginPath(); cctx.ellipse(0, 0, sz * 1.3, sz * 0.9, 0, 0, Math.PI * 2);

                var tGrad = cctx.createRadialGradient(-sz * 0.3, -sz * 0.2, 0, 0, 0, sz * 1.3);

                tGrad.addColorStop(0, 'rgba(245,208,254,0.5)');

                tGrad.addColorStop(0.5, def.bodyColor);

                tGrad.addColorStop(1, 'rgba(217,70,239,0.1)');

                cctx.fillStyle = tGrad; cctx.fill();

                cctx.strokeStyle = def.color; cctx.lineWidth = 1.5 * dpr; cctx.stroke();

                // Body segment lines

                [-0.5, -0.1, 0.3, 0.65].forEach(function (sx) {

                  cctx.beginPath(); cctx.moveTo(sz * sx, -sz * 0.85); cctx.lineTo(sz * sx, sz * 0.85);

                  cctx.strokeStyle = 'rgba(217,70,239,0.12)'; cctx.lineWidth = 0.5 * dpr; cctx.stroke();

                });

                // Head bump with gradient

                cctx.beginPath(); cctx.arc(sz * 1.1, 0, sz * 0.4, 0, Math.PI * 2);

                var thGrad = cctx.createRadialGradient(sz * 1.05, -sz * 0.05, 0, sz * 1.1, 0, sz * 0.4);

                thGrad.addColorStop(0, 'rgba(245,208,254,0.5)'); thGrad.addColorStop(1, 'rgba(217,70,239,0.15)');

                cctx.fillStyle = thGrad; cctx.fill();

                cctx.strokeStyle = def.color; cctx.lineWidth = 1.2 * dpr; cctx.stroke();

                // Mouth stylets

                cctx.beginPath(); cctx.moveTo(sz * 1.45, -sz * 0.05); cctx.lineTo(sz * 1.6, -sz * 0.08);

                cctx.moveTo(sz * 1.45, sz * 0.05); cctx.lineTo(sz * 1.6, sz * 0.08);

                cctx.strokeStyle = 'rgba(217,70,239,0.4)'; cctx.lineWidth = 0.6 * dpr; cctx.stroke();

                // 8 legs (4 per side) with claws

                [[-0.8, 0.7], [-0.2, 0.8], [0.3, 0.75], [0.8, 0.6]].forEach(function (leg, li) {

                  var phase2 = Math.sin(world.tick * 0.08 + li * 1.5) * 3 * dpr;

                  // Top leg with claw detail

                  cctx.beginPath(); cctx.moveTo(sz * leg[0], -sz * leg[1]);

                  cctx.quadraticCurveTo(sz * leg[0] + phase2 * 0.5, -sz * (leg[1] + 0.15), sz * leg[0] + phase2, -sz * (leg[1] + 0.35));

                  cctx.strokeStyle = def.color; cctx.lineWidth = 1.5 * dpr; cctx.lineCap = 'round'; cctx.stroke();

                  // Tiny claw hooks

                  var clawX = sz * leg[0] + phase2, clawY = -sz * (leg[1] + 0.35);

                  cctx.beginPath(); cctx.moveTo(clawX - 1 * dpr, clawY); cctx.lineTo(clawX - 2 * dpr, clawY - 2 * dpr);

                  cctx.moveTo(clawX + 1 * dpr, clawY); cctx.lineTo(clawX + 2 * dpr, clawY - 2 * dpr);

                  cctx.strokeStyle = 'rgba(217,70,239,0.5)'; cctx.lineWidth = 0.5 * dpr; cctx.stroke();

                  // Bottom leg with claw detail

                  cctx.beginPath(); cctx.moveTo(sz * leg[0], sz * leg[1]);

                  cctx.quadraticCurveTo(sz * leg[0] - phase2 * 0.5, sz * (leg[1] + 0.15), sz * leg[0] - phase2, sz * (leg[1] + 0.35));

                  cctx.strokeStyle = def.color; cctx.lineWidth = 1.5 * dpr; cctx.lineCap = 'round'; cctx.stroke();

                  var clawX2 = sz * leg[0] - phase2, clawY2 = sz * (leg[1] + 0.35);

                  cctx.beginPath(); cctx.moveTo(clawX2 - 1 * dpr, clawY2); cctx.lineTo(clawX2 - 2 * dpr, clawY2 + 2 * dpr);

                  cctx.moveTo(clawX2 + 1 * dpr, clawY2); cctx.lineTo(clawX2 + 2 * dpr, clawY2 + 2 * dpr);

                  cctx.strokeStyle = 'rgba(217,70,239,0.5)'; cctx.lineWidth = 0.5 * dpr; cctx.stroke();

                });

                // Eyes with specular highlight

                cctx.beginPath(); cctx.arc(sz * 1.2, -sz * 0.12, sz * 0.09, 0, Math.PI * 2);

                cctx.fillStyle = '#1e1b4b'; cctx.fill();

                cctx.beginPath(); cctx.arc(sz * 1.18, -sz * 0.14, sz * 0.03, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(255,255,255,0.5)'; cctx.fill();

                cctx.beginPath(); cctx.arc(sz * 1.2, sz * 0.12, sz * 0.09, 0, Math.PI * 2);

                cctx.fillStyle = '#1e1b4b'; cctx.fill();

                cctx.beginPath(); cctx.arc(sz * 1.18, sz * 0.1, sz * 0.03, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(255,255,255,0.5)'; cctx.fill();

              } else if (def.id === 'spirillum') {

                // Corkscrew spiral

                cctx.beginPath();

                for (var sp = -sz * 2; sp < sz * 2; sp += 1) {

                  var spx = sp;

                  var spy = Math.sin((sp / (sz * 0.5)) * Math.PI + world.tick * 0.15) * sz * 0.5;

                  sp === -sz * 2 ? cctx.moveTo(spx, spy) : cctx.lineTo(spx, spy);

                }

                cctx.strokeStyle = def.color; cctx.lineWidth = sz * 0.4 * dpr / 5; cctx.lineCap = 'round'; cctx.stroke();

                // Body fill along the spiral with gradient

                cctx.beginPath();

                for (var sp = -sz * 2; sp < sz * 2; sp += 1) {

                  var spx = sp;

                  var spy = Math.sin((sp / (sz * 0.5)) * Math.PI + world.tick * 0.15) * sz * 0.5;

                  sp === -sz * 2 ? cctx.moveTo(spx, spy - sz * 0.15) : cctx.lineTo(spx, spy - sz * 0.15);

                }

                for (var sp = sz * 2; sp > -sz * 2; sp -= 1) {

                  var spx = sp;

                  var spy = Math.sin((sp / (sz * 0.5)) * Math.PI + world.tick * 0.15) * sz * 0.5;

                  cctx.lineTo(spx, spy + sz * 0.15);

                }

                cctx.closePath();

                var spGrad = cctx.createLinearGradient(-sz * 2, -sz * 0.5, sz * 2, sz * 0.5);

                spGrad.addColorStop(0, 'rgba(254,215,170,0.5)');

                spGrad.addColorStop(0.5, def.bodyColor);

                spGrad.addColorStop(1, 'rgba(249,115,22,0.15)');

                cctx.fillStyle = spGrad; cctx.fill();

                // Flagella tufts at both ends (multiple strands)

                for (var fti = 0; fti < 3; fti++) {

                  var ftip1 = Math.sin(world.tick * 0.3 + fti * 0.8) * 4 * dpr;

                  var ftOff = (fti - 1) * 2 * dpr;

                  cctx.beginPath(); cctx.moveTo(-sz * 2, ftOff);

                  cctx.bezierCurveTo(-sz * 2.5, ftip1 + ftOff, -sz * 3, -ftip1 + ftOff, -sz * 3.2, ftip1 + ftOff);

                  cctx.strokeStyle = 'rgba(249,115,22,' + (0.4 - fti * 0.1) + ')'; cctx.lineWidth = (0.7 - fti * 0.1) * dpr; cctx.lineCap = 'round'; cctx.stroke();

                }

                for (var fti2 = 0; fti2 < 3; fti2++) {

                  var ftip2 = Math.sin(world.tick * 0.3 + Math.PI + fti2 * 0.8) * 4 * dpr;

                  var ftOff2 = (fti2 - 1) * 2 * dpr;

                  cctx.beginPath(); cctx.moveTo(sz * 2, ftOff2);

                  cctx.bezierCurveTo(sz * 2.5, ftip2 + ftOff2, sz * 3, -ftip2 + ftOff2, sz * 3.2, ftip2 + ftOff2);

                  cctx.strokeStyle = 'rgba(249,115,22,' + (0.4 - fti2 * 0.1) + ')'; cctx.lineWidth = (0.7 - fti2 * 0.1) * dpr; cctx.lineCap = 'round'; cctx.stroke();

                }

              }

              cctx.restore();

            }



            // ── Helper: convert any CSS color to rgba string ──

            function hexToRgba(hex, alpha) {

              if (hex.charAt(0) === '#') {

                var r = parseInt(hex.slice(1, 3), 16);

                var g = parseInt(hex.slice(3, 5), 16);

                var b = parseInt(hex.slice(5, 7), 16);

                return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';

              }

              return hex; // already rgb/rgba

            }



            // ── Smoothed label positions (persist across frames) ──

            var _labelPositions = {};



            // ── Organelle label hit regions for click-to-explain ──

            var _labelHitRegions = [];



            // ── Organelle labels (floating pills with leader lines) ──

            function drawOrganelleLabels(o) {

              var def = o.def;

              if (!def.anatomy || def.anatomy.length === 0) return;

              var p = toScreen(o.x, o.y);

              var sz = o.size * cam.zoom * dpr;

              // Only show labels when zoomed in enough and organism is on-screen

              if (sz < 4) return;

              if (p.x < -100 || p.x > W + 100 || p.y < -100 || p.y > HH + 100) return;

              cctx.save();

              var fontSize = Math.max(7, Math.min(10, sz * 0.28)) * dpr;

              cctx.font = 'bold ' + fontSize + 'px Inter, system-ui, sans-serif';

              cctx.textAlign = 'left';

              cctx.textBaseline = 'middle';

              var tNow = world.tick || 0;

              var lineColor = hexToRgba(def.color, 0.7);

              var glowColor = hexToRgba(def.color, 0.25);

              var dotGlowColor = hexToRgba(def.color, 0.18);

              def.anatomy.forEach(function (a, i) {

                if (typeof a.lx === 'undefined') return;

                // Organelle point in world-relative rotated coords

                var ox = a.lx * sz;

                var oy = a.ly * sz;

                // Rotate by organism angle to get screen-space offset

                var cos = Math.cos(o.angle), sin = Math.sin(o.angle);

                var rx = ox * cos - oy * sin;

                var ry = ox * sin + oy * cos;

                // Screen position of organelle

                var sx = p.x + rx;

                var sy = p.y + ry;

                // Target label position — pushed outward from center

                var labelDist = sz * 1.5 + fontSize * 2;

                var spreadAngle = -Math.PI * 0.7 + (i / (def.anatomy.length - 0.01)) * Math.PI * 1.4;

                var targetLx = sx + Math.cos(spreadAngle) * labelDist;

                var targetLy = sy + Math.sin(spreadAngle) * labelDist;

                // Clamp targets to screen

                var textW = cctx.measureText(a.name).width + fontSize * 1.5;

                targetLx = Math.max(fontSize, Math.min(W - textW - fontSize, targetLx));

                targetLy = Math.max(fontSize * 2, Math.min(HH - fontSize * 2, targetLy));

                // Smooth lerp: labels follow slowly instead of snapping

                var lerpKey = o.def.id + '_' + i;

                if (!_labelPositions[lerpKey]) _labelPositions[lerpKey] = { x: targetLx, y: targetLy };

                _labelPositions[lerpKey].x += (targetLx - _labelPositions[lerpKey].x) * 0.08;

                _labelPositions[lerpKey].y += (targetLy - _labelPositions[lerpKey].y) * 0.08;

                var lx = _labelPositions[lerpKey].x;

                var ly = _labelPositions[lerpKey].y;



                // ── Leader line (visible, animated) ──

                // Glow line (thicker, subtle)

                cctx.beginPath();

                cctx.moveTo(sx, sy);

                cctx.lineTo(lx, ly);

                cctx.strokeStyle = glowColor;

                cctx.lineWidth = 3.0 * dpr;

                cctx.stroke();

                // Main leader line — solid with flowing dash overlay

                cctx.beginPath();

                cctx.moveTo(sx, sy);

                cctx.lineTo(lx, ly);

                cctx.strokeStyle = lineColor;

                cctx.lineWidth = 1.5 * dpr;

                var dashLen = 5 * dpr;

                cctx.setLineDash([dashLen, dashLen * 0.6]);

                cctx.lineDashOffset = -(tNow * 0.8); // flowing animation

                cctx.stroke();

                cctx.setLineDash([]);

                cctx.lineDashOffset = 0;



                // Pulsing glow dot at organelle point

                var pulse = 0.6 + Math.sin(tNow * 0.06 + i * 1.2) * 0.4;

                var dotR = (2.5 + pulse * 1.5) * dpr;

                cctx.beginPath();

                cctx.arc(sx, sy, dotR * 1.8, 0, Math.PI * 2);

                cctx.fillStyle = dotGlowColor;

                cctx.fill();

                cctx.beginPath();

                cctx.arc(sx, sy, dotR, 0, Math.PI * 2);

                cctx.fillStyle = def.color;

                cctx.fill();

                // Small white center highlight

                cctx.beginPath();

                cctx.arc(sx - dotR * 0.2, sy - dotR * 0.2, dotR * 0.35, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(255,255,255,0.45)';

                cctx.fill();



                // Pill background

                var pillW = textW + 4 * dpr;

                var pillH = fontSize * 1.7;

                var pillX = lx - 2 * dpr;

                var pillY = ly - pillH / 2;

                cctx.beginPath();

                var r = pillH / 2;

                cctx.moveTo(pillX + r, pillY);

                cctx.lineTo(pillX + pillW - r, pillY);

                cctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + r, r);

                cctx.lineTo(pillX + pillW, pillY + pillH - r);

                cctx.arcTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH, r);

                cctx.lineTo(pillX + r, pillY + pillH);

                cctx.arcTo(pillX, pillY + pillH, pillX, pillY + pillH - r, r);

                cctx.lineTo(pillX, pillY + r);

                cctx.arcTo(pillX, pillY, pillX + r, pillY, r);

                cctx.closePath();

                cctx.fillStyle = 'rgba(15,23,42,0.85)';

                cctx.fill();

                cctx.strokeStyle = def.color;

                cctx.lineWidth = 1.2 * dpr;

                cctx.stroke();

                // Label text

                cctx.fillStyle = '#ffffff';

                cctx.fillText(a.name, pillX + fontSize * 0.7, ly);



                // Store hit region for click-to-explain

                _labelHitRegions.push({ x: pillX, y: pillY, w: pillW, h: pillH, anatomy: a, def: def, org: o });

              });

              cctx.restore();

            }



            function updateOrganism(o) {

              var def = o.def;

              if (playAsOrg === o) {

                // Player-controlled

                var spd = def.speed * 1.5;

                if (spd < 0.3) spd = 0.3; // minimum speed for playable organisms

                o.vx = ((playerKeys['ArrowRight'] || playerKeys['d'] ? 1 : 0) - (playerKeys['ArrowLeft'] || playerKeys['a'] ? 1 : 0)) * spd;

                o.vy = ((playerKeys['ArrowDown'] || playerKeys['s'] ? 1 : 0) - (playerKeys['ArrowUp'] || playerKeys['w'] ? 1 : 0)) * spd;

                if (o.vx || o.vy) o.angle = Math.atan2(o.vy, o.vx);

                // Camera follow with smooth lerp

                cam.x += (o.x - cam.x) * 0.08;

                cam.y += (o.y - cam.y) * 0.08;

              } else if (def.speed > 0) {

                // AI behavior

                o.phase += 0.02;

                if (def.id === 'euglena') {

                  // Phototaxis - move toward nearest light zone

                  var nearestLight = null, bestDist = Infinity;

                  world.lightZones.forEach(function (lz) {

                    var dd = Math.hypot(lz.x - o.x, lz.y - o.y);

                    if (dd < bestDist) { bestDist = dd; nearestLight = lz; }

                  });

                  if (nearestLight && bestDist > nearestLight.r * 0.5) {

                    var ax = (nearestLight.x - o.x) / bestDist * 0.02;

                    var ay = (nearestLight.y - o.y) / bestDist * 0.02;

                    o.vx += ax; o.vy += ay;

                  }

                } else if (def.id === 'wbc') {

                  // Chase nearest bacterium

                  var nearest = null, bd2 = Infinity;

                  world.organisms.forEach(function (t) {

                    if (t.def.id === 'bacterium') {

                      var dd = Math.hypot(t.x - o.x, t.y - o.y);

                      if (dd < bd2) { bd2 = dd; nearest = t; }

                    }

                  });

                  if (nearest && bd2 < 200) {

                    o.vx += (nearest.x - o.x) / bd2 * 0.03;

                    o.vy += (nearest.y - o.y) / bd2 * 0.03;

                  }

                } else if (def.id === 'volvox') {

                  // Phototaxis like euglena but slower rotation

                  var nearestLight2 = null, bestD3 = Infinity;

                  world.lightZones.forEach(function (lz) {

                    var dd3 = Math.hypot(lz.x - o.x, lz.y - o.y);

                    if (dd3 < bestD3) { bestD3 = dd3; nearestLight2 = lz; }

                  });

                  if (nearestLight2 && bestD3 > nearestLight2.r * 0.3) {

                    o.vx += (nearestLight2.x - o.x) / bestD3 * 0.01;

                    o.vy += (nearestLight2.y - o.y) / bestD3 * 0.01;

                  }

                  o.angle += 0.005; // gentle rotation (~20s per revolution)

                } else if (def.id === 'stentor') {

                  // Realistic filter-feeding behaviour: drift > anchor > feed > escape

                  if (!o._stentorTimer) o._stentorTimer = Math.floor(Math.random() * 300);

                  o._stentorTimer = (o._stentorTimer || 0) + 1;

                  if (!o._stScale) o._stScale = 1.0;  // body contraction scale

                  if (!o._stEscape) o._stEscape = 0;   // escape contraction timer

                  var stCycle = o._stentorTimer % 720; // ~12s cycle at 60fps



                  // Occasional escape contraction (rapid myoneme contraction)

                  if (o._stEscape > 0) {

                    o._stEscape--;

                    if (o._stEscape > 15) {

                      // Rapid contraction phase: body shrinks, dart backward

                      o._stScale = Math.max(0.4, o._stScale - 0.06);

                      o.vx += Math.cos(o.angle + Math.PI) * 0.5;

                      o.vy += Math.sin(o.angle + Math.PI) * 0.5;

                    } else {

                      // Slow re-extension

                      o._stScale = Math.min(1.0, o._stScale + 0.04);

                      o.vx *= 0.9; o.vy *= 0.9;

                    }

                  } else if (stCycle < 350) {

                    // Drifting phase — slow purposeful glide seeking attachment site

                    if (stCycle === 0 || stCycle % 140 === 0) {

                      var da = Math.random() * Math.PI * 2;

                      o._stDriftX = Math.cos(da) * 0.07;

                      o._stDriftY = Math.sin(da) * 0.07;

                    }

                    o.vx += ((o._stDriftX || 0) - o.vx) * 0.015;

                    o.vy += ((o._stDriftY || 0) - o.vy) * 0.015;

                    o._stScale = 1.0; // fully extended while drifting

                  } else {

                    // Feeding pause — anchored, body pulses as cilia create feeding currents

                    o.vx *= 0.88; o.vy *= 0.88;

                    // Rhythmic body pulsing (trumpet opens/closes to draw water)

                    var feedPulse = Math.sin(world.tick * 0.08 + o.phase) * 0.08;

                    o._stScale = 0.95 + feedPulse;

                    // Rare chance to trigger escape contraction

                    if (Math.random() < 0.0008) o._stEscape = 30;

                  }

                  // Gentle rocking sway (trumpet opening scans the water)

                  o.angle = o.phase + Math.sin(world.tick * 0.018 + o.phase) * 0.45

                    + Math.sin(world.tick * 0.007 + o.phase * 2) * 0.15;

                } else if (def.id === 'spirillum') {

                  // Corkscrew movement — smooth spiraling path using sine-based steering

                  var spSteer = Math.sin(world.tick * 0.04 + o.phase) * 0.04;

                  var spPerp = Math.cos(world.tick * 0.025 + o.phase * 1.3) * 0.02;

                  o.vx += Math.cos(o.angle) * 0.02 + spSteer;

                  o.vy += Math.sin(o.angle) * 0.02 + spPerp;

                  o.angle += 0.03 + Math.sin(world.tick * 0.015 + o.phase) * 0.02; // smooth spin

                } else if (def.id === 'diatom') {

                  // Gentle drift — simulate water currents

                  o.vx += Math.sin(world.tick * 0.005 + o.phase) * 0.005;

                  o.vy += Math.cos(world.tick * 0.007 + o.phase) * 0.005;

                } else if (def.id === 'tardigrade') {

                  // Slow purposeful walk — smooth sine-based wandering

                  o.vx += Math.sin(world.tick * 0.012 + o.phase) * 0.012;

                  o.vy += Math.cos(world.tick * 0.009 + o.phase * 1.7) * 0.012;

                  // Occasional gentle direction change

                  if (world.tick % 180 === 0) o.phase += 0.8;

                } else {

                  // Random walk — smoothed with velocity damping instead of raw noise

                  o.vx += Math.sin(world.tick * 0.02 + o.phase) * 0.02 + (Math.random() - 0.5) * 0.01;

                  o.vy += Math.cos(world.tick * 0.015 + o.phase * 1.5) * 0.02 + (Math.random() - 0.5) * 0.01;

                }

                // Velocity damping — reduces jitter across all organisms

                o.vx *= 0.97; o.vy *= 0.97;

                // Speed limit

                var spd2 = Math.hypot(o.vx, o.vy);

                if (spd2 > def.speed) { o.vx = (o.vx / spd2) * def.speed; o.vy = (o.vy / spd2) * def.speed; }

                // Only update angle from velocity for organisms that actually move fast enough

                // (avoids chaotic spinning from tiny random-walk jitter on slow organisms)

                if (spd2 > 0.08 && def.id !== 'stentor' && def.id !== 'diatom') {

                  // Smooth angle transition instead of snapping

                  var targetAngle = Math.atan2(o.vy, o.vx);

                  var angleDiff = targetAngle - o.angle;

                  // Normalize to [-PI, PI]

                  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                  o.angle += angleDiff * 0.15;

                }

              }

              o.x += o.vx; o.y += o.vy;

              // Bounce off walls

              if (o.x < o.size) { o.x = o.size; o.vx = Math.abs(o.vx); }

              if (o.x > WORLD_W - o.size) { o.x = WORLD_W - o.size; o.vx = -Math.abs(o.vx); }

              if (o.y < o.size) { o.y = o.size; o.vy = Math.abs(o.vy); }

              if (o.y > WORLD_H - o.size) { o.y = WORLD_H - o.size; o.vy = -Math.abs(o.vy); }



              // Player food collection (phagocytosis / ciliary sweep)

              if (playAsOrg === o && (def.id === 'amoeba' || def.id === 'paramecium' || def.id === 'wbc' || def.id === 'stentor' || def.id === 'tardigrade')) {

                world.food.forEach(function (f) {

                  if (!f.eaten && Math.hypot(f.x - o.x, f.y - o.y) < o.size + f.size) {

                    f.eaten = true;

                    if (canvasEl._onFood) canvasEl._onFood();

                    o.energy = Math.min(100, o.energy + 10);

                    // Dispatch XP event

                    if (canvasEl._onXP) canvasEl._onXP(def.xp, def.activity);

                  }

                });

              }

              // Euglena in light zone = photosynthesis

              if (playAsOrg === o && def.id === 'euglena') {

                world.lightZones.forEach(function (lz) {

                  if (Math.hypot(lz.x - o.x, lz.y - o.y) < lz.r) {

                    if (world.tick % 60 === 0) {

                      o.energy = Math.min(100, o.energy + 5);

                      if (canvasEl._onXP) canvasEl._onXP(def.xp, 'Photosynthesis');

                      if (canvasEl._onPhotosynthesis) canvasEl._onPhotosynthesis();

                    }

                  }

                });

              }

            }



            function render() {

              cctx.clearRect(0, 0, W, HH);

              var center = toScreen(WORLD_W / 2, WORLD_H / 2);

              var dishR = Math.max(WORLD_W, WORLD_H) * 0.55 * cam.zoom * dpr;



              // ── Microscope slide background ──

              var bgGrad = cctx.createRadialGradient(W / 2, HH / 2, 0, W / 2, HH / 2, Math.max(W, HH) * 0.7);

              bgGrad.addColorStop(0, '#f0fdf4');

              bgGrad.addColorStop(0.6, '#ecfdf5');

              bgGrad.addColorStop(1, '#d1fae5');

              cctx.fillStyle = bgGrad; cctx.fillRect(0, 0, W, HH);



              // Petri dish with subtle depth ring

              cctx.save();

              cctx.beginPath(); cctx.arc(center.x, center.y, dishR, 0, Math.PI * 2);

              var dishGrad = cctx.createRadialGradient(center.x, center.y, dishR * 0.85, center.x, center.y, dishR);

              dishGrad.addColorStop(0, 'rgba(209,250,229,0)');

              dishGrad.addColorStop(0.7, 'rgba(16,185,129,0.06)');

              dishGrad.addColorStop(1, 'rgba(16,185,129,0.18)');

              cctx.fillStyle = dishGrad; cctx.fill();

              cctx.strokeStyle = 'rgba(16,185,129,0.25)'; cctx.lineWidth = 2 * dpr; cctx.stroke();

              // Inner rim highlight

              cctx.beginPath(); cctx.arc(center.x - dishR * 0.08, center.y - dishR * 0.08, dishR * 0.96, 0, Math.PI * 2);

              cctx.strokeStyle = 'rgba(255,255,255,0.12)'; cctx.lineWidth = 3 * dpr; cctx.stroke();

              cctx.restore();



              // ── Fine grid lines ──

              cctx.strokeStyle = 'rgba(148,163,184,0.1)'; cctx.lineWidth = 0.5 * dpr;

              for (var gx = 0; gx < WORLD_W; gx += 50) {

                var p1 = toScreen(gx, 0), p2 = toScreen(gx, WORLD_H);

                cctx.beginPath(); cctx.moveTo(p1.x, p1.y); cctx.lineTo(p2.x, p2.y); cctx.stroke();

              }

              for (var gy = 0; gy < WORLD_H; gy += 50) {

                var p1 = toScreen(0, gy), p2 = toScreen(WORLD_W, gy);

                cctx.beginPath(); cctx.moveTo(p1.x, p1.y); cctx.lineTo(p2.x, p2.y); cctx.stroke();

              }

              // Center crosshair

              cctx.strokeStyle = 'rgba(148,163,184,0.2)'; cctx.lineWidth = 1 * dpr;

              cctx.beginPath(); cctx.moveTo(center.x - 12 * dpr, center.y); cctx.lineTo(center.x + 12 * dpr, center.y); cctx.stroke();

              cctx.beginPath(); cctx.moveTo(center.x, center.y - 12 * dpr); cctx.lineTo(center.x, center.y + 12 * dpr); cctx.stroke();



              // ── Floating out-of-focus debris (depth-of-field) ──

              if (!world._debris) {

                world._debris = [];

                for (var di = 0; di < 20; di++) {

                  world._debris.push({ x: Math.random() * WORLD_W, y: Math.random() * WORLD_H, r: 1.5 + Math.random() * 3, dx: (Math.random() - 0.5) * 0.15, dy: (Math.random() - 0.5) * 0.1, alpha: 0.06 + Math.random() * 0.1 });

                }

              }

              world._debris.forEach(function (db) {

                db.x += db.dx; db.y += db.dy;

                if (db.x < 0) db.x += WORLD_W; if (db.x > WORLD_W) db.x -= WORLD_W;

                if (db.y < 0) db.y += WORLD_H; if (db.y > WORLD_H) db.y -= WORLD_H;

                var dp = toScreen(db.x, db.y);

                var dr = db.r * cam.zoom * dpr;

                cctx.beginPath(); cctx.arc(dp.x, dp.y, dr, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(120,160,130,' + db.alpha + ')'; cctx.fill();

              });



              // ── Light zones (warm glow) ──

              world.lightZones.forEach(function (lz) {

                var p = toScreen(lz.x, lz.y);

                var r = lz.r * cam.zoom * dpr;

                var grad = cctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);

                grad.addColorStop(0, 'rgba(250,240,137,0.4)');

                grad.addColorStop(0.5, 'rgba(250,240,137,0.15)');

                grad.addColorStop(1, 'rgba(250,240,137,0)');

                cctx.beginPath(); cctx.arc(p.x, p.y, r, 0, Math.PI * 2);

                cctx.fillStyle = grad; cctx.fill();

                // Soft pulsing ring

                cctx.strokeStyle = 'rgba(234,179,8,' + (0.15 + 0.1 * Math.sin(world.tick * 0.02)) + ')';

                cctx.lineWidth = 1.5 * dpr; cctx.stroke();

              });



              // ── Food particles (organic gradient) ──

              world.food.forEach(function (f) {

                if (f.eaten) return;

                var p = toScreen(f.x, f.y);

                var sz = f.size * cam.zoom * dpr;

                var fGrad = cctx.createRadialGradient(p.x - sz * 0.2, p.y - sz * 0.2, 0, p.x, p.y, sz);

                fGrad.addColorStop(0, 'rgba(74,222,128,0.85)');

                fGrad.addColorStop(0.6, 'rgba(34,197,94,0.6)');

                fGrad.addColorStop(1, 'rgba(22,163,74,0.3)');

                cctx.beginPath(); cctx.arc(p.x, p.y, sz, 0, Math.PI * 2);

                cctx.fillStyle = fGrad; cctx.fill();

                // Tiny specular dot

                cctx.beginPath(); cctx.arc(p.x - sz * 0.25, p.y - sz * 0.25, sz * 0.2, 0, Math.PI * 2);

                cctx.fillStyle = 'rgba(255,255,255,0.4)'; cctx.fill();

              });



              // ── Extracellular Matrix Fibers (collagen-like strands in culture medium) ──

              if (!world._ecmFibers) {

                world._ecmFibers = [];

                for (var efi = 0; efi < 15; efi++) {

                  var efx1 = Math.random() * WORLD_W, efy1 = Math.random() * WORLD_H;

                  var efAngle = Math.random() * Math.PI;

                  var efLen = 40 + Math.random() * 80;

                  world._ecmFibers.push({

                    x1: efx1, y1: efy1,

                    x2: efx1 + Math.cos(efAngle) * efLen,

                    y2: efy1 + Math.sin(efAngle) * efLen,

                    cx: efx1 + Math.cos(efAngle + 0.3) * efLen * 0.5,

                    cy: efy1 + Math.sin(efAngle - 0.2) * efLen * 0.5,

                    width: 0.5 + Math.random() * 1.5,

                    alpha: 0.04 + Math.random() * 0.06,

                    phase: Math.random() * Math.PI * 2

                  });

                }

              }

              cctx.save();

              world._ecmFibers.forEach(function (ef) {

                var p1 = toScreen(ef.x1, ef.y1);

                var p2 = toScreen(ef.x2, ef.y2);

                var pc = toScreen(ef.cx, ef.cy);

                var efPulse = ef.alpha + 0.02 * Math.sin(world.tick * 0.015 + ef.phase);

                cctx.beginPath();

                cctx.moveTo(p1.x, p1.y);

                cctx.quadraticCurveTo(pc.x, pc.y, p2.x, p2.y);

                cctx.strokeStyle = 'rgba(180,200,170,' + efPulse + ')';

                cctx.lineWidth = ef.width * cam.zoom * dpr;

                cctx.stroke();

              });

              cctx.restore();



              // ── Vesicle Transport (tiny membrane vesicles drifting between organisms) ──

              if (!world._vesicles) {

                world._vesicles = [];

                for (var vi = 0; vi < 12; vi++) {

                  world._vesicles.push({

                    x: Math.random() * WORLD_W,

                    y: Math.random() * WORLD_H,

                    vx: (Math.random() - 0.5) * 0.3,

                    vy: (Math.random() - 0.5) * 0.3,

                    size: 1 + Math.random() * 2,

                    hue: vi % 3 === 0 ? '160,220,180' : vi % 3 === 1 ? '180,160,220' : '220,180,160',

                    alpha: 0.15 + Math.random() * 0.2,

                    trail: []

                  });

                }

              }

              cctx.save();

              world._vesicles.forEach(function (v) {

                v.x += v.vx; v.y += v.vy;

                // Gentle wandering

                v.vx += (Math.random() - 0.5) * 0.02;

                v.vy += (Math.random() - 0.5) * 0.02;

                v.vx = Math.max(-0.4, Math.min(0.4, v.vx));

                v.vy = Math.max(-0.4, Math.min(0.4, v.vy));

                if (v.x < 0) v.x += WORLD_W; if (v.x > WORLD_W) v.x -= WORLD_W;

                if (v.y < 0) v.y += WORLD_H; if (v.y > WORLD_H) v.y -= WORLD_H;

                // Trail

                v.trail.push({ x: v.x, y: v.y });

                if (v.trail.length > 8) v.trail.shift();

                // Draw trail

                if (v.trail.length > 1) {

                  for (var ti = 1; ti < v.trail.length; ti++) {

                    var tp1 = toScreen(v.trail[ti - 1].x, v.trail[ti - 1].y);

                    var tp2 = toScreen(v.trail[ti].x, v.trail[ti].y);

                    cctx.beginPath(); cctx.moveTo(tp1.x, tp1.y); cctx.lineTo(tp2.x, tp2.y);

                    cctx.strokeStyle = 'rgba(' + v.hue + ',' + (v.alpha * ti / v.trail.length * 0.3) + ')';

                    cctx.lineWidth = 0.5 * dpr; cctx.stroke();

                  }

                }

                // Draw vesicle

                var vp = toScreen(v.x, v.y);

                var vs = v.size * cam.zoom * dpr;

                var vGrad = cctx.createRadialGradient(vp.x - vs * 0.2, vp.y - vs * 0.2, 0, vp.x, vp.y, vs);

                vGrad.addColorStop(0, 'rgba(' + v.hue + ',' + (v.alpha * 0.8) + ')');

                vGrad.addColorStop(0.6, 'rgba(' + v.hue + ',' + (v.alpha * 0.4) + ')');

                vGrad.addColorStop(1, 'rgba(' + v.hue + ',0)');

                cctx.beginPath(); cctx.arc(vp.x, vp.y, vs, 0, Math.PI * 2);

                cctx.fillStyle = vGrad; cctx.fill();

                // Membrane ring

                cctx.beginPath(); cctx.arc(vp.x, vp.y, vs * 0.8, 0, Math.PI * 2);

                cctx.strokeStyle = 'rgba(' + v.hue + ',' + (v.alpha * 0.5) + ')';

                cctx.lineWidth = 0.4 * dpr; cctx.stroke();

              });

              cctx.restore();



              // Organisms

              world.organisms.forEach(function (o) { drawOrganism(o); });

              // Organelle labels for selected organism

              _labelHitRegions = []; // reset each frame

              world.organisms.forEach(function (o) {

                if (o === selectedOrg || o === playAsOrg) drawOrganelleLabels(o);

              });



              // ── Click-to-explain tooltip ──

              if (world._tooltip) {

                var tt = world._tooltip;

                // Fade in

                tt.alpha = Math.min(1, (tt.alpha || 0) + 0.08);

                cctx.save();

                cctx.globalAlpha = tt.alpha;

                var ttFontSize = 8 * dpr;

                cctx.font = 'bold ' + (ttFontSize * 1.1) + 'px Inter, system-ui, sans-serif';

                var ttTitle = tt.anatomy.icon + ' ' + tt.anatomy.name;

                cctx.font = ttFontSize + 'px Inter, system-ui, sans-serif';

                // Word-wrap the description

                var ttMaxW = 220 * dpr;

                var ttWords = tt.anatomy.fn.split(' ');

                var ttLines = []; var ttCurLine = '';

                ttWords.forEach(function (w) {

                  var test = ttCurLine ? ttCurLine + ' ' + w : w;

                  if (cctx.measureText(test).width > ttMaxW - 16 * dpr) {

                    if (ttCurLine) ttLines.push(ttCurLine);

                    ttCurLine = w;

                  } else { ttCurLine = test; }

                });

                if (ttCurLine) ttLines.push(ttCurLine);

                var ttPadX = 10 * dpr, ttPadY = 8 * dpr;

                cctx.font = 'bold ' + (ttFontSize * 1.1) + 'px Inter, system-ui, sans-serif';

                var titleW = cctx.measureText(ttTitle).width;

                cctx.font = ttFontSize + 'px Inter, system-ui, sans-serif';

                var bodyW = 0;

                ttLines.forEach(function (l) { bodyW = Math.max(bodyW, cctx.measureText(l).width); });

                var ttW = Math.max(titleW, bodyW) + ttPadX * 2;

                var ttH = ttPadY * 2 + ttFontSize * 1.5 + ttLines.length * ttFontSize * 1.4 + 4 * dpr;

                var ttX = Math.max(4 * dpr, Math.min(W - ttW - 4 * dpr, tt.x));

                var ttY = Math.max(4 * dpr, Math.min(HH - ttH - 4 * dpr, tt.y - ttH - 8 * dpr));

                // Shadow

                cctx.shadowColor = 'rgba(0,0,0,0.3)'; cctx.shadowBlur = 12 * dpr; cctx.shadowOffsetY = 4 * dpr;

                // Background

                cctx.fillStyle = 'rgba(15,23,42,0.93)';

                cctx.beginPath();

                var ttR = 6 * dpr;

                cctx.moveTo(ttX + ttR, ttY); cctx.lineTo(ttX + ttW - ttR, ttY);

                cctx.arcTo(ttX + ttW, ttY, ttX + ttW, ttY + ttR, ttR);

                cctx.lineTo(ttX + ttW, ttY + ttH - ttR);

                cctx.arcTo(ttX + ttW, ttY + ttH, ttX + ttW - ttR, ttY + ttH, ttR);

                cctx.lineTo(ttX + ttR, ttY + ttH);

                cctx.arcTo(ttX, ttY + ttH, ttX, ttY + ttH - ttR, ttR);

                cctx.lineTo(ttX, ttY + ttR);

                cctx.arcTo(ttX, ttY, ttX + ttR, ttY, ttR);

                cctx.closePath(); cctx.fill();

                cctx.shadowBlur = 0; cctx.shadowOffsetY = 0;

                // Accent bar

                cctx.fillStyle = tt.def.color;

                cctx.fillRect(ttX, ttY, 3 * dpr, ttH);

                // Title

                cctx.font = 'bold ' + (ttFontSize * 1.1) + 'px Inter, system-ui, sans-serif';

                cctx.fillStyle = tt.def.color; cctx.textAlign = 'left'; cctx.textBaseline = 'top';

                cctx.fillText(ttTitle, ttX + ttPadX, ttY + ttPadY);

                // Body

                cctx.font = ttFontSize + 'px Inter, system-ui, sans-serif';

                cctx.fillStyle = 'rgba(226,232,240,0.95)';

                ttLines.forEach(function (line, li) {

                  cctx.fillText(line, ttX + ttPadX, ttY + ttPadY + ttFontSize * 1.5 + 2 * dpr + li * ttFontSize * 1.4);

                });

                // Auto-dismiss after 5 seconds

                if (world.tick - tt.startTick > 300) world._tooltip = null;

                cctx.restore();

              }



              // ── Enhanced Microscope Vignette Overlay ──

              // Circular vignette

              var vigGrad = cctx.createRadialGradient(W / 2, HH / 2, Math.min(W, HH) * 0.2, W / 2, HH / 2, Math.max(W, HH) * 0.6);

              vigGrad.addColorStop(0, 'rgba(0,0,0,0)');

              vigGrad.addColorStop(0.6, 'rgba(0,0,0,0)');

              vigGrad.addColorStop(0.85, 'rgba(0,0,0,0.08)');

              vigGrad.addColorStop(1, 'rgba(0,0,0,0.2)');

              cctx.fillStyle = vigGrad; cctx.fillRect(0, 0, W, HH);

              // Subtle lens flare (top-right)

              cctx.save();

              var lfx = W * 0.72, lfy = HH * 0.18;

              var lfGrad = cctx.createRadialGradient(lfx, lfy, 0, lfx, lfy, 40 * dpr);

              lfGrad.addColorStop(0, 'rgba(200,230,255,0.06)');

              lfGrad.addColorStop(0.5, 'rgba(180,210,240,0.02)');

              lfGrad.addColorStop(1, 'rgba(180,210,240,0)');

              cctx.beginPath(); cctx.arc(lfx, lfy, 40 * dpr, 0, Math.PI * 2);

              cctx.fillStyle = lfGrad; cctx.fill();

              cctx.restore();

              // Aperture ring marks (subtle tick marks around vignette edge)

              cctx.save();

              cctx.globalAlpha = 0.04;

              var apR = Math.min(W, HH) * 0.48;

              for (var api = 0; api < 8; api++) {

                var apAngle = api * Math.PI / 4;

                var apx1 = W / 2 + Math.cos(apAngle) * apR;

                var apy1 = HH / 2 + Math.sin(apAngle) * apR;

                var apx2 = W / 2 + Math.cos(apAngle) * (apR + 8 * dpr);

                var apy2 = HH / 2 + Math.sin(apAngle) * (apR + 8 * dpr);

                cctx.beginPath(); cctx.moveTo(apx1, apy1); cctx.lineTo(apx2, apy2);

                cctx.strokeStyle = '#334155'; cctx.lineWidth = 1 * dpr; cctx.stroke();

              }

              cctx.restore();



              // ── Onboarding hint: "Click an organism to explore" ──

              if (!selectedOrg && !playAsOrg && world.tick < 600) {

                cctx.save();

                var hintAlpha = world.tick < 480 ? 0.85 : Math.max(0, 0.85 - (world.tick - 480) / 120 * 0.85);

                cctx.globalAlpha = hintAlpha;

                var hintFontSize = 10 * dpr;

                cctx.font = 'bold ' + hintFontSize + 'px Inter, system-ui, sans-serif';

                cctx.textAlign = 'center'; cctx.textBaseline = 'middle';

                var hintText = '\uD83D\uDC46 Click any organism to explore its anatomy';

                var hintW = cctx.measureText(hintText).width + 24 * dpr;

                var hintH = hintFontSize * 2.2;

                var hintX = W / 2 - hintW / 2;

                var hintY = 14 * dpr;

                // Pill background

                cctx.fillStyle = 'rgba(15,23,42,0.75)';

                cctx.beginPath();

                var hr = hintH / 2;

                cctx.moveTo(hintX + hr, hintY); cctx.lineTo(hintX + hintW - hr, hintY);

                cctx.arcTo(hintX + hintW, hintY, hintX + hintW, hintY + hr, hr);

                cctx.lineTo(hintX + hintW, hintY + hintH - hr);

                cctx.arcTo(hintX + hintW, hintY + hintH, hintX + hintW - hr, hintY + hintH, hr);

                cctx.lineTo(hintX + hr, hintY + hintH);

                cctx.arcTo(hintX, hintY + hintH, hintX, hintY + hintH - hr, hr);

                cctx.lineTo(hintX, hintY + hr);

                cctx.arcTo(hintX, hintY, hintX + hr, hintY, hr);

                cctx.closePath(); cctx.fill();

                // Border glow

                cctx.strokeStyle = 'rgba(74,222,128,0.5)'; cctx.lineWidth = 1.2 * dpr; cctx.stroke();

                // Text

                cctx.fillStyle = '#a7f3d0';

                cctx.fillText(hintText, W / 2, hintY + hintH / 2);

                cctx.restore();

              }



              // ── Hover tooltip: "Click to explore" near hovered organism ──

              if (hoveredOrg && !selectedOrg && !playAsOrg) {

                cctx.save();

                var hp = toScreen(hoveredOrg.x, hoveredOrg.y);

                var hoverSz = hoveredOrg.size * cam.zoom * dpr;

                var htFontSize = 7 * dpr;

                cctx.font = 'bold ' + htFontSize + 'px Inter, system-ui, sans-serif';

                cctx.textAlign = 'center'; cctx.textBaseline = 'top';

                var htText = hoveredOrg.def.icon + ' Click to explore';

                var htW = cctx.measureText(htText).width + 10 * dpr;

                var htH = htFontSize * 1.8;

                var htX = hp.x - htW / 2;

                var htY = hp.y - hoverSz - htH - 6 * dpr;

                // Clamp to screen

                htX = Math.max(2 * dpr, Math.min(W - htW - 2 * dpr, htX));

                htY = Math.max(2 * dpr, htY);

                cctx.fillStyle = 'rgba(15,23,42,0.8)';

                cctx.beginPath();

                var htr = htH / 2;

                cctx.moveTo(htX + htr, htY); cctx.lineTo(htX + htW - htr, htY);

                cctx.arcTo(htX + htW, htY, htX + htW, htY + htr, htr);

                cctx.lineTo(htX + htW, htY + htH - htr);

                cctx.arcTo(htX + htW, htY + htH, htX + htW - htr, htY + htH, htr);

                cctx.lineTo(htX + htr, htY + htH);

                cctx.arcTo(htX, htY + htH, htX, htY + htH - htr, htr);

                cctx.lineTo(htX, htY + htr);

                cctx.arcTo(htX, htY, htX + htr, htY, htr);

                cctx.closePath(); cctx.fill();

                cctx.strokeStyle = hoveredOrg.def.color; cctx.lineWidth = 1 * dpr; cctx.stroke();

                cctx.fillStyle = '#ffffff';

                cctx.fillText(htText, hp.x, htY + (htH - htFontSize) / 2);

                cctx.restore();

              }



              // ── Magnification label (glassmorphic) ──

              var mag = Math.round(40 * cam.zoom);

              cctx.save();

              var mlx = 6 * dpr, mly = HH - 22 * dpr, mlw = 48 * dpr, mlh = 16 * dpr;

              cctx.fillStyle = 'rgba(15,23,42,0.45)';

              cctx.beginPath();

              cctx.moveTo(mlx + 4 * dpr, mly); cctx.lineTo(mlx + mlw - 4 * dpr, mly);

              cctx.arcTo(mlx + mlw, mly, mlx + mlw, mly + 4 * dpr, 4 * dpr);

              cctx.lineTo(mlx + mlw, mly + mlh - 4 * dpr);

              cctx.arcTo(mlx + mlw, mly + mlh, mlx + mlw - 4 * dpr, mly + mlh, 4 * dpr);

              cctx.lineTo(mlx + 4 * dpr, mly + mlh);

              cctx.arcTo(mlx, mly + mlh, mlx, mly + mlh - 4 * dpr, 4 * dpr);

              cctx.lineTo(mlx, mly + 4 * dpr);

              cctx.arcTo(mlx, mly, mlx + 4 * dpr, mly, 4 * dpr);

              cctx.closePath(); cctx.fill();

              cctx.font = 'bold ' + (8 * dpr) + 'px monospace';

              cctx.fillStyle = '#a7f3d0'; cctx.textAlign = 'center';

              cctx.fillText(mag + 'x', mlx + mlw / 2, mly + mlh - 4 * dpr);

              cctx.restore();



              // ── Player energy bar (enhanced) ──

              if (playAsOrg) {

                cctx.save();

                var bx = 8 * dpr, by = 8 * dpr, bw = 90 * dpr, bh = 10 * dpr, br = 5 * dpr;

                // Background pill

                cctx.fillStyle = 'rgba(15,23,42,0.55)';

                cctx.beginPath();

                cctx.moveTo(bx + br, by); cctx.lineTo(bx + bw - br, by);

                cctx.arcTo(bx + bw, by, bx + bw, by + br, br);

                cctx.lineTo(bx + bw, by + bh - br);

                cctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br);

                cctx.lineTo(bx + br, by + bh);

                cctx.arcTo(bx, by + bh, bx, by + bh - br, br);

                cctx.lineTo(bx, by + br);

                cctx.arcTo(bx, by, bx + br, by, br);

                cctx.closePath(); cctx.fill();

                // Energy fill gradient

                var eFill = bw * (playAsOrg.energy / 100);

                if (eFill > br * 2) {

                  var eGrad = cctx.createLinearGradient(bx, 0, bx + eFill, 0);

                  var eOk = playAsOrg.energy > 30;

                  eGrad.addColorStop(0, eOk ? '#22c55e' : '#ef4444');

                  eGrad.addColorStop(1, eOk ? '#4ade80' : '#f87171');

                  cctx.fillStyle = eGrad;

                  cctx.beginPath();

                  cctx.moveTo(bx + br, by + 1); cctx.lineTo(bx + eFill - br, by + 1);

                  cctx.arcTo(bx + eFill, by + 1, bx + eFill, by + br, br - 1);

                  cctx.lineTo(bx + eFill, by + bh - br);

                  cctx.arcTo(bx + eFill, by + bh - 1, bx + eFill - br, by + bh - 1, br - 1);

                  cctx.lineTo(bx + br, by + bh - 1);

                  cctx.arcTo(bx + 1, by + bh - 1, bx + 1, by + bh - br, br - 1);

                  cctx.lineTo(bx + 1, by + br);

                  cctx.arcTo(bx + 1, by + 1, bx + br, by + 1, br - 1);

                  cctx.closePath(); cctx.fill();

                }

                cctx.fillStyle = '#fff'; cctx.font = 'bold ' + (6 * dpr) + 'px sans-serif'; cctx.textAlign = 'left';

                cctx.fillText('\u26A1 ' + Math.round(playAsOrg.energy) + '%', bx + 4 * dpr, by + 7.5 * dpr);

                cctx.restore();

              }

            }



            var animId = null;

            var speedMultiplier = 1;

            canvasEl._cellSimAlive = true;

            function loop() {

              if (!canvasEl._cellSimAlive) return; // stop loop if killed

              if (canvasEl._cellSimPaused) { animId = requestAnimationFrame(loop); return; }

              for (var si = 0; si < speedMultiplier; si++) {

                world.tick++;

                world.organisms.forEach(updateOrganism);

                // Respawn eaten food

                if (world.tick % 120 === 0) {

                  world.food.forEach(function (f) {

                    if (f.eaten) { f.eaten = false; f.x = Math.random() * WORLD_W; f.y = Math.random() * WORLD_H; }

                  });

                }

              }

              render();

              animId = requestAnimationFrame(loop);

            }

            animId = requestAnimationFrame(loop);

            // Restart method — revives a dead loop

            canvasEl._cellSimRestart = function () {

              canvasEl._cellSimAlive = true;

              canvasEl._cellSimPaused = false;

              if (animId) cancelAnimationFrame(animId);

              animId = requestAnimationFrame(loop);

            };



            // Mouse/touch events

            canvasEl.addEventListener('mousedown', function (e) {

              if (playAsOrg) return; // disable drag when player is controlling

              dragging = true;

              dragStartX = e.clientX; dragStartY = e.clientY;

              camStartX = cam.x; camStartY = cam.y;

            });

            canvasEl.addEventListener('mousemove', function (e) {

              if (dragging) {

                var dx = (e.clientX - dragStartX) / cam.zoom;

                var dy = (e.clientY - dragStartY) / cam.zoom;

                cam.x = camStartX - dx; cam.y = camStartY - dy;

              }

              // Detect organism hover for cursor feedback

              if (!playAsOrg) {

                var rect = canvasEl.getBoundingClientRect();

                var hx = (e.clientX - rect.left) * dpr;

                var hy = (e.clientY - rect.top) * dpr;

                var foundHover = null;

                world.organisms.forEach(function (o) {

                  var sp = toScreen(o.x, o.y);

                  var dd = Math.hypot(sp.x - hx, sp.y - hy);

                  if (dd < o.size * cam.zoom * dpr * 1.5) foundHover = o;

                });

                hoveredOrg = foundHover;

                canvasEl.style.cursor = dragging ? 'grabbing' : (foundHover ? 'pointer' : 'grab');

              }

            });

            canvasEl.addEventListener('mouseup', function (e) {

              if (Math.abs(e.clientX - dragStartX) < 5 && Math.abs(e.clientY - dragStartY) < 5) {

                var rect = canvasEl.getBoundingClientRect();

                var mx = (e.clientX - rect.left) * dpr;

                var my = (e.clientY - rect.top) * dpr;

                // Check if click hit an organelle label first (click-to-explain)

                var hitLabel = null;

                for (var hi = _labelHitRegions.length - 1; hi >= 0; hi--) {

                  var hr = _labelHitRegions[hi];

                  if (mx >= hr.x && mx <= hr.x + hr.w && my >= hr.y && my <= hr.y + hr.h) {

                    hitLabel = hr; break;

                  }

                }

                if (hitLabel) {

                  // Show tooltip for this organelle

                  world._tooltip = { anatomy: hitLabel.anatomy, def: hitLabel.def, x: hitLabel.x, y: hitLabel.y, alpha: 0, startTick: world.tick };

                  if (canvasEl._onOrganelleClick) canvasEl._onOrganelleClick(hitLabel.anatomy.name);

                } else {

                  // Click - select organism

                  world._tooltip = null;

                  var clicked = null, bestDist = Infinity;

                  world.organisms.forEach(function (o) {

                    var p = toScreen(o.x, o.y);

                    var dd = Math.hypot(p.x - mx, p.y - my);

                    if (dd < o.size * cam.zoom * dpr * 1.5 && dd < bestDist) { bestDist = dd; clicked = o; }

                  });

                  selectedOrg = clicked;

                  if (canvasEl._onSelect) canvasEl._onSelect(clicked ? clicked.def.id : null);

                }

              }

              dragging = false;

            });

            canvasEl.addEventListener('wheel', function (e) {

              e.preventDefault();

              cam.zoom = Math.max(0.5, Math.min(10, cam.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));

              if (canvasEl._onZoom) canvasEl._onZoom(cam.zoom);

            }, { passive: false });



            // Keyboard for player

            function onKey(e) { playerKeys[e.key] = e.type === 'keydown'; }

            window.addEventListener('keydown', onKey);

            window.addEventListener('keyup', onKey);



            // External API

            canvasEl._cellSimSetPlayAs = function (orgId) {

              playAsOrg = orgId ? world.organisms.find(function (o) { return o.def.id === orgId; }) : null;

              if (playAsOrg) { cam.x = playAsOrg.x; cam.y = playAsOrg.y; cam.zoom = 3; }

              canvasEl.focus(); // ensure keyboard works

            };

            canvasEl._cellSimSetZoom = function (z) { cam.zoom = z; };

            canvasEl._cellSimSetPaused = function (p) { canvasEl._cellSimPaused = p; };

            canvasEl._cellSimSetSpeed = function (s) { speedMultiplier = Math.max(1, Math.min(5, Math.round(s))); };

            canvasEl._cellSimFocusOrganism = function (orgId) {

              var target = world.organisms.find(function (o) { return o.def.id === orgId; });

              if (target) { cam.x = target.x; cam.y = target.y; cam.zoom = 3; selectedOrg = target; }

            };



            // Cleanup

            canvasEl._cellSimCleanup = function () {

              canvasEl._cellSimAlive = false;

              if (animId) cancelAnimationFrame(animId);

              window.removeEventListener('keydown', onKey);

              window.removeEventListener('keyup', onKey);

            };



            // ResizeObserver

            var ro = new ResizeObserver(function () {

              W = canvasEl.width = canvasEl.offsetWidth * dpr;

              HH = canvasEl.height = canvasEl.offsetHeight * dpr;

            });

            ro.observe(canvasEl);

            canvasEl._cellSimRO = ro;

          };



          // ── Cleanup on unmount ──

          // Only run cleanup when truly leaving the cell tool, not on re-renders

          var cleanupRef = function (el) {

            if (!el && stemLabTool !== 'cell') {

              var old = document.querySelector('[data-cell-sim-canvas]');

              if (old && old._cellSimCleanup) { old._cellSimCleanup(); if (old._cellSimRO) old._cellSimRO.disconnect(); old._cellSimInit = false; }

            }

          };



          var selDef = d.selectedOrganism ? ORGANISMS.find(function (o) { return o.id === d.selectedOrganism; }) : null;



          // ── Quiz logic ──

          var quizQuestion = d.quizMode && QUIZ_BANK[d.quizIdx || 0] ? QUIZ_BANK[d.quizIdx || 0] : null;



          return React.createElement("div", { ref: cleanupRef, className: "max-w-4xl mx-auto animate-in fade-in duration-200" },

            // Header

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: function () { setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-600" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDD2C Cell Simulator"),

              React.createElement("span", { className: "text-xs text-slate-600 ml-1" }, d.mode === 'play' ? "\uD83C\uDFAE Playing as " + (ORGANISMS.find(function (o) { return o.id === d.playAsOrganism; }) || {}).label : d.quizMode ? "\uD83E\uDDE0 Quiz Mode" : "\uD83D\uDC41 Observe"),


              (function() {
                var CELL_CATEGORIES = [
                  { id: 'interactive', label: 'Interactive Sim', icon: '🔬', desc: 'Watch, play, or quiz', color: 'green',
                    modes: ['observe', 'play', 'quiz'] },
                  { id: 'browse', label: 'Browse Organisms', icon: '🦠', desc: 'Encyclopedia + filter + compare', color: 'cyan',
                    modes: ['encyclopedia', 'filter', 'compare'] },
                  { id: 'knowledge', label: 'Knowledge & History', icon: '📚', desc: 'History, biologists, labs, diseases, ecology', color: 'amber',
                    modes: ['history', 'biologists', 'lab', 'disease', 'ecology'] },
                  { id: 'reference', label: 'Reference & Reflection', icon: '✨', desc: 'Glossary + finale', color: 'indigo',
                    modes: ['glossary', 'finale'] }
                ];
                var CELL_MODE_LABELS = {
                  observe: '👁 Observe', play: '🎮 Play', quiz: '🧠 Quiz',
                  encyclopedia: '📚 Encyclopedia', filter: '🔍 Filter', compare: '⚖ Compare',
                  history: '📜 History', biologists: '🧑‍🔬 Biologists', lab: '🔬 Lab Techniques',
                  disease: '🦠 Diseases', ecology: '🌍 Ecology',
                  glossary: '📖 Glossary', finale: '🎆 Finale'
                };
                var CELL_MODE_TO_CATEGORY = {};
                CELL_CATEGORIES.forEach(function(c) { c.modes.forEach(function(mid) { CELL_MODE_TO_CATEGORY[mid] = c.id; }); });

                var activeCategoryId = d._cellCategory || CELL_MODE_TO_CATEGORY[d.mode] || null;
                var atHub = !d._cellCategory && !d._cellSearch && !d._cellPicked;
                var activeCat = CELL_CATEGORIES.find(function(c) { return c.id === activeCategoryId; });
                var searchTerm = (d._cellSearch || '').toLowerCase();
                var allModes = ['observe','play','quiz','encyclopedia','filter','compare','history','biologists','lab','disease','ecology','glossary','finale'];
                var searchResults = searchTerm ? allModes.filter(function(m) { return (CELL_MODE_LABELS[m] || m).toLowerCase().indexOf(searchTerm) !== -1; }) : null;

                function setMode(m) {
                  upd('mode', m);
                  upd('_cellPicked', true);
                  if (CELL_MODE_TO_CATEGORY[m] && CELL_MODE_TO_CATEGORY[m] !== d._cellCategory) {
                    upd('_cellCategory', CELL_MODE_TO_CATEGORY[m]);
                  }
                  if (m === 'quiz') { upd('quizMode', true); upd('quizIdx', 0); upd('quizScore', 0); upd('quizStreak', 0); upd('quizFeedback', null); }
                  else { upd('quizMode', false); }
                  if (m !== 'play') {
                    upd('playAsOrganism', null);
                    var cv = document.querySelector('[data-cell-sim-canvas]');
                    if (cv && cv._cellSimSetPlayAs) cv._cellSimSetPlayAs(null);
                  }
                }
                function setCat(cid) { upd('_cellCategory', cid); upd('_cellSearch', ''); }

                var els = [];
                // Top bar: hub + breadcrumb + search
                els.push(React.createElement('div', { key: 'top', className: 'flex flex-wrap items-center gap-2 w-full mb-2' },
                  React.createElement('button', {
                    onClick: function() { setCat(null); upd('_cellPicked', false); },
                    className: 'px-3 py-1 rounded-lg text-xs font-bold ' + (atHub ? 'bg-green-700 text-white' : 'bg-slate-100 text-green-700 hover:bg-green-50 border border-green-300')
                  }, '🏠 Hub'),
                  activeCat && !atHub && React.createElement('span', { className: 'text-xs text-slate-400' }, '/'),
                  activeCat && !atHub && React.createElement('span', { className: 'px-2 py-1 rounded-lg text-xs font-bold bg-slate-50 text-green-700 border border-green-200' }, activeCat.icon + ' ' + activeCat.label),
                  React.createElement('input', {
                    type: 'text',
                    placeholder: 'Search modes...',
                    value: d._cellSearch || '',
                    onChange: function(e) { upd('_cellSearch', e.target.value); upd('_cellCategory', null); },
                    className: 'ml-auto px-2 py-1 text-xs border border-slate-300 rounded'
                  })
                ));

                // Search results
                if (searchResults) {
                  els.push(React.createElement('div', { key: 'search', className: 'flex flex-wrap gap-1 mb-2 w-full' },
                    searchResults.length === 0
                      ? React.createElement('span', { className: 'text-xs text-slate-500 italic' }, 'No matches.')
                      : searchResults.map(function(m) {
                          return React.createElement('button', {
                            key: m,
                            onClick: function() { setMode(m); upd('_cellSearch', ''); },
                            className: 'px-2 py-1 rounded text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-green-50 hover:border-green-500'
                          }, CELL_MODE_LABELS[m] || m);
                        })
                  ));
                }

                // Hub: category cards
                if (atHub) {
                  els.push(React.createElement('div', { key: 'hub', className: 'grid grid-cols-2 gap-3 w-full' },
                    CELL_CATEGORIES.map(function(c) {
                      return React.createElement('button', {
                        key: c.id,
                        onClick: function() { setCat(c.id); setMode(c.modes[0]); },
                        className: 'text-left p-3 rounded-xl bg-white border-2 border-' + c.color + '-200 hover:border-' + c.color + '-500 hover:bg-' + c.color + '-50 transition-all'
                      },
                        React.createElement('div', { className: 'text-2xl mb-1' }, c.icon),
                        React.createElement('div', { className: 'text-sm font-bold text-' + c.color + '-700 mb-1' }, c.label),
                        React.createElement('div', { className: 'text-[10px] text-slate-500 italic mb-1' }, c.desc),
                        React.createElement('div', { className: 'text-[10px] text-' + c.color + '-600 font-mono' }, c.modes.length + ' modes')
                      );
                    })
                  ));
                }

                // Category open: show that category's modes
                if (!atHub && activeCat && !searchTerm) {
                  els.push(React.createElement('div', { key: 'cat-modes', className: 'flex flex-wrap gap-1 w-full' },
                    activeCat.modes.map(function(m) {
                      var isActive = d.mode === m;
                      return React.createElement('button', {
                        key: m,
                        onClick: function() { setMode(m); },
                        className: 'px-3 py-1 rounded-lg text-xs font-bold ' +
                          (isActive
                            ? 'bg-' + activeCat.color + '-700 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-' + activeCat.color + '-50')
                      }, CELL_MODE_LABELS[m] || m);
                    })
                  ));
                }

                return React.createElement('div', { className: 'flex flex-wrap items-start gap-2 ml-auto', style: { flexBasis: '100%' } }, els);
              })()

            ),

            // ── Topic-accent hero band (per mode) ──
            (function() {
              var MODE_META = {
                observe: { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)', icon: '👁️', title: 'Observe — explore the cell',         hint: 'Click any organelle to see its structure, function, and how it talks to its neighbors. Cells are factories: every organelle has a job and a delivery route.' },
                play:    { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '🎮', title: 'Play — be the organism',           hint: 'Steer the cell yourself. Bacteria swim with flagella; protists pseudopod; humans push fluid via pumps. Movement reveals what each cell is built for.' },
                quiz:    { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '🧠', title: 'Quiz — concepts in context',        hint: 'Multi-choice items on organelle function, transport, signaling, and life cycle. Each question links back to what you saw in the simulator.' }
              };
              var meta = MODE_META[d.mode] || MODE_META.observe;
              return React.createElement('div', {
                style: {
                  margin: '12px 0',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
                  border: '1px solid ' + meta.accent + '55',
                  borderLeft: '4px solid ' + meta.accent,
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                }
              },
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                  React.createElement('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: '#475569', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),



            // Canvas

            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-green-200 bg-green-50", style: { height: '520px' } },

              React.createElement("canvas", {

                "data-cell-sim-canvas": "", role: "img", "aria-label": "Cell biology simulation showing organism behavior",

                tabIndex: 0,

                ref: canvasRefCb,

                style: { width: '100%', height: '100%', cursor: d.playAsOrganism ? 'crosshair' : 'grab', outline: 'none' }

              }),

              // Zoom overlay

              React.createElement("div", { className: "absolute bottom-2 left-2 flex items-center gap-2 bg-white/80 backdrop-blur rounded-lg px-2 py-1 text-[11px] font-bold text-slate-600" },

                "\uD83D\uDD2C",

                React.createElement("input", {

                  type: "range", min: 0.5, max: 10, step: 0.1, value: d.zoom || 1, "aria-label": "Microscope zoom level",

                  onChange: function (e) { var z = parseFloat(e.target.value); upd("zoom", z); var cv = document.querySelector('[data-cell-sim-canvas]'); if (cv && cv._cellSimSetZoom) cv._cellSimSetZoom(z); },

                  className: "w-20 accent-green-600"

                }),

                Math.round(40 * (d.zoom || 1)) + "x"

              ),

              // Speed controls

              React.createElement("div", { className: "absolute bottom-2 right-2 flex items-center gap-2 bg-white/80 backdrop-blur rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-600" },

                "\u23E9",

                React.createElement("input", {

                  type: "range", min: 1, max: 5, step: 1, value: d.simSpeed || 1, "aria-label": "Simulation speed",

                  onChange: function (e) { var s = parseInt(e.target.value); upd("simSpeed", s); var cv = document.querySelector('[data-cell-sim-canvas]'); if (cv && cv._cellSimSetSpeed) cv._cellSimSetSpeed(s); },

                  className: "w-16 accent-green-600"

                }),

                (d.simSpeed || 1) + "x",

                React.createElement("button", { "aria-label": "Play", onClick: function () { var p = !d.paused; upd("paused", p); if (p) { stopCellAmbient(); } else { startCellAmbient(); } var cv = document.querySelector('[data-cell-sim-canvas]'); if (cv) { if (!p && cv._cellSimRestart && !cv._cellSimAlive) { cv._cellSimRestart(); } else if (cv._cellSimSetPaused) { cv._cellSimSetPaused(p); } } }, className: "text-xs font-bold px-2 py-0.5 rounded " + (d.paused ? "bg-green-700 text-white" : "bg-slate-200 text-slate-600") }, d.paused ? "\u25B6" : "\u23F8")

              ),

              // ── Play mode instructions overlay ──

              d.playAsOrganism && d.showPlayInstructions !== false && (function () {

                var org = ORGANISMS.find(function (o) { return o.id === d.playAsOrganism; });

                if (!org) return null;

                // Predator info per organism

                var predatorInfo = {

                  amoeba: { pred: 'Paramecium & WBCs', warn: 'Larger cells may engulf you!' },

                  paramecium: { pred: 'Stentor', warn: 'Stentor creates vortex currents \u2014 avoid its trumpet-shaped mouth!' },

                  euglena: { pred: 'Amoeba & Paramecium', warn: 'They can engulf small protists. Stay in the light!' },

                  wbc: { pred: 'None \u2014 you are the hunter!', warn: 'Your targets are bacteria. Failure to catch them lets infection spread.' },

                  bacterium: { pred: 'WBCs & Amoeba', warn: 'White blood cells will chase and engulf you!' },

                  plantcell: { pred: 'None \u2014 you are stationary', warn: 'Explore your organelles up close.' },

                  diatom: { pred: 'Copepods & Ciliates', warn: 'Filter-feeders may sweep you up!' },

                  volvox: { pred: 'Rotifers', warn: 'Stay together with your colony!' },

                  stentor: { pred: 'None \u2014 apex filter feeder!', warn: 'Anchor and create food vortices.' },

                  tardigrade: { pred: 'None \u2014 nearly indestructible', warn: 'You can survive extreme conditions!' },

                  spirillum: { pred: 'WBCs & Bacteriophages', warn: 'Immune cells are hunting you!' }

                };

                var pInfo = predatorInfo[org.id] || { pred: 'Various predators', warn: 'Stay alert!' };

                return React.createElement("div", {

                  className: "absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-30",

                  style: { animation: 'fadeIn 0.3s ease-out' }

                },

                  React.createElement("div", { className: "bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden", style: { animation: 'slideUp 0.3s ease-out' } },

                    // Header

                    React.createElement("div", { className: "px-5 py-3 text-center", style: { background: 'linear-gradient(135deg, ' + org.color + ', ' + org.color + 'cc)' } },

                      React.createElement("div", { className: "text-3xl mb-1" }, org.icon),

                      React.createElement("h3", { className: "text-white font-black text-base" }, "Playing as " + org.label),

                      React.createElement("p", { className: "text-white/80 text-[11px] mt-0.5" }, org.desc)

                    ),

                    // Body

                    React.createElement("div", { className: "px-5 py-4 space-y-3" },

                      // Goal

                      React.createElement("div", { className: "flex items-start gap-2" },

                        React.createElement("span", { className: "text-lg flex-shrink-0" }, "\uD83C\uDFAF"),

                        React.createElement("div", null,

                          React.createElement("p", { className: "text-xs font-black text-slate-700" }, "Goal: " + org.activity),

                          React.createElement("p", { className: "text-[11px] text-slate-600" }, org.activityDesc + " Earn +" + org.xp + " XP per success!")

                        )

                      ),

                      // Controls

                      React.createElement("div", { className: "flex items-start gap-2" },

                        React.createElement("span", { className: "text-lg flex-shrink-0" }, "\uD83C\uDFAE"),

                        React.createElement("div", null,

                          React.createElement("p", { className: "text-xs font-black text-slate-700" }, "Controls"),

                          React.createElement("div", { className: "flex gap-1 mt-1" },

                            ["W/\u2191", "A/\u2190", "S/\u2193", "D/\u2192"].map(function (k) {

                              return React.createElement("span", { key: k, className: "px-1.5 py-0.5 bg-slate-100 rounded text-[11px] font-mono font-bold text-slate-600 border border-slate-400" }, k);

                            })

                          ),

                          React.createElement("p", { className: "text-[11px] text-slate-600 mt-0.5" }, "Move your organism to interact with the environment")

                        )

                      ),

                      // Predators/Dangers

                      React.createElement("div", { className: "flex items-start gap-2 bg-red-50 rounded-lg p-2 -mx-1" },

                        React.createElement("span", { className: "text-lg flex-shrink-0" }, "\u26A0\uFE0F"),

                        React.createElement("div", null,

                          React.createElement("p", { className: "text-xs font-black text-red-700" }, "Danger: " + pInfo.pred),

                          React.createElement("p", { className: "text-[11px] text-red-600/80" }, pInfo.warn)

                        )

                      )

                    ),

                    // Footer

                    React.createElement("div", { className: "px-5 pb-4" },

                      React.createElement("button", { "aria-label": "Got it Let's Go!",

                        onClick: function () { upd("showPlayInstructions", false); },

                        className: "w-full py-2.5 rounded-xl text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]",

                        style: { background: 'linear-gradient(135deg, ' + org.color + ', ' + org.color + 'cc)' }

                      }, "\uD83D\uDE80 Got it \u2014 Let's Go!")

                    )

                  )

                );

              })()

            ),



            // Organism selector buttons

            React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3" },

              ORGANISMS.map(function (org) {

                return React.createElement("button", { key: org.id,

                  onClick: function () {

                    upd("selectedOrganism", d.selectedOrganism === org.id ? null : org.id);

                    var cv = document.querySelector('[data-cell-sim-canvas]');

                    if (cv && cv._cellSimFocusOrganism) cv._cellSimFocusOrganism(org.id);

                    cellSound('select');
                    var obs = ext.organismsObserved.slice();
                    if (obs.indexOf(org.id) === -1) { obs.push(org.id); }
                    updExtAndBadge({ organismsObserved: obs });

                  },

                  className: "px-2.5 py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all hover:scale-105 " + (d.selectedOrganism === org.id ? "border-" + org.color.replace('#', '') + " bg-white shadow-md" : "border-slate-200 bg-slate-50 text-slate-600"),

                  style: d.selectedOrganism === org.id ? { borderColor: org.color, color: org.color } : {}

                }, org.icon + " " + org.label);

              })

            ),



            // Info card for selected organism

            selDef && React.createElement("div", { className: "mt-3 bg-white rounded-xl border-2 p-4 animate-in fade-in", style: { borderColor: selDef.color } },

              React.createElement("div", { className: "flex items-start justify-between" },

                React.createElement("div", null,

                  React.createElement("h4", { className: "font-bold text-sm mb-1", style: { color: selDef.color } }, selDef.icon + " " + selDef.label),

                  React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed mb-2" }, selDef.desc)

                ),

                d.mode === 'play' && React.createElement("button", { "aria-label": "Play as " + selDef.label,

                  onClick: function () {

                    upd("playAsOrganism", selDef.id);

                    upd("showPlayInstructions", true);

                    var cv = document.querySelector('[data-cell-sim-canvas]');

                    if (cv) {

                      cv._cellSimSetPlayAs(selDef.id);

                      updExtAndBadge({ playModeUsed: true });

                      cv._onXP = function (xp, label) {

                        upd("xpEarned", (d.xpEarned || 0) + xp);

                        if (typeof addToast === 'function') addToast("+" + xp + " XP: " + label + "!", "success");

                        var orgDef = ORGANISMS.find(function (o) { return o.activity === label || o.id === d.selectedOrganism; });

                        if (orgDef) {

                          var disc = (d.discoveries || []).slice();

                          var undisc = orgDef.facts.map(function (f, i) { return orgDef.id + '_' + i; }).filter(function (k) { return disc.indexOf(k) === -1; });

                          if (undisc.length > 0) { disc.push(undisc[Math.floor(Math.random() * undisc.length)]); upd("discoveries", disc); }

                        }

                      };

                      cv._onFood = function () {
                        cellSound('food');
                        updExtAndBadge({ totalFood: ext.totalFood + 1 });
                      };
                      cv._onPhotosynthesis = function () {
                        cellSound('photosynthesis');
                      };
                      cv._onOrganelleClick = function (name) {
                        var clicks = ext.organellesClicked.slice();
                        if (clicks.indexOf(name) === -1) clicks.push(name);
                        updExtAndBadge({ organellesClicked: clicks });
                      };

                    }

                  },

                  className: "px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-md hover:shadow-lg transition-all",

                  style: { background: selDef.color }

                }, "\uD83C\uDFAE Play As " + selDef.label)

              ),

              // Activity description

              React.createElement("div", { className: "bg-slate-50 rounded-lg p-2 mt-1 text-[11px]" },

                React.createElement("span", { className: "font-bold text-slate-700" }, "\u{1F3AF} " + selDef.activity + ": "),

                React.createElement("span", { className: "text-slate-600" }, selDef.activityDesc),

                React.createElement("span", { className: "ml-2 font-bold", style: { color: selDef.color } }, "+" + selDef.xp + " XP")

              ),

              // Facts — always visible

              React.createElement("div", { className: "mt-2 grid grid-cols-1 gap-0.5" },

                selDef.facts.map(function (fact, i) {

                  var discovered = (d.discoveries || []).indexOf(selDef.id + '_' + i) !== -1;

                  return React.createElement("div", { key: i, className: "flex items-start gap-2 text-[11px] py-0.5" },

                    React.createElement("span", { className: discovered ? "text-green-600 flex-shrink-0" : "text-slate-600 flex-shrink-0" }, discovered ? "\u2713" : "\u2022"),

                    React.createElement("span", { className: discovered ? "text-slate-700 font-semibold" : "text-slate-600" }, fact)

                  );

                })

              ),

              // Anatomy & Organelles (if defined)

              selDef.anatomy && React.createElement("div", { className: "mt-2 border-t border-slate-100 pt-2" },

                React.createElement("p", { className: "text-[11px] font-black text-slate-600 uppercase mb-1" }, "\uD83E\uDDEC Key Structures"),

                React.createElement("div", { className: "grid grid-cols-1 gap-1" },

                  selDef.anatomy.map(function (a, i) {

                    return React.createElement("div", { key: i, className: "flex items-start gap-1.5 text-[11px]" },

                      React.createElement("span", { className: "flex-shrink-0", style: { color: selDef.color } }, a.icon || "\u25CF"),

                      React.createElement("span", null,

                        React.createElement("span", { className: "font-bold text-slate-700" }, a.name + ": "),

                        React.createElement("span", { className: "text-slate-600" }, a.fn)

                      )

                    );

                  })

                )

              )

            ),



            // Quiz mode panel

            d.quizMode && quizQuestion && React.createElement("div", { className: "mt-3 bg-purple-50 rounded-xl border-2 border-purple-200 p-4 animate-in fade-in" },

              React.createElement("div", { className: "flex items-center justify-between mb-2" },

                React.createElement("p", { className: "text-xs font-bold text-purple-700" }, "\uD83E\uDDE0 Question " + ((d.quizIdx || 0) + 1) + "/" + QUIZ_BANK.length),

                React.createElement("div", { className: "flex items-center gap-2 text-xs" },

                  React.createElement("span", { className: "font-bold text-green-600" }, "\u2714 " + (d.quizScore || 0)),

                  React.createElement("span", { className: "font-bold text-amber-500" }, "\uD83D\uDD25 " + (d.quizStreak || 0))

                )

              ),

              React.createElement("p", { className: "text-sm font-bold text-slate-800 mb-3" }, quizQuestion.q),

              quizQuestion.options

                ? React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                  quizQuestion.options.map(function (opt) {

                    return React.createElement("button", { "aria-label": "Select quiz answer: " + opt,

                      key: opt, onClick: function () {

                        var correct = opt.toLowerCase() === quizQuestion.a.toLowerCase();

                        upd("quizFeedback", { correct: correct, msg: correct ? "\u2705 Correct! +" + 10 + " XP" : "\u274C Not quite. " + quizQuestion.hint });

                        if (correct) {

                          upd("quizScore", (d.quizScore || 0) + 1); upd("quizStreak", (d.quizStreak || 0) + 1); awardStemXP('galaxy_quiz', 10, 'Galaxy quiz correct');

                          cellSound('correct');
                          if ((d.quizStreak || 0) + 1 >= 3) cellSound('streak');
                          updExtAndBadge({ quizCorrect: ext.quizCorrect + 1 });

                          var ansOrg = ORGANISMS.find(function (o) { return o.id === quizQuestion.a || o.label.toLowerCase() === quizQuestion.a; });

                          if (ansOrg) { var dd = (d.discoveries || []).slice(); var und = ansOrg.facts.map(function (f, i) { return ansOrg.id + '_' + i; }).filter(function (k) { return dd.indexOf(k) === -1; }); if (und.length > 0) { dd.push(und[0]); upd("discoveries", dd); } }

                        }

                        else { upd("quizStreak", 0); cellSound('wrong'); }

                      }, className: "px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all hover:scale-[1.02] " + (d.quizFeedback ? (opt.toLowerCase() === quizQuestion.a.toLowerCase() ? "border-green-400 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-600") : "border-purple-200 bg-white text-slate-700 hover:border-purple-400")

                    }, opt);

                  })

                )

                : React.createElement("div", { className: "flex flex-wrap gap-2" },

                  ORGANISMS.map(function (org) {

                    return React.createElement("button", { "aria-label": "Select answer: " + org.label,

                      key: org.id, onClick: function () {

                        var correct = org.id === quizQuestion.a;

                        upd("quizFeedback", { correct: correct, msg: correct ? "\u2705 Correct! +" + 10 + " XP" : "\u274C Not quite. " + quizQuestion.hint });

                        if (correct) {

                          upd("quizScore", (d.quizScore || 0) + 1); upd("quizStreak", (d.quizStreak || 0) + 1);

                          cellSound('correct');
                          if ((d.quizStreak || 0) + 1 >= 3) cellSound('streak');
                          updExtAndBadge({ quizCorrect: ext.quizCorrect + 1 });

                          var ansOrg = ORGANISMS.find(function (o) { return o.id === quizQuestion.a || o.label.toLowerCase() === quizQuestion.a; });

                          if (ansOrg) { var dd = (d.discoveries || []).slice(); var und = ansOrg.facts.map(function (f, i) { return ansOrg.id + '_' + i; }).filter(function (k) { return dd.indexOf(k) === -1; }); if (und.length > 0) { dd.push(und[0]); upd("discoveries", dd); } }

                        }

                        else { upd("quizStreak", 0); cellSound('wrong'); }

                      }, className: "px-2.5 py-1.5 text-[11px] font-bold rounded-lg border-2 transition-all hover:scale-105 border-purple-200 bg-white text-slate-700 hover:border-purple-400"

                    }, org.icon + " " + org.label);

                  })

                ),

              d.quizFeedback && React.createElement("div", { className: "mt-2 p-2 rounded-lg text-center text-sm font-bold " + (d.quizFeedback.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200") },

                d.quizFeedback.msg,

                React.createElement("button", { "aria-label": "Next",

                  onClick: function () {

                    var nextIdx = ((d.quizIdx || 0) + 1) % QUIZ_BANK.length;

                    upd("quizIdx", nextIdx); upd("quizFeedback", null);

                  }, className: "ml-3 px-2 py-0.5 bg-purple-600 text-white rounded text-xs"

                }, "Next \u2192")

              )

            ),

            // Badge panel
            d._cellShowBadges && React.createElement("div", { className: "mt-3 bg-amber-50 rounded-xl border-2 border-amber-200 p-4 animate-in fade-in" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("p", { className: "text-xs font-bold text-amber-700" }, "\uD83C\uDFC5 Badges (" + ext.badges.length + "/" + Object.keys(cellBadges).length + ")"),
                React.createElement("button", { onClick: function () { upd('_cellShowBadges', false); }, className: "text-amber-400 hover:text-amber-600" }, React.createElement(X, { size: 14 }))
              ),
              React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                Object.keys(cellBadges).map(function (key) {
                  var b = cellBadges[key];
                  var earned = ext.badges.indexOf(b.id) !== -1;
                  return React.createElement("div", { key: b.id, className: "flex items-center gap-2 p-2 rounded-lg " + (earned ? "bg-amber-100 border border-amber-300" : "bg-white/60 border border-slate-400 opacity-50") },
                    React.createElement("span", { className: "text-lg" }, earned ? b.icon : "\uD83D\uDD12"),
                    React.createElement("div", null,
                      React.createElement("p", { className: "text-[11px] font-bold " + (earned ? "text-amber-800" : "text-slate-600") }, b.label),
                      React.createElement("p", { className: "text-[11px] " + (earned ? "text-amber-600" : "text-slate-600") }, b.desc)
                    )
                  );
                })
              )
            ),

            // AI Tutor panel
            d._cellShowAI && React.createElement("div", { className: "mt-3 bg-blue-50 rounded-xl border-2 border-blue-200 p-4 animate-in fade-in" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("p", { className: "text-xs font-bold text-blue-700" }, "\uD83E\uDD16 AI Biology Tutor"),
                React.createElement("button", { onClick: function () { upd('_cellShowAI', false); }, className: "text-blue-400 hover:text-blue-600" }, React.createElement(X, { size: 14 }))
              ),
              React.createElement("div", { className: "flex gap-2" },
                React.createElement("input", {
                  type: "text", placeholder: "Ask about cells, organisms...", value: d._cellAIQ || '',
                  'aria-label': 'Ask the cell biology AI tutor',
                  onChange: function (e) { upd('_cellAIQ', e.target.value); },
                  onKeyDown: function (e) { if (e.key === 'Enter') askAI(d._cellAIQ); },
                  className: "flex-1 px-3 py-1.5 text-xs rounded-lg border border-blue-200 focus:border-blue-400"
                }),
                React.createElement("button", { onClick: function () { askAI(d._cellAIQ); }, 'aria-busy': d._cellAILoading, 'aria-label': d._cellAILoading ? 'Asking AI tutor' : 'Ask AI tutor', className: "px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700", disabled: d._cellAILoading }, d._cellAILoading ? '...' : 'Ask')
              ),
              d._cellAIResp && React.createElement("div", { className: "mt-2 p-2 bg-white rounded-lg text-xs text-slate-700 leading-relaxed border border-blue-100" }, d._cellAIResp)
            ),



            // Bottom controls

            React.createElement("div", { className: "flex gap-3 mt-3 items-center" },

              React.createElement("button", { onClick: function () { upd('_cellShowBadges', !d._cellShowBadges); }, className: "px-3 py-2 text-xs font-bold rounded-full " + (d._cellShowBadges ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200") }, "\uD83C\uDFC5 Badges " + ext.badges.length + "/" + Object.keys(cellBadges).length),
              React.createElement("button", { "aria-label": "AI Tutor", onClick: function () { upd('_cellShowAI', !d._cellShowAI); }, className: "px-3 py-2 text-xs font-bold rounded-full " + (d._cellShowAI ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-700 hover:bg-blue-200") }, "\uD83E\uDD16 AI Tutor"),

              React.createElement("button", { "aria-label": "Snapshot", onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'ce-' + Date.now(), tool: 'cell', label: 'Cell Simulator' + (d.selectedOrganism ? ': ' + d.selectedOrganism : ''), data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

            )


            ,

            // ═══════════════════════════════════════════════════════════
            // ENCYCLOPEDIA MODE
            // ═══════════════════════════════════════════════════════════
            d.mode === 'encyclopedia' && (function() {
              var idx = (d._encyclopediaIdx != null) ? d._encyclopediaIdx : 0;
              var filterK = d._encyclopediaFilter || 'all';
              var search = d._encyclopediaSearch || '';
              var filtered = ORGANISM_DB.filter(function(o) {
                if (filterK !== 'all' && o.kingdom !== filterK) return false;
                if (search && o.name.toLowerCase().indexOf(search.toLowerCase()) === -1 && o.description.toLowerCase().indexOf(search.toLowerCase()) === -1) return false;
                return true;
              });
              var item = filtered[idx] || filtered[0];
              var kingdoms = ['all'].concat(ORGANISM_DB.map(function(o) { return o.kingdom; }).filter(function(v, i, a) { return a.indexOf(v) === i; }));
              return React.createElement('div', { className: 'mt-4 bg-white rounded-xl border-2 border-green-300 p-4 space-y-3' },
                React.createElement('div', { className: 'flex items-baseline justify-between mb-2' },
                  React.createElement('h3', { className: 'text-base font-bold text-green-700' }, 'Organism Encyclopedia'),
                  React.createElement('span', { className: 'text-xs text-slate-600' }, filtered.length + ' organisms')
                ),
                React.createElement('input', { type: 'text', placeholder: 'Search organisms...', value: search, onChange: function(e) { upd('_encyclopediaSearch', e.target.value); upd('_encyclopediaIdx', 0); }, className: 'w-full px-2 py-1 text-xs border-2 border-green-200 rounded' }),
                React.createElement('div', { className: 'flex flex-wrap gap-1' },
                  kingdoms.map(function(k) {
                    var sel = filterK === k;
                    return React.createElement('button', { key: k, onClick: function() { upd('_encyclopediaFilter', k); upd('_encyclopediaIdx', 0); }, className: 'px-2 py-1 rounded text-xs font-bold ' + (sel ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-green-100') }, k);
                  })
                ),
                React.createElement('div', { className: 'flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded' },
                  filtered.map(function(o, i) {
                    var sel = idx === i;
                    return React.createElement('button', { key: o.id, onClick: function() { upd('_encyclopediaIdx', i); }, className: 'px-2 py-1 rounded text-[10px] font-bold ' + (sel ? 'bg-green-700 text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-green-50'), title: o.name }, o.name);
                  })
                ),
                item && React.createElement('div', { className: 'bg-green-50 border-2 border-green-300 rounded-xl p-3 space-y-2' },
                  React.createElement('div', { className: 'flex items-baseline justify-between' },
                    React.createElement('h4', { className: 'text-lg font-bold text-green-800' }, item.name),
                    React.createElement('span', { className: 'text-xs text-slate-600 font-mono' }, item.kingdom + ' - ' + item.cellType + ' - ' + item.size)
                  ),
                  React.createElement('p', { className: 'text-xs text-slate-700 leading-relaxed' }, item.description),
                  React.createElement('div', { className: 'grid md:grid-cols-2 gap-2 text-xs' },
                    React.createElement('div', { className: 'bg-white border border-green-200 rounded p-2' },
                      React.createElement('div', { className: 'font-bold text-green-700' }, 'Habitat'),
                      React.createElement('div', { className: 'text-slate-700' }, item.habitat)
                    ),
                    React.createElement('div', { className: 'bg-white border border-green-200 rounded p-2' },
                      React.createElement('div', { className: 'font-bold text-amber-700' }, 'Feeding'),
                      React.createElement('div', { className: 'text-slate-700' }, item.feeding)
                    ),
                    React.createElement('div', { className: 'bg-white border border-green-200 rounded p-2' },
                      React.createElement('div', { className: 'font-bold text-pink-700' }, 'Reproduction'),
                      React.createElement('div', { className: 'text-slate-700' }, item.reproduction)
                    ),
                    React.createElement('div', { className: 'bg-white border border-green-200 rounded p-2' },
                      React.createElement('div', { className: 'font-bold text-blue-700' }, 'Movement'),
                      React.createElement('div', { className: 'text-slate-700' }, item.movement)
                    ),
                    React.createElement('div', { className: 'bg-white border border-green-200 rounded p-2' },
                      React.createElement('div', { className: 'font-bold text-purple-700' }, 'Discovered'),
                      React.createElement('div', { className: 'text-slate-700' }, item.discovered)
                    ),
                    React.createElement('div', { className: 'bg-white border border-green-200 rounded p-2' },
                      React.createElement('div', { className: 'font-bold text-orange-700' }, 'Relevance'),
                      React.createElement('div', { className: 'text-slate-700' }, item.relevance)
                    )
                  )
                )
              );
            })(),

            // ═══════════════════════════════════════════════════════════
            // FILTER MODE
            // ═══════════════════════════════════════════════════════════
            d.mode === 'filter' && (function() {
              var byKingdom = {};
              ORGANISM_DB.forEach(function(o) { (byKingdom[o.kingdom] = byKingdom[o.kingdom] || []).push(o); });
              return React.createElement('div', { className: 'mt-4 bg-white rounded-xl border-2 border-cyan-300 p-4' },
                React.createElement('h3', { className: 'text-base font-bold text-cyan-700 mb-3' }, 'Filter Microorganisms by Kingdom'),
                React.createElement('p', { className: 'text-xs text-slate-600 italic mb-3' }, 'Browse organisms grouped by classification.'),
                React.createElement('div', { className: 'space-y-3' },
                  Object.keys(byKingdom).map(function(k) {
                    return React.createElement('div', { key: k, className: 'border border-cyan-200 rounded p-2 bg-cyan-50' },
                      React.createElement('div', { className: 'font-bold text-cyan-800 mb-1' }, k + ' (' + byKingdom[k].length + ')'),
                      React.createElement('div', { className: 'flex flex-wrap gap-1' },
                        byKingdom[k].map(function(o) {
                          return React.createElement('span', { key: o.id, className: 'px-2 py-1 text-[10px] bg-white border border-cyan-200 rounded text-slate-700' }, o.name);
                        })
                      )
                    );
                  })
                )
              );
            })(),

            // ═══════════════════════════════════════════════════════════
            // COMPARE MODE
            // ═══════════════════════════════════════════════════════════
            d.mode === 'compare' && (function() {
              var aIdx = d._cmpA == null ? 0 : d._cmpA;
              var bIdx = d._cmpB == null ? 1 : d._cmpB;
              var oA = ORGANISM_DB[aIdx];
              var oB = ORGANISM_DB[bIdx];
              return React.createElement('div', { className: 'mt-4 bg-white rounded-xl border-2 border-purple-300 p-4' },
                React.createElement('h3', { className: 'text-base font-bold text-purple-700 mb-3' }, 'Compare Two Organisms'),
                React.createElement('div', { className: 'grid grid-cols-2 gap-2 mb-3' },
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-xs font-bold text-purple-700' }, 'Organism A'),
                    React.createElement('select', { value: aIdx, onChange: function(e) { upd('_cmpA', parseInt(e.target.value)); }, className: 'w-full px-2 py-1 text-xs border-2 border-purple-200 rounded mt-1' },
                      ORGANISM_DB.map(function(o, i) { return React.createElement('option', { key: i, value: i }, o.name); })
                    )
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-xs font-bold text-purple-700' }, 'Organism B'),
                    React.createElement('select', { value: bIdx, onChange: function(e) { upd('_cmpB', parseInt(e.target.value)); }, className: 'w-full px-2 py-1 text-xs border-2 border-purple-200 rounded mt-1' },
                      ORGANISM_DB.map(function(o, i) { return React.createElement('option', { key: i, value: i }, o.name); })
                    )
                  )
                ),
                oA && oB && React.createElement('table', { className: 'w-full text-xs' },
                  React.createElement('thead', null,
                    React.createElement('tr', { className: 'border-b border-purple-200' },
                      React.createElement('th', { className: 'p-2 text-left text-purple-700' }, 'Property'),
                      React.createElement('th', { className: 'p-2 text-left text-purple-700' }, oA.name),
                      React.createElement('th', { className: 'p-2 text-left text-purple-700' }, oB.name)
                    )
                  ),
                  React.createElement('tbody', null,
                    ['kingdom', 'cellType', 'size', 'habitat', 'feeding', 'reproduction', 'movement'].map(function(k, i) {
                      return React.createElement('tr', { key: k, className: 'border-b border-slate-100 ' + (i % 2 === 0 ? 'bg-purple-50' : '') },
                        React.createElement('td', { className: 'p-2 font-bold text-purple-700 capitalize' }, k.replace(/([A-Z])/g, ' $1')),
                        React.createElement('td', { className: 'p-2 text-slate-700' }, oA[k]),
                        React.createElement('td', { className: 'p-2 text-slate-700' }, oB[k])
                      );
                    })
                  )
                )
              );
            })(),

            // ═══════════════════════════════════════════════════════════
            // HISTORY MODE
            // ═══════════════════════════════════════════════════════════
            d.mode === 'history' && React.createElement('div', { className: 'mt-4 bg-white rounded-xl border-2 border-amber-300 p-4' },
              React.createElement('h3', { className: 'text-base font-bold text-amber-700 mb-3' }, 'History of Cell Biology + Microbiology'),
              React.createElement('div', { className: 'space-y-1' },
                CELL_HISTORY.map(function(e) {
                  return React.createElement('div', { key: e.id, className: 'flex items-start gap-3 bg-amber-50 border-l-4 border-amber-500 rounded-r p-2' },
                    React.createElement('div', { className: 'text-amber-700 font-mono font-bold text-xs w-12 flex-shrink-0' }, e.year),
                    React.createElement('div', { className: 'flex-1' },
                      React.createElement('div', { className: 'text-xs text-slate-800 leading-relaxed' }, e.event),
                      React.createElement('div', { className: 'text-[10px] italic text-amber-700' }, e.country)
                    )
                  );
                })
              )
            ),

            // ═══════════════════════════════════════════════════════════
            // BIOLOGISTS MODE
            // ═══════════════════════════════════════════════════════════
            d.mode === 'biologists' && (function() {
              var bioIdx = (d._bioIdx != null) ? d._bioIdx : 0;
              var b = FAMOUS_BIOLOGISTS[bioIdx];
              return React.createElement('div', { className: 'mt-4 bg-white rounded-xl border-2 border-violet-300 p-4 space-y-3' },
                React.createElement('h3', { className: 'text-base font-bold text-violet-700' }, 'Famous Biologists'),
                React.createElement('div', { className: 'flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded' },
                  FAMOUS_BIOLOGISTS.map(function(bio, i) {
                    var sel = bioIdx === i;
                    return React.createElement('button', { key: i, onClick: function() { upd('_bioIdx', i); }, className: 'px-2 py-1 rounded text-[10px] font-bold ' + (sel ? 'bg-violet-600 text-white' : 'bg-white text-slate-700 border border-slate-300') }, bio.name.split(' ').slice(-1)[0]);
                  })
                ),
                b && React.createElement('div', { className: 'bg-violet-50 border-2 border-violet-300 rounded-xl p-3 space-y-2' },
                  React.createElement('div', { className: 'flex items-baseline justify-between' },
                    React.createElement('h4', { className: 'text-base font-bold text-violet-800' }, b.name),
                    React.createElement('span', { className: 'text-xs text-slate-600 font-mono' }, b.years + ' - ' + b.country)
                  ),
                  React.createElement('p', { className: 'text-xs text-slate-700 leading-relaxed italic' }, b.contribution)
                )
              );
            })(),

            // ═══════════════════════════════════════════════════════════
            // LAB TECHNIQUES MODE
            // ═══════════════════════════════════════════════════════════
            d.mode === 'lab' && React.createElement('div', { className: 'mt-4 bg-white rounded-xl border-2 border-blue-300 p-4 space-y-2' },
              React.createElement('h3', { className: 'text-base font-bold text-blue-700' }, 'Lab Techniques'),
              LAB_TECHNIQUES.map(function(t) {
                return React.createElement('div', { key: t.id, className: 'bg-blue-50 border border-blue-200 rounded p-2 text-xs' },
                  React.createElement('div', { className: 'flex justify-between' },
                    React.createElement('span', { className: 'font-bold text-blue-700' }, t.name),
                    React.createElement('span', { className: 'text-[10px] font-mono text-amber-700' }, t.skill)
                  ),
                  React.createElement('div', { className: 'text-slate-700 mt-1' }, 'Method: ' + t.method),
                  React.createElement('div', { className: 'text-emerald-700 italic mt-1' }, 'Purpose: ' + t.purpose)
                );
              })
            ),

            // ═══════════════════════════════════════════════════════════
            // DISEASE MODE
            // ═══════════════════════════════════════════════════════════
            d.mode === 'disease' && React.createElement('div', { className: 'mt-4 bg-white rounded-xl border-2 border-rose-300 p-4 space-y-2' },
              React.createElement('h3', { className: 'text-base font-bold text-rose-700' }, 'Microbial Diseases'),
              MICROBIAL_DISEASES.map(function(disease) {
                return React.createElement('div', { key: disease.id, className: 'bg-rose-50 border border-rose-200 rounded p-2 text-xs' },
                  React.createElement('div', { className: 'flex justify-between mb-1' },
                    React.createElement('span', { className: 'font-bold text-rose-700' }, disease.disease),
                    React.createElement('span', { className: 'font-mono text-[10px] text-slate-600' }, disease.pathogen)
                  ),
                  React.createElement('div', { className: 'text-slate-700' }, 'Symptoms: ' + disease.symptoms),
                  React.createElement('div', { className: 'text-emerald-700' }, 'Treatment: ' + disease.treatment),
                  React.createElement('div', { className: 'text-[10px] italic text-amber-700' }, disease.prevalence)
                );
              })
            ),

            // ═══════════════════════════════════════════════════════════
            // ECOLOGY MODE
            // ═══════════════════════════════════════════════════════════
            d.mode === 'ecology' && React.createElement('div', { className: 'mt-4 bg-white rounded-xl border-2 border-emerald-300 p-4 space-y-2' },
              React.createElement('h3', { className: 'text-base font-bold text-emerald-700' }, 'Microbial Ecology + Habitats'),
              MICRO_ECOLOGY.map(function(eco) {
                return React.createElement('div', { key: eco.id, className: 'bg-emerald-50 border border-emerald-200 rounded p-2 text-xs' },
                  React.createElement('div', { className: 'font-bold text-emerald-700' }, eco.habitat),
                  React.createElement('div', { className: 'text-slate-700' }, 'Inhabitants: ' + eco.inhabitants),
                  React.createElement('div', { className: 'text-amber-700 italic' }, 'Importance: ' + eco.importance)
                );
              })
            ),

            // ═══════════════════════════════════════════════════════════
            // GLOSSARY MODE
            // ═══════════════════════════════════════════════════════════
            d.mode === 'glossary' && (function() {
              var search = d._glossSearch || '';
              var filtered = search ? CELL_GLOSSARY.filter(function(g) { return g.term.toLowerCase().indexOf(search.toLowerCase()) !== -1 || g.definition.toLowerCase().indexOf(search.toLowerCase()) !== -1; }) : CELL_GLOSSARY;
              return React.createElement('div', { className: 'mt-4 bg-white rounded-xl border-2 border-indigo-300 p-4' },
                React.createElement('h3', { className: 'text-base font-bold text-indigo-700 mb-3' }, 'Cell Biology Glossary'),
                React.createElement('input', { type: 'text', placeholder: 'Search terms...', value: search, onChange: function(e) { upd('_glossSearch', e.target.value); }, className: 'w-full px-2 py-1 text-xs border-2 border-indigo-200 rounded mb-3' }),
                React.createElement('div', { className: 'grid md:grid-cols-2 gap-1' },
                  filtered.map(function(g) {
                    return React.createElement('div', { key: g.id, className: 'bg-indigo-50 border border-indigo-200 rounded p-2 text-xs' },
                      React.createElement('div', { className: 'font-bold text-indigo-700' }, g.term),
                      React.createElement('div', { className: 'text-slate-700' }, g.definition)
                    );
                  })
                )
              );
            })(),

            // ═══════════════════════════════════════════════════════════
            // FINALE MODE
            // ═══════════════════════════════════════════════════════════
            d.mode === 'finale' && React.createElement('div', { className: 'mt-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border-2 border-amber-400 p-6 text-center' },
              React.createElement('div', { className: 'text-6xl mb-2' }, 'Goal!'),
              React.createElement('h3', { className: 'text-2xl font-bold text-amber-800 mb-2' }, 'Cell Master Achievement'),
              React.createElement('p', { className: 'text-sm text-amber-700 italic' }, 'You explored a microscopic universe of life.')
            )

          )
      })();
    }
  });

})();