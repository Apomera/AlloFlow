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
    tts: function() { playTone(330, 0.06, 'sine', 0.06); },
    objectFind: function() {
      playTone(660, 0.06, 'sine', 0.10);
      setTimeout(function() { playTone(880, 0.08, 'sine', 0.12); }, 60);
      setTimeout(function() { playTone(1100, 0.12, 'sine', 0.10); }, 130);
    },
    sceneSwitch: function() {
      playTone(350, 0.1, 'triangle', 0.08);
      setTimeout(function() { playTone(525, 0.12, 'triangle', 0.08); }, 80);
    },
    objectHover: function() { playTone(500, 0.04, 'sine', 0.05); },
    allFound: function() {
      playTone(523, 0.08, 'sine', 0.12);
      setTimeout(function() { playTone(659, 0.08, 'sine', 0.12); }, 80);
      setTimeout(function() { playTone(784, 0.08, 'sine', 0.12); }, 160);
      setTimeout(function() { playTone(1047, 0.2, 'sine', 0.15); }, 240);
    }
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
      check: function(d) { return (d.aiQuestions || 0) >= 3; } },
    { id: 'sceneExplorer', icon: '\uD83C\uDFE0', label: 'Scene Explorer', desc: 'Discover 5 objects in scenes', xp: 15,
      check: function(d) { return Object.keys(d.foundObjects || {}).length >= 5; } },
    { id: 'kitchenChef', icon: '\uD83C\uDF73', label: 'Kitchen Chemist', desc: 'Find all objects in the Kitchen', xp: 20,
      check: function(d) { return d._kitchenComplete; } },
    { id: 'sceneHunter', icon: '\uD83D\uDD0E', label: 'Material Hunter', desc: 'Discover 15 objects across scenes', xp: 25,
      check: function(d) { return Object.keys(d.foundObjects || {}).length >= 15; } },
    { id: 'allScenes', icon: '\uD83C\uDF0D', label: 'World Explorer', desc: 'Visit all 5 scenes', xp: 20,
      check: function(d) { return Object.keys(d.scenesVisited || {}).length >= 5; } },
    { id: 'sceneChamp', icon: '\uD83C\uDFC6', label: 'Scene Champion', desc: 'Find every object in every scene', xp: 50,
      check: function(d) { return d._allScenesComplete; } }
  ];

  /* ═══════════════════════════════════════════════════════════
     Element Visual Constants (for canvas)
     ═══════════════════════════════════════════════════════════ */
  var ELEM_COLORS = {
    H: '#60a5fa', O: '#ef4444', C: '#374151', N: '#3b82f6',
    Na: '#a855f7', Cl: '#22c55e', Fe: '#fb923c', Ca: '#f59e0b', S: '#eab308'
  };


  /* ═══════════════════════════════════════════════════════════
     SCENES — Interactive environments with discoverable objects
     Each object links to a MATERIALS compound by name
     x,y are 0-1 normalized coords for canvas placement
     ═══════════════════════════════════════════════════════════ */
  var SCENES = [
    {
      id: 'kitchen', name: 'Kitchen', icon: '\uD83C\uDF73', bgColor: '#fef3c7', accent: '#b45309',
      desc: 'A cozy kitchen where every meal involves chemistry.',
      objects: [
        { id: 'k_faucet', name: 'Kitchen Faucet', material: 'Water', emoji: '\uD83D\uDEB0', x: 0.14, y: 0.38, label: 'Faucet' },
        { id: 'k_salt', name: 'Salt Shaker', material: 'Table Salt', emoji: '\uD83E\uDDC2', x: 0.44, y: 0.44, label: 'Salt' },
        { id: 'k_sugar', name: 'Sugar Jar', material: 'Sugar (Sucrose)', emoji: '\uD83C\uDF6C', x: 0.56, y: 0.44, label: 'Sugar' },
        { id: 'k_baking', name: 'Baking Soda', material: 'Baking Soda', emoji: '\uD83E\uDDC1', x: 0.72, y: 0.20, label: 'Baking Soda' },
        { id: 'k_vinegar', name: 'Vinegar Bottle', material: 'Acetic Acid', emoji: '\uD83E\uDED9', x: 0.82, y: 0.20, label: 'Vinegar' },
        { id: 'k_soda', name: 'Soda Can', material: 'Carbon Dioxide', emoji: '\uD83E\uDD64', x: 0.30, y: 0.44, label: 'Soda' },
        { id: 'k_fruit', name: 'Fruit Bowl', material: 'Glucose', emoji: '\uD83C\uDF4E', x: 0.50, y: 0.54, label: 'Fruit' }
      ]
    },
    {
      id: 'bathroom', name: 'Bathroom', icon: '\uD83D\uDEC1', bgColor: '#e0f2fe', accent: '#0369a1',
      desc: 'More chemistry hides in here than you\u2019d think.',
      objects: [
        { id: 'b_tap', name: 'Sink Tap', material: 'Water', emoji: '\uD83D\uDEB0', x: 0.22, y: 0.44, label: 'Tap Water' },
        { id: 'b_peroxide', name: 'Peroxide Bottle', material: 'Hydrogen Peroxide', emoji: '\uD83D\uDC8A', x: 0.75, y: 0.30, label: 'First Aid' },
        { id: 'b_cleaner', name: 'Cleaning Spray', material: 'Ammonia', emoji: '\uD83E\uDDEA', x: 0.18, y: 0.70, label: 'Cleaner' },
        { id: 'b_sanitizer', name: 'Hand Sanitizer', material: 'Ethanol', emoji: '\uD83E\uDDF4', x: 0.38, y: 0.55, label: 'Sanitizer' },
        { id: 'b_chalk', name: 'Toothpaste Tube', material: 'Calcium Carbonate', emoji: '\uD83E\uDEB7', x: 0.32, y: 0.44, label: 'Toothpaste' },
        { id: 'b_exhale', name: 'Foggy Mirror', material: 'Carbon Dioxide', emoji: '\uD83E\uDE9E', x: 0.55, y: 0.18, label: 'Foggy Mirror' }
      ]
    },
    {
      id: 'garage', name: 'Garage', icon: '\uD83D\uDE97', bgColor: '#f1f5f9', accent: '#475569',
      desc: 'Engines, rust, and reactions \u2014 a chemistry workshop.',
      objects: [
        { id: 'g_battery', name: 'Car Battery', material: 'Sulfuric Acid', emoji: '\uD83D\uDD0B', x: 0.22, y: 0.48, label: 'Battery' },
        { id: 'g_rust', name: 'Rusty Toolbox', material: 'Rust', emoji: '\uD83D\uDFE4', x: 0.68, y: 0.52, label: 'Rust' },
        { id: 'g_gas', name: 'Gas Can', material: 'Methane', emoji: '\u26FD', x: 0.82, y: 0.52, label: 'Gas Can' },
        { id: 'g_hose', name: 'Garden Hose', material: 'Water', emoji: '\uD83D\uDEB0', x: 0.10, y: 0.68, label: 'Hose' },
        { id: 'g_deice', name: 'De-icing Salt', material: 'Table Salt', emoji: '\uD83E\uDDC2', x: 0.68, y: 0.28, label: 'Road Salt' }
      ]
    },
    {
      id: 'classroom', name: 'Science Lab', icon: '\uD83C\uDFEB', bgColor: '#fae8ff', accent: '#a21caf',
      desc: 'A real science classroom with beakers and experiments.',
      objects: [
        { id: 'c_chalk', name: 'Chalk Stick', material: 'Calcium Carbonate', emoji: '\uD83D\uDFE1', x: 0.15, y: 0.28, label: 'Chalk' },
        { id: 'c_soda', name: 'Baking Soda Volcano', material: 'Baking Soda', emoji: '\uD83C\uDF0B', x: 0.50, y: 0.48, label: 'Volcano' },
        { id: 'c_breath', name: 'CO\u2082 Test Tube', material: 'Carbon Dioxide', emoji: '\uD83E\uDDEA', x: 0.72, y: 0.48, label: 'CO\u2082 Test' },
        { id: 'c_water', name: 'Water Beaker', material: 'Water', emoji: '\u2697\uFE0F', x: 0.35, y: 0.48, label: 'Beaker' },
        { id: 'c_sugar', name: 'Sugar Cubes', material: 'Sugar (Sucrose)', emoji: '\uD83E\uDDCA', x: 0.60, y: 0.48, label: 'Sugar' },
        { id: 'c_iron', name: 'Iron Filings', material: 'Rust', emoji: '\u2699\uFE0F', x: 0.85, y: 0.48, label: 'Iron' }
      ]
    },
    {
      id: 'outdoors', name: 'Backyard', icon: '\uD83C\uDF33', bgColor: '#dcfce7', accent: '#15803d',
      desc: 'Step outside \u2014 nature is the biggest lab of all.',
      objects: [
        { id: 'o_rain', name: 'Rain Puddle', material: 'Water', emoji: '\uD83C\uDF27\uFE0F', x: 0.50, y: 0.75, label: 'Puddle' },
        { id: 'o_shell', name: 'Seashell', material: 'Calcium Carbonate', emoji: '\uD83D\uDC1A', x: 0.70, y: 0.72, label: 'Shell' },
        { id: 'o_rust', name: 'Rusty Gate', material: 'Rust', emoji: '\uD83D\uDEA7', x: 0.12, y: 0.50, label: 'Rusty Gate' },
        { id: 'o_ozone', name: 'Storm Clouds', material: 'Ozone', emoji: '\u26C8\uFE0F', x: 0.40, y: 0.12, label: 'Storm' },
        { id: 'o_compost', name: 'Compost Pile', material: 'Methane', emoji: '\u267B\uFE0F', x: 0.85, y: 0.55, label: 'Compost' },
        { id: 'o_fruit', name: 'Apple Tree', material: 'Glucose', emoji: '\uD83C\uDF3E', x: 0.28, y: 0.32, label: 'Apple Tree' }
      ]
    }
  ];


  /* ═══════════════════════════════════════════════════════════
     REACTIONS — What happens when two materials interact?
     ═══════════════════════════════════════════════════════════ */
  var REACTIONS = [
    { a: 'Baking Soda', b: 'Acetic Acid', name: 'Volcano Reaction', emoji: '\uD83C\uDF0B',
      equation: 'NaHCO\u2083 + CH\u2083COOH \u2192 CO\u2082 + H\u2082O + NaCH\u2083COO',
      desc: 'Baking soda reacts with vinegar to produce carbon dioxide gas, water, and sodium acetate. This is the classic science fair volcano!',
      type: 'Acid-Base Neutralization', observable: 'Fizzing, bubbling, gas release' },
    { a: 'Water', b: 'Table Salt', name: 'Dissolving Salt', emoji: '\uD83C\uDF0A',
      equation: 'NaCl + H\u2082O \u2192 Na\u207A(aq) + Cl\u207B(aq)',
      desc: 'Salt dissolves in water as the polar water molecules pull apart the Na\u207A and Cl\u207B ions. The salt seems to disappear but is still there!',
      type: 'Dissolution', observable: 'Salt disappears, water tastes salty' },
    { a: 'Water', b: 'Sugar (Sucrose)', name: 'Dissolving Sugar', emoji: '\uD83C\uDF6C',
      equation: 'C\u2081\u2082H\u2082\u2082O\u2081\u2081 + H\u2082O \u2192 C\u2081\u2082H\u2082\u2082O\u2081\u2081(aq)',
      desc: 'Sugar dissolves in water but does NOT break into new substances. This is a physical change \u2014 you can get the sugar back by evaporating the water.',
      type: 'Physical Change (Dissolving)', observable: 'Sugar disappears, water tastes sweet' },
    { a: 'Rust', b: 'Water', name: 'Iron Corrosion', emoji: '\uD83D\uDFE4',
      equation: '4Fe + 3O\u2082 + 6H\u2082O \u2192 4Fe(OH)\u2083',
      desc: 'Iron reacts with oxygen and water over time to form iron hydroxide, which becomes rust (Fe\u2082O\u2083). This is why leaving iron in rain causes it to corrode.',
      type: 'Oxidation (Corrosion)', observable: 'Orange-brown flaky coating forms slowly' },
    { a: 'Hydrogen Peroxide', b: 'Water', name: 'Peroxide Decomposition', emoji: '\uD83D\uDCA5',
      equation: '2H\u2082O\u2082 \u2192 2H\u2082O + O\u2082',
      desc: 'Hydrogen peroxide naturally decomposes into water and oxygen gas. A catalyst (like yeast or MnO\u2082) speeds this up dramatically \u2014 that\u2019s the "elephant toothpaste" experiment!',
      type: 'Decomposition', observable: 'Bubbling, foam if catalyzed' },
    { a: 'Baking Soda', b: 'Water', name: 'Baking Soda Solution', emoji: '\uD83E\uDDEA',
      equation: 'NaHCO\u2083 + H\u2082O \u2192 Na\u207A(aq) + OH\u207B(aq) + CO\u2082',
      desc: 'Baking soda dissolves in water creating a mildly basic (alkaline) solution. This is why it works as an antacid \u2014 it neutralizes stomach acid.',
      type: 'Dissolution (Basic)', observable: 'Slight fizzing, slippery feel' },
    { a: 'Methane', b: 'Ozone', name: 'Combustion', emoji: '\uD83D\uDD25',
      equation: 'CH\u2084 + 2O\u2082 \u2192 CO\u2082 + 2H\u2082O + energy',
      desc: 'When methane burns in oxygen, it releases energy as heat and light. This is how natural gas stoves and heaters work.',
      type: 'Combustion', observable: 'Blue flame, heat, water vapor' },
    { a: 'Calcium Carbonate', b: 'Acetic Acid', name: 'Dissolving Shells', emoji: '\uD83D\uDC1A',
      equation: 'CaCO\u2083 + 2CH\u2083COOH \u2192 Ca(CH\u2083COO)\u2082 + H\u2082O + CO\u2082',
      desc: 'Vinegar dissolves seashells and chalk! The acid reacts with calcium carbonate to produce gas bubbles. This is similar to how acid rain damages limestone buildings.',
      type: 'Acid-Base', observable: 'Fizzing, shell slowly dissolves' }
  ];

  /* ═══════════════════════════════════════════════════════════
     SAFETY + FUN FACTS per material
     ═══════════════════════════════════════════════════════════ */
  var MATERIAL_EXTRAS = {
    'Water': {
      safety: 'Safe! But never mix water with hot oil \u2014 it causes dangerous splattering.',
      facts: ['A water molecule bends at 104.5\u00B0 \u2014 that angle gives water its special properties.', 'Hot water can freeze faster than cold water (Mpemba effect).', 'Water is the only substance that naturally exists in all three states on Earth.']
    },
    'Table Salt': {
      safety: 'Safe to eat in small amounts. Too much raises blood pressure.',
      facts: ['Roman soldiers were sometimes paid in salt \u2014 that\u2019s where "salary" comes from.', 'Only 6% of all salt produced is used for food. Most goes to de-icing roads and industry.', 'A single grain of table salt contains about 1.2 \u00D7 10\u00B9\u2078 atoms.']
    },
    'Sugar (Sucrose)': {
      safety: 'Safe to eat. Excessive sugar consumption causes tooth decay and health issues.',
      facts: ['If you heat sugar to 186\u00B0C it caramelizes \u2014 that\u2019s a chemical change, not just melting.', 'Sugar cane was once so valuable it was called "white gold."', 'Your brain uses about 120g of glucose daily \u2014 20% of your body\u2019s energy.']
    },
    'Baking Soda': {
      safety: 'Safe for cooking and cleaning. Do not ingest large amounts.',
      facts: ['Baking soda can extinguish small grease fires by releasing CO\u2082.', 'It\u2019s used in toothpaste as a mild abrasive.', 'Mixed with vinegar, it produces enough CO\u2082 to inflate a balloon.']
    },
    'Rust': {
      safety: 'Rust itself is not toxic, but rusty metal can harbor tetanus bacteria.',
      facts: ['Mars is red because its surface is covered in iron oxide \u2014 literally a rusty planet.', 'Rusting costs the US economy about $7 billion per year.', 'Stainless steel resists rust because it contains chromium, which forms a protective oxide layer.']
    },
    'Carbon Dioxide': {
      safety: 'Non-toxic in small amounts. High concentrations displace oxygen and cause suffocation.',
      facts: ['You exhale about 200 mL of CO\u2082 with every breath.', 'Dry ice is solid CO\u2082 at -78.5\u00B0C \u2014 it sublimes directly to gas.', 'Plants absorb 120 billion tons of CO\u2082 from the atmosphere each year.']
    },
    'Ammonia': {
      safety: '\u26A0\uFE0F Irritating to eyes and lungs. NEVER mix with bleach \u2014 creates toxic chloramine gas.',
      facts: ['The Haber process makes 150 million tons of ammonia yearly for fertilizer.', 'Jupiter\u2019s atmosphere contains ammonia clouds.', 'Many household cleaners contain dilute ammonia (about 5-10%).']
    },
    'Glucose': {
      safety: 'Safe \u2014 it\u2019s your body\u2019s primary energy source.',
      facts: ['Your blood contains about 5 grams of glucose at all times.', 'Photosynthesis converts CO\u2082 + H\u2082O into glucose using sunlight.', 'Glucose was first isolated from raisins in 1747 by Andreas Marggraf.']
    },
    'Calcium Carbonate': {
      safety: 'Safe \u2014 used in antacids (Tums) and toothpaste.',
      facts: ['The White Cliffs of Dover are made of calcium carbonate from ancient sea creatures.', 'Coral reefs are built from CaCO\u2083 secreted by coral polyps.', 'Eggshells are 95% calcium carbonate.']
    },
    'Methane': {
      safety: '\u26A0\uFE0F Extremely flammable. Odorless \u2014 gas companies add mercaptan for the rotten-egg smell.',
      facts: ['Cows produce about 100 liters of methane per day through burping.', 'Methane is 80\u00D7 more potent than CO\u2082 as a greenhouse gas (over 20 years).', 'Titan (Saturn\u2019s moon) has lakes of liquid methane.']
    },
    'Ethanol': {
      safety: '\u26A0\uFE0F Flammable. Toxic if consumed in large quantities.',
      facts: ['Hand sanitizer is typically 60-70% ethanol.', 'Ethanol has been produced by fermentation for over 9,000 years.', 'Brazil uses sugarcane ethanol to fuel about 30% of its cars.']
    },
    'Acetic Acid': {
      safety: 'Household vinegar (5%) is safe. Concentrated acetic acid is corrosive.',
      facts: ['Vinegar has been used for over 10,000 years \u2014 it\u2019s one of the oldest chemicals known.', 'The word "vinegar" comes from French "vin aigre" meaning "sour wine."', 'Acetic acid bacteria convert ethanol to vinegar naturally.']
    },
    'Hydrogen Peroxide': {
      safety: '\u26A0\uFE0F 3% solutions are safe for first aid. Higher concentrations burn skin.',
      facts: ['Bombardier beetles spray boiling hydrogen peroxide at predators!', 'Your white blood cells produce H\u2082O\u2082 to kill bacteria.', 'It\u2019s used as rocket propellant at 90% concentration.']
    },
    'Sulfuric Acid': {
      safety: '\u2620\uFE0F EXTREMELY corrosive. Never handle without proper equipment.',
      facts: ['More sulfuric acid is produced than any other chemical \u2014 over 200 million tons/year.', 'Car batteries contain about 35% sulfuric acid.', 'Venus has clouds of sulfuric acid in its atmosphere.']
    },
    'Ozone': {
      safety: '\u26A0\uFE0F Toxic to breathe. Ground-level ozone is a pollutant, but stratospheric ozone protects us from UV.',
      facts: ['The ozone layer is only about 3mm thick if compressed to sea-level pressure.', 'Lightning creates ozone \u2014 that\u2019s the fresh smell after a thunderstorm.', 'The ozone hole over Antarctica was discovered in 1985.']
    }
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

        // Scene state
        var activeScene = d.activeScene || null;
        var foundObjects = d.foundObjects || {};
        var scenesVisited = d.scenesVisited || {};
        var selectedSceneObj = d.selectedSceneObj || null;
        var sceneHoverId = d.sceneHoverId || null;
        var huntTarget = d.huntTarget || null;
        var huntWrongGuess = d.huntWrongGuess || null;
        var huntScore = d.huntScore || 0;
        var huntStreak = d.huntStreak || 0;

        // Reaction Lab state
        var reactantA = d.reactantA || null;
        var reactantB = d.reactantB || null;
        var activeReaction = d.activeReaction || null;
        var reactionsDiscovered = d.reactionsDiscovered || {};

        // Fun fact state
        var factIdx = d._factIdx || 0;


        /* ═══════════════════════════════════════════════════
           Track material exploration  (for badges)
           ═══════════════════════════════════════════════════ */
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

        // Check badges inline (no useEffect)
        checkBadges();


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
          if (callTTS) { try { callTTS(text); return; } catch(e) {} }
          if (window._kokoroTTS && window._kokoroTTS.speak) {
            window._kokoroTTS.speak(String(text),'af_heart',1).then(function(url){if(url){var a=new Audio(url);a.playbackRate=0.95;a.play();}}).catch(function(){});
            return;
          }
          if (window.speechSynthesis) { var utter=new SpeechSynthesisUtterance(text); utter.rate=0.9; window.speechSynthesis.speak(utter); }
        }


        /* ═══════════════════════════════════════════════════
           Canvas Molecular Visualization
           ═══════════════════════════════════════════════════ */
        // Canvas molecular visualization (callback ref, no useEffect)
        var canvasRef = function(canvas) {
          if (!canvas) return;
          // Bridge state to canvas dataset
          canvas.dataset.formula = sel.formula;
          canvas.dataset.decomposed = decomposed ? 'true' : 'false';
          canvas.dataset.elementsJson = JSON.stringify(sel.elements);
          canvas.dataset.materialName = sel.name;

          if (tab !== 'visualize') return;
          // Prevent re-init if already running for same formula
          if (canvas._dcAnimRunning && canvas._dcFormula === sel.formula + (decomposed ? '_d' : '_a')) return;
          if (canvas._dcAnimId) cancelAnimationFrame(canvas._dcAnimId);
          canvas._dcFormula = sel.formula + (decomposed ? '_d' : '_a');
          canvas._dcAnimRunning = true;

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

          canvas._dcAnimId = animId;
        };

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
          { id: 'scenes', label: '\uD83C\uDFE0 Hunt', color: 'rose' },
          { id: 'reactions', label: '\uD83C\uDF0B Mix', color: 'red' },
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

            /* Safety info */
            MATERIAL_EXTRAS[sel.name] ? h('div', { className: 'rounded-xl border p-3 mb-3 ' + (MATERIAL_EXTRAS[sel.name].safety.indexOf('\u26A0') >= 0 || MATERIAL_EXTRAS[sel.name].safety.indexOf('\u2620') >= 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200') },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-[10px] font-bold uppercase tracking-wider ' + (MATERIAL_EXTRAS[sel.name].safety.indexOf('\u26A0') >= 0 || MATERIAL_EXTRAS[sel.name].safety.indexOf('\u2620') >= 0 ? 'text-red-600' : 'text-green-600') }, '\uD83D\uDEE1\uFE0F Safety'),
                h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, MATERIAL_EXTRAS[sel.name].safety)
              )
            ) : null,

            /* Did You Know? facts */
            MATERIAL_EXTRAS[sel.name] ? (function() {
              var extras = MATERIAL_EXTRAS[sel.name];
              var facts = extras.facts || [];
              var fi = factIdx % facts.length;
              return facts.length > 0 ? h('div', { className: 'bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200 p-3 mb-3' },
                h('div', { className: 'flex items-center justify-between mb-1' },
                  h('span', { className: 'text-[10px] font-bold text-violet-600 uppercase tracking-wider' }, '\uD83D\uDCA1 Did You Know?'),
                  h('button', {
                    onClick: function() { upd('_factIdx', factIdx + 1); },
                    className: 'text-[10px] text-violet-500 hover:text-violet-700 font-bold'
                  }, 'Next \u2192')
                ),
                h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, facts[fi]),
                h('div', { className: 'flex gap-1 mt-2' },
                  facts.map(function(f, i) {
                    return h('div', { key: i, style: { width: '6px', height: '6px', borderRadius: '50%', background: i === fi ? '#7c3aed' : '#e2e8f0' } });
                  })
                )
              ) : null;
            })() : null,

            /* Element mini-cards with periodic table info */
            decomposed ? h('div', { className: 'bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-3 mb-3' },
              h('p', { className: 'text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2' }, '\u269B\uFE0F Element Details'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                sel.elements.map(function(el) {
                  return h('div', { key: el.sym, className: 'bg-white rounded-lg border border-indigo-100 p-2 flex items-center gap-3' },
                    h('div', {
                      className: 'w-12 h-14 rounded-lg flex flex-col items-center justify-center text-white shadow-sm',
                      style: { background: el.color }
                    },
                      h('span', { className: 'text-[8px] opacity-70' }, el.num),
                      h('span', { className: 'text-lg font-black leading-none' }, el.sym),
                      h('span', { className: 'text-[7px] opacity-80' }, el.mass + ' u')
                    ),
                    h('div', { className: 'flex-1' },
                      h('div', { className: 'font-bold text-sm text-slate-800' }, el.name),
                      h('div', { className: 'text-[10px] text-slate-500' }, el.group),
                      h('div', { className: 'text-[10px] font-bold text-amber-600 mt-0.5' }, '\u00D7' + el.count + ' in ' + sel.formula)
                    )
                  );
                })
              )
            ) : null,

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
             SCENES TAB — Chemistry Hunt
             Students see all objects, get a formula challenge,
             and must click the correct object.
             ═══════════════════════════════════════════════════ */
          tab === 'scenes' && h('div', null,

            // Scene selection (when no scene active)
            !activeScene ? h('div', null,
              h('div', { className: 'text-center mb-4' },
                h('h4', { className: 'text-lg font-bold text-slate-800' }, '\uD83E\uDDEA Chemistry Hunt'),
                h('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' }, 'Explore real-world scenes. Can you find the object that contains each chemical compound?'),
                huntScore > 0 ? h('div', { className: 'flex items-center justify-center gap-3 mt-2' },
                  h('span', { className: 'text-xs font-bold text-emerald-600' }, '\u2B50 Score: ' + huntScore),
                  huntStreak >= 2 ? h('span', { className: 'text-xs font-bold text-amber-600' }, '\uD83D\uDD25 Streak: ' + huntStreak) : null
                ) : null
              ),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                SCENES.map(function(scene) {
                  var sceneFound = 0;
                  scene.objects.forEach(function(obj) { if (foundObjects[obj.id]) sceneFound++; });
                  var complete = sceneFound === scene.objects.length;
                  return h('button', {
                    key: scene.id,
                    onClick: function() {
                      SOUNDS.sceneSwitch();
                      var visited = Object.assign({}, scenesVisited);
                      visited[scene.id] = true;
                      // Pick a random un-found object as the first hunt target
                      var unfound = scene.objects.filter(function(o) { return !foundObjects[o.id]; });
                      var target = unfound.length > 0 ? unfound[Math.floor(Math.random() * unfound.length)] : null;
                      updMulti({ activeScene: scene.id, scenesVisited: visited, selectedSceneObj: null, huntTarget: target ? target.id : null, huntWrongGuess: null });
                    },
                    className: 'relative rounded-xl p-4 text-left border-2 transition-all hover:shadow-md ' +
                      (complete ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-amber-300'),
                    style: { borderLeftWidth: '6px', borderLeftColor: scene.accent }
                  },
                    h('div', { className: 'flex items-center gap-3' },
                      h('span', { className: 'text-3xl' }, scene.icon),
                      h('div', { className: 'flex-1' },
                        h('div', { className: 'font-bold text-slate-800 text-sm' }, scene.name),
                        h('p', { className: 'text-[10px] text-slate-500 mt-0.5' }, scene.desc),
                        h('div', { className: 'flex items-center gap-2 mt-1.5' },
                          h('div', { className: 'flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden' },
                            h('div', { className: 'h-full rounded-full transition-all duration-500', style: { width: Math.round(sceneFound / scene.objects.length * 100) + '%', background: scene.accent } })
                          ),
                          h('span', { className: 'text-[9px] font-bold ' + (complete ? 'text-emerald-600' : 'text-slate-400') }, sceneFound + '/' + scene.objects.length)
                        )
                      ),
                      complete ? h('span', { className: 'text-xl' }, '\u2705') : null
                    )
                  );
                })
              ),
              h('div', { className: 'mt-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3 text-center' },
                h('span', { className: 'text-xs font-bold text-amber-700' },
                  '\uD83D\uDD0E Total: ' + Object.keys(foundObjects).length + '/' + SCENES.reduce(function(s, sc) { return s + sc.objects.length; }, 0) + ' compounds identified'
                )
              )
            ) : null,

            // Active scene view
            activeScene ? (function() {
              var scene = null;
              for (var si = 0; si < SCENES.length; si++) { if (SCENES[si].id === activeScene) { scene = SCENES[si]; break; } }
              if (!scene) return null;
              var sceneFoundCount = 0;
              scene.objects.forEach(function(obj) { if (foundObjects[obj.id]) sceneFoundCount++; });
              var allFoundInScene = sceneFoundCount === scene.objects.length;

              // Current hunt target object & its linked material
              var targetObj = null;
              if (huntTarget) {
                for (var ti = 0; ti < scene.objects.length; ti++) { if (scene.objects[ti].id === huntTarget) { targetObj = scene.objects[ti]; break; } }
              }
              var targetMat = targetObj ? MATERIALS.find(function(m) { return m.name === targetObj.material; }) : null;

              // Wrong guess details
              var wrongObj = null;
              var wrongMat = null;
              if (huntWrongGuess) {
                for (var wi = 0; wi < scene.objects.length; wi++) { if (scene.objects[wi].id === huntWrongGuess) { wrongObj = scene.objects[wi]; break; } }
                if (wrongObj) wrongMat = MATERIALS.find(function(m) { return m.name === wrongObj.material; });
              }

              // Selected object for detail view
              var selObj = null;
              if (selectedSceneObj) {
                for (var oi = 0; oi < scene.objects.length; oi++) { if (scene.objects[oi].id === selectedSceneObj) { selObj = scene.objects[oi]; break; } }
              }
              var linkedMat = selObj ? MATERIALS.find(function(m) { return m.name === selObj.material; }) : null;

              // Pick next hunt target helper
              function pickNextTarget() {
                var unfound = scene.objects.filter(function(o) { return !foundObjects[o.id] && o.id !== (targetObj ? targetObj.id : ''); });
                return unfound.length > 0 ? unfound[Math.floor(Math.random() * unfound.length)].id : null;
              }

              return h('div', null,
                // Scene header
                h('div', { className: 'flex items-center gap-3 mb-3' },
                  h('button', { onClick: function() { updMulti({ activeScene: null, selectedSceneObj: null, huntTarget: null, huntWrongGuess: null }); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg' }, h(ArrowLeft, { size: 16, className: 'text-slate-500' })),
                  h('span', { className: 'text-2xl' }, scene.icon),
                  h('div', { className: 'flex-1' },
                    h('h4', { className: 'font-bold text-slate-800' }, scene.name),
                    h('p', { className: 'text-[10px] text-slate-500' }, sceneFoundCount + '/' + scene.objects.length + ' identified')
                  ),
                  huntScore > 0 ? h('span', { className: 'px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full' }, '\u2B50 ' + huntScore) : null,
                  allFoundInScene ? h('span', { className: 'px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full' }, '\u2705 Complete!') : null
                ),

                // Challenge prompt — "Find the compound!"
                targetObj && targetMat && !allFoundInScene ? h('div', { className: 'bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-300 p-3 mb-3 text-center' },
                  h('p', { className: 'text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1' }, '\uD83D\uDD0E Find the compound!'),
                  h('div', { className: 'flex items-center justify-center gap-3' },
                    h('span', { className: 'text-2xl font-mono font-black text-indigo-800' }, targetMat.formula),
                    h('span', { className: 'text-sm text-indigo-600' }, '\u2014'),
                    h('span', { className: 'text-sm font-bold text-indigo-700' }, targetMat.name)
                  ),
                  h('p', { className: 'text-[10px] text-indigo-500 mt-1' }, 'Tap the object in the scene that contains this compound!')
                ) : null,

                // Scene complete message
                allFoundInScene ? h('div', { className: 'bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-300 p-4 mb-3 text-center' },
                  h('p', { className: 'text-lg font-bold text-emerald-800' }, '\uD83C\uDF89 Scene Complete!'),
                  h('p', { className: 'text-xs text-emerald-600 mt-1' }, 'You identified every compound in the ' + scene.name + '.')
                ) : null,

                // Wrong guess feedback
                wrongObj && wrongMat && !foundObjects[huntWrongGuess] ? h('div', { className: 'bg-red-50 rounded-xl border border-red-200 p-3 mb-3' },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg' }, wrongObj.emoji),
                    h('span', { className: 'text-xs font-bold text-red-700' }, 'Not quite! ' + wrongObj.name + ' contains ' + wrongMat.formula + ' (' + wrongMat.name + ')'),
                    h('button', { onClick: function() { upd('huntWrongGuess', null); }, className: 'ml-auto text-red-400 hover:text-red-600 text-xs font-bold' }, '\u2715')
                  ),
                  h('p', { className: 'text-[10px] text-red-600' }, 'Keep looking for ' + targetMat.formula + '!')
                ) : null,

                // Scene visual — all objects always visible
                h('div', { className: 'relative rounded-xl border-2 overflow-hidden mb-3', style: { borderColor: scene.accent, background: scene.bgColor, minHeight: '260px' } },
                  // Canvas background
                  h('canvas', {
                    ref: function(canvas) {
                      if (!canvas) return;
                      if (canvas._sceneDrawn === scene.id) return;
                      canvas._sceneDrawn = scene.id;
                      var c = canvas.getContext('2d');
                      var dpr = window.devicePixelRatio || 1;
                      var cw = canvas.offsetWidth || 500;
                      var ch = 260;
                      canvas.width = cw * dpr; canvas.height = ch * dpr; canvas.style.height = ch + 'px'; c.scale(dpr, dpr);
                      var bgGrad = c.createLinearGradient(0, 0, 0, ch);
                      bgGrad.addColorStop(0, scene.bgColor); bgGrad.addColorStop(1, scene.accent + '18');
                      c.fillStyle = bgGrad; c.fillRect(0, 0, cw, ch);
                      if (scene.id === 'kitchen') {
                        c.fillStyle = '#d4a574'; c.fillRect(0, ch * 0.5, cw, ch * 0.04);
                        c.fillStyle = '#8b6f47'; c.fillRect(0, ch * 0.54, cw, ch * 0.46);
                        c.fillStyle = '#c8a882'; c.fillRect(cw * 0.05, ch * 0.08, cw * 0.25, ch * 0.38);
                        c.strokeStyle = '#a0845c'; c.lineWidth = 2; c.strokeRect(cw * 0.05, ch * 0.08, cw * 0.25, ch * 0.38);
                        c.fillRect(cw * 0.65, ch * 0.08, cw * 0.30, ch * 0.38); c.strokeRect(cw * 0.65, ch * 0.08, cw * 0.30, ch * 0.38);
                        c.fillStyle = '#87ceeb'; c.fillRect(cw * 0.38, ch * 0.05, cw * 0.24, ch * 0.28);
                        c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(cw * 0.38, ch * 0.05, cw * 0.24, ch * 0.28);
                        c.beginPath(); c.moveTo(cw * 0.50, ch * 0.05); c.lineTo(cw * 0.50, ch * 0.33); c.stroke();
                      } else if (scene.id === 'bathroom') {
                        c.fillStyle = '#e0f2fe'; c.fillRect(0, 0, cw, ch * 0.65);
                        c.strokeStyle = '#bae6fd'; c.lineWidth = 0.5;
                        for (var tx = 0; tx < cw; tx += 30) { c.beginPath(); c.moveTo(tx, 0); c.lineTo(tx, ch * 0.65); c.stroke(); }
                        for (var ty = 0; ty < ch * 0.65; ty += 30) { c.beginPath(); c.moveTo(0, ty); c.lineTo(cw, ty); c.stroke(); }
                        c.fillStyle = '#cbd5e1'; c.fillRect(0, ch * 0.65, cw, ch * 0.35);
                        c.fillStyle = '#c7d2fe'; c.beginPath(); c.ellipse(cw * 0.55, ch * 0.18, cw * 0.12, ch * 0.14, 0, 0, Math.PI * 2); c.fill();
                        c.strokeStyle = '#a5b4fc'; c.lineWidth = 3; c.stroke();
                        c.fillStyle = '#f8fafc'; c.fillRect(cw * 0.12, ch * 0.40, cw * 0.30, ch * 0.14);
                        c.strokeStyle = '#94a3b8'; c.lineWidth = 2; c.strokeRect(cw * 0.12, ch * 0.40, cw * 0.30, ch * 0.14);
                      } else if (scene.id === 'garage') {
                        c.fillStyle = '#9ca3af'; c.fillRect(0, ch * 0.6, cw, ch * 0.4);
                        c.fillStyle = '#d1d5db'; c.fillRect(0, 0, cw, ch * 0.6);
                        c.fillStyle = '#78716c'; c.fillRect(cw * 0.6, ch * 0.15, cw * 0.35, ch * 0.04);
                        c.fillRect(cw * 0.6, ch * 0.35, cw * 0.35, ch * 0.04);
                        c.strokeStyle = '#6b7280'; c.lineWidth = 3; c.strokeRect(cw * 0.05, ch * 0.05, cw * 0.45, ch * 0.52);
                      } else if (scene.id === 'classroom') {
                        c.fillStyle = '#166534'; c.fillRect(cw * 0.1, ch * 0.05, cw * 0.8, ch * 0.30);
                        c.strokeStyle = '#a16207'; c.lineWidth = 4; c.strokeRect(cw * 0.1, ch * 0.05, cw * 0.8, ch * 0.30);
                        c.fillStyle = 'rgba(255,255,255,0.5)'; c.font = '12px serif'; c.textAlign = 'center';
                        c.fillText('H\u2082O    NaCl    CO\u2082    CaCO\u2083', cw * 0.5, ch * 0.22);
                        c.fillStyle = '#c8a882'; c.fillRect(cw * 0.05, ch * 0.42, cw * 0.9, ch * 0.06);
                      } else if (scene.id === 'outdoors') {
                        var skyGrad = c.createLinearGradient(0, 0, 0, ch * 0.55);
                        skyGrad.addColorStop(0, '#7dd3fc'); skyGrad.addColorStop(1, '#bae6fd');
                        c.fillStyle = skyGrad; c.fillRect(0, 0, cw, ch * 0.55);
                        c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(cw * 0.85, ch * 0.12, 20, 0, Math.PI * 2); c.fill();
                        c.fillStyle = 'rgba(255,255,255,0.8)';
                        c.beginPath(); c.arc(cw * 0.55, ch * 0.10, 16, 0, Math.PI * 2); c.fill();
                        c.beginPath(); c.arc(cw * 0.60, ch * 0.08, 20, 0, Math.PI * 2); c.fill();
                        c.fillStyle = '#22c55e'; c.fillRect(0, ch * 0.55, cw, ch * 0.45);
                        c.fillStyle = '#78350f'; c.fillRect(cw * 0.25, ch * 0.22, cw * 0.04, ch * 0.34);
                        c.fillStyle = '#16a34a'; c.beginPath(); c.arc(cw * 0.27, ch * 0.20, 30, 0, Math.PI * 2); c.fill();
                      }
                      c.fillStyle = scene.accent; c.globalAlpha = 0.25;
                      c.font = 'bold 10px system-ui, sans-serif'; c.textAlign = 'left';
                      c.fillText(scene.name.toUpperCase(), 8, 16); c.globalAlpha = 1;
                    },
                    className: 'w-full block', style: { height: '260px' }
                  }),

                  // All objects ALWAYS visible as labeled emoji buttons
                  scene.objects.map(function(obj) {
                    var isFound = !!foundObjects[obj.id];
                    var isTarget = huntTarget === obj.id;
                    var isWrong = huntWrongGuess === obj.id;
                    var isSelected = selectedSceneObj === obj.id;
                    return h('button', {
                      key: obj.id,
                      onClick: function() {
                        if (isFound) {
                          // Already found — show details
                          SOUNDS.elementClick();
                          upd('selectedSceneObj', isSelected ? null : obj.id);
                          return;
                        }
                        // Hunt mode: check if this is the target
                        if (huntTarget && obj.id === huntTarget) {
                          // CORRECT!
                          SOUNDS.objectFind();
                          var newFound = Object.assign({}, foundObjects);
                          newFound[obj.id] = true;
                          var newScore = huntScore + 1;
                          var newStreak = huntStreak + 1;
                          var updates = { foundObjects: newFound, selectedSceneObj: obj.id, huntScore: newScore, huntStreak: newStreak, huntWrongGuess: null };
                          // Check scene complete
                          var sceneComplete = true;
                          scene.objects.forEach(function(o) { if (o.id !== obj.id && !foundObjects[o.id]) sceneComplete = false; });
                          if (scene.id === 'kitchen' && sceneComplete) updates._kitchenComplete = true;
                          var globalComplete = sceneComplete;
                          if (globalComplete) {
                            SCENES.forEach(function(sc) {
                              if (sc.id === scene.id) return;
                              sc.objects.forEach(function(o) { if (!foundObjects[o.id]) globalComplete = false; });
                            });
                          }
                          if (globalComplete) { updates._allScenesComplete = true; setTimeout(function() { SOUNDS.allFound(); }, 300); }
                          // Pick next target
                          if (!sceneComplete) {
                            var unfound = scene.objects.filter(function(o) { return !foundObjects[o.id] && o.id !== obj.id; });
                            updates.huntTarget = unfound.length > 0 ? unfound[Math.floor(Math.random() * unfound.length)].id : null;
                          } else {
                            updates.huntTarget = null;
                          }
                          updMulti(updates);
                          if (addToast) addToast('\u2705 Correct! ' + obj.name + ' = ' + MATERIALS.find(function(m) { return m.name === obj.material; }).formula, 'success');
                          if (awardStemXP) awardStemXP(5);
                        } else {
                          // WRONG — teach them what this object contains
                          SOUNDS.quizWrong();
                          updMulti({ huntWrongGuess: obj.id, huntStreak: 0 });
                        }
                      },
                      className: 'absolute flex flex-col items-center transition-all duration-200',
                      style: {
                        left: (obj.x * 100) + '%', top: (obj.y * 100) + '%',
                        transform: 'translate(-50%, -50%)' + (isSelected ? ' scale(1.15)' : ''),
                        cursor: 'pointer', zIndex: isSelected ? 10 : 2,
                        filter: isWrong ? 'saturate(0.3)' : 'none'
                      },
                      'aria-label': isFound ? obj.name + ' - identified' : obj.label
                    },
                      h('div', {
                        className: 'flex items-center justify-center transition-all duration-200',
                        style: {
                          width: '44px', height: '44px', borderRadius: '12px',
                          background: isFound ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)',
                          border: isFound ? '2px solid #22c55e' : (isTarget && !isFound ? '2px solid ' + scene.accent : '2px solid rgba(0,0,0,0.1)'),
                          boxShadow: isFound ? '0 0 8px rgba(34,197,94,0.3)' : '0 2px 8px rgba(0,0,0,0.12)'
                        }
                      }, h('span', { style: { fontSize: '22px' } }, obj.emoji)),
                      h('span', {
                        className: 'text-[8px] font-bold mt-0.5 px-1 py-0.5 rounded',
                        style: { background: isFound ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.85)', color: isFound ? '#15803d' : '#475569', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                      }, isFound ? '\u2705 ' + (obj.label || obj.name) : (obj.label || obj.name))
                    );
                  })
                ),

                // Progress bar
                h('div', { className: 'mb-3' },
                  h('div', { className: 'flex justify-between mb-1' },
                    h('span', { className: 'text-[10px] font-bold text-slate-500' }, 'Compounds Identified'),
                    h('span', { className: 'text-[10px] font-bold', style: { color: scene.accent } }, sceneFoundCount + '/' + scene.objects.length)
                  ),
                  h('div', { className: 'w-full h-2 bg-slate-200 rounded-full overflow-hidden' },
                    h('div', { className: 'h-full rounded-full transition-all duration-500', style: { width: Math.round(sceneFoundCount / scene.objects.length * 100) + '%', background: scene.accent } })
                  )
                ),

                // Detail card for selected found object
                selObj && linkedMat && foundObjects[selObj.id] ? h('div', { className: 'bg-white rounded-xl border-2 p-4 mb-3', style: { borderColor: scene.accent } },
                  h('div', { className: 'flex items-start gap-3 mb-3' },
                    h('span', { className: 'text-3xl' }, selObj.emoji),
                    h('div', { className: 'flex-1' },
                      h('h4', { className: 'font-bold text-slate-800' }, selObj.name),
                      h('span', { className: 'px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full' }, '\u2705 Identified')
                    ),
                    h('button', { onClick: function() { upd('selectedSceneObj', null); }, className: 'p-1 hover:bg-slate-100 rounded' }, h(X, { size: 14, className: 'text-slate-400' }))
                  ),
                  h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200' },
                    h('div', { className: 'flex items-center gap-2 mb-2' },
                      h('span', { className: 'text-xl' }, linkedMat.emoji),
                      h('span', { className: 'font-bold text-slate-800 text-sm' }, linkedMat.name),
                      h('span', { className: 'px-2 py-0.5 bg-white rounded-full text-xs font-mono font-bold text-slate-700 border border-slate-200' }, linkedMat.formula)
                    ),
                    h('p', { className: 'text-xs text-slate-600 leading-relaxed mb-2' }, linkedMat.desc),
                    h('div', { className: 'flex gap-3 text-[10px] font-bold' },
                      h('span', { className: 'text-cyan-600' }, '\uD83D\uDD17 ' + linkedMat.bondType),
                      h('span', { className: 'text-indigo-600' }, '\uD83D\uDCCA ' + linkedMat.state),
                      h('span', { className: 'text-emerald-600' }, '\u2696 ' + linkedMat.molarMass)
                    ),
                    h('div', { className: 'flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-amber-200' },
                      linkedMat.elements.map(function(el) {
                        return h('div', { key: el.sym, className: 'flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-slate-200' },
                          h('div', { className: 'w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold', style: { background: el.color } }, el.sym),
                          h('span', { className: 'text-[10px] font-bold text-slate-700' }, el.name),
                          el.count > 1 ? h('span', { className: 'text-[9px] text-amber-600 font-bold' }, '\u00D7' + el.count) : null
                        );
                      })
                    ),
                    h('div', { className: 'flex gap-2 mt-3' },
                      h('button', { onClick: function() { updMulti({ selected: linkedMat.name, decomposed: false, tab: 'explore' }); }, className: 'flex-1 py-2 bg-amber-500 text-white font-bold text-xs rounded-lg hover:bg-amber-600 transition-all' }, '\u2697\uFE0F Explore'),
                      h('button', { onClick: function() { updMulti({ selected: linkedMat.name, decomposed: false, tab: 'visualize' }); }, className: 'flex-1 py-2 bg-indigo-500 text-white font-bold text-xs rounded-lg hover:bg-indigo-600 transition-all' }, '\uD83C\uDFA8 Visualize'),
                      h('button', { onClick: function() { speakText(selObj.name + ' contains ' + linkedMat.name + '. ' + linkedMat.desc); }, className: 'px-3 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-200 transition-all' }, '\uD83D\uDD0A')
                    )
                  )
                ) : null,

                // Found objects summary
                sceneFoundCount > 0 ? h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-3' },
                  h('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2' }, '\u2705 Identified in ' + scene.name),
                  h('div', { className: 'flex flex-wrap gap-1.5' },
                    scene.objects.filter(function(obj) { return foundObjects[obj.id]; }).map(function(obj) {
                      var mat = MATERIALS.find(function(m) { return m.name === obj.material; });
                      return h('button', {
                        key: obj.id,
                        onClick: function() { SOUNDS.elementClick(); upd('selectedSceneObj', selectedSceneObj === obj.id ? null : obj.id); },
                        className: 'px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ' +
                          (selectedSceneObj === obj.id ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300')
                      }, obj.emoji + ' ' + (mat ? mat.formula : obj.name));
                    })
                  )
                ) : null
              );
            })() : null
          ),


          /* ═══════════════════════════════════════════════════
             REACTION LAB TAB — Mix two materials
             ═══════════════════════════════════════════════════ */
          tab === 'reactions' && h('div', null,
            h('div', { className: 'text-center mb-4' },
              h('h4', { className: 'text-lg font-bold text-slate-800' }, '\uD83C\uDF0B Reaction Lab'),
              h('p', { className: 'text-xs text-slate-500 mt-1' }, 'Pick two materials and see what happens when they react!')
            ),

            // Material picker — two slots
            h('div', { className: 'grid grid-cols-2 gap-4 mb-4' },
              // Slot A
              h('div', { className: 'bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-indigo-200 p-3' },
                h('p', { className: 'text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2' }, 'Material A'),
                reactantA ? h('div', { className: 'text-center' },
                  h('span', { className: 'text-3xl' }, (MATERIALS.find(function(m) { return m.name === reactantA; }) || {}).emoji || '?'),
                  h('p', { className: 'text-xs font-bold text-slate-800 mt-1' }, reactantA),
                  h('button', { onClick: function() { updMulti({ reactantA: null, activeReaction: null }); }, className: 'text-[10px] text-red-500 font-bold mt-1' }, '\u2715 Remove')
                ) : h('p', { className: 'text-xs text-indigo-400 text-center py-4' }, 'Select below \u2193')
              ),
              // Slot B
              h('div', { className: 'bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl border-2 border-rose-200 p-3' },
                h('p', { className: 'text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-2' }, 'Material B'),
                reactantB ? h('div', { className: 'text-center' },
                  h('span', { className: 'text-3xl' }, (MATERIALS.find(function(m) { return m.name === reactantB; }) || {}).emoji || '?'),
                  h('p', { className: 'text-xs font-bold text-slate-800 mt-1' }, reactantB),
                  h('button', { onClick: function() { updMulti({ reactantB: null, activeReaction: null }); }, className: 'text-[10px] text-red-500 font-bold mt-1' }, '\u2715 Remove')
                ) : h('p', { className: 'text-xs text-rose-400 text-center py-4' }, 'Select below \u2193')
              )
            ),

            // Material palette
            h('div', { className: 'flex flex-wrap gap-1.5 mb-4' },
              MATERIALS.map(function(m) {
                var isA = reactantA === m.name;
                var isB = reactantB === m.name;
                return h('button', {
                  key: m.name,
                  onClick: function() {
                    SOUNDS.selectMaterial();
                    if (!reactantA) { updMulti({ reactantA: m.name, activeReaction: null }); }
                    else if (!reactantB && m.name !== reactantA) { upd('reactantB', m.name); }
                    else if (!isA && !isB) { updMulti({ reactantA: m.name, reactantB: null, activeReaction: null }); }
                  },
                  className: 'px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ' +
                    (isA ? 'bg-indigo-500 text-white' : isB ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-amber-300')
                }, m.emoji + ' ' + m.name);
              })
            ),

            // React button + result
            reactantA && reactantB ? (function() {
              // Find matching reaction
              var reaction = null;
              for (var ri = 0; ri < REACTIONS.length; ri++) {
                var r = REACTIONS[ri];
                if ((r.a === reactantA && r.b === reactantB) || (r.a === reactantB && r.b === reactantA)) {
                  reaction = r; break;
                }
              }

              return h('div', null,
                // Mix button
                !activeReaction ? h('button', {
                  onClick: function() {
                    SOUNDS.decompose();
                    if (reaction) {
                      var disc = Object.assign({}, reactionsDiscovered);
                      disc[reaction.name] = true;
                      updMulti({ activeReaction: reaction, reactionsDiscovered: disc });
                      if (addToast) addToast(reaction.emoji + ' ' + reaction.name + '!', 'success');
                      if (awardStemXP) awardStemXP(10);
                    } else {
                      upd('activeReaction', { name: 'No Known Reaction', emoji: '\uD83E\uDD37', desc: 'These two materials don\u2019t have a notable reaction in our database. Try a different combination!', equation: reactantA + ' + ' + reactantB + ' \u2192 ?', type: 'Unknown', observable: 'No visible change' });
                    }
                  },
                  className: 'w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-md transition-all mb-3'
                }, '\uD83E\uDDEA Mix ' + reactantA + ' + ' + reactantB + '!') : null,

                // Reaction result card
                activeReaction ? h('div', { className: 'bg-gradient-to-br from-amber-50 to-red-50 rounded-xl border-2 border-amber-300 p-4 mb-3' },
                  h('div', { className: 'flex items-center gap-3 mb-3' },
                    h('span', { className: 'text-3xl' }, activeReaction.emoji),
                    h('div', null,
                      h('h4', { className: 'font-bold text-slate-800 text-lg' }, activeReaction.name),
                      h('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700' }, activeReaction.type)
                    )
                  ),
                  // Equation
                  h('div', { className: 'bg-white rounded-lg p-3 mb-3 text-center border border-amber-200' },
                    h('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1' }, 'Chemical Equation'),
                    h('p', { className: 'text-sm font-mono font-bold text-slate-800' }, activeReaction.equation)
                  ),
                  // Description
                  h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-3' }, activeReaction.desc),
                  // Observable
                  activeReaction.observable ? h('div', { className: 'flex items-center gap-2 bg-sky-50 rounded-lg p-2 border border-sky-200 mb-3' },
                    h('span', { className: 'text-[10px] font-bold text-sky-600' }, '\uD83D\uDC41\uFE0F What you\u2019d see:'),
                    h('span', { className: 'text-xs text-slate-700' }, activeReaction.observable)
                  ) : null,
                  // TTS + try another
                  h('div', { className: 'flex gap-2' },
                    h('button', {
                      onClick: function() { speakText(activeReaction.name + '. ' + activeReaction.desc); },
                      className: 'px-3 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-200'
                    }, '\uD83D\uDD0A Listen'),
                    h('button', {
                      onClick: function() { updMulti({ reactantA: null, reactantB: null, activeReaction: null }); },
                      className: 'flex-1 py-2 bg-amber-500 text-white font-bold text-xs rounded-lg hover:bg-amber-600'
                    }, '\uD83D\uDD04 Try Another Combo')
                  )
                ) : null
              );
            })() : null,

            // Discovered reactions log
            Object.keys(reactionsDiscovered).length > 0 ? h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-3' },
              h('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2' }, '\uD83E\uDDEA Discovered Reactions (' + Object.keys(reactionsDiscovered).length + '/' + REACTIONS.length + ')'),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                REACTIONS.map(function(r) {
                  var disc = !!reactionsDiscovered[r.name];
                  return h('span', {
                    key: r.name,
                    className: 'px-2 py-1 rounded-lg text-[10px] font-bold ' +
                      (disc ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-400 border border-slate-200')
                  }, disc ? r.emoji + ' ' + r.name : '\uD83D\uDD12 ???');
                })
              )
            ) : null
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
