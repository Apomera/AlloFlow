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

              React.createElement("div", { className: "flex gap-1 ml-auto" },

                ["observe", "play", "quiz", "encyclopedia", "filter", "compare", "lifecycle", "history", "biologists", "lab", "disease", "ecology", "evolution", "anatomy", "career", "lesson", "media", "myths", "records", "data", "glossary", "trivia", "finale"].map(function (m) {

                  return React.createElement("button", { key: m, onClick: function () { upd("mode", m); if (m === 'quiz') { upd("quizMode", true); upd("quizIdx", 0); upd("quizScore", 0); upd("quizStreak", 0); upd("quizFeedback", null); } else { upd("quizMode", false); } if (m !== 'play') { upd("playAsOrganism", null); var cv = document.querySelector('[data-cell-sim-canvas]'); if (cv && cv._cellSimSetPlayAs) cv._cellSimSetPlayAs(null); } }, className: "px-3 py-1 rounded-lg text-xs font-bold capitalize " + (d.mode === m ? 'bg-green-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') }, m);

                })

              )

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