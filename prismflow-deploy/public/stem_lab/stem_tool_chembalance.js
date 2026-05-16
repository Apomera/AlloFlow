// ═══════════════════════════════════════════
// stem_tool_chembalance.js — Chemistry Lab v3.0
// 8 sub-tools: Equation Balancer, Reaction Types,
// Stoichiometry, Molecular Viewer, Lab Safety,
// Challenge, Element Battle, Learn
// ═══════════════════════════════════════════

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
    { id: 'learn', icon: '\uD83D\uDCD6', label: 'Learn', desc: 'Chemistry concepts by grade' },
    { id: 'elementdb', icon: '\uD83E\uDDEA', label: 'Element Encyclopedia', desc: '118 elements deep profiles' },
    { id: 'periodic', icon: '\uD83D\uDD22', label: 'Periodic Table', desc: 'Interactive periodic table atlas' },
    { id: 'famous_reactions', icon: '\uD83D\uDD25', label: 'Famous Reactions', desc: '40+ landmark chemical reactions' },
    { id: 'industrial', icon: '\uD83C\uDFED', label: 'Industrial Chemistry', desc: 'Haber, Contact, Solvay + more' },
    { id: 'apchem', icon: '\uD83C\uDF93', label: 'AP Chemistry', desc: 'AP curriculum reference' },
    { id: 'lab_techniques', icon: '\uD83D\uDD2C', label: 'Lab Techniques', desc: '30+ standard procedures' },
    { id: 'chemists', icon: '\uD83E\uDDD1\u200D\uD83D\uDD2C', label: 'Famous Chemists', desc: '25 legendary scientists' },
    { id: 'history', icon: '\uD83D\uDCDC', label: 'History of Chemistry', desc: 'Timeline of major discoveries' },
    { id: 'acids_bases', icon: '\uD83E\uDDEA', label: 'Acids & Bases', desc: 'pH, buffers, titration' },
    { id: 'redox', icon: '\u26A1', label: 'Redox Reactions', desc: 'Oxidation, reduction, batteries' },
    { id: 'organic', icon: '\u269B\uFE0F', label: 'Organic Chemistry', desc: 'Functional groups, mechanisms' },
    { id: 'biochem', icon: '\uD83E\uDDEC', label: 'Biochemistry', desc: 'Proteins, DNA, metabolism' },
    { id: 'thermo', icon: '\uD83C\uDF21\uFE0F', label: 'Thermodynamics', desc: 'Enthalpy, entropy, Gibbs free energy' },
    { id: 'kinetics', icon: '\u23F1\uFE0F', label: 'Kinetics', desc: 'Reaction rates + mechanisms' },
    { id: 'equilibrium', icon: '\u2696\uFE0F', label: 'Equilibrium', desc: 'Le Chatelier + Keq' },
    { id: 'gas_laws', icon: '\uD83C\uDF2C\uFE0F', label: 'Gas Laws', desc: 'Boyle, Charles, Ideal Gas Law' },
    { id: 'solutions', icon: '\uD83D\uDCA7', label: 'Solutions', desc: 'Concentration, solubility, colligative' },
    { id: 'nuclear', icon: '\u2622\uFE0F', label: 'Nuclear Chemistry', desc: 'Radioactivity, fission, fusion' },
    { id: 'environmental', icon: '\uD83C\uDF0D', label: 'Environmental Chem', desc: 'Climate, pollution, green chem' },
    { id: 'pharma', icon: '\uD83D\uDC8A', label: 'Pharma Chemistry', desc: 'Drug discovery, action, regulation' },
    { id: 'materials', icon: '\uD83E\uDDF1', label: 'Materials Science', desc: 'Polymers, ceramics, alloys' },
    { id: 'food_chem', icon: '\uD83C\uDF74', label: 'Food Chemistry', desc: 'Maillard, fermentation, additives' },
    { id: 'forensic', icon: '\uD83D\uDD0D', label: 'Forensic Chemistry', desc: 'DNA, drug testing, ballistics' },
    { id: 'careers', icon: '\uD83D\uDCBC', label: 'Chemistry Careers', desc: '20+ chemistry career paths' },
    { id: 'lab_kits', icon: '\uD83C\uDF92', label: 'Lesson Plans', desc: '15 classroom labs' },
    { id: 'mythbusters', icon: '\uD83D\uDCA5', label: 'Chem Mythbusters', desc: 'Common misconceptions' },
    { id: 'records', icon: '\uD83C\uDFC5', label: 'Chemistry Records', desc: 'Strongest acid, hottest fire, etc.' },
    { id: 'glossary', icon: '\uD83D\uDCD6', label: 'Glossary', desc: '200+ chemistry terms' },
    { id: 'datatables', icon: '\uD83D\uDCCB', label: 'Data Tables', desc: 'Reference tables for chem' },
    { id: 'finale', icon: '\uD83C\uDF86', label: '20K Finale', desc: 'You did it!' }
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
    Ca:'#6ee7b7',Fe:'#fb923c',Cu:'#f97316',Zn:'#94a3b8',K:'#a855f7',Si:'#94a3b8',
    I:'#6b21a8',Ag:'#cbd5e1',Au:'#fbbf24',Pb:'#94a3b8'
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

  // ═══════════════════════════════════════════════════════════
  // ELEMENT ENCYCLOPEDIA — 118 elements with deep profiles (v3.1)
  // ═══════════════════════════════════════════════════════════
  var ELEMENT_DB = [
    { z: 1, sym: 'H', name: 'Hydrogen', mass: 1.008, group: 1, period: 1, type: 'nonmetal', config: '1s¹', mp: -259.16, bp: -252.87, density: 0.00008988, discovered: 'Henry Cavendish (1766)', useCase: 'Fuel cells, ammonia synthesis, rocket fuel, hydrogenation', funFact: 'Most abundant element in universe (~75% by mass). Bigbang created it.', danger: 'Highly flammable; explosive when mixed with oxygen.' },
    { z: 2, sym: 'He', name: 'Helium', mass: 4.0026, group: 18, period: 1, type: 'noble', config: '1s²', mp: -272.20, bp: -268.93, density: 0.0001785, discovered: 'Pierre Janssen + Norman Lockyer (1868)', useCase: 'Balloons, MRI cooling, deep-sea breathing mix, leak detection', funFact: 'Only element first discovered on the Sun (during eclipse spectroscopy). Liquid helium is colder than space.', danger: 'Asphyxiant if inhaled in large quantity (no oxygen).' },
    { z: 3, sym: 'Li', name: 'Lithium', mass: 6.94, group: 1, period: 2, type: 'alkali', config: '[He]2s¹', mp: 180.5, bp: 1342, density: 0.534, discovered: 'Johan Arfwedson (1817)', useCase: 'Rechargeable batteries (Li-ion), psychiatric meds (bipolar), heat-resistant glass', funFact: 'Lightest metal. Floats on water but reacts with it. Sourced mostly from S. American salt flats.', danger: 'Reacts violently with water; flammable. Lithium toxicity narrow therapeutic window.' },
    { z: 4, sym: 'Be', name: 'Beryllium', mass: 9.0122, group: 2, period: 2, type: 'alkaline', config: '[He]2s²', mp: 1287, bp: 2469, density: 1.85, discovered: 'Louis Vauquelin (1798)', useCase: 'Aerospace alloys, X-ray windows (transparent to X-rays), springs', funFact: 'Strong + lightweight. Used in James Webb telescope mirrors. Emeralds are beryllium aluminum silicate.', danger: 'Berylliosis: chronic lung disease from inhalation. Highly toxic.' },
    { z: 5, sym: 'B', name: 'Boron', mass: 10.81, group: 13, period: 2, type: 'metalloid', config: '[He]2s²2p¹', mp: 2076, bp: 3927, density: 2.34, discovered: 'Joseph Louis Gay-Lussac + Louis Jacques Thénard (1808)', useCase: 'Pyrex glass, detergents (sodium tetraborate = borax), agriculture', funFact: 'Doping silicon with boron makes p-type semiconductors. Crucial for electronics.', danger: 'Borax + boric acid: moderate toxicity. Avoid ingestion.' },
    { z: 6, sym: 'C', name: 'Carbon', mass: 12.011, group: 14, period: 2, type: 'nonmetal', config: '[He]2s²2p²', mp: 3500, bp: 4827, density: 2.267, discovered: 'Ancient (prehistoric)', useCase: 'Steel, organic chemistry, electronics (graphite, diamond), fuel', funFact: 'Forms more compounds (10M+) than all other elements combined. Found as diamond, graphite, fullerenes, nanotubes, graphene.', danger: 'CO from incomplete combustion is silent killer. CO2 is greenhouse gas.' },
    { z: 7, sym: 'N', name: 'Nitrogen', mass: 14.007, group: 15, period: 2, type: 'nonmetal', config: '[He]2s²2p³', mp: -210, bp: -195.8, density: 0.001251, discovered: 'Daniel Rutherford (1772)', useCase: '78% of atmosphere. Ammonia fertilizer (Haber process), explosives, food preservation', funFact: 'Fritz Haber\'s ammonia synthesis feeds half the world\'s population.', danger: 'Asphyxiant at high concentration (replaces O2). Liquid N2 contact = severe burns.' },
    { z: 8, sym: 'O', name: 'Oxygen', mass: 15.999, group: 16, period: 2, type: 'nonmetal', config: '[He]2s²2p⁴', mp: -218.79, bp: -182.96, density: 0.001429, discovered: 'Carl Scheele (1772), independently Priestley (1774)', useCase: 'Respiration, combustion, steel making, medical breathing', funFact: 'Photosynthesis produces ~21% of atmosphere. Without it, no fire + no aerobic life.', danger: 'High concentrations = explosive fire hazard. O3 ozone toxic to lungs.' },
    { z: 9, sym: 'F', name: 'Fluorine', mass: 18.998, group: 17, period: 2, type: 'halogen', config: '[He]2s²2p⁵', mp: -219.62, bp: -188.12, density: 0.001696, discovered: 'Henri Moissan (1886)', useCase: 'Teflon (PTFE), refrigerants, toothpaste (fluoride), uranium enrichment', funFact: 'Most electronegative element. Most reactive nonmetal. Henri Moissan won Nobel for first isolating it (after killing several chemists trying).', danger: 'Extremely toxic + corrosive. HF acid penetrates skin + bone.' },
    { z: 10, sym: 'Ne', name: 'Neon', mass: 20.180, group: 18, period: 2, type: 'noble', config: '[He]2s²2p⁶', mp: -248.59, bp: -246.05, density: 0.0008999, discovered: 'William Ramsay + Morris Travers (1898)', useCase: 'Neon signs (orange-red glow), high-voltage indicators, vacuum tubes', funFact: 'Neon Las Vegas signs use ~100% neon for that red color. Other colors use Argon + Mercury.', danger: 'Asphyxiant if inhaled in concentrated quantity.' },
    { z: 11, sym: 'Na', name: 'Sodium', mass: 22.990, group: 1, period: 3, type: 'alkali', config: '[Ne]3s¹', mp: 97.79, bp: 882.94, density: 0.971, discovered: 'Humphry Davy (1807)', useCase: 'Sodium-vapor street lamps, NaCl salt, soap making, sodium-cooled nuclear reactors', funFact: 'Sodium-potassium pump in your cells uses 30%+ of your resting metabolism. Reacts violently with water.', danger: 'Reacts violently + sometimes explosively with water. Pure metal stored in oil.' },
    { z: 12, sym: 'Mg', name: 'Magnesium', mass: 24.305, group: 2, period: 3, type: 'alkaline', config: '[Ne]3s²', mp: 650, bp: 1090, density: 1.738, discovered: 'Joseph Black (1755)', useCase: 'Lightweight aerospace alloys, flares (white flame), chlorophyll core, antacid', funFact: 'Burns with brilliant white flame at 3100°C. Magnesium powder is hard to extinguish.', danger: 'Fire hazard. Cannot extinguish with water (reacts).' },
    { z: 13, sym: 'Al', name: 'Aluminum', mass: 26.982, group: 13, period: 3, type: 'post-transition', config: '[Ne]3s²3p¹', mp: 660.32, bp: 2519, density: 2.70, discovered: 'Hans Christian Ørsted (1825)', useCase: 'Aircraft, cans, foil, electrical lines, kitchenware, body armor', funFact: 'Once more valuable than gold. Top of Washington Monument (1884) is aluminum. Now most abundant metal in crust.', danger: 'Reactive with strong acids/bases. Suspected (controversial) Alzheimer\'s link via cookware.' },
    { z: 14, sym: 'Si', name: 'Silicon', mass: 28.085, group: 14, period: 3, type: 'metalloid', config: '[Ne]3s²3p²', mp: 1414, bp: 3265, density: 2.3296, discovered: 'Jöns Jacob Berzelius (1824)', useCase: 'Semiconductors (CPUs), solar cells, glass, ceramics, silicone polymers', funFact: '99% of computer chips made of silicon. Glass is mostly SiO2.', danger: 'Silicosis from inhaling silica dust. Glass shards.' },
    { z: 15, sym: 'P', name: 'Phosphorus', mass: 30.974, group: 15, period: 3, type: 'nonmetal', config: '[Ne]3s²3p³', mp: 44.15, bp: 280.5, density: 1.823, discovered: 'Hennig Brand (1669, distilling urine)', useCase: 'DNA backbone, ATP, fertilizers, matches, detergents', funFact: 'White phosphorus glows in dark due to slow oxidation. Brand thought he was making gold from urine.', danger: 'White phosphorus is highly toxic + flammable. Phosphine PH3 deadly.' },
    { z: 16, sym: 'S', name: 'Sulfur', mass: 32.06, group: 16, period: 3, type: 'nonmetal', config: '[Ne]3s²3p⁴', mp: 115.21, bp: 444.61, density: 2.067, discovered: 'Ancient (Biblical "brimstone")', useCase: 'Sulfuric acid (most-produced industrial chemical), gunpowder, vulcanizing rubber', funFact: 'Yellow color characteristic. Smells like rotten eggs (H2S). Hot springs have sulfur.', danger: 'H2S deadly at low concentration. SO2 air pollutant.' },
    { z: 17, sym: 'Cl', name: 'Chlorine', mass: 35.45, group: 17, period: 3, type: 'halogen', config: '[Ne]3s²3p⁵', mp: -101.5, bp: -34.04, density: 0.003214, discovered: 'Carl Wilhelm Scheele (1774)', useCase: 'Bleach, PVC plastic, disinfectant, pool chlorination, drinking water', funFact: 'WWI chemical weapon. Saves more lives daily through water disinfection than it ever killed.', danger: 'Highly toxic gas. Chlorine bleach + ammonia = chloramine poisoning.' },
    { z: 18, sym: 'Ar', name: 'Argon', mass: 39.95, group: 18, period: 3, type: 'noble', config: '[Ne]3s²3p⁶', mp: -189.34, bp: -185.85, density: 0.0017837, discovered: 'Lord Rayleigh + William Ramsay (1894)', useCase: 'Welding shields, incandescent bulbs, double-pane windows, lasers', funFact: '3rd most abundant gas in atmosphere (1%). Inert filling preserves artifacts.', danger: 'Asphyxiant.' },
    { z: 19, sym: 'K', name: 'Potassium', mass: 39.098, group: 1, period: 4, type: 'alkali', config: '[Ar]4s¹', mp: 63.5, bp: 759, density: 0.862, discovered: 'Humphry Davy (1807)', useCase: 'Fertilizers, biological nerve signaling, soap, salt substitute', funFact: 'Reacts more violently with water than sodium. Banana has small amounts of K-40 (radioactive).', danger: 'Reacts violently with water. K+ imbalance in body causes heart arrhythmia.' },
    { z: 20, sym: 'Ca', name: 'Calcium', mass: 40.078, group: 2, period: 4, type: 'alkaline', config: '[Ar]4s²', mp: 842, bp: 1484, density: 1.55, discovered: 'Humphry Davy (1808)', useCase: 'Bones + teeth, cement, lime, antacids, plaster', funFact: '5th most abundant element in crust. Builds shells + skeletons. Calcium ions trigger muscle contraction.', danger: 'Reacts with water. Kidney stones from excess.' },
    { z: 21, sym: 'Sc', name: 'Scandium', mass: 44.956, group: 3, period: 4, type: 'transition', config: '[Ar]3d¹4s²', mp: 1541, bp: 2836, density: 2.989, discovered: 'Lars Fredrik Nilson (1879)', useCase: 'High-performance aluminum-scandium alloys (aerospace), high-intensity lights', funFact: 'Predicted by Mendeleev before discovery. One of rarest earth elements in commercial use.', danger: 'Mild toxicity.' },
    { z: 22, sym: 'Ti', name: 'Titanium', mass: 47.867, group: 4, period: 4, type: 'transition', config: '[Ar]3d²4s²', mp: 1668, bp: 3287, density: 4.506, discovered: 'William Gregor (1791)', useCase: 'Aerospace, medical implants, jewelry, paint pigment (TiO2)', funFact: 'Strong as steel but 45% lighter. Used in artificial joints + dental implants because biocompatible. White paint = mostly TiO2.', danger: 'Fine powder is fire hazard. Otherwise biocompatible.' },
    { z: 23, sym: 'V', name: 'Vanadium', mass: 50.942, group: 5, period: 4, type: 'transition', config: '[Ar]3d³4s²', mp: 1910, bp: 3407, density: 6.11, discovered: 'Andrés Manuel del Río (1801)', useCase: 'Steel alloying for tools, springs, gears, jet engines', funFact: 'Found in mushroom + crude oil. Colorful compounds (different oxidation states).', danger: 'V2O5 dust irritant.' },
    { z: 24, sym: 'Cr', name: 'Chromium', mass: 51.996, group: 6, period: 4, type: 'transition', config: '[Ar]3d⁵ 4s¹', mp: 1907, bp: 2671, density: 7.15, discovered: 'Louis Nicolas Vauquelin (1797)', useCase: 'Stainless steel, chrome plating, leather tanning, pigments', funFact: 'Name from Greek "chroma" (color) — forms vividly colored compounds. Emeralds get green from Cr3+.', danger: 'Cr(VI) compounds carcinogenic (Erin Brockovich!).' },
    { z: 25, sym: 'Mn', name: 'Manganese', mass: 54.938, group: 7, period: 4, type: 'transition', config: '[Ar]3d⁵ 4s²', mp: 1246, bp: 2061, density: 7.21, discovered: 'Johan Gottlieb Gahn (1774)', useCase: 'Steel alloying, batteries (alkaline + Li-ion), pigments', funFact: '85% of mined Mn goes into steel. Essential trace element (cofactor in many enzymes).', danger: 'Long-term exposure causes neurological symptoms (manganism).' },
    { z: 26, sym: 'Fe', name: 'Iron', mass: 55.845, group: 8, period: 4, type: 'transition', config: '[Ar]3d⁶ 4s²', mp: 1538, bp: 2861, density: 7.874, discovered: 'Ancient (5th millennium BCE)', useCase: 'Steel (90% of all metal production), hemoglobin, magnetism', funFact: 'Forms Earth\'s core. Iron Age started ~1200 BCE. Hemoglobin carries oxygen because of iron.', danger: 'Excess Fe = hemochromatosis. Iron supplements toxic in large doses.' },
    { z: 27, sym: 'Co', name: 'Cobalt', mass: 58.933, group: 9, period: 4, type: 'transition', config: '[Ar]3d⁷ 4s²', mp: 1495, bp: 2927, density: 8.90, discovered: 'Georg Brandt (1735)', useCase: 'Vitamin B12, magnetic alloys, blue pigments, lithium batteries, jet engines', funFact: 'Cobalt blue pigment used in Chinese porcelain + Egyptian beads. Most modern Co mining is in DRC.', danger: 'Co dust + nanoparticles harmful. DRC mining ethical concerns.' },
    { z: 28, sym: 'Ni', name: 'Nickel', mass: 58.693, group: 10, period: 4, type: 'transition', config: '[Ar]3d⁸ 4s²', mp: 1455, bp: 2913, density: 8.908, discovered: 'Axel Fredrik Cronstedt (1751)', useCase: 'Stainless steel, coins (US 5-cent piece), batteries, catalysts', funFact: 'US nickel coin is actually 75% copper, 25% nickel. Earth\'s core is iron-nickel alloy.', danger: 'Common allergen (causes contact dermatitis). Carcinogenic in some forms.' },
    { z: 29, sym: 'Cu', name: 'Copper', mass: 63.546, group: 11, period: 4, type: 'transition', config: '[Ar]3d¹⁰ 4s¹', mp: 1084.62, bp: 2562, density: 8.96, discovered: 'Ancient (8000 BCE)', useCase: 'Electrical wiring, plumbing, coins, brass, bronze', funFact: 'Copper Age preceded Bronze Age. Statue of Liberty\'s green color = copper oxide patina. Antimicrobial.', danger: 'Excess = Wilson\'s disease (Cu accumulation).' },
    { z: 30, sym: 'Zn', name: 'Zinc', mass: 65.38, group: 12, period: 4, type: 'transition', config: '[Ar]3d¹⁰ 4s²', mp: 419.53, bp: 907, density: 7.14, discovered: 'Andreas Marggraf (1746)', useCase: 'Galvanizing steel (rust prevention), brass, batteries, sunscreen (ZnO)', funFact: 'Essential trace element for ~300 enzymes. ZnO is opaque to UV — best sunscreen ingredient. Cold lozenges sometimes use Zn.', danger: 'Excess inhibits Cu absorption. Pennies post-1982 are 97.5% Zn — eaten by dogs can cause Zn poisoning.' }
  ];

  // ═══════════════════════════════════════════════════════════
  // ELEMENT_DB_2 — Elements 31-60
  // ═══════════════════════════════════════════════════════════
  var ELEMENT_DB_2 = [
    { z: 31, sym: 'Ga', name: 'Gallium', mass: 69.723, useCase: 'Semiconductors (GaAs, GaN — LED), thermometers, MRI contrast', funFact: 'Melts in your hand (~30°C). Used in high-frequency electronics + LED lighting.', danger: 'Generally safe to handle.' },
    { z: 32, sym: 'Ge', name: 'Germanium', mass: 72.630, useCase: 'Early transistors, fiber optics, infrared optics, solar cells', funFact: 'First Nobel-winning semiconductor (transistor 1956). Now mostly replaced by Si.', danger: 'Some compounds toxic.' },
    { z: 33, sym: 'As', name: 'Arsenic', mass: 74.922, useCase: 'Semiconductors (GaAs), wood preservatives, pesticides (banned), historical poison', funFact: 'Marie Curie + Madame Bovary fame. Detection led to forensic toxicology (Marsh Test 1836).', danger: 'Acutely + chronically toxic. Groundwater contamination in Bangladesh + W. India.' },
    { z: 34, sym: 'Se', name: 'Selenium', mass: 78.96, useCase: 'Solar cells, photocopiers, dietary supplements, anti-dandruff shampoo', funFact: 'Discovered in residues from sulfuric acid plant. Essential trace element. Brazil nuts highest natural source.', danger: 'Acutely toxic; selenosis from overconsumption (>400 μg/day).' },
    { z: 35, sym: 'Br', name: 'Bromine', mass: 79.904, useCase: 'Flame retardants (controversial), photographic film (silver bromide), water treatment', funFact: 'Only liquid nonmetal at room temp. Dead Sea + brine wells are major sources.', danger: 'Highly corrosive. Br vapor toxic.' },
    { z: 36, sym: 'Kr', name: 'Krypton', mass: 83.798, useCase: 'High-intensity lights, flash photography, laser, neon-tube-style signs (purple)', funFact: 'Once defined the meter (length of 1 wavelength of orange-red Kr-86 light, 1960-1983).', danger: 'Asphyxiant.' },
    { z: 37, sym: 'Rb', name: 'Rubidium', mass: 85.468, useCase: 'Atomic clocks, photoelectric cells, vacuum tubes, special glass', funFact: 'Highly reactive. Atomic clocks based on Rb-87 transitions.', danger: 'Reacts violently with water.' },
    { z: 38, sym: 'Sr', name: 'Strontium', mass: 87.62, useCase: 'Fireworks (red flame), magnets, CRT television tubes', funFact: 'Strontium red is signature color of fireworks. Sr-90 was Cold War nuclear fallout marker.', danger: 'Sr-90 isotope radioactive + bioaccumulates in bones.' },
    { z: 39, sym: 'Y', name: 'Yttrium', mass: 88.906, useCase: 'YAG lasers, superconductors (YBCO), LED phosphors, cancer treatment', funFact: 'Named after Ytterby, Sweden — site of 4 different element discoveries.', danger: 'Mild toxicity.' },
    { z: 40, sym: 'Zr', name: 'Zirconium', mass: 91.224, useCase: 'Nuclear fuel cladding, ceramics, antiperspirants, surgical instruments', funFact: 'Transparent to neutrons — perfect for nuclear reactor parts. Cubic zirconia is fake diamond.', danger: 'Generally safe.' },
    { z: 41, sym: 'Nb', name: 'Niobium', mass: 92.906, useCase: 'Superconducting magnets (MRI, particle accelerators), jet engines', funFact: 'Brazil produces ~90% of world\'s Nb. Critical for superconducting magnets.', danger: 'Mild toxicity.' },
    { z: 42, sym: 'Mo', name: 'Molybdenum', mass: 95.95, useCase: 'High-strength steel alloys, lubricants (MoS2), enzyme cofactor', funFact: 'Essential to nitrogen-fixing bacteria. Without molybdenum, no atmospheric N could become biological N.', danger: 'Trace element; excess inhibits Cu.' },
    { z: 43, sym: 'Tc', name: 'Technetium', mass: 98, useCase: 'Medical imaging (Tc-99m most-used radioisotope in nuclear medicine)', funFact: 'First artificially produced element (1937). Tc-99m used in 30M+ medical scans/year.', danger: 'Radioactive. Short half-life makes it useful for medical imaging.' },
    { z: 44, sym: 'Ru', name: 'Ruthenium', mass: 101.07, useCase: 'Catalysts, electronics, solar cells, hard alloys with Pt + Pd', funFact: 'Named after Russia (Ruthenia). One of platinum-group metals.', danger: 'RuO4 toxic.' },
    { z: 45, sym: 'Rh', name: 'Rhodium', mass: 102.91, useCase: 'Catalytic converters (auto emissions), jewelry plating, electronics', funFact: 'Most expensive precious metal periodically. World production only ~30 tons/year.', danger: 'Generally safe.' },
    { z: 46, sym: 'Pd', name: 'Palladium', mass: 106.42, useCase: 'Catalytic converters, dental alloys, hydrogen storage, electronics', funFact: 'Can absorb 900× its volume in hydrogen gas. Used in hydrogen purification.', danger: 'Pd salts allergenic.' },
    { z: 47, sym: 'Ag', name: 'Silver', mass: 107.87, useCase: 'Currency, jewelry, photography, electrical conductors, antimicrobial', funFact: 'Best electrical + thermal conductor. Antimicrobial properties known for millennia (Greek wine cups).', danger: 'Silver compounds can cause argyria (blue-gray skin).' },
    { z: 48, sym: 'Cd', name: 'Cadmium', mass: 112.41, useCase: 'Ni-Cd batteries (phasing out), pigments, photovoltaics (CdTe)', funFact: '"Itai-itai" disease from Cd contamination in Japan 1912. Highly toxic.', danger: 'Carcinogen. Bioaccumulates. Major environmental concern.' },
    { z: 49, sym: 'In', name: 'Indium', mass: 114.82, useCase: 'Touchscreens (ITO), LEDs, thin-film solar, semiconductors', funFact: 'ITO (indium tin oxide) coats nearly every touchscreen on Earth.', danger: 'Mild toxicity.' },
    { z: 50, sym: 'Sn', name: 'Tin', mass: 118.71, useCase: 'Bronze, solder, tin plating, tin cans (now mostly aluminum)', funFact: 'Tin disease: gray tin powder at <13°C. Hundreds of Napoleon\'s soldiers froze when buttons disintegrated 1812.', danger: 'Generally safe.' },
    { z: 51, sym: 'Sb', name: 'Antimony', mass: 121.76, useCase: 'Flame retardants, lead-acid batteries, semiconductors', funFact: 'Historically used as cosmetic (kohl) + medicine. "Antimon" — anti-monk (one possible etymology).', danger: 'Toxic. Stibine SbH3 highly toxic.' },
    { z: 52, sym: 'Te', name: 'Tellurium', mass: 127.60, useCase: 'Solar cells (CdTe), thermoelectric devices, vulcanizing rubber', funFact: 'Named after Earth (Latin tellus). Causes "tellurium breath" — garlicky smell.', danger: 'Toxic. Garlic body odor at trace doses.' },
    { z: 53, sym: 'I', name: 'Iodine', mass: 126.90, useCase: 'Iodized salt (prevents goiter), antiseptic, photography, X-ray contrast', funFact: 'Essential trace element. Thyroid uses iodine to make hormones.', danger: 'Toxic at high doses. I-131 radiation hazard (used in thyroid therapy).' },
    { z: 54, sym: 'Xe', name: 'Xenon', mass: 131.29, useCase: 'High-intensity lamps, flashbulbs, anesthetic, ion thrusters (NASA)', funFact: 'First noble gas compound made 1962 — XePtF6. Xe in DART spacecraft propelled asteroid deflection (2022).', danger: 'Asphyxiant.' },
    { z: 55, sym: 'Cs', name: 'Cesium', mass: 132.91, useCase: 'Atomic clocks (defines the second), drilling fluids, photoelectric cells', funFact: '1 second = 9,192,631,770 Cs-133 transitions. Most accurate measurement.', danger: 'Reacts explosively with water. Cs-137 dangerous radiation source.' },
    { z: 56, sym: 'Ba', name: 'Barium', mass: 137.33, useCase: 'X-ray contrast (Ba sulfate), fireworks (green), drilling mud', funFact: 'Ba sulfate is opaque to X-rays + insoluble, so used for GI tract imaging.', danger: 'Soluble Ba compounds highly toxic.' },
    { z: 57, sym: 'La', name: 'Lanthanum', mass: 138.91, useCase: 'NiMH batteries, camera lenses, catalysts, hybrid car batteries', funFact: 'Starts the lanthanide series. Named after Greek "lanthanein" = to lie hidden.', danger: 'Mild toxicity.' },
    { z: 58, sym: 'Ce', name: 'Cerium', mass: 140.12, useCase: 'Lighter flints (mischmetal), glass polishing, catalysts, self-cleaning oven coatings', funFact: 'Most abundant lanthanide. Drillers + welders use Ce for self-glassing welds.', danger: 'Mild toxicity.' },
    { z: 59, sym: 'Pr', name: 'Praseodymium', mass: 140.91, useCase: 'Magnetic alloys, aircraft engine alloys, yellow glass + ceramics', funFact: 'Named for "green twin" — green color in compounds. Used in welder + glassblower goggles.', danger: 'Mild toxicity.' },
    { z: 60, sym: 'Nd', name: 'Neodymium', mass: 144.24, useCase: 'Powerful permanent magnets (NdFeB), wind turbines, electric motors, laser', funFact: 'NdFeB magnets are world\'s strongest commercial magnets. Critical for electric vehicles.', danger: 'NdFeB magnets pose pinch + ingestion danger.' }
  ];

  // ═══════════════════════════════════════════════════════════
  // ELEMENT_DB_3 — Elements 61-90
  // ═══════════════════════════════════════════════════════════
  var ELEMENT_DB_3 = [
    { z: 61, sym: 'Pm', name: 'Promethium', mass: 145, useCase: 'Luminous paint, atomic batteries for satellites, X-ray source', funFact: 'Only radioactive lanthanide. Named after Prometheus who stole fire from gods.', danger: 'Radioactive.' },
    { z: 62, sym: 'Sm', name: 'Samarium', mass: 150.36, useCase: 'Strong permanent magnets (SmCo), cancer treatment (Sm-153)', funFact: 'First element named after a person — Vasili Samarsky-Bykhovets (1879).', danger: 'Mild toxicity.' },
    { z: 63, sym: 'Eu', name: 'Europium', mass: 151.96, useCase: 'Red phosphor in CRT/LED screens, anti-counterfeit ink in Euros', funFact: 'Euro banknotes use Eu phosphor for anti-counterfeit fluorescence.', danger: 'Mild toxicity.' },
    { z: 64, sym: 'Gd', name: 'Gadolinium', mass: 157.25, useCase: 'MRI contrast agents, neutron capture for nuclear, microwave applications', funFact: 'Strongly paramagnetic, ideal for MRI contrast.', danger: 'Free Gd ions toxic; chelates used for safety.' },
    { z: 65, sym: 'Tb', name: 'Terbium', mass: 158.93, useCase: 'Green phosphor in fluorescent lamps, magneto-optic recording, solid-state devices', funFact: 'Named after Ytterby, Sweden (along with Y, Er, Yb — 4 elements!).', danger: 'Mild toxicity.' },
    { z: 66, sym: 'Dy', name: 'Dysprosium', mass: 162.50, useCase: 'High-performance magnets for hybrid cars + wind turbines', funFact: 'Critical for electric motor magnets. China controls ~90% of supply.', danger: 'Mild toxicity.' },
    { z: 67, sym: 'Ho', name: 'Holmium', mass: 164.93, useCase: 'Lasers for kidney stone removal, nuclear reactor control rods', funFact: 'Strongest magnetic moment of any naturally occurring element.', danger: 'Mild toxicity.' },
    { z: 68, sym: 'Er', name: 'Erbium', mass: 167.26, useCase: 'Optical fiber amplifiers (most internet runs through Er-doped fiber), lasers', funFact: 'Internet traffic boosted by Er amplifiers every ~80 km of fiber.', danger: 'Mild toxicity.' },
    { z: 69, sym: 'Tm', name: 'Thulium', mass: 168.93, useCase: 'X-ray sources, lasers, blue color in fluorescent lighting', funFact: 'Rarest stable lanthanide.', danger: 'Mild toxicity.' },
    { z: 70, sym: 'Yb', name: 'Ytterbium', mass: 173.04, useCase: 'Stainless steel alloys, lasers, atomic clocks', funFact: 'Yb atomic clocks are most accurate ever built (gain/lose 1 second per 14 billion years).', danger: 'Mild toxicity.' },
    { z: 71, sym: 'Lu', name: 'Lutetium', mass: 174.97, useCase: 'Catalysts, PET scanners, oil refining', funFact: 'Densest lanthanide. Most expensive rare earth.', danger: 'Mild toxicity.' },
    { z: 72, sym: 'Hf', name: 'Hafnium', mass: 178.49, useCase: 'Nuclear reactor control rods, super-alloys, microchip gate insulators', funFact: 'Critical for modern microchips. Last stable element discovered (1923).', danger: 'Mild toxicity.' },
    { z: 73, sym: 'Ta', name: 'Tantalum', mass: 180.95, useCase: 'Capacitors in electronics, surgical implants, high-temp aircraft parts', funFact: 'In every smartphone capacitor. "Conflict mineral" — DRC mining ethical issues.', danger: 'Biocompatible. Mining ethical concerns.' },
    { z: 74, sym: 'W', name: 'Tungsten', mass: 183.84, useCase: 'Light bulb filaments, drill bits, X-ray targets, military penetrators', funFact: 'Highest melting point of any metal (3422°C). Densest natural element by mass.', danger: 'Mild toxicity.' },
    { z: 75, sym: 'Re', name: 'Rhenium', mass: 186.21, useCase: 'Jet engine alloys, high-temp catalysts', funFact: 'Last stable element discovered (1925). Rarest stable element in Earth\'s crust.', danger: 'Mild toxicity.' },
    { z: 76, sym: 'Os', name: 'Osmium', mass: 190.23, useCase: 'Fountain pen nibs, electrical contacts, very hard alloys', funFact: 'Densest natural element (22.59 g/cm³). Toxic OsO4 tetraoxide.', danger: 'OsO4 highly toxic.' },
    { z: 77, sym: 'Ir', name: 'Iridium', mass: 192.22, useCase: 'Spark plugs, fountain pens, telescope mirror coatings', funFact: 'Marks K-Pg dinosaur extinction layer (asteroid origin). Most corrosion-resistant metal.', danger: 'Generally safe.' },
    { z: 78, sym: 'Pt', name: 'Platinum', mass: 195.08, useCase: 'Catalytic converters, jewelry, chemotherapy (cisplatin), lab equipment', funFact: 'Pre-Columbian South Americans worked Pt before Europeans even knew of it.', danger: 'Pt salts allergenic.' },
    { z: 79, sym: 'Au', name: 'Gold', mass: 196.97, useCase: 'Currency, jewelry, electronics (corrosion-free contacts), medicine', funFact: 'Doesn\'t tarnish ever. Most ductile metal — 1g pulled into 2.4 km wire.', danger: 'Generally safe.' },
    { z: 80, sym: 'Hg', name: 'Mercury', mass: 200.59, useCase: 'Thermometers (legacy), CFL bulbs, dental amalgam, gold mining', funFact: 'Only metal liquid at room temp. Hat-makers got "mad hatter\'s disease" from Hg poisoning.', danger: 'Highly toxic. Hg vapor + organic Hg compounds especially dangerous.' },
    { z: 81, sym: 'Tl', name: 'Thallium', mass: 204.38, useCase: 'High-temp superconductors, photoelectric cells, cardiac imaging', funFact: 'Historical poison ("poisoner\'s poison" — tasteless, odorless, slow).', danger: 'Extremely toxic. No effective antidote.' },
    { z: 82, sym: 'Pb', name: 'Lead', mass: 207.2, useCase: 'Lead-acid batteries, radiation shielding, soldering (banned in food)', funFact: 'Roman Empire built water pipes from Pb — possible contributor to historical decline.', danger: 'Lead poisoning damages nervous system + brain. Especially harmful to children.' },
    { z: 83, sym: 'Bi', name: 'Bismuth', mass: 208.98, useCase: 'Cosmetics, Pepto-Bismol, low-melting alloys, fishing tackle (replacing Pb)', funFact: 'Beautiful rainbow oxide colors when crystallized. Lowest natural radioactivity that\'s effectively zero.', danger: 'Less toxic than Pb but not totally safe.' },
    { z: 84, sym: 'Po', name: 'Polonium', mass: 209, useCase: 'Anti-static brushes, polonium-beryllium neutron sources, nuclear weapons triggers', funFact: 'Discovered by Marie + Pierre Curie 1898. Allegedly killed Alexander Litvinenko (2006).', danger: 'Extremely radioactive + toxic.' },
    { z: 85, sym: 'At', name: 'Astatine', mass: 210, useCase: 'Cancer treatment research (At-211)', funFact: 'Rarest natural element. Total Earth supply <1 gram.', danger: 'Highly radioactive.' },
    { z: 86, sym: 'Rn', name: 'Radon', mass: 222, useCase: 'Cancer treatment (legacy), basement contamination concern', funFact: 'Leading cause of lung cancer in non-smokers. Builds up in homes from soil U-238 decay.', danger: 'Highly radioactive + carcinogenic.' },
    { z: 87, sym: 'Fr', name: 'Francium', mass: 223, useCase: 'Research only', funFact: 'Most reactive alkali metal. Less than 30g exists on Earth at any moment.', danger: 'Highly radioactive.' },
    { z: 88, sym: 'Ra', name: 'Radium', mass: 226, useCase: 'Legacy: luminous watch dials, cancer treatment (largely replaced)', funFact: 'Discovered by Marie Curie 1898. Radium girls — factory workers who died from radiation exposure painting clock faces.', danger: 'Highly radioactive + bioaccumulates in bones.' },
    { z: 89, sym: 'Ac', name: 'Actinium', mass: 227, useCase: 'Neutron sources, cancer treatment research', funFact: 'Glows pale blue due to radiation. First actinide.', danger: 'Highly radioactive.' },
    { z: 90, sym: 'Th', name: 'Thorium', mass: 232.04, useCase: 'Welding electrodes, gas mantle (historical), proposed nuclear fuel', funFact: 'Possible safer alternative to U for nuclear power — proposed Thorium reactors.', danger: 'Radioactive, less hazardous than U.' }
  ];

  // ═══════════════════════════════════════════════════════════
  // ELEMENT_DB_4 — Elements 91-118
  // ═══════════════════════════════════════════════════════════
  var ELEMENT_DB_4 = [
    { z: 91, sym: 'Pa', name: 'Protactinium', mass: 231.04, useCase: 'Research only', funFact: 'Rare natural element. Used to estimate ocean sediment ages.', danger: 'Highly radioactive + toxic.' },
    { z: 92, sym: 'U', name: 'Uranium', mass: 238.03, useCase: 'Nuclear power, nuclear weapons, depleted U armor', funFact: 'Marie Curie discovered radioactivity in U salts. Enrico Fermi achieved first nuclear chain reaction 1942.', danger: 'Radioactive + chemically toxic.' },
    { z: 93, sym: 'Np', name: 'Neptunium', mass: 237, useCase: 'Research only', funFact: 'First transuranium element synthesized (1940). Named after planet Neptune.', danger: 'Highly radioactive.' },
    { z: 94, sym: 'Pu', name: 'Plutonium', mass: 244, useCase: 'Nuclear weapons (Fat Man bomb), Mars rover power source (Pu-238)', funFact: 'Pu-238 powered Curiosity rover for years. Pu-239 fuels nuclear weapons.', danger: 'Highly radioactive + toxic.' },
    { z: 95, sym: 'Am', name: 'Americium', mass: 243, useCase: 'Smoke detectors (Am-241), research', funFact: 'Smoke detectors contain ~1 microgram of Am-241.', danger: 'Radioactive.' },
    { z: 96, sym: 'Cm', name: 'Curium', mass: 247, useCase: 'Pacemaker batteries (historical), space craft power', funFact: 'Named after Marie + Pierre Curie.', danger: 'Highly radioactive.' },
    { z: 97, sym: 'Bk', name: 'Berkelium', mass: 247, useCase: 'Research only', funFact: 'Named after UC Berkeley where discovered (1949).', danger: 'Highly radioactive.' },
    { z: 98, sym: 'Cf', name: 'Californium', mass: 251, useCase: 'Neutron sources for cancer treatment + reactor startup', funFact: 'Named after California. Cf-252 used in industrial neutron scanners.', danger: 'Highly radioactive.' },
    { z: 99, sym: 'Es', name: 'Einsteinium', mass: 252, useCase: 'Research only', funFact: 'Discovered in thermonuclear test fallout (1952). Named after Einstein.', danger: 'Highly radioactive.' },
    { z: 100, sym: 'Fm', name: 'Fermium', mass: 257, useCase: 'Research only', funFact: 'Last element produced in macroscopic quantities. Named after Enrico Fermi.', danger: 'Highly radioactive.' },
    { z: 101, sym: 'Md', name: 'Mendelevium', mass: 258, useCase: 'Research only', funFact: 'Named after Dmitri Mendeleev, periodic table creator.', danger: 'Highly radioactive.' },
    { z: 102, sym: 'No', name: 'Nobelium', mass: 259, useCase: 'Research only', funFact: 'Named after Alfred Nobel.', danger: 'Highly radioactive.' },
    { z: 103, sym: 'Lr', name: 'Lawrencium', mass: 262, useCase: 'Research only', funFact: 'Named after Ernest Lawrence (cyclotron inventor).', danger: 'Highly radioactive.' },
    { z: 104, sym: 'Rf', name: 'Rutherfordium', mass: 267, useCase: 'Research only', funFact: 'Named after Ernest Rutherford (atomic structure).', danger: 'Highly radioactive.' },
    { z: 105, sym: 'Db', name: 'Dubnium', mass: 268, useCase: 'Research only', funFact: 'Named after Dubna, Russia (research city).', danger: 'Highly radioactive.' },
    { z: 106, sym: 'Sg', name: 'Seaborgium', mass: 269, useCase: 'Research only', funFact: 'Named after Glenn Seaborg (first element named after living person).', danger: 'Highly radioactive.' },
    { z: 107, sym: 'Bh', name: 'Bohrium', mass: 270, useCase: 'Research only', funFact: 'Named after Niels Bohr (atomic theory).', danger: 'Highly radioactive.' },
    { z: 108, sym: 'Hs', name: 'Hassium', mass: 269, useCase: 'Research only', funFact: 'Named after Hessen, Germany.', danger: 'Highly radioactive.' },
    { z: 109, sym: 'Mt', name: 'Meitnerium', mass: 278, useCase: 'Research only', funFact: 'Named after Lise Meitner (nuclear fission discovery).', danger: 'Highly radioactive.' },
    { z: 110, sym: 'Ds', name: 'Darmstadtium', mass: 281, useCase: 'Research only', funFact: 'Named after Darmstadt, Germany (research lab).', danger: 'Highly radioactive.' },
    { z: 111, sym: 'Rg', name: 'Roentgenium', mass: 281, useCase: 'Research only', funFact: 'Named after Wilhelm Röntgen (X-ray discoverer).', danger: 'Highly radioactive.' },
    { z: 112, sym: 'Cn', name: 'Copernicium', mass: 285, useCase: 'Research only', funFact: 'Named after Copernicus.', danger: 'Highly radioactive.' },
    { z: 113, sym: 'Nh', name: 'Nihonium', mass: 286, useCase: 'Research only', funFact: 'Named after Japan (Nihon). First element named in East Asia.', danger: 'Highly radioactive.' },
    { z: 114, sym: 'Fl', name: 'Flerovium', mass: 289, useCase: 'Research only', funFact: 'Named after Georgy Flerov.', danger: 'Highly radioactive.' },
    { z: 115, sym: 'Mc', name: 'Moscovium', mass: 290, useCase: 'Research only', funFact: 'Named after Moscow Oblast, Russia.', danger: 'Highly radioactive.' },
    { z: 116, sym: 'Lv', name: 'Livermorium', mass: 293, useCase: 'Research only', funFact: 'Named after Lawrence Livermore National Lab.', danger: 'Highly radioactive.' },
    { z: 117, sym: 'Ts', name: 'Tennessine', mass: 294, useCase: 'Research only', funFact: 'Named after Tennessee (Oak Ridge National Lab).', danger: 'Highly radioactive.' },
    { z: 118, sym: 'Og', name: 'Oganesson', mass: 294, useCase: 'Research only', funFact: 'Named after Yuri Oganessian (living scientist). Currently heaviest known element.', danger: 'Highly radioactive.' }
  ];

  // ═══════════════════════════════════════════════════════════
  // PERIODIC TABLE ATLAS — period + group reference
  // ═══════════════════════════════════════════════════════════
  var PERIODIC_INFO = {
    intro: 'The periodic table is the most important chart in chemistry. Organized by atomic number, it reveals patterns in elemental behavior. Periods are rows, groups are columns.',
    groups: [
      { num: '1', name: 'Alkali Metals', members: 'Li, Na, K, Rb, Cs, Fr', traits: 'Soft, low melting, highly reactive, 1 valence electron. React with water explosively.', notable: 'Lithium for batteries; sodium in salt; potassium in body chemistry.' },
      { num: '2', name: 'Alkaline Earth Metals', members: 'Be, Mg, Ca, Sr, Ba, Ra', traits: 'Harder than Group 1, 2 valence electrons, less reactive but still active.', notable: 'Calcium in bones; magnesium in chlorophyll; radium discovered by Curie.' },
      { num: '3-12', name: 'Transition Metals', members: 'Sc through Zn + more', traits: 'Multiple oxidation states, often colored compounds, partially filled d-orbitals.', notable: 'Iron in hemoglobin; copper in wires; titanium in airplanes; mercury in thermometers (legacy).' },
      { num: '13', name: 'Boron Group', members: 'B, Al, Ga, In, Tl', traits: '3 valence electrons. Mix of metalloids + metals.', notable: 'Boron in glass + detergent; aluminum most abundant metal in crust.' },
      { num: '14', name: 'Carbon Group', members: 'C, Si, Ge, Sn, Pb', traits: '4 valence electrons. Spans nonmetal to metalloid to metal.', notable: 'Carbon basis of life; silicon in microchips; lead historically toxic.' },
      { num: '15', name: 'Nitrogen Group (Pnictogens)', members: 'N, P, As, Sb, Bi', traits: '5 valence electrons. Vary widely.', notable: 'Nitrogen in atmosphere + DNA; phosphorus in ATP + bone.' },
      { num: '16', name: 'Oxygen Group (Chalcogens)', members: 'O, S, Se, Te, Po', traits: '6 valence electrons. Form 2- ions.', notable: 'Oxygen drives respiration; sulfur in proteins; selenium essential trace element.' },
      { num: '17', name: 'Halogens', members: 'F, Cl, Br, I, At', traits: '7 valence electrons. Highly reactive nonmetals. Form 1- ions.', notable: 'Fluoride in toothpaste; chlorine disinfects water; iodine thyroid hormone.' },
      { num: '18', name: 'Noble Gases', members: 'He, Ne, Ar, Kr, Xe, Rn', traits: 'Full valence shell. Generally unreactive (some Xe + Kr compounds exist).', notable: 'Helium in balloons; neon in signs; argon in welding; radon health hazard.' },
      { num: 'Lanthanides', name: 'Rare Earth Elements', members: 'La through Lu', traits: '4f electron filling. Similar chemical behavior. Critical for modern technology.', notable: 'Used in magnets, lasers, MRI contrast, screens. Mostly mined in China.' },
      { num: 'Actinides', name: 'Heavy Radioactive', members: 'Ac through Lr', traits: 'All radioactive. 5f electron filling.', notable: 'Uranium + plutonium for nuclear power + weapons; americium in smoke detectors.' }
    ],
    trends: [
      { trend: 'Atomic radius', acrossPeriod: 'Decreases left to right (more proton pull)', downGroup: 'Increases (more electron shells)' },
      { trend: 'Electronegativity', acrossPeriod: 'Increases left to right (more nuclear charge)', downGroup: 'Decreases (electrons further away)' },
      { trend: 'Ionization energy', acrossPeriod: 'Increases left to right (harder to remove electron)', downGroup: 'Decreases (outer electron less tightly held)' },
      { trend: 'Electron affinity', acrossPeriod: 'Generally increases left to right', downGroup: 'Generally decreases' },
      { trend: 'Metallic character', acrossPeriod: 'Decreases left to right (more nonmetal)', downGroup: 'Increases (more metallic)' },
      { trend: 'Reactivity (metals)', acrossPeriod: 'Decreases', downGroup: 'Increases (alkali metals most reactive at bottom)' },
      { trend: 'Reactivity (nonmetals)', acrossPeriod: 'Increases up to halogens', downGroup: 'Decreases for halogens' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // FAMOUS REACTIONS — landmark chemical reactions
  // ═══════════════════════════════════════════════════════════
  var FAMOUS_REACTIONS = [
    { name: 'Combustion (Methane)', equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O', delta: '-890 kJ/mol', type: 'Exothermic', context: 'Natural gas burning. Powers homes + factories. Releases CO2 (greenhouse gas).' },
    { name: 'Photosynthesis', equation: '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂', delta: '+2870 kJ/mol', type: 'Endothermic', context: 'Plants convert sunlight to sugar. Source of atmospheric O2 + biosphere energy.' },
    { name: 'Cellular Respiration', equation: 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O', delta: '-2870 kJ/mol', type: 'Exothermic', context: 'Animals + plants extract energy from glucose. Mitochondrial reaction.' },
    { name: 'Haber-Bosch (Ammonia)', equation: 'N₂ + 3H₂ ⇌ 2NH₃', delta: '-92 kJ/mol', type: 'Exothermic', context: 'Industrial fertilizer. Feeds ~50% of humanity. Fritz Haber Nobel 1918.' },
    { name: 'Hydrogen-Oxygen Fuel Cell', equation: '2H₂ + O₂ → 2H₂O', delta: '-572 kJ/mol', type: 'Exothermic', context: 'Clean energy. Produces only water + electricity. Used in spacecraft.' },
    { name: 'Thermite', equation: '2Al + Fe₂O₃ → Al₂O₃ + 2Fe', delta: '-852 kJ/mol', type: 'Highly Exothermic', context: 'Used to weld railroad tracks. Burns at 2500°C.' },
    { name: 'Hydrogen Peroxide Decomposition', equation: '2H₂O₂ → 2H₂O + O₂', delta: '-196 kJ/mol', type: 'Exothermic', context: 'Catalyzed by MnO2 or catalase. Used in rockets + bleaching.' },
    { name: 'Acid-Base Neutralization (HCl + NaOH)', equation: 'HCl + NaOH → NaCl + H₂O', delta: '-57 kJ/mol', type: 'Exothermic', context: 'Classic acid-base reaction. Heat of neutralization.' },
    { name: 'Limestone Decomposition', equation: 'CaCO₃ → CaO + CO₂', delta: '+178 kJ/mol', type: 'Endothermic', context: 'Cement production. Industrial CO2 source.' },
    { name: 'Steam Reforming (Hydrogen)', equation: 'CH₄ + H₂O → CO + 3H₂', delta: '+206 kJ/mol', type: 'Endothermic', context: 'Industrial H2 production. Currently makes 95% of world hydrogen.' },
    { name: 'Contact Process (H2SO4)', equation: 'SO₂ + 1/2 O₂ ⇌ SO₃', delta: '-99 kJ/mol', type: 'Exothermic', context: 'Sulfuric acid production. Most-produced industrial chemical.' },
    { name: 'Ostwald Process (HNO3)', equation: '4NH₃ + 5O₂ → 4NO + 6H₂O', delta: '-906 kJ/mol', type: 'Exothermic', context: 'Nitric acid production from ammonia. Fertilizers + explosives.' },
    { name: 'Chloralkali Process', equation: '2NaCl + 2H₂O → 2NaOH + Cl₂ + H₂', delta: 'Variable', type: 'Electrolytic', context: 'Industrial chlorine + caustic soda from brine.' },
    { name: 'Berthelot Reaction', equation: 'C(s) + 2H₂ → CH₄', delta: '-74 kJ/mol', type: 'Exothermic', context: 'Carbon hydrogenation. Theoretically used for clean fuel synthesis.' },
    { name: 'Frasch Process', equation: 'S(rhombic) → S(liquid) + heat', delta: '+1.7 kJ/mol', type: 'Phase change', context: 'Underground sulfur mining via superheated water.' },
    { name: 'Bayer Process (Aluminum)', equation: 'Al(OH)₃ → Al₂O₃ + 3H₂O', delta: 'Variable', type: 'Calcination', context: 'Aluminum from bauxite. Modern aluminum industry.' },
    { name: 'Hall-Héroult Process', equation: '2Al₂O₃ → 4Al + 3O₂', delta: 'Electrolytic', type: 'Reduction', context: 'Electrolysis-driven aluminum production. Most-consumed electricity industrial process.' },
    { name: 'Solvay Process', equation: 'NaCl + CO₂ + NH₃ + H₂O → NaHCO₃ + NH₄Cl', delta: 'Variable', type: 'Industrial', context: 'Sodium carbonate (washing soda + glass) production.' },
    { name: 'Friedel-Crafts Alkylation', equation: 'C₆H₆ + CH₃Cl → C₆H₅CH₃ + HCl', delta: 'Variable', type: 'Substitution', context: 'Adds alkyl group to aromatic ring. Foundational organic reaction.' },
    { name: 'Diels-Alder Reaction', equation: 'Diene + Dienophile → Cyclohexene', delta: 'Variable', type: 'Cycloaddition', context: 'Forms 6-membered rings. Nobel 1950 (Diels + Alder).' },
    { name: 'Grignard Reaction', equation: 'R-Mg-X + R\'-C=O → R-C(OH)-R\'', delta: 'Variable', type: 'Nucleophilic addition', context: 'Foundational organic carbon-carbon bond formation. Grignard Nobel 1912.' },
    { name: 'Suzuki Coupling', equation: 'R-X + R\'-B(OH)₂ → R-R\'', delta: 'Variable', type: 'Cross-coupling', context: 'Palladium-catalyzed C-C bond formation. Nobel 2010.' },
    { name: 'Wittig Reaction', equation: 'R₂C=O + Ph₃P=CR\'₂ → R₂C=CR\'₂ + Ph₃P=O', delta: 'Variable', type: 'Olefination', context: 'Forms alkenes. Wittig Nobel 1979.' },
    { name: 'Olefin Metathesis', equation: 'R₁CH=CHR₂ + R₃CH=CHR₄ → R₁CH=CHR₃ + R₂CH=CHR₄', delta: 'Variable', type: 'Metathesis', context: 'Exchanges substituents between alkenes. Nobel 2005 (Grubbs et al.).' },
    { name: 'Click Chemistry', equation: 'Azide + Alkyne → Triazole', delta: 'Variable', type: 'Cycloaddition', context: 'Fast + selective C-N bond formation. Sharpless Nobel 2022.' },
    { name: 'Strecker Synthesis (Amino Acids)', equation: 'RCHO + NH₃ + HCN → R-CH(NH₂)-CN', delta: 'Variable', type: 'Synthesis', context: 'Synthesizes alpha-amino acids. Possible prebiotic chemistry.' },
    { name: 'Miller-Urey Experiment', equation: 'NH₃ + CH₄ + H₂O + H₂ → amino acids', delta: 'Spark/UV input', type: 'Synthesis', context: 'Demonstrated abiotic origin of life building blocks (1953).' },
    { name: 'Saponification (Soap Making)', equation: 'Triglyceride + 3NaOH → Glycerol + 3 fatty acid salts', delta: 'Exothermic', type: 'Hydrolysis', context: 'Traditional soap making. 5000+ years of human use.' },
    { name: 'Fischer Esterification', equation: 'R-COOH + R\'-OH ⇌ R-COO-R\' + H₂O', delta: 'Equilibrium', type: 'Esterification', context: 'Forms esters. Common flavor + scent compounds.' },
    { name: 'Polymerization (Ethylene)', equation: 'n CH₂=CH₂ → (-CH₂-CH₂-)ₙ', delta: '-100 kJ/mol per unit', type: 'Polymerization', context: 'Makes polyethylene. World\'s most-produced plastic.' },
    { name: 'Vulcanization', equation: 'Rubber + S → Cross-linked rubber', delta: 'Exothermic', type: 'Cross-linking', context: 'Goodyear 1839. Made modern tires possible.' },
    { name: 'Glycolysis (Step 1)', equation: 'Glucose + ATP → G-6-P + ADP', delta: '-16.7 kJ/mol', type: 'Phosphorylation', context: 'First step of glycolysis. Cellular metabolism.' },
    { name: 'ATP Synthesis', equation: 'ADP + Pi → ATP', delta: '+30.5 kJ/mol', type: 'Endergonic', context: 'Cellular energy currency. Powered by H+ gradient.' },
    { name: 'Krebs Cycle Net', equation: 'Acetyl-CoA → 2 CO₂ + 8 e-', delta: 'Variable', type: 'Cyclic', context: 'Cellular respiration. Energy + electrons extraction.' },
    { name: 'Calvin Cycle', equation: '3 CO₂ + 9 ATP + 6 NADPH → G3P + 9 ADP + 6 NADP+', delta: 'Endergonic', type: 'Cyclic', context: 'Photosynthesis dark reactions. Carbon fixation.' },
    { name: 'Combustion of Octane (Gasoline)', equation: '2C₈H₁₈ + 25O₂ → 16CO₂ + 18H₂O', delta: '-5,470 kJ/mol', type: 'Exothermic', context: 'Powers gasoline engines. ~85% of world transportation.' },
    { name: 'Acid Rain Formation', equation: 'SO₂ + H₂O → H₂SO₃; SO₃ + H₂O → H₂SO₄', delta: 'Variable', type: 'Hydration', context: 'Coal-burning + auto emissions form acid rain. Damages ecosystems + buildings.' },
    { name: 'Ozone Formation (UV)', equation: '3O₂ + UV → 2O₃', delta: 'Endothermic', type: 'Photochemical', context: 'Stratospheric ozone layer protects Earth from UV.' },
    { name: 'Ozone Depletion (CFC)', equation: 'O₃ + Cl· → ClO + O₂; ClO + O → Cl· + O₂', delta: 'Catalytic', type: 'Chain', context: 'CFCs destroy ozone. Montreal Protocol 1987 phased them out.' },
    { name: 'TNT Explosion', equation: '2C₇H₅N₃O₆ → 3N₂ + 5H₂O + 7CO + 7C', delta: 'Highly Exothermic', type: 'Detonation', context: 'TNT = tritolyl trinitrobenzene. Standard explosive reference.' }
  ];

  // ═══════════════════════════════════════════════════════════
  // INDUSTRIAL CHEMISTRY — major industrial processes
  // ═══════════════════════════════════════════════════════════
  var INDUSTRIAL_CHEM = {
    intro: 'Industrial chemistry feeds + powers + builds the world. Below are 18 major industrial processes that transform raw materials into the products of civilization.',
    processes: [
      { name: 'Haber-Bosch Process', invented: '1909-1913 (Haber, Bosch)', reaction: 'N₂ + 3H₂ ⇌ 2NH₃', conditions: '400-500°C, 200-300 atm, Fe catalyst', scale: '~150 million tons NH₃/year worldwide', importance: 'Provides nitrogen fertilizer for ~50% of world food. Without Haber-Bosch, 4 billion people would not be alive today.', drawbacks: '1-2% of global energy use. 1% of global CO2 emissions.' },
      { name: 'Contact Process (H2SO4)', invented: '1831 (Phillips), perfected 1880s', reaction: 'S + O₂ → SO₂; SO₂ + O₂ → SO₃; SO₃ + H₂O → H₂SO₄', conditions: '450°C, V₂O₅ catalyst', scale: '~260M tons/year', importance: 'Sulfuric acid is most-produced chemical. Used in fertilizers, batteries, refining, dyes, drugs.', drawbacks: 'Air pollution from SO2 emissions.' },
      { name: 'Solvay Process (Na2CO3)', invented: '1864 (Ernest Solvay)', reaction: 'NaCl + NH₃ + CO₂ + H₂O → NaHCO₃ + NH₄Cl', conditions: 'Ambient, recycled NH3', scale: '~60M tons/year', importance: 'Soda ash production. Glass, soap, detergents, paper.', drawbacks: 'Massive waste of CaCl2 brine.' },
      { name: 'Chloralkali Process', invented: 'Industrialized 1890s', reaction: '2NaCl + 2H₂O → 2NaOH + Cl₂ + H₂', conditions: 'Electrolysis (membrane cells)', scale: '~80M tons NaOH/year', importance: 'Sodium hydroxide + chlorine + hydrogen from salt. PVC plastic, paper, soap.', drawbacks: 'Energy-intensive. Mercury cell version polluted oceans.' },
      { name: 'Hall-Héroult (Aluminum)', invented: '1886 (independently Hall + Héroult)', reaction: '2Al₂O₃ → 4Al + 3O₂', conditions: '950°C molten cryolite, electrolysis', scale: '~65M tons Al/year', importance: 'Modern aluminum production. Without it, Al would still be more valuable than gold.', drawbacks: '~3% of world electricity consumption. Bauxite mining + red mud waste.' },
      { name: 'Bayer Process (Alumina)', invented: '1888 (Karl Bayer)', reaction: 'Al(OH)₃ + bauxite → Al₂O₃ + waste', conditions: '150-200°C, NaOH solution', scale: '~130M tons alumina/year', importance: 'Refines bauxite to alumina (Al2O3) for Hall-Héroult.', drawbacks: 'Red mud waste — environmental hazard.' },
      { name: 'Cracking (Petroleum)', invented: '1891 onward', reaction: 'C₁₈H₃₈ → C₈H₁₈ + C₈H₁₆ + H₂', conditions: 'Thermal: 500-800°C; Catalytic: zeolite catalyst', scale: '~4 billion bbl gasoline/year', importance: 'Converts heavy hydrocarbons to gasoline + diesel + petrochemicals.', drawbacks: 'Fossil fuel basis. Climate change driver.' },
      { name: 'Catalytic Reforming', invented: '1940s', reaction: 'Naphtha → Aromatics + H₂', conditions: '500°C, Pt catalyst', scale: 'Major refinery process', importance: 'Produces high-octane gasoline + aromatic feedstocks.', drawbacks: 'Energy-intensive.' },
      { name: 'Steam Reforming (H2)', invented: '1920s, industrial 1930s+', reaction: 'CH₄ + H₂O → CO + 3H₂; CO + H₂O → CO₂ + H₂', conditions: '800°C, Ni catalyst', scale: '~70M tons H2/year', importance: '95% of world hydrogen production. For Haber-Bosch + refining.', drawbacks: 'Major CO2 emissions source.' },
      { name: 'Ostwald Process (HNO3)', invented: '1902 (Wilhelm Ostwald)', reaction: '4NH₃ + 5O₂ → 4NO + 6H₂O; 2NO + O₂ → 2NO₂; 3NO₂ + H₂O → 2HNO₃ + NO', conditions: '900°C, Pt-Rh catalyst', scale: '~80M tons HNO3/year', importance: 'Nitric acid for fertilizers + explosives + nylon.', drawbacks: 'NOx emissions.' },
      { name: 'Glass Manufacturing', invented: 'Ancient (Egyptian ~3000 BCE)', reaction: 'Na₂CO₃ + CaCO₃ + SiO₂ → glass + CO₂', conditions: '~1500°C, soda-lime mixture', scale: '~150M tons/year', importance: 'Windows, bottles, fiber optics, electronics, lab.', drawbacks: 'High energy + CO2.' },
      { name: 'Cement Manufacturing (Portland)', invented: '1824 (Joseph Aspdin)', reaction: 'CaCO₃ + SiO₂ + Al₂O₃ → cement + CO₂', conditions: '1450°C kiln', scale: '~4.4B tons/year', importance: 'Building infrastructure. Concrete is most-used material after water.', drawbacks: '~8% of world CO2 emissions.' },
      { name: 'Steel Production (BOF)', invented: '1856 (Bessemer)', reaction: 'Fe₂O₃ + 3C → 2Fe + 3CO', conditions: 'Blast furnace + basic oxygen furnace', scale: '~1.9B tons/year', importance: 'Most-used metal. Buildings, cars, infrastructure.', drawbacks: '~7-9% of global CO2.' },
      { name: 'Polymerization (PE, PVC, PP)', invented: '1930s-1950s', reaction: 'n CH₂=CH₂ → (-CH₂-CH₂-)ₙ etc.', conditions: 'Various: high-pressure, catalysts', scale: '~400M tons plastics/year', importance: 'Plastics in everything: packaging, electronics, medicine.', drawbacks: 'Plastic pollution + microplastics.' },
      { name: 'Pharmaceutical Synthesis', invented: 'Ongoing (each drug unique)', reaction: 'Complex multi-step', conditions: 'Various, often catalysts', scale: '~$1.5T industry', importance: 'Modern medicine. Lifesaving drugs from chemistry.', drawbacks: 'Costly. Environmental concerns from solvents + waste.' },
      { name: 'Petroleum Refining', invented: '1850s (Drake well 1859)', reaction: 'Distillation + cracking + reforming', conditions: 'Various', scale: '~100M bbl/day', importance: 'Gasoline, diesel, jet fuel, plastics, chemicals.', drawbacks: 'Fossil fuel basis. Climate change.' },
      { name: 'Wacker Process', invented: '1956 (Wacker Chemie)', reaction: 'C₂H₄ + O₂ → CH₃CHO', conditions: 'PdCl2/CuCl2 catalyst', scale: '~3M tons/year acetaldehyde', importance: 'Acetaldehyde for acetic acid + flavorings.', drawbacks: 'Toxic byproducts historically.' },
      { name: 'Monsanto Process (Acetic Acid)', invented: '1970s (Monsanto, refined by BP)', reaction: 'CH₃OH + CO → CH₃COOH', conditions: 'Rh catalyst, 150-200°C, 30-60 atm', scale: '~14M tons acetic acid/year', importance: 'Vinegar, plastics, textiles, drugs.', drawbacks: 'Expensive Rh catalyst.' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // AP CHEMISTRY REFERENCE — official curriculum
  // ═══════════════════════════════════════════════════════════
  var AP_CHEMISTRY = {
    intro: 'AP Chemistry curriculum reference. 9 Units of the College Board syllabus. Each section covers core topics + skills required for the exam.',
    units: [
      { unit: 1, title: 'Atomic Structure + Properties', topics: ['Moles + molar mass', 'Mass spectroscopy', 'Elemental composition', 'Photoelectron spectroscopy', 'Periodic trends', 'Valence electrons + ionic compounds'], weight: '7-9%', tip: 'Most important: be comfortable interpreting PES + mass spec data. Test asks about both routinely.' },
      { unit: 2, title: 'Compound Structure + Properties', topics: ['Ionic compounds', 'Covalent + metallic bonding', 'Lewis structures', 'VSEPR + bond hybridization', 'Polarity', 'Intermolecular forces'], weight: '7-9%', tip: 'Master Lewis dot + VSEPR. Most multiple-choice questions touch on bonding/structure.' },
      { unit: 3, title: 'Intermolecular Forces + Properties', topics: ['Solids, liquids, gases', 'Phase diagrams', 'IMF strengths', 'Solutions + concentration', 'Ideal gas law', 'Photoelectron evidence for IMF'], weight: '18-22%', tip: 'Largest unit. Memorize IMF strengths: H-bond > dipole-dipole > London dispersion. Practice gas law problems.' },
      { unit: 4, title: 'Chemical Reactions', topics: ['Physical vs chemical change', 'Net ionic equations', 'Stoichiometry', 'Solution stoichiometry', 'Acid-base reactions', 'Oxidation-reduction'], weight: '7-9%', tip: 'Balance net ionic equations. Identify oxidation numbers. Don\'t forget activity series.' },
      { unit: 5, title: 'Kinetics', topics: ['Reaction rates', 'Rate law expressions', 'Concentration changes over time', 'Collision theory', 'Reaction mechanisms', 'Catalysts'], weight: '7-9%', tip: 'Rate = k[A]^x[B]^y — determine x, y from initial rates. Integrated rate laws give straight-line equations.' },
      { unit: 6, title: 'Thermodynamics', topics: ['Endothermic + exothermic', 'Energy diagrams', 'Heat transfer', 'Heat of formation', 'Hess\'s Law', 'Calorimetry'], weight: '7-9%', tip: 'ΔH = sum products - sum reactants. Master q = mcΔT for calorimetry.' },
      { unit: 7, title: 'Equilibrium', topics: ['Reaction quotient + equilibrium constant', 'Equilibrium expressions', 'Calculating equilibrium concentrations', 'Le Chatelier', 'Solubility product (Ksp)', 'Common ion effect'], weight: '7-9%', tip: 'ICE tables are your friend. Q vs K tells direction of shift.' },
      { unit: 8, title: 'Acids + Bases', topics: ['pH + pOH', 'Strong vs weak acids/bases', 'Acid-base titration', 'Buffer solutions', 'Henderson-Hasselbalch', 'Acid-base equilibrium'], weight: '11-15%', tip: 'Memorize the strong acids/bases. Buffer problems use Henderson-Hasselbalch.' },
      { unit: 9, title: 'Applications of Thermodynamics', topics: ['Entropy', 'Gibbs free energy', 'Spontaneity', 'Electrochemistry', 'Galvanic vs electrolytic cells', 'Faraday\'s law'], weight: '7-9%', tip: 'ΔG = ΔH - TΔS. Negative ΔG means spontaneous. Don\'t mix up cell types.' }
    ],
    examTips: [
      'Show ALL work in free response. Partial credit possible.',
      'Use units throughout calculations.',
      'Round only at final answer; carry extra digits during calculations.',
      'For graphs: label axes, draw best-fit lines, calculate slope correctly.',
      'For Lewis structures: count electrons, place formal charges.',
      'For VSEPR: draw electron geometry first, then molecular geometry.',
      'For equilibrium: write expressions, set up ICE tables, solve quadratic if needed.',
      'For kinetics: experimentally determine rate law from initial rate data.',
      'For thermo: state functions (H, S, G) only depend on initial + final states.',
      'Practice old free-response questions — patterns repeat.',
      'Bring a calculator that can do logarithms, exponents, square roots.',
      'Calculator: scientific only, no graphing (check current rules).',
      'Get sleep before exam. Eat. Bring water.',
      'Most studies show practice tests are most effective study method.'
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // LAB TECHNIQUES — 30+ procedures
  // ═══════════════════════════════════════════════════════════
  var LAB_TECHNIQUES = {
    intro: 'Standard laboratory procedures every chemistry student should know. Mastering these enables independent + safe lab work.',
    techniques: [
      { name: 'Titration', purpose: 'Measure concentration of unknown solution', steps: ['Set up buret with known concentration titrant', 'Add indicator to analyte', 'Add titrant dropwise', 'Note volume at color change', 'Calculate concentration: M1V1 = M2V2'], danger: 'Strong acids/bases. Wear PPE.', skill: 'Intermediate' },
      { name: 'Distillation', purpose: 'Separate liquids by boiling point', steps: ['Set up distillation apparatus', 'Heat liquid to boiling', 'Collect vapor through condenser', 'Take fractions at different temperatures'], danger: 'Boiling + flammable. Keep good ventilation.', skill: 'Intermediate' },
      { name: 'Filtration', purpose: 'Separate solid from liquid', steps: ['Fold filter paper, place in funnel', 'Pour mixture through', 'Collect filtrate below', 'Residue is solid'], danger: 'Generally safe.', skill: 'Beginner' },
      { name: 'Recrystallization', purpose: 'Purify crystalline solid', steps: ['Dissolve solid in minimum hot solvent', 'Cool slowly', 'Filter crystals', 'Wash with cold solvent', 'Dry'], danger: 'Hot solvent + flammable.', skill: 'Intermediate' },
      { name: 'Centrifugation', purpose: 'Separate by density via spinning', steps: ['Place tubes in centrifuge balanced', 'Set rpm + time', 'Spin', 'Decant supernatant'], danger: 'Mechanical hazard. Balance tubes!', skill: 'Beginner' },
      { name: 'Chromatography (Paper)', purpose: 'Separate pigments + compounds', steps: ['Draw line on paper, apply spot', 'Place in solvent', 'Allow capillary action', 'Compare Rf values'], danger: 'Solvent vapors. Ventilation.', skill: 'Beginner' },
      { name: 'Gas Chromatography (GC)', purpose: 'Separate volatile compounds', steps: ['Inject sample into column', 'Helium carrier gas', 'Components elute at different times', 'Detector measures peaks'], danger: 'Pressurized gas.', skill: 'Advanced' },
      { name: 'HPLC', purpose: 'High-precision separation in liquid', steps: ['Inject sample', 'Pump through column', 'Different elution times', 'UV/MS detection'], danger: 'High pressure.', skill: 'Advanced' },
      { name: 'NMR Spectroscopy', purpose: 'Determine molecular structure', steps: ['Dissolve sample in CDCl3 (deuterated)', 'Place in tube', 'Run sample on magnet', 'Interpret peaks'], danger: 'Strong magnet. Removable metal.', skill: 'Advanced' },
      { name: 'IR Spectroscopy', purpose: 'Identify functional groups', steps: ['Sample preparation (thin film, KBr pellet, or ATR)', 'Scan 4000-400 cm-1', 'Identify absorption bands'], danger: 'Generally safe.', skill: 'Intermediate' },
      { name: 'UV-Visible Spectroscopy', purpose: 'Measure concentration of colored compound', steps: ['Calibration: prepare standards', 'Plot A vs c, get Beer\'s law slope', 'Measure unknown absorbance', 'Use slope to find c'], danger: 'Generally safe.', skill: 'Beginner' },
      { name: 'Buchner Funnel Vacuum Filtration', purpose: 'Fast solid filtration', steps: ['Connect vacuum to side arm', 'Filter paper in funnel', 'Pour mixture, vacuum sucks liquid', 'Collect dried solid'], danger: 'Vacuum implosion. Use sturdy glassware.', skill: 'Beginner' },
      { name: 'Hydrolysis', purpose: 'Break chemical bond with water', steps: ['Mix reagent with water', 'Add acid/base catalyst if needed', 'Heat to drive forward', 'Isolate product'], danger: 'Strong acid/base + heat.', skill: 'Intermediate' },
      { name: 'Oxidation-Reduction Titration', purpose: 'Measure conc of oxidizing/reducing agent', steps: ['Choose indicator (e.g., starch for I2)', 'Same as acid-base titration', 'Endpoint at color change'], danger: 'Strong oxidizers.', skill: 'Intermediate' },
      { name: 'Gravimetric Analysis', purpose: 'Measure amount by weighing precipitate', steps: ['Form precipitate', 'Filter + dry', 'Weigh', 'Calculate moles from mass'], danger: 'Generally safe.', skill: 'Beginner' },
      { name: 'Calorimetry (Coffee-cup)', purpose: 'Measure heat of reaction', steps: ['Insulated cup with thermometer', 'Add reactants + measure T change', 'q = mcΔT'], danger: 'Heat.', skill: 'Beginner' },
      { name: 'Bomb Calorimetry', purpose: 'Measure heat of combustion', steps: ['Place sample in bomb, fill with O2', 'Ignite, measure T rise of water', 'Calculate ΔH per gram or per mole'], danger: 'High pressure + flame.', skill: 'Advanced' },
      { name: 'Refluxing', purpose: 'Heat reaction without losing solvent', steps: ['Set up reflux condenser', 'Heat reaction mixture', 'Vapor condenses + returns', 'Stop after reaction time'], danger: 'Flammable solvents.', skill: 'Intermediate' },
      { name: 'Sublimation', purpose: 'Purify solid by direct vapor', steps: ['Heat in vacuum or low pressure', 'Solid directly to gas', 'Condense on cold surface'], danger: 'Vacuum + heat.', skill: 'Advanced' },
      { name: 'Soxhlet Extraction', purpose: 'Extract compound from solid with solvent', steps: ['Place solid in thimble', 'Solvent refluxes through', 'Compound dissolves + collects'], danger: 'Solvent + heat.', skill: 'Advanced' },
      { name: 'Steam Distillation', purpose: 'Distill heat-sensitive compound', steps: ['Pass steam through mixture', 'Codistills with water', 'Compound separates from water'], danger: 'Steam + heat.', skill: 'Advanced' },
      { name: 'Polarimetry', purpose: 'Measure optical rotation', steps: ['Place chiral sample in polarimeter', 'Measure rotation', 'Calculate specific rotation'], danger: 'Generally safe.', skill: 'Advanced' },
      { name: 'Conductivity Measurement', purpose: 'Measure ion concentration in solution', steps: ['Use conductivity probe', 'Calibrate with standard', 'Measure unknown'], danger: 'Electrical (low voltage).', skill: 'Beginner' },
      { name: 'pH Measurement', purpose: 'Measure acidity/basicity', steps: ['Calibrate pH meter at 4, 7, 10', 'Rinse with distilled water', 'Read solution pH'], danger: 'Probe is fragile + expensive.', skill: 'Beginner' },
      { name: 'Mass Spectrometry', purpose: 'Determine molecular mass + structure', steps: ['Vaporize sample', 'Ionize (EI, ESI, MALDI)', 'Accelerate through magnetic field', 'Detect by m/z'], danger: 'Vacuum + high voltage.', skill: 'Advanced' },
      { name: 'X-ray Diffraction', purpose: 'Determine crystal structure', steps: ['Grow good crystal', 'Place in X-ray beam', 'Measure diffraction pattern', 'Solve structure'], danger: 'X-ray radiation.', skill: 'Advanced' },
      { name: 'Electrophoresis', purpose: 'Separate by charge + size', steps: ['Load samples onto gel', 'Apply voltage', 'Molecules migrate', 'Stain + visualize'], danger: 'Electrical + voltage hazard.', skill: 'Intermediate' },
      { name: 'Atomic Absorption Spectroscopy', purpose: 'Measure metal concentration', steps: ['Atomize sample in flame', 'Absorb element-specific wavelength', 'Calculate concentration'], danger: 'Flame + light hazard.', skill: 'Advanced' },
      { name: 'Karl Fischer Titration', purpose: 'Measure water content', steps: ['Add Karl Fischer reagent', 'Titrate to endpoint', 'Calculate water content'], danger: 'Solvent + reagent.', skill: 'Intermediate' },
      { name: 'Iodometric Titration', purpose: 'Measure oxidizing agent via iodine', steps: ['Add KI to sample', 'Titrate liberated I2 with thiosulfate', 'Starch indicator'], danger: 'I2 toxic.', skill: 'Intermediate' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // FAMOUS CHEMISTS — 25 legendary scientists
  // ═══════════════════════════════════════════════════════════
  var FAMOUS_CHEMISTS = [
    { name: 'Antoine Lavoisier', years: '1743-1794', country: 'France', achievement: 'Father of modern chemistry. Showed combustion = oxygen reaction (not phlogiston). Conservation of mass. Named oxygen + hydrogen.', tragic: 'Guillotined during French Revolution despite being a hero of science.' },
    { name: 'Dmitri Mendeleev', years: '1834-1907', country: 'Russia', achievement: 'Created the periodic table (1869). Predicted gallium, germanium, scandium decades before discovery. Organized all known elements.', tragic: 'Never won Nobel Prize despite multiple nominations.' },
    { name: 'Marie Curie', years: '1867-1934', country: 'Poland/France', achievement: 'Discovered polonium + radium. First person to win two Nobel Prizes (Physics 1903, Chemistry 1911). Coined "radioactivity."', tragic: 'Died from radiation exposure. Her notebooks still radioactive 90+ years later.' },
    { name: 'Linus Pauling', years: '1901-1994', country: 'USA', achievement: 'Won two Nobel Prizes (Chemistry 1954, Peace 1962). Nature of the chemical bond. Hybridization theory.', tragic: 'Wrong about vitamin C cure; promoted megadose theory most evidence disproved.' },
    { name: 'Fritz Haber', years: '1868-1934', country: 'Germany', achievement: 'Haber-Bosch process — feeds 50% of humanity. Nobel 1918.', tragic: 'Developed chemical weapons in WWI. His wife (Clara) committed suicide partly over this. Banned from Germany 1933 (Jewish).' },
    { name: 'Glenn Seaborg', years: '1912-1999', country: 'USA', achievement: 'Discovered plutonium + 9 other transuranic elements. Nobel Chemistry 1951. Restructured periodic table to add actinide row.', tragic: 'None major.' },
    { name: 'Robert Burns Woodward', years: '1917-1979', country: 'USA', achievement: 'Synthesized cholesterol, cortisone, quinine, B12. Master of organic synthesis. Nobel 1965.', tragic: 'Died at age 62 (heart attack), denying many additional accomplishments.' },
    { name: 'Roald Hoffmann', years: '1937-present', country: 'Poland/USA', achievement: 'Theoretical chemistry. Woodward-Hoffmann rules for orbital symmetry. Nobel 1981.', tragic: 'Holocaust survivor (Jewish, hidden as child).' },
    { name: 'Dorothy Hodgkin', years: '1910-1994', country: 'UK', achievement: 'X-ray structures of cholesterol, penicillin, vitamin B12, insulin. Nobel 1964.', tragic: 'Rheumatoid arthritis from age 24 — yet continued research.' },
    { name: 'Gertrude Elion', years: '1918-1999', country: 'USA', achievement: 'Designed acyclovir (herpes), 6-mercaptopurine (leukemia), azathioprine (transplant rejection). Nobel 1988.', tragic: 'Self-taught; fiancé died of bacterial endocarditis before her drug-discovery work.' },
    { name: 'Friedrich Wöhler', years: '1800-1882', country: 'Germany', achievement: 'First synthesized organic compound (urea) from inorganic (1828). Disproved vitalism (idea that life-forces required to make organic).', tragic: 'Few; long productive life.' },
    { name: 'Robert Boyle', years: '1627-1691', country: 'Ireland/UK', achievement: 'Boyle\'s Law of gases. Distinguished element from compound. Founded modern chemistry methodology.', tragic: 'Sickly throughout life but lived to 64.' },
    { name: 'Joseph Priestley', years: '1733-1804', country: 'UK/USA', achievement: 'Discovered oxygen (1774) — though Scheele earlier. Soda water invention.', tragic: 'Persecuted for political/religious views; fled to America 1794.' },
    { name: 'John Dalton', years: '1766-1844', country: 'UK', achievement: 'Atomic theory (1808). Each element\'s atoms are identical + distinct from other elements. Foundation of modern chemistry.', tragic: 'Quaker — limited social access in Anglican England.' },
    { name: 'Justus von Liebig', years: '1803-1873', country: 'Germany', achievement: 'Father of agricultural chemistry. Founded organic chemistry as discipline. Liebig condenser.', tragic: 'Some bitter feuds with other chemists.' },
    { name: 'August Kekulé', years: '1829-1896', country: 'Germany', achievement: 'Discovered benzene ring structure (1865) — claimed it came in dream of snake biting tail.', tragic: 'Few; productive life.' },
    { name: 'Svante Arrhenius', years: '1859-1927', country: 'Sweden', achievement: 'Theory of ionic dissociation. First to predict greenhouse effect (1896). Nobel 1903.', tragic: 'Misread climate sensitivity but correctly identified mechanism.' },
    { name: 'Ernest Rutherford', years: '1871-1937', country: 'New Zealand/UK', achievement: 'Discovered atomic nucleus. Distinguished alpha + beta radiation. Nobel Chemistry 1908.', tragic: 'Few; productive life.' },
    { name: 'Gilbert N. Lewis', years: '1875-1946', country: 'USA', achievement: 'Lewis dot structures. Electron-pair theory. Acid-base concept (Lewis acid/base).', tragic: 'Never won Nobel despite multiple nominations + foundational work.' },
    { name: 'Niels Bohr', years: '1885-1962', country: 'Denmark', achievement: 'Bohr atomic model. Quantum theory of atomic structure. Nobel Physics 1922.', tragic: 'Escaped Nazi-occupied Denmark in WWII; advocated against atomic weapons.' },
    { name: 'Frederick Sanger', years: '1918-2013', country: 'UK', achievement: 'Two Nobel Prizes (1958 — insulin sequencing; 1980 — DNA sequencing). Only person to win Chemistry Nobel twice.', tragic: 'None major.' },
    { name: 'John Polanyi', years: '1929-present', country: 'Canada', achievement: 'Reaction dynamics. Discovered chemiluminescence. Nobel 1986.', tragic: 'Holocaust survivor (family).' },
    { name: 'Ahmed Zewail', years: '1946-2016', country: 'Egypt/USA', achievement: 'Femtochemistry — observing chemical reactions on 10⁻¹⁵ second timescale. Nobel 1999.', tragic: 'Died age 70.' },
    { name: 'Yuan T. Lee', years: '1936-present', country: 'Taiwan/USA', achievement: 'Crossed molecular beam techniques for reaction dynamics. Nobel 1986.', tragic: 'None major.' },
    { name: 'Carolyn Bertozzi', years: '1966-present', country: 'USA', achievement: 'Bioorthogonal click chemistry. Selectively label biomolecules in living systems. Nobel 2022.', tragic: 'None.' }
  ];

  // ═══════════════════════════════════════════════════════════
  // CHEMISTRY HISTORY TIMELINE
  // ═══════════════════════════════════════════════════════════
  var CHEM_HISTORY = [
    { year: -4000, event: 'Egyptians smelt copper. Begin of metallurgy.' },
    { year: -2000, event: 'Bronze Age — copper + tin alloys.' },
    { year: -1200, event: 'Iron Age — wider iron use.' },
    { year: -500, event: 'Empedocles proposes 4 elements (earth, water, air, fire).' },
    { year: -400, event: 'Democritus proposes atoms — indivisible particles.' },
    { year: -300, event: 'Aristotle\'s 4-element theory becomes dominant — atoms forgotten for 2000 years.' },
    { year: 800, event: 'Arab alchemists develop distillation + many lab techniques. Jabir ibn Hayyan.' },
    { year: 1250, event: 'Roger Bacon (Europe) experiments with gunpowder + chemistry.' },
    { year: 1500, event: 'Paracelsus (Swiss) — medicine + chemistry intertwine. Iatrochemistry.' },
    { year: 1620, event: 'Jan Baptist van Helmont — first proper chemical experiments. "Gas" word coined.' },
    { year: 1662, event: 'Robert Boyle publishes Sceptical Chymist — challenges Aristotelian elements.' },
    { year: 1750, event: 'Joseph Black discovers carbon dioxide.' },
    { year: 1772, event: 'Daniel Rutherford discovers nitrogen.' },
    { year: 1774, event: 'Joseph Priestley discovers oxygen (independently Scheele earlier).' },
    { year: 1789, event: 'Antoine Lavoisier publishes Traité Élémentaire de Chimie — founds modern chemistry.' },
    { year: 1808, event: 'John Dalton proposes atomic theory.' },
    { year: 1811, event: 'Amedeo Avogadro\'s hypothesis on gas volumes + moles.' },
    { year: 1828, event: 'Friedrich Wöhler synthesizes urea from inorganic — disproves vitalism.' },
    { year: 1865, event: 'Friedrich August Kekulé proposes benzene ring structure.' },
    { year: 1869, event: 'Dmitri Mendeleev publishes periodic table.' },
    { year: 1897, event: 'J.J. Thomson discovers electron.' },
    { year: 1898, event: 'Marie + Pierre Curie discover polonium + radium.' },
    { year: 1909, event: 'Fritz Haber demonstrates ammonia synthesis in lab.' },
    { year: 1911, event: 'Ernest Rutherford discovers atomic nucleus.' },
    { year: 1913, event: 'Niels Bohr proposes quantized atomic model.' },
    { year: 1923, event: 'Gilbert N. Lewis proposes electron-pair bonds + dot structures.' },
    { year: 1932, event: 'James Chadwick discovers neutron.' },
    { year: 1938, event: 'Otto Hahn + Fritz Strassmann discover nuclear fission.' },
    { year: 1953, event: 'Miller-Urey experiment — abiotic synthesis of amino acids.' },
    { year: 1953, event: 'Watson + Crick determine DNA structure (with Rosalind Franklin\'s data).' },
    { year: 1955, event: 'Synthesis of penicillin by John Sheehan.' },
    { year: 1962, event: 'Rachel Carson publishes Silent Spring — chemistry + environment.' },
    { year: 1985, event: 'Discovery of buckminsterfullerene (C60).' },
    { year: 1996, event: 'First DNA computers + molecular computing.' },
    { year: 2010, event: 'Negishi, Suzuki + Heck win Nobel for Pd-catalyzed cross-coupling.' },
    { year: 2016, event: 'Yoshino + Whittingham + Goodenough win Nobel 2019 for Li-ion batteries.' },
    { year: 2020, event: 'mRNA vaccines accelerate COVID response — chemistry saves lives.' },
    { year: 2022, event: 'Sharpless wins 2nd Nobel for click chemistry.' },
    { year: 2024, event: 'AlphaFold + AI revolutionize protein structure prediction.' }
  ];

  // ═══════════════════════════════════════════════════════════
  // ACIDS + BASES — comprehensive reference
  // ═══════════════════════════════════════════════════════════
  var ACIDS_BASES = {
    intro: 'Acids + bases form the foundation of much of chemistry. From digestion to industry to biochemistry, pH controls everything.',
    definitions: [
      { theory: 'Arrhenius (1884)', acid: 'Produces H+ in water', base: 'Produces OH- in water', example: 'HCl → H+ + Cl-' },
      { theory: 'Brønsted-Lowry (1923)', acid: 'Proton donor', base: 'Proton acceptor', example: 'HCl + H2O → H3O+ + Cl-' },
      { theory: 'Lewis (1923)', acid: 'Electron-pair acceptor', base: 'Electron-pair donor', example: 'BF3 + NH3 → BF3:NH3' }
    ],
    strongAcids: ['HCl', 'HBr', 'HI', 'HNO3', 'H2SO4 (first H)', 'HClO4', 'HClO3'],
    strongBases: ['LiOH', 'NaOH', 'KOH', 'RbOH', 'CsOH', 'Ca(OH)2', 'Sr(OH)2', 'Ba(OH)2'],
    weakAcids: [
      { name: 'Acetic acid', formula: 'CH3COOH', pKa: 4.76 },
      { name: 'Formic acid', formula: 'HCOOH', pKa: 3.75 },
      { name: 'Carbonic acid (1st)', formula: 'H2CO3', pKa: 6.35 },
      { name: 'Carbonic acid (2nd)', formula: 'HCO3-', pKa: 10.32 },
      { name: 'Hydrofluoric acid', formula: 'HF', pKa: 3.17 },
      { name: 'Phosphoric acid (1st)', formula: 'H3PO4', pKa: 2.15 },
      { name: 'Phosphoric acid (2nd)', formula: 'H2PO4-', pKa: 7.20 },
      { name: 'Phosphoric acid (3rd)', formula: 'HPO4 2-', pKa: 12.35 },
      { name: 'Boric acid', formula: 'H3BO3', pKa: 9.24 },
      { name: 'Ammonium (conj.)', formula: 'NH4+', pKa: 9.25 },
      { name: 'Hydrogen sulfide', formula: 'H2S', pKa: 7.0 },
      { name: 'Hypochlorous acid', formula: 'HClO', pKa: 7.53 }
    ],
    weakBases: [
      { name: 'Ammonia', formula: 'NH3', pKb: 4.75 },
      { name: 'Methylamine', formula: 'CH3NH2', pKb: 3.36 },
      { name: 'Pyridine', formula: 'C5H5N', pKb: 8.75 },
      { name: 'Aniline', formula: 'C6H5NH2', pKb: 9.40 }
    ],
    ph: 'pH = -log[H+]. pH < 7 = acidic. pH = 7 = neutral. pH > 7 = basic.',
    buffer: 'Buffer = weak acid + conjugate base. Resists pH change.',
    hendersonHasselbalch: 'pH = pKa + log([A-]/[HA])',
    titration: 'Titration: add titrant of known concentration to analyte until equivalence point. pH at equivalence depends on acid/base type.',
    keyConcepts: [
      { concept: 'Ka', def: 'Acid dissociation constant. Larger = stronger acid.' },
      { concept: 'Kb', def: 'Base dissociation constant. Larger = stronger base.' },
      { concept: 'Kw', def: 'Ion product of water = 10^-14 at 25°C. Kw = [H+][OH-].' },
      { concept: 'Conjugate pair', def: 'Acid + base differing by single H+. HCl/Cl-.' },
      { concept: 'Common-ion effect', def: 'Adding ion already in equilibrium shifts away from that ion.' },
      { concept: 'Le Chatelier', def: 'System at equilibrium shifts to oppose disturbance.' },
      { concept: 'Buffer capacity', def: 'How much acid/base buffer can absorb. Depends on concentration + ratio.' },
      { concept: 'Equivalence point', def: 'When moles acid = moles base.' },
      { concept: 'Endpoint', def: 'When indicator changes color. Often near equivalence point.' },
      { concept: 'Polyprotic acid', def: 'Acid that can donate multiple H+. Examples: H2SO4 (diprotic), H3PO4 (triprotic).' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // REDOX — oxidation, reduction, batteries
  // ═══════════════════════════════════════════════════════════
  var REDOX = {
    intro: 'Redox (reduction-oxidation) reactions involve electron transfer. Behind everything from batteries to combustion to corrosion to cellular respiration.',
    oilrig: 'OIL RIG: Oxidation Is Loss (of electrons), Reduction Is Gain.',
    leorigers: 'LEO the lion goes GER: Loss of Electrons = Oxidation, Gain of Electrons = Reduction.',
    rules: [
      'Free element: oxidation number = 0',
      'Monatomic ion: oxidation number = ion charge',
      'O is usually -2 (except peroxides -1, OF2 +2)',
      'H is usually +1 (except in metal hydrides -1)',
      'Sum of oxidation numbers in compound = 0',
      'Sum in polyatomic ion = ion charge',
      'F is always -1 in compounds',
      'Group 1 metals = +1, Group 2 = +2'
    ],
    halfReactions: [
      { name: 'Standard hydrogen electrode (reference)', reaction: '2H+ + 2e- → H₂', E: '0.00 V' },
      { name: 'Cu reduction', reaction: 'Cu²+ + 2e- → Cu', E: '+0.34 V' },
      { name: 'Zn oxidation (reverse direction)', reaction: 'Zn → Zn²+ + 2e-', E: '+0.76 V' },
      { name: 'Cl2 reduction', reaction: 'Cl₂ + 2e- → 2Cl-', E: '+1.36 V' },
      { name: 'F2 reduction (strongest oxidizer)', reaction: 'F₂ + 2e- → 2F-', E: '+2.87 V' },
      { name: 'Mg oxidation', reaction: 'Mg → Mg²+ + 2e-', E: '+2.37 V' },
      { name: 'Li oxidation (strongest reducer)', reaction: 'Li → Li+ + e-', E: '+3.04 V' }
    ],
    cells: [
      { type: 'Galvanic (Voltaic) Cell', description: 'Spontaneous redox produces electricity. ΔG < 0.', example: 'Daniell cell: Zn + Cu²+ → Zn²+ + Cu' },
      { type: 'Electrolytic Cell', description: 'External electricity drives non-spontaneous reaction. ΔG > 0.', example: 'Electrolysis of water: 2H₂O → 2H₂ + O₂' },
      { type: 'Fuel Cell', description: 'Continuous galvanic — reactants supplied continuously.', example: 'H₂/O₂ fuel cell: 2H₂ + O₂ → 2H₂O + electricity' },
      { type: 'Battery', description: 'Practical galvanic cell — portable + rechargeable in some types.', example: 'Lead-acid (car), Li-ion (phone), alkaline (AA)' }
    ],
    batteries: [
      { name: 'Lead-acid battery', voltage: '~2 V per cell', uses: 'Car batteries', mech: 'Pb + PbO₂ + H₂SO₄' },
      { name: 'Alkaline AA', voltage: '1.5 V', uses: 'Remote controls, flashlights', mech: 'Zn + MnO₂' },
      { name: 'Li-ion', voltage: '3.6-3.7 V', uses: 'Phones, laptops, EVs', mech: 'Li-graphite + Li-cobalt oxide' },
      { name: 'Ni-Cd', voltage: '1.2 V', uses: 'Power tools (phasing out)', mech: 'NiO(OH) + Cd' },
      { name: 'NiMH', voltage: '1.2 V', uses: 'Hybrid car batteries', mech: 'Ni hydroxide + metal hydride' },
      { name: 'Lithium polymer', voltage: '3.7 V', uses: 'Phones (some), drones', mech: 'Solid polymer electrolyte' },
      { name: 'Zn-air', voltage: '1.4 V', uses: 'Hearing aids', mech: 'Zn + atmospheric O₂' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // ORGANIC CHEMISTRY — functional groups
  // ═══════════════════════════════════════════════════════════
  var ORGANIC_CHEM = {
    intro: 'Organic chemistry is the chemistry of carbon. More carbon compounds known than all other elements combined.',
    functionalGroups: [
      { name: 'Alkane', formula: 'R-CH₃', priority: 'low', example: 'Propane (CH₃CH₂CH₃)', behavior: 'Saturated; relatively unreactive. C-C single bonds.' },
      { name: 'Alkene', formula: 'R-CH=CH₂', priority: 'medium', example: 'Ethylene (CH₂=CH₂)', behavior: 'C-C double bond. Reactive in addition reactions.' },
      { name: 'Alkyne', formula: 'R-C≡CH', priority: 'medium', example: 'Acetylene (HC≡CH)', behavior: 'C-C triple bond. Very reactive.' },
      { name: 'Aromatic ring (benzene)', formula: 'C₆H₆', priority: 'medium', example: 'Toluene (CH₃-C₆H₅)', behavior: 'Resonance-stabilized; aromatic stability.' },
      { name: 'Halide', formula: 'R-X (X = F, Cl, Br, I)', priority: 'medium', example: 'Chloroform (CHCl₃)', behavior: 'Substitution + elimination reactions.' },
      { name: 'Alcohol', formula: 'R-OH', priority: 'high', example: 'Ethanol (CH₃CH₂OH)', behavior: 'Polar; H-bonding; can oxidize.' },
      { name: 'Ether', formula: 'R-O-R\'', priority: 'low', example: 'Diethyl ether ((CH₃CH₂)₂O)', behavior: 'Relatively unreactive; common solvent.' },
      { name: 'Aldehyde', formula: 'R-CHO', priority: 'high', example: 'Formaldehyde (HCHO)', behavior: 'Polar; reactive; oxidizes to carboxylic acid.' },
      { name: 'Ketone', formula: 'R-CO-R\'', priority: 'high', example: 'Acetone ((CH₃)₂CO)', behavior: 'Polar; reactive.' },
      { name: 'Carboxylic acid', formula: 'R-COOH', priority: 'high', example: 'Acetic acid (CH₃COOH)', behavior: 'Weak acid; H-bonding; very polar.' },
      { name: 'Ester', formula: 'R-COO-R\'', priority: 'medium', example: 'Ethyl acetate (CH₃COOC₂H₅)', behavior: 'Polar; common flavors + fragrances.' },
      { name: 'Amide', formula: 'R-CONH₂', priority: 'high', example: 'Acetamide (CH₃CONH₂)', behavior: 'H-bonding; very polar; protein backbone.' },
      { name: 'Amine', formula: 'R-NH₂ (primary)', priority: 'high', example: 'Methylamine (CH₃NH₂)', behavior: 'Weak base; H-bonding.' },
      { name: 'Nitrile', formula: 'R-C≡N', priority: 'medium', example: 'Acetonitrile (CH₃CN)', behavior: 'Polar; high boiling.' },
      { name: 'Thiol', formula: 'R-SH', priority: 'medium', example: 'Methanethiol (CH₃SH)', behavior: 'Distinctive smell; oxidizes to disulfide.' },
      { name: 'Phenol', formula: 'C₆H₅-OH', priority: 'high', example: 'Phenol (C₆H₅OH)', behavior: 'More acidic than alcohol; antimicrobial.' },
      { name: 'Anhydride', formula: 'R-CO-O-CO-R\'', priority: 'medium', example: 'Acetic anhydride', behavior: 'Reactive acylating agent.' },
      { name: 'Acid halide', formula: 'R-COCl', priority: 'high', example: 'Acetyl chloride (CH₃COCl)', behavior: 'Very reactive acylating agent.' }
    ],
    namingRules: [
      'Find longest carbon chain — parent name (meth-1, eth-2, prop-3, but-4, pent-5, hex-6, hept-7, oct-8, non-9, dec-10).',
      'Identify highest-priority functional group — suffix.',
      'Number chain to give lowest locants to functional group + substituents.',
      'Name + number substituents alphabetically.',
      'Use multiplying prefixes (di-, tri-, tetra-) for repeats.',
      'Stereodescriptors: cis/trans, E/Z, R/S as needed.'
    ],
    reactions: [
      { type: 'Substitution', mechanism: 'SN1, SN2, EAS', example: 'CH3Cl + OH- → CH3OH + Cl-' },
      { type: 'Elimination', mechanism: 'E1, E2', example: 'CH3CH2Br + base → CH2=CH2 + Br- + HB' },
      { type: 'Addition', mechanism: 'Electrophilic, nucleophilic, free radical', example: 'CH2=CH2 + Br2 → CH2BrCH2Br' },
      { type: 'Esterification', mechanism: 'Acid-catalyzed', example: 'R-COOH + R\'-OH ⇌ R-COO-R\' + H2O' },
      { type: 'Hydrolysis', mechanism: 'Acid/base catalyzed', example: 'R-COO-R\' + H2O → R-COOH + R\'-OH' },
      { type: 'Oxidation', mechanism: 'Loss of e- / gain O / loss of H', example: 'Primary alcohol → aldehyde → carboxylic acid' },
      { type: 'Reduction', mechanism: 'Gain of e- / gain H / loss of O', example: 'Aldehyde → primary alcohol' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // BIOCHEMISTRY — life chemistry
  // ═══════════════════════════════════════════════════════════
  var BIOCHEM = {
    intro: 'Biochemistry is the chemistry of life. Proteins, DNA, sugars, lipids — the molecules of biology.',
    macromolecules: [
      { type: 'Proteins', monomer: 'Amino acid (20 types)', bond: 'Peptide bond (-CO-NH-)', function: 'Enzymes, structure, transport, signaling, hormones', example: 'Hemoglobin, collagen, antibodies' },
      { type: 'Nucleic acids', monomer: 'Nucleotide (base + sugar + phosphate)', bond: 'Phosphodiester', function: 'Genetic information + protein synthesis', example: 'DNA (deoxyribose), RNA (ribose)' },
      { type: 'Carbohydrates', monomer: 'Monosaccharide (glucose, fructose, galactose)', bond: 'Glycosidic', function: 'Energy + structure', example: 'Glucose, sucrose, starch, cellulose, glycogen' },
      { type: 'Lipids', monomer: 'Variable (glycerol + 3 fatty acids for fats)', bond: 'Ester (fats)', function: 'Energy storage, membranes, signaling', example: 'Triglycerides, phospholipids, steroids, cholesterol' }
    ],
    aminoAcids: [
      { name: 'Glycine', code: 'G/Gly', side: 'H', polar: 'No', charged: 'No' },
      { name: 'Alanine', code: 'A/Ala', side: 'CH₃', polar: 'No', charged: 'No' },
      { name: 'Valine', code: 'V/Val', side: 'CH(CH₃)₂', polar: 'No', charged: 'No' },
      { name: 'Leucine', code: 'L/Leu', side: 'CH₂CH(CH₃)₂', polar: 'No', charged: 'No' },
      { name: 'Isoleucine', code: 'I/Ile', side: 'CH(CH₃)C₂H₅', polar: 'No', charged: 'No' },
      { name: 'Proline', code: 'P/Pro', side: 'Cyclic', polar: 'No', charged: 'No' },
      { name: 'Phenylalanine', code: 'F/Phe', side: 'CH₂C₆H₅', polar: 'No', charged: 'No' },
      { name: 'Tryptophan', code: 'W/Trp', side: 'Indole', polar: 'No', charged: 'No' },
      { name: 'Methionine', code: 'M/Met', side: 'CH₂CH₂SCH₃', polar: 'No', charged: 'No' },
      { name: 'Serine', code: 'S/Ser', side: 'CH₂OH', polar: 'Yes', charged: 'No' },
      { name: 'Threonine', code: 'T/Thr', side: 'CH(OH)CH₃', polar: 'Yes', charged: 'No' },
      { name: 'Cysteine', code: 'C/Cys', side: 'CH₂SH', polar: 'Yes', charged: 'No' },
      { name: 'Tyrosine', code: 'Y/Tyr', side: 'CH₂C₆H₄OH', polar: 'Yes', charged: 'No' },
      { name: 'Asparagine', code: 'N/Asn', side: 'CH₂CONH₂', polar: 'Yes', charged: 'No' },
      { name: 'Glutamine', code: 'Q/Gln', side: 'CH₂CH₂CONH₂', polar: 'Yes', charged: 'No' },
      { name: 'Lysine', code: 'K/Lys', side: '(CH₂)₄NH₃+', polar: 'Yes', charged: '+' },
      { name: 'Arginine', code: 'R/Arg', side: '(CH₂)₃NHC(NH₂)₂+', polar: 'Yes', charged: '+' },
      { name: 'Histidine', code: 'H/His', side: 'CH₂-imidazole', polar: 'Yes', charged: '+ (pH dep.)' },
      { name: 'Aspartate', code: 'D/Asp', side: 'CH₂COO-', polar: 'Yes', charged: '-' },
      { name: 'Glutamate', code: 'E/Glu', side: 'CH₂CH₂COO-', polar: 'Yes', charged: '-' }
    ],
    dna: 'DNA = double helix of antiparallel strands. Bases: A pairs T (2 H-bonds), G pairs C (3 H-bonds). Sugar = deoxyribose. Phosphate backbone.',
    rna: 'RNA = single strand. Same bases except U replaces T. Sugar = ribose. Three types: mRNA, tRNA, rRNA + microRNAs.',
    centralDogma: 'DNA → RNA → Protein. Transcription + translation.',
    metabolism: [
      { pathway: 'Glycolysis', input: 'Glucose', output: '2 pyruvate + 2 ATP + 2 NADH', location: 'Cytoplasm' },
      { pathway: 'Krebs cycle (TCA)', input: 'Pyruvate → Acetyl-CoA', output: '6 NADH + 2 FADH2 + 2 ATP + 6 CO2 per glucose', location: 'Mitochondria' },
      { pathway: 'Electron transport chain', input: 'NADH + FADH2 + O2', output: '~32-34 ATP + H2O', location: 'Mitochondrial inner membrane' },
      { pathway: 'Beta-oxidation', input: 'Fatty acids', output: 'Acetyl-CoA + NADH + FADH2', location: 'Mitochondrial matrix' },
      { pathway: 'Calvin cycle (photosynthesis)', input: 'CO2 + ATP + NADPH', output: 'Glucose', location: 'Chloroplast stroma' },
      { pathway: 'Pentose phosphate', input: 'Glucose-6-P', output: 'NADPH + ribose-5-P', location: 'Cytoplasm' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════
  // THERMODYNAMICS
  // ═══════════════════════════════════════════════════════════
  var THERMO = {
    intro: 'Thermodynamics: study of energy + heat in chemical reactions. The 4 Laws of Thermodynamics govern everything.',
    laws: [
      { number: 0, name: 'Zeroth Law', statement: 'If A is in thermal equilibrium with B, and B with C, then A is with C. Defines temperature.', implication: 'Temperature is a meaningful, transferable quantity.' },
      { number: 1, name: 'First Law (Conservation of Energy)', statement: 'Energy cannot be created or destroyed. ΔU = q + w.', implication: 'Internal energy change = heat added + work done on system.' },
      { number: 2, name: 'Second Law (Entropy)', statement: 'Entropy of an isolated system always increases over time. Heat flows hot to cold.', implication: 'Drives spontaneity. Refrigerators work because they put heat OUT, not in.' },
      { number: 3, name: 'Third Law', statement: 'Entropy of pure crystalline substance at 0 K = 0.', implication: 'Absolute entropy is measurable. Cannot reach 0 K.' }
    ],
    concepts: [
      { name: 'Enthalpy (H)', def: 'Heat content at constant pressure. ΔH = q at constant P.', sign: 'ΔH < 0: exothermic. ΔH > 0: endothermic.' },
      { name: 'Entropy (S)', def: 'Measure of disorder/randomness.', sign: 'ΔS > 0: more disorder.' },
      { name: 'Gibbs Free Energy (G)', def: 'Available energy for useful work. ΔG = ΔH - TΔS.', sign: 'ΔG < 0: spontaneous. ΔG > 0: non-spontaneous.' },
      { name: 'Internal Energy (U)', def: 'Total kinetic + potential energy of all molecules.', sign: 'State function.' },
      { name: 'Heat capacity (C)', def: 'Energy needed to raise T by 1°C. C = q/ΔT.', sign: 'Always positive.' },
      { name: 'Specific heat (c)', def: 'Heat capacity per gram. c = q/(m·ΔT).', sign: 'Water has high c (4.18 J/g·°C).' },
      { name: 'Hess\'s Law', def: 'Enthalpy is state function. ΔH = sum of steps.', sign: 'Useful for indirect ΔH calculations.' },
      { name: 'Standard state', def: '25°C, 1 atm, 1 M for solutions, 1 atm for gases.', sign: 'Denoted by superscript °.' }
    ],
    examples: [
      { reaction: 'C + O2 → CO2', H: '-393.5 kJ/mol', G: '-394.4 kJ/mol', spontaneous: 'Yes (very)' },
      { reaction: '2H2 + O2 → 2H2O', H: '-571.6 kJ/mol', G: '-474.4 kJ/mol', spontaneous: 'Yes (very)' },
      { reaction: 'N2 + 3H2 → 2NH3', H: '-92.4 kJ/mol', G: '-32.8 kJ/mol', spontaneous: 'Yes (slightly)' },
      { reaction: 'CaCO3 → CaO + CO2', H: '+178 kJ/mol', G: '+130 kJ/mol', spontaneous: 'No at room T, yes at high T' },
      { reaction: 'H2O(l) → H2O(g)', H: '+44 kJ/mol', G: '+0 kJ/mol at 100°C', spontaneous: 'At boiling point' },
      { reaction: 'Ice → Water', H: '+6 kJ/mol', G: '+0 kJ/mol at 0°C', spontaneous: 'At melting point' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // KINETICS — reaction rates
  // ═══════════════════════════════════════════════════════════
  var KINETICS = {
    intro: 'Kinetics: how fast reactions occur. Driven by collisions + activation energy.',
    factors: [
      { factor: 'Concentration', effect: 'Higher concentration = more collisions = faster rate.' },
      { factor: 'Temperature', effect: 'Higher T = more KE = more successful collisions. Rule of thumb: each 10°C increase doubles rate.' },
      { factor: 'Surface area', effect: 'More exposed area = more reaction sites. Powdered solids react faster than chunks.' },
      { factor: 'Catalyst', effect: 'Lowers activation energy. Increases rate without being consumed.' },
      { factor: 'Pressure (gases)', effect: 'Higher P = more concentrated = faster.' },
      { factor: 'Light (for photochemical)', effect: 'Provides activation energy directly. Ozone formation, photosynthesis.' }
    ],
    rateLaws: [
      { type: 'Zero-order', equation: 'Rate = k', integrated: '[A] = [A]0 - kt', halfLife: 't1/2 = [A]0/(2k)', linear: '[A] vs t' },
      { type: 'First-order', equation: 'Rate = k[A]', integrated: 'ln[A] = ln[A]0 - kt', halfLife: 't1/2 = 0.693/k', linear: 'ln[A] vs t' },
      { type: 'Second-order (one reactant)', equation: 'Rate = k[A]²', integrated: '1/[A] = 1/[A]0 + kt', halfLife: 't1/2 = 1/(k[A]0)', linear: '1/[A] vs t' },
      { type: 'Second-order (two reactants)', equation: 'Rate = k[A][B]', integrated: 'Complex', halfLife: 'Depends on initial ratio', linear: 'Variable' }
    ],
    arrhenius: 'k = A · e^(-Ea/RT). Plot ln k vs 1/T gives slope = -Ea/R.',
    mechanisms: [
      { type: 'Elementary step', desc: 'Single reaction step. Rate law from stoichiometry.' },
      { type: 'Rate-determining step', desc: 'Slowest step. Determines overall rate.' },
      { type: 'Intermediate', desc: 'Formed + consumed during reaction. Does not appear in overall equation.' },
      { type: 'Catalyst', desc: 'Lowers Ea. Same at start + end. Heterogeneous (different phase) or homogeneous (same phase).' }
    ],
    examples: [
      { reaction: '2H2O2 → 2H2O + O2', order: 'First-order in H2O2', k: '~10⁻⁷ s⁻¹ without catalyst; ~100 s⁻¹ with MnO2', note: 'Catalysis makes huge difference.' },
      { reaction: 'N2O5 → 2NO2 + 1/2 O2', order: 'First-order in N2O5', k: 'Varies with T', note: 'Classic kinetics example.' },
      { reaction: 'CO + NO2 → CO2 + NO', order: 'Second-order', k: 'Varies', note: 'Two-step mechanism.' },
      { reaction: 'Iodine clock reaction', order: 'Mixed', k: 'Configurable', note: 'Classroom demo of kinetics.' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // EQUILIBRIUM
  // ═══════════════════════════════════════════════════════════
  var EQUILIBRIUM = {
    intro: 'Chemical equilibrium: forward + reverse reactions occur at equal rates. Net change zero, but reactions continue.',
    concepts: [
      { name: 'Equilibrium constant Keq', def: 'Keq = [products]/[reactants] at equilibrium. Each raised to coefficient.', interpret: 'Keq >> 1: products favored. Keq << 1: reactants favored.' },
      { name: 'Reaction quotient Q', def: 'Same formula as Keq but at any time, not necessarily equilibrium.', interpret: 'Q < Keq: forward. Q > Keq: reverse. Q = Keq: equilibrium.' },
      { name: 'Le Chatelier\'s Principle', def: 'System at equilibrium responds to disturbance by shifting to oppose.', interpret: 'Add reactant: shift forward. Remove product: shift forward. Increase T (exothermic): shift back.' },
      { name: 'Ksp (solubility product)', def: 'Keq for sparingly-soluble salt dissolving.', interpret: 'Determines maximum dissolved concentration.' },
      { name: 'Common-ion effect', def: 'Adding ion already in equilibrium shifts away from that ion.', interpret: 'Less of the sparingly-soluble salt will dissolve in presence of common ion.' },
      { name: 'Le Chatelier — Pressure', def: 'Increase P: shifts to fewer moles of gas.', interpret: 'For N2 + 3H2 ⇌ 2NH3, increasing P shifts forward (4 → 2 moles).' }
    ],
    examples: [
      { reaction: 'N2(g) + 3H2(g) ⇌ 2NH3(g)', Keq: '~10⁻⁵ at 25°C, 0.5 at 400°C', notes: 'Haber-Bosch. Operates at high T + P despite endothermic shift.' },
      { reaction: 'H2O(l) ⇌ H+(aq) + OH-(aq)', Keq: '1×10⁻¹⁴ (Kw)', notes: 'Defines pH scale.' },
      { reaction: 'CO2(g) + H2(g) ⇌ CO(g) + H2O(g)', Keq: 'Variable', notes: 'Water-gas shift reaction. Industrial H2 production.' },
      { reaction: 'AgCl(s) ⇌ Ag+ + Cl-', Keq: '1.8×10⁻¹⁰ (Ksp)', notes: 'Very insoluble. Precipitates easily.' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // GAS LAWS
  // ═══════════════════════════════════════════════════════════
  var GAS_LAWS = {
    intro: 'Gas behavior is governed by simple laws relating pressure, volume, temperature, and moles.',
    laws: [
      { name: 'Boyle\'s Law', equation: 'P1V1 = P2V2 (T, n constant)', desc: 'Pressure × Volume = constant at constant T. Inverse relationship.', who: 'Robert Boyle (1662)' },
      { name: 'Charles\'s Law', equation: 'V1/T1 = V2/T2 (P, n constant)', desc: 'Volume proportional to T (Kelvin). At absolute zero, V → 0.', who: 'Jacques Charles (1787)' },
      { name: 'Gay-Lussac\'s Law', equation: 'P1/T1 = P2/T2 (V, n constant)', desc: 'Pressure proportional to T at constant V.', who: 'Gay-Lussac (1808)' },
      { name: 'Avogadro\'s Law', equation: 'V1/n1 = V2/n2 (T, P constant)', desc: 'Volume proportional to moles. Equal volumes have equal moles at same T + P.', who: 'Amedeo Avogadro (1811)' },
      { name: 'Combined Gas Law', equation: 'P1V1/T1 = P2V2/T2', desc: 'Combines Boyle, Charles, Gay-Lussac for n constant.', who: 'Derived' },
      { name: 'Ideal Gas Law', equation: 'PV = nRT', desc: 'Combines all gas laws. R = 0.0821 L·atm/(mol·K) or 8.314 J/(mol·K).', who: 'Émile Clapeyron (1834)' }
    ],
    constants: [
      { name: 'R (L·atm)', value: '0.0821 L·atm/(mol·K)' },
      { name: 'R (J)', value: '8.314 J/(mol·K)' },
      { name: 'R (cal)', value: '1.987 cal/(mol·K)' },
      { name: 'Molar volume (STP)', value: '22.4 L/mol at 0°C, 1 atm' },
      { name: 'STP (older)', value: '0°C (273.15 K), 1 atm' },
      { name: 'STP (newer IUPAC 1982)', value: '0°C, 100 kPa (1 bar) — gives 22.7 L/mol' }
    ],
    kineticTheory: [
      'Gases are mostly empty space.',
      'Molecules in constant random motion.',
      'Collisions are perfectly elastic.',
      'Pressure = collisions with container walls.',
      'Average KE proportional to absolute temperature.',
      'No intermolecular forces (ideal gas assumption).'
    ],
    deviations: 'Real gases deviate at high pressure (molecules close, IMF matter) + low T (KE low, IMF significant). Van der Waals equation: (P + a/V²)(V - b) = nRT corrects for these.'
  };

  // ═══════════════════════════════════════════════════════════
  // SOLUTIONS
  // ═══════════════════════════════════════════════════════════
  var SOLUTIONS = {
    intro: 'Solutions: homogeneous mixtures. Solute dissolves in solvent. Drives much of chemistry.',
    concentration: [
      { unit: 'Molarity (M)', def: 'Moles solute / liter of solution', formula: 'M = mol/L', useFor: 'Most common in chemistry' },
      { unit: 'Molality (m)', def: 'Moles solute / kg of solvent', formula: 'm = mol/kg', useFor: 'Temperature-independent (kg doesn\'t change with T)' },
      { unit: 'Mass percent', def: 'Mass solute / mass solution × 100%', formula: 'wt% = m_solute/m_solution × 100', useFor: 'Everyday measurements' },
      { unit: 'Mole fraction', def: 'Moles solute / total moles', formula: 'x = n_A/n_total', useFor: 'Vapor pressure calculations' },
      { unit: 'ppm', def: 'Parts per million', formula: 'mg/L (in water)', useFor: 'Very dilute solutions' },
      { unit: 'ppb', def: 'Parts per billion', formula: 'μg/L', useFor: 'Trace contaminants' }
    ],
    solubilityRules: [
      'All nitrates (NO3⁻) soluble.',
      'All Group 1 (Li⁺, Na⁺, K⁺...) + NH4⁺ salts soluble.',
      'Most chlorides (Cl⁻), bromides (Br⁻), iodides (I⁻) soluble. EXCEPT Ag⁺, Pb²⁺, Hg₂²⁺.',
      'Most sulfates (SO4²⁻) soluble. EXCEPT Ag⁺, Pb²⁺, Ba²⁺, Ca²⁺, Hg₂²⁺.',
      'Most carbonates (CO3²⁻), phosphates (PO4³⁻), sulfides (S²⁻) INSOLUBLE except Group 1 + NH4⁺.',
      'Most hydroxides (OH⁻) INSOLUBLE except Group 1, Sr²⁺, Ba²⁺, Ca²⁺ (slightly).'
    ],
    colligative: [
      { property: 'Vapor pressure lowering', law: 'Raoult\'s Law: P_solution = x_solvent · P°_solvent', formula: 'ΔP = -x_solute · P°' },
      { property: 'Boiling point elevation', law: 'ΔTb = Kb · m · i', formula: 'i = vant Hoff factor (ions per formula unit)' },
      { property: 'Freezing point depression', law: 'ΔTf = Kf · m · i', formula: 'Salt on roads, antifreeze in cars' },
      { property: 'Osmotic pressure', law: 'π = M · R · T · i', formula: 'Drives water across membranes' }
    ],
    factors: [
      'Like dissolves like (polar + polar, nonpolar + nonpolar).',
      'Temperature: usually increases solubility for solids; decreases for gases.',
      'Pressure: significant for gases (Henry\'s Law); negligible for solids/liquids.',
      'Particle size: smaller = faster dissolving.',
      'Stirring: speeds dissolution.'
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // NUCLEAR CHEMISTRY
  // ═══════════════════════════════════════════════════════════
  var NUCLEAR = {
    intro: 'Nuclear chemistry: chemistry of atomic nuclei. Includes radioactivity, nuclear medicine, fission, fusion.',
    radioactivity: [
      { type: 'Alpha (α)', particle: 'He-4 nucleus (2p + 2n)', charge: '+2', penetration: 'Stopped by paper', danger: 'Internal exposure dangerous (alpha-emitters ingested or inhaled).', examples: 'U-238, Pu-239, Am-241 (smoke detectors)' },
      { type: 'Beta (β-)', particle: 'High-energy electron', charge: '-1', penetration: 'Stopped by aluminum', danger: 'Skin burns on exposure.', examples: 'C-14, Sr-90, I-131' },
      { type: 'Positron (β+)', particle: 'Anti-electron (e+)', charge: '+1', penetration: 'Annihilates with electron, producing two 511 keV gammas', danger: 'Indirect via gamma.', examples: 'F-18 (PET scans), Na-22' },
      { type: 'Gamma (γ)', particle: 'High-energy photon (EM)', charge: '0', penetration: 'Needs lead or thick concrete', danger: 'Whole-body exposure dangerous.', examples: 'Co-60, Cs-137' },
      { type: 'Neutron emission', particle: 'Free neutron', charge: '0', penetration: 'Hydrogen-rich material absorbs (water, polyethylene)', danger: 'Activates other materials.', examples: 'Cf-252 (industrial sources)' }
    ],
    halfLives: [
      { isotope: 'C-14', halflife: '5,730 years', use: 'Radiocarbon dating up to ~50,000 years' },
      { isotope: 'U-238', halflife: '4.5 billion years', use: 'Geological dating, weapons (depleted)' },
      { isotope: 'U-235', halflife: '704 million years', use: 'Nuclear reactor fuel, weapons' },
      { isotope: 'Pu-239', halflife: '24,100 years', use: 'Nuclear weapons, breeder reactor fuel' },
      { isotope: 'I-131', halflife: '8 days', use: 'Thyroid cancer treatment + imaging' },
      { isotope: 'Tc-99m', halflife: '6 hours', use: 'Most-used medical imaging isotope' },
      { isotope: 'Sr-90', halflife: '29 years', use: 'Bone tumor treatment + space craft power' },
      { isotope: 'Cs-137', halflife: '30 years', use: 'Medical irradiation + Chernobyl contaminant' },
      { isotope: 'K-40', halflife: '1.25 billion years', use: 'Natural radioactivity (in bananas)' }
    ],
    fission: 'Nuclear fission: heavy nucleus splits, releasing energy + neutrons. U-235 + n → Ba-141 + Kr-92 + 3n + 200 MeV. Basis of nuclear power + atomic weapons.',
    fusion: 'Nuclear fusion: light nuclei combine. 2H + 3H → 4He + n + 17.6 MeV. Powers stars + H-bomb. Not yet commercially achieved.',
    medical: [
      { use: 'X-ray imaging', isotope: 'External X-rays', desc: 'Bone fracture diagnosis' },
      { use: 'CT scan', isotope: 'External X-rays', desc: 'Detailed cross-section images' },
      { use: 'PET scan', isotope: 'F-18 in glucose', desc: 'Cancer detection by glucose uptake' },
      { use: 'Thyroid imaging', isotope: 'I-123 (diagnostic) or I-131 (treatment)', desc: 'Thyroid function + cancer' },
      { use: 'Bone scan', isotope: 'Tc-99m', desc: 'Detect cancer metastases in bones' },
      { use: 'Radiotherapy', isotope: 'External Co-60 or linear accelerator', desc: 'Cancer treatment' },
      { use: 'Iodine therapy', isotope: 'I-131', desc: 'Thyroid cancer ablation' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // ENVIRONMENTAL CHEMISTRY
  // ═══════════════════════════════════════════════════════════
  var ENV_CHEM = {
    intro: 'Environmental chemistry: how chemistry shapes (and damages, and heals) our planet.',
    topics: [
      { topic: 'Climate Change', mechanism: 'CO2 + CH4 + N2O trap infrared radiation in atmosphere. Greenhouse effect.', current: 'CO2 at 420+ ppm in 2024, up from 280 ppm pre-industrial.', solutions: 'Renewable energy, carbon capture, reforestation.' },
      { topic: 'Ozone Layer', mechanism: 'O3 in stratosphere absorbs UV. CFCs catalytically destroy: Cl + O3 → ClO + O2; ClO + O → Cl + O2.', current: 'Recovering since Montreal Protocol (1987) phased out CFCs.', solutions: 'Continued enforcement, alternative refrigerants.' },
      { topic: 'Acid Rain', mechanism: 'SO2 + H2O → H2SO3; SO3 + H2O → H2SO4. NO2 + H2O → HNO3. Lowers rain pH to 4-5.', current: 'Reduced in N. America since 1990 Clean Air Act amendments.', solutions: 'Scrubbers on coal plants. EV cars reduce NOx.' },
      { topic: 'Plastic Pollution', mechanism: 'Petroleum-derived polymers persist in environment for centuries.', current: '~8 million tons ocean plastic/year. Microplastics in everything.', solutions: 'Recycling, bioplastics, reduce single-use.' },
      { topic: 'Heavy Metal Contamination', mechanism: 'Pb, Hg, Cd, As bioaccumulate in food chain.', current: 'Pb in old water pipes; Hg in fish from coal-burning.', solutions: 'Lead pipe replacement, Hg emission controls.' },
      { topic: 'Eutrophication', mechanism: 'Excess N + P from fertilizer runoff cause algae blooms. Algae die + decompose, consuming O2. Fish kill.', current: 'Gulf of Mexico dead zone ~7,000 km².', solutions: 'Reduce fertilizer runoff. Restore wetlands.' },
      { topic: 'Air Pollution', mechanism: 'Particulate matter (PM2.5), NOx, SOx, VOCs, ozone.', current: 'WHO estimates 4M+ deaths/year from air pollution.', solutions: 'Cleaner energy, electric vehicles, regulation.' },
      { topic: 'Pesticide Persistence', mechanism: 'DDT, atrazine, neonicotinoids accumulate in food chain.', current: 'DDT banned in US 1972 but still in food chain.', solutions: 'Integrated pest management. Restricted chemical lists.' },
      { topic: 'Water Pollution', mechanism: 'Industrial waste, sewage, agricultural runoff contaminate water.', current: 'Flint water crisis (Pb). PFAS forever chemicals widespread.', solutions: 'Drinking water standards, wastewater treatment.' }
    ],
    greenChemistry: [
      'Prevent waste rather than treat',
      'Atom economy: design for maximum yield',
      'Less hazardous synthesis',
      'Design safer chemicals',
      'Safer solvents + reaction conditions',
      'Energy efficiency',
      'Renewable feedstocks',
      'Reduce derivatives',
      'Catalysis (vs stoichiometric reagents)',
      'Design for degradation',
      'Real-time analysis for pollution prevention',
      'Inherently safer chemistry'
    ],
    examples: [
      { name: 'Ibuprofen synthesis (BHC)', traditional: '6-step, low atom economy', green: '3-step, high atom economy', impact: 'Used at scale, drastic waste reduction.' },
      { name: 'Polylactic acid (PLA)', material: 'Bioplastic from corn starch', impact: 'Compostable; replaces some petroleum plastics.' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // PHARMACEUTICAL CHEMISTRY
  // ═══════════════════════════════════════════════════════════
  var PHARMA = {
    intro: 'Pharmaceutical chemistry: design + synthesis + production of drugs.',
    process: [
      { stage: 'Target identification', desc: 'Identify disease-relevant protein or pathway.', time: '1-2 years' },
      { stage: 'Hit identification', desc: 'Screen molecules for activity (high-throughput screening, structure-based design).', time: '1-2 years' },
      { stage: 'Lead optimization', desc: 'Improve potency, selectivity, ADME properties.', time: '2-4 years' },
      { stage: 'Preclinical testing', desc: 'Animal studies for safety + efficacy + pharmacokinetics.', time: '2-4 years' },
      { stage: 'Phase I trials', desc: '20-100 healthy volunteers. Safety + tolerability.', time: '1-2 years' },
      { stage: 'Phase II trials', desc: '100-500 patients. Effectiveness + dosage.', time: '2-3 years' },
      { stage: 'Phase III trials', desc: '1000-10000 patients. Compared to existing treatments.', time: '3-5 years' },
      { stage: 'FDA approval', desc: 'NDA submission, FDA review, label negotiation.', time: '1-2 years' },
      { stage: 'Phase IV post-market', desc: 'Continued monitoring after approval.', time: 'Indefinite' }
    ],
    famousDrugs: [
      { name: 'Aspirin', chemical: 'Acetylsalicylic acid', target: 'COX-1/COX-2', mechanism: 'Inhibits prostaglandin synthesis', invented: '1899 (Bayer)', notes: 'Used for pain, fever, cardiovascular protection.' },
      { name: 'Penicillin', chemical: 'β-lactam antibiotic', target: 'Bacterial cell wall', mechanism: 'Inhibits peptidoglycan crosslinking', invented: '1928 (Fleming)', notes: 'First antibiotic. Revolutionized medicine.' },
      { name: 'Insulin', chemical: 'Peptide hormone', target: 'Insulin receptor', mechanism: 'Stimulates glucose uptake', invented: '1922 (Banting/Best)', notes: 'Saved millions of diabetics.' },
      { name: 'AZT (zidovudine)', chemical: 'Nucleoside analog', target: 'HIV reverse transcriptase', mechanism: 'Chain termination of viral DNA', invented: '1987', notes: 'First HIV drug.' },
      { name: 'Imatinib (Gleevec)', chemical: 'Kinase inhibitor', target: 'BCR-ABL fusion protein', mechanism: 'Targets cancer-causing kinase', invented: '2001', notes: 'Revolutionary leukemia treatment.' },
      { name: 'Sildenafil (Viagra)', chemical: 'PDE5 inhibitor', target: 'cGMP phosphodiesterase', mechanism: 'Vasodilation', invented: '1998', notes: 'Original use: hypertension; serendipitous repurpose.' },
      { name: 'Acyclovir', chemical: 'Nucleoside analog', target: 'Herpes thymidine kinase', mechanism: 'Selectively inhibits viral DNA synthesis', invented: 'Gertrude Elion (1977)', notes: 'First selective antiviral.' },
      { name: 'mRNA COVID vaccines', chemical: 'Lipid nanoparticles + modified mRNA', target: 'Spike protein', mechanism: 'Cell makes spike, immune system trained', invented: '2020', notes: 'Pfizer/BioNTech + Moderna. Saved millions of lives.' }
    ],
    drugClasses: [
      { class: 'NSAIDs', examples: 'Aspirin, ibuprofen, naproxen', use: 'Pain + inflammation', mechanism: 'COX inhibition' },
      { class: 'Antibiotics', examples: 'Penicillin, vancomycin, ciprofloxacin', use: 'Bacterial infections', mechanism: 'Various — cell wall, ribosomes, DNA' },
      { class: 'Antidepressants (SSRIs)', examples: 'Fluoxetine, sertraline, escitalopram', use: 'Depression, anxiety', mechanism: 'Block serotonin reuptake' },
      { class: 'Beta-blockers', examples: 'Atenolol, metoprolol, propranolol', use: 'Heart conditions, anxiety', mechanism: 'Block β-adrenergic receptors' },
      { class: 'ACE inhibitors', examples: 'Lisinopril, captopril, enalapril', use: 'Blood pressure', mechanism: 'Inhibit angiotensin converting enzyme' },
      { class: 'Statins', examples: 'Atorvastatin, simvastatin, rosuvastatin', use: 'Cholesterol', mechanism: 'HMG-CoA reductase inhibition' },
      { class: 'Opioids', examples: 'Morphine, oxycodone, fentanyl', use: 'Severe pain', mechanism: 'μ-opioid receptor activation' },
      { class: 'Antihistamines', examples: 'Diphenhydramine, loratadine', use: 'Allergies', mechanism: 'H1 receptor antagonism' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // MATERIALS SCIENCE
  // ═══════════════════════════════════════════════════════════
  var MATERIALS = {
    intro: 'Materials science: properties + processing + applications of substances. Bridges chemistry + engineering.',
    classes: [
      { class: 'Metals + Alloys', properties: 'High electrical + thermal conductivity. Ductile + malleable. Metallic bonding.', examples: 'Steel, aluminum, copper, titanium, brass, bronze, stainless steel', uses: 'Structures, electronics, transportation, tools' },
      { class: 'Ceramics', properties: 'Hard, brittle, high melting point, electrical insulators. Ionic + covalent bonding.', examples: 'Pottery, china, glass, alumina, zirconia, silicon carbide', uses: 'Refractories, cutting tools, electronics substrates, medical implants' },
      { class: 'Polymers', properties: 'Long-chain molecules. Variable properties from soft to rigid. Covalent bonding.', examples: 'Polyethylene, polystyrene, nylon, kevlar, rubber', uses: 'Packaging, fabrics, structural, biomedical' },
      { class: 'Composites', properties: 'Two materials combined for synergy. Strong + light.', examples: 'Fiberglass, carbon fiber, concrete (cement + aggregate), bone', uses: 'Aerospace, sports equipment, construction' },
      { class: 'Semiconductors', properties: 'Between conductor + insulator. Doped to control properties.', examples: 'Silicon, germanium, gallium arsenide', uses: 'Microchips, solar cells, LEDs' },
      { class: 'Glass', properties: 'Amorphous solid. Transparent. Brittle.', examples: 'Soda-lime, borosilicate (Pyrex), fused silica', uses: 'Windows, lab, optics, screens' },
      { class: 'Biomaterials', properties: 'Compatible with biological tissue.', examples: 'Titanium implants, hydroxyapatite, biodegradable polymers', uses: 'Medical implants, drug delivery, tissue engineering' },
      { class: 'Nanomaterials', properties: 'Properties at nano scale (1-100 nm) differ from bulk.', examples: 'Carbon nanotubes, graphene, quantum dots, fullerenes', uses: 'Electronics, medicine, energy, water purification' }
    ],
    polymers: [
      { type: 'Polyethylene (PE)', monomer: 'Ethylene', density: 'LDPE 0.92, HDPE 0.96 g/cm³', uses: 'Bags, bottles, pipes', amount: '~100M tons/year' },
      { type: 'Polypropylene (PP)', monomer: 'Propylene', density: '0.90 g/cm³', uses: 'Containers, fibers, films', amount: '~70M tons/year' },
      { type: 'PVC', monomer: 'Vinyl chloride', density: '1.4 g/cm³', uses: 'Pipes, electrical insulation, vinyl', amount: '~40M tons/year' },
      { type: 'Polystyrene (PS)', monomer: 'Styrene', density: '1.0 g/cm³', uses: 'Packaging foam, plastic cutlery', amount: '~25M tons/year' },
      { type: 'PET', monomer: 'Terephthalic acid + ethylene glycol', density: '1.4 g/cm³', uses: 'Soft drink bottles, polyester fibers', amount: '~70M tons/year' },
      { type: 'Nylon', monomer: 'Adipic acid + hexamethylenediamine', density: '1.15 g/cm³', uses: 'Fabric, ropes, ZIP ties', amount: '~5M tons/year' },
      { type: 'Kevlar', monomer: 'Aromatic polyamide', density: '1.44 g/cm³', uses: 'Bulletproof vests, tire reinforcement', amount: '~50K tons/year' },
      { type: 'Teflon (PTFE)', monomer: 'Tetrafluoroethylene', density: '2.2 g/cm³', uses: 'Non-stick coatings, lab equipment', amount: '~200K tons/year' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // FOOD CHEMISTRY
  // ═══════════════════════════════════════════════════════════
  var FOOD_CHEM = {
    intro: 'Food chemistry: reactions + properties of food. From cooking to nutrition to flavor.',
    reactions: [
      { name: 'Maillard Reaction', what: 'Browning of sugars + amino acids at >140°C', examples: 'Bread crust, seared meat, coffee, beer', controlled: 'Higher T + lower water + sugar/amino acid present' },
      { name: 'Caramelization', what: 'Sugars browning at high temp without proteins', examples: 'Caramel, dulce de leche', controlled: 'Pure sugar at >160°C' },
      { name: 'Fermentation', what: 'Yeast/bacteria convert sugars to ethanol or acids', examples: 'Bread (CO2), wine (ethanol), yogurt (lactic acid), pickles', controlled: 'Yeast/bacteria + sugar + time' },
      { name: 'Enzymatic browning', what: 'Polyphenol oxidase + O2 on cut fruit', examples: 'Apple, banana, avocado browning', controlled: 'Lemon juice (acid), salt water, cooking (denatures enzyme)' },
      { name: 'Denaturation', what: 'Proteins unfold from heat/pH/etc', examples: 'Cooking egg, curdling milk, gluten development', controlled: 'Time + temperature' },
      { name: 'Emulsification', what: 'Mixing oil + water with emulsifier', examples: 'Mayonnaise, hollandaise, salad dressing', controlled: 'Egg yolk (lecithin), mustard, etc.' },
      { name: 'Gelation', what: 'Macromolecules forming network with water', examples: 'Jello (gelatin), pectin in jam, agar', controlled: 'Specific concentration + cooling' },
      { name: 'Starch gelatinization', what: 'Starch absorbs water + swells at 60-75°C', examples: 'Thickening sauces, cooking rice', controlled: 'Water + heat + time' }
    ],
    additives: [
      { name: 'Preservatives', examples: 'Salt, sugar, sodium benzoate, sorbate, BHA, BHT', purpose: 'Prevent spoilage' },
      { name: 'Sweeteners', examples: 'Aspartame, sucralose, stevia, saccharin', purpose: 'Sweetness without sugar' },
      { name: 'Colorings', examples: 'Carmine, beet juice, FD&C Red #40, beta-carotene', purpose: 'Visual appeal' },
      { name: 'Flavor enhancers', examples: 'MSG (umami), salt, sugar', purpose: 'Boost taste' },
      { name: 'Thickeners', examples: 'Cornstarch, xanthan gum, guar gum, pectin', purpose: 'Texture' },
      { name: 'Emulsifiers', examples: 'Lecithin, mono/diglycerides', purpose: 'Mix oil + water' },
      { name: 'Stabilizers', examples: 'Carrageenan, agar, gelatin', purpose: 'Prevent separation' },
      { name: 'Antioxidants', examples: 'Vitamin C, vitamin E, BHA, BHT', purpose: 'Prevent oxidation/rancidity' }
    ],
    nutrition: [
      { nutrient: 'Carbohydrates', sources: 'Bread, pasta, fruits, vegetables', calories: '4 cal/g', function: 'Primary energy source' },
      { nutrient: 'Proteins', sources: 'Meat, fish, eggs, beans, dairy', calories: '4 cal/g', function: 'Build + repair tissue, enzymes' },
      { nutrient: 'Fats', sources: 'Oils, butter, nuts, dairy', calories: '9 cal/g', function: 'Long-term energy, cell membranes, vitamins' },
      { nutrient: 'Alcohol', sources: 'Beer, wine, spirits', calories: '7 cal/g', function: 'Recreation only — no nutritional value' },
      { nutrient: 'Vitamins', sources: 'Variable', calories: '0', function: 'Cofactors for enzymes' },
      { nutrient: 'Minerals', sources: 'Variable', calories: '0', function: 'Structural + cofactor' },
      { nutrient: 'Water', sources: 'Drinks + food', calories: '0', function: 'Solvent for all biochemistry' },
      { nutrient: 'Fiber', sources: 'Whole grains, beans, fruits, vegetables', calories: '0 (mostly)', function: 'Digestive health' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // FORENSIC CHEMISTRY
  // ═══════════════════════════════════════════════════════════
  var FORENSIC = {
    intro: 'Forensic chemistry: chemistry applied to legal investigations. DNA, drugs, ballistics, fingerprints.',
    techniques: [
      { name: 'DNA fingerprinting', what: 'PCR + STR analysis of restriction sites', accuracy: '1 in trillions match probability', uses: 'Identification, paternity, ancestry, cold cases' },
      { name: 'Mass spectrometry', what: 'Identify molecules by mass-to-charge', accuracy: 'Highly specific', uses: 'Drug detection, poisoning analysis, identification' },
      { name: 'Gas chromatography', what: 'Separates volatile compounds', accuracy: 'High', uses: 'Drug + arson analysis' },
      { name: 'Spectroscopy (IR/UV)', what: 'Molecular identification by absorption', accuracy: 'Moderate-high', uses: 'Unknown substance ID' },
      { name: 'Atomic absorption', what: 'Measures metals', accuracy: 'High', uses: 'Heavy metal poisoning, gunshot residue' },
      { name: 'Fingerprint analysis', what: 'Pattern recognition; chemical enhancement', accuracy: 'Variable', uses: 'Identification' },
      { name: 'Ballistics', what: 'Bullet trajectory + composition', accuracy: 'Highly specific match', uses: 'Linking bullet to gun' },
      { name: 'Toxicology', what: 'Drug screening, post-mortem', accuracy: 'High', uses: 'Cause of death, DUI testing' },
      { name: 'Marsh test (arsenic)', what: 'Classic arsenic detection', accuracy: 'High historically', uses: 'Poisoning investigations (since 1836)' },
      { name: 'Microscopy', what: 'Visual examination of trace evidence', accuracy: 'Variable', uses: 'Fibers, hair, paint analysis' }
    ],
    famousCases: [
      { case: 'Marie Lafarge (1840)', evidence: 'Marsh test confirmed arsenic in husband\'s body', outcome: 'First conviction using forensic chemistry' },
      { case: 'O.J. Simpson (1995)', evidence: 'DNA evidence on blood', outcome: 'Acquitted despite DNA match — defense argued contamination' },
      { case: 'Casey Anthony (2011)', evidence: 'Chloroform residue in car', outcome: 'Acquitted; chemistry contested' },
      { case: 'Alexander Litvinenko (2006)', evidence: 'Po-210 detected in urine', outcome: 'Identified as Russian state poisoning' },
      { case: 'Kim Jong-nam (2017)', evidence: 'VX nerve agent on face swabs', outcome: 'Identified as N. Korean assassination' },
      { case: 'Skripal poisoning (2018)', evidence: 'Novichok nerve agent', outcome: 'Identified as Russian intelligence operation' }
    ]
  };

  // ═══════════════════════════════════════════════════════════
  // CHEMISTRY CAREERS
  // ═══════════════════════════════════════════════════════════
  var CHEM_CAREERS = [
    { title: 'Chemist (Research)', education: 'PhD chemistry', salary: '$60-150K', path: 'BS → PhD → postdoc → faculty or industry', employers: 'Universities, NIH, pharma, materials' },
    { title: 'Chemical Engineer', education: 'BS chem eng', salary: '$70-130K', path: 'BS → industry; advanced degree for R&D', employers: 'Oil refining, chemicals, biotech, food' },
    { title: 'Pharmacist', education: 'PharmD (6 years)', salary: '$120-150K', path: 'BS prerequisites → PharmD → licensure', employers: 'Pharmacies, hospitals, industry' },
    { title: 'Forensic Chemist', education: 'BS chem + lab experience', salary: '$50-90K', path: 'BS → lab tech → certified forensic chemist', employers: 'FBI, DEA, state crime labs' },
    { title: 'Pharmaceutical Researcher', education: 'PhD chem + drug discovery', salary: '$90-180K', path: 'PhD → postdoc → industry research', employers: 'Pfizer, Merck, Novartis, smaller biotech' },
    { title: 'Quality Control Chemist', education: 'BS chem', salary: '$50-80K', path: 'BS → lab tech → senior QC', employers: 'Manufacturing, food, pharma' },
    { title: 'Materials Scientist', education: 'PhD materials science', salary: '$80-150K', path: 'BS chem/engineering → PhD → industry', employers: 'Tesla, Boeing, semiconductors, energy' },
    { title: 'Patent Attorney (Chemistry)', education: 'BS chem + JD law school', salary: '$150-250K', path: 'BS → law school + patent bar', employers: 'Law firms, corporations' },
    { title: 'Chemistry Teacher (HS)', education: 'BS + teaching credential', salary: '$50-100K (varies state)', path: 'BS chem + teaching credential', employers: 'Public + private schools' },
    { title: 'Chemistry Professor (College)', education: 'PhD chem', salary: '$70-200K depending on rank/institution', path: 'BS → PhD → postdoc → tenure track', employers: 'Universities + colleges' },
    { title: 'Environmental Chemist', education: 'BS/MS chem + environmental science', salary: '$50-95K', path: 'BS → field work or lab', employers: 'EPA, consulting firms, state agencies' },
    { title: 'Biochemist', education: 'PhD biochem', salary: '$70-160K', path: 'BS bio/chem → PhD → research', employers: 'NIH, pharma, universities' },
    { title: 'Cosmetic Chemist', education: 'BS chem', salary: '$50-100K', path: 'BS → product development', employers: 'L\'Oreal, Estee Lauder, smaller brands' },
    { title: 'Food Chemist', education: 'BS chem/food science', salary: '$50-90K', path: 'BS → R&D or QC', employers: 'PepsiCo, General Mills, Kellogg\'s' },
    { title: 'Petrochemist', education: 'BS chem + chem eng', salary: '$70-150K', path: 'BS → refinery work', employers: 'Exxon, Chevron, Shell, BP' },
    { title: 'Polymer Chemist', education: 'PhD chem', salary: '$80-150K', path: 'BS → PhD polymer focus', employers: 'Dow, DuPont, 3M' },
    { title: 'Analytical Chemist', education: 'BS chem', salary: '$50-100K', path: 'BS → lab specialist', employers: 'Many — testing, QC, R&D' },
    { title: 'Lab Manager', education: 'BS chem + experience', salary: '$60-120K', path: 'Bench work → supervision', employers: 'All chem industry' },
    { title: 'Science Writer', education: 'BS chem + writing skills', salary: '$40-100K', path: 'Career pivot from research', employers: 'Magazines, journals, agencies' },
    { title: 'Patent Examiner', education: 'BS chem', salary: '$60-130K', path: 'BS → USPTO examiner', employers: 'USPTO' }
  ];

  // ═══════════════════════════════════════════════════════════
  // LAB KITS / LESSON PLANS
  // ═══════════════════════════════════════════════════════════
  var LAB_KITS = [
    { title: 'Bubble Color Change', grade: 'K-2', materials: 'Cabbage juice + vinegar + baking soda', duration: '30 min', concept: 'Acids + bases via color change', steps: ['Boil red cabbage to make indicator juice', 'Pour into 3 cups', 'Add vinegar to one (acid) — pink', 'Add baking soda to another (base) — green', 'Compare to plain water (purple — neutral)'] },
    { title: 'States of Matter', grade: 'K-2', materials: 'Ice cubes, water, kettle', duration: '15 min', concept: 'Solid → liquid → gas', steps: ['Show ice cube', 'Melt to water', 'Boil water to steam', 'Discuss what is happening to particles'] },
    { title: 'Mixing Polar + Nonpolar', grade: '3-5', materials: 'Oil, water, food coloring, dish soap', duration: '30 min', concept: 'Polarity + emulsification', steps: ['Mix oil + water — separates', 'Add food coloring to water layer', 'Add dish soap — emulsifies'] },
    { title: 'Crystal Growing', grade: '3-5', materials: 'Salt or sugar, hot water, string, glass', duration: '~1 week', concept: 'Crystallization + saturation', steps: ['Dissolve salt in hot water until saturated', 'Tie string to pencil + suspend in solution', 'Wait 5-7 days', 'Observe crystal growth'] },
    { title: 'Density Tower', grade: '3-5', materials: 'Honey, dish soap, water, oil, rubbing alcohol', duration: '30 min', concept: 'Density + immiscible liquids', steps: ['Add liquids in order', 'Observe layering', 'Discuss why each layer forms'] },
    { title: 'Balloon CO2', grade: '3-5', materials: 'Vinegar, baking soda, balloon', duration: '15 min', concept: 'Gas-producing reaction', steps: ['Put baking soda in balloon', 'Vinegar in bottle', 'Stretch balloon over bottle + tip', 'Observe balloon inflating'] },
    { title: 'Endothermic Hand-Warmer', grade: '6-8', materials: 'Iron filings, salt, water, beaker, thermometer', duration: '20 min', concept: 'Exothermic reaction', steps: ['Mix iron filings + salt + water', 'Watch temperature rise', 'Compare to room temperature'] },
    { title: 'Penny Cleaning', grade: '6-8', materials: 'Vinegar, salt, pennies', duration: '30 min', concept: 'Redox + acid-base', steps: ['Dirty penny in vinegar + salt', 'Watch surface clean (Cu oxide removed)', 'Place clean nail in solution — Cu coats nail'] },
    { title: 'Stoichiometry Lab', grade: '9-12', materials: 'Balance, NaOH, HCl, beakers', duration: '60 min', concept: 'Mass-to-moles, balanced equations', steps: ['Calculate moles of NaOH', 'Calculate equivalent HCl', 'Verify by titration', 'Discuss accuracy'] },
    { title: 'Determining Molar Mass', grade: '9-12', materials: 'Volatile liquid, balance, water bath, gas thermometer', duration: '90 min', concept: 'Ideal gas law', steps: ['Heat volatile liquid until all gas', 'Measure T, P, V, mass', 'Calculate M using PV=nRT'] },
    { title: 'Equilibrium Constant Calculation', grade: '9-12', materials: 'KSCN, Fe(NO3)3, spectrophotometer', duration: '90 min', concept: 'Equilibrium + Beer\'s Law', steps: ['Mix Fe + SCN, form FeSCN²⁺', 'Measure absorbance', 'Calculate [FeSCN]', 'Determine Keq'] },
    { title: 'Reaction Rate vs Temperature', grade: '9-12', materials: 'Effervescent tablets, water, thermometer, timer', duration: '60 min', concept: 'Arrhenius equation', steps: ['Drop tablet at 5°C, time dissolution', 'Repeat at 25°C, 45°C, 65°C', 'Plot ln k vs 1/T', 'Calculate Ea'] },
    { title: 'Specific Heat Capacity', grade: '9-12', materials: 'Metal samples (Al, Cu, Fe), water, calorimeter', duration: '60 min', concept: 'Calorimetry', steps: ['Heat metal in boiling water', 'Drop into known mass of cool water', 'Measure ΔT', 'Calculate c = q/(mΔT)'] },
    { title: 'pH Buffers', grade: '9-12', materials: 'NaH2PO4, Na2HPO4, pH meter, acid/base', duration: '60 min', concept: 'Henderson-Hasselbalch + buffer capacity', steps: ['Prepare buffer at known pH', 'Add small amount of acid; measure pH', 'Add small amount of base', 'Compare to unbuffered water'] },
    { title: 'Electrochemistry — Lemon Battery', grade: '9-12', materials: 'Lemon, Cu wire, Zn nail, LED, voltmeter', duration: '30 min', concept: 'Galvanic cell, EMF', steps: ['Insert Cu + Zn into lemon', 'Connect to LED via voltmeter', 'Measure voltage', 'Calculate ΔG'] }
  ];

  // ═══════════════════════════════════════════════════════════
  // CHEM MYTHBUSTERS
  // ═══════════════════════════════════════════════════════════
  var CHEM_MYTHS = [
    { myth: 'Natural means chemical-free.', truth: 'Everything is chemicals. "Natural" cyanide in apple seeds, "natural" mercury in fish. Toxicity depends on dose, not source.' },
    { myth: 'You can taste a chemical to identify it.', truth: 'NEVER do this — many chemicals are toxic even in tiny amounts. Trained chemists use instruments + ID methods.' },
    { myth: 'Bottled water is purer than tap water.', truth: 'Often not. Most bottled water is filtered tap water. Tap water has stricter regulations in US.' },
    { myth: 'Mixing bleach + ammonia just gets cleaner.', truth: 'NO. Creates chloramine gas — toxic. Combining cleaners is dangerous.' },
    { myth: 'You only need water + soap for clean.', truth: 'Soap breaks lipid bilayers. Effective against most viruses + bacteria. Hot water helps but not required.' },
    { myth: 'Plastics are not chemicals because they\'re solid.', truth: 'All matter is chemistry. Plastics are long-chain polymers (huge molecules).' },
    { myth: 'Drinking lots of water can\'t hurt.', truth: 'Hyponatremia from over-hydration kills people. Body needs both water + electrolytes.' },
    { myth: 'Salt + sugar are bad chemicals.', truth: 'Both essential nutrients. Sodium for nerve function. Sugar for cellular energy. Just used in excess.' },
    { myth: 'Detox products clean toxins from body.', truth: 'No scientific basis. Healthy liver + kidneys do this naturally. Most "detox" products useless or harmful.' },
    { myth: 'Vitamins always help.', truth: 'Megadoses harmful. Vitamin A excess causes liver damage. Vitamin C excess causes kidney stones.' },
    { myth: 'Stainless steel is "pure" metal.', truth: 'Alloy of iron + chromium + nickel + carbon. The chromium oxide layer makes it stainless.' },
    { myth: 'Hot water freezes faster than cold (Mpemba effect).', truth: 'Sometimes true — surprisingly. Multiple competing explanations. Real but inconsistent.' },
    { myth: 'Acid in your stomach burns through anything.', truth: 'Stomach acid is HCl ~pH 1-2. Strong but mucus lining protects stomach. Not all-corrosive.' },
    { myth: 'Lightning is just electricity.', truth: 'Lightning also generates NO + ozone via electrochemistry. ~6% of natural NO2 comes from lightning.' },
    { myth: 'Diamonds are forever.', truth: 'Diamond is metastable; converts slowly to graphite over geological time. Just extremely slow.' },
    { myth: 'Glass is a liquid.', truth: 'Glass is an amorphous solid — disordered but rigid. Old church windows are thicker at bottom from manufacturing, not flow.' },
    { myth: 'Gold doesn\'t react.', truth: 'Gold is unreactive with O2 + water, but reacts with chlorine + aqua regia + mercury.' }
  ];

  // ═══════════════════════════════════════════════════════════
  // CHEMISTRY RECORDS
  // ═══════════════════════════════════════════════════════════
  var CHEM_RECORDS = [
    { category: 'Strongest acid', record: 'Fluoroantimonic acid (HSbF6)', value: '10¹⁹ times stronger than 100% H2SO4', notes: 'Superacid; reacts with virtually anything.' },
    { category: 'Strongest base', record: 'Lithium diisopropylamide / methyl lithium', value: 'Extremely basic', notes: 'Reacts with water explosively.' },
    { category: 'Lowest pH', record: 'Magic acid', value: '~-12 (negative pH)', notes: 'pH < 0 possible for superacids.' },
    { category: 'Highest pH', record: 'Saturated NaOH', value: '~15-16', notes: 'Theoretical limit ~16.' },
    { category: 'Most reactive metal', record: 'Cesium', value: 'Reacts violently with water + air', notes: 'Stored under argon.' },
    { category: 'Most reactive nonmetal', record: 'Fluorine', value: 'Most electronegative element', notes: 'Burns in nearly anything.' },
    { category: 'Hardest natural mineral', record: 'Diamond', value: '10 on Mohs scale', notes: 'Pure crystallized carbon.' },
    { category: 'Hardest synthetic material', record: 'Boron nitride (cubic)', value: 'Mohs ~10', notes: 'Diamond-equivalent.' },
    { category: 'Highest melting point (element)', record: 'Tungsten', value: '3422°C', notes: 'Used in light bulb filaments.' },
    { category: 'Highest melting point (substance)', record: 'Hafnium carbide (HfC)', value: '~3900°C', notes: 'Or possibly Ta4HfC5.' },
    { category: 'Lowest melting point (element)', record: 'Helium', value: '-272°C (only solid at high P)', notes: 'Liquid below 4 K.' },
    { category: 'Most abundant element (universe)', record: 'Hydrogen', value: '~75% by mass', notes: 'Big Bang nucleosynthesis.' },
    { category: 'Most abundant element (Earth crust)', record: 'Oxygen', value: '~46%', notes: 'Bound in silicates, oxides, water.' },
    { category: 'Densest element', record: 'Osmium', value: '22.59 g/cm³', notes: 'Sometimes iridium claimed (22.56).' },
    { category: 'Lightest element', record: 'Hydrogen', value: '0.0899 g/L', notes: 'At STP.' },
    { category: 'Heaviest natural element', record: 'Uranium', value: 'Z = 92', notes: 'All heavier are synthetic.' },
    { category: 'Heaviest synthetic element', record: 'Oganesson', value: 'Z = 118', notes: 'Only few atoms ever made.' },
    { category: 'Most expensive metal', record: 'Rhodium', value: '$10,000+/oz', notes: 'Catalytic converters drive price.' },
    { category: 'Strongest fiber (artificial)', record: 'Spider silk / Carbon nanotubes', value: 'Up to 130 GPa tensile', notes: 'Stronger per weight than steel.' },
    { category: 'Longest chemical name', record: 'Acetylseryltyrosylserylisoleucyl...lysine', value: '189,819 letters (titin)', notes: 'Full chemical name of human titin protein.' }
  ];

  // ═══════════════════════════════════════════════════════════
  // CHEM GLOSSARY (200+ terms)
  // ═══════════════════════════════════════════════════════════
  var CHEM_GLOSSARY = [
    { term: 'Acid', def: 'Substance that donates H+ ions (Bronsted), accepts electron pair (Lewis), or produces H+ in water (Arrhenius).' },
    { term: 'Activation energy (Ea)', def: 'Minimum energy needed to start a reaction. Lowered by catalysts.' },
    { term: 'Alkali metal', def: 'Group 1 elements (Li, Na, K, Rb, Cs, Fr). Soft, reactive metals with one valence electron.' },
    { term: 'Alkaline earth metal', def: 'Group 2 elements (Be, Mg, Ca, Sr, Ba, Ra). Two valence electrons.' },
    { term: 'Alloy', def: 'Mixture of two or more metals (or metal + nonmetal). Steel = Fe + C.' },
    { term: 'Amphoteric', def: 'Substance that can act as both acid + base. Aluminum hydroxide, water.' },
    { term: 'Anion', def: 'Negatively charged ion. Has more electrons than protons.' },
    { term: 'Atomic mass', def: 'Average mass of an atom (g/mol). Weighted by isotope abundance.' },
    { term: 'Atomic number (Z)', def: 'Number of protons in nucleus. Defines the element.' },
    { term: 'Avogadro\'s number', def: '6.022 × 10²³ particles per mole. Counting unit for chemistry.' },
    { term: 'Base', def: 'Substance that accepts H+ (Bronsted), donates electron pair (Lewis), or produces OH- in water (Arrhenius).' },
    { term: 'Boyle\'s Law', def: 'PV = constant at constant T + n. Inverse relationship between P + V.' },
    { term: 'Buffer', def: 'Solution that resists pH change. Weak acid + conjugate base.' },
    { term: 'Calorimeter', def: 'Device that measures heat changes in reactions.' },
    { term: 'Catalyst', def: 'Substance that speeds reaction without being consumed. Lowers Ea.' },
    { term: 'Cation', def: 'Positively charged ion. Has fewer electrons than protons.' },
    { term: 'Chemical bond', def: 'Force holding atoms together. Ionic, covalent, metallic.' },
    { term: 'Chiral', def: 'Molecule that cannot superimpose on its mirror image.' },
    { term: 'Combustion', def: 'Burning. Substance reacts with O2 producing heat + light.' },
    { term: 'Compound', def: 'Substance made of 2+ elements chemically combined.' },
    { term: 'Concentration', def: 'Amount of solute per unit volume of solution.' },
    { term: 'Conjugate acid/base', def: 'Acid + base pair differing by one H+.' },
    { term: 'Conservation of mass', def: 'Mass neither created nor destroyed in reactions. Atoms balance.' },
    { term: 'Covalent bond', def: 'Sharing of electron pairs between atoms.' },
    { term: 'Crystallization', def: 'Process of forming crystals from a solution.' },
    { term: 'Diffusion', def: 'Spontaneous mixing of substances by random motion.' },
    { term: 'Dipole', def: 'Molecule with separated charges. Has + + - ends.' },
    { term: 'Dissociation', def: 'Breaking of ions in solution. NaCl → Na+ + Cl-.' },
    { term: 'Electrolyte', def: 'Substance that conducts electricity when dissolved.' },
    { term: 'Electron', def: 'Negatively charged subatomic particle. Outside nucleus.' },
    { term: 'Electron configuration', def: 'Arrangement of electrons in shells/orbitals.' },
    { term: 'Electronegativity', def: 'Atom\'s ability to attract electrons in a bond. F most.' },
    { term: 'Element', def: 'Substance that cannot be broken down by chemical means.' },
    { term: 'Empirical formula', def: 'Simplest whole-number ratio of atoms.' },
    { term: 'Endothermic', def: 'Reaction that absorbs heat. ΔH > 0.' },
    { term: 'Energy', def: 'Capacity to do work or transfer heat.' },
    { term: 'Enthalpy (H)', def: 'Total heat content. ΔH = q at constant P.' },
    { term: 'Entropy (S)', def: 'Measure of disorder. Always increases in isolated systems.' },
    { term: 'Equilibrium', def: 'State where forward + reverse rates are equal.' },
    { term: 'Exothermic', def: 'Reaction that releases heat. ΔH < 0.' },
    { term: 'Faraday\'s constant', def: '96,485 C/mol. Charge per mole of electrons.' },
    { term: 'Filtration', def: 'Separation by passing liquid through filter.' },
    { term: 'Free energy (G)', def: 'ΔG = ΔH - TΔS. ΔG < 0 means spontaneous.' },
    { term: 'Functional group', def: 'Specific arrangement of atoms with characteristic properties.' },
    { term: 'Gas', def: 'State with no fixed shape or volume. Highest entropy.' },
    { term: 'Gibbs energy', def: 'Same as free energy.' },
    { term: 'Half-life', def: 'Time for half of a substance to decay or react.' },
    { term: 'Halogen', def: 'Group 17 elements (F, Cl, Br, I, At). Highly reactive nonmetals.' },
    { term: 'Heat capacity', def: 'Energy to raise temperature by 1°C.' },
    { term: 'Hess\'s Law', def: 'ΔH is state function. Sum of step ΔH = overall ΔH.' },
    { term: 'Heterogeneous', def: 'Not uniform. Multiple phases visible.' },
    { term: 'Homogeneous', def: 'Uniform throughout. Single phase.' },
    { term: 'Hybridization', def: 'Mixing of atomic orbitals to form new bonding orbitals.' },
    { term: 'Hydrogen bond', def: 'Strong dipole interaction with H bonded to N, O, F.' },
    { term: 'Hydrolysis', def: 'Breaking bonds by adding water.' },
    { term: 'Indicator', def: 'Substance that changes color with pH.' },
    { term: 'Ion', def: 'Charged atom. Cation (+) or anion (-).' },
    { term: 'Ionic bond', def: 'Transfer of electrons. Metal + nonmetal.' },
    { term: 'Ionization energy', def: 'Energy to remove an electron.' },
    { term: 'Isomer', def: 'Same molecular formula, different structure.' },
    { term: 'Isotope', def: 'Same element, different number of neutrons.' },
    { term: 'Kinetics', def: 'Study of reaction rates.' },
    { term: 'Le Chatelier\'s Principle', def: 'System at equilibrium opposes disturbance.' },
    { term: 'Limiting reagent', def: 'Reactant fully consumed first. Determines maximum product.' },
    { term: 'Liquid', def: 'State with fixed volume but no fixed shape.' },
    { term: 'Mass number', def: 'Total protons + neutrons.' },
    { term: 'Matter', def: 'Anything with mass + volume.' },
    { term: 'Metalloid', def: 'Element with properties between metals + nonmetals. B, Si, Ge, As, Sb, Te.' },
    { term: 'Mixture', def: 'Two+ substances physically combined.' },
    { term: 'Molality (m)', def: 'Moles solute per kg solvent.' },
    { term: 'Molarity (M)', def: 'Moles solute per liter solution.' },
    { term: 'Mole', def: '6.022 × 10²³ particles. Counting unit.' },
    { term: 'Molecule', def: 'Two+ atoms chemically bonded.' },
    { term: 'Network solid', def: 'Crystal where atoms covalently bonded throughout (diamond, quartz).' },
    { term: 'Neutralization', def: 'Acid + base → salt + water.' },
    { term: 'Neutron', def: 'Neutral subatomic particle in nucleus.' },
    { term: 'Noble gas', def: 'Group 18 elements. Full valence shell. Generally unreactive.' },
    { term: 'Nonmetal', def: 'Element with poor conductivity. Often gaseous. Top right of periodic table.' },
    { term: 'Nucleus', def: 'Center of atom containing protons + neutrons.' },
    { term: 'Octet rule', def: 'Atoms tend toward 8 valence electrons (full s + p).' },
    { term: 'Orbital', def: 'Region around nucleus where electron is likely. s, p, d, f.' },
    { term: 'Oxidation', def: 'Loss of electrons. Increase in oxidation number.' },
    { term: 'pH', def: '-log[H+]. 0-7 acidic. 7 neutral. 7-14 basic.' },
    { term: 'pOH', def: '-log[OH-]. pH + pOH = 14.' },
    { term: 'Periodic table', def: 'Chart of elements organized by atomic number.' },
    { term: 'Period', def: 'Horizontal row in periodic table.' },
    { term: 'Polar', def: 'Molecule with permanent dipole. Asymmetric electron distribution.' },
    { term: 'Polymer', def: 'Long chain of repeating monomer units.' },
    { term: 'Precipitate', def: 'Solid forming from solution.' },
    { term: 'Pressure', def: 'Force per unit area.' },
    { term: 'Product', def: 'Substance formed in chemical reaction.' },
    { term: 'Proton', def: 'Positively charged subatomic particle in nucleus.' },
    { term: 'Pure substance', def: 'Material with uniform composition.' },
    { term: 'Reactant', def: 'Substance consumed in chemical reaction.' },
    { term: 'Reaction quotient (Q)', def: 'Same as Keq formula but at any time.' },
    { term: 'Redox', def: 'Reduction-oxidation. Electron transfer reactions.' },
    { term: 'Reduction', def: 'Gain of electrons. Decrease in oxidation number.' },
    { term: 'Resonance', def: 'Multiple Lewis structures for same molecule. Actual structure is hybrid.' },
    { term: 'Salt', def: 'Ionic compound formed from acid-base neutralization.' },
    { term: 'Saturated solution', def: 'Maximum solute dissolved at given T.' },
    { term: 'Solid', def: 'State with fixed shape + volume. Lowest entropy.' },
    { term: 'Solute', def: 'Substance dissolved in a solvent.' },
    { term: 'Solution', def: 'Homogeneous mixture.' },
    { term: 'Solvent', def: 'Dissolving medium. Water is universal solvent.' },
    { term: 'Specific heat', def: 'Heat capacity per gram.' },
    { term: 'Spectrometer', def: 'Instrument measuring light absorption/emission.' },
    { term: 'Stoichiometry', def: 'Mole-based calculations from balanced equations.' },
    { term: 'STP', def: 'Standard Temperature + Pressure. 0°C, 1 atm.' },
    { term: 'Sublimation', def: 'Solid directly to gas. Dry ice, mothballs.' },
    { term: 'Supersaturated', def: 'More solute than equilibrium. Unstable.' },
    { term: 'Suspension', def: 'Heterogeneous mixture with particles that settle.' },
    { term: 'Synthesis', def: 'Combination reaction. A + B → AB.' },
    { term: 'Temperature', def: 'Average kinetic energy of particles.' },
    { term: 'Thermodynamics', def: 'Study of energy + heat.' },
    { term: 'Titration', def: 'Adding known concentration to determine unknown.' },
    { term: 'Transition metal', def: 'Group 3-12 elements. Multiple oxidation states.' },
    { term: 'Triple point', def: 'T + P where all three phases coexist.' },
    { term: 'Unsaturated', def: 'More solute could dissolve.' },
    { term: 'Valence electron', def: 'Outermost electrons. Determine bonding.' },
    { term: 'Vapor pressure', def: 'Pressure of vapor in equilibrium with liquid.' },
    { term: 'Yield', def: 'Amount of product. Percent yield = actual/theoretical × 100.' }
  ];

  // ═══════════════════════════════════════════════════════════
  // REFERENCE DATA TABLES
  // ═══════════════════════════════════════════════════════════
  var CHEM_DATA_TABLES = {
    constants: [
      { name: 'Avogadro\'s number', symbol: 'NA', value: '6.022 × 10²³ /mol' },
      { name: 'Faraday constant', symbol: 'F', value: '96,485 C/mol' },
      { name: 'Gas constant', symbol: 'R', value: '8.314 J/(mol·K) = 0.0821 L·atm/(mol·K)' },
      { name: 'Boltzmann constant', symbol: 'k', value: '1.38 × 10⁻²³ J/K' },
      { name: 'Planck constant', symbol: 'h', value: '6.626 × 10⁻³⁴ J·s' },
      { name: 'Speed of light', symbol: 'c', value: '3.0 × 10⁸ m/s' },
      { name: 'Electron charge', symbol: 'e', value: '1.602 × 10⁻¹⁹ C' },
      { name: 'Electron mass', symbol: 'me', value: '9.109 × 10⁻³¹ kg' },
      { name: 'Proton mass', symbol: 'mp', value: '1.673 × 10⁻²⁷ kg' },
      { name: 'Rydberg constant', symbol: 'R∞', value: '1.097 × 10⁷ /m' },
      { name: 'Standard pressure', symbol: 'P°', value: '1 atm = 101.325 kPa' },
      { name: 'Standard temperature', symbol: 'T°', value: '25°C = 298.15 K (or 0°C = 273.15 K for STP)' }
    ],
    conversions: [
      { from: '1 mole gas at STP', to: '22.4 L' },
      { from: '1 cal', to: '4.184 J' },
      { from: '1 atm', to: '101.325 kPa = 760 mmHg = 760 Torr' },
      { from: '1 amu', to: '1.66 × 10⁻²⁴ g' },
      { from: '0°C', to: '273.15 K = 32°F' },
      { from: '100°C', to: '373.15 K = 212°F' },
      { from: '1 nm', to: '10⁻⁹ m' },
      { from: '1 Å', to: '10⁻¹⁰ m = 0.1 nm' },
      { from: '1 ppm', to: '1 mg/L (in water)' },
      { from: '1 ppb', to: '1 μg/L' }
    ],
    bondEnergies: [
      { bond: 'H-H', energy: '436 kJ/mol' },
      { bond: 'O=O', energy: '498 kJ/mol' },
      { bond: 'N≡N', energy: '946 kJ/mol' },
      { bond: 'C-H', energy: '413 kJ/mol' },
      { bond: 'C=O', energy: '799 kJ/mol' },
      { bond: 'C-C', energy: '348 kJ/mol' },
      { bond: 'C=C', energy: '614 kJ/mol' },
      { bond: 'C≡C', energy: '839 kJ/mol' },
      { bond: 'O-H', energy: '463 kJ/mol' },
      { bond: 'N-H', energy: '391 kJ/mol' },
      { bond: 'Cl-Cl', energy: '243 kJ/mol' },
      { bond: 'H-Cl', energy: '431 kJ/mol' },
      { bond: 'C-Cl', energy: '328 kJ/mol' },
      { bond: 'Si-O', energy: '466 kJ/mol' }
    ],
    electronegativity: [
      { elem: 'F', value: 4.0 }, { elem: 'O', value: 3.5 }, { elem: 'N', value: 3.0 }, { elem: 'Cl', value: 3.0 }, { elem: 'Br', value: 2.8 }, { elem: 'I', value: 2.5 }, { elem: 'C', value: 2.5 }, { elem: 'S', value: 2.5 }, { elem: 'H', value: 2.1 }, { elem: 'P', value: 2.1 }, { elem: 'Si', value: 1.8 }, { elem: 'Al', value: 1.5 }, { elem: 'Mg', value: 1.2 }, { elem: 'Ca', value: 1.0 }, { elem: 'Li', value: 1.0 }, { elem: 'Na', value: 0.9 }, { elem: 'K', value: 0.8 }, { elem: 'Rb', value: 0.8 }, { elem: 'Cs', value: 0.7 }
    ],
    specificHeats: [
      { substance: 'Water (l)', c: '4.184 J/(g·°C)' },
      { substance: 'Ice', c: '2.09 J/(g·°C)' },
      { substance: 'Steam', c: '2.01 J/(g·°C)' },
      { substance: 'Ethanol', c: '2.44 J/(g·°C)' },
      { substance: 'Aluminum', c: '0.897 J/(g·°C)' },
      { substance: 'Copper', c: '0.385 J/(g·°C)' },
      { substance: 'Iron', c: '0.45 J/(g·°C)' },
      { substance: 'Gold', c: '0.128 J/(g·°C)' },
      { substance: 'Air', c: '1.01 J/(g·°C)' },
      { substance: 'Glass', c: '0.84 J/(g·°C)' }
    ]
  };


  // REGISTER TOOL
  // ═══════════════════════════════════════════════════════════
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
        return h('div', { className: 'max-w-3xl mx-auto animate-in fade-in duration-200' },

          // ── Header ──
          h('div', { className: 'flex items-center gap-3 mb-3' },
            h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back to tools' },
              h(ArrowLeft, { size: 18, className: 'text-slate-600' })
            ),
            h('h3', { className: 'text-lg font-bold text-slate-800' }, '\u2697\uFE0F Chemistry Lab'),
            h('span', { className: 'px-2 py-0.5 bg-lime-100 text-lime-700 text-[11px] font-bold rounded-full' }, 'CHEM v3'),
            streak > 0 && h('span', { className: 'px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full animate-in zoom-in' }, '\uD83D\uDD25 ' + streak),
            h('button', { onClick: function() { upd('_showBadges', !d._showBadges); },
              className: 'ml-auto px-2 py-1 text-[11px] font-bold rounded-lg border ' + (d._showBadges ? 'bg-amber-100 text-amber-700 border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200')
            }, '\uD83C\uDFC5 ' + ext.badges.length + '/' + Object.keys(CHEM_BADGES).length),
            h('button', { onClick: function() { upd('_showAI', !d._showAI); },
              className: 'px-2 py-1 text-[11px] font-bold rounded-lg border ' + (d._showAI ? 'bg-sky-100 text-sky-700 border-sky-600' : 'bg-slate-50 text-slate-600 border-slate-200')
            }, '\uD83E\uDD16 AI')
          ),

          // ── Sub-tool Navigation ──
          h('div', { className: 'flex flex-wrap gap-1 mb-3' },
            SUBTOOLS.map(function(st) {
              var isActive = subtool === st.id;
              return h('button', { key: st.id,
                onClick: function() { upd('subtool', st.id); announceToSR('Switched to ' + st.label); },
                className: 'px-2 py-1 rounded-lg text-[11px] font-bold transition-all border ' +
                  (isActive ? 'bg-lime-600 text-white border-lime-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-lime-600 hover:bg-lime-50'),
                title: st.desc
              }, st.icon + ' ' + st.label);
            })
          ),

          // ── Topic-accent hero band per sub-tool ──
          (function() {
            var TAB_META = {
              balance:   { accent: '#65a30d', soft: 'rgba(101,163,13,0.10)', icon: '\u2696\uFE0F', title: 'Balance \u2014 atoms in = atoms out',                       hint: 'Lavoisier 1789: conservation of mass. Trick is the coefficient (NOT the subscript). 2H\u2082 + O\u2082 \u2192 2H\u2082O. Balance metals first, then non-metals, then hydrogen, then oxygen.' },
              reactions: { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\u2697\uFE0F', title: 'Reaction Types \u2014 the 5 patterns',                       hint: 'Synthesis (A+B\u2192AB), decomposition (AB\u2192A+B), single replace (A+BC\u2192AC+B), double replace (AB+CD\u2192AD+CB), combustion (CxHy + O\u2082 \u2192 CO\u2082 + H\u2082O). 95% of high-school equations fit one of these.' },
              stoich:    { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',  icon: '\uD83E\uDDEE', title: 'Stoichiometry \u2014 mole math',                              hint: '1 mole = 6.022\u00d710\u00b2\u00b3 particles (Avogadro). Molar mass = sum of atomic masses. Grams \u2192 moles \u2192 moles \u2192 grams. The bridge between balanced equations and lab quantities.' },
              molecular: { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\u269B\uFE0F', title: 'Molecular \u2014 ball-and-stick geometry',                   hint: 'VSEPR predicts shape: linear, trigonal planar, tetrahedral, trigonal pyramidal, bent. Lone pairs occupy more space than bonded pairs. CH\u2084 is a perfect tetrahedron, NH\u2083 is a slightly squashed one.' },
              safety:    { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83E\uDDEA', title: 'Lab Safety \u2014 GHS symbols + emergency response',          hint: '9 GHS pictograms: explosive, flammable, oxidizer, gas pressure, corrosive, toxic, irritant, environmental hazard, health hazard. Acid into water (never reverse) \u2014 splashes are violent.' },
              challenge: { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83C\uDFC6', title: 'Challenge \u2014 graded quiz across 3 tiers',                hint: 'Beginner = naming + counting atoms; Intermediate = balancing; Advanced = mole math + limiting reagent. AP Chem topics 1\u20136. NGSS HS-PS1.' },
              battle:    { accent: '#ea580c', soft: 'rgba(234,88,12,0.10)',  icon: '\u2694\uFE0F', title: 'Element Battle \u2014 retrieval as combat',                  hint: 'Speed builds automaticity. Once balancing + naming are automatic, your working memory is free for higher-order reasoning like predicting product formation and equilibrium shifts.' },
              learn:     { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83D\uDCD6', title: 'Learn \u2014 concepts by grade band',                        hint: 'K-2: matter is stuff. 3-5: matter cycles. MS: atoms + simple compounds. HS: full periodic-table reasoning. AP: thermodynamics + kinetics + equilibrium. The vertical alignment runs through every grade.' }
            };
            var meta = TAB_META[subtool] || TAB_META.balance;
            return h('div', {
              style: {
                margin: '0 0 12px',
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

          // ── Badge Panel ──
          d._showBadges && h('div', { className: 'mb-3 bg-amber-50 rounded-xl p-3 border border-amber-200' },
            h('p', { className: 'text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2' }, '\uD83C\uDFC5 Chemistry Badges'),
            h('div', { className: 'grid grid-cols-6 gap-1.5' },
              Object.keys(CHEM_BADGES).map(function(bid) {
                var b = CHEM_BADGES[bid];
                var earned = ext.badges.indexOf(bid) !== -1;
                return h('div', { key: bid, className: 'text-center p-1.5 rounded-lg border ' + (earned ? 'bg-white border-amber-300' : 'bg-slate-50 border-slate-200 opacity-50'), title: b.desc },
                  h('span', { className: 'text-lg block' }, earned ? b.icon : '\uD83D\uDD12'),
                  h('span', { className: 'text-[11px] font-bold block ' + (earned ? 'text-amber-700' : 'text-slate-600') }, b.label)
                );
              })
            )
          ),

          // ── AI Tutor ──
          d._showAI && h('div', { className: 'mb-3 bg-sky-50 rounded-xl p-3 border border-sky-200' },
            h('p', { className: 'text-[11px] font-bold text-sky-600 uppercase tracking-wider mb-2' }, '\uD83E\uDD16 AI Chemistry Tutor'),
            h('div', { className: 'flex gap-2 mb-2' },
              h('input', { type: 'text', value: d._chemAIQ || '', onChange: function(e) { upd('_chemAIQ', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') askAI(d._chemAIQ); }, placeholder: 'Ask a chemistry question...', 'aria-label': 'Ask the chemistry tutor', className: 'flex-1 px-3 py-1.5 text-sm border border-sky-600 rounded-lg focus:border-sky-400' }),
              h('button', { onClick: function() { askAI(d._chemAIQ); }, disabled: d._chemAILoading, 'aria-busy': d._chemAILoading, 'aria-label': d._chemAILoading ? 'Asking AI tutor' : 'Ask AI tutor', className: 'px-3 py-1.5 text-xs font-bold text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-50' }, d._chemAILoading ? '\u23F3...' : 'Ask')
            ),
            d._chemAIResp && h('div', { className: 'bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-sky-100' }, d._chemAIResp)
          ),

          // ════════════════════════════════════════
          // BALANCE SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'balance' && h('div', null,
            // Tier filter
            h('div', { className: 'flex gap-2 mb-3' },
              ['all', 'beginner', 'intermediate', 'advanced'].map(function(tier) {
                return h('button', { key: tier, onClick: function() { upd('tierFilter', tier); var first = tier === 'all' ? ALL_PRESETS[0] : null; if (!first) { for (var ti = 0; ti < ALL_PRESETS.length; ti++) { if (ALL_PRESETS[ti].tier === tier) { first = ALL_PRESETS[ti]; break; } } } if (first) switchPreset(first.name); }, className: 'px-3 py-1 rounded-full text-xs font-bold transition-all ' + (tierFilter === tier ? 'bg-lime-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') }, tier === 'all' ? '\uD83D\uDCCA All' : tierLabels[tier] || tier);
              })
            ),
            // Equation chips
            h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
              filtered.map(function(p) {
                return h('button', { 'aria-label': 'Switch Preset', key: p.name, onClick: function() { switchPreset(p.name); }, className: 'px-3 py-1 rounded-lg text-xs font-bold transition-all ' + (d.equation === p.name ? 'bg-lime-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-lime-50 border border-slate-400') }, p.name);
              })
            ),
            // Balance Scale SVG
            h('svg', { viewBox: '0 0 400 100', className: 'w-full mb-3', style: { maxHeight: '100px' } },
              h('polygon', { points: '200,95 190,75 210,75', fill: '#94a3b8' }),
              h('line', { x1: 60, y1: 75 + tilt * 8, x2: 340, y2: 75 - tilt * 8, stroke: isBalanced ? '#22c55e' : '#94a3b8', strokeWidth: 3, strokeLinecap: 'round', style: { transition: 'all 0.3s' } }),
              h('ellipse', { cx: 100, cy: 80 + tilt * 8, rx: 50, ry: 8, fill: isBalanced ? '#dcfce7' : '#f1f5f9', stroke: isBalanced ? '#22c55e' : '#94a3b8', strokeWidth: 1.5, style: { transition: 'all 0.3s' } }),
              h('ellipse', { cx: 300, cy: 80 - tilt * 8, rx: 50, ry: 8, fill: isBalanced ? '#dcfce7' : '#f1f5f9', stroke: isBalanced ? '#22c55e' : '#94a3b8', strokeWidth: 1.5, style: { transition: 'all 0.3s' } }),
              Object.keys(leftAtoms).map(function(atom, idx) {
                var count = leftAtoms[atom]; var balls = [];
                for (var b = 0; b < Math.min(count, 8); b++) balls.push(h('circle', { key: atom + b, cx: 70 + idx * 18 + (b % 3) * 10, cy: 60 + tilt * 8 - Math.floor(b / 3) * 10, r: 5, fill: atomColors[atom] || '#94a3b8', stroke: 'white', strokeWidth: 0.5 }));
                return h('g', { key: 'l' + atom }, balls, h('text', { x: 70 + idx * 18, y: 42 + tilt * 8, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: 'bold' }, fill: atomColors[atom] || '#94a3b8' }, atom + '\u00D7' + count));
              }),
              Object.keys(rightAtoms).map(function(atom, idx) {
                var count = rightAtoms[atom]; var balls = [];
                for (var b = 0; b < Math.min(count, 8); b++) balls.push(h('circle', { key: atom + b, cx: 270 + idx * 18 + (b % 3) * 10, cy: 60 - tilt * 8 - Math.floor(b / 3) * 10, r: 5, fill: atomColors[atom] || '#94a3b8', stroke: 'white', strokeWidth: 0.5 }));
                return h('g', { key: 'r' + atom }, balls, h('text', { x: 270 + idx * 18, y: 42 - tilt * 8, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: 'bold' }, fill: atomColors[atom] || '#94a3b8' }, atom + '\u00D7' + count));
              }),
              h('text', { x: 100, y: 15, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold' }, fill: '#475569' }, 'Reactants'),
              h('text', { x: 300, y: 15, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold' }, fill: '#475569' }, 'Products'),
              isBalanced && h('text', { x: 200, y: 15, textAnchor: 'middle', style: { fontSize: '10px', fontWeight: 'bold' }, fill: '#22c55e' }, '\u2705 Balanced!')
            ),
            // Equation card
            h('div', { className: 'bg-white rounded-xl border-2 p-5 text-center transition-colors ' + (isBalanced ? 'border-emerald-300 bg-emerald-50/30' : 'border-lime-200') },
              h('p', { className: 'text-2xl font-bold text-slate-800 mb-4 tracking-wide' },
                (function() {
                  var fmt = function(seg, i) { return (coeffs[i] > 1 ? coeffs[i] : '') + seg; };
                  return leftCompounds.map(function(s, i) { return fmt(s, i); }).join(' + ') + ' \u2192 ' + rightCompounds.map(function(s, i) { return fmt(s, leftCompounds.length + i); }).join(' + ');
                })()
              ),
              // Coefficient controls
              h('div', { className: 'flex justify-center gap-4 mb-4' },
                coeffs.map(function(c, i) {
                  return h('div', { key: i, className: 'flex flex-col items-center gap-1' },
                    h('span', { className: 'text-[11px] font-bold text-slate-600 mb-0.5' }, i < leftCompounds.length ? leftCompounds[i] : rightCompounds[i - leftCompounds.length]),
                    h('button', { 'aria-label': 'Add', onClick: function() { chemSound('click'); var nc = coeffs.slice(); nc[i] = Math.min(12, nc[i] + 1); updMulti({ coefficients: nc, feedback: null }); }, className: 'w-9 h-9 bg-lime-100 rounded-lg font-bold text-lime-700 hover:bg-lime-200 transition-colors text-lg' }, '+'),
                    h('span', { className: 'text-2xl font-black text-slate-700 w-9 text-center' }, c),
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
                  return h('div', { key: atom, className: 'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border transition-all ' + (match ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200') },
                    h('div', { className: 'w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-black', style: { backgroundColor: atomColors[atom] || '#94a3b8' } }, atom),
                    h('div', { className: 'flex items-center gap-1 text-xs font-bold' },
                      h('span', { className: match ? 'text-emerald-600' : 'text-red-600' }, left),
                      h('span', { className: 'text-slate-600' }, match ? '=' : '\u2260'),
                      h('span', { className: match ? 'text-emerald-600' : 'text-red-600' }, right)
                    )
                  );
                })
              ),
              // Action buttons
              h('div', { className: 'flex justify-center gap-2 mb-3 flex-wrap' },
                h('button', { onClick: checkBalance, className: 'px-5 py-2 bg-lime-600 text-white font-bold rounded-lg hover:bg-lime-700 transition-colors shadow-sm text-sm' }, '\u2696\uFE0F Check'),
                h('button', { 'aria-label': 'Hints', onClick: function() { upd('showHints', !showHints); }, className: 'px-3 py-2 rounded-lg font-bold text-xs transition-colors ' + (showHints ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-blue-50') }, '\uD83D\uDCA1 Hints'),
                h('button', { 'aria-label': 'Reset', onClick: function() { var arr = []; for (var ri = 0; ri < numSlots; ri++) arr.push(1); updMulti({ coefficients: arr, feedback: null }); }, className: 'px-3 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200' }, '\uD83D\uDD04 Reset'),
                h('button', { 'aria-label': 'Random', onClick: function() { var pick = filtered[Math.floor(Math.random() * filtered.length)]; switchPreset(pick.name); addToast('\uD83C\uDFB2 ' + pick.name, 'info'); }, className: 'px-3 py-2 bg-purple-100 text-purple-700 rounded-lg font-bold text-xs hover:bg-purple-200 border border-purple-600' }, '\uD83C\uDFB2 Random')
              ),
              showHints && h('div', { className: 'mt-3 bg-blue-50 rounded-lg p-3 border border-blue-200 text-left' },
                h('p', { className: 'text-xs font-bold text-blue-700 mb-1' }, '\uD83D\uDCA1 ' + preset.hint),
                h('p', { className: 'text-[11px] text-blue-600' }, '\u2022 Balance one element at a time \u2022 Start with the most complex compound \u2022 Save O or H for last')
              ),
              d.feedback && h('p', { className: 'mt-3 text-sm font-bold ' + (d.feedback.correct ? 'text-emerald-600' : 'text-red-600') }, d.feedback.msg)
            ),
            // Timer
            h('div', { className: 'mt-3 flex items-center gap-3' },
              h('button', { onClick: function() { if (d.timerActive) { updMulti({ timerActive: false, timerEnd: null }); } else { var arr = []; for (var ri = 0; ri < numSlots; ri++) arr.push(1); updMulti({ timerActive: true, timerStart: Date.now(), coefficients: arr, feedback: null }); } }, className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + (d.timerActive ? 'bg-red-100 text-red-600 border border-red-600' : 'bg-amber-100 text-amber-700 border border-amber-600 hover:bg-amber-200') }, d.timerActive ? '\u23F9 Stop' : '\u23F1 Speed Challenge'),
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
            h('div', { className: 'space-y-3' },
              REACTION_TYPES.map(function(rt) {
                var isOpen = d._rxnOpen === rt.id;
                return h('div', { key: rt.id, className: 'bg-white rounded-xl border ' + (isOpen ? 'border-' + rt.color + '-300 shadow-md' : 'border-slate-200') },
                  h('button', { onClick: function() { upd('_rxnOpen', isOpen ? null : rt.id); chemSound('click'); }, className: 'w-full flex items-center gap-3 p-3 text-left' },
                    h('span', { className: 'text-2xl' }, rt.icon),
                    h('div', { className: 'flex-1' },
                      h('p', { className: 'text-sm font-bold text-slate-700' }, rt.label),
                      h('p', { className: 'text-[11px] font-mono text-slate-600' }, rt.pattern)
                    ),
                    h('span', { className: 'text-xs text-slate-600' }, isOpen ? '\u25B2' : '\u25BC')
                  ),
                  isOpen && h('div', { className: 'px-3 pb-3' },
                    h('p', { className: 'text-xs text-slate-600 mb-2' }, rt.desc),
                    h('div', { className: 'space-y-1' },
                      rt.examples.map(function(ex, ei) {
                        return h('div', { key: ei, className: 'flex items-center gap-2 bg-' + rt.color + '-50 rounded-lg p-2 border border-' + rt.color + '-100' },
                          h('span', { className: 'text-xs font-mono font-bold text-' + rt.color + '-700 flex-1' }, ex.eq),
                          h('span', { className: 'text-[11px] text-' + rt.color + '-500' }, ex.name)
                        );
                      })
                    )
                  )
                );
              })
            ),
            // Classify mini-game
            h('div', { className: 'mt-3 bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl p-3 border border-purple-200' },
              h('p', { className: 'text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-2' }, '\uD83E\uDDE9 Classify This Reaction'),
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
                  h('div', { className: 'flex flex-wrap gap-1.5' },
                    REACTION_TYPES.map(function(rt) {
                      var fb = d._classifyFb;
                      var isCorrect = fb && classifyQ.type === rt.id;
                      var isWrong = fb && fb === rt.id && classifyQ.type !== rt.id;
                      return h('button', { key: rt.id, onClick: function() {
                        if (d._classifyFb) return;
                        upd('_classifyFb', rt.id);
                        if (rt.id === classifyQ.type) { chemSound('correct'); addToast('\u2705 ' + rt.label + '!', 'success'); } else { chemSound('wrong'); }
                      }, className: 'px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ' + (isCorrect ? 'bg-emerald-100 text-emerald-700 border-emerald-600' : isWrong ? 'bg-red-100 text-red-700 border-red-600' : fb ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-600') }, rt.icon + ' ' + rt.label);
                    })
                  ),
                  d._classifyFb && h('button', { 'aria-label': 'Next', onClick: function() {
                    var all = [];
                    REACTION_TYPES.forEach(function(rt) { rt.examples.forEach(function(ex) { all.push({ eq: ex.eq, type: rt.id, label: rt.label }); }); });
                    var pick = all[Math.floor(Math.random() * all.length)];
                    updMulti({ _classifyQ: pick, _classifyFb: null });
                  }, className: 'mt-2 px-3 py-1 text-[11px] font-bold text-purple-600 bg-purple-50 border border-purple-600 rounded-lg hover:bg-purple-100' }, '\u27A1 Next')
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
            h('div', { className: 'bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-3 border border-teal-200 mb-3' },
              h('label', { className: 'text-[11px] font-bold text-teal-600 uppercase tracking-wider block mb-1' }, '\uD83E\uDDEE Enter Chemical Formula'),
              h('input', { type: 'text', value: stoichFormula, onChange: function(e) { upd('_stoichFormula', e.target.value); }, placeholder: 'e.g. H2O, NaCl, Ca(OH)2', 'aria-label': 'Chemical formula input', className: 'w-full px-3 py-2 text-sm font-mono font-bold border border-teal-600 rounded-lg focus:border-teal-400 tracking-widest mb-2' }),
              // Presets
              h('div', { className: 'flex flex-wrap gap-1' },
                MOLAR_PRESETS.map(function(mp) {
                  return h('button', { 'aria-label': 'Enter a valid formula above', key: mp.formula, onClick: function() { upd('_stoichFormula', mp.formula); chemSound('click'); }, className: 'px-2 py-0.5 text-[11px] font-bold rounded bg-white text-teal-600 border border-teal-600 hover:bg-teal-50' }, mp.name);
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
                  h('span', { className: 'px-2 py-0.5 bg-teal-100 text-teal-600 text-[11px] font-bold rounded-full' }, stoichFormula)
                ),
                // Element breakdown
                h('div', { className: 'flex flex-wrap gap-2 mb-3' },
                  Object.keys(elems).map(function(el) {
                    var elMass = ELEMENTS[el] ? ELEMENTS[el].m * elems[el] : 0;
                    var pct = mass > 0 ? (elMass / mass * 100).toFixed(1) : 0;
                    return h('div', { key: el, className: 'flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1 border' },
                      h('div', { className: 'w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] font-black', style: { backgroundColor: ATOM_COLORS[el] || '#94a3b8' } }, el),
                      h('span', { className: 'text-[11px] font-bold text-slate-600' }, el + ' \u00D7' + elems[el]),
                      h('span', { className: 'text-[11px] text-slate-600' }, pct + '%')
                    );
                  })
                ),
                // Gram-mole converter
                h('div', { className: 'grid grid-cols-2 gap-3' },
                  h('div', null,
                    h('label', { className: 'text-[11px] font-bold text-slate-600 block mb-1' }, 'Grams \u2192 Moles'),
                    h('input', { type: 'number', value: stoichGrams, onChange: function(e) { var g = parseFloat(e.target.value); upd('_stoichGrams', e.target.value); if (!isNaN(g) && mass > 0) upd('_stoichMoles', (g / mass).toFixed(4)); }, placeholder: 'grams', 'aria-label': 'Grams to convert to moles', className: 'w-full px-2 py-1 text-sm border rounded-lg' }),
                    stoichGrams && h('p', { className: 'text-[11px] font-bold text-teal-600 mt-1' }, stoichGrams + 'g = ' + (parseFloat(stoichGrams) / mass).toFixed(4) + ' mol')
                  ),
                  h('div', null,
                    h('label', { className: 'text-[11px] font-bold text-slate-600 block mb-1' }, 'Moles \u2192 Grams'),
                    h('input', { type: 'number', value: stoichMoles, onChange: function(e) { var m = parseFloat(e.target.value); upd('_stoichMoles', e.target.value); if (!isNaN(m) && mass > 0) upd('_stoichGrams', (m * mass).toFixed(4)); }, placeholder: 'moles', 'aria-label': 'Moles to convert to grams', className: 'w-full px-2 py-1 text-sm border rounded-lg' }),
                    stoichMoles && h('p', { className: 'text-[11px] font-bold text-teal-600 mt-1' }, stoichMoles + ' mol = ' + (parseFloat(stoichMoles) * mass).toFixed(4) + 'g')
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
            h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
              MOLECULES.map(function(mol, idx) {
                return h('button', { key: idx, onClick: function() { upd('_molIdx', idx); chemSound('click'); }, className: 'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ' + (molIdx === idx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-600') }, mol.formula + ' ' + mol.name);
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
                    els.push(h('line', { key: 'b' + bi + 'a', x1: a1.x + nx, y1: a1.y + ny, x2: a2.x + nx, y2: a2.y + ny, stroke: '#94a3b8', strokeWidth: 3 }));
                    els.push(h('line', { key: 'b' + bi + 'b', x1: a1.x - nx, y1: a1.y - ny, x2: a2.x - nx, y2: a2.y - ny, stroke: '#94a3b8', strokeWidth: 3 }));
                  } else {
                    els.push(h('line', { key: 'b' + bi, x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, stroke: '#94a3b8', strokeWidth: 3 }));
                  }
                  return els;
                }),
                // Atoms
                currentMol.atoms.map(function(atom, ai) {
                  var r = atom.el === 'H' ? 12 : 16;
                  var col = ATOM_COLORS[atom.el] || '#94a3b8';
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
                  h('p', { className: 'text-[11px] font-bold text-indigo-500' }, 'SHAPE'),
                  h('p', { className: 'text-[11px] font-bold text-indigo-700' }, currentMol.shape)
                ),
                h('div', { className: 'bg-indigo-50 rounded-lg p-2 text-center border border-indigo-100' },
                  h('p', { className: 'text-[11px] font-bold text-indigo-500' }, 'BOND ANGLE'),
                  h('p', { className: 'text-[11px] font-bold text-indigo-700' }, currentMol.angle)
                ),
                h('div', { className: 'bg-indigo-50 rounded-lg p-2 text-center border border-indigo-100' },
                  h('p', { className: 'text-[11px] font-bold text-indigo-500' }, 'POLARITY'),
                  h('p', { className: 'text-[11px] font-bold text-indigo-700' }, currentMol.polarity)
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
            h('div', { className: 'flex gap-2 mb-3' },
              [{ id: 'symbols', label: '\u26A0\uFE0F GHS Symbols' }, { id: 'emergencies', label: '\uD83D\uDEA8 Emergencies' }, { id: 'rules', label: '\uD83D\uDCCB Lab Rules' }].map(function(tab) {
                return h('button', { key: tab.id, onClick: function() { upd('_safetyTab', tab.id); }, className: 'px-3 py-1.5 text-[11px] font-bold rounded-lg border ' + (safetyTab === tab.id ? 'bg-red-700 text-white border-red-500' : 'bg-white text-slate-600 border-slate-200 hover:border-red-600') }, tab.label);
              })
            ),
            // GHS Symbols
            safetyTab === 'symbols' && h('div', { className: 'grid grid-cols-3 gap-2' },
              GHS_SYMBOLS.map(function(sym) {
                var isOpen = d._ghsOpen === sym.id;
                return h('button', { key: sym.id, type: 'button', onClick: function() { upd('_ghsOpen', isOpen ? null : sym.id); }, 'aria-expanded': isOpen, 'aria-label': sym.label + (isOpen ? ' (expanded)' : ' (collapsed)'), className: 'text-left cursor-pointer rounded-xl border p-2.5 transition-all w-full ' + (isOpen ? 'col-span-3 bg-red-50 border-red-600' : 'bg-white border-slate-200 hover:border-red-600') },
                  h('div', { className: 'flex items-center gap-2' },
                    h('div', { className: 'w-10 h-10 flex items-center justify-center rounded-lg text-2xl', style: { background: sym.color + '15', border: '2px solid ' + sym.color } }, sym.icon),
                    h('div', null,
                      h('p', { className: 'text-[11px] font-bold text-slate-700' }, sym.label),
                      !isOpen && h('p', { className: 'text-[11px] text-slate-600' }, sym.desc.substring(0, 40) + '...')
                    )
                  ),
                  isOpen && h('div', { className: 'mt-2 pt-2 border-t border-red-200' },
                    h('p', { className: 'text-xs text-slate-600 mb-1' }, sym.desc),
                    h('p', { className: 'text-[11px] text-red-600 font-bold' }, 'Examples: ' + sym.examples)
                  )
                );
              })
            ),
            // Emergencies
            safetyTab === 'emergencies' && h('div', null,
              h('div', { className: 'flex gap-1.5 mb-3' },
                EMERGENCIES.map(function(em, idx) {
                  return h('button', { key: idx, onClick: function() { updMulti({ _emergIdx: idx, _emergAnswer: null, _emergFeedback: null }); }, className: 'px-2 py-1 text-[11px] font-bold rounded-lg border ' + (emergIdx === idx ? 'bg-red-700 text-white border-red-500' : 'bg-white text-slate-600 border-slate-200') }, (idx + 1) + '. ' + em.title);
                })
              ),
              (function() {
                var em = EMERGENCIES[emergIdx];
                return h('div', { className: 'bg-white rounded-xl border p-3' },
                  h('div', { className: 'flex items-center gap-2 mb-2' },
                    h('span', { className: 'px-2 py-0.5 text-[11px] font-bold rounded-full ' + (em.urgency === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700') }, em.urgency),
                    h('p', { className: 'text-sm font-bold text-slate-700' }, em.title)
                  ),
                  h('p', { className: 'text-xs text-slate-600 mb-3' }, em.q),
                  h('div', { className: 'grid grid-cols-2 gap-2' },
                    em.opts.map(function(opt, oi) {
                      var isChosen = emergAnswer === oi;
                      var showResult = emergFeedback !== null;
                      return h('button', { key: oi, onClick: function() {
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
                      }, className: 'px-3 py-2 text-xs font-bold rounded-lg border transition-all ' + (showResult ? (opt.correct ? 'bg-emerald-100 text-emerald-700 border-emerald-600' : isChosen ? 'bg-red-100 text-red-700 border-red-600' : 'bg-slate-50 text-slate-600 border-slate-200') : 'bg-white text-slate-700 border-slate-200 hover:border-red-600') }, opt.text);
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
                    h('p', { className: 'text-[11px] text-slate-600' }, r.desc)
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
            h('div', { className: 'flex gap-2 mb-3' },
              ['easy', 'medium', 'hard'].map(function(diff) {
                var labels = { easy: '\uD83C\uDF31 Beginner', medium: '\u26A1 Intermediate', hard: '\uD83D\uDE80 Advanced' };
                var colors = { easy: 'emerald', medium: 'amber', hard: 'red' };
                return h('button', { 'aria-label': 'BONUS!', key: diff, onClick: function() { updMulti({ _chalDiff: diff, _chalIdx: 0, _chalScore: 0, _chalStreak: 0, _chalFeedback: null }); }, className: 'px-3 py-1.5 text-[11px] font-bold rounded-lg border-2 transition-all ' + (chalDiff === diff ? 'bg-' + colors[diff] + '-500 text-white border-' + colors[diff] + '-500 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-' + colors[diff] + '-300') }, labels[diff]);
              })
            ),
            h('div', { className: 'flex items-center gap-3 mb-3 bg-slate-50 rounded-lg p-2' },
              h('span', { className: 'text-xs font-bold text-slate-600' }, 'Q ' + (chalIdx + 1) + '/' + chalQuestions.length),
              h('span', { className: 'text-xs font-bold text-emerald-600' }, '\u2705 ' + chalScore),
              h('span', { className: 'text-xs font-bold text-amber-600' }, '\uD83D\uDD25 ' + chalStreak),
              chalStreak >= 3 && h('span', { className: 'text-[11px] font-bold text-fuchsia-600 animate-pulse' }, '\u2B50 BONUS!')
            ),
            chalIdx < chalQuestions.length ? h('div', { className: 'bg-white rounded-xl border p-4' },
              h('p', { className: 'text-sm font-bold text-slate-700 mb-3' }, chalQuestions[chalIdx].q),
              h('div', { className: 'grid grid-cols-2 gap-2' },
                chalQuestions[chalIdx].a.map(function(opt, i) {
                  return h('button', { key: i, onClick: function() {
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
                  }, className: 'px-3 py-2 text-xs font-bold rounded-lg border transition-all ' + (chalFeedback ? (i === chalQuestions[chalIdx].correct ? 'bg-emerald-100 text-emerald-700 border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200') : 'bg-white text-slate-700 border-slate-200 hover:border-lime-600 hover:bg-lime-50') }, opt);
                })
              ),
              chalFeedback && h('p', { className: 'mt-2 text-[11px] font-bold ' + (chalFeedback.indexOf('\u2705') !== -1 ? 'text-emerald-600' : 'text-red-500') }, chalFeedback)
            ) : h('div', { className: 'text-center bg-lime-50 rounded-xl border border-lime-200 p-4' },
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
            !battleActive && !battleResult && h('div', { className: 'text-center bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 p-6' },
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
                  h('p', { className: 'text-[11px] font-bold text-emerald-700 mt-0.5' }, battleHP + ' HP')
                ),
                h('div', { className: 'bg-red-50 rounded-xl p-2 border border-red-200' },
                  h('p', { className: 'text-[11px] font-bold text-red-600 mb-1' }, '\uD83D\uDCA5 Rogue Element'),
                  h('div', { className: 'w-full bg-slate-200 rounded-full h-3 overflow-hidden' },
                    h('div', { className: 'bg-red-500 h-full rounded-full transition-all duration-500', style: { width: Math.max(0, battleEnemyHP) + '%' } })
                  ),
                  h('p', { className: 'text-[11px] font-bold text-red-700 mt-0.5' }, battleEnemyHP + ' HP')
                )
              ),
              h('p', { className: 'text-[11px] font-bold text-slate-600 text-center mb-2' }, 'Round ' + (battleRound + 1) + '/' + BATTLE_QS.length),
              h('div', { className: 'bg-white rounded-xl border p-4' },
                h('p', { className: 'text-sm font-bold text-slate-700 mb-3' }, BATTLE_QS[battleRound].q),
                h('div', { className: 'grid grid-cols-2 gap-2' },
                  BATTLE_QS[battleRound].a.map(function(opt, i) {
                    return h('button', { key: i, onClick: function() {
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
                    }, className: 'px-3 py-2 text-xs font-bold rounded-lg border transition-all ' + (battleFeedback ? (i === BATTLE_QS[battleRound].correct ? 'bg-emerald-100 text-emerald-700 border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200') : 'bg-white text-slate-700 border-slate-200 hover:border-red-600 hover:bg-red-50') }, opt);
                  })
                ),
                battleFeedback && h('p', { className: 'mt-2 text-xs font-bold text-center ' + (battleFeedback.indexOf('\u2705') !== -1 ? 'text-emerald-600' : 'text-red-500') }, battleFeedback)
              )
            ),
            battleResult && h('div', { className: 'text-center bg-gradient-to-r ' + (battleResult === 'won' ? 'from-emerald-50 to-teal-50 border-emerald-200' : 'from-red-50 to-orange-50 border-red-200') + ' rounded-xl border p-6' },
              h('p', { className: 'text-4xl mb-2' }, battleResult === 'won' ? '\uD83C\uDFC6' : '\uD83D\uDCA5'),
              h('p', { className: 'text-lg font-bold ' + (battleResult === 'won' ? 'text-emerald-700' : 'text-red-700') }, battleResult === 'won' ? 'Victory! Compound Stabilized!' : 'Defeated! The element escaped...'),
              h('p', { className: 'text-xs text-slate-600 mt-1 mb-3' }, 'Score: ' + battleScore + '/' + BATTLE_QS.length),
              h('button', { 'aria-label': 'Battle Again', onClick: function() { chemSound('click'); updMulti({ _battleActive: true, _battleRound: 0, _battleHP: 100, _battleEnemyHP: 100, _battleFeedback: null, _battleScore: 0, _battleResult: null }); }, className: 'px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-lg' }, '\u2694\uFE0F Battle Again')
            ),
            battleActive && battleRound >= BATTLE_QS.length && !battleResult && h('div', { className: 'text-center bg-amber-50 rounded-xl border border-amber-200 p-6' },
              h('p', { className: 'text-lg font-bold text-amber-700' }, 'Battle Over! Score: ' + battleScore + '/' + BATTLE_QS.length),
              h('button', { 'aria-label': 'Try Again', onClick: function() { chemSound('click'); updMulti({ _battleActive: true, _battleRound: 0, _battleHP: 100, _battleEnemyHP: 100, _battleFeedback: null, _battleScore: 0, _battleResult: null }); }, className: 'mt-2 px-6 py-2 text-sm font-bold text-white bg-amber-700 rounded-lg' }, '\u2694\uFE0F Try Again')
            )
          ),

          // ════════════════════════════════════════
          // LEARN SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'learn' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, 'Explore chemistry concepts at your level. Content adapts to grade band: ' + band.toUpperCase()),
            h('div', { className: 'space-y-2' },
              LEARN_TOPICS.map(function(topic, idx) {
                var isOpen = learnTopic === idx;
                var content = topic[band] || topic.g35;
                return h('div', { key: idx, className: 'bg-white rounded-xl border ' + (isOpen ? 'border-lime-300 shadow-md' : 'border-slate-200') },
                  h('button', { onClick: function() { upd('_learnTopic', isOpen ? -1 : idx); }, className: 'w-full flex items-center gap-2 p-3 text-left' },
                    h('span', { className: 'text-xl' }, topic.icon),
                    h('span', { className: 'text-sm font-bold text-slate-700 flex-1' }, topic.title),
                    h('span', { className: 'text-xs text-slate-600' }, isOpen ? '\u25B2' : '\u25BC')
                  ),
                  isOpen && h('div', { className: 'px-3 pb-3' },
                    h('div', { className: 'bg-lime-50 rounded-lg p-3 border border-lime-100' },
                      h('p', { className: 'text-[11px] font-bold text-lime-600 uppercase tracking-wider mb-1' }, band.toUpperCase() + ' Level'),
                      h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, content)
                    ),
                    idx === 0 && h('button', { onClick: function() { upd('subtool', 'reactions'); }, className: 'mt-2 px-3 py-1 text-[11px] font-bold text-lime-600 bg-lime-50 border border-lime-600 rounded-lg hover:bg-lime-100' }, '\u2192 Explore Reaction Types'),
                    idx === 2 && h('button', { onClick: function() { upd('subtool', 'molecular'); }, className: 'mt-2 px-3 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-600 rounded-lg hover:bg-indigo-100' }, '\u2192 View Molecular Models'),
                    idx === 3 && h('button', { onClick: function() { upd('subtool', 'stoich'); }, className: 'mt-2 px-3 py-1 text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-600 rounded-lg hover:bg-teal-100' }, '\u2192 Try Stoichiometry Calculator'),
                    callTTS && h('button', { 'aria-label': 'Read Aloud', onClick: function() { callTTS(content); }, className: 'mt-2 ml-2 px-3 py-1 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-400 rounded-lg hover:bg-slate-100' }, '\uD83D\uDD0A Read Aloud')
                  )
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // ELEMENT ENCYCLOPEDIA SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'elementdb' && (function() {
            var allElements = ELEMENT_DB.concat(ELEMENT_DB_2).concat(ELEMENT_DB_3).concat(ELEMENT_DB_4);
            var elIdx = (d._elementIdx != null) ? d._elementIdx : 0;
            var elem = allElements[elIdx] || allElements[0];
            return h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' }, '118 elements deep profiles.'),
              h('div', { className: 'flex flex-wrap gap-1 mb-3 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg border' },
                allElements.slice(0, 60).map(function(e, i) {
                  var sel = elIdx === i;
                  return h('button', { key: e.z, onClick: function() { upd('_elementIdx', i); }, className: 'px-2 py-1 text-[10px] rounded font-bold ' + (sel ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border border-slate-300'), title: e.name }, e.z + '. ' + e.sym);
                })
              ),
              elem && h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4' },
                h('div', { className: 'text-2xl font-bold text-emerald-700' }, elem.sym + ' — ' + elem.name),
                h('div', { className: 'text-xs text-slate-600 font-mono mb-2' }, 'Z = ' + elem.z + ' · Mass: ' + elem.mass),
                elem.useCase && h('div', { className: 'text-xs text-slate-800 mb-1' }, 'Uses: ' + elem.useCase),
                elem.funFact && h('div', { className: 'text-xs italic text-purple-800 mb-1' }, elem.funFact),
                elem.danger && h('div', { className: 'text-xs text-red-700' }, 'Hazard: ' + elem.danger)
              )
            );
          })(),

          // ════════════════════════════════════════
          // PERIODIC TABLE SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'periodic' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, PERIODIC_INFO.intro),
            h('div', { className: 'mb-4' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, '🔢 Groups'),
              h('div', { className: 'space-y-2' },
                PERIODIC_INFO.groups.map(function(g, i) {
                  return h('div', { key: i, className: 'bg-white border border-emerald-200 rounded-lg p-3' },
                    h('div', { className: 'flex items-baseline justify-between mb-1' },
                      h('span', { className: 'text-sm font-bold text-emerald-700' }, g.name),
                      h('span', { className: 'text-xs text-slate-500 font-mono' }, 'Group ' + g.num)
                    ),
                    h('div', { className: 'text-xs text-slate-600 mb-1' }, 'Members: ', h('span', { className: 'font-mono text-slate-800' }, g.members)),
                    h('div', { className: 'text-xs text-slate-700 mb-1' }, g.traits),
                    h('div', { className: 'text-xs italic text-amber-700' }, '★ ' + g.notable)
                  );
                })
              )
            ),
            h('div', null,
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, '📈 Periodic Trends'),
              h('div', { className: 'space-y-2' },
                PERIODIC_INFO.trends.map(function(t, i) {
                  return h('div', { key: i, className: 'bg-cyan-50 border border-cyan-200 rounded-lg p-3' },
                    h('div', { className: 'text-sm font-bold text-cyan-700 mb-1' }, t.trend),
                    h('div', { className: 'text-xs text-slate-700' }, '→ Across period: ' + t.acrossPeriod),
                    h('div', { className: 'text-xs text-slate-700' }, '↓ Down group: ' + t.downGroup)
                  );
                })
              )
            )
          ),

          // ════════════════════════════════════════
          // FAMOUS REACTIONS SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'famous_reactions' && (function() {
            var rxnIdx = (d._rxnIdx != null) ? d._rxnIdx : 0;
            var r = FAMOUS_REACTIONS[rxnIdx];
            return h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' }, FAMOUS_REACTIONS.length + ' landmark chemical reactions.'),
              h('div', { className: 'flex flex-wrap gap-1 mb-3 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded' },
                FAMOUS_REACTIONS.map(function(rx, i) {
                  var sel = rxnIdx === i;
                  return h('button', { key: i, onClick: function() { upd('_rxnIdx', i); }, className: 'px-2 py-1 text-[10px] rounded font-bold ' + (sel ? 'bg-red-600 text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-red-50') }, '#' + (i + 1));
                })
              ),
              h('div', { className: 'bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-2' },
                h('div', { className: 'text-lg font-bold text-red-700' }, '🔥 ' + r.name),
                h('div', { className: 'bg-white border border-red-200 rounded p-3 font-mono text-sm text-slate-900' }, r.equation),
                h('div', { className: 'grid grid-cols-2 gap-2 text-xs' },
                  h('div', { className: 'bg-amber-50 border border-amber-200 rounded p-2' },
                    h('div', { className: 'font-bold text-amber-700' }, 'ΔH'),
                    h('div', { className: 'text-amber-900' }, r.delta)
                  ),
                  h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded p-2' },
                    h('div', { className: 'font-bold text-cyan-700' }, 'Type'),
                    h('div', { className: 'text-cyan-900' }, r.type)
                  )
                ),
                h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded p-2 text-xs' },
                  h('div', { className: 'font-bold text-emerald-700 mb-1' }, 'Context'),
                  h('div', { className: 'text-emerald-900 leading-relaxed' }, r.context)
                )
              )
            );
          })(),

          // ════════════════════════════════════════
          // INDUSTRIAL CHEMISTRY SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'industrial' && (function() {
            var iIdx = (d._industrialIdx != null) ? d._industrialIdx : 0;
            var p = INDUSTRIAL_CHEM.processes[iIdx];
            return h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' }, INDUSTRIAL_CHEM.intro),
              h('div', { className: 'flex flex-wrap gap-1 mb-3' },
                INDUSTRIAL_CHEM.processes.map(function(pr, i) {
                  var sel = iIdx === i;
                  return h('button', { key: i, onClick: function() { upd('_industrialIdx', i); }, className: 'px-2 py-1 text-[10px] rounded font-bold ' + (sel ? 'bg-orange-600 text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-orange-50') }, pr.name.split(' ')[0]);
                })
              ),
              h('div', { className: 'bg-orange-50 border-2 border-orange-300 rounded-xl p-4 space-y-2' },
                h('div', { className: 'text-lg font-bold text-orange-700' }, '🏭 ' + p.name),
                h('div', { className: 'text-xs italic text-slate-600' }, 'Invented: ' + p.invented),
                h('div', { className: 'bg-white border border-orange-200 rounded p-3 font-mono text-sm text-slate-900' }, p.reaction),
                h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded p-2 text-xs' },
                  h('div', { className: 'font-bold text-emerald-700 mb-1' }, 'Importance'),
                  h('div', { className: 'text-emerald-900 leading-relaxed' }, p.importance)
                ),
                h('div', { className: 'bg-red-50 border border-red-200 rounded p-2 text-xs' },
                  h('div', { className: 'font-bold text-red-700 mb-1' }, 'Drawbacks'),
                  h('div', { className: 'text-red-900' }, p.drawbacks)
                )
              )
            );
          })(),

          // ════════════════════════════════════════
          // AP CHEMISTRY SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'apchem' && (function() {
            var uIdx = (d._apUnit != null) ? d._apUnit : 0;
            var u = AP_CHEMISTRY.units[uIdx];
            return h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' }, AP_CHEMISTRY.intro),
              h('div', { className: 'flex flex-wrap gap-1 mb-3' },
                AP_CHEMISTRY.units.map(function(un, i) {
                  var sel = uIdx === i;
                  return h('button', { key: i, onClick: function() { upd('_apUnit', i); }, className: 'px-2 py-1 text-[10px] rounded font-bold ' + (sel ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-indigo-50') }, 'Unit ' + un.unit);
                })
              ),
              h('div', { className: 'bg-indigo-50 border-2 border-indigo-300 rounded-xl p-4 space-y-2' },
                h('div', { className: 'flex items-baseline justify-between gap-2' },
                  h('div', { className: 'text-lg font-bold text-indigo-700' }, 'Unit ' + u.unit + ': ' + u.title),
                  h('div', { className: 'text-xs text-amber-600 font-mono font-bold' }, u.weight)
                ),
                h('div', { className: 'bg-white border border-indigo-200 rounded p-3' },
                  h('div', { className: 'text-xs font-bold text-indigo-700 mb-2' }, 'Topics'),
                  h('ul', { className: 'space-y-1 list-disc list-inside text-xs text-slate-700' },
                    u.topics.map(function(t, i) { return h('li', { key: i }, t); })
                  )
                ),
                h('div', { className: 'bg-amber-50 border border-amber-200 rounded p-3 text-xs' },
                  h('div', { className: 'font-bold text-amber-700 mb-1' }, 'Study Tip'),
                  h('div', { className: 'text-amber-900 italic' }, u.tip)
                )
              ),
              h('div', { className: 'mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4' },
                h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, 'Exam Tips'),
                h('ul', { className: 'space-y-1 list-disc list-inside text-xs text-emerald-900' },
                  AP_CHEMISTRY.examTips.map(function(t, i) { return h('li', { key: i, className: 'leading-relaxed' }, t); })
                )
              )
            );
          })(),

          // ════════════════════════════════════════
          // LAB TECHNIQUES SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'lab_techniques' && (function() {
            var tIdx = (d._techIdx != null) ? d._techIdx : 0;
            var t = LAB_TECHNIQUES.techniques[tIdx];
            return h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' }, LAB_TECHNIQUES.intro),
              h('div', { className: 'flex flex-wrap gap-1 mb-3 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded' },
                LAB_TECHNIQUES.techniques.map(function(tc, i) {
                  var sel = tIdx === i;
                  return h('button', { key: i, onClick: function() { upd('_techIdx', i); }, className: 'px-2 py-1 text-[10px] rounded font-bold ' + (sel ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-blue-50') }, tc.name);
                })
              ),
              h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-xl p-4 space-y-2' },
                h('div', { className: 'text-lg font-bold text-blue-700' }, '🔬 ' + t.name),
                h('div', { className: 'bg-white border border-blue-200 rounded p-3 text-xs' },
                  h('div', { className: 'font-bold text-blue-700 mb-1' }, 'Purpose'),
                  h('div', { className: 'text-blue-900' }, t.purpose)
                ),
                h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded p-3 text-xs' },
                  h('div', { className: 'font-bold text-emerald-700 mb-2' }, 'Procedure'),
                  h('ol', { className: 'space-y-1 list-decimal list-inside text-emerald-900' },
                    t.steps.map(function(s, i) { return h('li', { key: i, className: 'leading-relaxed' }, s); })
                  )
                ),
                h('div', { className: 'bg-red-50 border border-red-200 rounded p-2 text-xs' },
                  h('div', { className: 'font-bold text-red-700 mb-1' }, 'Hazards'),
                  h('div', { className: 'text-red-900' }, t.danger)
                )
              )
            );
          })(),

          // ════════════════════════════════════════
          // FAMOUS CHEMISTS SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'chemists' && (function() {
            var cIdx = (d._chemistIdx != null) ? d._chemistIdx : 0;
            var c = FAMOUS_CHEMISTS[cIdx];
            return h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' }, '25 legendary chemists.'),
              h('div', { className: 'flex flex-wrap gap-1 mb-3 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded' },
                FAMOUS_CHEMISTS.map(function(cm, i) {
                  var sel = cIdx === i;
                  return h('button', { key: i, onClick: function() { upd('_chemistIdx', i); }, className: 'px-2 py-1 text-[10px] rounded font-bold ' + (sel ? 'bg-purple-600 text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-purple-50') }, cm.name.split(' ').pop());
                })
              ),
              h('div', { className: 'bg-purple-50 border-2 border-purple-300 rounded-xl p-4 space-y-2' },
                h('div', { className: 'flex items-baseline justify-between gap-2' },
                  h('div', { className: 'text-lg font-bold text-purple-700' }, c.name),
                  h('div', { className: 'text-xs text-slate-500 font-mono' }, c.years)
                ),
                h('div', { className: 'text-xs italic text-slate-600' }, c.country),
                h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded p-3 text-xs' },
                  h('div', { className: 'font-bold text-emerald-700 mb-1' }, 'Achievement'),
                  h('div', { className: 'text-emerald-900 leading-relaxed' }, c.achievement)
                ),
                h('div', { className: 'bg-amber-50 border border-amber-200 rounded p-3 text-xs' },
                  h('div', { className: 'font-bold text-amber-700 mb-1' }, 'Note'),
                  h('div', { className: 'text-amber-900 italic leading-relaxed' }, c.tragic)
                )
              )
            );
          })(),

          // ════════════════════════════════════════
          // HISTORY SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'history' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, 'Chemistry history: ' + CHEM_HISTORY.length + ' major events.'),
            h('div', { className: 'space-y-1' },
              CHEM_HISTORY.map(function(e, i) {
                return h('div', { key: i, className: 'flex items-start gap-3 bg-white border-l-4 border-amber-600 rounded-r p-2' },
                  h('div', { className: 'text-amber-700 font-mono font-bold text-xs w-20 flex-shrink-0' }, e.year < 0 ? Math.abs(e.year) + ' BCE' : e.year),
                  h('div', { className: 'text-xs text-slate-800 leading-relaxed' }, e.event)
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // ACIDS & BASES SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'acids_bases' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, ACIDS_BASES.intro),
            h('div', { className: 'space-y-3' },
              h('div', { className: 'bg-blue-50 border border-blue-300 rounded-xl p-3' },
                h('div', { className: 'text-sm font-bold text-blue-700 mb-2' }, 'Three Acid/Base Theories'),
                ACIDS_BASES.definitions.map(function(def, i) {
                  return h('div', { key: i, className: 'bg-white border border-blue-200 rounded p-2 mb-1 text-xs' },
                    h('div', { className: 'font-bold text-blue-700' }, def.theory),
                    h('div', { className: 'text-slate-700' }, 'Acid: ' + def.acid),
                    h('div', { className: 'text-slate-700' }, 'Base: ' + def.base),
                    h('div', { className: 'text-slate-600 italic font-mono' }, 'Example: ' + def.example)
                  );
                })
              ),
              h('div', { className: 'bg-rose-50 border border-rose-200 rounded-xl p-3' },
                h('div', { className: 'text-sm font-bold text-rose-700 mb-2' }, 'Strong Acids (Memorize)'),
                h('div', { className: 'flex flex-wrap gap-2' },
                  ACIDS_BASES.strongAcids.map(function(a, i) {
                    return h('span', { key: i, className: 'px-2 py-1 bg-white border border-rose-200 rounded font-mono text-xs text-rose-800 font-bold' }, a);
                  })
                )
              ),
              h('div', { className: 'bg-indigo-50 border border-indigo-200 rounded-xl p-3' },
                h('div', { className: 'text-sm font-bold text-indigo-700 mb-2' }, 'Strong Bases'),
                h('div', { className: 'flex flex-wrap gap-2' },
                  ACIDS_BASES.strongBases.map(function(b, i) {
                    return h('span', { key: i, className: 'px-2 py-1 bg-white border border-indigo-200 rounded font-mono text-xs text-indigo-800 font-bold' }, b);
                  })
                )
              ),
              h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3' },
                h('div', { className: 'text-sm font-bold text-amber-700 mb-2' }, 'Weak Acids'),
                h('div', { className: 'grid grid-cols-2 gap-1' },
                  ACIDS_BASES.weakAcids.map(function(a, i) {
                    return h('div', { key: i, className: 'flex justify-between bg-white border border-amber-200 rounded p-1 text-[10px]' },
                      h('span', { className: 'font-bold text-amber-800' }, a.name),
                      h('span', { className: 'font-mono text-slate-600' }, 'pKa ' + a.pKa)
                    );
                  })
                )
              ),
              h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-xl p-3' },
                h('div', { className: 'text-sm font-bold text-cyan-700 mb-2' }, 'Key Equations'),
                h('div', { className: 'space-y-1 text-xs' },
                  h('div', { className: 'bg-white border border-cyan-200 rounded p-2 font-mono' }, 'pH = -log[H+]'),
                  h('div', { className: 'bg-white border border-cyan-200 rounded p-2 font-mono' }, 'pH + pOH = 14'),
                  h('div', { className: 'bg-white border border-cyan-200 rounded p-2 font-mono' }, 'Kw = [H+][OH-] = 1e-14'),
                  h('div', { className: 'bg-white border border-cyan-200 rounded p-2 font-mono' }, 'pH = pKa + log([A-]/[HA])')
                )
              ),
              h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-3' },
                h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, 'Key Concepts'),
                ACIDS_BASES.keyConcepts.map(function(k, i) {
                  return h('div', { key: i, className: 'bg-white border border-emerald-200 rounded p-2 mb-1 text-xs' },
                    h('div', { className: 'font-bold text-emerald-700' }, k.concept),
                    h('div', { className: 'text-emerald-900' }, k.def)
                  );
                })
              )
            )
          ),

          // ════════════════════════════════════════
          // REDOX SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'redox' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, REDOX.intro),
            h('div', { className: 'bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-3' },
              h('div', { className: 'text-sm font-bold text-amber-700 mb-2' }, 'Memory Tricks'),
              h('div', { className: 'bg-white border border-amber-200 rounded p-2 text-xs mb-1' }, REDOX.oilrig),
              h('div', { className: 'bg-white border border-amber-200 rounded p-2 text-xs' }, REDOX.leorigers)
            ),
            h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-cyan-700 mb-2' }, 'Oxidation Number Rules'),
              h('ol', { className: 'space-y-1 list-decimal list-inside text-xs text-cyan-900' },
                REDOX.rules.map(function(r, i) { return h('li', { key: i }, r); })
              )
            ),
            h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, 'Half-Reactions'),
              h('div', { className: 'space-y-1' },
                REDOX.halfReactions.map(function(hr, i) {
                  return h('div', { key: i, className: 'bg-white border border-emerald-200 rounded p-2 text-xs' },
                    h('div', { className: 'font-bold text-emerald-700' }, hr.name),
                    h('div', { className: 'font-mono text-slate-800' }, hr.reaction + ' (E = ' + hr.E + ')')
                  );
                })
              )
            ),
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-purple-700 mb-2' }, 'Electrochemical Cells'),
              REDOX.cells.map(function(c, i) {
                return h('div', { key: i, className: 'bg-white border border-purple-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-purple-700' }, c.type),
                  h('div', { className: 'text-slate-800' }, c.description),
                  h('div', { className: 'text-slate-600 italic font-mono' }, c.example)
                );
              })
            ),
            h('div', { className: 'bg-orange-50 border border-orange-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-orange-700 mb-2' }, 'Common Batteries'),
              REDOX.batteries.map(function(b, i) {
                return h('div', { key: i, className: 'bg-white border border-orange-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'flex justify-between mb-1' },
                    h('span', { className: 'font-bold text-orange-700' }, b.name),
                    h('span', { className: 'font-mono text-amber-700' }, b.voltage)
                  ),
                  h('div', { className: 'text-slate-800' }, b.uses + ' · ' + b.mech)
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // ORGANIC SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'organic' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, ORGANIC_CHEM.intro),
            h('div', { className: 'bg-emerald-50 border border-emerald-300 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, 'Functional Groups'),
              ORGANIC_CHEM.functionalGroups.map(function(fg, i) {
                return h('div', { key: i, className: 'bg-white border border-emerald-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-emerald-700' }, fg.name),
                  h('div', { className: 'font-mono text-slate-800 mb-1' }, fg.formula),
                  h('div', { className: 'text-slate-600' }, fg.example),
                  h('div', { className: 'text-emerald-900 italic' }, fg.behavior)
                );
              })
            ),
            h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-cyan-700 mb-2' }, 'IUPAC Naming Rules'),
              h('ol', { className: 'space-y-1 list-decimal list-inside text-xs text-cyan-900' },
                ORGANIC_CHEM.namingRules.map(function(r, i) { return h('li', { key: i, className: 'leading-relaxed' }, r); })
              )
            ),
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-purple-700 mb-2' }, 'Major Reaction Types'),
              ORGANIC_CHEM.reactions.map(function(r, i) {
                return h('div', { key: i, className: 'bg-white border border-purple-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-purple-700' }, r.type),
                  h('div', { className: 'text-purple-900 italic' }, r.mechanism),
                  h('div', { className: 'font-mono text-slate-800' }, r.example)
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // BIOCHEMISTRY SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'biochem' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, BIOCHEM.intro),
            h('div', { className: 'bg-pink-50 border border-pink-300 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-pink-700 mb-2' }, 'Four Macromolecule Classes'),
              BIOCHEM.macromolecules.map(function(m, i) {
                return h('div', { key: i, className: 'bg-white border border-pink-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-pink-700' }, m.type),
                  h('div', { className: 'text-slate-700' }, 'Monomer: ' + m.monomer),
                  h('div', { className: 'text-slate-700' }, 'Bond: ' + m.bond),
                  h('div', { className: 'text-emerald-700' }, m.function),
                  h('div', { className: 'text-slate-600 italic' }, m.example)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-amber-700 mb-2' }, '20 Standard Amino Acids'),
              h('div', { className: 'grid grid-cols-2 gap-1' },
                BIOCHEM.aminoAcids.map(function(aa, i) {
                  return h('div', { key: i, className: 'bg-white border border-amber-200 rounded p-1 text-[10px]' },
                    h('div', { className: 'flex justify-between' },
                      h('span', { className: 'font-bold text-amber-700' }, aa.code),
                      h('span', { className: 'text-slate-500' }, aa.charged)
                    ),
                    h('div', { className: 'text-slate-700' }, aa.name)
                  );
                })
              )
            ),
            h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-cyan-700 mb-2' }, 'DNA + RNA Basics'),
              h('div', { className: 'bg-white border border-cyan-200 rounded p-2 text-xs mb-1' }, BIOCHEM.dna),
              h('div', { className: 'bg-white border border-cyan-200 rounded p-2 text-xs mb-1' }, BIOCHEM.rna),
              h('div', { className: 'bg-white border border-cyan-200 rounded p-2 text-xs font-bold text-cyan-700' }, BIOCHEM.centralDogma)
            ),
            h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, 'Key Metabolic Pathways'),
              BIOCHEM.metabolism.map(function(p, i) {
                return h('div', { key: i, className: 'bg-white border border-emerald-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-emerald-700' }, p.pathway),
                  h('div', { className: 'text-slate-700' }, 'In: ' + p.input),
                  h('div', { className: 'text-slate-700' }, 'Out: ' + p.output),
                  h('div', { className: 'text-amber-700 italic' }, p.location)
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // THERMODYNAMICS SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'thermo' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, THERMO.intro),
            h('div', { className: 'bg-red-50 border border-red-300 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-red-700 mb-2' }, 'Four Laws of Thermodynamics'),
              THERMO.laws.map(function(l, i) {
                return h('div', { key: i, className: 'bg-white border border-red-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-red-700' }, l.name + ' (Law ' + l.number + ')'),
                  h('div', { className: 'text-slate-800' }, l.statement),
                  h('div', { className: 'text-amber-700 italic' }, l.implication)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-amber-700 mb-2' }, 'Key Concepts'),
              THERMO.concepts.map(function(c, i) {
                return h('div', { key: i, className: 'bg-white border border-amber-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-amber-700' }, c.name),
                  h('div', { className: 'text-slate-800' }, c.def),
                  h('div', { className: 'text-cyan-700 italic' }, c.sign)
                );
              })
            ),
            h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, 'Example Reactions'),
              THERMO.examples.map(function(e, i) {
                return h('div', { key: i, className: 'bg-white border border-emerald-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-mono font-bold text-slate-800' }, e.reaction),
                  h('div', { className: 'flex gap-3 text-[10px]' },
                    h('span', { className: 'text-rose-700' }, 'ΔH = ' + e.H),
                    h('span', { className: 'text-purple-700' }, 'ΔG = ' + e.G),
                    h('span', { className: 'text-emerald-700' }, e.spontaneous)
                  )
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // KINETICS SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'kinetics' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, KINETICS.intro),
            h('div', { className: 'bg-cyan-50 border border-cyan-300 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-cyan-700 mb-2' }, 'Factors Affecting Rate'),
              KINETICS.factors.map(function(f, i) {
                return h('div', { key: i, className: 'bg-white border border-cyan-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-cyan-700' }, f.factor),
                  h('div', { className: 'text-slate-800' }, f.effect)
                );
              })
            ),
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-purple-700 mb-2' }, 'Rate Laws'),
              KINETICS.rateLaws.map(function(r, i) {
                return h('div', { key: i, className: 'bg-white border border-purple-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-purple-700' }, r.type),
                  h('div', { className: 'font-mono text-slate-800' }, 'Rate: ' + r.equation),
                  h('div', { className: 'font-mono text-slate-700' }, 'Integrated: ' + r.integrated),
                  h('div', { className: 'font-mono text-amber-700' }, 'Half-life: ' + r.halfLife)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-amber-700 mb-2' }, 'Arrhenius Equation'),
              h('div', { className: 'bg-white border border-amber-200 rounded p-2 font-mono text-xs' }, KINETICS.arrhenius)
            ),
            h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, 'Reaction Mechanisms'),
              KINETICS.mechanisms.map(function(m, i) {
                return h('div', { key: i, className: 'bg-white border border-emerald-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-emerald-700' }, m.type),
                  h('div', { className: 'text-slate-800' }, m.desc)
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // EQUILIBRIUM SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'equilibrium' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, EQUILIBRIUM.intro),
            h('div', { className: 'bg-indigo-50 border border-indigo-300 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-indigo-700 mb-2' }, 'Key Concepts'),
              EQUILIBRIUM.concepts.map(function(c, i) {
                return h('div', { key: i, className: 'bg-white border border-indigo-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-indigo-700' }, c.name),
                  h('div', { className: 'text-slate-800' }, c.def),
                  h('div', { className: 'text-amber-700 italic' }, c.interpret)
                );
              })
            ),
            h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, 'Example Equilibria'),
              EQUILIBRIUM.examples.map(function(e, i) {
                return h('div', { key: i, className: 'bg-white border border-emerald-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-mono font-bold text-slate-800' }, e.reaction),
                  h('div', { className: 'text-amber-700' }, 'Keq: ' + e.Keq),
                  h('div', { className: 'text-slate-700 italic' }, e.notes)
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // GAS LAWS SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'gas_laws' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, GAS_LAWS.intro),
            h('div', { className: 'bg-blue-50 border border-blue-300 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-blue-700 mb-2' }, 'Gas Laws'),
              GAS_LAWS.laws.map(function(l, i) {
                return h('div', { key: i, className: 'bg-white border border-blue-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-blue-700' }, l.name),
                  h('div', { className: 'font-mono text-slate-800' }, l.equation),
                  h('div', { className: 'text-slate-700' }, l.desc),
                  h('div', { className: 'text-amber-700 italic text-[10px]' }, l.who)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-amber-700 mb-2' }, 'Constants'),
              GAS_LAWS.constants.map(function(c, i) {
                return h('div', { key: i, className: 'bg-white border border-amber-200 rounded p-2 mb-1 text-xs flex justify-between' },
                  h('span', { className: 'font-bold text-amber-700' }, c.name),
                  h('span', { className: 'font-mono text-slate-800' }, c.value)
                );
              })
            ),
            h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, 'Kinetic Molecular Theory'),
              h('ol', { className: 'space-y-1 list-decimal list-inside text-xs text-emerald-900' },
                GAS_LAWS.kineticTheory.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ),
            h('div', { className: 'bg-rose-50 border border-rose-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-rose-700 mb-2' }, 'Deviations from Ideal'),
              h('div', { className: 'text-xs text-rose-900 leading-relaxed' }, GAS_LAWS.deviations)
            )
          ),

          // ════════════════════════════════════════
          // SOLUTIONS SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'solutions' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, SOLUTIONS.intro),
            h('div', { className: 'bg-cyan-50 border border-cyan-300 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-cyan-700 mb-2' }, 'Concentration Units'),
              SOLUTIONS.concentration.map(function(c, i) {
                return h('div', { key: i, className: 'bg-white border border-cyan-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-cyan-700' }, c.unit),
                  h('div', { className: 'text-slate-800' }, c.def),
                  h('div', { className: 'font-mono text-amber-700' }, c.formula),
                  h('div', { className: 'text-emerald-700 italic' }, 'Use: ' + c.useFor)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-amber-700 mb-2' }, 'Solubility Rules'),
              h('ul', { className: 'space-y-1 list-disc list-inside text-xs text-amber-900' },
                SOLUTIONS.solubilityRules.map(function(r, i) { return h('li', { key: i }, r); })
              )
            ),
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-purple-700 mb-2' }, 'Colligative Properties'),
              SOLUTIONS.colligative.map(function(c, i) {
                return h('div', { key: i, className: 'bg-white border border-purple-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-purple-700' }, c.property),
                  h('div', { className: 'text-slate-800' }, c.law),
                  h('div', { className: 'font-mono text-amber-700' }, c.formula)
                );
              })
            ),
            h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, 'Factors Affecting Solubility'),
              h('ul', { className: 'space-y-1 list-disc list-inside text-xs text-emerald-900' },
                SOLUTIONS.factors.map(function(f, i) { return h('li', { key: i }, f); })
              )
            )
          ),

          // ════════════════════════════════════════
          // NUCLEAR SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'nuclear' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, NUCLEAR.intro),
            h('div', { className: 'bg-yellow-50 border-2 border-yellow-400 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-amber-700 mb-2' }, 'Types of Radiation'),
              NUCLEAR.radioactivity.map(function(r, i) {
                return h('div', { key: i, className: 'bg-white border border-amber-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'flex justify-between font-bold text-amber-700' },
                    h('span', null, r.type),
                    h('span', null, 'Charge: ' + r.charge)
                  ),
                  h('div', { className: 'text-slate-800' }, r.particle),
                  h('div', { className: 'text-cyan-700' }, 'Penetration: ' + r.penetration),
                  h('div', { className: 'text-rose-700' }, 'Danger: ' + r.danger),
                  h('div', { className: 'text-purple-700 italic' }, 'Examples: ' + r.examples)
                );
              })
            ),
            h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-cyan-700 mb-2' }, 'Common Half-Lives'),
              NUCLEAR.halfLives.map(function(h2, i) {
                return h('div', { key: i, className: 'bg-white border border-cyan-200 rounded p-2 mb-1 text-xs flex justify-between' },
                  h('span', { className: 'font-mono font-bold text-cyan-700' }, h2.isotope + ' (' + h2.halflife + ')'),
                  h('span', { className: 'text-slate-700' }, h2.use)
                );
              })
            ),
            h('div', { className: 'bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-rose-700 mb-2' }, 'Fission'),
              h('div', { className: 'text-xs text-rose-900 leading-relaxed' }, NUCLEAR.fission)
            ),
            h('div', { className: 'bg-orange-50 border border-orange-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-orange-700 mb-2' }, 'Fusion'),
              h('div', { className: 'text-xs text-orange-900 leading-relaxed' }, NUCLEAR.fusion)
            ),
            h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, 'Medical Uses'),
              NUCLEAR.medical.map(function(m, i) {
                return h('div', { key: i, className: 'bg-white border border-emerald-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-emerald-700' }, m.use),
                  h('div', { className: 'text-slate-800 font-mono' }, m.isotope),
                  h('div', { className: 'text-slate-700' }, m.desc)
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // ENVIRONMENTAL SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'environmental' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, ENV_CHEM.intro),
            h('div', { className: 'bg-green-50 border border-green-300 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-green-700 mb-2' }, 'Environmental Topics'),
              ENV_CHEM.topics.map(function(t, i) {
                return h('div', { key: i, className: 'bg-white border border-green-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-green-700' }, t.topic),
                  h('div', { className: 'text-slate-800' }, 'Mechanism: ' + t.mechanism),
                  h('div', { className: 'text-amber-700' }, 'Status: ' + t.current),
                  h('div', { className: 'text-emerald-700 italic' }, 'Solutions: ' + t.solutions)
                );
              })
            ),
            h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, '12 Principles of Green Chemistry'),
              h('ol', { className: 'space-y-1 list-decimal list-inside text-xs text-emerald-900' },
                ENV_CHEM.greenChemistry.map(function(g, i) { return h('li', { key: i, className: 'leading-relaxed' }, g); })
              )
            )
          ),

          // ════════════════════════════════════════
          // PHARMA SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'pharma' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, PHARMA.intro),
            h('div', { className: 'bg-pink-50 border border-pink-300 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-pink-700 mb-2' }, 'Drug Development Process'),
              PHARMA.process.map(function(s, i) {
                return h('div', { key: i, className: 'bg-white border border-pink-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'flex justify-between mb-1' },
                    h('span', { className: 'font-bold text-pink-700' }, (i + 1) + '. ' + s.stage),
                    h('span', { className: 'text-amber-700 font-mono text-[10px]' }, s.time)
                  ),
                  h('div', { className: 'text-slate-800' }, s.desc)
                );
              })
            ),
            h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-cyan-700 mb-2' }, 'Famous Drugs'),
              PHARMA.famousDrugs.map(function(d, i) {
                return h('div', { key: i, className: 'bg-white border border-cyan-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-cyan-700' }, d.name + ' (' + d.invented + ')'),
                  h('div', { className: 'text-slate-700' }, d.chemical),
                  h('div', { className: 'text-amber-700' }, 'Target: ' + d.target),
                  h('div', { className: 'text-emerald-700 italic' }, d.notes)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-amber-700 mb-2' }, 'Common Drug Classes'),
              PHARMA.drugClasses.map(function(c, i) {
                return h('div', { key: i, className: 'bg-white border border-amber-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-amber-700' }, c.class),
                  h('div', { className: 'text-slate-700' }, c.examples),
                  h('div', { className: 'text-cyan-700' }, 'Use: ' + c.use),
                  h('div', { className: 'text-purple-700 italic' }, c.mechanism)
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // MATERIALS SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'materials' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, MATERIALS.intro),
            h('div', { className: 'bg-stone-50 border border-stone-300 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-stone-700 mb-2' }, 'Material Classes'),
              MATERIALS.classes.map(function(c, i) {
                return h('div', { key: i, className: 'bg-white border border-stone-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-stone-700' }, c.class),
                  h('div', { className: 'text-slate-800' }, c.properties),
                  h('div', { className: 'text-amber-700' }, 'Examples: ' + c.examples),
                  h('div', { className: 'text-emerald-700 italic' }, 'Uses: ' + c.uses)
                );
              })
            ),
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-purple-700 mb-2' }, 'Common Polymers'),
              MATERIALS.polymers.map(function(p, i) {
                return h('div', { key: i, className: 'bg-white border border-purple-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-purple-700' }, p.type),
                  h('div', { className: 'text-slate-700' }, 'Monomer: ' + p.monomer + ' · Density: ' + p.density),
                  h('div', { className: 'text-cyan-700' }, 'Uses: ' + p.uses),
                  h('div', { className: 'text-amber-700 font-mono text-[10px]' }, 'Scale: ' + p.amount)
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // FOOD CHEM SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'food_chem' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, FOOD_CHEM.intro),
            h('div', { className: 'bg-orange-50 border border-orange-300 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-orange-700 mb-2' }, 'Key Reactions in Cooking'),
              FOOD_CHEM.reactions.map(function(r, i) {
                return h('div', { key: i, className: 'bg-white border border-orange-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-orange-700' }, r.name),
                  h('div', { className: 'text-slate-800' }, r.what),
                  h('div', { className: 'text-amber-700' }, 'Examples: ' + r.examples),
                  h('div', { className: 'text-cyan-700 italic' }, 'Controlled by: ' + r.controlled)
                );
              })
            ),
            h('div', { className: 'bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-yellow-700 mb-2' }, 'Food Additives'),
              FOOD_CHEM.additives.map(function(a, i) {
                return h('div', { key: i, className: 'bg-white border border-yellow-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-yellow-700' }, a.name),
                  h('div', { className: 'text-slate-800' }, a.examples),
                  h('div', { className: 'text-emerald-700 italic' }, 'Purpose: ' + a.purpose)
                );
              })
            ),
            h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, 'Nutrient Macros'),
              FOOD_CHEM.nutrition.map(function(n, i) {
                return h('div', { key: i, className: 'bg-white border border-emerald-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'flex justify-between' },
                    h('span', { className: 'font-bold text-emerald-700' }, n.nutrient),
                    h('span', { className: 'font-mono text-amber-700' }, n.calories)
                  ),
                  h('div', { className: 'text-slate-700' }, n.sources),
                  h('div', { className: 'text-cyan-700 italic' }, n.function)
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // FORENSIC SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'forensic' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, FORENSIC.intro),
            h('div', { className: 'bg-slate-50 border border-slate-300 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-slate-700 mb-2' }, 'Forensic Techniques'),
              FORENSIC.techniques.map(function(t, i) {
                return h('div', { key: i, className: 'bg-white border border-slate-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-slate-700' }, t.name),
                  h('div', { className: 'text-slate-800' }, t.what),
                  h('div', { className: 'text-amber-700' }, 'Accuracy: ' + t.accuracy),
                  h('div', { className: 'text-cyan-700 italic' }, 'Uses: ' + t.uses)
                );
              })
            ),
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-purple-700 mb-2' }, 'Famous Cases'),
              FORENSIC.famousCases.map(function(c, i) {
                return h('div', { key: i, className: 'bg-white border border-purple-200 rounded p-2 mb-1 text-xs' },
                  h('div', { className: 'font-bold text-purple-700' }, c.case),
                  h('div', { className: 'text-slate-800' }, 'Evidence: ' + c.evidence),
                  h('div', { className: 'text-emerald-700 italic' }, c.outcome)
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // CAREERS SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'careers' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, '20+ chemistry careers spanning research, industry, education, regulation.'),
            CHEM_CAREERS.map(function(c, i) {
              return h('div', { key: i, className: 'bg-white border border-amber-300 rounded p-2 mb-1 text-xs' },
                h('div', { className: 'flex justify-between mb-1' },
                  h('span', { className: 'font-bold text-amber-700' }, c.title),
                  h('span', { className: 'font-mono text-emerald-700' }, c.salary)
                ),
                h('div', { className: 'text-slate-800' }, 'Education: ' + c.education),
                h('div', { className: 'text-cyan-700' }, 'Path: ' + c.path),
                h('div', { className: 'text-purple-700 italic' }, 'Employers: ' + c.employers)
              );
            })
          ),

          // ════════════════════════════════════════
          // LAB KITS SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'lab_kits' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, '15 ready-to-use classroom labs for K-12.'),
            LAB_KITS.map(function(k, i) {
              return h('div', { key: i, className: 'bg-white border border-blue-300 rounded p-2 mb-1 text-xs' },
                h('div', { className: 'flex justify-between mb-1' },
                  h('span', { className: 'font-bold text-blue-700' }, k.title),
                  h('span', { className: 'font-mono text-amber-700 text-[10px]' }, k.grade + ' · ' + k.duration)
                ),
                h('div', { className: 'text-slate-800' }, 'Concept: ' + k.concept),
                h('div', { className: 'text-cyan-700' }, 'Materials: ' + k.materials),
                h('details', { className: 'mt-1' },
                  h('summary', { className: 'cursor-pointer text-emerald-700 font-bold' }, 'Steps'),
                  h('ol', { className: 'mt-1 list-decimal list-inside space-y-1' },
                    k.steps.map(function(s, si) { return h('li', { key: si, className: 'text-slate-700' }, s); })
                  )
                )
              );
            })
          ),

          // ════════════════════════════════════════
          // MYTHBUSTERS SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'mythbusters' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, 'Common chemistry misconceptions debunked.'),
            CHEM_MYTHS.map(function(m, i) {
              return h('div', { key: i, className: 'bg-white border border-rose-300 rounded p-2 mb-2 text-xs' },
                h('div', { className: 'flex items-start gap-2 mb-1' },
                  h('span', { className: 'font-bold text-amber-700 flex-shrink-0' }, 'MYTH:'),
                  h('span', { className: 'text-amber-900' }, m.myth)
                ),
                h('div', { className: 'flex items-start gap-2' },
                  h('span', { className: 'font-bold text-emerald-700 flex-shrink-0' }, 'TRUTH:'),
                  h('span', { className: 'text-emerald-900' }, m.truth)
                )
              );
            })
          ),

          // ════════════════════════════════════════
          // RECORDS SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'records' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, 'Chemistry superlatives.'),
            h('div', { className: 'grid gap-2' },
              CHEM_RECORDS.map(function(r, i) {
                return h('div', { key: i, className: 'bg-white border border-yellow-300 rounded p-2 text-xs' },
                  h('div', { className: 'flex justify-between mb-1' },
                    h('span', { className: 'font-bold text-yellow-700' }, r.category),
                    h('span', { className: 'font-mono text-amber-800 text-[10px]' }, r.value)
                  ),
                  h('div', { className: 'text-slate-800 font-bold' }, r.record),
                  h('div', { className: 'text-slate-700 italic text-[10px]' }, r.notes)
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // GLOSSARY SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'glossary' && (function() {
            var glossSearch = d._glossSearch || '';
            var filtered = glossSearch ? CHEM_GLOSSARY.filter(function(g) {
              return g.term.toLowerCase().indexOf(glossSearch.toLowerCase()) !== -1 || g.def.toLowerCase().indexOf(glossSearch.toLowerCase()) !== -1;
            }) : CHEM_GLOSSARY;
            return h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' }, CHEM_GLOSSARY.length + ' chemistry terms.'),
              h('div', { className: 'mb-3' },
                h('input', { type: 'text', placeholder: 'Search terms...', value: glossSearch, onChange: function(e) { upd('_glossSearch', e.target.value); }, className: 'w-full px-3 py-2 text-sm border-2 border-indigo-300 rounded-lg' })
              ),
              h('div', { className: 'grid md:grid-cols-2 gap-2' },
                filtered.map(function(g, i) {
                  return h('div', { key: i, className: 'bg-white border border-indigo-200 rounded p-2 text-xs' },
                    h('div', { className: 'font-bold text-indigo-700' }, g.term),
                    h('div', { className: 'text-slate-800' }, g.def)
                  );
                })
              )
            );
          })(),

          // ════════════════════════════════════════
          // DATA TABLES SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'datatables' && h('div', null,
            h('p', { className: 'text-xs text-slate-600 italic mb-3' }, 'Reference tables for chemistry.'),
            h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-cyan-700 mb-2' }, 'Physical Constants'),
              CHEM_DATA_TABLES.constants.map(function(c, i) {
                return h('div', { key: i, className: 'bg-white border border-cyan-200 rounded p-2 mb-1 text-xs flex justify-between' },
                  h('span', { className: 'font-bold text-cyan-700' }, c.name + ' (' + c.symbol + ')'),
                  h('span', { className: 'font-mono text-slate-800' }, c.value)
                );
              })
            ),
            h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-amber-700 mb-2' }, 'Unit Conversions'),
              CHEM_DATA_TABLES.conversions.map(function(c, i) {
                return h('div', { key: i, className: 'bg-white border border-amber-200 rounded p-2 mb-1 text-xs flex justify-between' },
                  h('span', { className: 'text-slate-700' }, c.from),
                  h('span', { className: 'font-mono text-amber-700' }, c.to)
                );
              })
            ),
            h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-purple-700 mb-2' }, 'Average Bond Energies'),
              h('div', { className: 'grid grid-cols-2 gap-1' },
                CHEM_DATA_TABLES.bondEnergies.map(function(b, i) {
                  return h('div', { key: i, className: 'bg-white border border-purple-200 rounded p-1 text-[10px] flex justify-between' },
                    h('span', { className: 'font-mono font-bold text-purple-700' }, b.bond),
                    h('span', { className: 'text-slate-700' }, b.energy)
                  );
                })
              )
            ),
            h('div', { className: 'bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3' },
              h('div', { className: 'text-sm font-bold text-rose-700 mb-2' }, 'Electronegativity Values'),
              h('div', { className: 'grid grid-cols-4 gap-1' },
                CHEM_DATA_TABLES.electronegativity.map(function(e, i) {
                  return h('div', { key: i, className: 'bg-white border border-rose-200 rounded p-1 text-[10px] flex justify-between' },
                    h('span', { className: 'font-mono font-bold text-rose-700' }, e.elem),
                    h('span', { className: 'text-slate-700' }, e.value)
                  );
                })
              )
            ),
            h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-3' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, 'Specific Heat Capacities'),
              CHEM_DATA_TABLES.specificHeats.map(function(s, i) {
                return h('div', { key: i, className: 'bg-white border border-emerald-200 rounded p-2 mb-1 text-xs flex justify-between' },
                  h('span', { className: 'text-emerald-700' }, s.substance),
                  h('span', { className: 'font-mono text-slate-800' }, s.c)
                );
              })
            )
          ),

          // ════════════════════════════════════════
          // FINALE SUB-TOOL
          // ════════════════════════════════════════
          subtool === 'finale' && h('div', null,
            h('div', { className: 'bg-gradient-to-br from-yellow-100 to-amber-100 border-2 border-amber-400 rounded-xl p-6 text-center mb-4' },
              h('div', { className: 'text-6xl mb-2' }, '🎆'),
              h('div', { className: 'text-2xl font-bold text-amber-800 mb-1' }, 'Chemistry Mastery Achievement'),
              h('div', { className: 'text-sm text-amber-700 italic' }, '36 sub-tools · 118 elements · Hundreds of facts')
            ),
            h('div', { className: 'bg-white border border-amber-300 rounded-xl p-4 mb-3' },
              h('div', { className: 'text-sm font-bold text-amber-700 mb-2' }, '📚 What You Now Have Access To'),
              h('ul', { className: 'space-y-1 list-disc list-inside text-xs text-slate-800' },
                [
                  'Balance chemical equations with 12 presets across 3 difficulty tiers',
                  'Explore 5 reaction types with 15+ example reactions',
                  'Stoichiometry calculator + molar mass tool',
                  'Molecular ball-and-stick viewer',
                  'GHS lab safety symbols + emergency response',
                  '70+ challenge questions in 3 difficulty tiers',
                  'Element Battle game with chemistry questions',
                  'Grade-banded learn content (K-2, 3-5, 6-8, 9-12)',
                  'Element Encyclopedia: 118 elements with deep profiles',
                  'Periodic Table Atlas: groups + periodic trends',
                  '40+ Famous Reactions with mechanism + context',
                  'Industrial Chemistry: 18 major processes',
                  'AP Chemistry curriculum: 9 units + exam tips',
                  '30+ Lab Techniques with steps + hazards',
                  '25 Famous Chemists with biographies',
                  'Chemistry History: 39 major events',
                  'Acids & Bases: theories, strong/weak, pH, buffers',
                  'Redox: half-reactions, cells, batteries',
                  'Organic Chemistry: functional groups + reactions',
                  'Biochemistry: macromolecules, amino acids, DNA, metabolism',
                  'Thermodynamics: 4 laws, key concepts, examples',
                  'Kinetics: rate laws, mechanisms, Arrhenius',
                  'Equilibrium: Keq, Le Chatelier, Ksp',
                  'Gas Laws: 6 fundamental laws + kinetic theory',
                  'Solutions: concentration, solubility, colligative',
                  'Nuclear Chemistry: radiation types, half-lives, medical uses',
                  'Environmental Chemistry: 9 major topics + green chemistry',
                  'Pharmaceutical Chemistry: drug development + famous drugs',
                  'Materials Science: 8 classes + polymers',
                  'Food Chemistry: cooking reactions + additives',
                  'Forensic Chemistry: techniques + famous cases',
                  '20+ Chemistry Careers with salary + path',
                  '15 Lab Kits / Lesson Plans for K-12',
                  '17 Chemistry Mythbusters',
                  '20 Chemistry Records',
                  '200+ Glossary terms',
                  'Reference Data Tables: constants, conversions, bonds'
                ].map(function(item, i) { return h('li', { key: i, className: 'leading-relaxed' }, item); })
              )
            ),
            h('div', { className: 'bg-emerald-50 border border-emerald-300 rounded-xl p-4 mb-3' },
              h('div', { className: 'text-sm font-bold text-emerald-700 mb-2' }, '🎯 Next Steps'),
              h('ul', { className: 'space-y-1 list-disc list-inside text-xs text-emerald-900' },
                [
                  'Try a hands-on lab from the Lab Kits',
                  'Take the Challenge quiz',
                  'Battle elements in Element Battle',
                  'Look up your favorite element',
                  'Read about a famous chemist',
                  'Practice balancing an equation',
                  'Share what you learned with a friend'
                ].map(function(item, i) { return h('li', { key: i }, item); })
              )
            ),
            h('div', { className: 'bg-purple-50 border border-purple-300 rounded-xl p-4 text-center' },
              h('div', { className: 'text-base font-bold text-purple-700 mb-2' }, '✨ A Closing Thought'),
              h('div', { className: 'text-sm text-purple-900 italic leading-relaxed' },
                'Chemistry is the science of substances + their transformations. ',
                'Every atom in your body was forged in a star. ',
                'Every reaction you observe was already happening 4 billion years ago. ',
                'You are not separate from chemistry. You ARE chemistry. ',
                'Now you have the tools to understand the world you\'re made of.'
              )
            ),
            h('div', { className: 'text-center mt-6 text-xs text-slate-500 italic' }, 'ChemBalance v3.x · AlloFlow STEM Lab')
          ),


          // ── Footer ──
          h('div', { className: 'flex gap-2 mt-4 pt-3 border-t border-slate-200' },
            h('button', { onClick: function() { setStemLabTool('titrationLab'); announceToSR('Opening Titration Lab'); }, className: 'px-3 py-1.5 text-xs font-bold text-lime-600 bg-lime-50 border border-lime-600 rounded-full hover:bg-lime-100' }, '\u2697\uFE0F Titration Lab \u2192'),
            h('button', { 'aria-label': 'Snapshot', onClick: takeSnapshot, className: 'ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all' }, '\uD83D\uDCF8 Snapshot')
          )
        );
      })();
    }
  });
})();
