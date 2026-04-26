// stem_tool_decomposer.js  —  Standalone Material Decomposer (ES5)
// Extracted from stem_tool_science.js monolith and enhanced with:
//   Canvas molecular visualization, sound effects, 12 badges,
//   AI tutor, TTS read-aloud, grade-band content, 15 materials
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
    if (document.getElementById('allo-live-decomposer')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-decomposer';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


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
    questHooks: [
      { id: 'explore_5_materials', label: 'Explore 5 decomposable materials', icon: '\uD83E\uDDEB', check: function(d) { return (d.materialsExplored || []).length >= 5; }, progress: function(d) { return (d.materialsExplored || []).length + '/5'; } },
      { id: 'explore_15_materials', label: 'Explore 15 materials (master decomposer!)', icon: '\uD83C\uDFC6', check: function(d) { return (d.materialsExplored || []).length >= 15; }, progress: function(d) { return (d.materialsExplored || []).length + '/15'; } },
      { id: 'quiz_score_5', label: 'Score 5+ on the decomposition quiz', icon: '\uD83E\uDDE0', check: function(d) { return (d.quizScore || 0) >= 5; }, progress: function(d) { return (d.quizScore || 0) + '/5'; } },
      { id: 'streak_3', label: 'Get a 3-answer correct streak', icon: '\uD83D\uDD25', check: function(d) { return (d.bestStreak || 0) >= 3; }, progress: function(d) { return (d.bestStreak || 0) + '/3'; } }
    ],
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
      var canvasNarrate = ctx.canvasNarrate;

      /* ═══════════════════════════════════════════════════════
         Tool Body
         ═══════════════════════════════════════════════════════ */
      return (function() {

        /* ── State ── */
        var d = labToolData.decomposer || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('decomposer', 'init', {
              first: 'Decomposer Lab loaded. Explore how fungi, bacteria, and invertebrates break down organic matter and recycle nutrients.',
              repeat: 'Decomposer Lab active.',
              terse: 'Decomposer Lab.'
            }, { debounce: 800 });
          }

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
          var types = ['formula', 'elements', 'count', 'bond', 'state', 'realUse', 'nameFromFormula', 'truefalse'];
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
          } else if (type === 'bond') {
            q = { text: 'What type of bonding does ' + mat.name + ' have?', answer: mat.bondType };
            opts = [mat.bondType];
            var allBonds = ['Ionic', 'Covalent', 'Ionic + Covalent', 'Metallic'];
            allBonds.forEach(function(b) { if (opts.indexOf(b) < 0 && opts.length < 4) opts.push(b); });
          } else if (type === 'state') {
            q = { text: 'At room temperature, ' + mat.name + ' (' + mat.formula + ') is a...', answer: mat.state };
            opts = [mat.state];
            ['Solid', 'Liquid', 'Gas', 'Plasma'].forEach(function(s) { if (opts.indexOf(s) < 0 && opts.length < 4) opts.push(s); });
          } else if (type === 'realUse') {
            q = { text: 'Which compound: ' + mat.realUse.substring(0, 80) + '...', answer: mat.name };
            opts = [mat.name];
            while (opts.length < 4) {
              var ru = MATERIALS[Math.floor(Math.random() * MATERIALS.length)].name;
              if (opts.indexOf(ru) < 0) opts.push(ru);
            }
          } else if (type === 'nameFromFormula') {
            q = { text: 'What is ' + mat.formula + ' commonly known as?', answer: mat.name };
            opts = [mat.name];
            while (opts.length < 4) {
              var nf = MATERIALS[Math.floor(Math.random() * MATERIALS.length)].name;
              if (opts.indexOf(nf) < 0) opts.push(nf);
            }
          } else {
            // True/false
            var isTruth = Math.random() > 0.5;
            if (isTruth) {
              q = { text: 'True or False: ' + mat.name + ' has the formula ' + mat.formula + '.', answer: 'True' };
            } else {
              var fakeMat = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
              while (fakeMat.name === mat.name) fakeMat = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
              q = { text: 'True or False: ' + mat.name + ' has the formula ' + fakeMat.formula + '.', answer: 'False' };
            }
            opts = ['True', 'False'];
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

          // Particle burst state
          var particles = [];
          var wasDecomposed = false;

          function draw() {
            // Check for material change
            if (canvas.dataset.formula !== curFormula) {
              rebuildPositions();
              particles = [];
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

            // Spawn particles on decompose transition
            if (isDecomposed && !wasDecomposed) {
              for (var pi = 0; pi < 40; pi++) {
                var angle = Math.random() * Math.PI * 2;
                var speed = 1 + Math.random() * 3;
                particles.push({ x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: els.length > 0 ? els[Math.floor(Math.random() * els.length)].color : '#f59e0b', size: 2 + Math.random() * 4 });
              }
            }
            wasDecomposed = isDecomposed;

            // Clear
            c.clearRect(0, 0, w, ht);

            // Background — dark science theme
            var bgGrad = c.createRadialGradient(cx, cy, 20, cx, cy, Math.max(w, ht) * 0.7);
            bgGrad.addColorStop(0, '#1e293b');
            bgGrad.addColorStop(1, '#0f172a');
            c.fillStyle = bgGrad;
            c.fillRect(0, 0, w, ht);

            // Subtle dot grid
            c.fillStyle = 'rgba(99,102,241,0.08)';
            for (var gx = 20; gx < w; gx += 20) {
              for (var gy = 20; gy < ht; gy += 20) {
                c.beginPath(); c.arc(gx, gy, 0.5, 0, Math.PI * 2); c.fill();
              }
            }

            // Lerp positions toward targets
            for (var i = 0; i < n; i++) {
              if (curPositions[i]) {
                curPositions[i].x += (targets[i].x - curPositions[i].x) * 0.06;
                curPositions[i].y += (targets[i].y - curPositions[i].y) * 0.06;
              }
            }

            // Draw bond lines (when assembled) — glowing
            if (!isDecomposed && n > 1) {
              for (var bi = 0; bi < n; bi++) {
                for (var bj = bi + 1; bj < n; bj++) {
                  if (curPositions[bi] && curPositions[bj]) {
                    // Glow
                    c.save();
                    c.shadowColor = 'rgba(148,163,184,0.4)';
                    c.shadowBlur = 8;
                    c.strokeStyle = 'rgba(148,163,184,0.6)';
                    c.lineWidth = 3;
                    c.setLineDash([]);
                    c.beginPath();
                    c.moveTo(curPositions[bi].x, curPositions[bi].y);
                    c.lineTo(curPositions[bj].x, curPositions[bj].y);
                    c.stroke();
                    c.restore();
                    // Electron dots moving along bonds
                    var bondT = (frame * 0.02 + bi * 0.3 + bj * 0.7) % 1;
                    var edx = curPositions[bi].x + (curPositions[bj].x - curPositions[bi].x) * bondT;
                    var edy = curPositions[bi].y + (curPositions[bj].y - curPositions[bi].y) * bondT;
                    c.fillStyle = '#a5b4fc';
                    c.beginPath(); c.arc(edx, edy, 2.5, 0, Math.PI * 2); c.fill();
                  }
                }
              }
            }

            // Draw ghost bonds when decomposed
            if (isDecomposed && n > 1) {
              c.strokeStyle = 'rgba(100,116,139,0.2)';
              c.lineWidth = 1;
              c.setLineDash([4, 6]);
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

            // Draw particles
            for (var pk = particles.length - 1; pk >= 0; pk--) {
              var p = particles[pk];
              p.x += p.vx; p.y += p.vy;
              p.vx *= 0.97; p.vy *= 0.97;
              p.life -= 0.015;
              if (p.life <= 0) { particles.splice(pk, 1); continue; }
              c.globalAlpha = p.life * 0.8;
              c.fillStyle = p.color;
              c.beginPath(); c.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); c.fill();
            }
            c.globalAlpha = 1;

            // Draw element spheres
            for (var ei = 0; ei < n; ei++) {
              var el = els[ei];
              if (!curPositions[ei]) continue;
              var wobbleX = Math.sin(frame * 0.03 + ei * 2.1) * (isDecomposed ? 4 : 1.5);
              var wobbleY = Math.cos(frame * 0.025 + ei * 1.8) * (isDecomposed ? 4 : 1.5);
              var px = curPositions[ei].x + wobbleX;
              var py = curPositions[ei].y + wobbleY;
              var atomR = 22 + Math.min(el.count, 15) * 1.5;
              var pulse = 1 + Math.sin(frame * 0.04 + ei) * 0.03;
              atomR *= pulse;

              // Electron cloud glow
              c.save();
              var cloudGrad = c.createRadialGradient(px, py, atomR * 0.5, px, py, atomR * 2);
              cloudGrad.addColorStop(0, el.color + '20');
              cloudGrad.addColorStop(1, 'rgba(0,0,0,0)');
              c.fillStyle = cloudGrad;
              c.beginPath(); c.arc(px, py, atomR * 2, 0, Math.PI * 2); c.fill();
              c.restore();

              // Orbiting electron ring
              c.save();
              c.strokeStyle = el.color + '30';
              c.lineWidth = 1;
              c.beginPath();
              c.ellipse(px, py, atomR * 1.5, atomR * 0.6, frame * 0.01 + ei * 0.5, 0, Math.PI * 2);
              c.stroke();
              // Orbiting electron dot
              var orbitA = frame * 0.05 + ei * 1.2;
              var orbX = px + Math.cos(orbitA) * atomR * 1.5;
              var orbY = py + Math.sin(orbitA) * atomR * 0.6;
              c.fillStyle = '#e2e8f0';
              c.beginPath(); c.arc(orbX, orbY, 2, 0, Math.PI * 2); c.fill();
              c.restore();

              // Shadow
              c.fillStyle = 'rgba(0,0,0,0.3)';
              c.beginPath(); c.arc(px + 2, py + 3, atomR, 0, Math.PI * 2); c.fill();

              // Main sphere gradient
              var grad = c.createRadialGradient(px - atomR * 0.3, py - atomR * 0.3, atomR * 0.1, px, py, atomR);
              grad.addColorStop(0, lightenColor(el.color, 60));
              grad.addColorStop(0.7, el.color);
              grad.addColorStop(1, lightenColor(el.color, -30));
              c.fillStyle = grad;
              c.beginPath(); c.arc(px, py, atomR, 0, Math.PI * 2); c.fill();

              // Specular highlight
              c.fillStyle = 'rgba(255,255,255,0.25)';
              c.beginPath(); c.arc(px - atomR * 0.25, py - atomR * 0.25, atomR * 0.35, 0, Math.PI * 2); c.fill();

              // Element symbol
              c.fillStyle = '#ffffff';
              c.font = 'bold ' + Math.round(atomR * 0.65) + 'px system-ui, sans-serif';
              c.textAlign = 'center'; c.textBaseline = 'middle';
              c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 3;
              c.fillText(el.sym, px, py);
              c.shadowBlur = 0;

              // Count badge
              if (el.count > 1) {
                var bx = px + atomR * 0.65;
                var by = py - atomR * 0.65;
                c.fillStyle = '#f59e0b';
                c.beginPath(); c.arc(bx, by, 11, 0, Math.PI * 2); c.fill();
                c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
                c.fillStyle = '#fff'; c.font = 'bold 10px system-ui, sans-serif';
                c.fillText('\u00D7' + el.count, bx, by);
              }

              // Element name below
              c.fillStyle = '#94a3b8';
              c.font = '10px system-ui, sans-serif';
              c.fillText(el.name, px, py + atomR + 14);
            }

            // Title
            c.fillStyle = '#e2e8f0';
            c.font = 'bold 14px system-ui, sans-serif';
            c.textAlign = 'center'; c.textBaseline = 'alphabetic';
            c.fillText((canvas.dataset.materialName || '') + '  (' + (canvas.dataset.formula || '') + ')', w / 2, 22);

            // Status badge
            c.save();
            var stLabel = isDecomposed ? '\u26A1 DECOMPOSED' : '\u269B ASSEMBLED';
            var stColor = isDecomposed ? '#ef4444' : '#22c55e';
            c.font = 'bold 10px system-ui, sans-serif';
            var stW = c.measureText(stLabel).width + 16;
            c.fillStyle = stColor + '25';
            c.beginPath();
            c.roundRect(w / 2 - stW / 2, ht - 24, stW, 18, 9);
            c.fill();
            c.fillStyle = stColor;
            c.fillText(stLabel, w / 2, ht - 12);
            c.restore();

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
          { id: 'states', label: '\uD83C\uDF21\uFE0F States', color: 'sky' },
          { id: 'visualize', label: '\uD83C\uDFA8 Atoms', color: 'indigo' },
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
            }, h(ArrowLeft, { size: 18, className: 'text-slate-600' })),
            h('h3', { className: 'text-lg font-bold text-slate-800' }, '\u2697\uFE0F Material Decomposer'),
            h('span', { className: 'px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-full' },
              totalAtoms + ' ATOMS'
            ),
            badges.length > 0 && h('span', { className: 'px-2 py-0.5 bg-purple-100 text-purple-700 text-[11px] font-bold rounded-full' },
              '\uD83C\uDFC5 ' + badges.length + '/' + BADGES.length
            )
          ),

          /* ── Grade-band intro ── */
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3 mb-3' },
            h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, gradeBandIntro()),
            h('button', { 'aria-label': 'Read aloud',
              onClick: function() { speakText(gradeBandIntro()); },
              className: 'mt-1 text-[11px] text-amber-600 hover:text-amber-800 font-bold'
            }, '\uD83D\uDD0A Read aloud')
          ),

          /* ── Tab bar ── */
          h('div', { className: 'flex gap-1 mb-4 bg-slate-100 rounded-xl p-1', role: 'tablist', 'aria-label': 'Decomposer Lab sections' },
            TABS.map(function(t) {
              var active = tab === t.id;
              return h('button', { 'aria-label': 'Change tab',
                key: t.id,
                onClick: function() { upd('tab', t.id); },
                role: 'tab', 'aria-selected': active,
                className: 'flex-1 py-2 rounded-lg text-xs font-bold transition-all '
                  + (active
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-700 hover:bg-slate-50')
              }, t.label);
            })
          ),

          /* ── Material selector chips (always visible) ── */
          h('div', { className: 'flex flex-wrap gap-1.5 mb-4' },
            MATERIALS.map(function(m) {
              return h('button', { 'aria-label': 'Decomposer action',
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
                  h('p', { className: 'text-xs text-slate-600 mt-1 leading-relaxed' }, sel.desc),
                  h('div', { className: 'flex gap-3 mt-2 text-[11px] font-bold' },
                    h('span', { className: 'text-cyan-600' }, '\uD83D\uDD17 ' + sel.bondType),
                    h('span', { className: 'text-indigo-600' }, '\uD83D\uDCCA ' + sel.state),
                    h('span', { className: 'text-emerald-600' }, '\u2696 ' + sel.molarMass)
                  )
                )
              ),

              /* Decompose / reassemble button */
              h('button', { 'aria-label': 'Decomposer action',
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
                    ? 'bg-amber-700 text-white shadow-lg'
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
                        h('span', { className: 'text-[11px] font-bold text-slate-600 mt-1' }, el.name),
                        h('span', { className: 'text-[11px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full mt-0.5' },
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
                        h('div', { className: 'text-[11px] opacity-70' }, el.num),
                        h('div', { className: 'text-base font-black' }, el.sym)
                      )
                    ),
                    h('div', null,
                      h('p', { className: 'font-bold text-sm text-slate-800' }, el.name),
                      h('p', { className: 'text-[11px] text-slate-600' }, el.group + ' \u00B7 ' + el.mass + ' u')
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
                  h('p', { className: 'text-[11px] text-slate-600 mt-1' },
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
                  h('button', { 'aria-label': 'Compare Molecules',
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
                  h('button', { 'aria-label': 'Close',
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
                        h('div', { className: 'text-xs font-mono text-slate-600' }, mat.formula)
                      ),
                      h('div', { className: 'space-y-1' },
                        mat.elements.map(function(el) {
                          return h('div', { key: el.sym, className: 'flex items-center gap-1.5' },
                            h('div', {
                              className: 'w-6 h-6 rounded flex items-center justify-center text-white text-[11px] font-bold',
                              style: { background: el.color }
                            }, el.sym),
                            h('div', { className: 'flex-1 h-2 bg-slate-100 rounded-full overflow-hidden' },
                              h('div', {
                                className: 'h-full rounded-full',
                                style: { width: Math.round(el.count / tc * 100) + '%', background: el.color }
                              })
                            ),
                            h('span', { className: 'text-[11px] font-bold text-slate-600 w-5 text-right' },
                              '\u00D7' + el.count
                            )
                          );
                        })
                      ),
                      h('div', { className: 'mt-2 grid grid-cols-3 gap-1 text-center text-[11px]' },
                        h('div', { className: 'bg-slate-50 rounded p-1' },
                          h('div', { className: 'font-bold text-slate-600' }, 'Atoms'),
                          h('div', { className: 'font-black text-slate-700' }, tc)
                        ),
                        h('div', { className: 'bg-slate-50 rounded p-1' },
                          h('div', { className: 'font-bold text-slate-600' }, 'Bond'),
                          h('div', { className: 'font-black text-slate-700' }, mat.bondType)
                        ),
                        h('div', { className: 'bg-slate-50 rounded p-1' },
                          h('div', { className: 'font-bold text-slate-600' }, 'State'),
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
                h('p', { className: 'text-[11px] font-bold text-cyan-600 uppercase tracking-wider mb-1' }, '\uD83C\uDF0D Real World'),
                h('button', { 'aria-label': 'Speak Text',
                  onClick: function() { speakText(sel.realUse); },
                  className: 'text-[11px] text-cyan-500 hover:text-cyan-700 font-bold'
                }, '\uD83D\uDD0A')
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, sel.realUse)
            ),

            /* Safety info */
            MATERIAL_EXTRAS[sel.name] ? h('div', { className: 'rounded-xl border p-3 mb-3 ' + (MATERIAL_EXTRAS[sel.name].safety.indexOf('\u26A0') >= 0 || MATERIAL_EXTRAS[sel.name].safety.indexOf('\u2620') >= 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200') },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-[11px] font-bold uppercase tracking-wider ' + (MATERIAL_EXTRAS[sel.name].safety.indexOf('\u26A0') >= 0 || MATERIAL_EXTRAS[sel.name].safety.indexOf('\u2620') >= 0 ? 'text-red-600' : 'text-green-600') }, '\uD83D\uDEE1\uFE0F Safety'),
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
                  h('span', { className: 'text-[11px] font-bold text-violet-600 uppercase tracking-wider' }, '\uD83D\uDCA1 Did You Know?'),
                  h('button', { 'aria-label': 'Next',
                    onClick: function() { upd('_factIdx', factIdx + 1); },
                    className: 'text-[11px] text-violet-500 hover:text-violet-700 font-bold'
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
              h('p', { className: 'text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2' }, '\u269B\uFE0F Element Details'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                sel.elements.map(function(el) {
                  return h('div', { key: el.sym, className: 'bg-white rounded-lg border border-indigo-100 p-2 flex items-center gap-3' },
                    h('div', {
                      className: 'w-12 h-14 rounded-lg flex flex-col items-center justify-center text-white shadow-sm',
                      style: { background: el.color }
                    },
                      h('span', { className: 'text-[11px] opacity-70' }, el.num),
                      h('span', { className: 'text-lg font-black leading-none' }, el.sym),
                      h('span', { className: 'text-[11px] opacity-80' }, el.mass + ' u')
                    ),
                    h('div', { className: 'flex-1' },
                      h('div', { className: 'font-bold text-sm text-slate-800' }, el.name),
                      h('div', { className: 'text-[11px] text-slate-600' }, el.group),
                      h('div', { className: 'text-[11px] font-bold text-amber-600 mt-0.5' }, '\u00D7' + el.count + ' in ' + sel.formula)
                    )
                  );
                })
              )
            ) : null,

            /* Molar mass calculator */
            h('div', { className: 'bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-3 mb-3' },
              h('p', { className: 'text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-2' }, '\u2696 Mass Breakdown'),
              h('div', { className: 'space-y-1' },
                sel.elements.map(function(el) {
                  var contribution = (el.count * parseFloat(el.mass)).toFixed(3);
                  var percent = ((el.count * parseFloat(el.mass)) / parseFloat(sel.molarMass) * 100).toFixed(1);
                  return h('div', { key: el.sym, className: 'flex items-center gap-2 text-xs' },
                    h('span', { className: 'font-bold text-slate-700 w-16' }, el.count + ' \u00D7 ' + el.sym),
                    h('span', { className: 'text-slate-600 w-20' }, el.count + ' \u00D7 ' + el.mass),
                    h('span', { className: 'font-bold text-slate-700 w-16' }, '= ' + contribution),
                    h('div', { className: 'flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden' },
                      h('div', {
                        className: 'h-full rounded-full',
                        style: { width: percent + '%', background: el.color }
                      })
                    ),
                    h('span', { className: 'text-slate-600 font-bold w-12 text-right' }, percent + '%')
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
              // Scene selection hero banner
              h('div', { className: 'relative rounded-2xl overflow-hidden mb-5', style: { background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 50%, #0f172a 100%)', padding: '24px 20px' } },
                // Decorative floating molecule icons
                h('div', { className: 'absolute inset-0 overflow-hidden pointer-events-none', style: { opacity: 0.08 } },
                  h('span', { style: { position: 'absolute', fontSize: 40, top: '10%', left: '5%' } }, '\u269B\uFE0F'),
                  h('span', { style: { position: 'absolute', fontSize: 28, top: '60%', right: '8%' } }, '\uD83E\uDDEA'),
                  h('span', { style: { position: 'absolute', fontSize: 22, bottom: '15%', left: '35%' } }, '\u2697\uFE0F'),
                  h('span', { style: { position: 'absolute', fontSize: 34, top: '5%', right: '25%' } }, '\uD83D\uDD2C')
                ),
                h('div', { className: 'relative text-center' },
                  h('h4', { className: 'text-xl font-black text-white mb-1 flex items-center justify-center gap-2' }, '\uD83E\uDDEA Chemistry Hunt'),
                  h('p', { className: 'text-xs text-indigo-300 leading-relaxed max-w-sm mx-auto' }, 'Explore real-world scenes. Can you find the object that contains each chemical compound?'),
                  huntScore > 0 ? h('div', { className: 'flex items-center justify-center gap-3 mt-3' },
                    h('span', { className: 'px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-900 border border-amber-500/30' }, '\u2B50 Score: ' + huntScore),
                    huntStreak >= 2 ? h('span', { className: 'px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-900 border border-orange-500/30' }, '\uD83D\uDD25 Streak: ' + huntStreak) : null
                  ) : null
                )
              ),
              // Scene cards
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                SCENES.map(function(scene) {
                  var sceneFound = 0;
                  scene.objects.forEach(function(obj) { if (foundObjects[obj.id]) sceneFound++; });
                  var complete = sceneFound === scene.objects.length;
                  var pct = Math.round(sceneFound / scene.objects.length * 100);
                  return h('button', { 'aria-label': 'Decomposer action',
                    key: scene.id,
                    onClick: function() {
                      SOUNDS.sceneSwitch();
                      var visited = Object.assign({}, scenesVisited);
                      visited[scene.id] = true;
                      var unfound = scene.objects.filter(function(o) { return !foundObjects[o.id]; });
                      var target = unfound.length > 0 ? unfound[Math.floor(Math.random() * unfound.length)] : null;
                      updMulti({ activeScene: scene.id, scenesVisited: visited, selectedSceneObj: null, huntTarget: target ? target.id : null, huntWrongGuess: null });
                    },
                    className: 'group relative rounded-2xl p-4 text-left border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ' +
                      (complete ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50' : 'border-slate-200 bg-white hover:border-indigo-300'),
                    style: { borderLeftWidth: '6px', borderLeftColor: scene.accent, overflow: 'hidden' }
                  },
                    // Background scene tint
                    h('div', { className: 'absolute inset-0 opacity-[0.04] pointer-events-none', style: { background: scene.accent } }),
                    h('div', { className: 'relative flex items-center gap-3' },
                      h('div', {
                        className: 'flex items-center justify-center shrink-0 rounded-xl transition-transform duration-200 group-hover:scale-110',
                        style: { width: 48, height: 48, background: scene.bgColor, border: '2px solid ' + scene.accent + '40' }
                      }, h('span', { className: 'text-2xl' }, scene.icon)),
                      h('div', { className: 'flex-1 min-w-0' },
                        h('div', { className: 'font-bold text-slate-800 text-sm flex items-center gap-1.5' },
                          scene.name,
                          complete ? h('span', { className: 'text-emerald-500 text-xs' }, '\u2705') : null
                        ),
                        h('p', { className: 'text-[11px] text-slate-600 mt-0.5 line-clamp-1' }, scene.desc),
                        h('div', { className: 'flex items-center gap-2 mt-2' },
                          h('div', { className: 'flex-1 h-2 rounded-full overflow-hidden', style: { background: complete ? '#d1fae5' : '#f1f5f9' } },
                            h('div', { className: 'h-full rounded-full transition-all duration-500', style: { width: pct + '%', background: complete ? '#10b981' : scene.accent } })
                          ),
                          h('span', { className: 'text-[11px] font-bold min-w-[28px] text-right ' + (complete ? 'text-emerald-600' : 'text-slate-600') }, pct + '%')
                        )
                      )
                    )
                  );
                })
              ),
              // Global progress footer
              (function() {
                var totalFound = Object.keys(foundObjects).length;
                var totalObjects = SCENES.reduce(function(s, sc) { return s + sc.objects.length; }, 0);
                var globalPct = Math.round(totalFound / totalObjects * 100);
                return h('div', { className: 'mt-5 rounded-2xl overflow-hidden border', style: { borderColor: globalPct === 100 ? '#10b981' : '#e2e8f0' } },
                  h('div', { className: 'px-4 py-3 flex items-center justify-between', style: { background: globalPct === 100 ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)' } },
                    h('div', { className: 'flex items-center gap-2' },
                      h('span', { className: 'text-lg' }, globalPct === 100 ? '\uD83C\uDFC6' : '\uD83D\uDD0E'),
                      h('div', null,
                        h('span', { className: 'text-xs font-bold', style: { color: globalPct === 100 ? '#065f46' : '#92400e' } }, globalPct === 100 ? 'All Compounds Discovered!' : 'Total Progress'),
                        h('p', { className: 'text-[11px]', style: { color: globalPct === 100 ? '#047857' : '#b45309' } }, totalFound + ' of ' + totalObjects + ' compounds identified')
                      )
                    ),
                    h('span', { className: 'text-sm font-black', style: { color: globalPct === 100 ? '#059669' : '#d97706' } }, globalPct + '%')
                  ),
                  h('div', { className: 'h-1.5', style: { background: '#f1f5f9' } },
                    h('div', { className: 'h-full transition-all duration-700', style: { width: globalPct + '%', background: globalPct === 100 ? '#10b981' : 'linear-gradient(90deg, #f59e0b, #d97706)' } })
                  )
                );
              })()
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
                h('div', { className: 'flex items-center gap-3 mb-4 rounded-2xl p-3', style: { background: 'linear-gradient(135deg, ' + scene.bgColor + ', ' + scene.accent + '15)' } },
                  h('button', { 'aria-label': 'Exit decomposition scene', onClick: function() { updMulti({ activeScene: null, selectedSceneObj: null, huntTarget: null, huntWrongGuess: null }); }, className: 'p-2 hover:bg-white/60 rounded-xl transition-colors' }, h(ArrowLeft, { size: 18, className: 'text-slate-600' })),
                  h('div', {
                    className: 'flex items-center justify-center shrink-0 rounded-xl',
                    style: { width: 44, height: 44, background: 'white', border: '2px solid ' + scene.accent + '40', boxShadow: '0 2px 8px ' + scene.accent + '20' }
                  }, h('span', { className: 'text-2xl' }, scene.icon)),
                  h('div', { className: 'flex-1' },
                    h('h4', { className: 'font-bold text-slate-800 text-base' }, scene.name),
                    h('div', { className: 'flex items-center gap-1.5 mt-0.5' },
                      h('div', { className: 'w-16 h-1.5 rounded-full overflow-hidden', style: { background: scene.accent + '20' } },
                        h('div', { className: 'h-full rounded-full transition-all duration-500', style: { width: Math.round(sceneFoundCount / scene.objects.length * 100) + '%', background: scene.accent } })
                      ),
                      h('span', { className: 'text-[11px] font-bold', style: { color: scene.accent } }, sceneFoundCount + '/' + scene.objects.length)
                    )
                  ),
                  h('div', { className: 'flex items-center gap-2' },
                    huntScore > 0 ? h('span', { className: 'px-2 py-1 rounded-full text-[11px] font-bold', style: { background: '#fef3c7', color: '#92400e' } }, '\u2B50 ' + huntScore) : null,
                    huntStreak >= 2 ? h('span', { className: 'px-2 py-1 rounded-full text-[11px] font-bold', style: { background: '#ffedd5', color: '#c2410c' } }, '\uD83D\uDD25 ' + huntStreak) : null,
                    allFoundInScene ? h('span', { className: 'px-2 py-1 rounded-full text-[11px] font-bold', style: { background: '#d1fae5', color: '#065f46' } }, '\u2705 Complete!') : null
                  )
                ),

                // Challenge prompt — "Find the compound!"
                targetObj && targetMat && !allFoundInScene ? h('div', {
                  className: 'relative rounded-2xl border-2 p-4 mb-4 text-center overflow-hidden',
                  style: { borderColor: '#818cf8', background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #ede9fe 100%)' }
                },
                  // Decorative corner atoms
                  h('div', { className: 'absolute top-1 right-2 text-lg opacity-10 pointer-events-none' }, '\u269B\uFE0F'),
                  h('div', { className: 'absolute bottom-1 left-2 text-sm opacity-10 pointer-events-none' }, '\uD83E\uDDEA'),
                  h('p', { className: 'text-[11px] font-bold text-indigo-400 uppercase tracking-[0.15em] mb-2' }, '\uD83D\uDD0E Chemistry Challenge'),
                  h('div', { className: 'inline-flex items-center gap-3 px-5 py-2 rounded-xl', style: { background: 'white', boxShadow: '0 2px 12px rgba(99,102,241,0.15)' } },
                    h('span', { className: 'text-2xl font-mono font-black', style: { color: '#312e81' } }, targetMat.formula),
                    h('div', { className: 'w-px h-6', style: { background: '#c7d2fe' } }),
                    h('span', { className: 'text-sm font-bold text-indigo-700' }, targetMat.name)
                  ),
                  h('p', { className: 'text-[11px] text-indigo-500 mt-2.5 font-medium' }, 'Tap the object in the scene that contains this compound!'),
                  huntStreak >= 2 ? h('p', { className: 'text-[11px] font-bold text-amber-600 mt-1' }, '\uD83D\uDD25 ' + huntStreak + ' in a row!') : null
                ) : null,

                // Scene complete message
                allFoundInScene ? h('div', {
                  className: 'relative rounded-2xl border-2 p-5 mb-4 text-center overflow-hidden',
                  style: { borderColor: '#34d399', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #ccfbf1 100%)' }
                },
                  h('div', { className: 'absolute inset-0 pointer-events-none overflow-hidden' },
                    h('span', { style: { position: 'absolute', fontSize: 32, top: '5%', left: '8%', opacity: 0.08 } }, '\uD83C\uDF89'),
                    h('span', { style: { position: 'absolute', fontSize: 24, bottom: '10%', right: '10%', opacity: 0.08 } }, '\u2728'),
                    h('span', { style: { position: 'absolute', fontSize: 28, top: '10%', right: '20%', opacity: 0.06 } }, '\uD83C\uDF1F')
                  ),
                  h('p', { className: 'text-2xl mb-1' }, '\uD83C\uDF89'),
                  h('p', { className: 'text-lg font-black text-emerald-800' }, 'Scene Complete!'),
                  h('p', { className: 'text-xs text-emerald-600 mt-1' }, 'You identified every compound in the ' + scene.name + '.'),
                  h('div', { className: 'flex items-center justify-center gap-2 mt-3' },
                    scene.objects.map(function(o) { return h('span', { key: o.id, className: 'text-lg', title: o.name }, o.emoji); })
                  )
                ) : null,

                // Wrong guess feedback
                wrongObj && wrongMat && !foundObjects[huntWrongGuess] ? h('div', { className: 'rounded-2xl border-2 border-red-200 p-3 mb-4 overflow-hidden', style: { background: 'linear-gradient(135deg, #fef2f2, #fee2e2)' } },
                  h('div', { className: 'flex items-center gap-3' },
                    h('div', { 
                      className: 'flex items-center justify-center shrink-0 rounded-xl',
                      style: { width: 40, height: 40, background: 'white', border: '2px solid #fca5a5' }
                    }, h('span', { className: 'text-xl' }, wrongObj.emoji)),
                    h('div', { className: 'flex-1' },
                      h('p', { className: 'text-xs font-bold text-red-700' }, 'Not quite! ' + wrongObj.name + ' contains:'),
                      h('p', { className: 'text-sm font-mono font-bold text-red-800 mt-0.5' }, wrongMat.formula + ' \u2014 ' + wrongMat.name)
                    ),
                    h('button', { 'aria-label': 'Change hunt wrong guess', onClick: function() { upd('huntWrongGuess', null); }, className: 'p-1.5 hover:bg-red-100 rounded-lg transition-colors' }, h(X, { size: 14, className: 'text-red-400' }))
                  ),
                  targetMat ? h('p', { className: 'text-[11px] text-red-500 mt-2 font-medium pl-[52px]' }, '\uD83D\uDCA1 Keep looking for ' + targetMat.formula + ' (' + targetMat.name + ')') : null
                ) : null,

                // Scene visual — all objects always visible
                h('div', { className: 'relative rounded-2xl border-2 overflow-hidden mb-4', style: { borderColor: scene.accent, background: scene.bgColor, minHeight: '320px', boxShadow: '0 4px 20px ' + scene.accent + '15' } },
                  // Canvas background
                  h('canvas', { 'aria-label': 'Decomposer visualization', 
                    ref: function(canvas) {
                      if (!canvas) return;
                      if (canvas._sceneDrawn === scene.id) return;
                      canvas._sceneDrawn = scene.id;
                      var c = canvas.getContext('2d');
                      var dpr = window.devicePixelRatio || 1;
                      var cw = canvas.offsetWidth || 500;
                      var ch = 320;
                      canvas.width = cw * dpr; canvas.height = ch * dpr; canvas.style.height = ch + 'px'; c.scale(dpr, dpr);
                      var bgGrad = c.createLinearGradient(0, 0, 0, ch);
                      bgGrad.addColorStop(0, scene.bgColor); bgGrad.addColorStop(1, scene.accent + '18');
                      c.fillStyle = bgGrad; c.fillRect(0, 0, cw, ch);
                      if (scene.id === 'kitchen') {
                        // Wall
                        var wallGrad = c.createLinearGradient(0, 0, 0, ch * 0.5);
                        wallGrad.addColorStop(0, '#fef9ef'); wallGrad.addColorStop(1, '#fef3c7');
                        c.fillStyle = wallGrad; c.fillRect(0, 0, cw, ch * 0.5);
                        // Backsplash tiles
                        c.strokeStyle = '#fde68a'; c.lineWidth = 0.4;
                        for (var bx = 0; bx < cw; bx += 22) { for (var by = ch * 0.28; by < ch * 0.5; by += 16) { c.strokeRect(bx, by, 22, 16); } }
                        // Countertop
                        var ctrGrad = c.createLinearGradient(0, ch * 0.48, 0, ch * 0.54);
                        ctrGrad.addColorStop(0, '#e8d5b7'); ctrGrad.addColorStop(0.5, '#d4a574'); ctrGrad.addColorStop(1, '#c49a6c');
                        c.fillStyle = ctrGrad; c.fillRect(0, ch * 0.48, cw, ch * 0.06);
                        c.strokeStyle = '#a0845c'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, ch * 0.48); c.lineTo(cw, ch * 0.48); c.stroke();
                        // Lower cabinets
                        c.fillStyle = '#c8a882'; c.fillRect(0, ch * 0.54, cw, ch * 0.46);
                        c.strokeStyle = '#a0845c'; c.lineWidth = 1;
                        var cabW = cw / 5;
                        for (var ci = 0; ci < 5; ci++) {
                          c.strokeRect(ci * cabW + 4, ch * 0.57, cabW - 8, ch * 0.38);
                          c.fillStyle = '#b8956e'; c.beginPath(); c.arc(ci * cabW + cabW / 2, ch * 0.76, 3, 0, Math.PI * 2); c.fill();
                          c.fillStyle = '#c8a882';
                        }
                        // Upper cabinets
                        c.fillStyle = '#c8a882';
                        c.fillRect(cw * 0.02, ch * 0.04, cw * 0.25, ch * 0.22); c.strokeRect(cw * 0.02, ch * 0.04, cw * 0.25, ch * 0.22);
                        c.fillRect(cw * 0.73, ch * 0.04, cw * 0.25, ch * 0.22); c.strokeRect(cw * 0.73, ch * 0.04, cw * 0.25, ch * 0.22);
                        c.fillStyle = '#b8956e';
                        c.beginPath(); c.arc(cw * 0.145, ch * 0.15, 3, 0, Math.PI * 2); c.fill();
                        c.beginPath(); c.arc(cw * 0.855, ch * 0.15, 3, 0, Math.PI * 2); c.fill();
                        // Window
                        c.fillStyle = '#bfdbfe'; c.fillRect(cw * 0.36, ch * 0.03, cw * 0.28, ch * 0.24);
                        c.strokeStyle = '#f8fafc'; c.lineWidth = 4; c.strokeRect(cw * 0.36, ch * 0.03, cw * 0.28, ch * 0.24);
                        c.lineWidth = 2; c.beginPath(); c.moveTo(cw * 0.50, ch * 0.03); c.lineTo(cw * 0.50, ch * 0.27); c.stroke();
                        c.beginPath(); c.moveTo(cw * 0.36, ch * 0.15); c.lineTo(cw * 0.64, ch * 0.15); c.stroke();
                        // Sunlight glow through window
                        c.fillStyle = 'rgba(253,224,71,0.15)'; c.fillRect(cw * 0.38, ch * 0.28, cw * 0.24, ch * 0.20);
                        // Stove burner outlines
                        c.strokeStyle = '#78716c'; c.lineWidth = 1.5;
                        c.beginPath(); c.arc(cw * 0.40, ch * 0.50, 8, 0, Math.PI * 2); c.stroke();
                        c.beginPath(); c.arc(cw * 0.52, ch * 0.50, 8, 0, Math.PI * 2); c.stroke();
                      } else if (scene.id === 'bathroom') {
                        // Tile wall
                        c.fillStyle = '#e0f2fe'; c.fillRect(0, 0, cw, ch * 0.65);
                        c.strokeStyle = '#bae6fd'; c.lineWidth = 0.5;
                        for (var tx = 0; tx < cw; tx += 28) { c.beginPath(); c.moveTo(tx, 0); c.lineTo(tx, ch * 0.65); c.stroke(); }
                        for (var ty = 0; ty < ch * 0.65; ty += 28) { c.beginPath(); c.moveTo(0, ty); c.lineTo(cw, ty); c.stroke(); }
                        // Accent tile row
                        c.fillStyle = '#93c5fd';
                        for (var atx = 0; atx < cw; atx += 28) { c.fillRect(atx + 1, ch * 0.28, 26, 26); }
                        // Floor
                        var floorGrad = c.createLinearGradient(0, ch * 0.65, 0, ch);
                        floorGrad.addColorStop(0, '#e2e8f0'); floorGrad.addColorStop(1, '#cbd5e1');
                        c.fillStyle = floorGrad; c.fillRect(0, ch * 0.65, cw, ch * 0.35);
                        // Floor tile pattern
                        c.strokeStyle = '#94a3b8'; c.lineWidth = 0.3;
                        for (var ftx = 0; ftx < cw; ftx += 40) { c.strokeRect(ftx, ch * 0.65, 40, 40); }
                        // Mirror (oval with shine)
                        c.fillStyle = '#c7d2fe'; c.beginPath(); c.ellipse(cw * 0.55, ch * 0.18, cw * 0.11, ch * 0.13, 0, 0, Math.PI * 2); c.fill();
                        c.strokeStyle = '#818cf8'; c.lineWidth = 4; c.stroke();
                        c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(cw * 0.52, ch * 0.14, cw * 0.04, ch * 0.06, -0.3, 0, Math.PI * 2); c.fill();
                        // Sink vanity
                        c.fillStyle = '#f1f5f9'; c.fillRect(cw * 0.10, ch * 0.38, cw * 0.34, ch * 0.18);
                        c.strokeStyle = '#94a3b8'; c.lineWidth = 2; c.strokeRect(cw * 0.10, ch * 0.38, cw * 0.34, ch * 0.18);
                        // Sink bowl
                        c.fillStyle = '#e0f2fe'; c.beginPath(); c.ellipse(cw * 0.27, ch * 0.45, cw * 0.08, ch * 0.04, 0, 0, Math.PI * 2); c.fill();
                        c.strokeStyle = '#94a3b8'; c.lineWidth = 1; c.stroke();
                        // Bathtub
                        c.fillStyle = '#f8fafc';
                        c.beginPath();
                        c.moveTo(cw * 0.62, ch * 0.60); c.quadraticCurveTo(cw * 0.60, ch * 0.80, cw * 0.65, ch * 0.82);
                        c.lineTo(cw * 0.92, ch * 0.82); c.quadraticCurveTo(cw * 0.97, ch * 0.80, cw * 0.95, ch * 0.60);
                        c.closePath(); c.fill();
                        c.strokeStyle = '#94a3b8'; c.lineWidth = 2; c.stroke();
                        // Shower head
                        c.strokeStyle = '#94a3b8'; c.lineWidth = 2;
                        c.beginPath(); c.moveTo(cw * 0.92, ch * 0.10); c.lineTo(cw * 0.92, ch * 0.35); c.lineTo(cw * 0.85, ch * 0.35); c.stroke();
                        c.fillStyle = '#94a3b8'; c.beginPath(); c.arc(cw * 0.85, ch * 0.35, 6, 0, Math.PI * 2); c.fill();
                        // Water droplets
                        c.fillStyle = 'rgba(96,165,250,0.3)';
                        c.beginPath(); c.arc(cw * 0.83, ch * 0.42, 2, 0, Math.PI * 2); c.fill();
                        c.beginPath(); c.arc(cw * 0.87, ch * 0.44, 2, 0, Math.PI * 2); c.fill();
                        c.beginPath(); c.arc(cw * 0.85, ch * 0.47, 2, 0, Math.PI * 2); c.fill();
                      } else if (scene.id === 'garage') {
                        // Back wall
                        c.fillStyle = '#d1d5db'; c.fillRect(0, 0, cw, ch * 0.6);
                        // Brick texture on wall
                        c.strokeStyle = '#b0b8c4'; c.lineWidth = 0.3;
                        for (var bry = 4; bry < ch * 0.6; bry += 12) {
                          var bOff = (Math.floor(bry / 12) % 2) * 16;
                          for (var brx = bOff; brx < cw; brx += 32) { c.strokeRect(brx, bry, 30, 10); }
                        }
                        // Concrete floor
                        var flGrad = c.createLinearGradient(0, ch * 0.6, 0, ch);
                        flGrad.addColorStop(0, '#9ca3af'); flGrad.addColorStop(1, '#94a3b8');
                        c.fillStyle = flGrad; c.fillRect(0, ch * 0.6, cw, ch * 0.4);
                        // Oil stain
                        c.fillStyle = 'rgba(55,48,42,0.15)'; c.beginPath(); c.ellipse(cw * 0.35, ch * 0.78, 30, 12, 0, 0, Math.PI * 2); c.fill();
                        // Pegboard with pegs
                        c.fillStyle = '#c8b89a'; c.fillRect(cw * 0.58, ch * 0.08, cw * 0.38, ch * 0.45);
                        c.strokeStyle = '#a0845c'; c.lineWidth = 2; c.strokeRect(cw * 0.58, ch * 0.08, cw * 0.38, ch * 0.45);
                        c.fillStyle = '#b8a888';
                        for (var px = cw * 0.62; px < cw * 0.94; px += 18) {
                          for (var py = ch * 0.14; py < ch * 0.48; py += 18) {
                            c.beginPath(); c.arc(px, py, 2, 0, Math.PI * 2); c.fill();
                          }
                        }
                        // Shelves on pegboard
                        c.fillStyle = '#78716c';
                        c.fillRect(cw * 0.60, ch * 0.18, cw * 0.35, ch * 0.03);
                        c.fillRect(cw * 0.60, ch * 0.36, cw * 0.35, ch * 0.03);
                        // Garage door outline
                        c.strokeStyle = '#94a3b8'; c.lineWidth = 3; c.strokeRect(cw * 0.03, ch * 0.03, cw * 0.50, ch * 0.54);
                        // Garage door panels
                        c.strokeStyle = '#9ca3af'; c.lineWidth = 1;
                        c.beginPath(); c.moveTo(cw * 0.03, ch * 0.20); c.lineTo(cw * 0.53, ch * 0.20); c.stroke();
                        c.beginPath(); c.moveTo(cw * 0.03, ch * 0.38); c.lineTo(cw * 0.53, ch * 0.38); c.stroke();
                        // Light bulb
                        c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(cw * 0.28, ch * 0.03, 6, 0, Math.PI); c.fill();
                        c.fillStyle = 'rgba(251,191,36,0.1)'; c.beginPath(); c.arc(cw * 0.28, ch * 0.05, 30, 0, Math.PI * 2); c.fill();
                        // Workbench
                        c.fillStyle = '#a0845c'; c.fillRect(cw * 0.04, ch * 0.58, cw * 0.48, ch * 0.04);
                        c.fillStyle = '#78716c'; c.fillRect(cw * 0.08, ch * 0.62, cw * 0.03, ch * 0.18);
                        c.fillRect(cw * 0.45, ch * 0.62, cw * 0.03, ch * 0.18);
                      } else if (scene.id === 'classroom') {
                        // Wall
                        c.fillStyle = '#fdf4ff'; c.fillRect(0, 0, cw, ch);
                        // Chalkboard
                        var boardGrad = c.createLinearGradient(cw * 0.08, ch * 0.04, cw * 0.08, ch * 0.36);
                        boardGrad.addColorStop(0, '#14532d'); boardGrad.addColorStop(1, '#166534');
                        c.fillStyle = boardGrad; c.fillRect(cw * 0.08, ch * 0.04, cw * 0.84, ch * 0.32);
                        // Chalk tray
                        c.fillStyle = '#a16207'; c.fillRect(cw * 0.08, ch * 0.36, cw * 0.84, ch * 0.03);
                        // Board frame
                        c.strokeStyle = '#92400e'; c.lineWidth = 5; c.strokeRect(cw * 0.08, ch * 0.04, cw * 0.84, ch * 0.35);
                        // Chalk text
                        c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = 'bold 14px serif'; c.textAlign = 'center';
                        c.fillText('H\u2082O    NaCl    CO\u2082    CaCO\u2083', cw * 0.5, ch * 0.18);
                        c.font = '11px serif'; c.fillStyle = 'rgba(255,255,255,0.4)';
                        c.fillText('Chemistry is everywhere!', cw * 0.5, ch * 0.30);
                        // Chalk dust marks
                        c.fillStyle = 'rgba(255,255,255,0.12)';
                        for (var di = 0; di < 8; di++) { c.beginPath(); c.arc(cw * (0.15 + Math.random() * 0.7), ch * (0.08 + Math.random() * 0.24), 3 + Math.random() * 5, 0, Math.PI * 2); c.fill(); }
                        // Lab table
                        c.fillStyle = '#1c1917'; c.fillRect(cw * 0.05, ch * 0.44, cw * 0.9, ch * 0.05);
                        c.fillStyle = '#78716c';
                        c.fillRect(cw * 0.10, ch * 0.49, cw * 0.03, ch * 0.20);
                        c.fillRect(cw * 0.87, ch * 0.49, cw * 0.03, ch * 0.20);
                        // Floor
                        c.fillStyle = '#f5f0e8'; c.fillRect(0, ch * 0.70, cw, ch * 0.30);
                        c.strokeStyle = '#e7e0d5'; c.lineWidth = 0.4;
                        for (var fy = ch * 0.70; fy < ch; fy += 20) { for (var fx = 0; fx < cw; fx += 30) { c.strokeRect(fx, fy, 30, 20); } }
                        // Periodic table poster on side wall
                        c.fillStyle = '#dbeafe'; c.fillRect(cw * 0.02, ch * 0.06, cw * 0.05, ch * 0.12);
                        c.strokeStyle = '#93c5fd'; c.lineWidth = 1; c.strokeRect(cw * 0.02, ch * 0.06, cw * 0.05, ch * 0.12);
                        c.fillStyle = '#60a5fa'; c.font = '5px sans-serif'; c.textAlign = 'center'; c.fillText('PT', cw * 0.045, ch * 0.13);
                        // Stool
                        c.fillStyle = '#78716c';
                        c.beginPath(); c.arc(cw * 0.25, ch * 0.66, 10, 0, Math.PI * 2); c.fill();
                        c.fillRect(cw * 0.247, ch * 0.67, 3, ch * 0.10);
                      } else if (scene.id === 'outdoors') {
                        // Sky gradient
                        var skyGrad = c.createLinearGradient(0, 0, 0, ch * 0.55);
                        skyGrad.addColorStop(0, '#38bdf8'); skyGrad.addColorStop(0.5, '#7dd3fc'); skyGrad.addColorStop(1, '#bae6fd');
                        c.fillStyle = skyGrad; c.fillRect(0, 0, cw, ch * 0.55);
                        // Sun with rays
                        c.fillStyle = 'rgba(251,191,36,0.15)'; c.beginPath(); c.arc(cw * 0.85, ch * 0.12, 35, 0, Math.PI * 2); c.fill();
                        c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(cw * 0.85, ch * 0.12, 18, 0, Math.PI * 2); c.fill();
                        c.fillStyle = '#fde68a'; c.beginPath(); c.arc(cw * 0.85, ch * 0.12, 12, 0, Math.PI * 2); c.fill();
                        // Clouds (fluffy)
                        c.fillStyle = 'rgba(255,255,255,0.85)';
                        c.beginPath(); c.arc(cw * 0.20, ch * 0.10, 14, 0, Math.PI * 2); c.fill();
                        c.beginPath(); c.arc(cw * 0.25, ch * 0.08, 18, 0, Math.PI * 2); c.fill();
                        c.beginPath(); c.arc(cw * 0.30, ch * 0.11, 14, 0, Math.PI * 2); c.fill();
                        c.beginPath(); c.arc(cw * 0.55, ch * 0.14, 12, 0, Math.PI * 2); c.fill();
                        c.beginPath(); c.arc(cw * 0.59, ch * 0.12, 16, 0, Math.PI * 2); c.fill();
                        c.beginPath(); c.arc(cw * 0.63, ch * 0.14, 12, 0, Math.PI * 2); c.fill();
                        // Hills behind grass
                        c.fillStyle = '#4ade80';
                        c.beginPath(); c.moveTo(0, ch * 0.55); c.quadraticCurveTo(cw * 0.25, ch * 0.42, cw * 0.5, ch * 0.52); c.quadraticCurveTo(cw * 0.75, ch * 0.44, cw, ch * 0.55); c.lineTo(cw, ch * 0.55); c.closePath(); c.fill();
                        // Grass
                        var grassGrad = c.createLinearGradient(0, ch * 0.55, 0, ch);
                        grassGrad.addColorStop(0, '#22c55e'); grassGrad.addColorStop(0.5, '#16a34a'); grassGrad.addColorStop(1, '#15803d');
                        c.fillStyle = grassGrad; c.fillRect(0, ch * 0.55, cw, ch * 0.45);
                        // Grass blades
                        c.strokeStyle = '#15803d'; c.lineWidth = 1;
                        for (var gi = 0; gi < 30; gi++) {
                          var gx = Math.random() * cw; var gy = ch * 0.56 + Math.random() * ch * 0.38;
                          c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx - 2, gy - 6 - Math.random() * 5); c.stroke();
                          c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + 3, gy - 5 - Math.random() * 5); c.stroke();
                        }
                        // Tree trunk (textured)
                        c.fillStyle = '#78350f'; c.fillRect(cw * 0.24, ch * 0.22, cw * 0.05, ch * 0.34);
                        c.strokeStyle = '#451a03'; c.lineWidth = 0.5;
                        for (var tri = 0; tri < 6; tri++) { c.beginPath(); c.moveTo(cw * 0.24, ch * (0.25 + tri * 0.05)); c.lineTo(cw * 0.29, ch * (0.26 + tri * 0.05)); c.stroke(); }
                        // Tree foliage (layered)
                        c.fillStyle = '#16a34a'; c.beginPath(); c.arc(cw * 0.265, ch * 0.20, 32, 0, Math.PI * 2); c.fill();
                        c.fillStyle = '#22c55e'; c.beginPath(); c.arc(cw * 0.24, ch * 0.16, 22, 0, Math.PI * 2); c.fill();
                        c.beginPath(); c.arc(cw * 0.30, ch * 0.18, 20, 0, Math.PI * 2); c.fill();
                        c.fillStyle = '#4ade80'; c.beginPath(); c.arc(cw * 0.265, ch * 0.13, 16, 0, Math.PI * 2); c.fill();
                        // Path / stone walkway
                        c.fillStyle = '#d6d3d1'; c.lineWidth = 1;
                        var pathPts = [[0.45, 0.60], [0.47, 0.68], [0.50, 0.76], [0.52, 0.84], [0.54, 0.92]];
                        pathPts.forEach(function(p) { c.beginPath(); c.ellipse(cw * p[0], ch * p[1], 12, 6, 0.2, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#a8a29e'; c.stroke(); });
                        // Fence in background
                        c.strokeStyle = '#a0845c'; c.lineWidth = 2;
                        c.beginPath(); c.moveTo(0, ch * 0.50); c.lineTo(cw * 0.18, ch * 0.50); c.stroke();
                        for (var fi = 0; fi < 4; fi++) { c.fillStyle = '#c8a882'; c.fillRect(cw * (0.02 + fi * 0.05), ch * 0.42, 4, ch * 0.12); }
                        // Flowers
                        c.fillStyle = '#f472b6';
                        c.beginPath(); c.arc(cw * 0.75, ch * 0.62, 4, 0, Math.PI * 2); c.fill();
                        c.fillStyle = '#fb923c';
                        c.beginPath(); c.arc(cw * 0.78, ch * 0.64, 4, 0, Math.PI * 2); c.fill();
                        c.fillStyle = '#a78bfa';
                        c.beginPath(); c.arc(cw * 0.73, ch * 0.65, 3, 0, Math.PI * 2); c.fill();
                        c.strokeStyle = '#15803d'; c.lineWidth = 1;
                        c.beginPath(); c.moveTo(cw * 0.75, ch * 0.63); c.lineTo(cw * 0.75, ch * 0.70); c.stroke();
                        c.beginPath(); c.moveTo(cw * 0.78, ch * 0.65); c.lineTo(cw * 0.78, ch * 0.72); c.stroke();
                      }
                      c.fillStyle = scene.accent; c.globalAlpha = 0.25;
                      c.font = 'bold 10px system-ui, sans-serif'; c.textAlign = 'left';
                      c.fillText(scene.name.toUpperCase(), 8, 16); c.globalAlpha = 1;
                    },
                    className: 'w-full block', style: { height: '320px' }
                  }),

                  // All objects ALWAYS visible as labeled emoji buttons
                  scene.objects.map(function(obj) {
                    var isFound = !!foundObjects[obj.id];
                    var isTarget = huntTarget === obj.id;
                    var isWrong = huntWrongGuess === obj.id;
                    var isSelected = selectedSceneObj === obj.id;
                    return h('button', { 'aria-label': 'Action',
                      key: obj.id,
                      onClick: function() {
                        if (isFound) {
                          SOUNDS.elementClick();
                          upd('selectedSceneObj', isSelected ? null : obj.id);
                          return;
                        }
                        if (huntTarget && obj.id === huntTarget) {
                          SOUNDS.objectFind();
                          var newFound = Object.assign({}, foundObjects);
                          newFound[obj.id] = true;
                          var newScore = huntScore + 1;
                          var newStreak = huntStreak + 1;
                          var updates = { foundObjects: newFound, selectedSceneObj: obj.id, huntScore: newScore, huntStreak: newStreak, huntWrongGuess: null };
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
                          SOUNDS.quizWrong();
                          updMulti({ huntWrongGuess: obj.id, huntStreak: 0 });
                        }
                      },
                      className: 'absolute flex flex-col items-center transition-all duration-300',
                      style: {
                        left: (obj.x * 100) + '%', top: (obj.y * 100) + '%',
                        transform: 'translate(-50%, -50%)' + (isSelected ? ' scale(1.2)' : (isTarget && !isFound ? ' scale(1.05)' : '')),
                        cursor: 'pointer', zIndex: isSelected ? 10 : (isTarget ? 5 : 2),
                        filter: isWrong ? 'saturate(0.3) brightness(0.9)' : 'none'
                      },
                      'aria-label': isFound ? obj.name + ' - identified' : obj.label
                    },
                      // Pulsing ring for current target
                      isTarget && !isFound ? h('div', {
                        className: 'absolute inset-0 rounded-2xl',
                        style: { width: 52, height: 52, left: -4, top: -4, border: '2px solid ' + scene.accent, borderRadius: 16, opacity: 0.4, animation: 'pulse 2s ease-in-out infinite' }
                      }) : null,
                      h('div', {
                        className: 'flex items-center justify-center transition-all duration-300',
                        style: {
                          width: '48px', height: '48px', borderRadius: '14px',
                          background: isFound ? 'rgba(255,255,255,0.97)' : (isTarget && !isFound ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.82)'),
                          border: isFound ? '2.5px solid #22c55e' : (isTarget && !isFound ? '2.5px solid ' + scene.accent : '2px solid rgba(255,255,255,0.6)'),
                          boxShadow: isFound ? '0 0 12px rgba(34,197,94,0.35), 0 2px 6px rgba(0,0,0,0.08)' : (isTarget && !isFound ? '0 0 16px ' + scene.accent + '40, 0 3px 10px rgba(0,0,0,0.12)' : '0 2px 10px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)'),
                          backdropFilter: 'blur(4px)'
                        }
                      }, h('span', { style: { fontSize: '24px' } }, obj.emoji)),
                      h('span', {
                        className: 'text-[11px] font-bold mt-1 px-1.5 py-0.5 rounded-md',
                        style: {
                          background: isFound ? 'rgba(34,197,94,0.18)' : (isTarget && !isFound ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.85)'),
                          color: isFound ? '#15803d' : '#475569',
                          maxWidth: '76px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                          border: isFound ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(0,0,0,0.06)'
                        }
                      }, isFound ? '\u2705 ' + (obj.label || obj.name) : (obj.label || obj.name))
                    );
                  })
                ),

                // Progress bar
                h('div', { className: 'mb-4 rounded-xl p-3', style: { background: scene.accent + '08', border: '1px solid ' + scene.accent + '20' } },
                  h('div', { className: 'flex justify-between items-center mb-1.5' },
                    h('span', { className: 'text-[11px] font-bold text-slate-600 flex items-center gap-1' }, '\uD83E\uDDEA Compounds Identified'),
                    h('span', { className: 'text-xs font-black', style: { color: scene.accent } }, sceneFoundCount + ' / ' + scene.objects.length)
                  ),
                  h('div', { className: 'w-full h-2.5 rounded-full overflow-hidden', style: { background: scene.accent + '15' } },
                    h('div', { className: 'h-full rounded-full transition-all duration-700', style: { width: Math.round(sceneFoundCount / scene.objects.length * 100) + '%', background: allFoundInScene ? '#10b981' : 'linear-gradient(90deg, ' + scene.accent + ', ' + scene.accent + 'cc)' } })
                  ),
                  // Mini object emoji row
                  h('div', { className: 'flex items-center gap-1 mt-2' },
                    scene.objects.map(function(o) {
                      var f = !!foundObjects[o.id];
                      return h('span', {
                        key: o.id, title: o.name,
                        style: { fontSize: '14px', opacity: f ? 1 : 0.3, filter: f ? 'none' : 'grayscale(1)', transition: 'all 0.3s' }
                      }, o.emoji);
                    })
                  )
                ),

                // Detail card for selected found object
                selObj && linkedMat && foundObjects[selObj.id] ? h('div', { className: 'bg-white rounded-xl border-2 p-4 mb-3', style: { borderColor: scene.accent } },
                  h('div', { className: 'flex items-start gap-3 mb-3' },
                    h('span', { className: 'text-3xl' }, selObj.emoji),
                    h('div', { className: 'flex-1' },
                      h('h4', { className: 'font-bold text-slate-800' }, selObj.name),
                      h('span', { className: 'px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full' }, '\u2705 Identified')
                    ),
                    h('button', { 'aria-label': 'Change selected scene obj', onClick: function() { upd('selectedSceneObj', null); }, className: 'p-1 hover:bg-slate-100 rounded' }, h(X, { size: 14, className: 'text-slate-600' }))
                  ),
                  h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200' },
                    h('div', { className: 'flex items-center gap-2 mb-2' },
                      h('span', { className: 'text-xl' }, linkedMat.emoji),
                      h('span', { className: 'font-bold text-slate-800 text-sm' }, linkedMat.name),
                      h('span', { className: 'px-2 py-0.5 bg-white rounded-full text-xs font-mono font-bold text-slate-700 border border-slate-200' }, linkedMat.formula)
                    ),
                    h('p', { className: 'text-xs text-slate-600 leading-relaxed mb-2' }, linkedMat.desc),
                    h('div', { className: 'flex gap-3 text-[11px] font-bold' },
                      h('span', { className: 'text-cyan-600' }, '\uD83D\uDD17 ' + linkedMat.bondType),
                      h('span', { className: 'text-indigo-600' }, '\uD83D\uDCCA ' + linkedMat.state),
                      h('span', { className: 'text-emerald-600' }, '\u2696 ' + linkedMat.molarMass)
                    ),
                    h('div', { className: 'flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-amber-200' },
                      linkedMat.elements.map(function(el) {
                        return h('div', { key: el.sym, className: 'flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-slate-200' },
                          h('div', { className: 'w-5 h-5 rounded flex items-center justify-center text-white text-[11px] font-bold', style: { background: el.color } }, el.sym),
                          h('span', { className: 'text-[11px] font-bold text-slate-700' }, el.name),
                          el.count > 1 ? h('span', { className: 'text-[11px] text-amber-600 font-bold' }, '\u00D7' + el.count) : null
                        );
                      })
                    ),
                    h('div', { className: 'flex gap-2 mt-3' },
                      h('button', { 'aria-label': 'Explore', onClick: function() { updMulti({ selected: linkedMat.name, decomposed: false, tab: 'explore' }); }, className: 'flex-1 py-2 bg-amber-700 text-white font-bold text-xs rounded-lg hover:bg-amber-600 transition-all' }, '\u2697\uFE0F Explore'),
                      h('button', { 'aria-label': 'Visualize', onClick: function() { updMulti({ selected: linkedMat.name, decomposed: false, tab: 'visualize' }); }, className: 'flex-1 py-2 bg-indigo-500 text-white font-bold text-xs rounded-lg hover:bg-indigo-600 transition-all' }, '\uD83C\uDFA8 Visualize'),
                      h('button', { 'aria-label': 'Speak Text', onClick: function() { speakText(selObj.name + ' contains ' + linkedMat.name + '. ' + linkedMat.desc); }, className: 'px-3 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-200 transition-all' }, '\uD83D\uDD0A')
                    )
                  )
                ) : null,

                // Found objects summary
                sceneFoundCount > 0 ? h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-3' },
                  h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\u2705 Identified in ' + scene.name),
                  h('div', { className: 'flex flex-wrap gap-1.5' },
                    scene.objects.filter(function(obj) { return foundObjects[obj.id]; }).map(function(obj) {
                      var mat = MATERIALS.find(function(m) { return m.name === obj.material; });
                      return h('button', { 'aria-label': 'Decomposer action',
                        key: obj.id,
                        onClick: function() { SOUNDS.elementClick(); upd('selectedSceneObj', selectedSceneObj === obj.id ? null : obj.id); },
                        className: 'px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ' +
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
              h('p', { className: 'text-xs text-slate-600 mt-1' }, 'Pick two materials and see what happens when they react!')
            ),

            // Material picker — two slots
            h('div', { className: 'grid grid-cols-2 gap-4 mb-4' },
              // Slot A
              h('div', { className: 'bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-indigo-200 p-3' },
                h('p', { className: 'text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2' }, 'Material A'),
                reactantA ? h('div', { className: 'text-center' },
                  h('span', { className: 'text-3xl' }, (MATERIALS.find(function(m) { return m.name === reactantA; }) || {}).emoji || '?'),
                  h('p', { className: 'text-xs font-bold text-slate-800 mt-1' }, reactantA),
                  h('button', { 'aria-label': 'Remove', onClick: function() { updMulti({ reactantA: null, activeReaction: null }); }, className: 'text-[11px] text-red-500 font-bold mt-1' }, '\u2715 Remove')
                ) : h('p', { className: 'text-xs text-indigo-400 text-center py-4' }, 'Select below \u2193')
              ),
              // Slot B
              h('div', { className: 'bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl border-2 border-rose-200 p-3' },
                h('p', { className: 'text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-2' }, 'Material B'),
                reactantB ? h('div', { className: 'text-center' },
                  h('span', { className: 'text-3xl' }, (MATERIALS.find(function(m) { return m.name === reactantB; }) || {}).emoji || '?'),
                  h('p', { className: 'text-xs font-bold text-slate-800 mt-1' }, reactantB),
                  h('button', { 'aria-label': 'Remove', onClick: function() { updMulti({ reactantB: null, activeReaction: null }); }, className: 'text-[11px] text-red-500 font-bold mt-1' }, '\u2715 Remove')
                ) : h('p', { className: 'text-xs text-rose-400 text-center py-4' }, 'Select below \u2193')
              )
            ),

            // Material palette
            h('div', { className: 'flex flex-wrap gap-1.5 mb-4' },
              MATERIALS.map(function(m) {
                var isA = reactantA === m.name;
                var isB = reactantB === m.name;
                return h('button', { 'aria-label': 'Decomposer action',
                  key: m.name,
                  onClick: function() {
                    SOUNDS.selectMaterial();
                    if (!reactantA) { updMulti({ reactantA: m.name, activeReaction: null }); }
                    else if (!reactantB && m.name !== reactantA) { upd('reactantB', m.name); }
                    else if (!isA && !isB) { updMulti({ reactantA: m.name, reactantB: null, activeReaction: null }); }
                  },
                  className: 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ' +
                    (isA ? 'bg-indigo-500 text-white' : isB ? 'bg-rose-700 text-white' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-amber-300')
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
                !activeReaction ? h('button', { 'aria-label': 'Mix',
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
                      h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700' }, activeReaction.type)
                    )
                  ),
                  // Equation
                  h('div', { className: 'bg-white rounded-lg p-3 mb-3 text-center border border-amber-200' },
                    h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1' }, 'Chemical Equation'),
                    h('p', { className: 'text-sm font-mono font-bold text-slate-800' }, activeReaction.equation)
                  ),
                  // Description
                  h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-3' }, activeReaction.desc),
                  // Observable
                  activeReaction.observable ? h('div', { className: 'flex items-center gap-2 bg-sky-50 rounded-lg p-2 border border-sky-200 mb-3' },
                    h('span', { className: 'text-[11px] font-bold text-sky-600' }, '\uD83D\uDC41\uFE0F What you\u2019d see:'),
                    h('span', { className: 'text-xs text-slate-700' }, activeReaction.observable)
                  ) : null,
                  // TTS + try another
                  h('div', { className: 'flex gap-2' },
                    h('button', { 'aria-label': 'Listen',
                      onClick: function() { speakText(activeReaction.name + '. ' + activeReaction.desc); },
                      className: 'px-3 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-200'
                    }, '\uD83D\uDD0A Listen'),
                    h('button', { 'aria-label': 'Try Another Combo',
                      onClick: function() { updMulti({ reactantA: null, reactantB: null, activeReaction: null }); },
                      className: 'flex-1 py-2 bg-amber-700 text-white font-bold text-xs rounded-lg hover:bg-amber-600'
                    }, '\uD83D\uDD04 Try Another Combo')
                  )
                ) : null
              );
            })() : null,

            // Discovered reactions log
            Object.keys(reactionsDiscovered).length > 0 ? h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-3' },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83E\uDDEA Discovered Reactions (' + Object.keys(reactionsDiscovered).length + '/' + REACTIONS.length + ')'),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                REACTIONS.map(function(r) {
                  var disc = !!reactionsDiscovered[r.name];
                  return h('span', {
                    key: r.name,
                    className: 'px-2 py-1 rounded-lg text-[11px] font-bold ' +
                      (disc ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600 border border-slate-200')
                  }, disc ? r.emoji + ' ' + r.name : '\uD83D\uDD12 ???');
                })
              )
            ) : null
          ),


          /* ═══════════════════════════════════════════════════
             STATES OF MATTER TAB — Particle simulation
             ═══════════════════════════════════════════════════ */
          tab === 'states' && h('div', null,
            h('div', { className: 'text-center mb-3' },
              h('h4', { className: 'text-lg font-bold text-slate-800' }, '\uD83C\uDF21\uFE0F States of Matter'),
              h('p', { className: 'text-xs text-slate-600 mt-1' }, 'See how ' + sel.name + ' particles behave as a solid, liquid, or gas. Drag the temperature slider!')
            ),

            // Temperature slider
            h('div', { className: 'bg-gradient-to-r from-blue-50 via-yellow-50 to-red-50 rounded-xl border border-slate-200 p-3 mb-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('span', { className: 'text-[11px] font-bold text-blue-600' }, '\u2744\uFE0F Cold'),
                h('span', { className: 'text-xs font-bold text-slate-700' }, (d._simTemp != null ? d._simTemp : 25) + '\u00B0C'),
                h('span', { className: 'text-[11px] font-bold text-red-600' }, '\uD83D\uDD25 Hot')
              ),
              h('input', {
                type: 'range', 'aria-label': 'Decomposer slider', min: -200, max: 500, step: 5,
                value: d._simTemp != null ? d._simTemp : 25,
                onChange: function(e) { upd('_simTemp', parseInt(e.target.value, 10)); },
                style: { width: '100%', accentColor: (d._simTemp || 25) < 0 ? '#3b82f6' : (d._simTemp || 25) > 200 ? '#ef4444' : '#f59e0b' }
              }),
              // State label
              (function() {
                var temp = d._simTemp != null ? d._simTemp : 25;
                var geo = GEOMETRY[sel.name];
                var mp = geo ? geo.mp : 0;
                var bp = geo ? geo.bp : 100;
                var state = 'Solid';
                if (bp !== null && temp >= bp) state = 'Gas';
                else if (mp !== null && temp >= mp) state = 'Liquid';
                var stateColors = { Solid: '#3b82f6', Liquid: '#06b6d4', Gas: '#ef4444' };
                var stateEmoji = { Solid: '\u2744\uFE0F', Liquid: '\uD83D\uDCA7', Gas: '\uD83D\uDCA8' };
                return h('div', { className: 'flex items-center justify-center gap-3 mt-2' },
                  h('span', { className: 'text-2xl' }, stateEmoji[state]),
                  h('span', { className: 'text-sm font-black', style: { color: stateColors[state] } }, sel.name + ' is a ' + state),
                  geo && geo.shape ? h('span', { className: 'text-[11px] text-slate-600 font-bold' }, '\u00B7 ' + geo.shape) : null
                );
              })()
            ),

            // Particle canvas
            h('div', { className: 'rounded-xl border-2 border-slate-200 overflow-hidden mb-3' },
              h('canvas', { 'aria-label': 'Decomposer interactive visualization',
                ref: function(canvas) {
                  if (!canvas) return;
                  var c2 = canvas.getContext('2d');
                  var dpr = window.devicePixelRatio || 1;
                  var cw = canvas.offsetWidth || 500;
                  var ch2 = 240;
                  canvas.width = cw * dpr; canvas.height = ch2 * dpr;
                  canvas.style.height = ch2 + 'px'; c2.scale(dpr, dpr);

                  var temp = d._simTemp != null ? d._simTemp : 25;
                  var geo = GEOMETRY[sel.name];
                  var mp = geo ? geo.mp : 0;
                  var bp = geo ? geo.bp : 100;
                  var state = 'solid';
                  if (bp !== null && temp >= bp) state = 'gas';
                  else if (mp !== null && temp >= mp) state = 'liquid';

                  // Kill previous animation
                  if (canvas._stateAnimId) cancelAnimationFrame(canvas._stateAnimId);

                  // Init particles if needed or state changed
                  if (!canvas._particles || canvas._prevState !== state) {
                    canvas._prevState = state;
                    canvas._particles = [];
                    var cols = 6; var rows = 5;
                    var elColor = sel.elements[0] ? sel.elements[0].color : '#60a5fa';
                    for (var pr = 0; pr < rows; pr++) {
                      for (var pc = 0; pc < cols; pc++) {
                        canvas._particles.push({
                          x: cw * 0.25 + (pc / (cols - 1)) * cw * 0.5,
                          y: ch2 * 0.2 + (pr / (rows - 1)) * ch2 * 0.6,
                          vx: 0, vy: 0,
                          homeX: cw * 0.25 + (pc / (cols - 1)) * cw * 0.5,
                          homeY: ch2 * 0.2 + (pr / (rows - 1)) * ch2 * 0.6,
                          color: elColor, r: 8
                        });
                      }
                    }
                  }
                  var parts = canvas._particles;
                  var tick = 0;

                  function drawState() {
                    tick++;
                    c2.clearRect(0, 0, cw, ch2);

                    // Background
                    var bgColors = { solid: '#eff6ff', liquid: '#ecfeff', gas: '#fef2f2' };
                    c2.fillStyle = bgColors[state] || '#f8fafc';
                    c2.fillRect(0, 0, cw, ch2);

                    // Container walls
                    c2.strokeStyle = '#94a3b8'; c2.lineWidth = 2;
                    c2.strokeRect(cw * 0.1, ch2 * 0.08, cw * 0.8, ch2 * 0.84);

                    var energy = state === 'solid' ? 0.3 : state === 'liquid' ? 1.5 : 4;
                    var wallL = cw * 0.12; var wallR = cw * 0.88;
                    var wallT = ch2 * 0.10; var wallB = ch2 * 0.90;

                    for (var i = 0; i < parts.length; i++) {
                      var pp = parts[i];
                      if (state === 'solid') {
                        // Vibrate in place
                        pp.vx = (Math.random() - 0.5) * energy;
                        pp.vy = (Math.random() - 0.5) * energy;
                        pp.x += pp.vx;
                        pp.y += pp.vy;
                        // Pull back to lattice
                        pp.x += (pp.homeX - pp.x) * 0.15;
                        pp.y += (pp.homeY - pp.y) * 0.15;
                      } else if (state === 'liquid') {
                        // Flow with some cohesion
                        pp.vx += (Math.random() - 0.5) * 0.3;
                        pp.vy += (Math.random() - 0.5) * 0.3 + 0.05;
                        pp.vx *= 0.95; pp.vy *= 0.95;
                        pp.x += pp.vx * energy;
                        pp.y += pp.vy * energy;
                      } else {
                        // Gas — fast, random, fill container
                        pp.vx += (Math.random() - 0.5) * 0.5;
                        pp.vy += (Math.random() - 0.5) * 0.5;
                        pp.vx *= 0.98; pp.vy *= 0.98;
                        pp.x += pp.vx * energy;
                        pp.y += pp.vy * energy;
                      }

                      // Wall bouncing
                      if (pp.x < wallL + pp.r) { pp.x = wallL + pp.r; pp.vx = Math.abs(pp.vx); }
                      if (pp.x > wallR - pp.r) { pp.x = wallR - pp.r; pp.vx = -Math.abs(pp.vx); }
                      if (pp.y < wallT + pp.r) { pp.y = wallT + pp.r; pp.vy = Math.abs(pp.vy); }
                      if (pp.y > wallB - pp.r) { pp.y = wallB - pp.r; pp.vy = -Math.abs(pp.vy); }

                      // Draw particle
                      c2.save();
                      var pGrad = c2.createRadialGradient(pp.x - 2, pp.y - 2, 1, pp.x, pp.y, pp.r);
                      pGrad.addColorStop(0, lightenColor(pp.color, 40));
                      pGrad.addColorStop(1, pp.color);
                      c2.fillStyle = pGrad;
                      c2.beginPath(); c2.arc(pp.x, pp.y, pp.r, 0, Math.PI * 2); c2.fill();
                      c2.fillStyle = 'rgba(255,255,255,0.3)';
                      c2.beginPath(); c2.arc(pp.x - 2, pp.y - 2, pp.r * 0.35, 0, Math.PI * 2); c2.fill();
                      c2.restore();
                    }

                    // Draw bonds between nearby particles (solid only)
                    if (state === 'solid') {
                      c2.strokeStyle = 'rgba(148,163,184,0.3)'; c2.lineWidth = 1;
                      for (var si = 0; si < parts.length; si++) {
                        for (var sj = si + 1; sj < parts.length; sj++) {
                          var ddx = parts[si].x - parts[sj].x;
                          var ddy = parts[si].y - parts[sj].y;
                          if (ddx * ddx + ddy * ddy < 3000) {
                            c2.beginPath();
                            c2.moveTo(parts[si].x, parts[si].y);
                            c2.lineTo(parts[sj].x, parts[sj].y);
                            c2.stroke();
                          }
                        }
                      }
                    }

                    // State label in corner
                    var stLabels = { solid: 'SOLID \u2014 Particles vibrate in fixed lattice', liquid: 'LIQUID \u2014 Particles slide past each other', gas: 'GAS \u2014 Particles fly freely, fill container' };
                    c2.fillStyle = '#94a3b8'; c2.font = 'bold 9px system-ui, sans-serif'; c2.textAlign = 'left';
                    c2.fillText(stLabels[state] || '', cw * 0.12, ch2 * 0.97);

                    canvas._stateAnimId = requestAnimationFrame(drawState);
                  }
                  drawState();
                },
                className: 'w-full block', style: { height: '240px', background: '#f8fafc' }
              })
            ),

            // Phase transition info
            (function() {
              var geo = GEOMETRY[sel.name];
              if (!geo) return null;
              return h('div', { className: 'grid grid-cols-3 gap-2 mb-3' },
                h('div', { className: 'bg-blue-50 rounded-xl border border-blue-200 p-2 text-center' },
                  h('div', { className: 'text-lg' }, '\u2744\uFE0F'),
                  h('div', { className: 'text-xs font-bold text-blue-700' }, 'Melting Point'),
                  h('div', { className: 'text-sm font-black text-blue-900' }, geo.mp !== null ? geo.mp + '\u00B0C' : 'N/A')
                ),
                h('div', { className: 'bg-cyan-50 rounded-xl border border-cyan-200 p-2 text-center' },
                  h('div', { className: 'text-lg' }, '\uD83D\uDCA7'),
                  h('div', { className: 'text-xs font-bold text-cyan-700' }, geo.shape || 'Shape'),
                  h('div', { className: 'text-sm font-black text-cyan-900' }, geo.angle || '-')
                ),
                h('div', { className: 'bg-red-50 rounded-xl border border-red-200 p-2 text-center' },
                  h('div', { className: 'text-lg' }, '\uD83D\uDD25'),
                  h('div', { className: 'text-xs font-bold text-red-700' }, 'Boiling Point'),
                  h('div', { className: 'text-sm font-black text-red-900' }, geo.bp !== null ? geo.bp + '\u00B0C' : 'Decomposes')
                )
              );
            })(),

            // Explanation text
            h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-3' },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1' }, '\uD83D\uDCDA How it works'),
              h('p', { className: 'text-xs text-slate-600 leading-relaxed' },
                'All matter is made of particles (atoms or molecules) that are always moving. In a solid, particles vibrate in a fixed arrangement held by strong bonds. As temperature increases, particles gain energy. At the melting point, they break free and flow as a liquid. At the boiling point, they escape into the air as gas.'
              ),
              h('button', { 'aria-label': 'Listen',
                onClick: function() { speakText('In a solid, particles vibrate in fixed positions. In a liquid, they slide past each other. In a gas, they fly freely and fill the container. Temperature controls how fast they move.'); },
                className: 'mt-2 text-[11px] text-sky-600 hover:text-sky-800 font-bold'
              }, '\uD83D\uDD0A Listen')
            )
          ),


          /* ═══════════════════════════════════════════════════
             VISUALIZE TAB
             ═══════════════════════════════════════════════════ */
          tab === 'visualize' && h('div', null,

            /* Canvas */
            h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 overflow-hidden mb-3' },
              h('canvas', { 'aria-label': 'Decomposer visualization',
                ref: canvasRef,
                className: 'w-full cursor-pointer',
                style: { height: '280px', display: 'block' },
                'aria-label': 'Molecular visualization of ' + sel.name
              })
            ),

            /* Canvas controls */
            h('div', { className: 'flex items-center gap-3 mb-3' },
              h('button', { 'aria-label': 'Speak Text',
                onClick: function() {
                  var next = !decomposed;
                  if (next) { SOUNDS.decompose(); updMulti({ decomposed: true, _hasDecomposed: true }); }
                  else { SOUNDS.reassemble(); upd('decomposed', false); }
                },
                className: 'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all '
                  + (decomposed
                    ? 'bg-red-700 text-white shadow-lg hover:bg-red-600'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md')
              }, decomposed ? '\uD83D\uDD04 Reassemble' : '\u26A1 Decompose'),
              h('button', { 'aria-label': 'Describe',
                onClick: function() { speakText(sel.name + ' has the formula ' + sel.formula + '. ' + sel.desc); },
                className: 'px-4 py-2.5 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100'
              }, '\uD83D\uDD0A Describe')
            ),

            /* Canvas legend */
            h('div', { className: 'bg-indigo-50 rounded-xl border border-indigo-200 p-3 mb-3' },
              h('p', { className: 'text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2' }, 'Element Legend'),
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
                    el.count > 1 && h('span', { className: 'text-[11px] text-amber-600 font-bold' },
                      '(\u00D7' + el.count + ')'
                    )
                  );
                })
              ),
              h('div', { className: 'mt-2 pt-2 border-t border-indigo-200 text-[11px] text-slate-600' },
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
                h('div', { className: 'text-[11px] font-bold text-slate-600' }, 'Total Atoms')
              ),
              h('div', { className: 'bg-white rounded-xl border border-slate-200 p-2 text-center' },
                h('div', { className: 'text-lg font-black text-slate-800' }, sel.elements.length),
                h('div', { className: 'text-[11px] font-bold text-slate-600' }, 'Elements')
              ),
              h('div', { className: 'bg-white rounded-xl border border-slate-200 p-2 text-center' },
                h('div', { className: 'text-lg font-black text-slate-800' }, sel.bondType.split(' ')[0]),
                h('div', { className: 'text-[11px] font-bold text-slate-600' }, 'Bond Type')
              ),
              h('div', { className: 'bg-white rounded-xl border border-slate-200 p-2 text-center' },
                h('div', { className: 'text-lg font-black text-slate-800' }, sel.state),
                h('div', { className: 'text-[11px] font-bold text-slate-600' }, 'State')
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
                h('p', { className: 'text-xs text-slate-600' }, 'Test your knowledge of chemical formulas, elements, and bonds')
              ),
              quizScore > 0 && h('div', { className: 'text-right' },
                h('div', { className: 'text-sm font-bold text-emerald-600' }, '\u2B50 ' + quizScore + ' correct'),
                h('div', { className: 'text-xs text-slate-600' },
                  '\uD83D\uDD25 Streak: ' + quizStreak + ' | Best: ' + bestStreak
                )
              )
            ),

            /* Start quiz / next question button */
            (!quizMode || !quizQ) && h('div', { className: 'text-center py-8' },
              h('div', { className: 'text-5xl mb-3' }, '\uD83E\uDDEA'),
              h('p', { className: 'text-sm text-slate-600 mb-4' }, 'Ready to test your chemistry knowledge?'),
              h('button', { 'aria-label': 'Start Quiz',
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
                        : 'bg-slate-50 text-slate-600 border-slate-200';

                  return h('button', { 'aria-label': 'Select option',
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
              quizQ.answered && h('button', { 'aria-label': 'Next Question',
                onClick: function() { upd('quizQ', makeQuiz()); },
                className: 'w-full py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-all'
              }, '\u27A1 Next Question')
            ),

            /* Quiz stats panel */
            quizScore > 0 && h('div', { className: 'grid grid-cols-3 gap-2 mb-3' },
              h('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-3 text-center' },
                h('div', { className: 'text-2xl font-black text-emerald-700' }, quizScore),
                h('div', { className: 'text-[11px] font-bold text-emerald-500' }, 'Correct')
              ),
              h('div', { className: 'bg-orange-50 rounded-xl border border-orange-200 p-3 text-center' },
                h('div', { className: 'text-2xl font-black text-orange-700' }, quizStreak),
                h('div', { className: 'text-[11px] font-bold text-orange-500' }, 'Current Streak')
              ),
              h('div', { className: 'bg-purple-50 rounded-xl border border-purple-200 p-3 text-center' },
                h('div', { className: 'text-2xl font-black text-purple-700' }, bestStreak),
                h('div', { className: 'text-[11px] font-bold text-purple-500' }, 'Best Streak')
              )
            ),

            /* Reset quiz */
            quizScore > 0 && h('button', { 'aria-label': 'Reset Quiz',
              onClick: function() {
                updMulti({ quizScore: 0, quizStreak: 0, quizQ: null, quizMode: false });
              },
              className: 'text-xs text-slate-600 hover:text-slate-600 font-bold'
            }, '\uD83D\uDD04 Reset Quiz')
          ),


          /* ═══════════════════════════════════════════════════
             AI TUTOR TAB
             ═══════════════════════════════════════════════════ */
          tab === 'tutor' && h('div', null,

            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('h4', { className: 'font-bold text-slate-800' }, '\uD83E\uDD16 Chemistry AI Tutor'),
              h('span', { className: 'text-xs text-slate-600' }, 'Ask me anything about ' + sel.name + '!')
            ),

            /* Chat messages */
            h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-3 mb-3 max-h-[300px] overflow-y-auto space-y-2' },
              aiMessages.length === 0 && h('div', { className: 'text-center py-6' },
                h('div', { className: 'text-4xl mb-2' }, '\uD83E\uDDEC'),
                h('p', { className: 'text-xs text-slate-600' }, 'Ask a question about chemistry or the current molecule!')
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
                    !isUser && h('button', { 'aria-label': 'Speak Text',
                      onClick: function() { speakText(msg.text); },
                      className: 'ml-2 text-[11px] text-purple-400 hover:text-purple-600'
                    }, '\uD83D\uDD0A')
                  )
                );
              }),
              aiLoading && h('div', { className: 'flex justify-start' },
                h('div', { className: 'bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-600 animate-pulse' },
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
              h('button', { 'aria-label': 'Handle Ai Question',
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
                return h('button', { 'aria-label': 'Ask question',
                  key: i,
                  onClick: function() { handleAiQuestion(q); },
                  className: 'px-2.5 py-1 bg-purple-50 text-purple-700 text-[11px] font-bold rounded-lg border border-purple-200 hover:bg-purple-100 transition-all'
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
              h('span', { className: 'text-xs text-slate-600' },
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
                  h('div', { className: 'text-[11px] font-bold mt-0.5 ' + (earned ? 'text-amber-700' : 'text-slate-600') },
                    b.label
                  ),
                  earned && h('div', { className: 'text-[11px] text-amber-500 font-bold' }, '+' + b.xp + ' XP')
                );
              })
            )
          ),


          /* ═══════════════════════════════════════════════════
             Snapshot Button
             ═══════════════════════════════════════════════════ */
          h('button', { 'aria-label': 'Snapshot',
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