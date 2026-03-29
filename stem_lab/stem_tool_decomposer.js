// stem_tool_decomposer.js  —  Standalone Material Decomposer (ES5)
// Extracted from stem_tool_science.js monolith and enhanced with:
//   Canvas molecular visualization, sound effects, 12 badges,
//   AI tutor, TTS read-aloud, grade-band content, 15 materials
(function() {
  'use strict';

  /* ── StemLab plugin guard ───────────────────────────────── */
  if (!window.StemLab) {
    window.StemLab = {
      tools: {},
      registerTool: function(id, def) { window.StemLab.tools[id] = def; }
    };
  }
  if (!window.StemLab.registerTool) {
    window.StemLab.registerTool = function(id, def) {
      window.StemLab.tools[id] = def;
    };
  }

  /* ═══════════════════════════════════════════════════════════
     Sound Engine  (Web Audio API)
     ═══════════════════════════════════════════════════════════ */
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { /* silent */ }
    }
    return _audioCtx;
  }

  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx();
    if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.value = vol || 0.12;
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + dur);
    } catch (e) { /* silent */ }
  }

  var SOUNDS = {
    decompose: function() {
      playTone(880, 0.15, 'sawtooth', 0.1);
      setTimeout(function() { playTone(660, 0.15, 'sawtooth', 0.08); }, 100);
      setTimeout(function() { playTone(440, 0.2, 'triangle', 0.06); }, 200);
    },
    reassemble: function() {
      playTone(440, 0.15, 'triangle', 0.08);
      setTimeout(function() { playTone(660, 0.15, 'triangle', 0.1); }, 100);
      setTimeout(function() { playTone(880, 0.2, 'sine', 0.12); }, 200);
    },
    selectMaterial: function() { playTone(523, 0.08, 'sine', 0.08); },
    quizCorrect: function() {
      playTone(523, 0.1, 'sine', 0.1);
      setTimeout(function() { playTone(659, 0.1, 'sine', 0.1); }, 100);
      setTimeout(function() { playTone(784, 0.15, 'sine', 0.12); }, 200);
    },
    quizWrong: function() { playTone(200, 0.3, 'sawtooth', 0.08); },
    badge: function() {
      playTone(784, 0.1, 'sine', 0.1);
      setTimeout(function() { playTone(988, 0.1, 'sine', 0.12); }, 120);
      setTimeout(function() { playTone(1175, 0.2, 'sine', 0.14); }, 240);
      setTimeout(function() { playTone(1568, 0.3, 'sine', 0.1); }, 380);
    },
    snapshot: function() {
      playTone(1200, 0.06, 'square', 0.06);
      setTimeout(function() { playTone(1600, 0.08, 'sine', 0.08); }, 70);
    },
    elementClick: function() { playTone(698, 0.06, 'sine', 0.07); },
    compare: function() {
      playTone(440, 0.08, 'triangle', 0.08);
      setTimeout(function() { playTone(554, 0.08, 'triangle', 0.08); }, 80);
    },
    aiTutor: function() {
      playTone(392, 0.12, 'sine', 0.08);
      setTimeout(function() { playTone(523, 0.12, 'sine', 0.1); }, 120);
    },
    tts: function() { playTone(330, 0.06, 'sine', 0.06); }
  };

  /* ═══════════════════════════════════════════════════════════
     Grade-Band Helper
     ═══════════════════════════════════════════════════════════ */
  function getGradeBand(ctx) {
    var g = ctx.gradeLevel || 3;
    if (g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  }

  /* ═══════════════════════════════════════════════════════════
     Badge Definitions
     ═══════════════════════════════════════════════════════════ */
  var BADGES = [
    { id: 'firstDecompose', icon: '\uD83D\uDD2C', label: 'First Decomposition', desc: 'Decompose your first molecule', xp: 10,
      check: function(d) { return d._hasDecomposed; } },
    { id: 'fiveMaterials', icon: '\uD83E\uDDEA', label: 'Material Explorer', desc: 'Explore 5 different materials', xp: 15,
      check: function(d) { return (d.materialsExplored || []).length >= 5; } },
    { id: 'allMaterials', icon: '\uD83C\uDFC6', label: 'Material Master', desc: 'Explore all 15 materials', xp: 30,
      check: function(d) { return (d.materialsExplored || []).length >= 15; } },
    { id: 'quizWhiz', icon: '\uD83E\uDDE0', label: 'Quiz Whiz', desc: 'Answer 5 quiz questions correctly', xp: 20,
      check: function(d) { return (d.quizScore || 0) >= 5; } },
    { id: 'chemScholar', icon: '\uD83C\uDF93', label: 'Chemistry Scholar', desc: 'Answer 15 quiz questions correctly', xp: 40,
      check: function(d) { return (d.quizScore || 0) >= 15; } },
    { id: 'streak3', icon: '\uD83D\uDD25', label: 'On Fire', desc: 'Get a 3-question streak', xp: 15,
      check: function(d) { return (d.bestStreak || 0) >= 3; } },
    { id: 'streak7', icon: '\uD83D\uDC8E', label: 'Unstoppable', desc: 'Get a 7-question streak', xp: 35,
      check: function(d) { return (d.bestStreak || 0) >= 7; } },
    { id: 'comparePro', icon: '\u2696\uFE0F', label: 'Comparison Pro', desc: 'Compare 3 different molecule pairs', xp: 15,
      check: function(d) { return (d.comparisons || 0) >= 3; } },
    { id: 'atomCounter', icon: '\u269B\uFE0F', label: 'Atom Counter', desc: 'View 100+ total atoms across materials', xp: 20,
      check: function(d) { return (d.totalAtomsViewed || 0) >= 100; } },
    { id: 'bondExpert', icon: '\uD83D\uDD17', label: 'Bond Expert', desc: 'Explore all 3 bond types', xp: 15,
      check: function(d) { return (d.bondsSeen || []).length >= 3; } },
    { id: 'molArtist', icon: '\uD83C\uDFA8', label: 'Molecular Artist', desc: 'View 5 molecules in the visualizer', xp: 15,
      check: function(d) { return (d.canvasViews || 0) >= 5; } },
    { id: 'aiCurious', icon: '\uD83E\uDD16', label: 'Curious Mind', desc: 'Ask the AI tutor 3 questions', xp: 15,
      check: function(d) { return (d.aiQuestions || 0) >= 3; } }
  ];

  /* ═══════════════════════════════════════════════════════════
     Element Visual Constants (for canvas)
     ═══════════════════════════════════════════════════════════ */
  var ELEM_COLORS = {
    H: '#60a5fa', O: '#ef4444', C: '#374151', N: '#3b82f6',
    Na: '#a855f7', Cl: '#22c55e', Fe: '#fb923c', Ca: '#f59e0b', S: '#eab308'
  };


  /* ═══════════════════════════════════════════════════════════
     Register Tool
     ═══════════════════════════════════════════════════════════ */
  window.StemLab.registerTool('decomposer', {
    icon: '\uD83D\uDD2C',
    label: 'decomposer',
    desc: '',
    color: 'slate',
    category: 'science',
    render: function(ctx) {
      /* ── Aliases ── */
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

      /* ═══════════════════════════════════════════════════════
         Tool Body
         ═══════════════════════════════════════════════════════ */
      return (function() {

        /* ── State ── */
        var d = labToolData.decomposer || {};

        var upd = function(key, val) {
          setLabToolData(function(prev) {
            var next = Object.assign({}, prev);
            next.decomposer = Object.assign({}, prev.decomposer);
            next.decomposer[key] = val;
            return next;
          });
        };

        var updMulti = function(obj) {
          setLabToolData(function(prev) {
            var next = Object.assign({}, prev);
            next.decomposer = Object.assign({}, prev.decomposer, obj);
            return next;
          });
        };


        /* ═══════════════════════════════════════════════════
           Materials Database  (15 compounds)
           ═══════════════════════════════════════════════════ */
        var MATERIALS = [
          {
            name: 'Water', formula: 'H\u2082O', emoji: '\uD83D\uDCA7', color: '#60a5fa',
            desc: 'The most essential molecule for life. Two hydrogen atoms bonded to one oxygen.',
            elements: [
              { sym: 'H', name: 'Hydrogen', num: 1, count: 2, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' },
              { sym: 'O', name: 'Oxygen', num: 8, count: 1, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }
            ],
            bondType: 'Covalent', state: 'Liquid', molarMass: '18.015 g/mol',
            realUse: 'Covers 71% of Earth. Every living cell requires water.'
          },
          {
            name: 'Table Salt', formula: 'NaCl', emoji: '\uD83E\uDDC2', color: '#a855f7',
            desc: 'Sodium chloride \u2014 an ionic crystal essential for nerve function.',
            elements: [
              { sym: 'Na', name: 'Sodium', num: 11, count: 1, color: '#a855f7', group: 'Alkali Metal', mass: '22.990' },
              { sym: 'Cl', name: 'Chlorine', num: 17, count: 1, color: '#22c55e', group: 'Halogen', mass: '35.453' }
            ],
            bondType: 'Ionic', state: 'Solid', molarMass: '58.44 g/mol',
            realUse: 'Used in cooking, road de-icing, and IV fluids. Humans need about 5g daily.'
          },
          {
            name: 'Sugar (Sucrose)', formula: 'C\u2081\u2082H\u2082\u2082O\u2081\u2081', emoji: '\uD83C\uDF6C', color: '#f59e0b',
            desc: 'A disaccharide made of glucose + fructose. 45 atoms in one molecule!',
            elements: [
              { sym: 'C', name: 'Carbon', num: 6, count: 12, color: '#1e293b', group: 'Nonmetal', mass: '12.011' },
              { sym: 'H', name: 'Hydrogen', num: 1, count: 22, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' },
              { sym: 'O', name: 'Oxygen', num: 8, count: 11, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }
            ],
            bondType: 'Covalent', state: 'Solid', molarMass: '342.30 g/mol',
            realUse: 'Plants make sucrose via photosynthesis. Your body breaks it into glucose for energy.'
          },
          {
            name: 'Baking Soda', formula: 'NaHCO\u2083', emoji: '\uD83E\uDDC1', color: '#fb923c',
            desc: 'Sodium bicarbonate \u2014 releases CO\u2082 when heated, making baked goods rise.',
            elements: [
              { sym: 'Na', name: 'Sodium', num: 11, count: 1, color: '#a855f7', group: 'Alkali Metal', mass: '22.990' },
              { sym: 'H', name: 'Hydrogen', num: 1, count: 1, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' },
              { sym: 'C', name: 'Carbon', num: 6, count: 1, color: '#1e293b', group: 'Nonmetal', mass: '12.011' },
              { sym: 'O', name: 'Oxygen', num: 8, count: 3, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }
            ],
            bondType: 'Ionic + Covalent', state: 'Solid', molarMass: '84.01 g/mol',
            realUse: 'Used in baking, cleaning, antacids, and fire extinguishers.'
          },
          {
            name: 'Rust', formula: 'Fe\u2082O\u2083', emoji: '\uD83D\uDFE4', color: '#b45309',
            desc: 'Iron(III) oxide \u2014 what happens when iron reacts with oxygen and water.',
            elements: [
              { sym: 'Fe', name: 'Iron', num: 26, count: 2, color: '#fb923c', group: 'Transition Metal', mass: '55.845' },
              { sym: 'O', name: 'Oxygen', num: 8, count: 3, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }
            ],
            bondType: 'Ionic', state: 'Solid', molarMass: '159.69 g/mol',
            realUse: 'Costs about $7 billion/year in damage. Mars is red because of iron oxide on its surface!'
          },
          {
            name: 'Carbon Dioxide', formula: 'CO\u2082', emoji: '\uD83D\uDCA8', color: '#94a3b8',
            desc: 'A greenhouse gas we exhale. Plants absorb it during photosynthesis.',
            elements: [
              { sym: 'C', name: 'Carbon', num: 6, count: 1, color: '#1e293b', group: 'Nonmetal', mass: '12.011' },
              { sym: 'O', name: 'Oxygen', num: 8, count: 2, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }
            ],
            bondType: 'Covalent', state: 'Gas', molarMass: '44.01 g/mol',
            realUse: 'Makes soda fizzy. Dry ice is solid CO\u2082 at -78.5\u00B0C. Key greenhouse gas.'
          },
          {
            name: 'Ammonia', formula: 'NH\u2083', emoji: '\uD83E\uDDEA', color: '#3b82f6',
            desc: 'A pungent compound essential for making fertilizers that feed the world.',
            elements: [
              { sym: 'N', name: 'Nitrogen', num: 7, count: 1, color: '#3b82f6', group: 'Nonmetal', mass: '14.007' },
              { sym: 'H', name: 'Hydrogen', num: 1, count: 3, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' }
            ],
            bondType: 'Covalent', state: 'Gas', molarMass: '17.03 g/mol',
            realUse: 'Haber process makes 150M tons/year for fertilizer. Found in household cleaners.'
          },
          {
            name: 'Glucose', formula: 'C\u2086H\u2081\u2082O\u2086', emoji: '\uD83E\uDE78', color: '#ef4444',
            desc: 'The primary energy source for cells. Your blood carries about 5g at all times.',
            elements: [
              { sym: 'C', name: 'Carbon', num: 6, count: 6, color: '#1e293b', group: 'Nonmetal', mass: '12.011' },
              { sym: 'H', name: 'Hydrogen', num: 1, count: 12, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' },
              { sym: 'O', name: 'Oxygen', num: 8, count: 6, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }
            ],
            bondType: 'Covalent', state: 'Solid', molarMass: '180.16 g/mol',
            realUse: 'Produced by photosynthesis. Cellular respiration breaks it for ATP energy.'
          },
          {
            name: 'Calcium Carbonate', formula: 'CaCO\u2083', emoji: '\uD83D\uDC1A', color: '#fbbf24',
            desc: 'Found in chalk, limestone, marble, and seashells. One of the most common minerals.',
            elements: [
              { sym: 'Ca', name: 'Calcium', num: 20, count: 1, color: '#f59e0b', group: 'Alkaline Earth Metal', mass: '40.078' },
              { sym: 'C', name: 'Carbon', num: 6, count: 1, color: '#1e293b', group: 'Nonmetal', mass: '12.011' },
              { sym: 'O', name: 'Oxygen', num: 8, count: 3, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }
            ],
            bondType: 'Ionic + Covalent', state: 'Solid', molarMass: '100.09 g/mol',
            realUse: 'Used in cement, antacids (Tums), and toothpaste. Coral reefs are made of this.'
          },
          {
            name: 'Methane', formula: 'CH\u2084', emoji: '\uD83D\uDD25', color: '#22c55e',
            desc: 'The simplest hydrocarbon. Natural gas is mostly methane.',
            elements: [
              { sym: 'C', name: 'Carbon', num: 6, count: 1, color: '#1e293b', group: 'Nonmetal', mass: '12.011' },
              { sym: 'H', name: 'Hydrogen', num: 1, count: 4, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' }
            ],
            bondType: 'Covalent', state: 'Gas', molarMass: '16.04 g/mol',
            realUse: 'Burned for energy. Cow burps release about 100L/day. A potent greenhouse gas.'
          },
          {
            name: 'Ethanol', formula: 'C\u2082H\u2086O', emoji: '\uD83C\uDF77', color: '#8b5cf6',
            desc: 'The type of alcohol in drinks and hand sanitizer. Made by yeast fermentation.',
            elements: [
              { sym: 'C', name: 'Carbon', num: 6, count: 2, color: '#1e293b', group: 'Nonmetal', mass: '12.011' },
              { sym: 'H', name: 'Hydrogen', num: 1, count: 6, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' },
              { sym: 'O', name: 'Oxygen', num: 8, count: 1, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }
            ],
            bondType: 'Covalent', state: 'Liquid', molarMass: '46.07 g/mol',
            realUse: 'Found in alcoholic drinks, hand sanitizer, and fuel. Produced by sugar fermentation.'
          },
          {
            name: 'Acetic Acid', formula: 'C\u2082H\u2084O\u2082', emoji: '\uD83E\uDED9', color: '#84cc16',
            desc: 'The main component of vinegar. Gives vinegar its sour taste and sharp smell.',
            elements: [
              { sym: 'C', name: 'Carbon', num: 6, count: 2, color: '#1e293b', group: 'Nonmetal', mass: '12.011' },
              { sym: 'H', name: 'Hydrogen', num: 1, count: 4, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' },
              { sym: 'O', name: 'Oxygen', num: 8, count: 2, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }
            ],
            bondType: 'Covalent', state: 'Liquid', molarMass: '60.05 g/mol',
            realUse: 'Main component of vinegar. Used in food preservation, cleaning, and making plastics.'
          },
          {
            name: 'Hydrogen Peroxide', formula: 'H\u2082O\u2082', emoji: '\uD83D\uDC8A', color: '#06b6d4',
            desc: 'Water with an extra oxygen. A powerful oxidizer used as antiseptic and bleach.',
            elements: [
              { sym: 'H', name: 'Hydrogen', num: 1, count: 2, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' },
              { sym: 'O', name: 'Oxygen', num: 8, count: 2, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }
            ],
            bondType: 'Covalent', state: 'Liquid', molarMass: '34.01 g/mol',
            realUse: 'Used as antiseptic, bleach, and rocket propellant. Your body makes small amounts to fight bacteria.'
          },
          {
            name: 'Sulfuric Acid', formula: 'H\u2082SO\u2084', emoji: '\uD83D\uDD0B', color: '#eab308',
            desc: 'The most-produced industrial chemical on Earth. Extremely corrosive.',
            elements: [
              { sym: 'H', name: 'Hydrogen', num: 1, count: 2, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' },
              { sym: 'S', name: 'Sulfur', num: 16, count: 1, color: '#eab308', group: 'Nonmetal', mass: '32.06' },
              { sym: 'O', name: 'Oxygen', num: 8, count: 4, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }
            ],
            bondType: 'Covalent', state: 'Liquid', molarMass: '98.08 g/mol',
            realUse: 'Most produced chemical worldwide. Used in car batteries, fertilizers, and manufacturing.'
          },
          {
            name: 'Ozone', formula: 'O\u2083', emoji: '\u2601\uFE0F', color: '#a3e635',
            desc: 'Three oxygen atoms bonded together. Protects Earth from UV radiation.',
            elements: [
              { sym: 'O', name: 'Oxygen', num: 8, count: 3, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }
            ],
            bondType: 'Covalent', state: 'Gas', molarMass: '48.00 g/mol',
            realUse: 'Protects Earth from UV radiation. Used in water purification. Smells like a fresh thunderstorm.'
          }
        ];


        /* ── Derived state ── */
        var sel = MATERIALS.find(function(m) { return m.name === (d.selected || 'Water'); }) || MATERIALS[0];
        var totalAtoms = sel.elements.reduce(function(s, e) { return s + e.count; }, 0);
        var decomposed = d.decomposed || false;
        var tab = d.tab || 'explore';
        var quizMode = d.quizMode || false;
        var quizQ = d.quizQ || null;
        var quizScore = d.quizScore || 0;
        var quizStreak = d.quizStreak || 0;
        var bestStreak = d.bestStreak || 0;
        var badges = d.badges || [];
        var aiMessages = d.aiMessages || [];
        var aiInput = d.aiInput || '';
        var aiLoading = d.aiLoading || false;
        var band = getGradeBand(ctx);


        /* ═══════════════════════════════════════════════════
           Track material exploration  (for badges)
           ═══════════════════════════════════════════════════ */
        React.useEffect(function() {
          var explored = d.materialsExplored || [];
          if (explored.indexOf(sel.name) < 0) {
            var next = explored.concat([sel.name]);
            var atoms = (d.totalAtomsViewed || 0) + totalAtoms;
            var bonds = d.bondsSeen || [];
            if (bonds.indexOf(sel.bondType) < 0) bonds = bonds.concat([sel.bondType]);
            updMulti({
              materialsExplored: next,
              totalAtomsViewed: atoms,
              bondsSeen: bonds
            });
          }
        }, [sel.name]);


        /* ═══════════════════════════════════════════════════
           Badge Checker
           ═══════════════════════════════════════════════════ */
        function checkBadges(stateOverride) {
          var state = Object.assign({}, d, stateOverride || {});
          var earned = state.badges || [];
          var newBadges = [];
          BADGES.forEach(function(b) {
            if (earned.indexOf(b.id) < 0 && b.check(state)) {
              newBadges.push(b);
            }
          });
          if (newBadges.length > 0) {
            var ids = earned.slice();
            newBadges.forEach(function(b) {
              ids.push(b.id);
              addToast(b.icon + ' Badge: ' + b.label, 'success');
              if (awardStemXP) awardStemXP(b.xp);
            });
            SOUNDS.badge();
            if (stemCelebrate) stemCelebrate();
            upd('badges', ids);
          }
        }

        React.useEffect(function() {
          checkBadges();
        }, [
          d._hasDecomposed, (d.materialsExplored || []).length,
          d.quizScore, d.bestStreak, d.comparisons,
          d.totalAtomsViewed, (d.bondsSeen || []).length,
          d.canvasViews, d.aiQuestions
        ]);


        /* ═══════════════════════════════════════════════════
           Quiz Generator
           ═══════════════════════════════════════════════════ */
        function makeQuiz() {
          var types = ['formula', 'elements', 'count', 'bond'];
          var type = types[Math.floor(Math.random() * types.length)];
          var mat = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
          var q = {};
          var opts = [];

          if (type === 'formula') {
            q = { text: 'What is the chemical formula for ' + mat.name + '?', answer: mat.formula };
            opts = [mat.formula];
            while (opts.length < 4) {
              var r = MATERIALS[Math.floor(Math.random() * MATERIALS.length)].formula;
              if (opts.indexOf(r) < 0) opts.push(r);
            }
          } else if (type === 'elements') {
            var elNames = mat.elements.map(function(e) { return e.name; }).join(', ');
            q = { text: mat.formula + ' contains which elements?', answer: elNames };
            opts = [elNames];
            while (opts.length < 4) {
              var rm = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
              var rn = rm.elements.map(function(e) { return e.name; }).join(', ');
              if (opts.indexOf(rn) < 0) opts.push(rn);
            }
          } else if (type === 'count') {
            var tc = mat.elements.reduce(function(s, e) { return s + e.count; }, 0);
            q = { text: 'How many total atoms in one molecule of ' + mat.formula + '?', answer: String(tc) };
            opts = [String(tc)];
            while (opts.length < 4) {
              var rv = String(tc + Math.floor(Math.random() * 10) - 4);
              if (rv !== String(tc) && parseInt(rv, 10) > 0 && opts.indexOf(rv) < 0) opts.push(rv);
            }
          } else {
            q = { text: 'What type of bonding does ' + mat.name + ' have?', answer: mat.bondType };
            opts = [mat.bondType];
            var allBonds = ['Ionic', 'Covalent', 'Ionic + Covalent', 'Metallic'];
            allBonds.forEach(function(b) { if (opts.indexOf(b) < 0 && opts.length < 4) opts.push(b); });
          }

          q.opts = opts.sort(function() { return Math.random() - 0.5; });
          q.answered = false;
          return q;
        }


        /* ═══════════════════════════════════════════════════
           Grade-Band Intro
           ═══════════════════════════════════════════════════ */
        function gradeBandIntro() {
          var intros = {
            k2: 'Let\'s break apart things to see what\'s inside! Every material is made of tiny pieces called atoms.',
            g35: 'Materials are made of elements bonded together. Let\'s decompose compounds to see their building blocks!',
            g68: 'Explore molecular composition, chemical formulas, and bond types. Decompose compounds into their constituent elements.',
            g912: 'Analyze molecular structures, molar masses, and bonding characteristics. Compare compounds and master chemical nomenclature.'
          };
          return intros[band] || intros.g35;
        }


        /* ═══════════════════════════════════════════════════
           AI Tutor Handler
           ═══════════════════════════════════════════════════ */
        function handleAiQuestion(question) {
          if (!question || !callGemini) return;
          SOUNDS.aiTutor();
          var msgs = aiMessages.concat([{ role: 'user', text: question }]);
          updMulti({ aiMessages: msgs, aiInput: '', aiLoading: true });

          var prompt = 'You are a friendly chemistry tutor for a grade ' + (gradeLevel || 5) + ' student. '
            + 'They are exploring the Material Decomposer tool and currently looking at '
            + sel.name + ' (' + sel.formula + '). '
            + 'Answer their question briefly and clearly in 2-3 sentences. '
            + 'Question: ' + question;

          callGemini(prompt, true, false, 0.8).then(function(reply) {
            var updated = msgs.concat([{ role: 'ai', text: reply }]);
            updMulti({
              aiMessages: updated,
              aiLoading: false,
              aiQuestions: (d.aiQuestions || 0) + 1
            });
          }).catch(function() {
            var updated = msgs.concat([{ role: 'ai', text: 'Sorry, I could not get an answer right now. Try again!' }]);
            updMulti({ aiMessages: updated, aiLoading: false });
          });
        }


        /* ═══════════════════════════════════════════════════
           TTS Handler
           ═══════════════════════════════════════════════════ */
        function speakText(text) {
          SOUNDS.tts();
          if (callTTS) {
            callTTS(text);
          } else if (window.speechSynthesis) {
            var utter = new SpeechSynthesisUtterance(text);
            utter.rate = 0.9;
            window.speechSynthesis.speak(utter);
          }
        }


        /* ═══════════════════════════════════════════════════
           Canvas Molecular Visualization
           ═══════════════════════════════════════════════════ */
        var canvasRef = React.useRef(null);

        // Bridge React state to canvas via dataset
        React.useEffect(function() {
          var canvas = canvasRef.current;
          if (canvas) {
            canvas.dataset.formula = sel.formula;
            canvas.dataset.decomposed = decomposed ? 'true' : 'false';
            canvas.dataset.elementsJson = JSON.stringify(sel.elements);
            canvas.dataset.materialName = sel.name;
          }
        });

        // Canvas animation loop
        React.useEffect(function() {
          var canvas = canvasRef.current;
          if (!canvas || tab !== 'visualize') return function() {};

          var c = canvas.getContext('2d');
          var dpr = window.devicePixelRatio || 1;
          var w = canvas.offsetWidth || 500;
          var ht = 280;
          canvas.width = w * dpr;
          canvas.height = ht * dpr;
          canvas.style.height = ht + 'px';
          c.scale(dpr, dpr);

          // Animation state
          var curPositions = [];
          var curFormula = '';
          var frame = 0;
          var animId;

          function calcPositions(n, cx, cy, radius) {
            var pos = [];
            if (n === 1) {
              pos.push({ x: cx, y: cy });
            } else if (n === 2) {
              pos.push({ x: cx - radius, y: cy });
              pos.push({ x: cx + radius, y: cy });
            } else {
              for (var i = 0; i < n; i++) {
                var angle = (i / n) * Math.PI * 2 - Math.PI / 2;
                pos.push({
                  x: cx + Math.cos(angle) * radius,
                  y: cy + Math.sin(angle) * radius
                });
              }
            }
            return pos;
          }

          function rebuildPositions() {
            var els;
            try { els = JSON.parse(canvas.dataset.elementsJson || '[]'); } catch (e) { els = []; }
            var n = els.length;
            var cx = w / 2;
            var cy = ht / 2;
            var assembled = calcPositions(n, cx, cy, Math.min(w, ht) * 0.15);
            curPositions = [];
            for (var i = 0; i < n; i++) {
              curPositions.push({ x: assembled[i].x, y: assembled[i].y });
            }
            curFormula = canvas.dataset.formula;
          }

          rebuildPositions();

          function draw() {
            // Check for material change
            if (canvas.dataset.formula !== curFormula) {
              rebuildPositions();
            }

            var isDecomposed = canvas.dataset.decomposed === 'true';
            var els;
            try { els = JSON.parse(canvas.dataset.elementsJson || '[]'); } catch (e) { els = []; }
            var n = els.length;
            var cx = w / 2;
            var cy = ht / 2;
            var assembledR = Math.min(w, ht) * 0.15;
            var decomposedR = Math.min(w, ht) * 0.35;
            var targetR = isDecomposed ? decomposedR : assembledR;
            var targets = calcPositions(n, cx, cy, targetR);

            // Clear
            c.clearRect(0, 0, w, ht);

            // Background gradient
            var bgGrad = c.createLinearGradient(0, 0, 0, ht);
            bgGrad.addColorStop(0, '#f8fafc');
            bgGrad.addColorStop(1, '#f1f5f9');
            c.fillStyle = bgGrad;
            c.fillRect(0, 0, w, ht);

            // Subtle grid
            c.strokeStyle = '#e2e8f0';
            c.lineWidth = 0.5;
            var gridSpacing = 25;
            for (var gx = 0; gx < w; gx += gridSpacing) {
              c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, ht); c.stroke();
            }
            for (var gy = 0; gy < ht; gy += gridSpacing) {
              c.beginPath(); c.moveTo(0, gy); c.lineTo(w, gy); c.stroke();
            }

            // Lerp positions toward targets
            for (var i = 0; i < n; i++) {
              if (curPositions[i]) {
                curPositions[i].x += (targets[i].x - curPositions[i].x) * 0.05;
                curPositions[i].y += (targets[i].y - curPositions[i].y) * 0.05;
              }
            }

            // Draw bond lines (when assembled)
            if (!isDecomposed && n > 1) {
              c.strokeStyle = '#94a3b8';
              c.lineWidth = 3;
              c.setLineDash([]);
              for (var bi = 0; bi < n; bi++) {
                for (var bj = bi + 1; bj < n; bj++) {
                  if (curPositions[bi] && curPositions[bj]) {
                    c.beginPath();
                    c.moveTo(curPositions[bi].x, curPositions[bi].y);
                    c.lineTo(curPositions[bj].x, curPositions[bj].y);
                    c.stroke();
                  }
                }
              }
            }

            // Draw dashed lines when decomposed (ghost bonds)
            if (isDecomposed && n > 1) {
              c.strokeStyle = '#cbd5e1';
              c.lineWidth = 1;
              c.setLineDash([4, 4]);
              for (var di = 0; di < n; di++) {
                for (var dj = di + 1; dj < n; dj++) {
                  if (curPositions[di] && curPositions[dj]) {
                    c.beginPath();
                    c.moveTo(curPositions[di].x, curPositions[di].y);
                    c.lineTo(curPositions[dj].x, curPositions[dj].y);
                    c.stroke();
                  }
                }
              }
              c.setLineDash([]);
            }

            // Draw element circles
            for (var ei = 0; ei < n; ei++) {
              var el = els[ei];
              if (!curPositions[ei]) continue;
              var px = curPositions[ei].x;
              var py = curPositions[ei].y + Math.sin(frame * 0.025 + ei * 1.8) * 3;
              var atomR = 22 + Math.min(el.count, 15) * 1.5;

              // Shadow
              c.fillStyle = 'rgba(0,0,0,0.12)';
              c.beginPath();
              c.arc(px + 2, py + 2, atomR, 0, Math.PI * 2);
              c.fill();

              // Main circle with gradient
              var grad = c.createRadialGradient(px - atomR * 0.25, py - atomR * 0.25, atomR * 0.1, px, py, atomR);
              grad.addColorStop(0, lightenColor(el.color, 40));
              grad.addColorStop(1, el.color);
              c.fillStyle = grad;
              c.beginPath();
              c.arc(px, py, atomR, 0, Math.PI * 2);
              c.fill();

              // Border highlight
              c.strokeStyle = 'rgba(255,255,255,0.4)';
              c.lineWidth = 2;
              c.stroke();

              // Element symbol
              c.fillStyle = '#ffffff';
              c.font = 'bold ' + Math.round(atomR * 0.65) + 'px system-ui, sans-serif';
              c.textAlign = 'center';
              c.textBaseline = 'middle';
              c.fillText(el.sym, px, py);

              // Count badge
              if (el.count > 1) {
                var bx = px + atomR * 0.65;
                var by = py - atomR * 0.65;
                var badgeR = 11;
                c.fillStyle = '#f59e0b';
                c.beginPath();
                c.arc(bx, by, badgeR, 0, Math.PI * 2);
                c.fill();
                c.strokeStyle = '#ffffff';
                c.lineWidth = 1.5;
                c.stroke();
                c.fillStyle = '#ffffff';
                c.font = 'bold 10px system-ui, sans-serif';
                c.fillText('\u00D7' + el.count, bx, by);
              }

              // Element name below
              c.fillStyle = '#64748b';
              c.font = '10px system-ui, sans-serif';
              c.fillText(el.name, px, py + atomR + 13);
            }

            // Title
            c.fillStyle = '#1e293b';
            c.font = 'bold 14px system-ui, sans-serif';
            c.textAlign = 'center';
            c.fillText((canvas.dataset.materialName || '') + '  (' + (canvas.dataset.formula || '') + ')', w / 2, 20);

            // Status
            c.fillStyle = isDecomposed ? '#ef4444' : '#22c55e';
            c.font = 'bold 11px system-ui, sans-serif';
            c.fillText(isDecomposed ? '\u26A1 DECOMPOSED' : '\uD83E\uDDEC ASSEMBLED', w / 2, ht - 12);

            frame++;
            animId = requestAnimationFrame(draw);
          }

          draw();

          // Track canvas views for badge
          var views = parseInt(canvas.dataset.views || '0', 10) + 1;
          canvas.dataset.views = String(views);
          upd('canvasViews', views);

          return function() { cancelAnimationFrame(animId); };
        }, [tab, sel.formula]);

        // Lighten a hex color
        function lightenColor(hex, amt) {
          var num = parseInt(hex.replace('#', ''), 16);
          var r = Math.min(255, (num >> 16) + amt);
          var g = Math.min(255, ((num >> 8) & 0x00FF) + amt);
          var b = Math.min(255, (num & 0x0000FF) + amt);
          return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }


        /* ═══════════════════════════════════════════════════
           Tab Configuration
           ═══════════════════════════════════════════════════ */
        var TABS = [
          { id: 'explore', label: '\u2697\uFE0F Explore', color: 'amber' },
          { id: 'visualize', label: '\uD83C\uDFA8 Visualize', color: 'indigo' },
          { id: 'quiz', label: '\uD83E\uDDE0 Quiz', color: 'emerald' },
          { id: 'tutor', label: '\uD83E\uDD16 AI Tutor', color: 'purple' }
        ];


        /* ═══════════════════════════════════════════════════
           Main UI Render
           ═══════════════════════════════════════════════════ */
        return h('div', { className: 'max-w-3xl mx-auto animate-in fade-in duration-200' },

          /* ── Header ── */
          h('div', { className: 'flex items-center gap-3 mb-3' },
            h('button', {
              onClick: function() { setStemLabTool(null); },
              className: 'p-1.5 hover:bg-slate-100 rounded-lg',
              'aria-label': 'Back to tools'
            }, h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
            h('h3', { className: 'text-lg font-bold text-slate-800' }, '\u2697\uFE0F Material Decomposer'),
            h('span', { className: 'px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full' },
              totalAtoms + ' ATOMS'
            ),
            badges.length > 0 && h('span', { className: 'px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full' },
              '\uD83C\uDFC5 ' + badges.length + '/' + BADGES.length
            )
          ),

          /* ── Grade-band intro ── */
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3 mb-3' },
            h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, gradeBandIntro()),
            h('button', {
              onClick: function() { speakText(gradeBandIntro()); },
              className: 'mt-1 text-[10px] text-amber-600 hover:text-amber-800 font-bold'
            }, '\uD83D\uDD0A Read aloud')
          ),

          /* ── Tab bar ── */
          h('div', { className: 'flex gap-1 mb-4 bg-slate-100 rounded-xl p-1' },
            TABS.map(function(t) {
              var active = tab === t.id;
              return h('button', {
                key: t.id,
                onClick: function() { upd('tab', t.id); },
                className: 'flex-1 py-2 rounded-lg text-xs font-bold transition-all '
                  + (active
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50')
              }, t.label);
            })
          ),

          /* ── Material selector chips (always visible) ── */
          h('div', { className: 'flex flex-wrap gap-1.5 mb-4' },
            MATERIALS.map(function(m) {
              return h('button', {
                key: m.name,
                onClick: function() {
                  SOUNDS.selectMaterial();
                  updMulti({ selected: m.name, decomposed: false });
                },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all '
                  + (sel.name === m.name
                    ? 'text-white shadow-md scale-105'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-amber-300'),
                style: sel.name === m.name ? { background: m.color } : {}
              }, m.emoji + ' ' + m.name);
            })
          ),


          /* ═══════════════════════════════════════════════════
             EXPLORE TAB
             ═══════════════════════════════════════════════════ */
          tab === 'explore' && h('div', null,

            /* Material info card */
            h('div', { className: 'bg-gradient-to-br from-slate-50 to-amber-50 rounded-xl border-2 border-amber-200 p-4 mb-3' },

              h('div', { className: 'flex items-start gap-3 mb-3' },
                h('span', { className: 'text-4xl' }, sel.emoji),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'flex items-center gap-2' },
                    h('h4', { className: 'font-bold text-slate-800 text-lg' }, sel.name),
                    h('span', { className: 'px-2 py-0.5 bg-white rounded-full text-sm font-mono font-bold text-slate-700 border border-slate-200 shadow-sm' }, sel.formula)
                  ),
                  h('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' }, sel.desc),
                  h('div', { className: 'flex gap-3 mt-2 text-[10px] font-bold' },
                    h('span', { className: 'text-cyan-600' }, '\uD83D\uDD17 ' + sel.bondType),
                    h('span', { className: 'text-indigo-600' }, '\uD83D\uDCCA ' + sel.state),
                    h('span', { className: 'text-emerald-600' }, '\u2696 ' + sel.molarMass)
                  )
                )
              ),

              /* Decompose / reassemble button */
              h('button', {
                onClick: function() {
                  var next = !decomposed;
                  if (next) {
                    SOUNDS.decompose();
                    updMulti({ decomposed: true, _hasDecomposed: true });
                  } else {
                    SOUNDS.reassemble();
                    upd('decomposed', false);
                  }
                },
                className: 'w-full py-2.5 rounded-xl text-sm font-bold transition-all '
                  + (decomposed
                    ? 'bg-amber-600 text-white shadow-lg'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md')
              }, decomposed ? '\uD83D\uDD04 Reassemble' : '\u2697\uFE0F Decompose into Elements'),

              /* Animated decomposition visual */
              h('div', { className: 'mt-4 flex items-center justify-center gap-2 min-h-[80px] transition-all duration-500' },
                decomposed
                  ? sel.elements.map(function(el, i) {
                      return h('div', {
                        key: el.sym,
                        className: 'flex flex-col items-center animate-in zoom-in fade-in cursor-pointer',
                        style: { animationDelay: (i * 150) + 'ms', animationFillMode: 'both' },
                        onClick: function() {
                          SOUNDS.elementClick();
                          announceToSR(el.name + ', atomic number ' + el.num + ', ' + el.count + ' atoms');
                        }
                      },
                        h('div', {
                          className: 'w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg border-2 border-white/30',
                          style: { background: el.color }
                        }, el.sym),
                        h('span', { className: 'text-[10px] font-bold text-slate-600 mt-1' }, el.name),
                        h('span', { className: 'text-[10px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full mt-0.5' },
                          '\u00D7' + el.count
                        )
                      );
                    })
                  : h('div', { className: 'flex flex-col items-center' },
                      h('div', {
                        className: 'w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-lg border-2 border-amber-200',
                        style: { background: 'linear-gradient(135deg, ' + sel.color + '22, ' + sel.color + '44)' }
                      }, sel.emoji),
                      h('span', { className: 'mt-2 font-mono font-bold text-slate-700' }, sel.formula)
                    )
              )
            ),

            /* Element detail cards (when decomposed) */
            decomposed && h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3' },
              sel.elements.map(function(el) {
                return h('div', {
                  key: el.sym,
                  className: 'bg-white rounded-xl border border-slate-200 p-3 hover:border-amber-300 transition-all hover:shadow-sm'
                },
                  h('div', { className: 'flex items-center gap-2 mb-1.5' },
                    h('div', {
                      className: 'w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-sm',
                      style: { background: el.color }
                    },
                      h('div', { className: 'text-center leading-tight' },
                        h('div', { className: 'text-[8px] opacity-70' }, el.num),
                        h('div', { className: 'text-base font-black' }, el.sym)
                      )
                    ),
                    h('div', null,
                      h('p', { className: 'font-bold text-sm text-slate-800' }, el.name),
                      h('p', { className: 'text-[10px] text-slate-400' }, el.group + ' \u00B7 ' + el.mass + ' u')
                    ),
                    h('span', { className: 'ml-auto px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold' },
                      '\u00D7' + el.count + ' in ' + sel.formula
                    )
                  ),
                  /* Atom count bar */
                  h('div', { className: 'h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1' },
                    h('div', {
                      className: 'h-full rounded-full transition-all duration-700',
                      style: { width: Math.round(el.count / totalAtoms * 100) + '%', background: el.color }
                    })
                  ),
                  h('p', { className: 'text-[10px] text-slate-400 mt-1' },
                    Math.round(el.count / totalAtoms * 100) + '% of atoms in this molecule'
                  )
                );
              })
            ),

            /* Compare molecules mode */
            (function() {
              var cmpMode = d.compareMode || false;
              var cmpMat = MATERIALS.find(function(m) { return m.name === (d.compareTo || ''); }) || MATERIALS[1];

              if (!cmpMode) {
                return h('div', { className: 'mb-3' },
                  h('button', {
                    onClick: function() {
                      SOUNDS.compare();
                      updMulti({ compareMode: true, compareTo: MATERIALS[1].name });
                    },
                    className: 'w-full py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-all'
                  }, '\u2696 Compare Molecules')
                );
              }

              return h('div', { className: 'bg-indigo-50 rounded-xl border-2 border-indigo-200 p-4 mb-3' },
                h('div', { className: 'flex items-center gap-2 mb-3' },
                  h('span', { className: 'text-sm font-bold text-indigo-800' }, '\u2696 Compare: ' + sel.name + ' vs'),
                  h('select', {
                    value: d.compareTo || cmpMat.name,
                    onChange: function(e) {
                      upd('compareTo', e.target.value);
                      upd('comparisons', (d.comparisons || 0) + 1);
                    },
                    className: 'px-2 py-1 rounded-lg text-xs font-bold border border-indigo-300 bg-white text-indigo-700'
                  },
                    MATERIALS.filter(function(m) { return m.name !== sel.name; }).map(function(m) {
                      return h('option', { key: m.name, value: m.name }, m.emoji + ' ' + m.name);
                    })
                  ),
                  h('button', {
                    onClick: function() { upd('compareMode', false); },
                    className: 'ml-auto text-xs text-indigo-400 hover:text-indigo-600'
                  }, '\u2715 Close')
                ),
                h('div', { className: 'grid grid-cols-2 gap-3' },
                  [sel, cmpMat].map(function(mat) {
                    var tc = mat.elements.reduce(function(s, e) { return s + e.count; }, 0);
                    return h('div', { key: mat.name, className: 'bg-white rounded-xl p-3 border border-indigo-100' },
                      h('div', { className: 'text-center mb-2' },
                        h('span', { className: 'text-2xl' }, mat.emoji),
                        h('div', { className: 'text-sm font-bold text-slate-800' }, mat.name),
                        h('div', { className: 'text-xs font-mono text-slate-500' }, mat.formula)
                      ),
                      h('div', { className: 'space-y-1' },
                        mat.elements.map(function(el) {
                          return h('div', { key: el.sym, className: 'flex items-center gap-1.5' },
                            h('div', {
                              className: 'w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold',
                              style: { background: el.color }
                            }, el.sym),
                            h('div', { className: 'flex-1 h-2 bg-slate-100 rounded-full overflow-hidden' },
                              h('div', {
                                className: 'h-full rounded-full',
                                style: { width: Math.round(el.count / tc * 100) + '%', background: el.color }
                              })
                            ),
                            h('span', { className: 'text-[10px] font-bold text-slate-500 w-5 text-right' },
                              '\u00D7' + el.count
                            )
                          );
                        })
                      ),
                      h('div', { className: 'mt-2 grid grid-cols-3 gap-1 text-center text-[9px]' },
                        h('div', { className: 'bg-slate-50 rounded p-1' },
                          h('div', { className: 'font-bold text-slate-400' }, 'Atoms'),
                          h('div', { className: 'font-black text-slate-700' }, tc)
                        ),
                        h('div', { className: 'bg-slate-50 rounded p-1' },
                          h('div', { className: 'font-bold text-slate-400' }, 'Bond'),
                          h('div', { className: 'font-black text-slate-700' }, mat.bondType)
                        ),
                        h('div', { className: 'bg-slate-50 rounded p-1' },
                          h('div', { className: 'font-bold text-slate-400' }, 'State'),
                          h('div', { className: 'font-black text-slate-700' }, mat.state)
                        )
                      )
                    );
                  })
                )
              );
            })(),

            /* Real-world fact */
            h('div', { className: 'bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 p-3 mb-3' },
              h('div', { className: 'flex items-center justify-between' },
                h('p', { className: 'text-[10px] font-bold text-cyan-600 uppercase tracking-wider mb-1' }, '\uD83C\uDF0D Real World'),
                h('button', {
                  onClick: function() { speakText(sel.realUse); },
                  className: 'text-[10px] text-cyan-500 hover:text-cyan-700 font-bold'
                }, '\uD83D\uDD0A')
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, sel.realUse)
            ),

            /* Molar mass calculator */
            h('div', { className: 'bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-3 mb-3' },
              h('p', { className: 'text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2' }, '\u2696 Mass Breakdown'),
              h('div', { className: 'space-y-1' },
                sel.elements.map(function(el) {
                  var contribution = (el.count * parseFloat(el.mass)).toFixed(3);
                  var percent = ((el.count * parseFloat(el.mass)) / parseFloat(sel.molarMass) * 100).toFixed(1);
                  return h('div', { key: el.sym, className: 'flex items-center gap-2 text-xs' },
                    h('span', { className: 'font-bold text-slate-700 w-16' }, el.count + ' \u00D7 ' + el.sym),
                    h('span', { className: 'text-slate-500 w-20' }, el.count + ' \u00D7 ' + el.mass),
                    h('span', { className: 'font-bold text-slate-700 w-16' }, '= ' + contribution),
                    h('div', { className: 'flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden' },
                      h('div', {
                        className: 'h-full rounded-full',
                        style: { width: percent + '%', background: el.color }
                      })
                    ),
                    h('span', { className: 'text-slate-400 font-bold w-12 text-right' }, percent + '%')
                  );
                })
              ),
              h('div', { className: 'mt-2 pt-2 border-t border-emerald-200 flex items-center justify-between' },
                h('span', { className: 'text-xs font-bold text-emerald-700' }, 'Total Molar Mass:'),
                h('span', { className: 'text-sm font-black text-emerald-800' }, sel.molarMass)
              )
            )
          ),


          /* ═══════════════════════════════════════════════════
             VISUALIZE TAB
             ═══════════════════════════════════════════════════ */
          tab === 'visualize' && h('div', null,

            /* Canvas */
            h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 overflow-hidden mb-3' },
              h('canvas', {
                ref: canvasRef,
                className: 'w-full cursor-pointer',
                style: { height: '280px', display: 'block' },
                'aria-label': 'Molecular visualization of ' + sel.name
              })
            ),

            /* Canvas controls */
            h('div', { className: 'flex items-center gap-3 mb-3' },
              h('button', {
                onClick: function() {
                  var next = !decomposed;
                  if (next) { SOUNDS.decompose(); updMulti({ decomposed: true, _hasDecomposed: true }); }
                  else { SOUNDS.reassemble(); upd('decomposed', false); }
                },
                className: 'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all '
                  + (decomposed
                    ? 'bg-red-500 text-white shadow-lg hover:bg-red-600'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md')
              }, decomposed ? '\uD83D\uDD04 Reassemble' : '\u26A1 Decompose'),
              h('button', {
                onClick: function() { speakText(sel.name + ' has the formula ' + sel.formula + '. ' + sel.desc); },
                className: 'px-4 py-2.5 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100'
              }, '\uD83D\uDD0A Describe')
            ),

            /* Canvas legend */
            h('div', { className: 'bg-indigo-50 rounded-xl border border-indigo-200 p-3 mb-3' },
              h('p', { className: 'text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2' }, 'Element Legend'),
              h('div', { className: 'flex flex-wrap gap-3' },
                sel.elements.map(function(el) {
                  return h('div', { key: el.sym, className: 'flex items-center gap-1.5' },
                    h('div', {
                      className: 'w-5 h-5 rounded-full',
                      style: { background: el.color }
                    }),
                    h('span', { className: 'text-xs font-bold text-slate-700' },
                      el.sym + ' \u2014 ' + el.name
                    ),
                    el.count > 1 && h('span', { className: 'text-[10px] text-amber-600 font-bold' },
                      '(\u00D7' + el.count + ')'
                    )
                  );
                })
              ),
              h('div', { className: 'mt-2 pt-2 border-t border-indigo-200 text-[10px] text-slate-500' },
                'Circle size represents relative atom count. '
                + (decomposed
                  ? 'Dashed lines show where bonds were.'
                  : 'Solid lines show bonds between elements.')
              )
            ),

            /* Molecule stats card */
            h('div', { className: 'grid grid-cols-4 gap-2 mb-3' },
              h('div', { className: 'bg-white rounded-xl border border-slate-200 p-2 text-center' },
                h('div', { className: 'text-lg font-black text-slate-800' }, totalAtoms),
                h('div', { className: 'text-[9px] font-bold text-slate-400' }, 'Total Atoms')
              ),
              h('div', { className: 'bg-white rounded-xl border border-slate-200 p-2 text-center' },
                h('div', { className: 'text-lg font-black text-slate-800' }, sel.elements.length),
                h('div', { className: 'text-[9px] font-bold text-slate-400' }, 'Elements')
              ),
              h('div', { className: 'bg-white rounded-xl border border-slate-200 p-2 text-center' },
                h('div', { className: 'text-lg font-black text-slate-800' }, sel.bondType.split(' ')[0]),
                h('div', { className: 'text-[9px] font-bold text-slate-400' }, 'Bond Type')
              ),
              h('div', { className: 'bg-white rounded-xl border border-slate-200 p-2 text-center' },
                h('div', { className: 'text-lg font-black text-slate-800' }, sel.state),
                h('div', { className: 'text-[9px] font-bold text-slate-400' }, 'State')
              )
            )
          ),


          /* ═══════════════════════════════════════════════════
             QUIZ TAB
             ═══════════════════════════════════════════════════ */
          tab === 'quiz' && h('div', null,

            /* Quiz header / stats */
            h('div', { className: 'flex items-center gap-3 mb-3' },
              h('div', { className: 'flex-1' },
                h('h4', { className: 'font-bold text-slate-800' }, '\uD83E\uDDE0 Chemistry Quiz'),
                h('p', { className: 'text-xs text-slate-500' }, 'Test your knowledge of chemical formulas, elements, and bonds')
              ),
              quizScore > 0 && h('div', { className: 'text-right' },
                h('div', { className: 'text-sm font-bold text-emerald-600' }, '\u2B50 ' + quizScore + ' correct'),
                h('div', { className: 'text-xs text-slate-500' },
                  '\uD83D\uDD25 Streak: ' + quizStreak + ' | Best: ' + bestStreak
                )
              )
            ),

            /* Start quiz / next question button */
            (!quizMode || !quizQ) && h('div', { className: 'text-center py-8' },
              h('div', { className: 'text-5xl mb-3' }, '\uD83E\uDDEA'),
              h('p', { className: 'text-sm text-slate-600 mb-4' }, 'Ready to test your chemistry knowledge?'),
              h('button', {
                onClick: function() {
                  updMulti({ quizMode: true, quizQ: makeQuiz() });
                },
                className: 'px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm rounded-xl hover:from-emerald-600 hover:to-teal-600 shadow-md'
              }, '\uD83D\uDE80 Start Quiz')
            ),

            /* Active quiz question */
            quizMode && quizQ && h('div', { className: 'bg-indigo-50 rounded-xl p-5 border-2 border-indigo-200 mb-3' },

              /* Question text */
              h('p', { className: 'text-sm font-bold text-indigo-800 mb-4' }, quizQ.text),

              /* Answer grid */
              h('div', { className: 'grid grid-cols-2 gap-2 mb-4' },
                quizQ.opts.map(function(opt) {
                  var isCorrect = opt === quizQ.answer;
                  var wasChosen = quizQ.chosen === opt;
                  var cls = !quizQ.answered
                    ? 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50'
                    : isCorrect
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : wasChosen && !isCorrect
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-slate-50 text-slate-400 border-slate-200';

                  return h('button', {
                    key: opt,
                    disabled: quizQ.answered,
                    onClick: function() {
                      var correct = opt === quizQ.answer;
                      var newStreak = correct ? quizStreak + 1 : 0;
                      var newBest = Math.max(bestStreak, newStreak);
                      if (correct) {
                        SOUNDS.quizCorrect();
                        addToast('Correct!', 'success');
                        if (awardStemXP) awardStemXP(5);
                      } else {
                        SOUNDS.quizWrong();
                        addToast('The answer is: ' + quizQ.answer, 'error');
                      }
                      updMulti({
                        quizQ: Object.assign({}, quizQ, { answered: true, chosen: opt }),
                        quizScore: quizScore + (correct ? 1 : 0),
                        quizStreak: newStreak,
                        bestStreak: newBest
                      });
                    },
                    className: 'px-3 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ' + cls
                  }, opt);
                })
              ),

              /* Next question button (after answer) */
              quizQ.answered && h('button', {
                onClick: function() { upd('quizQ', makeQuiz()); },
                className: 'w-full py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-all'
              }, '\u27A1 Next Question')
            ),

            /* Quiz stats panel */
            quizScore > 0 && h('div', { className: 'grid grid-cols-3 gap-2 mb-3' },
              h('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-3 text-center' },
                h('div', { className: 'text-2xl font-black text-emerald-700' }, quizScore),
                h('div', { className: 'text-[10px] font-bold text-emerald-500' }, 'Correct')
              ),
              h('div', { className: 'bg-orange-50 rounded-xl border border-orange-200 p-3 text-center' },
                h('div', { className: 'text-2xl font-black text-orange-700' }, quizStreak),
                h('div', { className: 'text-[10px] font-bold text-orange-500' }, 'Current Streak')
              ),
              h('div', { className: 'bg-purple-50 rounded-xl border border-purple-200 p-3 text-center' },
                h('div', { className: 'text-2xl font-black text-purple-700' }, bestStreak),
                h('div', { className: 'text-[10px] font-bold text-purple-500' }, 'Best Streak')
              )
            ),

            /* Reset quiz */
            quizScore > 0 && h('button', {
              onClick: function() {
                updMulti({ quizScore: 0, quizStreak: 0, quizQ: null, quizMode: false });
              },
              className: 'text-xs text-slate-400 hover:text-slate-600 font-bold'
            }, '\uD83D\uDD04 Reset Quiz')
          ),


          /* ═══════════════════════════════════════════════════
             AI TUTOR TAB
             ═══════════════════════════════════════════════════ */
          tab === 'tutor' && h('div', null,

            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('h4', { className: 'font-bold text-slate-800' }, '\uD83E\uDD16 Chemistry AI Tutor'),
              h('span', { className: 'text-xs text-slate-500' }, 'Ask me anything about ' + sel.name + '!')
            ),

            /* Chat messages */
            h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-3 mb-3 max-h-[300px] overflow-y-auto space-y-2' },
              aiMessages.length === 0 && h('div', { className: 'text-center py-6' },
                h('div', { className: 'text-4xl mb-2' }, '\uD83E\uDDEC'),
                h('p', { className: 'text-xs text-slate-500' }, 'Ask a question about chemistry or the current molecule!')
              ),
              aiMessages.map(function(msg, i) {
                var isUser = msg.role === 'user';
                return h('div', {
                  key: i,
                  className: 'flex ' + (isUser ? 'justify-end' : 'justify-start')
                },
                  h('div', {
                    className: 'max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed '
                      + (isUser
                        ? 'bg-purple-600 text-white rounded-br-sm'
                        : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm')
                  },
                    msg.text,
                    !isUser && h('button', {
                      onClick: function() { speakText(msg.text); },
                      className: 'ml-2 text-[10px] text-purple-400 hover:text-purple-600'
                    }, '\uD83D\uDD0A')
                  )
                );
              }),
              aiLoading && h('div', { className: 'flex justify-start' },
                h('div', { className: 'bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-400 animate-pulse' },
                  'Thinking...'
                )
              )
            ),

            /* Input */
            h('div', { className: 'flex gap-2 mb-3' },
              h('input', {
                type: 'text',
                value: aiInput,
                onChange: function(e) { upd('aiInput', e.target.value); },
                onKeyDown: function(e) {
                  if (e.key === 'Enter' && aiInput.trim()) {
                    handleAiQuestion(aiInput.trim());
                  }
                },
                placeholder: 'Ask about ' + sel.name + '...',
                className: 'flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200'
              }),
              h('button', {
                onClick: function() {
                  if (aiInput.trim()) handleAiQuestion(aiInput.trim());
                },
                disabled: !aiInput.trim() || aiLoading,
                className: 'px-4 py-2 bg-purple-600 text-white font-bold text-sm rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50'
              }, '\u2191')
            ),

            /* Suggested questions */
            h('div', { className: 'flex flex-wrap gap-1.5' },
              [
                'Why is ' + sel.name + ' important?',
                'What kind of bond is in ' + sel.formula + '?',
                'Where is ' + sel.name + ' found in nature?',
                band === 'g68' || band === 'g912' ? 'Explain the electron configuration' : 'Is ' + sel.name + ' safe to touch?'
              ].map(function(q, i) {
                return h('button', {
                  key: i,
                  onClick: function() { handleAiQuestion(q); },
                  className: 'px-2.5 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-lg border border-purple-200 hover:bg-purple-100 transition-all'
                }, q);
              })
            )
          ),


          /* ═══════════════════════════════════════════════════
             Badges Section (always visible)
             ═══════════════════════════════════════════════════ */
          h('div', { className: 'border-t border-slate-200 pt-3 mt-4 mb-3' },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('span', { className: 'text-sm font-bold text-slate-700' }, '\uD83C\uDFC5 Badges'),
              h('span', { className: 'text-xs text-slate-400' },
                badges.length + ' / ' + BADGES.length + ' earned'
              )
            ),
            h('div', { className: 'grid grid-cols-3 sm:grid-cols-4 gap-1.5' },
              BADGES.map(function(b) {
                var earned = badges.indexOf(b.id) >= 0;
                return h('div', {
                  key: b.id,
                  className: 'rounded-xl border p-2 text-center transition-all '
                    + (earned
                      ? 'bg-amber-50 border-amber-300 shadow-sm'
                      : 'bg-slate-50 border-slate-200 opacity-50'),
                  title: b.desc
                },
                  h('div', { className: 'text-xl' }, earned ? b.icon : '\uD83D\uDD12'),
                  h('div', { className: 'text-[9px] font-bold mt-0.5 ' + (earned ? 'text-amber-700' : 'text-slate-400') },
                    b.label
                  ),
                  earned && h('div', { className: 'text-[8px] text-amber-500 font-bold' }, '+' + b.xp + ' XP')
                );
              })
            )
          ),


          /* ═══════════════════════════════════════════════════
             Snapshot Button
             ═══════════════════════════════════════════════════ */
          h('button', {
            onClick: function() {
              SOUNDS.snapshot();
              setToolSnapshots(function(prev) {
                return prev.concat([{
                  id: 'dc-' + Date.now(),
                  tool: 'decomposer',
                  label: sel.name + ' (' + sel.formula + ')',
                  data: Object.assign({}, d),
                  timestamp: Date.now()
                }]);
              });
              addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
            },
            className: 'mt-1 ml-auto block px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all'
          }, '\uD83D\uDCF8 Snapshot')

        );
      })();
    }
  });

})();
