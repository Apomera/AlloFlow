// ═══════════════════════════════════════════
// stem_tool_chembalance.js — Chemistry Lab v3.0
// 8 sub-tools: Equation Balancer, Reaction Types,
// Stoichiometry, Molecular Viewer, Lab Safety,
// Challenge, Element Battle, Learn
// ═══════════════════════════════════════════

(function() {
  'use strict';
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-chembalance')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-chembalance';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  window.StemLab = window.StemLab || {
    _registry: {}, _order: [],
    registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
    isRegistered: function(id) { return !!this._registry[id]; },
    renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
  };

  // ── Grade band helpers ──
  var getGradeBand = function(ctx) {
    var g = parseInt(ctx.gradeLevel, 10);
    if (isNaN(g) || g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  };
  var gradeText = function(k2, g35, g68, g912) {
    return function(band) {
      if (band === 'k2') return k2;
      if (band === 'g35') return g35;
      if (band === 'g68') return g68;
      return g912;
    };
  };

  // ── Sub-tools ──
  var SUBTOOLS = [
    { id: 'balance', icon: '\u2696\uFE0F', label: 'Balance', desc: 'Balance chemical equations' },
    { id: 'reactions', icon: '\u2697\uFE0F', label: 'Reaction Types', desc: 'Explore 5 reaction types' },
    { id: 'stoich', icon: '\uD83E\uDDEE', label: 'Stoichiometry', desc: 'Molar mass & mole calculator' },
    { id: 'molecular', icon: '\u269B\uFE0F', label: 'Molecular', desc: 'Ball-and-stick molecule models' },
    { id: 'safety', icon: '\uD83E\uDDEA', label: 'Lab Safety', desc: 'GHS symbols & emergency response' },
    { id: 'challenge', icon: '\uD83C\uDFC6', label: 'Challenge', desc: 'Chemistry quiz in 3 tiers' },
    { id: 'battle', icon: '\u2694\uFE0F', label: 'Element Battle', desc: 'Battle with chemistry questions' },
    { id: 'learn', icon: '\uD83D\uDCD6', label: 'Learn', desc: 'Chemistry concepts by grade' }
  ];

  // ── Equation presets ──
  var ALL_PRESETS = [
    { name: 'Water Formation', tier: 'beginner', eq: 'H\u2082 + O\u2082 \u2192 H\u2082O', target: [2, 1, 2], atoms: { H: [2, 0, 2], O: [0, 2, 1] }, hint: 'Hydrogen needs 4 atoms total on each side' },
    { name: 'Table Salt', tier: 'beginner', eq: 'Na + Cl\u2082 \u2192 NaCl', target: [2, 1, 2], atoms: { Na: [1, 0, 1], Cl: [0, 2, 1] }, hint: 'Each NaCl needs one Na and one Cl' },
    { name: 'Magnesium Oxide', tier: 'beginner', eq: 'Mg + O\u2082 \u2192 MgO', target: [2, 1, 2], atoms: { Mg: [1, 0, 1], O: [0, 2, 1] }, hint: 'Oxygen comes in pairs' },
    { name: 'Iron Oxide', tier: 'beginner', eq: 'Fe + O\u2082 \u2192 Fe\u2082O\u2083', target: [4, 3, 2], atoms: { Fe: [1, 0, 2], O: [0, 2, 3] }, hint: 'Count Fe and O atoms on each side' },
    { name: 'Methane Combustion', tier: 'intermediate', eq: 'CH\u2084 + O\u2082 \u2192 CO\u2082 + H\u2082O', target: [1, 2, 1, 2], atoms: { C: [1, 0, 1, 0], H: [4, 0, 0, 2], O: [0, 2, 2, 1] }, hint: 'Balance C first, then H, then O' },
    { name: 'Photosynthesis', tier: 'intermediate', eq: 'CO\u2082 + H\u2082O \u2192 C\u2086H\u2081\u2082O\u2086 + O\u2082', target: [6, 6, 1, 6], atoms: { C: [1, 0, 6, 0], O: [2, 1, 6, 2], H: [0, 2, 12, 0] }, hint: 'Start with carbon: you need 6 CO\u2082' },
    { name: 'Acid-Base Neutralization', tier: 'intermediate', eq: 'HCl + NaOH \u2192 NaCl + H\u2082O', target: [1, 1, 1, 1], atoms: { H: [1, 1, 0, 2], Cl: [1, 0, 1, 0], Na: [0, 1, 1, 0], O: [0, 1, 0, 1] }, hint: 'This one is already balanced at 1:1:1:1!' },
    { name: 'Ammonia Synthesis', tier: 'intermediate', eq: 'N\u2082 + H\u2082 \u2192 NH\u2083', target: [1, 3, 2], atoms: { N: [2, 0, 1], H: [0, 2, 3] }, hint: 'You need 2 NH\u2083 to use both N atoms' },
    { name: 'Thermite Reaction', tier: 'advanced', eq: 'Al + Fe\u2082O\u2083 \u2192 Al\u2082O\u2083 + Fe', target: [2, 1, 1, 2], atoms: { Al: [1, 0, 2, 0], Fe: [0, 2, 0, 1], O: [0, 3, 3, 0] }, hint: 'Aluminum replaces iron' },
    { name: 'Ethanol Combustion', tier: 'advanced', eq: 'C\u2082H\u2085OH + O\u2082 \u2192 CO\u2082 + H\u2082O', target: [1, 3, 2, 3], atoms: { C: [2, 0, 1, 0], H: [6, 0, 0, 2], O: [1, 2, 2, 1] }, hint: 'Balance C, then H, then adjust O last' },
    { name: 'CaCO\u2083 Decomposition', tier: 'advanced', eq: 'CaCO\u2083 \u2192 CaO + CO\u2082', target: [1, 1, 1], atoms: { Ca: [1, 1, 0], C: [1, 0, 1], O: [3, 1, 2] }, hint: 'Decomposition: already balanced!' },
    { name: 'Glucose Combustion', tier: 'advanced', eq: 'C\u2086H\u2081\u2082O\u2086 + O\u2082 \u2192 CO\u2082 + H\u2082O', target: [1, 6, 6, 6], atoms: { C: [6, 0, 1, 0], H: [12, 0, 0, 2], O: [6, 2, 2, 1] }, hint: 'Balance C (6), then H (12\u219206), then O last' }
  ];

  // ── Reaction types ──
  var REACTION_TYPES = [
    { id: 'synthesis', label: 'Synthesis (Combination)', icon: '\u2795', pattern: 'A + B \u2192 AB',
      desc: 'Two or more reactants combine to form a single product.',
      examples: [
        { eq: '2H\u2082 + O\u2082 \u2192 2H\u2082O', name: 'Water formation' },
        { eq: '2Na + Cl\u2082 \u2192 2NaCl', name: 'Table salt' },
        { eq: 'N\u2082 + 3H\u2082 \u2192 2NH\u2083', name: 'Ammonia (Haber process)' }
      ], color: 'emerald' },
    { id: 'decomposition', label: 'Decomposition', icon: '\uD83D\uDCA5', pattern: 'AB \u2192 A + B',
      desc: 'A single compound breaks down into two or more simpler substances.',
      examples: [
        { eq: 'CaCO\u2083 \u2192 CaO + CO\u2082', name: 'Limestone heating' },
        { eq: '2H\u2082O \u2192 2H\u2082 + O\u2082', name: 'Electrolysis of water' },
        { eq: '2KClO\u2083 \u2192 2KCl + 3O\u2082', name: 'Potassium chlorate' }
      ], color: 'amber' },
    { id: 'single', label: 'Single Replacement', icon: '\uD83D\uDD04', pattern: 'A + BC \u2192 AC + B',
      desc: 'One element replaces another element in a compound based on reactivity.',
      examples: [
        { eq: 'Zn + CuSO\u2084 \u2192 ZnSO\u2084 + Cu', name: 'Zinc replaces copper' },
        { eq: 'Fe + CuCl\u2082 \u2192 FeCl\u2082 + Cu', name: 'Iron replaces copper' },
        { eq: '2Al + Fe\u2082O\u2083 \u2192 Al\u2082O\u2083 + 2Fe', name: 'Thermite reaction' }
      ], color: 'sky' },
    { id: 'double', label: 'Double Replacement', icon: '\uD83D\uDD00', pattern: 'AB + CD \u2192 AD + CB',
      desc: 'Two compounds exchange partners, often forming a precipitate, gas, or water.',
      examples: [
        { eq: 'HCl + NaOH \u2192 NaCl + H\u2082O', name: 'Acid-base neutralization' },
        { eq: 'AgNO\u2083 + NaCl \u2192 AgCl + NaNO\u2083', name: 'Silver chloride precipitate' },
        { eq: 'BaCl\u2082 + Na\u2082SO\u2084 \u2192 BaSO\u2084 + 2NaCl', name: 'Barium sulfate precipitate' }
      ], color: 'purple' },
    { id: 'combustion', label: 'Combustion', icon: '\uD83D\uDD25', pattern: 'C\u2093H\u2093 + O\u2082 \u2192 CO\u2082 + H\u2082O',
      desc: 'A hydrocarbon reacts with oxygen, producing carbon dioxide, water, and energy (heat/light).',
      examples: [
        { eq: 'CH\u2084 + 2O\u2082 \u2192 CO\u2082 + 2H\u2082O', name: 'Methane (natural gas)' },
        { eq: 'C\u2082H\u2085OH + 3O\u2082 \u2192 2CO\u2082 + 3H\u2082O', name: 'Ethanol combustion' },
        { eq: 'C\u2086H\u2081\u2082O\u2086 + 6O\u2082 \u2192 6CO\u2082 + 6H\u2082O', name: 'Glucose (cellular respiration)' }
      ], color: 'red' }
  ];

  // ── Element data (for molar mass calculator) ──
  var ELEMENTS = {
    H:{n:'Hydrogen',m:1.008,z:1},He:{n:'Helium',m:4.003,z:2},Li:{n:'Lithium',m:6.941,z:3},
    Be:{n:'Beryllium',m:9.012,z:4},B:{n:'Boron',m:10.811,z:5},C:{n:'Carbon',m:12.011,z:6},
    N:{n:'Nitrogen',m:14.007,z:7},O:{n:'Oxygen',m:15.999,z:8},F:{n:'Fluorine',m:18.998,z:9},
    Na:{n:'Sodium',m:22.990,z:11},Mg:{n:'Magnesium',m:24.305,z:12},Al:{n:'Aluminum',m:26.982,z:13},
    Si:{n:'Silicon',m:28.086,z:14},P:{n:'Phosphorus',m:30.974,z:15},S:{n:'Sulfur',m:32.065,z:16},
    Cl:{n:'Chlorine',m:35.453,z:17},K:{n:'Potassium',m:39.098,z:19},Ca:{n:'Calcium',m:40.078,z:20},
    Fe:{n:'Iron',m:55.845,z:26},Cu:{n:'Copper',m:63.546,z:29},Zn:{n:'Zinc',m:65.38,z:30},
    Br:{n:'Bromine',m:79.904,z:35},Ag:{n:'Silver',m:107.868,z:47},I:{n:'Iodine',m:126.904,z:53},
    Au:{n:'Gold',m:196.967,z:79},Pb:{n:'Lead',m:207.2,z:82}
  };

  var ATOM_COLORS = {
    H:'#e2e8f0',C:'#404040',N:'#3b82f6',O:'#ef4444',S:'#eab308',P:'#f97316',
    F:'#22c55e',Cl:'#22c55e',Br:'#a3290e',Na:'#a855f7',Mg:'#22c55e',Al:'#94a3b8',
    Ca:'#6ee7b7',Fe:'#fb923c',Cu:'#f97316',Zn:'#94a3b8',K:'#a855f7',Si:'#6b7280',
    I:'#6b21a8',Ag:'#cbd5e1',Au:'#fbbf24',Pb:'#6b7280'
  };

  // ── Molar mass presets ──
  var MOLAR_PRESETS = [
    { formula: 'H2O', name: 'Water' },
    { formula: 'NaCl', name: 'Table Salt' },
    { formula: 'CO2', name: 'Carbon Dioxide' },
    { formula: 'C6H12O6', name: 'Glucose' },
    { formula: 'CaCO3', name: 'Calcium Carbonate' },
    { formula: 'NaOH', name: 'Sodium Hydroxide' },
    { formula: 'HCl', name: 'Hydrochloric Acid' },
    { formula: 'NH3', name: 'Ammonia' },
    { formula: 'H2SO4', name: 'Sulfuric Acid' },
    { formula: 'Fe2O3', name: 'Iron(III) Oxide' },
    { formula: 'Ca(OH)2', name: 'Calcium Hydroxide' },
    { formula: 'C2H5OH', name: 'Ethanol' }
  ];

  // ── Molar mass parser ──
  var parseFormula = function(formula) {
    var clean = formula
      .replace(/\u2080/g,'0').replace(/\u2081/g,'1').replace(/\u2082/g,'2').replace(/\u2083/g,'3')
      .replace(/\u2084/g,'4').replace(/\u2085/g,'5').replace(/\u2086/g,'6').replace(/\u2087/g,'7')
      .replace(/\u2088/g,'8').replace(/\u2089/g,'9');
    var stack = [{ mass: 0, elems: {} }];
    var i = 0;
    while (i < clean.length) {
      if (clean[i] === '(') {
        stack.push({ mass: 0, elems: {} });
        i++;
      } else if (clean[i] === ')') {
        i++;
        var cnt = '';
        while (i < clean.length && clean[i] >= '0' && clean[i] <= '9') { cnt += clean[i]; i++; }
        var n = cnt ? parseInt(cnt, 10) : 1;
        var group = stack.pop();
        var top = stack[stack.length - 1];
        top.mass += group.mass * n;
        var gk = Object.keys(group.elems);
        for (var gi = 0; gi < gk.length; gi++) {
          top.elems[gk[gi]] = (top.elems[gk[gi]] || 0) + group.elems[gk[gi]] * n;
        }
      } else if (clean[i] >= 'A' && clean[i] <= 'Z') {
        var el = clean[i]; i++;
        if (i < clean.length && clean[i] >= 'a' && clean[i] <= 'z') { el += clean[i]; i++; }
        var cnt2 = '';
        while (i < clean.length && clean[i] >= '0' && clean[i] <= '9') { cnt2 += clean[i]; i++; }
        var n2 = cnt2 ? parseInt(cnt2, 10) : 1;
        var top2 = stack[stack.length - 1];
        if (ELEMENTS[el]) {
          top2.mass += ELEMENTS[el].m * n2;
          top2.elems[el] = (top2.elems[el] || 0) + n2;
        }
      } else { i++; }
    }
    return stack[0];
  };

  // ── Molecule data for viewer ──
  var MOLECULES = [
    { name: 'Water', formula: 'H\u2082O', shape: 'Bent', angle: '104.5\u00B0', polarity: 'Polar',
      desc: 'Universal solvent. Bent shape creates a dipole moment making it excellent at dissolving ionic compounds.',
      atoms: [{el:'O',x:150,y:70},{el:'H',x:95,y:130},{el:'H',x:205,y:130}],
      bonds: [[0,1,1],[0,2,1]] },
    { name: 'Carbon Dioxide', formula: 'CO\u2082', shape: 'Linear', angle: '180\u00B0', polarity: 'Nonpolar',
      desc: 'Greenhouse gas. Linear shape makes it nonpolar despite having polar C=O bonds (dipoles cancel).',
      atoms: [{el:'O',x:70,y:100},{el:'C',x:150,y:100},{el:'O',x:230,y:100}],
      bonds: [[0,1,2],[1,2,2]] },
    { name: 'Methane', formula: 'CH\u2084', shape: 'Tetrahedral', angle: '109.5\u00B0', polarity: 'Nonpolar',
      desc: 'Simplest hydrocarbon. Tetrahedral geometry shown as 2D projection. Main component of natural gas.',
      atoms: [{el:'C',x:150,y:100},{el:'H',x:90,y:55},{el:'H',x:210,y:55},{el:'H',x:90,y:145},{el:'H',x:210,y:145}],
      bonds: [[0,1,1],[0,2,1],[0,3,1],[0,4,1]] },
    { name: 'Ammonia', formula: 'NH\u2083', shape: 'Trigonal Pyramidal', angle: '107\u00B0', polarity: 'Polar',
      desc: 'Important industrial chemical (Haber process). Lone pair on N creates pyramidal shape and polarity.',
      atoms: [{el:'N',x:150,y:70},{el:'H',x:85,y:135},{el:'H',x:150,y:150},{el:'H',x:215,y:135}],
      bonds: [[0,1,1],[0,2,1],[0,3,1]] },
    { name: 'Hydrochloric Acid', formula: 'HCl', shape: 'Linear', angle: '180\u00B0', polarity: 'Polar',
      desc: 'Strong acid found in stomach acid. The large electronegativity difference makes it very polar.',
      atoms: [{el:'H',x:110,y:100},{el:'Cl',x:200,y:100}],
      bonds: [[0,1,1]] },
    { name: 'Oxygen Gas', formula: 'O\u2082', shape: 'Linear', angle: '180\u00B0', polarity: 'Nonpolar',
      desc: 'Essential for life. Double bond between two identical atoms means zero dipole moment.',
      atoms: [{el:'O',x:115,y:100},{el:'O',x:195,y:100}],
      bonds: [[0,1,2]] },
    { name: 'Ethanol', formula: 'C\u2082H\u2085OH', shape: 'Tetrahedral (each C)', angle: '~109\u00B0', polarity: 'Polar',
      desc: 'Drinking alcohol. The -OH group makes it polar and miscible with water.',
      atoms: [{el:'C',x:100,y:100},{el:'C',x:170,y:100},{el:'O',x:240,y:100},{el:'H',x:280,y:100},{el:'H',x:70,y:60},{el:'H',x:70,y:140},{el:'H',x:130,y:55}],
      bonds: [[0,1,1],[1,2,1],[2,3,1],[0,4,1],[0,5,1],[0,6,1]] },
    { name: 'Sodium Chloride', formula: 'NaCl', shape: 'Ionic (lattice)', angle: 'N/A', polarity: 'Ionic',
      desc: 'Table salt. Not a molecule \u2014 it\u2019s an ionic compound. Na donates an electron to Cl, forming Na\u207A and Cl\u207B ions.',
      atoms: [{el:'Na',x:120,y:100},{el:'Cl',x:200,y:100}],
      bonds: [[0,1,0]] }
  ];

  // ── GHS hazard symbols ──
  var GHS_SYMBOLS = [
    { id: 'flame', label: 'Flammable', icon: '\uD83D\uDD25', desc: 'Can catch fire easily. Keep away from heat, sparks, open flames.', examples: 'Ethanol, acetone, gasoline, methane', color: '#ef4444' },
    { id: 'oxidizer', label: 'Oxidizer', icon: '\u2B55', desc: 'Can cause or intensify fire by yielding oxygen.', examples: 'H\u2082O\u2082, KMnO\u2084, concentrated HNO\u2083', color: '#f59e0b' },
    { id: 'corrosive', label: 'Corrosive', icon: '\u26A0\uFE0F', desc: 'Can cause severe skin burns and eye damage. Damages metals.', examples: 'HCl, NaOH, H\u2082SO\u2084, HNO\u2083', color: '#7c3aed' },
    { id: 'toxic', label: 'Acute Toxicity', icon: '\u2620\uFE0F', desc: 'Fatal or toxic if swallowed, inhaled, or absorbed through skin.', examples: 'Mercury, lead acetate, cyanide compounds', color: '#1e293b' },
    { id: 'irritant', label: 'Irritant / Harmful', icon: '\u2757', desc: 'May cause skin/eye irritation, allergic skin reaction, or drowsiness.', examples: 'Dilute acids, many solvents, detergents', color: '#f97316' },
    { id: 'environment', label: 'Environmental Hazard', icon: '\uD83C\uDF0A', desc: 'Toxic to aquatic organisms with long-lasting effects.', examples: 'Pesticides, heavy metals, oil products', color: '#0ea5e9' },
    { id: 'health', label: 'Health Hazard', icon: '\uD83E\uDEC1', desc: 'May cause cancer, genetic damage, organ damage, or respiratory issues.', examples: 'Benzene, formaldehyde, asbestos', color: '#dc2626' },
    { id: 'compressed', label: 'Compressed Gas', icon: '\uD83D\uDD37', desc: 'Gas under pressure. May explode if heated. Can cause cryogenic burns.', examples: 'CO\u2082 tanks, propane, liquid nitrogen', color: '#3b82f6' },
    { id: 'explosive', label: 'Explosive', icon: '\uD83D\uDCA5', desc: 'Unstable explosives. May mass-explode with fire, shock, or friction.', examples: 'TNT, nitroglycerin, picric acid', color: '#dc2626' }
  ];

  // ── Lab emergency scenarios ──
  var EMERGENCIES = [
    { title: 'Acid Splash on Skin', urgency: 'HIGH',
      q: 'HCl splashes on your hand. What do you do FIRST?',
      opts: [
        { text: 'Flush with water for 15+ minutes', correct: true },
        { text: 'Apply baking soda immediately', correct: false },
        { text: 'Wipe off with a paper towel', correct: false },
        { text: 'Continue working and wash later', correct: false }
      ],
      explain: 'Always flush with large amounts of water first! Neutralizing agents can generate heat and make burns worse.' },
    { title: 'Chemical in Eyes', urgency: 'HIGH',
      q: 'NaOH solution splashes in your eyes. What do you do?',
      opts: [
        { text: 'Rub your eyes quickly', correct: false },
        { text: 'Use the eyewash station for 15+ minutes', correct: true },
        { text: 'Rinse with milk', correct: false },
        { text: 'Wait and see if it hurts', correct: false }
      ],
      explain: 'Go to the eyewash station immediately. Hold eyelids open and flush for at least 15 minutes. Alert the teacher.' },
    { title: 'Small Chemical Fire', urgency: 'HIGH',
      q: 'Ethanol catches fire in a beaker on your bench. What do you do?',
      opts: [
        { text: 'Blow on it hard', correct: false },
        { text: 'Pour water on it', correct: false },
        { text: 'Cover with a watch glass or fire blanket', correct: true },
        { text: 'Run away immediately', correct: false }
      ],
      explain: 'Smother small fires by cutting off oxygen. Cover with a watch glass, fire blanket, or use a CO\u2082 extinguisher. Never use water on chemical fires.' },
    { title: 'Chemical Spill on Bench', urgency: 'MEDIUM',
      q: 'You spill dilute H\u2082SO\u2084 on the lab bench. What do you do?',
      opts: [
        { text: 'Ignore it and keep working', correct: false },
        { text: 'Alert teacher, neutralize with NaHCO\u2083, clean up', correct: true },
        { text: 'Wipe with your sleeve', correct: false },
        { text: 'Pour more acid to dilute it', correct: false }
      ],
      explain: 'Alert your teacher. For acid spills, carefully apply baking soda (NaHCO\u2083) to neutralize, then wipe up with paper towels. Wear gloves!' },
    { title: 'Gas Release / Fumes', urgency: 'MEDIUM',
      q: 'You notice a strong, irritating smell coming from a reaction. What do you do?',
      opts: [
        { text: 'Lean in to identify the smell', correct: false },
        { text: 'Move away, alert teacher, use fume hood', correct: true },
        { text: 'Open a window and continue', correct: false },
        { text: 'Hold your breath and finish quickly', correct: false }
      ],
      explain: 'Never sniff chemicals directly (use the wafting technique). Move away from the source, alert your teacher, and ensure the reaction is moved to a fume hood.' }
  ];

  // ── Challenge questions (3 tiers) ──
  var CHALLENGE_QS = {
    easy: [
      { q: 'What type of reaction is: 2H\u2082 + O\u2082 \u2192 2H\u2082O?', a: ['Synthesis', 'Decomposition', 'Single Replacement', 'Combustion'], correct: 0, explain: 'Two reactants combine to form one product (A + B \u2192 AB)' },
      { q: 'What type of reaction is: CaCO\u2083 \u2192 CaO + CO\u2082?', a: ['Synthesis', 'Decomposition', 'Combustion', 'Single Replacement'], correct: 1, explain: 'One compound breaks into two or more products (AB \u2192 A + B)' },
      { q: 'In a balanced equation, what is always conserved?', a: ['Mass (atoms)', 'Molecules', 'Volume', 'Energy only'], correct: 0, explain: 'Law of Conservation of Mass: atoms are neither created nor destroyed' },
      { q: 'What does the arrow (\u2192) in a chemical equation mean?', a: ['Equals', 'Yields / produces', 'Plus', 'Minus'], correct: 1, explain: 'The arrow means "yields" or "produces" \u2014 reactants become products' },
      { q: 'What is a chemical formula?', a: ['A recipe for food', 'A shorthand for a compound', 'A math equation', 'A lab tool'], correct: 1, explain: 'Chemical formulas use element symbols and subscripts to show composition' },
      { q: 'What does the subscript 2 in H\u2082O mean?', a: ['2 water molecules', '2 hydrogen atoms', '2 oxygen atoms', 'Temperature'], correct: 1, explain: 'Subscript tells how many atoms of that element are in one molecule' },
      { q: 'What is a coefficient in a chemical equation?', a: ['The little number below', 'The big number in front', 'The arrow', 'The element symbol'], correct: 1, explain: 'Coefficients are the numbers placed before formulas to balance equations' },
      { q: 'Which is a reactant in: CH\u2084 + 2O\u2082 \u2192 CO\u2082 + 2H\u2082O?', a: ['CO\u2082', 'H\u2082O', 'CH\u2084', 'Heat'], correct: 2, explain: 'Reactants are on the LEFT side of the arrow' }
    ],
    medium: [
      { q: 'What type of reaction is: CH\u2084 + 2O\u2082 \u2192 CO\u2082 + 2H\u2082O?', a: ['Synthesis', 'Decomposition', 'Combustion', 'Acid-Base'], correct: 2, explain: 'A hydrocarbon reacts with O\u2082 to produce CO\u2082 and H\u2082O' },
      { q: 'What type is: Zn + CuSO\u2084 \u2192 ZnSO\u2084 + Cu?', a: ['Synthesis', 'Combustion', 'Single Replacement', 'Double Replacement'], correct: 2, explain: 'One element replaces another in a compound (A + BC \u2192 AC + B)' },
      { q: 'What type is: HCl + NaOH \u2192 NaCl + H\u2082O?', a: ['Combustion', 'Single Replacement', 'Double Replacement', 'Decomposition'], correct: 2, explain: 'Two compounds exchange partners (AB + CD \u2192 AD + CB)' },
      { q: 'To balance Fe + O\u2082 \u2192 Fe\u2082O\u2083, Fe\u2019s coefficient is:', a: ['1', '2', '3', '4'], correct: 3, explain: '4Fe + 3O\u2082 \u2192 2Fe\u2082O\u2083 gives 4 Fe and 6 O on each side' },
      { q: 'To balance N\u2082 + H\u2082 \u2192 NH\u2083, NH\u2083\u2019s coefficient is:', a: ['1', '2', '3', '4'], correct: 1, explain: 'N\u2082 + 3H\u2082 \u2192 2NH\u2083 gives 2 N and 6 H on each side' },
      { q: 'The molar mass of water (H\u2082O) is approximately:', a: ['2 g/mol', '18 g/mol', '32 g/mol', '16 g/mol'], correct: 1, explain: 'H\u2082O = 2(1.008) + 15.999 = 18.015 g/mol' },
      { q: 'What is Avogadro\u2019s number?', a: ['6.022 \u00D7 10\u00B2\u00B3', '3.14 \u00D7 10\u00B9\u2070', '1.602 \u00D7 10\u207B\u00B9\u2079', '9.81'], correct: 0, explain: 'One mole contains 6.022 \u00D7 10\u00B2\u00B3 particles' },
      { q: 'In CH\u2084 + 2O\u2082 \u2192 CO\u2082 + 2H\u2082O, total O atoms on the product side:', a: ['2', '3', '4', '6'], correct: 2, explain: 'CO\u2082 has 2 O + 2H\u2082O has 2 O = 4 O total' }
    ],
    hard: [
      { q: 'What is the correct balanced form of Al + O\u2082 \u2192 Al\u2082O\u2083?', a: ['2Al + O\u2082 \u2192 Al\u2082O\u2083', '4Al + 3O\u2082 \u2192 2Al\u2082O\u2083', 'Al + O\u2082 \u2192 Al\u2082O\u2083', '3Al + 2O\u2082 \u2192 Al\u2082O\u2083'], correct: 1, explain: '4 Al, 6 O on each side' },
      { q: 'What is the limiting reagent if 2 mol H\u2082 reacts with 2 mol O\u2082 (2H\u2082+O\u2082\u21922H\u2082O)?', a: ['H\u2082', 'O\u2082', 'H\u2082O', 'Neither'], correct: 0, explain: '2 mol H\u2082 needs 1 mol O\u2082. We have 2 mol O\u2082, so H\u2082 runs out first.' },
      { q: 'How many moles of CO\u2082 from burning 3 mol CH\u2084?', a: ['1', '2', '3', '6'], correct: 2, explain: 'CH\u2084 + 2O\u2082 \u2192 CO\u2082 + 2H\u2082O. 1:1 ratio, so 3 mol CH\u2084 \u2192 3 mol CO\u2082' },
      { q: 'Molar mass of Ca(OH)\u2082 is approximately:', a: ['57 g/mol', '74 g/mol', '40 g/mol', '96 g/mol'], correct: 1, explain: 'Ca(40) + 2\u00D7O(16) + 2\u00D7H(1) = 74 g/mol' },
      { q: 'An exothermic reaction:', a: ['Absorbs heat', 'Releases heat', 'Doesn\u2019t involve energy', 'Only occurs in gases'], correct: 1, explain: 'Exothermic reactions release energy to surroundings (\u0394H < 0)' },
      { q: 'What determines the activity series position?', a: ['Atomic mass', 'Reactivity / ease of oxidation', 'Color', 'Melting point'], correct: 1, explain: 'More reactive metals displace less reactive ones from compounds' },
      { q: 'In stoichiometry, "mole ratio" comes from:', a: ['Periodic table', 'Balanced equation coefficients', 'Temperature', 'Pressure'], correct: 1, explain: 'Coefficients in a balanced equation give the mole ratio of reactants and products' },
      { q: 'Percent yield = (actual/theoretical) \u00D7 100. If theoretical is 10g and actual is 8g:', a: ['80%', '125%', '18%', '2%'], correct: 0, explain: '(8/10) \u00D7 100 = 80% yield' }
    ]
  };

  // ── Battle questions ──
  var BATTLE_QS = [
    { q: 'What is the chemical formula for table salt?', a: ['NaCl', 'KCl', 'NaOH', 'HCl'], correct: 0, dmg: 15 },
    { q: 'How many atoms in one molecule of H\u2082O?', a: ['2', '3', '4', '1'], correct: 1, dmg: 15 },
    { q: 'Which element has symbol Fe?', a: ['Fluorine', 'Iron', 'Francium', 'Fermium'], correct: 1, dmg: 15 },
    { q: 'What gas do plants produce in photosynthesis?', a: ['CO\u2082', 'N\u2082', 'O\u2082', 'H\u2082'], correct: 2, dmg: 20 },
    { q: 'What is the pH of a neutral solution?', a: ['0', '7', '14', '1'], correct: 1, dmg: 20 },
    { q: 'Rust is an oxide of which element?', a: ['Copper', 'Aluminum', 'Iron', 'Zinc'], correct: 2, dmg: 15 },
    { q: 'Which subatomic particle has no charge?', a: ['Proton', 'Electron', 'Neutron', 'Ion'], correct: 2, dmg: 20 },
    { q: 'What is the most abundant gas in Earth\u2019s atmosphere?', a: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Argon'], correct: 2, dmg: 20 },
    { q: 'Diamond and graphite are both forms of:', a: ['Silicon', 'Carbon', 'Sulfur', 'Iron'], correct: 1, dmg: 25 },
    { q: 'Acid + Base \u2192 Salt + ?', a: ['Gas', 'Metal', 'Water', 'Acid'], correct: 2, dmg: 20 }
  ];

  // ── Learn topics ──
  var LEARN_TOPICS = [
    { title: 'What is a Chemical Reaction?', icon: '\u2697\uFE0F',
      k2: 'A chemical reaction is when substances mix and change into something new! Like baking a cake \u2014 you mix flour, eggs, and sugar, and they become something completely different. You can\u2019t un-bake a cake!',
      g35: 'In a chemical reaction, substances called reactants rearrange their atoms to form new substances called products. Signs of a reaction include: color change, gas bubbles, temperature change, precipitate (solid forming), or light/sound. A chemical equation shows what goes in and what comes out.',
      g68: 'Chemical reactions involve breaking and forming chemical bonds. Reactants are transformed into products while conserving mass (Law of Conservation of Mass). Equations must be balanced so atoms on both sides match. Energy is either released (exothermic, \u0394H < 0) or absorbed (endothermic, \u0394H > 0). Activation energy is needed to start most reactions.',
      g912: 'Reactions are governed by thermodynamics (\u0394G = \u0394H - T\u0394S) and kinetics (rate laws, collision theory, Arrhenius equation). Catalysts lower activation energy without being consumed. Equilibrium occurs when forward and reverse rates are equal (Le Chatelier\u2019s principle). Reaction mechanisms describe the step-by-step bond-breaking and forming process.' },
    { title: 'The Periodic Table', icon: '\uD83D\uDCCA',
      k2: 'The periodic table is like a chart of all the building blocks in the universe! Each box is a different element \u2014 like hydrogen (the lightest!) and gold (the shiniest!). Scientists arranged them by how they behave.',
      g35: 'Elements are arranged by atomic number (number of protons). Rows are called periods and columns are called groups. Elements in the same group have similar properties. Metals are on the left, nonmetals on the right, and metalloids are in between.',
      g68: 'Periodic trends include: atomic radius (decreases across a period, increases down a group), electronegativity (increases across, decreases down), and ionization energy (increases across, decreases down). Electron configuration determines chemical behavior. Valence electrons (outer shell) determine bonding.',
      g912: 'Electron configurations follow the Aufbau principle, Hund\u2019s rule, and the Pauli exclusion principle. Effective nuclear charge (Z_eff) drives periodic trends. Transition metals have partially filled d-orbitals enabling variable oxidation states and colored compounds. Lanthanides/actinides fill f-orbitals.' },
    { title: 'Chemical Bonds', icon: '\uD83D\uDD17',
      k2: 'Atoms like to stick together, just like LEGO bricks! They can share pieces (covalent bond) or one atom gives a piece to another (ionic bond). This is how everything around you is built!',
      g35: 'There are three main types of bonds: Ionic bonds (metal + nonmetal, transfer electrons, like NaCl), Covalent bonds (nonmetal + nonmetal, share electrons, like H\u2082O), and Metallic bonds (metal + metal, electrons flow freely, makes metals shiny and conductive).',
      g68: 'Bond polarity depends on electronegativity difference: nonpolar covalent (\u0394EN < 0.4), polar covalent (0.4-1.7), ionic (>1.7). Lewis dot structures show valence electrons. VSEPR theory predicts molecular geometry from electron pair repulsion. Molecular shape determines polarity.',
      g912: 'Orbital hybridization (sp, sp\u00B2, sp\u00B3) explains molecular geometry. Sigma bonds form from head-on overlap; pi bonds from lateral overlap. Molecular orbital theory describes bonding and antibonding orbitals. Intermolecular forces (London dispersion, dipole-dipole, hydrogen bonds) determine physical properties like boiling point and solubility.' },
    { title: 'Stoichiometry', icon: '\uD83E\uDDEE',
      k2: 'Stoichiometry is a big word for "recipe math!" Just like a cookie recipe says 2 cups flour + 1 cup sugar, chemistry recipes tell you how much of each ingredient you need.',
      g35: 'Stoichiometry uses balanced equations to calculate how much reactant you need or how much product you\u2019ll get. The coefficients in balanced equations tell you the ratio. For example, 2H\u2082 + O\u2082 \u2192 2H\u2082O means you need 2 hydrogen molecules for every 1 oxygen molecule.',
      g68: 'The mole (mol) is the chemist\u2019s counting unit: 6.022 \u00D7 10\u00B2\u00B3 particles. Molar mass (g/mol) converts between grams and moles. Steps: (1) Balance the equation, (2) Convert given amount to moles, (3) Use mole ratio from coefficients, (4) Convert to desired unit. The limiting reagent determines maximum product.',
      g912: 'Stoichiometric calculations involve: mole-mole, mole-mass, mass-mass conversions using dimensional analysis. Percent yield = (actual/theoretical) \u00D7 100. Limiting reagent analysis compares mole ratios of all reactants. Solution stoichiometry uses molarity (M = mol/L). Gas stoichiometry uses the ideal gas law (PV = nRT) at STP: 1 mol gas = 22.4 L.' }
  ];

  // ── Badges (12 total) ──
  var CHEM_BADGES = {
    firstBalance: { icon: '\u2696\uFE0F', label: 'First Balance', desc: 'Balance your first equation', xp: 5 },
    streak3: { icon: '\uD83D\uDD25', label: 'Hot Streak', desc: '3 in a row', xp: 10 },
    streak5: { icon: '\u2B50', label: 'Blazing', desc: '5 in a row', xp: 20 },
    allBeginner: { icon: '\uD83C\uDF31', label: 'Seedling', desc: 'Balance all beginner equations', xp: 10 },
    allIntermediate: { icon: '\u26A1', label: 'Charged Up', desc: 'All intermediate equations', xp: 15 },
    allAdvanced: { icon: '\uD83D\uDE80', label: 'Rocket Scientist', desc: 'All advanced equations', xp: 25 },
    speedDemon: { icon: '\u23F1', label: 'Speed Demon', desc: 'Balance in under 15s', xp: 15 },
    quizWhiz: { icon: '\uD83E\uDDE0', label: 'Quiz Whiz', desc: '5 challenge correct', xp: 15 },
    centurion: { icon: '\uD83D\uDCAF', label: 'Centurion', desc: 'Balance 10 equations total', xp: 20 },
    masterChemist: { icon: '\uD83E\uDDEA', label: 'Master Chemist', desc: 'All tiers + 5 quiz', xp: 30 },
    safetyPro: { icon: '\uD83E\uDDEA', label: 'Safety Pro', desc: 'Ace all emergency scenarios', xp: 15 },
    battleWinner: { icon: '\u2694\uFE0F', label: 'Element Warrior', desc: 'Win an Element Battle', xp: 20 }
  };

  // ═══════════════════════════════════════════
  // REGISTER TOOL
  // ═══════════════════════════════════════════
  window.StemLab.registerTool('chemBalance', {
    icon: '\u2697\uFE0F', label: 'Chemistry Lab',
    desc: 'Balance equations, explore reactions, stoichiometry, molecular models & lab safety',
    color: 'lime', category: 'science',
    questHooks: [
      { id: 'balance_3', label: 'Balance 3 chemical equations', icon: '⚖️', check: function(d) { var e = d._chemExt || {}; return (e.equationsBalanced || 0) >= 3; }, progress: function(d) { var e = d._chemExt || {}; return (e.equationsBalanced || 0) + '/3'; } },
      { id: 'quiz_3', label: 'Score 3+ on chemistry quiz', icon: '🧠', check: function(d) { var e = d._chemExt || {}; return (e.quizCorrect || 0) >= 3; }, progress: function(d) { var e = d._chemExt || {}; return (e.quizCorrect || 0) + '/3'; } },
      { id: 'streak_3', label: 'Get a 3-equation balancing streak', icon: '🔥', check: function(d) { return (d.streak || 0) >= 3; }, progress: function(d) { return (d.streak || 0) + '/3 streak'; } }
    ],

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var awardXP = ctx.awardXP;
      var setToolSnapshots = ctx.setToolSnapshots;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var band = getGradeBand(ctx);

      return (function() {
        var d = labToolData.chemBalance || {};

        var upd = function(key, val) {
          setLabToolData(function(prev) {
            var cb = Object.assign({}, prev.chemBalance || {});
            cb[key] = val;
            return Object.assign({}, prev, { chemBalance: cb });
          });
        };
        var updMulti = function(obj) {
          setLabToolData(function(prev) {
            var cb = Object.assign({}, prev.chemBalance || {}, obj);
            return Object.assign({}, prev, { chemBalance: cb });
          });
        };

        var subtool = d.subtool || 'balance';

        // ═══ SOUND EFFECTS ═══
        var chemSound = function(type) {
          try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            var a = new AC();
            var o = a.createOscillator();
            var g = a.createGain();
            o.connect(g); g.connect(a.destination);
            var freqs = { correct:[880,0.15], wrong:[220,0.18], streak:[740,0.12], badge:[990,0.2], balance:[660,0.12], click:[520,0.06], victory:[1047,0.25], damage:[150,0.2] };
            var f = freqs[type] || [440, 0.1];
            o.frequency.value = f[0];
            g.gain.value = 0.13;
            o.type = type === 'wrong' || type === 'damage' ? 'sawtooth' : type === 'badge' || type === 'victory' ? 'triangle' : 'sine';
            o.start();
            g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + f[1]);
            o.stop(a.currentTime + f[1] + 0.01);
          } catch(e) {}
        };

        // ═══ BADGE SYSTEM ═══
        var ext = d._chemExt || { badges: [], equationsBalanced: 0, tiersCompleted: [], speedBest: Infinity, quizCorrect: 0, safetyScore: 0, battleWon: false };
        var updExt = function(obj) {
          var merged = Object.assign({}, ext, obj);
          upd('_chemExt', merged);
          ext = merged;
        };

        var streak = d.streak || 0;

        var checkBadges = function() {
          var newBadges = ext.badges.slice();
          var changed = false;
          var award = function(id) {
            if (newBadges.indexOf(id) === -1) {
              newBadges.push(id);
              changed = true;
              var b = CHEM_BADGES[id];
              if (b) {
                chemSound('badge');
                awardXP('chem_badge_' + id, b.xp, b.label);
                addToast('\uD83C\uDFC5 ' + b.label + '! +' + b.xp + ' XP', 'success');
              }
            }
          };
          if (ext.equationsBalanced >= 1) award('firstBalance');
          if (streak >= 3) award('streak3');
          if (streak >= 5) award('streak5');
          if (ext.tiersCompleted.indexOf('beginner') !== -1) award('allBeginner');
          if (ext.tiersCompleted.indexOf('intermediate') !== -1) award('allIntermediate');
          if (ext.tiersCompleted.indexOf('advanced') !== -1) award('allAdvanced');
          if (ext.speedBest < 15) award('speedDemon');
          if (ext.quizCorrect >= 5) award('quizWhiz');
          if (ext.equationsBalanced >= 10) award('centurion');
          if (ext.tiersCompleted.length >= 3 && ext.quizCorrect >= 5) award('masterChemist');
          if (ext.safetyScore >= 5) award('safetyPro');
          if (ext.battleWon) award('battleWinner');
          if (changed) updExt({ badges: newBadges });
        };

        // ═══ AI TUTOR ═══
        var askAI = function(question) {
          if (!question || !callGemini) return;
          upd('_chemAILoading', true);
          var prompt = 'You are a friendly chemistry tutor. Answer concisely in 2-3 sentences for grade level ' + band + '. Question: ' + question;
          callGemini(prompt, false, false, 0.7).then(function(resp) {
            updMulti({ _chemAIResp: resp, _chemAILoading: false });
          }).catch(function() {
            updMulti({ _chemAIResp: 'Sorry, I could not get an answer right now.', _chemAILoading: false });
          });
        };

        // ═══ BALANCE SUB-TOOL LOGIC ═══
        var tierFilter = d.tierFilter || 'all';
        var filtered = tierFilter === 'all' ? ALL_PRESETS : ALL_PRESETS.filter(function(p) { return p.tier === tierFilter; });
        var preset = null;
        for (var fi = 0; fi < filtered.length; fi++) {
          if (filtered[fi].name === d.equation) { preset = filtered[fi]; break; }
        }
        if (!preset) preset = filtered[0];
        var numSlots = preset.target.length;
        var coeffs = (d.coefficients || []).slice(0, numSlots);
        while (coeffs.length < numSlots) coeffs.push(1);
        var showHints = d.showHints || false;

        var eqParts = preset.eq.split('\u2192');
        var leftCompounds = eqParts[0].split('+').map(function(s) { return s.trim(); });
        var rightCompounds = eqParts[1] ? eqParts[1].split('+').map(function(s) { return s.trim(); }) : [];

        var getAtomCounts = function(side) {
          var result = {};
          var atomKeys = Object.keys(preset.atoms);
          for (var ai = 0; ai < atomKeys.length; ai++) {
            var atom = atomKeys[ai];
            var perMol = preset.atoms[atom];
            var total = 0;
            for (var mi = 0; mi < perMol.length; mi++) {
              if (side === 'left' && mi < leftCompounds.length) total += perMol[mi] * coeffs[mi];
              if (side === 'right' && mi >= leftCompounds.length) total += perMol[mi] * coeffs[mi];
            }
            if (total > 0) result[atom] = total;
          }
          return result;
        };
        var leftAtoms = getAtomCounts('left');
        var rightAtoms = getAtomCounts('right');
        var isBalanced = Object.keys(preset.atoms).every(function(atom) { return (leftAtoms[atom] || 0) === (rightAtoms[atom] || 0); });

        var leftTotal = 0, rightTotal = 0;
        Object.keys(leftAtoms).forEach(function(k) { leftTotal += leftAtoms[k]; });
        Object.keys(rightAtoms).forEach(function(k) { rightTotal += rightAtoms[k]; });
        var tilt = leftTotal === rightTotal ? 0 : leftTotal > rightTotal ? -1 : 1;

        var atomColors = { H:'#60a5fa',O:'#ef4444',C:'#1e293b',N:'#3b82f6',Na:'#a855f7',Cl:'#22c55e',Mg:'#fbbf24',Fe:'#fb923c',Ca:'#f59e0b',Al:'#94a3b8',S:'#eab308',K:'#f87171' };
        var tierLabels = { beginner:'\uD83C\uDF31 Beginner', intermediate:'\u26A1 Intermediate', advanced:'\uD83D\uDE80 Advanced' };

        var checkBalance = function() {
          var isCorrect = coeffs.every(function(c, i) { return c === preset.target[i]; });
          if (isCorrect) {
            chemSound('correct');
            var newStreak = streak + 1;
            upd('streak', newStreak);
            upd('feedback', { correct: true, msg: '\u2705 Balanced! ' + (newStreak > 1 ? '\uD83D\uDD25 ' + newStreak + ' in a row!' : 'Great job!') });
            var speedTime = Infinity;
            if (d.timerActive && d.timerStart) speedTime = (Date.now() - d.timerStart) / 1000;
            var newBest = speedTime < ext.speedBest ? speedTime : ext.speedBest;
            updExt({ equationsBalanced: ext.equationsBalanced + 1, speedBest: newBest });
            checkBadges();
          } else {
            chemSound('wrong');
            upd('streak', 0);
            upd('feedback', { correct: false, msg: '\u274C Not balanced yet. Check atom counts on each side.' });
          }
        };

        var switchPreset = function(name) {
          var found = null;
          for (var si = 0; si < ALL_PRESETS.length; si++) {
            if (ALL_PRESETS[si].name === name) { found = ALL_PRESETS[si]; break; }
          }
          var len = (found && found.target) ? found.target.length : 4;
          var arr = []; for (var ai2 = 0; ai2 < len; ai2++) arr.push(1);
          updMulti({ equation: name, coefficients: arr, feedback: null });
        };

        // ═══ STOICH STATE ═══
        var stoichFormula = d._stoichFormula || 'H2O';
        var stoichGrams = d._stoichGrams != null ? d._stoichGrams : '';
        var stoichMoles = d._stoichMoles != null ? d._stoichMoles : '';

        // ═══ MOLECULAR STATE ═══
        var molIdx = d._molIdx != null ? d._molIdx : 0;
        var currentMol = MOLECULES[molIdx] || MOLECULES[0];

        // ═══ SAFETY STATE ═══
        var safetyTab = d._safetyTab || 'symbols';
        var emergIdx = d._emergIdx != null ? d._emergIdx : 0;
        var emergAnswer = d._emergAnswer || null;
        var emergFeedback = d._emergFeedback || null;

        // ═══ CHALLENGE STATE ═══
        var chalDiff = d._chalDiff || 'easy';
        var chalIdx = d._chalIdx || 0;
        var chalScore = d._chalScore || 0;
        var chalStreak = d._chalStreak || 0;
        var chalFeedback = d._chalFeedback || null;
        var chalQuestions = CHALLENGE_QS[chalDiff] || CHALLENGE_QS.easy;

        // ═══ BATTLE STATE ═══
        var battleActive = d._battleActive || false;
        var battleRound = d._battleRound || 0;
        var battleHP = d._battleHP != null ? d._battleHP : 100;
        var battleEnemyHP = d._battleEnemyHP != null ? d._battleEnemyHP : 100;
        var battleFeedback = d._battleFeedback || null;
        var battleScore = d._battleScore || 0;
        var battleResult = d._battleResult || null;

        // ═══ LEARN STATE ═══
        var learnTopic = d._learnTopic != null ? d._learnTopic : -1;

        // ═══ SNAPSHOT ═══
        var takeSnapshot = function() {
          var label = '';
          if (subtool === 'balance') label = preset.name + ' ' + coeffs.join(':');
          else if (subtool === 'stoich') label = 'Molar: ' + stoichFormula;
          else if (subtool === 'molecular') label = 'Mol: ' + currentMol.name;
          else { for (var si = 0; si < SUBTOOLS.length; si++) { if (SUBTOOLS[si].id === subtool) { label = SUBTOOLS[si].label; break; } } }
          setToolSnapshots(function(prev) {
            return (prev || []).concat([{ id: 'cb-' + Date.now(), tool: 'chemBalance', label: label, data: Object.assign({}, d), timestamp: Date.now() }]);
          });
          addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
        };

        // ════════════════════════════════════════
        // RENDER
        // ════════════════════════════════════════
        return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'max-w-3xl mx-auto animate-in fade-in duration-200' },

          // ── Header ──
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-3 mb-3' },
            h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back to tools' },
              h(ArrowLeft, { size: 18, className: 'text-slate-600' })
            ),
            h('h3', { className: 'text-lg font-bold text-slate-800' }, '\u2697\uFE0F Chemistry Lab'),
            h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'px-2 py-0.5 bg-lime-100 text-lime-700 text-[10px] font-bold rounded-full' }, 'CHEM v3'),
            streak > 0 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full animate-in zoom-in' }, '\uD83D\uDD25 ' + streak),
            h('button', { 'aria-label': 'AI',
              onClick: function() { upd('_showBadges', !d._showBadges); },
              className: 'ml-auto px-2 py-1 text-[10px] font-bold rounded-lg border ' + (d._showBadges ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-50 text-slate-600 border-slate-200')
            }, '\uD83C\uDFC5 ' + ext.badges.length + '/' + Object.keys(CHEM_BADGES).length),
            h('button', { 'aria-label': 'AI',
              onClick: function() { upd('_showAI', !d._showAI); },
              className: 'px-2 py-1 text-[10px] font-bold rounded-lg border ' + (d._showAI ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-slate-50 text-slate-600 border-slate-200')
            }, '\uD83E\uDD16 AI')
          ),

          // ── Sub-tool Navigation ──
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1 mb-3' },
            SUBTOOLS.map(function(st) {
              var isActive = subtool === st.id;
              return h('button', { 'aria-label': 'Change subtool',
                key: st.id,
                onClick: function() { upd('subtool', st.id); announceToSR('Switched to ' + st.label); },
                className: 'px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ' +
                  (isActive ? 'bg-lime-600 text-white border-lime-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-lime-300 hover:bg-lime-50'),
                title: st.desc
              }, st.icon + ' ' + st.label);
            })
          ),

          // ── Badge Panel ──
          d._showBadges && h('div', { className: 'mb-3 bg-amber-50 rounded-xl p-3 border border-amber-200' },
            h('p', { className: 'text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2' }, '\uD83C\uDFC5 Chemistry Badges'),
            h('div', { className: 'grid grid-cols-6 gap-1.5' },
              Object.keys(CHEM_BADGES).map(function(bid) {
                var b = CHEM_BADGES[bid];
                var earned = ext.badges.indexOf(bid) !== -1;
                return h('div', { key: bid, className: 'text-center p-1.5 rounded-lg border ' + (earned ? 'bg-white border-amber-300' : 'bg-slate-50 border-slate-200 opacity-50'), title: b.desc },
                  h('span', { className: 'text-lg block' }, earned ? b.icon : '\uD83D\uDD12'),
                  h('span', { className: 'text-[7px] font-bold block ' + (earned ? 'text-amber-700' : 'text-slate-500') }, b.label)
                );
              })
            )
          ),

          // ── AI Tutor ──
          d._showAI && h('div', { className: 'mb-3 bg-sky-50 rounded-xl p-3 border border-sky-200' },
            h('p', { className: 'text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-2' }, '\uD83E\uDD16 AI Chemistry Tutor'),
            h('div', { className: 'flex gap-2 mb-2' },
              h('input', { type: 'text', value: d._chemAIQ || '', onChange: function(e) { upd('_chemAIQ', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') askAI(d._chemAIQ); }, placeholder: 'Ask a chemistry question...', 'aria-label': 'Ask the chemistry tutor', className: 'flex-1 px-3 py-1.5 text-sm border border-sky-200 rounded-lg focus:outline-none focus:border-sky-400' }),
              h('button', { 'aria-label': 'Ask A I', onClick: function() { askAI(d._chemAIQ); }, disabled: d._chemAILoading, className: 'px-3 py-1.5 text-xs font-bold text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-50' }, d._chemAILoading ? '\u23F3...' : 'Ask')
            ),
            d._chemAIResp && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-sky-100' }, d._chemAIResp)
          ),

          // ════════════════════════════════════════
          // BALANCE SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'balance' && h('div', null,
            // Tier filter
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 mb-3' },
              ['all', 'beginner', 'intermediate', 'advanced'].map(function(tier) {
                return h('button', { 'aria-label': 'Change tier filter', key: tier, onClick: function() { upd('tierFilter', tier); var first = tier === 'all' ? ALL_PRESETS[0] : null; if (!first) { for (var ti = 0; ti < ALL_PRESETS.length; ti++) { if (ALL_PRESETS[ti].tier === tier) { first = ALL_PRESETS[ti]; break; } } } if (first) switchPreset(first.name); }, className: 'px-3 py-1 rounded-full text-xs font-bold transition-all ' + (tierFilter === tier ? 'bg-lime-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') }, tier === 'all' ? '\uD83D\uDCCA All' : tierLabels[tier] || tier);
              })
            ),
            // Equation chips
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5 mb-3' },
              filtered.map(function(p) {
                return h('button', { 'aria-label': 'Switch Preset', key: p.name, onClick: function() { switchPreset(p.name); }, className: 'px-3 py-1 rounded-lg text-xs font-bold transition-all ' + (d.equation === p.name ? 'bg-lime-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-lime-50 border border-slate-200') }, p.name);
              })
            ),
            // Balance Scale SVG
            h('svg', { viewBox: '0 0 400 100', className: 'w-full mb-3', style: { maxHeight: '100px' } },
              h('polygon', { points: '200,95 190,75 210,75', fill: '#64748b' }),
              h('line', { x1: 60, y1: 75 + tilt * 8, x2: 340, y2: 75 - tilt * 8, stroke: isBalanced ? '#22c55e' : '#94a3b8', strokeWidth: 3, strokeLinecap: 'round', style: { transition: 'all 0.3s' } }),
              h('ellipse', { cx: 100, cy: 80 + tilt * 8, rx: 50, ry: 8, fill: isBalanced ? '#dcfce7' : '#f1f5f9', stroke: isBalanced ? '#22c55e' : '#94a3b8', strokeWidth: 1.5, style: { transition: 'all 0.3s' } }),
              h('ellipse', { cx: 300, cy: 80 - tilt * 8, rx: 50, ry: 8, fill: isBalanced ? '#dcfce7' : '#f1f5f9', stroke: isBalanced ? '#22c55e' : '#94a3b8', strokeWidth: 1.5, style: { transition: 'all 0.3s' } }),
              Object.keys(leftAtoms).map(function(atom, idx) {
                var count = leftAtoms[atom]; var balls = [];
                for (var b = 0; b < Math.min(count, 8); b++) balls.push(h('circle', { key: atom + b, cx: 70 + idx * 18 + (b % 3) * 10, cy: 60 + tilt * 8 - Math.floor(b / 3) * 10, r: 5, fill: atomColors[atom] || '#64748b', stroke: 'white', strokeWidth: 0.5 }));
                return h('g', { key: 'l' + atom }, balls, h('text', { x: 70 + idx * 18, y: 42 + tilt * 8, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: 'bold' }, fill: atomColors[atom] || '#64748b' }, atom + '\u00D7' + count));
              }),
              Object.keys(rightAtoms).map(function(atom, idx) {
                var count = rightAtoms[atom]; var balls = [];
                for (var b = 0; b < Math.min(count, 8); b++) balls.push(h('circle', { key: atom + b, cx: 270 + idx * 18 + (b % 3) * 10, cy: 60 - tilt * 8 - Math.floor(b / 3) * 10, r: 5, fill: atomColors[atom] || '#64748b', stroke: 'white', strokeWidth: 0.5 }));
                return h('g', { key: 'r' + atom }, balls, h('text', { x: 270 + idx * 18, y: 42 - tilt * 8, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: 'bold' }, fill: atomColors[atom] || '#64748b' }, atom + '\u00D7' + count));
              }),
              h('text', { x: 100, y: 15, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold' }, fill: '#475569' }, 'Reactants'),
              h('text', { x: 300, y: 15, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold' }, fill: '#475569' }, 'Products'),
              isBalanced && h('text', { x: 200, y: 15, textAnchor: 'middle', style: { fontSize: '10px', fontWeight: 'bold' }, fill: '#22c55e' }, '\u2705 Balanced!')
            ),
            // Equation card
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-xl border-2 p-5 text-center transition-colors ' + (isBalanced ? 'border-emerald-300 bg-emerald-50/30' : 'border-lime-200') },
              h('p', { className: 'text-2xl font-bold text-slate-800 mb-4 tracking-wide' },
                (function() {
                  var fmt = function(seg, i) { return (coeffs[i] > 1 ? coeffs[i] : '') + seg; };
                  return leftCompounds.map(function(s, i) { return fmt(s, i); }).join(' + ') + ' \u2192 ' + rightCompounds.map(function(s, i) { return fmt(s, leftCompounds.length + i); }).join(' + ');
                })()
              ),
              // Coefficient controls
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex justify-center gap-4 mb-4' },
                coeffs.map(function(c, i) {
                  return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: i, className: 'flex flex-col items-center gap-1' },
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[11px] font-bold text-slate-600 mb-0.5' }, i < leftCompounds.length ? leftCompounds[i] : rightCompounds[i - leftCompounds.length]),
                    h('button', { 'aria-label': 'Add', onClick: function() { chemSound('click'); var nc = coeffs.slice(); nc[i] = Math.min(12, nc[i] + 1); updMulti({ coefficients: nc, feedback: null }); }, className: 'w-9 h-9 bg-lime-100 rounded-lg font-bold text-lime-700 hover:bg-lime-200 transition-colors text-lg' }, '+'),
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-2xl font-black text-slate-700 w-9 text-center' }, c),
                    h('button', { 'aria-label': 'Chem Sound', onClick: function() { chemSound('click'); var nc = coeffs.slice(); nc[i] = Math.max(1, nc[i] - 1); updMulti({ coefficients: nc, feedback: null }); }, className: 'w-9 h-9 bg-red-50 rounded-lg font-bold text-red-500 hover:bg-red-100 transition-colors text-lg' }, '\u2212')
                  );
                })
              ),
              // Atom counts
              h('div', { className: 'flex justify-center gap-4 mb-4' },
                Object.keys(preset.atoms).map(function(atom) {
                  var left = leftAtoms[atom] || 0;
                  var right = rightAtoms[atom] || 0;
                  var match = left === right;
                  return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: atom, className: 'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border transition-all ' + (match ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200') },
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black', style: { backgroundColor: atomColors[atom] || '#64748b' } }, atom),
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-1 text-xs font-bold' },
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: match ? 'text-emerald-600' : 'text-red-600' }, left),
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-slate-600' }, match ? '=' : '\u2260'),
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: match ? 'text-emerald-600' : 'text-red-600' }, right)
                    )
                  );
                })
              ),
              // Action buttons
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex justify-center gap-2 mb-3 flex-wrap' },
                h('button', { 'aria-label': 'Check', onClick: checkBalance, className: 'px-5 py-2 bg-lime-600 text-white font-bold rounded-lg hover:bg-lime-700 transition-colors shadow-sm text-sm' }, '\u2696\uFE0F Check'),
                h('button', { 'aria-label': 'Hints', onClick: function() { upd('showHints', !showHints); }, className: 'px-3 py-2 rounded-lg font-bold text-xs transition-colors ' + (showHints ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-blue-50') }, '\uD83D\uDCA1 Hints'),
                h('button', { 'aria-label': 'Reset', onClick: function() { var arr = []; for (var ri = 0; ri < numSlots; ri++) arr.push(1); updMulti({ coefficients: arr, feedback: null }); }, className: 'px-3 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200' }, '\uD83D\uDD04 Reset'),
                h('button', { 'aria-label': 'Random', onClick: function() { var pick = filtered[Math.floor(Math.random() * filtered.length)]; switchPreset(pick.name); addToast('\uD83C\uDFB2 ' + pick.name, 'info'); }, className: 'px-3 py-2 bg-purple-100 text-purple-700 rounded-lg font-bold text-xs hover:bg-purple-200 border border-purple-200' }, '\uD83C\uDFB2 Random')
              ),
              showHints && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 bg-blue-50 rounded-lg p-3 border border-blue-200 text-left' },
                h('p', { className: 'text-xs font-bold text-blue-700 mb-1' }, '\uD83D\uDCA1 ' + preset.hint),
                h('p', { className: 'text-[10px] text-blue-600' }, '\u2022 Balance one element at a time \u2022 Start with the most complex compound \u2022 Save O or H for last')
              ),
              d.feedback && h('p', { className: 'mt-3 text-sm font-bold ' + (d.feedback.correct ? 'text-emerald-600' : 'text-red-600') }, d.feedback.msg)
            ),
            // Timer
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 flex items-center gap-3' },
              h('button', { 'aria-label': 'Change _rxn open', onClick: function() { if (d.timerActive) { updMulti({ timerActive: false, timerEnd: null }); } else { var arr = []; for (var ri = 0; ri < numSlots; ri++) arr.push(1); updMulti({ timerActive: true, timerStart: Date.now(), coefficients: arr, feedback: null }); } }, className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + (d.timerActive ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200') }, d.timerActive ? '\u23F9 Stop' : '\u23F1 Speed Challenge'),
              d.timerActive && d.timerStart && h('span', { className: 'text-xs font-mono font-bold text-amber-600' }, '\u23F1 ' + ((Date.now() - d.timerStart) / 1000).toFixed(0) + 's')
            )
          ),

          // ════════════════════════════════════════
          // REACTION TYPES SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'reactions' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' },
              gradeText(
                'There are 5 main ways chemicals can react. Explore each one!',
                'Chemical reactions fall into 5 categories based on how atoms rearrange. Each type follows a pattern.',
                'Classify reactions by analyzing reactant/product patterns. Understanding types helps predict products.',
                'Reaction classification: synthesis, decomposition, single/double displacement, combustion. Activity series and solubility rules predict reaction outcomes.'
              )(band)
            ),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-3' },
              REACTION_TYPES.map(function(rt) {
                var isOpen = d._rxnOpen === rt.id;
                return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: rt.id, className: 'bg-white rounded-xl border ' + (isOpen ? 'border-' + rt.color + '-300 shadow-md' : 'border-slate-200') },
                  h('button', { 'aria-label': 'Change _rxn open', onClick: function() { upd('_rxnOpen', isOpen ? null : rt.id); chemSound('click'); }, className: 'w-full flex items-center gap-3 p-3 text-left' },
                    h('span', { className: 'text-2xl' }, rt.icon),
                    h('div', { className: 'flex-1' },
                      h('p', { className: 'text-sm font-bold text-slate-700' }, rt.label),
                      h('p', { className: 'text-[10px] font-mono text-slate-600' }, rt.pattern)
                    ),
                    h('span', { className: 'text-xs text-slate-600' }, isOpen ? '\u25B2' : '\u25BC')
                  ),
                  isOpen && h('div', { className: 'px-3 pb-3' },
                    h('p', { className: 'text-xs text-slate-600 mb-2' }, rt.desc),
                    h('div', { className: 'space-y-1' },
                      rt.examples.map(function(ex, ei) {
                        return h('div', { key: ei, className: 'flex items-center gap-2 bg-' + rt.color + '-50 rounded-lg p-2 border border-' + rt.color + '-100' },
                          h('span', { className: 'text-xs font-mono font-bold text-' + rt.color + '-700 flex-1' }, ex.eq),
                          h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[11px] text-' + rt.color + '-500' }, ex.name)
                        );
                      })
                    )
                  )
                );
              })
            ),
            // Classify mini-game
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl p-3 border border-purple-200' },
              h('p', { className: 'text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-2' }, '\uD83E\uDDE9 Classify This Reaction'),
              (function() {
                var classifyQ = d._classifyQ;
                if (!classifyQ) {
                  return h('button', { 'aria-label': 'Start', onClick: function() {
                    var all = [];
                    REACTION_TYPES.forEach(function(rt) { rt.examples.forEach(function(ex) { all.push({ eq: ex.eq, type: rt.id, label: rt.label }); }); });
                    var pick = all[Math.floor(Math.random() * all.length)];
                    upd('_classifyQ', pick);
                    upd('_classifyFb', null);
                  }, className: 'px-4 py-2 text-xs font-bold text-white bg-purple-700 rounded-lg hover:bg-purple-600' }, '\u25B6 Start');
                }
                return h('div', null,
                  h('p', { className: 'text-sm font-bold text-slate-700 mb-2' }, classifyQ.eq),
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5' },
                    REACTION_TYPES.map(function(rt) {
                      var fb = d._classifyFb;
                      var isCorrect = fb && classifyQ.type === rt.id;
                      var isWrong = fb && fb === rt.id && classifyQ.type !== rt.id;
                      return h('button', { 'aria-label': 'Chembalance action', key: rt.id, onClick: function() {
                        if (d._classifyFb) return;
                        upd('_classifyFb', rt.id);
                        if (rt.id === classifyQ.type) { chemSound('correct'); addToast('\u2705 ' + rt.label + '!', 'success'); } else { chemSound('wrong'); }
                      }, className: 'px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ' + (isCorrect ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : isWrong ? 'bg-red-100 text-red-700 border-red-300' : fb ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300') }, rt.icon + ' ' + rt.label);
                    })
                  ),
                  d._classifyFb && h('button', { 'aria-label': 'Next', onClick: function() {
                    var all = [];
                    REACTION_TYPES.forEach(function(rt) { rt.examples.forEach(function(ex) { all.push({ eq: ex.eq, type: rt.id, label: rt.label }); }); });
                    var pick = all[Math.floor(Math.random() * all.length)];
                    updMulti({ _classifyQ: pick, _classifyFb: null });
                  }, className: 'mt-2 px-3 py-1 text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100' }, '\u27A1 Next')
                );
              })()
            )
          ),

          // ════════════════════════════════════════
          // STOICHIOMETRY SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'stoich' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' },
              gradeText(
                'Figure out how heavy molecules are! Type a chemical formula to see.',
                'Calculate the molar mass of any compound. The molar mass tells you how many grams equal one mole.',
                'Use molar mass to convert between grams and moles. Essential for stoichiometric calculations.',
                'Molar mass calculator with gram-mole interconversion. Use balanced equation coefficients for mole ratios.'
              )(band)
            ),
            // Formula input
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-3 border border-teal-200 mb-3' },
              h('label', { className: 'text-[10px] font-bold text-teal-600 uppercase tracking-wider block mb-1' }, '\uD83E\uDDEE Enter Chemical Formula'),
              h('input', { type: 'text', value: stoichFormula, onChange: function(e) { upd('_stoichFormula', e.target.value); }, placeholder: 'e.g. H2O, NaCl, Ca(OH)2', 'aria-label': 'Chemical formula input', className: 'w-full px-3 py-2 text-sm font-mono font-bold border border-teal-200 rounded-lg focus:outline-none focus:border-teal-400 tracking-widest mb-2' }),
              // Presets
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1' },
                MOLAR_PRESETS.map(function(mp) {
                  return h('button', { 'aria-label': 'Enter a valid formula above', key: mp.formula, onClick: function() { upd('_stoichFormula', mp.formula); chemSound('click'); }, className: 'px-2 py-0.5 text-[11px] font-bold rounded bg-white text-teal-600 border border-teal-200 hover:bg-teal-50' }, mp.name);
                })
              )
            ),
            // Result
            (function() {
              var result = parseFormula(stoichFormula);
              var mass = result.mass;
              var elems = result.elems;
              if (mass <= 0) return h('p', { className: 'text-xs text-slate-600 italic' }, 'Enter a valid formula above');
              return h('div', { className: 'bg-white rounded-xl border p-3 mb-3' },
                h('div', { className: 'flex items-center gap-3 mb-3' },
                  h('p', { className: 'text-lg font-bold text-teal-700' }, 'Molar Mass: ' + mass.toFixed(3) + ' g/mol'),
                  h('span', { className: 'px-2 py-0.5 bg-teal-100 text-teal-600 text-[10px] font-bold rounded-full' }, stoichFormula)
                ),
                // Element breakdown
                h('div', { className: 'flex flex-wrap gap-2 mb-3' },
                  Object.keys(elems).map(function(el) {
                    var elMass = ELEMENTS[el] ? ELEMENTS[el].m * elems[el] : 0;
                    var pct = mass > 0 ? (elMass / mass * 100).toFixed(1) : 0;
                    return h('div', { key: el, className: 'flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1 border' },
                      h('div', { className: 'w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black', style: { backgroundColor: ATOM_COLORS[el] || '#64748b' } }, el),
                      h('span', { className: 'text-[10px] font-bold text-slate-600' }, el + ' \u00D7' + elems[el]),
                      h('span', { className: 'text-[11px] text-slate-600' }, pct + '%')
                    );
                  })
                ),
                // Gram-mole converter
                h('div', { className: 'grid grid-cols-2 gap-3' },
                  h('div', null,
                    h('label', { className: 'text-[11px] font-bold text-slate-600 block mb-1' }, 'Grams \u2192 Moles'),
                    h('input', { type: 'number', value: stoichGrams, onChange: function(e) { var g = parseFloat(e.target.value); upd('_stoichGrams', e.target.value); if (!isNaN(g) && mass > 0) upd('_stoichMoles', (g / mass).toFixed(4)); }, placeholder: 'grams', 'aria-label': 'Grams to convert to moles', className: 'w-full px-2 py-1 text-sm border rounded-lg' }),
                    stoichGrams && h('p', { className: 'text-[10px] font-bold text-teal-600 mt-1' }, stoichGrams + 'g = ' + (parseFloat(stoichGrams) / mass).toFixed(4) + ' mol')
                  ),
                  h('div', null,
                    h('label', { className: 'text-[11px] font-bold text-slate-600 block mb-1' }, 'Moles \u2192 Grams'),
                    h('input', { type: 'number', value: stoichMoles, onChange: function(e) { var m = parseFloat(e.target.value); upd('_stoichMoles', e.target.value); if (!isNaN(m) && mass > 0) upd('_stoichGrams', (m * mass).toFixed(4)); }, placeholder: 'moles', 'aria-label': 'Moles to convert to grams', className: 'w-full px-2 py-1 text-sm border rounded-lg' }),
                    stoichMoles && h('p', { className: 'text-[10px] font-bold text-teal-600 mt-1' }, stoichMoles + ' mol = ' + (parseFloat(stoichMoles) * mass).toFixed(4) + 'g')
                  )
                )
              );
            })()
          ),

          // ════════════════════════════════════════
          // MOLECULAR VIEWER SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'molecular' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' },
              gradeText(
                'See what molecules look like! Pick one below.',
                'Explore ball-and-stick models of common molecules. Different colors represent different elements.',
                'Analyze molecular geometry using VSEPR theory. Bond angles and polarity depend on electron arrangement.',
                'Ball-and-stick models. Analyze shape (VSEPR), polarity (dipole moment), and bonding characteristics.'
              )(band)
            ),
            // Molecule selector
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5 mb-3' },
              MOLECULES.map(function(mol, idx) {
                return h('button', { 'aria-label': 'Change _mol idx', key: idx, onClick: function() { upd('_molIdx', idx); chemSound('click'); }, className: 'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ' + (molIdx === idx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300') }, mol.formula + ' ' + mol.name);
              })
            ),
            // SVG viewer
            h('div', { className: 'bg-white rounded-xl border border-indigo-200 p-3' },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('p', { className: 'text-sm font-bold text-indigo-700' }, currentMol.name + ' (' + currentMol.formula + ')'),
                h('span', { className: 'px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[11px] font-bold rounded-full' }, currentMol.shape)
              ),
              h('svg', { viewBox: '0 0 300 200', className: 'w-full max-w-sm mx-auto', style: { background: '#fafafa', borderRadius: '8px' } },
                // Bonds
                currentMol.bonds.map(function(bond, bi) {
                  var a1 = currentMol.atoms[bond[0]];
                  var a2 = currentMol.atoms[bond[1]];
                  var order = bond[2] || 1;
                  var els = [];
                  if (order === 0) {
                    // Ionic - dashed line
                    els.push(h('line', { key: 'b' + bi, x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '6,4' }));
                  } else if (order === 2) {
                    var dx = a2.x - a1.x, dy = a2.y - a1.y;
                    var len = Math.sqrt(dx * dx + dy * dy) || 1;
                    var nx = -dy / len * 3, ny = dx / len * 3;
                    els.push(h('line', { key: 'b' + bi + 'a', x1: a1.x + nx, y1: a1.y + ny, x2: a2.x + nx, y2: a2.y + ny, stroke: '#64748b', strokeWidth: 3 }));
                    els.push(h('line', { key: 'b' + bi + 'b', x1: a1.x - nx, y1: a1.y - ny, x2: a2.x - nx, y2: a2.y - ny, stroke: '#64748b', strokeWidth: 3 }));
                  } else {
                    els.push(h('line', { key: 'b' + bi, x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, stroke: '#64748b', strokeWidth: 3 }));
                  }
                  return els;
                }),
                // Atoms
                currentMol.atoms.map(function(atom, ai) {
                  var r = atom.el === 'H' ? 12 : 16;
                  var col = ATOM_COLORS[atom.el] || '#64748b';
                  var textCol = atom.el === 'H' || atom.el === 'Ag' || atom.el === 'Ca' ? '#1e293b' : '#ffffff';
                  return h('g', { key: 'a' + ai },
                    h('circle', { cx: atom.x, cy: atom.y, r: r, fill: col, stroke: '#1e293b', strokeWidth: 1.5 }),
                    h('text', { x: atom.x, y: atom.y + 4, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold', fill: textCol } }, atom.el)
                  );
                })
              ),
              // Info cards
              h('div', { className: 'grid grid-cols-3 gap-2 mt-3' },
                h('div', { className: 'bg-indigo-50 rounded-lg p-2 text-center border border-indigo-100' },
                  h('p', { className: 'text-[10px] font-bold text-indigo-500' }, 'SHAPE'),
                  h('p', { className: 'text-[10px] font-bold text-indigo-700' }, currentMol.shape)
                ),
                h('div', { className: 'bg-indigo-50 rounded-lg p-2 text-center border border-indigo-100' },
                  h('p', { className: 'text-[10px] font-bold text-indigo-500' }, 'BOND ANGLE'),
                  h('p', { className: 'text-[10px] font-bold text-indigo-700' }, currentMol.angle)
                ),
                h('div', { className: 'bg-indigo-50 rounded-lg p-2 text-center border border-indigo-100' },
                  h('p', { className: 'text-[10px] font-bold text-indigo-500' }, 'POLARITY'),
                  h('p', { className: 'text-[10px] font-bold text-indigo-700' }, currentMol.polarity)
                )
              ),
              h('p', { className: 'text-xs text-slate-600 mt-2' }, currentMol.desc)
            )
          ),

          // ════════════════════════════════════════
          // LAB SAFETY SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'safety' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' },
              gradeText(
                'Lab safety keeps everyone healthy! Learn the warning signs and what to do in emergencies.',
                'Know the hazard symbols, wear your PPE, and always follow lab rules. Safety first!',
                'GHS hazard pictograms communicate dangers. Know emergency procedures for chemical incidents.',
                'GHS classification system, SDS interpretation, PPE selection, and emergency response protocols.'
              )(band)
            ),
            // Safety tabs
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 mb-3' },
              [{ id: 'symbols', label: '\u26A0\uFE0F GHS Symbols' }, { id: 'emergencies', label: '\uD83D\uDEA8 Emergencies' }, { id: 'rules', label: '\uD83D\uDCCB Lab Rules' }].map(function(tab) {
                return h('button', { 'aria-label': 'Change _safety tab', key: tab.id, onClick: function() { upd('_safetyTab', tab.id); }, className: 'px-3 py-1.5 text-[10px] font-bold rounded-lg border ' + (safetyTab === tab.id ? 'bg-red-700 text-white border-red-500' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300') }, tab.label);
              })
            ),
            // GHS Symbols
            safetyTab === 'symbols' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-3 gap-2' },
              GHS_SYMBOLS.map(function(sym) {
                var isOpen = d._ghsOpen === sym.id;
                return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: sym.id, onClick: function() { upd('_ghsOpen', isOpen ? null : sym.id); }, className: 'cursor-pointer rounded-xl border p-2.5 transition-all ' + (isOpen ? 'col-span-3 bg-red-50 border-red-300' : 'bg-white border-slate-200 hover:border-red-200') },
                  h('div', { className: 'flex items-center gap-2' },
                    h('div', { className: 'w-10 h-10 flex items-center justify-center rounded-lg text-2xl', style: { background: sym.color + '15', border: '2px solid ' + sym.color } }, sym.icon),
                    h('div', null,
                      h('p', { className: 'text-[10px] font-bold text-slate-700' }, sym.label),
                      !isOpen && h('p', { className: 'text-[10px] text-slate-600' }, sym.desc.substring(0, 40) + '...')
                    )
                  ),
                  isOpen && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-2 pt-2 border-t border-red-200' },
                    h('p', { className: 'text-xs text-slate-600 mb-1' }, sym.desc),
                    h('p', { className: 'text-[10px] text-red-600 font-bold' }, 'Examples: ' + sym.examples)
                  )
                );
              })
            ),
            // Emergencies
            safetyTab === 'emergencies' && h('div', null,
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-1.5 mb-3' },
                EMERGENCIES.map(function(em, idx) {
                  return h('button', { 'aria-label': 'Change _emerg answer', key: idx, onClick: function() { updMulti({ _emergIdx: idx, _emergAnswer: null, _emergFeedback: null }); }, className: 'px-2 py-1 text-[11px] font-bold rounded-lg border ' + (emergIdx === idx ? 'bg-red-700 text-white border-red-500' : 'bg-white text-slate-600 border-slate-200') }, (idx + 1) + '. ' + em.title);
                })
              ),
              (function() {
                var em = EMERGENCIES[emergIdx];
                return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-xl border p-3' },
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2 mb-2' },
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'px-2 py-0.5 text-[11px] font-bold rounded-full ' + (em.urgency === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700') }, em.urgency),
                    h('p', { className: 'text-sm font-bold text-slate-700' }, em.title)
                  ),
                  h('p', { className: 'text-xs text-slate-600 mb-3' }, em.q),
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-2 gap-2' },
                    em.opts.map(function(opt, oi) {
                      var isChosen = emergAnswer === oi;
                      var showResult = emergFeedback !== null;
                      return h('button', { 'aria-label': 'Chembalance action', key: oi, onClick: function() {
                        if (emergFeedback !== null) return;
                        upd('_emergAnswer', oi);
                        if (opt.correct) {
                          chemSound('correct');
                          upd('_emergFeedback', '\u2705 Correct! ' + em.explain);
                          var newSafe = (ext.safetyScore || 0) + 1;
                          updExt({ safetyScore: newSafe });
                          checkBadges();
                          awardXP('safety_' + emergIdx, 10, 'Safety Scenario');
                        } else {
                          chemSound('wrong');
                          upd('_emergFeedback', '\u274C ' + em.explain);
                        }
                      }, className: 'px-3 py-2 text-xs font-bold rounded-lg border transition-all ' + (showResult ? (opt.correct ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : isChosen ? 'bg-red-100 text-red-700 border-red-300' : 'bg-slate-50 text-slate-600 border-slate-200') : 'bg-white text-slate-700 border-slate-200 hover:border-red-300') }, opt.text);
                    })
                  ),
                  emergFeedback && h('p', { className: 'mt-2 text-xs font-bold ' + (emergFeedback.indexOf('\u2705') !== -1 ? 'text-emerald-600' : 'text-red-500') }, emergFeedback)
                );
              })()
            ),
            // Lab Rules
            safetyTab === 'rules' && h('div', { className: 'space-y-2' },
              [
                { icon: '\uD83E\uDDEA', rule: 'Always wear safety goggles', desc: 'Protect your eyes from splashes, fumes, and debris. Put goggles on before starting and keep them on until cleanup is complete.' },
                { icon: '\uD83E\uDDE4', rule: 'Wear gloves when handling chemicals', desc: 'Nitrile gloves protect against most lab chemicals. Replace immediately if torn or contaminated.' },
                { icon: '\uD83D\uDC43', rule: 'Never smell chemicals directly', desc: 'Use the wafting technique: hold the container away and gently wave the air toward your nose with your hand.' },
                { icon: '\uD83D\uDEAB', rule: 'No food or drink in the lab', desc: 'Chemical contamination is invisible. Even trace amounts on hands or surfaces can be ingested.' },
                { icon: '\uD83E\uDDFC', rule: 'Wash hands after every lab', desc: 'Wash thoroughly with soap and water for at least 20 seconds, even if you wore gloves.' },
                { icon: '\uD83D\uDD25', rule: 'Know fire extinguisher & eyewash locations', desc: 'Before starting any lab, locate the nearest fire extinguisher, eyewash station, safety shower, and exits.' },
                { icon: '\uD83D\uDCE2', rule: 'Report all spills and accidents immediately', desc: 'No matter how small. Your teacher needs to know so proper cleanup and safety measures can be taken.' }
              ].map(function(r, ri) {
                return h('div', { key: ri, className: 'flex items-start gap-3 bg-white rounded-xl border p-3' },
                  h('span', { className: 'text-xl' }, r.icon),
                  h('div', null,
                    h('p', { className: 'text-xs font-bold text-slate-700' }, r.rule),
                    h('p', { className: 'text-[10px] text-slate-600' }, r.desc)
                  )
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // CHALLENGE SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'challenge' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, 'Test your chemistry knowledge across 3 difficulty levels!'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 mb-3' },
              ['easy', 'medium', 'hard'].map(function(diff) {
                var labels = { easy: '\uD83C\uDF31 Beginner', medium: '\u26A1 Intermediate', hard: '\uD83D\uDE80 Advanced' };
                var colors = { easy: 'emerald', medium: 'amber', hard: 'red' };
                return h('button', { 'aria-label': 'BONUS!', key: diff, onClick: function() { updMulti({ _chalDiff: diff, _chalIdx: 0, _chalScore: 0, _chalStreak: 0, _chalFeedback: null }); }, className: 'px-3 py-1.5 text-[11px] font-bold rounded-lg border-2 transition-all ' + (chalDiff === diff ? 'bg-' + colors[diff] + '-500 text-white border-' + colors[diff] + '-500 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-' + colors[diff] + '-300') }, labels[diff]);
              })
            ),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-3 mb-3 bg-slate-50 rounded-lg p-2' },
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-slate-600' }, 'Q ' + (chalIdx + 1) + '/' + chalQuestions.length),
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-emerald-600' }, '\u2705 ' + chalScore),
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-amber-600' }, '\uD83D\uDD25 ' + chalStreak),
              chalStreak >= 3 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-fuchsia-600 animate-pulse' }, '\u2B50 BONUS!')
            ),
            chalIdx < chalQuestions.length ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-xl border p-4' },
              h('p', { className: 'text-sm font-bold text-slate-700 mb-3' }, chalQuestions[chalIdx].q),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-2 gap-2' },
                chalQuestions[chalIdx].a.map(function(opt, i) {
                  return h('button', { 'aria-label': 'Select option', key: i, onClick: function() {
                    if (chalFeedback) return;
                    var isCorrect = i === chalQuestions[chalIdx].correct;
                    var ns = chalScore + (isCorrect ? 1 : 0);
                    var nk = isCorrect ? chalStreak + 1 : 0;
                    if (isCorrect) { chemSound('correct'); if (nk >= 3) chemSound('streak'); awardXP('chalQ_' + chalDiff + '_' + chalIdx, nk >= 3 ? 15 : 10, 'Chem Challenge'); updExt({ quizCorrect: ext.quizCorrect + 1 }); checkBadges(); } else { chemSound('wrong'); }
                    updMulti({ _chalScore: ns, _chalStreak: nk, _chalFeedback: isCorrect ? '\u2705 ' + chalQuestions[chalIdx].explain : '\u274C ' + chalQuestions[chalIdx].explain });
                    setTimeout(function() {
                      if (chalIdx + 1 < chalQuestions.length) { updMulti({ _chalIdx: chalIdx + 1, _chalFeedback: null }); }
                      else { updMulti({ _chalFeedback: '\uD83C\uDFC6 Complete! ' + ns + '/' + chalQuestions.length }); }
                    }, 2000);
                  }, className: 'px-3 py-2 text-xs font-bold rounded-lg border transition-all ' + (chalFeedback ? (i === chalQuestions[chalIdx].correct ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-600 border-slate-200') : 'bg-white text-slate-700 border-slate-200 hover:border-lime-300 hover:bg-lime-50') }, opt);
                })
              ),
              chalFeedback && h('p', { className: 'mt-2 text-[10px] font-bold ' + (chalFeedback.indexOf('\u2705') !== -1 ? 'text-emerald-600' : 'text-red-500') }, chalFeedback)
            ) : h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-center bg-lime-50 rounded-xl border border-lime-200 p-4' },
              h('p', { className: 'text-2xl mb-1' }, '\uD83C\uDFC6'),
              h('p', { className: 'text-sm font-bold text-lime-700' }, 'Challenge Complete! ' + chalScore + '/' + chalQuestions.length),
              h('button', { 'aria-label': 'Retry', onClick: function() { updMulti({ _chalIdx: 0, _chalScore: 0, _chalStreak: 0, _chalFeedback: null }); }, className: 'mt-2 px-4 py-1.5 text-xs font-bold text-white bg-lime-500 rounded-lg hover:bg-lime-600' }, '\u21BA Retry')
            )
          ),

          // ════════════════════════════════════════
          // ELEMENT BATTLE SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'battle' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, 'A rogue element is destabilizing the compound! Answer chemistry questions to restore stability!'),
            !battleActive && !battleResult && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-center bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 p-6' },
              h('p', { className: 'text-4xl mb-3' }, '\u2694\uFE0F'),
              h('p', { className: 'text-lg font-bold text-red-700 mb-1' }, 'Element Battle'),
              h('p', { className: 'text-xs text-slate-600 mb-4' }, 'Answer correctly to deal damage. Wrong answers destabilize your compound!'),
              h('button', { 'aria-label': 'Start Battle', onClick: function() { chemSound('click'); updMulti({ _battleActive: true, _battleRound: 0, _battleHP: 100, _battleEnemyHP: 100, _battleFeedback: null, _battleScore: 0, _battleResult: null }); }, className: 'px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-lg hover:from-red-600 hover:to-orange-600 shadow-lg' }, '\u2694\uFE0F Start Battle')
            ),
            battleActive && battleRound < BATTLE_QS.length && h('div', null,
              h('div', { className: 'grid grid-cols-2 gap-3 mb-3' },
                h('div', { className: 'bg-emerald-50 rounded-xl p-2 border border-emerald-200' },
                  h('p', { className: 'text-[11px] font-bold text-emerald-600 mb-1' }, '\u2697\uFE0F Your Compound'),
                  h('div', { className: 'w-full bg-slate-200 rounded-full h-3 overflow-hidden' },
                    h('div', { className: 'h-full rounded-full transition-all duration-500', style: { width: Math.max(0, battleHP) + '%', background: battleHP > 50 ? '#22c55e' : battleHP > 25 ? '#f59e0b' : '#ef4444' } })
                  ),
                  h('p', { className: 'text-[10px] font-bold text-emerald-700 mt-0.5' }, battleHP + ' HP')
                ),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-red-50 rounded-xl p-2 border border-red-200' },
                  h('p', { className: 'text-[11px] font-bold text-red-600 mb-1' }, '\uD83D\uDCA5 Rogue Element'),
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'w-full bg-slate-200 rounded-full h-3 overflow-hidden' },
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-red-500 h-full rounded-full transition-all duration-500', style: { width: Math.max(0, battleEnemyHP) + '%' } })
                  ),
                  h('p', { className: 'text-[10px] font-bold text-red-700 mt-0.5' }, battleEnemyHP + ' HP')
                )
              ),
              h('p', { className: 'text-[10px] font-bold text-slate-600 text-center mb-2' }, 'Round ' + (battleRound + 1) + '/' + BATTLE_QS.length),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-xl border p-4' },
                h('p', { className: 'text-sm font-bold text-slate-700 mb-3' }, BATTLE_QS[battleRound].q),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-2 gap-2' },
                  BATTLE_QS[battleRound].a.map(function(opt, i) {
                    return h('button', { 'aria-label': 'Select option', key: i, onClick: function() {
                      if (battleFeedback) return;
                      var bq = BATTLE_QS[battleRound];
                      var ok = i === bq.correct;
                      var nEHP = battleEnemyHP, nHP = battleHP, nScore = battleScore;
                      if (ok) { chemSound('correct'); nEHP = Math.max(0, battleEnemyHP - bq.dmg); nScore++; } else { chemSound('damage'); nHP = Math.max(0, battleHP - 15); }
                      var fb = ok ? '\u2705 Hit! -' + bq.dmg + ' HP!' : '\u274C -15 HP! Answer: ' + bq.a[bq.correct];
                      updMulti({ _battleEnemyHP: nEHP, _battleHP: nHP, _battleScore: nScore, _battleFeedback: fb });
                      setTimeout(function() {
                        if (nEHP <= 0) { chemSound('victory'); updExt({ battleWon: true }); checkBadges(); updMulti({ _battleActive: false, _battleResult: 'won', _battleFeedback: null }); awardXP('battleWin', 30, 'Element Battle'); }
                        else if (nHP <= 0) { chemSound('damage'); updMulti({ _battleActive: false, _battleResult: 'lost', _battleFeedback: null }); }
                        else { updMulti({ _battleRound: battleRound + 1, _battleFeedback: null }); }
                      }, 1500);
                    }, className: 'px-3 py-2 text-xs font-bold rounded-lg border transition-all ' + (battleFeedback ? (i === BATTLE_QS[battleRound].correct ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-600 border-slate-200') : 'bg-white text-slate-700 border-slate-200 hover:border-red-300 hover:bg-red-50') }, opt);
                  })
                ),
                battleFeedback && h('p', { className: 'mt-2 text-xs font-bold text-center ' + (battleFeedback.indexOf('\u2705') !== -1 ? 'text-emerald-600' : 'text-red-500') }, battleFeedback)
              )
            ),
            battleResult && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-center bg-gradient-to-r ' + (battleResult === 'won' ? 'from-emerald-50 to-teal-50 border-emerald-200' : 'from-red-50 to-orange-50 border-red-200') + ' rounded-xl border p-6' },
              h('p', { className: 'text-4xl mb-2' }, battleResult === 'won' ? '\uD83C\uDFC6' : '\uD83D\uDCA5'),
              h('p', { className: 'text-lg font-bold ' + (battleResult === 'won' ? 'text-emerald-700' : 'text-red-700') }, battleResult === 'won' ? 'Victory! Compound Stabilized!' : 'Defeated! The element escaped...'),
              h('p', { className: 'text-xs text-slate-600 mt-1 mb-3' }, 'Score: ' + battleScore + '/' + BATTLE_QS.length),
              h('button', { 'aria-label': 'Battle Again', onClick: function() { chemSound('click'); updMulti({ _battleActive: true, _battleRound: 0, _battleHP: 100, _battleEnemyHP: 100, _battleFeedback: null, _battleScore: 0, _battleResult: null }); }, className: 'px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-lg' }, '\u2694\uFE0F Battle Again')
            ),
            battleActive && battleRound >= BATTLE_QS.length && !battleResult && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-center bg-amber-50 rounded-xl border border-amber-200 p-6' },
              h('p', { className: 'text-lg font-bold text-amber-700' }, 'Battle Over! Score: ' + battleScore + '/' + BATTLE_QS.length),
              h('button', { 'aria-label': 'Try Again', onClick: function() { chemSound('click'); updMulti({ _battleActive: true, _battleRound: 0, _battleHP: 100, _battleEnemyHP: 100, _battleFeedback: null, _battleScore: 0, _battleResult: null }); }, className: 'mt-2 px-6 py-2 text-sm font-bold text-white bg-amber-700 rounded-lg' }, '\u2694\uFE0F Try Again')
            )
          ),

          // ════════════════════════════════════════
          // LEARN SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'learn' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, 'Explore chemistry concepts at your level. Content adapts to grade band: ' + band.toUpperCase()),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-2' },
              LEARN_TOPICS.map(function(topic, idx) {
                var isOpen = learnTopic === idx;
                var content = topic[band] || topic.g35;
                return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: idx, className: 'bg-white rounded-xl border ' + (isOpen ? 'border-lime-300 shadow-md' : 'border-slate-200') },
                  h('button', { 'aria-label': 'Select option', onClick: function() { upd('_learnTopic', isOpen ? -1 : idx); }, className: 'w-full flex items-center gap-2 p-3 text-left' },
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xl' }, topic.icon),
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-sm font-bold text-slate-700 flex-1' }, topic.title),
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs text-slate-600' }, isOpen ? '\u25B2' : '\u25BC')
                  ),
                  isOpen && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'px-3 pb-3' },
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-lime-50 rounded-lg p-3 border border-lime-100' },
                      h('p', { className: 'text-[10px] font-bold text-lime-600 uppercase tracking-wider mb-1' }, band.toUpperCase() + ' Level'),
                      h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, content)
                    ),
                    idx === 0 && h('button', { 'aria-label': 'Explore Reaction Types', onClick: function() { upd('subtool', 'reactions'); }, className: 'mt-2 px-3 py-1 text-[10px] font-bold text-lime-600 bg-lime-50 border border-lime-200 rounded-lg hover:bg-lime-100' }, '\u2192 Explore Reaction Types'),
                    idx === 2 && h('button', { 'aria-label': 'View Molecular Models', onClick: function() { upd('subtool', 'molecular'); }, className: 'mt-2 px-3 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100' }, '\u2192 View Molecular Models'),
                    idx === 3 && h('button', { 'aria-label': 'Try Stoichiometry Calculator', onClick: function() { upd('subtool', 'stoich'); }, className: 'mt-2 px-3 py-1 text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100' }, '\u2192 Try Stoichiometry Calculator'),
                    callTTS && h('button', { 'aria-label': 'Read Aloud', onClick: function() { callTTS(content); }, className: 'mt-2 ml-2 px-3 py-1 text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100' }, '\uD83D\uDD0A Read Aloud')
                  )
                );
              })
            )
          ),

          // ── Footer ──
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 mt-4 pt-3 border-t border-slate-200' },
            h('button', { 'aria-label': 'Titration Lab', onClick: function() { setStemLabTool('titrationLab'); announceToSR('Opening Titration Lab'); }, className: 'px-3 py-1.5 text-xs font-bold text-lime-600 bg-lime-50 border border-lime-200 rounded-full hover:bg-lime-100' }, '\u2697\uFE0F Titration Lab \u2192'),
            h('button', { 'aria-label': 'Snapshot', onClick: takeSnapshot, className: 'ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all' }, '\uD83D\uDCF8 Snapshot')
          )
        );
      })();
    }
  });
})();
