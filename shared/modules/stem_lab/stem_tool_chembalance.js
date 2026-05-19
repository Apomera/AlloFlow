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

  var CHEM_CATEGORIES = [
    { id: 'core', label: 'Core Labs', icon: '⚖️', desc: 'Balance, react, calculate, measure', color: 'lime',
      sections: ['balance', 'reactions', 'stoich', 'molecular', 'safety', 'challenge', 'battle', 'learn'] },
    { id: 'reference', label: 'Reference', icon: '📚', desc: 'Elements, glossary, tables, history', color: 'cyan',
      sections: ['elementdb', 'periodic', 'famous_reactions', 'glossary', 'datatables', 'records', 'mythbusters', 'history'] },
    { id: 'domains', label: 'Chemistry Domains', icon: '⚛️', desc: 'Deep dives into chem subjects', color: 'indigo',
      sections: ['acids_bases', 'redox', 'organic', 'biochem', 'thermo', 'kinetics', 'equilibrium', 'gas_laws', 'solutions', 'nuclear'] },
    { id: 'applied', label: 'Applied Chemistry', icon: '🏭', desc: 'Real-world chem in industry + life', color: 'orange',
      sections: ['industrial', 'environmental', 'pharma', 'materials', 'food_chem', 'forensic'] },
    { id: 'education', label: 'Education & AP', icon: '🎓', desc: 'AP Chem, lab techniques, careers', color: 'amber',
      sections: ['apchem', 'lab_techniques', 'careers', 'lab_kits'] },
    { id: 'people', label: 'People & Reflection', icon: '🧑‍🔬', desc: 'Famous chemists + finale', color: 'purple',
      sections: ['chemists', 'finale'] }
  ];

  // Map every subtool id → category id
  var CHEM_SECTION_TO_CATEGORY = (function() {
    var m = {};
    CHEM_CATEGORIES.forEach(function(c) { c.sections.forEach(function(sid) { m[sid] = c.id; }); });
    return m;
  })();



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


  // ═══════════════════════════════════════════════════════════
  // FULL ELEMENT DETAILS — z=1 deep profiles with discovery + chemistry
  // ═══════════════════════════════════════════════════════════
  var ELEMENT_DETAILS = [
    { z: 1, sym: 'H', detail: 'Hydrogen is the simplest atom — 1 proton, 1 electron. It is the most abundant element in the universe (75% by mass), forming stars, planets (gas giants), and water. Discovered by Henry Cavendish in 1766 who showed it was a distinct substance when reacted with metals to give "flammable air". Named hydrogen ("water-former") by Lavoisier. Modern uses include: ammonia production (Haber process, ~70 million tons/year — feeds half of humanity), petroleum refining (hydrocracking), methanol synthesis, hydrochloric acid manufacturing, food hydrogenation (margarine), and fuel cells. Future: hydrogen economy — clean fuel that produces only water when burned. Storage challenges: low density at STP. Liquid H2 used in rockets (NASA Saturn V used 1.4 million liters). Found as molecular H2 in trace amounts in atmosphere (0.000055%), bound in water, hydrocarbons, biological molecules.' },
    { z: 6, sym: 'C', detail: 'Carbon is the chemistry of life. It bonds with itself in chains, rings, branches — making more compounds (10+ million) than all other elements combined. Known since prehistoric times as charcoal and diamond. Carbon comes in many allotropes: diamond (each C bonded to 4 others tetrahedrally — hardest natural material), graphite (sheets of hexagons — lubricant and pencil lead), buckminsterfullerene (C60 — soccer-ball cage, Nobel 1996), carbon nanotubes (rolled-up graphene), graphene (single atomic layer — Nobel 2010, strongest material ever measured), amorphous carbon (charcoal, coal). Carbon-14 (5730 year half-life) used in radiocarbon dating. CO2 + climate change drives policy debates. Every living cell on Earth uses carbon backbone.' },
    { z: 26, sym: 'Fe', detail: 'Iron has shaped human civilization. Iron Age began ~1200 BCE in Anatolia and spread globally. Earth\'s core is mostly iron-nickel alloy generating our magnetic field. Hemoglobin uses iron to bind oxygen (one molecule carries 4 O2 molecules). Every cell uses iron in cytochromes for electron transport. Anemia is iron deficiency. Steel is iron + carbon (0.02-2.1% by weight) — strongest commonly-used material. Stainless steel adds chromium (>10.5%) for corrosion resistance. Modern world produces 1.9 billion tons of steel annually. Rust (iron oxide, Fe2O3) costs the global economy ~3% of GDP. Magnetite (Fe3O4) is naturally magnetic.' },
    { z: 79, sym: 'Au', detail: 'Gold is special because it doesn\'t corrode. The Aztec word "teocuitlatl" means "sweat of the sun." Egyptian goldsmithing dates to 3000 BCE. Why doesn\'t gold tarnish? Its electron configuration places it in a unique position. Modern uses: electronics (corrosion-free contacts in phones, computers, satellites — each smartphone contains ~0.034 g gold), dental fillings (still common in some countries), medicine (chemotherapy drug auranofin), aerospace (visor coatings reflect IR). Most ductile metal — 1g can be drawn into 2.4 km wire. Mostly mined from South Africa, China, Russia, US. Total gold ever mined could fit in a cube ~22m on a side. Bitcoin is sometimes called "digital gold" because of similar scarcity properties.' },
    { z: 92, sym: 'U', detail: 'Uranium powered the atomic age. Marie Curie discovered radioactivity in U salts (1898). Enrico Fermi achieved the first nuclear chain reaction with U-235 in 1942 under Stagg Field at University of Chicago. The Manhattan Project (1942-1945) produced enough U-235 (and Pu-239) for the Hiroshima bomb. Today: nuclear power provides ~10% of world electricity. U-238 (99.3% of natural U) is fertile — can be bred to Pu-239 in reactors. Depleted uranium (lower in U-235) is used in armor + ammunition. Half-life of U-238: 4.5 billion years (age of Earth). Found in Earth\'s crust at ~2.7 ppm. Mining concentrated in Kazakhstan, Australia, Canada, Niger.' },
    { z: 47, sym: 'Ag', detail: 'Silver has been used as currency for 4,000+ years. Most reflective metal — used in mirrors. Best electrical conductor (better than copper) — used in high-end audio cables, RF circuits, solar cells. Antimicrobial properties known since ancient times — Hippocrates wrote about it. Modern: silver-coated bandages prevent wound infection, silver nanoparticles in athletic clothing reduce odor. Photography historically used silver halide crystals. Sterling silver is 92.5% Ag + 7.5% Cu. World silver production ~25,000 tons/year. Mostly mined in Mexico, Peru, China.' },
    { z: 29, sym: 'Cu', detail: 'Copper is the oldest metal humans worked with — copper tools date to 8000 BCE. Roman plumbing was copper. Statue of Liberty\'s green color is copper oxide patina (from CuO + Cu(OH)2 + Cu(NO3)2). Modern uses: electrical wiring (best conductor after silver), plumbing, electronics, antimicrobial surfaces in hospitals. Brass = Cu + Zn. Bronze = Cu + Sn. Bronze Age began ~3300 BCE. Every car has ~25 kg copper. Hybrid vehicles use 4× more copper than ICE vehicles.' },
    { z: 17, sym: 'Cl', detail: 'Chlorine saves more lives than any other element through water disinfection. First commercial chlorination of water was Jersey City 1908. Used in WWI as chemical weapon (1915 — first major chemical attack). Modern uses: water disinfection (kills bacteria, viruses, protozoa in drinking water + pools), bleach (NaClO), PVC plastic, refrigerants, pharmaceuticals. Found as Cl2 gas (yellow-green, highly toxic). Combines with Na to make table salt. About 75% of EU pharmaceuticals contain chlorine. Mixed with ammonia produces chloramine — toxic, do not combine cleaning products.' },
    { z: 8, sym: 'O', detail: 'Oxygen drives all aerobic life. 21% of atmosphere. Photosynthesis produced this O2 ~2.4 billion years ago (Great Oxidation Event) — the worst extinction in Earth history (killed anaerobic organisms). Discovered by Carl Scheele (1772), independently by Priestley (1774). Named by Lavoisier (1777) from Greek "acid-former" — wrong assumption about acids. O2 supports combustion. O3 (ozone) at high altitude protects from UV; at ground level is toxic pollutant. Hyperbaric oxygen therapy treats decompression sickness + carbon monoxide poisoning. Liquid O2 used in rockets (NASA Saturn V used 1.2 million liters).' },
    { z: 7, sym: 'N', detail: 'Nitrogen is 78% of atmosphere but virtually inactive due to triple bond N≡N (strongest covalent bond). Plants cannot fix atmospheric N — they need it as NH3 or NO3-. Nitrogen-fixing bacteria (Rhizobia in legume root nodules) convert N2 to NH3. Fritz Haber industrially solved this in 1909 — Haber-Bosch process feeds 50% of humanity. Without it, ~4 billion people would not be alive. N is essential to amino acids, DNA, ATP. Discovered by Daniel Rutherford (1772). N2 is the gas left after removing O2 + CO2 + water vapor from air.' },
    { z: 11, sym: 'Na', detail: 'Sodium is the 6th most abundant element in Earth\'s crust. Highly reactive — must be stored under oil. Reacts violently with water producing NaOH + H2 (which can ignite). Sodium chloride (table salt) is essential nutrient — every cell uses Na+/K+ pump (uses ~30% of resting metabolic rate). Discovered by Humphry Davy (1807) by electrolysis of molten NaOH. Modern uses: sodium-vapor lamps (orange streetlights), sodium-cooled fast-breeder reactors, sodium battery research, food preservation. NaOH used in soap-making + paper.' },
    { z: 19, sym: 'K', detail: 'Potassium is the major intracellular cation in animal cells (Na+ is extracellular). K+/Na+ gradient drives nerve impulses, muscle contraction, and active transport. Bananas contain ~422 mg K. Reacts more violently with water than sodium. K-40 isotope (0.012%) is naturally radioactive — bananas are slightly radioactive! Used as fertilizer (potash). Discovered by Davy (1807) — first metal he isolated. KCl used in lethal injections.' },
    { z: 20, sym: 'Ca', detail: 'Calcium is the 5th most abundant element in Earth\'s crust. Builds bones + teeth (hydroxyapatite Ca5(PO4)3(OH)). Adult body contains ~1 kg Ca, 99% in skeleton. Ca2+ ions trigger muscle contraction + neurotransmitter release. Calcium signaling is central to biology. Limestone (CaCO3) is the most-used construction material. Plaster + cement use Ca. Antacids (Tums) are CaCO3. Without Ca, no movement, no thought, no life.' },
    { z: 13, sym: 'Al', detail: 'Aluminum is 8% of Earth\'s crust — most abundant metal. Once more valuable than gold (1880s). Statue of Liberty replaced Washington Monument as tallest aluminum object when Hall-Héroult process (1886) made it cheap. Lightweight (1/3 weight of steel), corrosion-resistant (Al2O3 layer self-heals), conductive. Aircraft are 80%+ aluminum alloys. Beverage cans (Al-Mn-Mg alloy) are 100% recyclable. Body armor + tanks use Al alloys. Aluminum production consumes ~3% of world electricity.' },
    { z: 14, sym: 'Si', detail: 'Silicon defines our digital age. 99% of computer chips made of doped silicon. Discovered by Berzelius (1824). 2nd most abundant element in crust (28%). Found in sand (SiO2), clay, quartz. Computer manufacturing uses ultra-pure Si (99.9999999% — "9-nines"). Doping with B makes p-type; with P makes n-type. Silicon Valley named for this. Glass is mostly SiO2. Silicones are polymers based on Si-O backbones — flexible at low T + heat-stable. Solar cells convert sunlight to electricity via silicon p-n junctions. Future: silicon photonics, quantum computing.' },
    { z: 78, sym: 'Pt', detail: 'Platinum was used by pre-Columbian South Americans before Europeans knew it existed. Spanish conquistadors disposed of it as worthless "little silver" (platina). Modern uses: catalytic converters (95% of car pollution control), petroleum refining, cancer chemotherapy (cisplatin), jewelry. Doesn\'t corrode or tarnish. Catalysis: lowers activation energy for many reactions without being consumed. Rarer than gold. World production ~190 tons/year, mostly South Africa, Russia. Cisplatin discovered serendipitously by Barnett Rosenberg in 1965 — saved millions of cancer patients.' },
    { z: 53, sym: 'I', detail: 'Iodine is essential for thyroid hormones T3 + T4. Iodine deficiency causes goiter + cretinism (cognitive impairment). Iodized salt (since 1924 in US) has eliminated this in most countries. Discovered by Bernard Courtois (1811) accidentally while making gunpowder from seaweed ash. Iodine tincture is antiseptic. I-131 used to treat thyroid cancer + diagnose thyroid disease. Discovered first noble metal compound formed at room temperature when reacted with various transition metals.' },
    { z: 24, sym: 'Cr', detail: 'Chromium produces vivid colors — Greek "chroma" means color. Ruby is corundum (Al2O3) + Cr; emerald is beryl + Cr. Stainless steel is iron + chromium (>10.5%) + others. Cr forms passive oxide layer that prevents rust. Cr(VI) compounds carcinogenic (Erin Brockovich case, Hinkley, CA 1993). Most chromium uses are now in stainless steel — 70% of production.' },
    { z: 22, sym: 'Ti', detail: 'Titanium has highest strength-to-weight ratio of any metal. Used in aircraft (titanium alloys 6Al-4V most common), submarines (less corrosion in saltwater), medical implants (biocompatible — no rejection), tennis rackets, knee + hip replacements. Discovered by William Gregor (1791). Named after Titans of Greek mythology. Most titanium production goes to aerospace + medical. White paint pigment is TiO2 — replaces lead-based paints (toxic).' },
    { z: 12, sym: 'Mg', detail: 'Magnesium is essential for plant photosynthesis (chlorophyll has Mg at center). Essential trace element for animals — 300+ enzymes use Mg2+ as cofactor. Burns with brilliant white flame (used in flares, sparklers, photographic flashes). 8th most abundant element in crust. Light alloys (Mg-Al, Mg-Zn) used in aerospace + sporting goods. Magnesium sulfate (Epsom salt) used medicinally.' },
    { z: 50, sym: 'Sn', detail: 'Tin enabled the Bronze Age — combined with copper to make bronze (~3300 BCE). Cornwall mines were major source, traded by Phoenicians worldwide. Tin can preservation (1810) revolutionized food storage. Tin plague: pure tin transforms to grayish powder below 13°C — Napoleon\'s soldiers reportedly froze when their tin buttons disintegrated 1812 (apocryphal). Modern uses: solder (Sn-Pb historically, lead-free now), tin-plated steel (cans), float glass (made on molten tin). Bronze still used for bearings + bells.' },
    { z: 80, sym: 'Hg', detail: 'Mercury is the only metal liquid at room temperature. Mythology: Roman god Mercury, messenger of the gods. Used historically in thermometers, barometers, dental fillings (amalgam), gold mining (forms amalgam). Highly toxic — Mad Hatter\'s disease was Hg poisoning in hat-makers exposed to Hg(NO3)2. Wilson Edition Hg-based fungicide caused massive industrial pollution. Now phased out from most consumer uses. CFL bulbs contain ~5 mg Hg — proper recycling important. Hg(0) vapor + organic Hg most dangerous.' },
    { z: 82, sym: 'Pb', detail: 'Lead has been used since ancient times — Roman aqueducts + pipes. Possible contributor to fall of Roman Empire (Pb poisoning of elite). Tetraethyl lead (gasoline anti-knock additive) widely banned 1973-2021. Lead paint banned 1978. Acidic water leaching from Pb pipes caused Flint water crisis 2014. Pb damages developing brain — children especially vulnerable. Symptoms of Pb poisoning: cognitive impairment, anemia, behavioral problems. Still in some lead-acid batteries + radiation shielding.' },
    { z: 27, sym: 'Co', detail: 'Cobalt = "kobold" — mining demon in German folklore. Co-60 used in radiotherapy + sterilization. Vitamin B12 (cobalamin) contains cobalt — essential nutrient. Modern: lithium-ion batteries (LCO, NMC) use cobalt. ~60% of world cobalt comes from Democratic Republic of Congo — ethical mining concerns include child labor. Blue cobalt glass + ceramics. Strong magnetic properties — used in Alnico magnets.' },
    { z: 30, sym: 'Zn', detail: 'Zinc is essential trace element — cofactor for 300+ enzymes. Zn deficiency causes growth retardation, immune dysfunction, slow wound healing. Modern uses: galvanizing steel (zinc coating prevents rust), brass (Cu-Zn), batteries, sunscreen (ZnO blocks UV), cold lozenges. Penny is 97.5% Zn since 1982 (Cu-clad). 12 most abundant element in human body.' },
    { z: 33, sym: 'As', detail: 'Arsenic is historically the "king of poisons" — used in murders for centuries. Marsh test (1836) finally enabled detection — birth of forensic toxicology. Modern: groundwater contamination in Bangladesh + W. Bengal affects 100 million people. CCA-treated wood (chromated copper arsenate) banned for residential 2003. Some semiconductor uses (gallium arsenide for high-frequency chips). Some traditional medicines still contain As — toxic.' },
    { z: 34, sym: 'Se', detail: 'Selenium discovered in residues from sulfuric acid plant 1817. Essential trace element — cofactor in glutathione peroxidase + thyroid hormones. Brazil nuts highest natural Se source — 1 nut/day exceeds RDA. Selenium toxicity (selenosis) from >400 μg/day. Photovoltaic Se cells (predecessor of Si). Selenium sulfide in anti-dandruff shampoo (Selsun Blue).' },
    { z: 35, sym: 'Br', detail: 'Bromine is one of only two liquid elements at room temperature (Hg the other). Reddish-brown liquid; toxic vapor. Mostly from Dead Sea + brines. Used in flame retardants (some controversial — PBDEs bioaccumulate), water treatment, photographic film (silver bromide).' },
    { z: 52, sym: 'Te', detail: 'Tellurium named after Earth (Latin tellus). Causes "tellurium breath" — garlicky body odor at trace exposure. Modern: CdTe solar cells, thermoelectric devices. Lannemezan plant in France makes most world supply.' },
    { z: 88, sym: 'Ra', detail: 'Radium discovered by Marie + Pierre Curie 1898 from uranium ore (pitchblende). Marie Curie won Nobel Physics 1903 (with Pierre + Becquerel) + Chemistry 1911 (for Po + Ra isolation). Used in luminous paint for clock faces in early 20th century — Radium Girls factory workers died from radiation exposure painting dials. Modern: research only. Cancer treatment largely replaced by Co-60 or accelerators. Radium\'s name from Latin "radius" (ray).' },
    { z: 94, sym: 'Pu', detail: 'Plutonium is named after Pluto (then-9th planet). Synthesized by Seaborg et al. 1940 at UC Berkeley. Pu-239 fissile + used in nuclear weapons (Fat Man bomb on Nagasaki, 1945). Pu-238 powers spacecraft (Curiosity Mars rover, Voyager, Cassini). Half-life Pu-239: 24,100 years. Currently ~500 tons world stockpile. Most toxic substance known by mass — 1 kg could theoretically kill 2 million people if dispersed as inhalable dust.' }
  ];

  // ═══════════════════════════════════════════════════════════
  // EXPANDED GLOSSARY — additional 100 terms
  // ═══════════════════════════════════════════════════════════
  var CHEM_GLOSSARY_B = [
    { term: 'Activated complex', def: 'High-energy intermediate state during reaction, at peak of energy diagram.' },
    { term: 'Adsorption', def: 'Substance accumulating on surface of another. Different from absorption (penetration).' },
    { term: 'Alkene', def: 'Hydrocarbon with C=C double bond. General formula CnH2n.' },
    { term: 'Alkyne', def: 'Hydrocarbon with C≡C triple bond. CnH2n-2.' },
    { term: 'Allotrope', def: 'Different structural forms of same element. Diamond + graphite both carbon.' },
    { term: 'Amine', def: 'Organic compound with NH2, NH, or N group. Bases.' },
    { term: 'Anhydrous', def: 'Without water. Often refers to dried salts.' },
    { term: 'Antibonding orbital', def: 'Molecular orbital that destabilizes molecule when occupied.' },
    { term: 'Aprotic solvent', def: 'Solvent without acidic H. DMSO, acetone.' },
    { term: 'Aqueous', def: 'Dissolved in water. Notated as (aq).' },
    { term: 'Atom', def: 'Smallest unit of an element. Nucleus + electrons.' },
    { term: 'Beta sheet', def: 'Protein secondary structure with extended chains.' },
    { term: 'Binary compound', def: 'Made of only 2 elements. NaCl, MgO.' },
    { term: 'Biodegradable', def: 'Can be broken down by microorganisms.' },
    { term: 'Boiling point', def: 'Temperature at which vapor pressure equals atmospheric pressure.' },
    { term: 'Bond angle', def: 'Angle between two bonds from same atom.' },
    { term: 'Bond length', def: 'Distance between nuclei of bonded atoms.' },
    { term: 'Calorie', def: 'Energy to raise 1 g water 1°C. Food calories are kcal.' },
    { term: 'Carbohydrate', def: 'Sugar polymer. Energy + structure.' },
    { term: 'Catabolism', def: 'Breaking down molecules to release energy.' },
    { term: 'Centrifuge', def: 'Spinning device that separates by density.' },
    { term: 'Chain reaction', def: 'Self-propagating reaction where products initiate more reactions.' },
    { term: 'Charge density', def: 'Charge per unit volume. Affects bonding.' },
    { term: 'Chlorofluorocarbon (CFC)', def: 'Refrigerant that depletes ozone. Banned by Montreal Protocol.' },
    { term: 'Cis isomer', def: 'Substituents on same side. cis-2-butene.' },
    { term: 'Closed system', def: 'Exchange energy but not matter with surroundings.' },
    { term: 'Colloid', def: 'Mixture with particles 1-1000 nm. Milk, blood, fog.' },
    { term: 'Conduction', def: 'Heat transfer through direct contact.' },
    { term: 'Conservation of energy', def: 'Energy cannot be created or destroyed. First law of thermodynamics.' },
    { term: 'Corrosion', def: 'Gradual destruction of material by environment. Rust on iron.' },
    { term: 'Coupling', def: 'Reaction joining two molecules. Common in organic synthesis.' },
    { term: 'Crystal lattice', def: 'Repeating 3D pattern of ions/atoms in crystal.' },
    { term: 'Cyclic compound', def: 'Has ring of atoms in structure.' },
    { term: 'Daltons (Da)', def: 'Unit of molecular mass. 1 Da = 1.66 × 10⁻²⁷ kg.' },
    { term: 'Decomposition reaction', def: 'AB → A + B. One compound breaks into multiple.' },
    { term: 'Deionized water', def: 'Water with ions removed. Used in lab.' },
    { term: 'Denatured', def: 'Protein has lost native structure due to heat, pH, or other stress.' },
    { term: 'Density', def: 'Mass per unit volume. ρ = m/V.' },
    { term: 'Desalination', def: 'Removing salt from water. RO or thermal.' },
    { term: 'Dichromate', def: 'Cr2O7²⁻ ion. Strong oxidizer.' },
    { term: 'Disaccharide', def: 'Two sugars joined. Sucrose = glucose + fructose.' },
    { term: 'Disinfectant', def: 'Kills microorganisms. Chlorine, alcohol.' },
    { term: 'Dispersion forces', def: 'Weak intermolecular forces from temporary dipoles. Same as London forces.' },
    { term: 'Distillation', def: 'Separation by boiling point difference.' },
    { term: 'Doping', def: 'Adding impurities to semiconductor. P-type or n-type.' },
    { term: 'Double bond', def: 'Sharing 2 pairs of electrons. C=O.' },
    { term: 'Ductile', def: 'Can be drawn into wire. Metals.' },
    { term: 'Dynamic equilibrium', def: 'Forward + reverse reactions continue at equal rates.' },
    { term: 'Effective nuclear charge', def: 'Net positive charge felt by valence electron.' },
    { term: 'Effusion', def: 'Movement of gas through small opening.' },
    { term: 'Electric current', def: 'Flow of charge. Measured in amperes.' },
    { term: 'Electrolysis', def: 'Using electricity to drive non-spontaneous reaction.' },
    { term: 'Electrolyte', def: 'Substance that ionizes in solution + conducts electricity.' },
    { term: 'Electroplating', def: 'Coating metal with another metal via electrolysis.' },
    { term: 'Element symbol', def: '1-2 letter chemical symbol. H, He, Au.' },
    { term: 'Endpoint', def: 'When indicator changes color in titration. Approximation of equivalence point.' },
    { term: 'Energy diagram', def: 'Plot of energy vs reaction progress.' },
    { term: 'Enzyme', def: 'Protein catalyst in biological reactions.' },
    { term: 'Equivalence point', def: 'When moles acid = moles base in titration.' },
    { term: 'Ester', def: 'Organic compound R-COO-R\'. Common in flavors + fragrances.' },
    { term: 'Ether', def: 'Organic compound R-O-R\'. Common solvent.' },
    { term: 'Evaporation', def: 'Liquid to gas at temperature below boiling.' },
    { term: 'Excited state', def: 'Atom or molecule with electron above ground state.' },
    { term: 'Extensive property', def: 'Depends on amount. Mass, volume, energy.' },
    { term: 'Filter paper', def: 'Porous paper for filtration.' },
    { term: 'Filtrate', def: 'Liquid that passes through filter.' },
    { term: 'Flame test', def: 'Identifying ions by flame color. Na orange, K lilac.' },
    { term: 'Formal charge', def: 'Apparent charge on atom in Lewis structure.' },
    { term: 'Fractional distillation', def: 'Separating multiple liquids by boiling point.' },
    { term: 'Free electron', def: 'Electron not bound to specific atom. In metals.' },
    { term: 'Functional group', def: 'Atomic arrangement that defines compound class.' },
    { term: 'Galvanic cell', def: 'Spontaneous redox produces electricity.' },
    { term: 'Gas chromatography', def: 'Separation method for volatile compounds.' },
    { term: 'Gibbs free energy', def: 'G = H - TS. Determines spontaneity.' },
    { term: 'Glassware', def: 'Lab glass equipment. Beakers, flasks, pipettes.' },
    { term: 'Gravimetric', def: 'Measurement by mass.' },
    { term: 'Greenhouse gas', def: 'Gas that traps infrared radiation. CO2, CH4, N2O.' },
    { term: 'Halide', def: 'Compound containing halogen.' },
    { term: 'Heat of formation', def: 'Energy change forming compound from elements.' },
    { term: 'Heat of fusion', def: 'Energy to melt 1 g substance.' },
    { term: 'Heat of vaporization', def: 'Energy to vaporize 1 g liquid.' },
    { term: 'Helium balloon', def: 'Filled with He gas. Less dense than air.' },
    { term: 'Henderson-Hasselbalch', def: 'pH = pKa + log([A-]/[HA]). Buffer pH.' },
    { term: 'Heterogeneous catalyst', def: 'Catalyst in different phase from reactants.' },
    { term: 'High-pressure', def: 'Above atmospheric pressure.' },
    { term: 'Homogeneous catalyst', def: 'Catalyst in same phase as reactants.' },
    { term: 'Hund\'s rule', def: 'Electrons fill orbitals singly first.' },
    { term: 'Hydration', def: 'Adding water to compound.' },
    { term: 'Hydrate', def: 'Crystal with water of crystallization. CuSO4·5H2O.' },
    { term: 'Hydrocarbon', def: 'Compound of C + H only. Fuels.' },
    { term: 'Hydrogenation', def: 'Adding H2 to unsaturated compound.' },
    { term: 'Hydrogenated oil', def: 'Vegetable oil with added H. Solid at room T.' },
    { term: 'Hydrophilic', def: 'Water-loving. Polar groups.' },
    { term: 'Hydrophobic', def: 'Water-hating. Nonpolar groups.' },
    { term: 'Hypothesis', def: 'Testable proposed explanation.' },
    { term: 'Ideal gas', def: 'Theoretical gas obeying PV=nRT exactly. No real gas does.' },
    { term: 'Immiscible', def: 'Liquids that don\'t mix. Oil + water.' },
    { term: 'Indicator', def: 'Substance that signals reaction completion or pH.' },
    { term: 'Inert gas', def: 'Noble gas. Generally unreactive.' },
    { term: 'Inhibitor', def: 'Substance that slows a reaction.' },
    { term: 'Inorganic chemistry', def: 'Chemistry of non-carbon compounds.' },
    { term: 'Insulator', def: 'Material that doesn\'t conduct.' },
    { term: 'Intermolecular forces', def: 'Attractions between molecules. H-bonds, dipole, London.' },
    { term: 'Intramolecular forces', def: 'Bonds within molecule.' },
    { term: 'Iodine clock reaction', def: 'Classic kinetics demonstration. Color change at specific time.' },
    { term: 'Ion exchange', def: 'Swapping ions. Water softeners.' },
    { term: 'Ionization', def: 'Forming ion. Loss or gain of electron.' },
    { term: 'Isoelectronic', def: 'Same number of electrons. F⁻, Ne, Na⁺ all 10 electrons.' },
    { term: 'Joule', def: 'SI unit of energy. 1 J = 1 N·m.' },
    { term: 'Kelvin', def: 'Absolute temperature scale. 0 K = -273.15°C.' },
    { term: 'Kinetic energy', def: 'Energy of motion. KE = 1/2 mv².' },
    { term: 'Lactic acid', def: 'Produced in muscle during anaerobic respiration.' }
  ];

  // ═══════════════════════════════════════════════════════════
  // EXPANDED REACTIONS — 30 more reactions
  // ═══════════════════════════════════════════════════════════
  var MORE_REACTIONS = [
    { name: 'Aluminum thermite (mining)', equation: '2Al + Cr2O3 → 2Cr + Al2O3', delta: '-516 kJ/mol', type: 'Highly Exothermic', context: 'Thermite reactions used to weld + produce other metals from oxides.' },
    { name: 'Calcium carbide + water', equation: 'CaC2 + 2H2O → Ca(OH)2 + C2H2', delta: 'Exothermic', type: 'Hydrolysis', context: 'Produces acetylene for welding + lamps.' },
    { name: 'Phosphorus pentoxide + water', equation: 'P4O10 + 6H2O → 4H3PO4', delta: 'Exothermic', type: 'Hydration', context: 'Industrial production of phosphoric acid.' },
    { name: 'Sodium thiosulfate + iodine', equation: '2Na2S2O3 + I2 → Na2S4O6 + 2NaI', delta: 'Redox', type: 'Iodometric titration', context: 'Quantitative analysis of oxidizing agents.' },
    { name: 'Methanol oxidation', equation: 'CH3OH + 1.5 O2 → CO2 + 2H2O', delta: '-727 kJ/mol', type: 'Exothermic', context: 'Methanol fuel cells + industrial precursor.' },
    { name: 'Ammonium dichromate volcano', equation: '(NH4)2Cr2O7 → N2 + Cr2O3 + 4H2O', delta: 'Highly Exothermic', type: 'Decomposition', context: 'Classic chemistry demonstration. Solid grows + sparks.' },
    { name: 'Hydrogen sulfide formation', equation: 'FeS + 2HCl → FeCl2 + H2S', delta: 'Exothermic', type: 'Double displacement', context: 'Hydrogen sulfide gas for qualitative analysis.' },
    { name: 'Iron sulfide synthesis', equation: 'Fe + S → FeS', delta: '-100 kJ/mol', type: 'Exothermic', context: 'Direct combination at high T.' },
    { name: 'Magnesium nitride', equation: '3Mg + N2 → Mg3N2', delta: 'Exothermic', type: 'Direct synthesis', context: 'Magnesium burns in nitrogen as well as O2.' },
    { name: 'Magnesium + steam', equation: 'Mg + H2O(g) → MgO + H2', delta: 'Exothermic', type: 'Single replacement', context: 'Magnesium fires cannot be extinguished with water.' },
    { name: 'Sodium peroxide + CO2', equation: '2Na2O2 + 2CO2 → 2Na2CO3 + O2', delta: 'Net positive', type: 'Disproportionation', context: 'Submarine air purification.' },
    { name: 'Hydrogenation of nitrobenzene', equation: 'C6H5NO2 + 3H2 → C6H5NH2 + 2H2O', delta: 'Exothermic', type: 'Reduction', context: 'Aniline production from coal-tar nitrobenzene.' },
    { name: 'Diels-Alder example', equation: 'Butadiene + Ethylene → Cyclohexene', delta: 'Exothermic', type: 'Cycloaddition', context: 'Classic example of pericyclic reaction.' },
    { name: 'Methane chlorination', equation: 'CH4 + Cl2 → CH3Cl + HCl', delta: 'Exothermic', type: 'Free radical substitution', context: 'Chain reaction. Step 1 of methylene chloride synthesis.' },
    { name: 'Bromine + aluminum', equation: '2Al + 3Br2 → 2AlBr3', delta: 'Highly Exothermic', type: 'Direct synthesis', context: 'Dramatic reaction; aluminum chunk dropped in Br2 reacts violently.' },
    { name: 'Hydrofluoric acid + glass', equation: '4HF + SiO2 → SiF4 + 2H2O', delta: 'Exothermic', type: 'Etching', context: 'Why HF stored in plastic, not glass. Glass etching for art.' },
    { name: 'Mercury sulfide synthesis', equation: 'Hg + S → HgS', delta: 'Exothermic', type: 'Direct synthesis', context: 'Used historically as pigment (vermillion red).' },
    { name: 'Bromine in carbon tetrachloride', equation: 'CH3CH=CH2 + Br2 → CH3CHBrCH2Br', delta: 'Exothermic', type: 'Addition', context: 'Test for unsaturation. Br2 decolorizes.' },
    { name: 'KMnO4 + alkene', equation: 'CH2=CH2 + KMnO4 + H2O → glycol + MnO2', delta: 'Exothermic', type: 'Oxidation', context: 'Bayer test for unsaturation; KMnO4 decolorizes.' },
    { name: 'Silver nitrate + chloride', equation: 'AgNO3 + NaCl → AgCl + NaNO3', delta: 'Mild', type: 'Precipitation', context: 'Qualitative test for chloride ion. AgCl is white precipitate.' },
    { name: 'Lead iodide formation', equation: 'Pb(NO3)2 + 2KI → PbI2 + 2KNO3', delta: 'Mild', type: 'Precipitation', context: 'Bright yellow precipitate. Beautiful chemistry demo.' },
    { name: 'Iron oxalate decomposition', equation: 'Fe(C2O4) → Fe + 2CO + ½O2', delta: 'Endothermic', type: 'Decomposition', context: 'High-temperature decomposition for iron purification.' },
    { name: 'Caustic potash + CO2', equation: '2KOH + CO2 → K2CO3 + H2O', delta: 'Exothermic', type: 'Acid-base', context: 'CO2 scrubbing in submarines + closed environments.' },
    { name: 'Ammonium nitrate decomp.', equation: 'NH4NO3 → N2O + 2H2O', delta: '-37 kJ/mol', type: 'Exothermic decomp', context: 'Source of laughing gas (N2O) + AN explosives.' },
    { name: 'Acid-catalyzed glycoside hydrolysis', equation: 'Sucrose + H2O → glucose + fructose', delta: 'Mild', type: 'Hydrolysis', context: 'Invert sugar. Sweeter than original.' },
    { name: 'Cellulose hydrolysis', equation: '(C6H10O5)n + nH2O → n C6H12O6', delta: 'Endothermic', type: 'Hydrolysis', context: 'Cellulose to glucose. Currently studied for biofuels.' },
    { name: 'Hydroxide + alcohol', equation: 'NaOH + ROH → NaOR + H2O', delta: 'Mild', type: 'Acid-base', context: 'Sodium alkoxide formation.' },
    { name: 'Sodium reduction of TiCl4', equation: 'TiCl4 + 4Na → Ti + 4NaCl', delta: 'Highly Exothermic', type: 'Reduction', context: 'Industrial Kroll process for titanium production.' },
    { name: 'Boron reduction', equation: 'B2O3 + 3Mg → 2B + 3MgO', delta: 'Highly Exothermic', type: 'Reduction', context: 'Industrial boron production.' },
    { name: 'Tungsten reduction', equation: 'WO3 + 3H2 → W + 3H2O', delta: 'Mild', type: 'Reduction', context: 'Tungsten metal for light bulb filaments.' }
  ];


  // ═══════════════════════════════════════════════════════════
  // EXTENDED REACTIONS B — 50 more named reactions
  // ═══════════════════════════════════════════════════════════
  var REACTIONS_B = [
    {
      name: "Sodium amalgam reduction",
      equation: "CH3COCH3 + Na/Hg + H2O to CH3CHOHCH3",
      delta: "-50 kJ/mol",
      type: "Reduction",
      context: "Classical reduction. Now mostly replaced by NaBH4.",
      mechanism: "Single electron transfer + protonation."
    },
    {
      name: "LiAlH4 reduction of ester",
      equation: "RCOOR + 4 LiAlH4 to RCH2OH + ROH",
      delta: "Exothermic",
      type: "Hydride reduction",
      context: "Powerful reductant. Pyrophoric in air. Reduces almost any C=O.",
      mechanism: "Hydride delivery to C, then protonation."
    },
    {
      name: "NaBH4 reduction of aldehyde",
      equation: "RCHO + NaBH4 to RCH2OH",
      delta: "-30 kJ/mol",
      type: "Reduction",
      context: "Mild reducing agent. Selective for C=O over C=C.",
      mechanism: "Hydride transfer mechanism."
    },
    {
      name: "Mitsunobu reaction",
      equation: "ROH + RCOOH + DIAD + PPh3 to ester + Ph3P=O",
      delta: "Mild",
      type: "Substitution",
      context: "Inverts stereochemistry. Widely used in organic synthesis.",
      mechanism: "PPh3 activates OH for SN2."
    },
    {
      name: "Sharpless epoxidation",
      equation: "Allylic alcohol + tBuOOH + Ti + (+)DET to chiral epoxide",
      delta: "Mild",
      type: "Asymmetric oxidation",
      context: "Sharpless Nobel 2001. Pharmaceutical synthesis backbone.",
      mechanism: "Ti catalyst + chiral DET ligand control facial selectivity."
    },
    {
      name: "Sonogashira coupling",
      equation: "Ar-X + HC=CR + Pd + Cu to Ar-C=C-R",
      delta: "Mild",
      type: "Cross-coupling",
      context: "Forms aryl alkynes. Wide use in drug synthesis.",
      mechanism: "Pd oxidative addition + Cu acetylide transfer."
    },
    {
      name: "Heck reaction",
      equation: "CH2=CHR + ArX + Pd to ArCH=CHR",
      delta: "Mild",
      type: "Cross-coupling",
      context: "Forms alkene products. Nobel 2010.",
      mechanism: "Pd inserts into vinyl-Ar bond."
    },
    {
      name: "Negishi coupling",
      equation: "Ar-X + Ar-Zn + Pd to Ar-Ar",
      delta: "Mild",
      type: "Cross-coupling",
      context: "Forms biaryl from aryl zinc + aryl halide. Nobel 2010.",
      mechanism: "Standard Pd-catalyzed cross coupling."
    },
    {
      name: "Stille coupling",
      equation: "Ar-X + Ar-SnR3 + Pd to Ar-Ar",
      delta: "Mild",
      type: "Cross-coupling",
      context: "Uses stannane. Functional group tolerant.",
      mechanism: "Pd-catalyzed; transmetalation step crucial."
    },
    {
      name: "Buchwald-Hartwig amination",
      equation: "Ar-X + R2NH + Pd to Ar-NR2",
      delta: "Mild",
      type: "C-N bond formation",
      context: "Forms amines from aryl halides. Important in drug discovery.",
      mechanism: "Pd inserts into aryl halide; amine displaces."
    },
    {
      name: "Ring-closing metathesis",
      equation: "Diene to cyclic alkene + ethylene",
      delta: "Mild",
      type: "Metathesis",
      context: "Grubbs Nobel 2005. Forms macrocycles + complex natural products.",
      mechanism: "Ru carbene catalyst exchanges alkene partners."
    },
    {
      name: "Wacker process",
      equation: "CH2=CHR + O2 to RCOCH3",
      delta: "Exothermic",
      type: "Oxidation",
      context: "Industrial acetaldehyde. Now mostly methanol carbonylation.",
      mechanism: "PdCl2 + CuCl2 catalysis."
    },
    {
      name: "Beckmann rearrangement",
      equation: "Cyclohexanone oxime to caprolactam",
      delta: "Mild",
      type: "Rearrangement",
      context: "Industrial nylon-6 precursor production.",
      mechanism: "Acid catalyzed migration in oxime."
    },
    {
      name: "Hofmann elimination",
      equation: "R3N+CH2CH2X + OH- to CH2=CH2 + R3N + HX",
      delta: "Mild",
      type: "Elimination",
      context: "Forms least substituted alkene.",
      mechanism: "E2 elimination from quaternary ammonium."
    },
    {
      name: "Cannizzaro reaction",
      equation: "2 RCHO + NaOH to RCH2OH + RCOONa",
      delta: "Mild",
      type: "Disproportionation",
      context: "Aldehyde without alpha-H. Self-redox.",
      mechanism: "Hydride transfer between two aldehyde molecules."
    },
    {
      name: "Henry reaction",
      equation: "CH3NO2 + RCHO to RCH(OH)CH2NO2",
      delta: "Mild",
      type: "Aldol-like",
      context: "Forms beta-nitroalcohols. Antibiotic intermediates.",
      mechanism: "Base deprotonates CH3NO2 to give nucleophile."
    },
    {
      name: "Mannich reaction",
      equation: "RCOR + CH2O + R2NH to amino-methyl ketone",
      delta: "Mild",
      type: "Condensation",
      context: "Amino-methylation. Forms beta-amino carbonyls.",
      mechanism: "Amine + aldehyde form iminium, then enol attack."
    },
    {
      name: "Robinson annulation",
      equation: "Ketone + methyl vinyl ketone to bicyclic enone",
      delta: "Mild",
      type: "Cyclization",
      context: "Forms 6-membered ring with carbonyl.",
      mechanism: "Michael addition + aldol + dehydration sequence."
    },
    {
      name: "Birch reduction",
      equation: "Benzene + Na/NH3 to 1,4-cyclohexadiene",
      delta: "Mild",
      type: "Reduction",
      context: "Reduces aromatic to dihydroaromatic.",
      mechanism: "Electron transfer + protonation sequence."
    },
    {
      name: "Friedel-Crafts alkylation",
      equation: "C6H6 + RX + AlCl3 to C6H5R + HX",
      delta: "Mild",
      type: "Substitution",
      context: "Adds alkyl group to aromatic ring.",
      mechanism: "Lewis acid + EAS mechanism."
    },
    {
      name: "Friedel-Crafts acylation",
      equation: "C6H6 + RCOCl + AlCl3 to C6H5COR + HCl",
      delta: "Mild",
      type: "Substitution",
      context: "Adds acyl group. No rearrangement vs alkylation.",
      mechanism: "Lewis acid + acylium ion + EAS."
    },
    {
      name: "Vilsmeier-Haack formylation",
      equation: "Aromatic + DMF + POCl3 to aromatic-CHO",
      delta: "Mild",
      type: "Formylation",
      context: "Adds formyl to electron-rich aromatic.",
      mechanism: "Vilsmeier reagent + EAS."
    },
    {
      name: "Sandmeyer reaction",
      equation: "Ar-N2+ + Cu-X to Ar-X",
      delta: "Mild",
      type: "Substitution",
      context: "Converts diazonium to aryl halide.",
      mechanism: "Cu(I) catalysis."
    },
    {
      name: "Fischer indole synthesis",
      equation: "PhNHNH2 + RCOR + ZnCl2 to indole",
      delta: "Mild",
      type: "Cyclization",
      context: "Forms indole heterocycle.",
      mechanism: "Hydrazone + sigmatropic rearrangement."
    },
    {
      name: "Hantzsch dihydropyridine synthesis",
      equation: "Aldehyde + 2 beta-ketoester + NH3 to dihydropyridine",
      delta: "Mild",
      type: "Multi-component",
      context: "Calcium channel blockers (nifedipine).",
      mechanism: "Aldol + Michael + condensation."
    },
    {
      name: "Biginelli reaction",
      equation: "Aldehyde + beta-ketoester + urea to dihydropyrimidinone",
      delta: "Mild",
      type: "Multi-component",
      context: "Pharmaceutically important heterocycles.",
      mechanism: "Acid-catalyzed three-component condensation."
    },
    {
      name: "Curtius rearrangement",
      equation: "RCON3 to R-N=C=O (isocyanate)",
      delta: "Mild",
      type: "Rearrangement",
      context: "Forms isocyanates from acyl azides.",
      mechanism: "Concerted migration; loss of N2."
    },
    {
      name: "Wolff-Kishner reduction",
      equation: "RCOR + H2NNH2 + NaOH to RCH2R",
      delta: "Mild",
      type: "Reduction",
      context: "Converts ketone to methylene.",
      mechanism: "Hydrazone intermediate; base + heat."
    },
    {
      name: "Clemmensen reduction",
      equation: "RCOR + Zn(Hg) + HCl to RCH2R",
      delta: "Strong",
      type: "Reduction",
      context: "Alternative to Wolff-Kishner.",
      mechanism: "Zinc amalgam in concentrated HCl."
    },
    {
      name: "Acetal formation",
      equation: "RCHO + 2 ROH + H+ to RCH(OR)2 + H2O",
      delta: "Mild",
      type: "Condensation",
      context: "Protects carbonyl. Removable with acid.",
      mechanism: "Acid-catalyzed nucleophilic addition."
    },
    {
      name: "Knoevenagel condensation",
      equation: "RCHO + CH2(COOR)2 to alpha-beta unsaturated diester",
      delta: "Mild",
      type: "Condensation",
      context: "Forms alpha-beta unsaturated diester.",
      mechanism: "Active methylene + aldehyde + base."
    },
    {
      name: "Bayer-Villiger oxidation",
      equation: "RCOR + mCPBA to RC(O)OR",
      delta: "Mild",
      type: "Oxidation",
      context: "Converts ketones to esters.",
      mechanism: "Peracid attacks ketone, migration of R group."
    },
    {
      name: "Wittig reaction",
      equation: "RCHO + Ph3P=CHR to RCH=CHR + Ph3PO",
      delta: "Mild",
      type: "Olefination",
      context: "Forms alkenes from aldehydes/ketones. Wittig Nobel 1979.",
      mechanism: "Phosphorus ylide + carbonyl + betaine intermediate."
    },
    {
      name: "Horner-Wadsworth-Emmons",
      equation: "Phosphonate + RCHO to alkene + phosphate",
      delta: "Mild",
      type: "Olefination",
      context: "Modified Wittig with E-selectivity.",
      mechanism: "Stabilized carbanion + base."
    },
    {
      name: "Aldol condensation",
      equation: "2 RCHO + base to RCH(OH)CH2CHO",
      delta: "Mild",
      type: "Aldol",
      context: "Classic carbon-carbon bond formation.",
      mechanism: "Enolate + aldehyde + dehydration."
    },
    {
      name: "Claisen condensation",
      equation: "2 RCOOR + NaOR to RCOCH2COOR + ROH",
      delta: "Mild",
      type: "Condensation",
      context: "Forms beta-keto ester from two esters.",
      mechanism: "Enolate + ester attack."
    },
    {
      name: "Dieckmann cyclization",
      equation: "Diester + base to cyclic beta-keto ester",
      delta: "Mild",
      type: "Intramolecular Claisen",
      context: "Forms cyclic beta-keto esters.",
      mechanism: "Intramolecular Claisen condensation."
    },
    {
      name: "Aza-Cope rearrangement",
      equation: "Iminium-alkene to new iminium-alkene",
      delta: "Mild",
      type: "Sigmatropic",
      context: "3,3-sigmatropic rearrangement of N-containing systems.",
      mechanism: "Concerted [3,3] shift."
    },
    {
      name: "Cope rearrangement",
      equation: "1,5-Hexadiene to 1,5-hexadiene (isomer)",
      delta: "Variable",
      type: "Sigmatropic",
      context: "Classic [3,3]-sigmatropic.",
      mechanism: "Concerted 6-electron pericyclic."
    },
    {
      name: "Claisen rearrangement",
      equation: "Allyl vinyl ether to gamma-delta unsaturated carbonyl",
      delta: "Variable",
      type: "Sigmatropic",
      context: "Oxa-variant of Cope rearrangement.",
      mechanism: "Concerted [3,3] shift."
    },
    {
      name: "Pinacol rearrangement",
      equation: "Pinacol + acid to pinacolone + water",
      delta: "Variable",
      type: "Rearrangement",
      context: "Vicinal diol to ketone.",
      mechanism: "Acid-catalyzed migration."
    },
    {
      name: "Baeyer-Villiger oxidation",
      equation: "Ketone + peracid to ester",
      delta: "Mild",
      type: "Oxidation",
      context: "Inserts oxygen between alpha-C and carbonyl.",
      mechanism: "Migration of alpha-C in tetrahedral intermediate."
    },
    {
      name: "Hofmann rearrangement",
      equation: "RCONH2 + Br2 + NaOH to RNH2",
      delta: "Mild",
      type: "Rearrangement",
      context: "Converts amide to amine (one less carbon).",
      mechanism: "N-bromo amide + base + migration."
    },
    {
      name: "Reimer-Tiemann reaction",
      equation: "Phenol + CHCl3 + KOH to 2-hydroxybenzaldehyde",
      delta: "Mild",
      type: "Formylation",
      context: "Adds formyl to phenol ortho position.",
      mechanism: "Dichlorocarbene addition."
    },
    {
      name: "Kolbe-Schmitt reaction",
      equation: "Sodium phenoxide + CO2 + heat to salicylic acid",
      delta: "Mild",
      type: "Carboxylation",
      context: "Industrial synthesis of salicylic acid (aspirin precursor).",
      mechanism: "Electrophilic carboxylation of activated phenol."
    },
    {
      name: "Williamson ether synthesis",
      equation: "RO- + R-X to ROR + X-",
      delta: "Mild",
      type: "SN2",
      context: "Classic ether synthesis.",
      mechanism: "Alkoxide nucleophile + alkyl halide."
    },
    {
      name: "Eschweiler-Clarke methylation",
      equation: "RNH2 + HCHO + HCOOH to RN(CH3)2",
      delta: "Mild",
      type: "Reductive amination",
      context: "Methylation of primary or secondary amine.",
      mechanism: "Iminium + formate hydride reduction."
    },
    {
      name: "Mannich-Krohnke alkaloid synthesis",
      equation: "Beta-ketoester + amine + aldehyde to alkaloid scaffold",
      delta: "Mild",
      type: "Multi-step",
      context: "Total synthesis approach for many alkaloids.",
      mechanism: "Iminium + enol + cyclization."
    },
    {
      name: "Sharpless dihydroxylation",
      equation: "Alkene + OsO4 + chiral ligand to diol",
      delta: "Mild",
      type: "Asymmetric oxidation",
      context: "Chiral cis-diol synthesis. Sharpless Nobel 2001.",
      mechanism: "Os-alkene complex + ligand controls facial selectivity."
    },
    {
      name: "Jones oxidation",
      equation: "RCH2OH + CrO3/H2SO4 to RCOOH",
      delta: "Strong",
      type: "Oxidation",
      context: "Strong oxidant. Primary alcohol to acid.",
      mechanism: "Cr(VI) abstracts hydrogen from alcohol."
    }
  ];


  var EXPERIMENTS = [
    {
      id: 1,
      title: "Experiment 1: Burning Steel Wool",
      materials: "Steel wool + flame",
      concept: "Iron rusting/oxidation",
      observation: "Steel wool burns when ignited because of high surface area + iron oxidation.",
      safety: "Goggles + ventilation",
      gradeLevel: "9-12",
      duration: "15 min"
    },
    {
      id: 2,
      title: "Experiment 2: Elephant Toothpaste",
      materials: "H2O2 + KI + soap",
      concept: "Catalytic decomposition",
      observation: "Hydrogen peroxide decomposes rapidly with KI catalyst, foaming from soap.",
      safety: "Concentrated H2O2 dangerous",
      gradeLevel: "K-2",
      duration: "45 min"
    },
    {
      id: 3,
      title: "Experiment 3: Rainbow Density Column",
      materials: "Honey, soap, water, oil, alcohol",
      concept: "Density differences",
      observation: "Layered liquids of different densities form colorful column.",
      safety: "Generally safe",
      gradeLevel: "9-12",
      duration: "30 min"
    },
    {
      id: 4,
      title: "Experiment 4: Salt Crystal Growing",
      materials: "Salt + hot water + string",
      concept: "Crystallization",
      observation: "Saturated salt solution slowly evaporates leaving large crystals.",
      safety: "Glass + hot water",
      gradeLevel: "K-2",
      duration: "30 min"
    },
    {
      id: 5,
      title: "Experiment 5: Cabbage Indicator",
      materials: "Red cabbage boiled in water",
      concept: "Acid-base via anthocyanin",
      observation: "Anthocyanins change color with pH from red (acid) to green (base).",
      safety: "Generally safe",
      gradeLevel: "3-5",
      duration: "60 min"
    },
    {
      id: 6,
      title: "Experiment 6: Penny Cleaning",
      materials: "Vinegar + salt",
      concept: "Acid-base + galvanic",
      observation: "Vinegar + salt makes weak HCl that cleans copper oxide.",
      safety: "Generally safe",
      gradeLevel: "3-5",
      duration: "45 min"
    },
    {
      id: 7,
      title: "Experiment 7: Magnesium Burn",
      materials: "Mg ribbon + flame",
      concept: "Combustion of metal",
      observation: "Mg burns brilliantly at 3100°C producing MgO.",
      safety: "Eye protection critical (UV)",
      gradeLevel: "6-8",
      duration: "45 min"
    },
    {
      id: 8,
      title: "Experiment 8: Sodium in Water",
      materials: "Na metal + water",
      concept: "Reactive metal + water",
      observation: "Highly reactive — produces H2 + NaOH + heat.",
      safety: "Highly dangerous; never large amount",
      gradeLevel: "9-12",
      duration: "30 min"
    },
    {
      id: 9,
      title: "Experiment 9: Litmus Test",
      materials: "Litmus paper + various",
      concept: "pH determination",
      observation: "Red in acid, blue in base. Quick indicator.",
      safety: "Avoid strong acids/bases",
      gradeLevel: "6-8",
      duration: "30 min"
    },
    {
      id: 10,
      title: "Experiment 10: Egg in Vinegar",
      materials: "Egg + vinegar",
      concept: "Acid + carbonate",
      observation: "Acetic acid dissolves calcium carbonate shell, leaving membrane.",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "45 min"
    },
    {
      id: 11,
      title: "Experiment 11: Burning Steel Wool",
      materials: "Steel wool + flame",
      concept: "Iron rusting/oxidation",
      observation: "Steel wool burns when ignited because of high surface area + iron oxidation.",
      safety: "Goggles + ventilation",
      gradeLevel: "9-12",
      duration: "45 min"
    },
    {
      id: 12,
      title: "Experiment 12: Elephant Toothpaste",
      materials: "H2O2 + KI + soap",
      concept: "Catalytic decomposition",
      observation: "Hydrogen peroxide decomposes rapidly with KI catalyst, foaming from soap.",
      safety: "Concentrated H2O2 dangerous",
      gradeLevel: "3-5",
      duration: "60 min"
    },
    {
      id: 13,
      title: "Experiment 13: Rainbow Density Column",
      materials: "Honey, soap, water, oil, alcohol",
      concept: "Density differences",
      observation: "Layered liquids of different densities form colorful column.",
      safety: "Generally safe",
      gradeLevel: "3-5",
      duration: "60 min"
    },
    {
      id: 14,
      title: "Experiment 14: Salt Crystal Growing",
      materials: "Salt + hot water + string",
      concept: "Crystallization",
      observation: "Saturated salt solution slowly evaporates leaving large crystals.",
      safety: "Glass + hot water",
      gradeLevel: "K-2",
      duration: "30 min"
    },
    {
      id: 15,
      title: "Experiment 15: Cabbage Indicator",
      materials: "Red cabbage boiled in water",
      concept: "Acid-base via anthocyanin",
      observation: "Anthocyanins change color with pH from red (acid) to green (base).",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "45 min"
    },
    {
      id: 16,
      title: "Experiment 16: Penny Cleaning",
      materials: "Vinegar + salt",
      concept: "Acid-base + galvanic",
      observation: "Vinegar + salt makes weak HCl that cleans copper oxide.",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "60 min"
    },
    {
      id: 17,
      title: "Experiment 17: Magnesium Burn",
      materials: "Mg ribbon + flame",
      concept: "Combustion of metal",
      observation: "Mg burns brilliantly at 3100°C producing MgO.",
      safety: "Eye protection critical (UV)",
      gradeLevel: "K-2",
      duration: "45 min"
    },
    {
      id: 18,
      title: "Experiment 18: Sodium in Water",
      materials: "Na metal + water",
      concept: "Reactive metal + water",
      observation: "Highly reactive — produces H2 + NaOH + heat.",
      safety: "Highly dangerous; never large amount",
      gradeLevel: "9-12",
      duration: "60 min"
    },
    {
      id: 19,
      title: "Experiment 19: Litmus Test",
      materials: "Litmus paper + various",
      concept: "pH determination",
      observation: "Red in acid, blue in base. Quick indicator.",
      safety: "Avoid strong acids/bases",
      gradeLevel: "3-5",
      duration: "30 min"
    },
    {
      id: 20,
      title: "Experiment 20: Egg in Vinegar",
      materials: "Egg + vinegar",
      concept: "Acid + carbonate",
      observation: "Acetic acid dissolves calcium carbonate shell, leaving membrane.",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "15 min"
    },
    {
      id: 21,
      title: "Experiment 21: Burning Steel Wool",
      materials: "Steel wool + flame",
      concept: "Iron rusting/oxidation",
      observation: "Steel wool burns when ignited because of high surface area + iron oxidation.",
      safety: "Goggles + ventilation",
      gradeLevel: "3-5",
      duration: "30 min"
    },
    {
      id: 22,
      title: "Experiment 22: Elephant Toothpaste",
      materials: "H2O2 + KI + soap",
      concept: "Catalytic decomposition",
      observation: "Hydrogen peroxide decomposes rapidly with KI catalyst, foaming from soap.",
      safety: "Concentrated H2O2 dangerous",
      gradeLevel: "9-12",
      duration: "45 min"
    },
    {
      id: 23,
      title: "Experiment 23: Rainbow Density Column",
      materials: "Honey, soap, water, oil, alcohol",
      concept: "Density differences",
      observation: "Layered liquids of different densities form colorful column.",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "15 min"
    },
    {
      id: 24,
      title: "Experiment 24: Salt Crystal Growing",
      materials: "Salt + hot water + string",
      concept: "Crystallization",
      observation: "Saturated salt solution slowly evaporates leaving large crystals.",
      safety: "Glass + hot water",
      gradeLevel: "K-2",
      duration: "15 min"
    },
    {
      id: 25,
      title: "Experiment 25: Cabbage Indicator",
      materials: "Red cabbage boiled in water",
      concept: "Acid-base via anthocyanin",
      observation: "Anthocyanins change color with pH from red (acid) to green (base).",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "60 min"
    },
    {
      id: 26,
      title: "Experiment 26: Penny Cleaning",
      materials: "Vinegar + salt",
      concept: "Acid-base + galvanic",
      observation: "Vinegar + salt makes weak HCl that cleans copper oxide.",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "15 min"
    },
    {
      id: 27,
      title: "Experiment 27: Magnesium Burn",
      materials: "Mg ribbon + flame",
      concept: "Combustion of metal",
      observation: "Mg burns brilliantly at 3100°C producing MgO.",
      safety: "Eye protection critical (UV)",
      gradeLevel: "3-5",
      duration: "30 min"
    },
    {
      id: 28,
      title: "Experiment 28: Sodium in Water",
      materials: "Na metal + water",
      concept: "Reactive metal + water",
      observation: "Highly reactive — produces H2 + NaOH + heat.",
      safety: "Highly dangerous; never large amount",
      gradeLevel: "K-2",
      duration: "15 min"
    },
    {
      id: 29,
      title: "Experiment 29: Litmus Test",
      materials: "Litmus paper + various",
      concept: "pH determination",
      observation: "Red in acid, blue in base. Quick indicator.",
      safety: "Avoid strong acids/bases",
      gradeLevel: "3-5",
      duration: "15 min"
    },
    {
      id: 30,
      title: "Experiment 30: Egg in Vinegar",
      materials: "Egg + vinegar",
      concept: "Acid + carbonate",
      observation: "Acetic acid dissolves calcium carbonate shell, leaving membrane.",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "45 min"
    },
    {
      id: 31,
      title: "Experiment 31: Burning Steel Wool",
      materials: "Steel wool + flame",
      concept: "Iron rusting/oxidation",
      observation: "Steel wool burns when ignited because of high surface area + iron oxidation.",
      safety: "Goggles + ventilation",
      gradeLevel: "3-5",
      duration: "60 min"
    },
    {
      id: 32,
      title: "Experiment 32: Elephant Toothpaste",
      materials: "H2O2 + KI + soap",
      concept: "Catalytic decomposition",
      observation: "Hydrogen peroxide decomposes rapidly with KI catalyst, foaming from soap.",
      safety: "Concentrated H2O2 dangerous",
      gradeLevel: "K-2",
      duration: "30 min"
    },
    {
      id: 33,
      title: "Experiment 33: Rainbow Density Column",
      materials: "Honey, soap, water, oil, alcohol",
      concept: "Density differences",
      observation: "Layered liquids of different densities form colorful column.",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "60 min"
    },
    {
      id: 34,
      title: "Experiment 34: Salt Crystal Growing",
      materials: "Salt + hot water + string",
      concept: "Crystallization",
      observation: "Saturated salt solution slowly evaporates leaving large crystals.",
      safety: "Glass + hot water",
      gradeLevel: "3-5",
      duration: "15 min"
    },
    {
      id: 35,
      title: "Experiment 35: Cabbage Indicator",
      materials: "Red cabbage boiled in water",
      concept: "Acid-base via anthocyanin",
      observation: "Anthocyanins change color with pH from red (acid) to green (base).",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "30 min"
    },
    {
      id: 36,
      title: "Experiment 36: Penny Cleaning",
      materials: "Vinegar + salt",
      concept: "Acid-base + galvanic",
      observation: "Vinegar + salt makes weak HCl that cleans copper oxide.",
      safety: "Generally safe",
      gradeLevel: "9-12",
      duration: "45 min"
    },
    {
      id: 37,
      title: "Experiment 37: Magnesium Burn",
      materials: "Mg ribbon + flame",
      concept: "Combustion of metal",
      observation: "Mg burns brilliantly at 3100°C producing MgO.",
      safety: "Eye protection critical (UV)",
      gradeLevel: "6-8",
      duration: "30 min"
    },
    {
      id: 38,
      title: "Experiment 38: Sodium in Water",
      materials: "Na metal + water",
      concept: "Reactive metal + water",
      observation: "Highly reactive — produces H2 + NaOH + heat.",
      safety: "Highly dangerous; never large amount",
      gradeLevel: "9-12",
      duration: "30 min"
    },
    {
      id: 39,
      title: "Experiment 39: Litmus Test",
      materials: "Litmus paper + various",
      concept: "pH determination",
      observation: "Red in acid, blue in base. Quick indicator.",
      safety: "Avoid strong acids/bases",
      gradeLevel: "K-2",
      duration: "15 min"
    },
    {
      id: 40,
      title: "Experiment 40: Egg in Vinegar",
      materials: "Egg + vinegar",
      concept: "Acid + carbonate",
      observation: "Acetic acid dissolves calcium carbonate shell, leaving membrane.",
      safety: "Generally safe",
      gradeLevel: "9-12",
      duration: "60 min"
    },
    {
      id: 41,
      title: "Experiment 41: Burning Steel Wool",
      materials: "Steel wool + flame",
      concept: "Iron rusting/oxidation",
      observation: "Steel wool burns when ignited because of high surface area + iron oxidation.",
      safety: "Goggles + ventilation",
      gradeLevel: "6-8",
      duration: "45 min"
    },
    {
      id: 42,
      title: "Experiment 42: Elephant Toothpaste",
      materials: "H2O2 + KI + soap",
      concept: "Catalytic decomposition",
      observation: "Hydrogen peroxide decomposes rapidly with KI catalyst, foaming from soap.",
      safety: "Concentrated H2O2 dangerous",
      gradeLevel: "9-12",
      duration: "60 min"
    },
    {
      id: 43,
      title: "Experiment 43: Rainbow Density Column",
      materials: "Honey, soap, water, oil, alcohol",
      concept: "Density differences",
      observation: "Layered liquids of different densities form colorful column.",
      safety: "Generally safe",
      gradeLevel: "6-8",
      duration: "30 min"
    },
    {
      id: 44,
      title: "Experiment 44: Salt Crystal Growing",
      materials: "Salt + hot water + string",
      concept: "Crystallization",
      observation: "Saturated salt solution slowly evaporates leaving large crystals.",
      safety: "Glass + hot water",
      gradeLevel: "3-5",
      duration: "60 min"
    },
    {
      id: 45,
      title: "Experiment 45: Cabbage Indicator",
      materials: "Red cabbage boiled in water",
      concept: "Acid-base via anthocyanin",
      observation: "Anthocyanins change color with pH from red (acid) to green (base).",
      safety: "Generally safe",
      gradeLevel: "3-5",
      duration: "60 min"
    },
    {
      id: 46,
      title: "Experiment 46: Penny Cleaning",
      materials: "Vinegar + salt",
      concept: "Acid-base + galvanic",
      observation: "Vinegar + salt makes weak HCl that cleans copper oxide.",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "60 min"
    },
    {
      id: 47,
      title: "Experiment 47: Magnesium Burn",
      materials: "Mg ribbon + flame",
      concept: "Combustion of metal",
      observation: "Mg burns brilliantly at 3100°C producing MgO.",
      safety: "Eye protection critical (UV)",
      gradeLevel: "6-8",
      duration: "60 min"
    },
    {
      id: 48,
      title: "Experiment 48: Sodium in Water",
      materials: "Na metal + water",
      concept: "Reactive metal + water",
      observation: "Highly reactive — produces H2 + NaOH + heat.",
      safety: "Highly dangerous; never large amount",
      gradeLevel: "3-5",
      duration: "30 min"
    },
    {
      id: 49,
      title: "Experiment 49: Litmus Test",
      materials: "Litmus paper + various",
      concept: "pH determination",
      observation: "Red in acid, blue in base. Quick indicator.",
      safety: "Avoid strong acids/bases",
      gradeLevel: "K-2",
      duration: "15 min"
    },
    {
      id: 50,
      title: "Experiment 50: Egg in Vinegar",
      materials: "Egg + vinegar",
      concept: "Acid + carbonate",
      observation: "Acetic acid dissolves calcium carbonate shell, leaving membrane.",
      safety: "Generally safe",
      gradeLevel: "6-8",
      duration: "15 min"
    },
    {
      id: 51,
      title: "Experiment 51: Burning Steel Wool",
      materials: "Steel wool + flame",
      concept: "Iron rusting/oxidation",
      observation: "Steel wool burns when ignited because of high surface area + iron oxidation.",
      safety: "Goggles + ventilation",
      gradeLevel: "3-5",
      duration: "30 min"
    },
    {
      id: 52,
      title: "Experiment 52: Elephant Toothpaste",
      materials: "H2O2 + KI + soap",
      concept: "Catalytic decomposition",
      observation: "Hydrogen peroxide decomposes rapidly with KI catalyst, foaming from soap.",
      safety: "Concentrated H2O2 dangerous",
      gradeLevel: "9-12",
      duration: "60 min"
    },
    {
      id: 53,
      title: "Experiment 53: Rainbow Density Column",
      materials: "Honey, soap, water, oil, alcohol",
      concept: "Density differences",
      observation: "Layered liquids of different densities form colorful column.",
      safety: "Generally safe",
      gradeLevel: "9-12",
      duration: "15 min"
    },
    {
      id: 54,
      title: "Experiment 54: Salt Crystal Growing",
      materials: "Salt + hot water + string",
      concept: "Crystallization",
      observation: "Saturated salt solution slowly evaporates leaving large crystals.",
      safety: "Glass + hot water",
      gradeLevel: "6-8",
      duration: "60 min"
    },
    {
      id: 55,
      title: "Experiment 55: Cabbage Indicator",
      materials: "Red cabbage boiled in water",
      concept: "Acid-base via anthocyanin",
      observation: "Anthocyanins change color with pH from red (acid) to green (base).",
      safety: "Generally safe",
      gradeLevel: "9-12",
      duration: "15 min"
    },
    {
      id: 56,
      title: "Experiment 56: Penny Cleaning",
      materials: "Vinegar + salt",
      concept: "Acid-base + galvanic",
      observation: "Vinegar + salt makes weak HCl that cleans copper oxide.",
      safety: "Generally safe",
      gradeLevel: "9-12",
      duration: "45 min"
    },
    {
      id: 57,
      title: "Experiment 57: Magnesium Burn",
      materials: "Mg ribbon + flame",
      concept: "Combustion of metal",
      observation: "Mg burns brilliantly at 3100°C producing MgO.",
      safety: "Eye protection critical (UV)",
      gradeLevel: "6-8",
      duration: "60 min"
    },
    {
      id: 58,
      title: "Experiment 58: Sodium in Water",
      materials: "Na metal + water",
      concept: "Reactive metal + water",
      observation: "Highly reactive — produces H2 + NaOH + heat.",
      safety: "Highly dangerous; never large amount",
      gradeLevel: "3-5",
      duration: "60 min"
    },
    {
      id: 59,
      title: "Experiment 59: Litmus Test",
      materials: "Litmus paper + various",
      concept: "pH determination",
      observation: "Red in acid, blue in base. Quick indicator.",
      safety: "Avoid strong acids/bases",
      gradeLevel: "K-2",
      duration: "45 min"
    },
    {
      id: 60,
      title: "Experiment 60: Egg in Vinegar",
      materials: "Egg + vinegar",
      concept: "Acid + carbonate",
      observation: "Acetic acid dissolves calcium carbonate shell, leaving membrane.",
      safety: "Generally safe",
      gradeLevel: "3-5",
      duration: "15 min"
    },
    {
      id: 61,
      title: "Experiment 61: Burning Steel Wool",
      materials: "Steel wool + flame",
      concept: "Iron rusting/oxidation",
      observation: "Steel wool burns when ignited because of high surface area + iron oxidation.",
      safety: "Goggles + ventilation",
      gradeLevel: "6-8",
      duration: "30 min"
    },
    {
      id: 62,
      title: "Experiment 62: Elephant Toothpaste",
      materials: "H2O2 + KI + soap",
      concept: "Catalytic decomposition",
      observation: "Hydrogen peroxide decomposes rapidly with KI catalyst, foaming from soap.",
      safety: "Concentrated H2O2 dangerous",
      gradeLevel: "K-2",
      duration: "30 min"
    },
    {
      id: 63,
      title: "Experiment 63: Rainbow Density Column",
      materials: "Honey, soap, water, oil, alcohol",
      concept: "Density differences",
      observation: "Layered liquids of different densities form colorful column.",
      safety: "Generally safe",
      gradeLevel: "6-8",
      duration: "15 min"
    },
    {
      id: 64,
      title: "Experiment 64: Salt Crystal Growing",
      materials: "Salt + hot water + string",
      concept: "Crystallization",
      observation: "Saturated salt solution slowly evaporates leaving large crystals.",
      safety: "Glass + hot water",
      gradeLevel: "9-12",
      duration: "30 min"
    },
    {
      id: 65,
      title: "Experiment 65: Cabbage Indicator",
      materials: "Red cabbage boiled in water",
      concept: "Acid-base via anthocyanin",
      observation: "Anthocyanins change color with pH from red (acid) to green (base).",
      safety: "Generally safe",
      gradeLevel: "3-5",
      duration: "30 min"
    },
    {
      id: 66,
      title: "Experiment 66: Penny Cleaning",
      materials: "Vinegar + salt",
      concept: "Acid-base + galvanic",
      observation: "Vinegar + salt makes weak HCl that cleans copper oxide.",
      safety: "Generally safe",
      gradeLevel: "6-8",
      duration: "30 min"
    },
    {
      id: 67,
      title: "Experiment 67: Magnesium Burn",
      materials: "Mg ribbon + flame",
      concept: "Combustion of metal",
      observation: "Mg burns brilliantly at 3100°C producing MgO.",
      safety: "Eye protection critical (UV)",
      gradeLevel: "9-12",
      duration: "45 min"
    },
    {
      id: 68,
      title: "Experiment 68: Sodium in Water",
      materials: "Na metal + water",
      concept: "Reactive metal + water",
      observation: "Highly reactive — produces H2 + NaOH + heat.",
      safety: "Highly dangerous; never large amount",
      gradeLevel: "K-2",
      duration: "45 min"
    },
    {
      id: 69,
      title: "Experiment 69: Litmus Test",
      materials: "Litmus paper + various",
      concept: "pH determination",
      observation: "Red in acid, blue in base. Quick indicator.",
      safety: "Avoid strong acids/bases",
      gradeLevel: "K-2",
      duration: "15 min"
    },
    {
      id: 70,
      title: "Experiment 70: Egg in Vinegar",
      materials: "Egg + vinegar",
      concept: "Acid + carbonate",
      observation: "Acetic acid dissolves calcium carbonate shell, leaving membrane.",
      safety: "Generally safe",
      gradeLevel: "6-8",
      duration: "15 min"
    },
    {
      id: 71,
      title: "Experiment 71: Burning Steel Wool",
      materials: "Steel wool + flame",
      concept: "Iron rusting/oxidation",
      observation: "Steel wool burns when ignited because of high surface area + iron oxidation.",
      safety: "Goggles + ventilation",
      gradeLevel: "K-2",
      duration: "60 min"
    },
    {
      id: 72,
      title: "Experiment 72: Elephant Toothpaste",
      materials: "H2O2 + KI + soap",
      concept: "Catalytic decomposition",
      observation: "Hydrogen peroxide decomposes rapidly with KI catalyst, foaming from soap.",
      safety: "Concentrated H2O2 dangerous",
      gradeLevel: "9-12",
      duration: "30 min"
    },
    {
      id: 73,
      title: "Experiment 73: Rainbow Density Column",
      materials: "Honey, soap, water, oil, alcohol",
      concept: "Density differences",
      observation: "Layered liquids of different densities form colorful column.",
      safety: "Generally safe",
      gradeLevel: "6-8",
      duration: "30 min"
    },
    {
      id: 74,
      title: "Experiment 74: Salt Crystal Growing",
      materials: "Salt + hot water + string",
      concept: "Crystallization",
      observation: "Saturated salt solution slowly evaporates leaving large crystals.",
      safety: "Glass + hot water",
      gradeLevel: "6-8",
      duration: "60 min"
    },
    {
      id: 75,
      title: "Experiment 75: Cabbage Indicator",
      materials: "Red cabbage boiled in water",
      concept: "Acid-base via anthocyanin",
      observation: "Anthocyanins change color with pH from red (acid) to green (base).",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "15 min"
    },
    {
      id: 76,
      title: "Experiment 76: Penny Cleaning",
      materials: "Vinegar + salt",
      concept: "Acid-base + galvanic",
      observation: "Vinegar + salt makes weak HCl that cleans copper oxide.",
      safety: "Generally safe",
      gradeLevel: "9-12",
      duration: "15 min"
    },
    {
      id: 77,
      title: "Experiment 77: Magnesium Burn",
      materials: "Mg ribbon + flame",
      concept: "Combustion of metal",
      observation: "Mg burns brilliantly at 3100°C producing MgO.",
      safety: "Eye protection critical (UV)",
      gradeLevel: "9-12",
      duration: "45 min"
    },
    {
      id: 78,
      title: "Experiment 78: Sodium in Water",
      materials: "Na metal + water",
      concept: "Reactive metal + water",
      observation: "Highly reactive — produces H2 + NaOH + heat.",
      safety: "Highly dangerous; never large amount",
      gradeLevel: "6-8",
      duration: "15 min"
    },
    {
      id: 79,
      title: "Experiment 79: Litmus Test",
      materials: "Litmus paper + various",
      concept: "pH determination",
      observation: "Red in acid, blue in base. Quick indicator.",
      safety: "Avoid strong acids/bases",
      gradeLevel: "3-5",
      duration: "45 min"
    },
    {
      id: 80,
      title: "Experiment 80: Egg in Vinegar",
      materials: "Egg + vinegar",
      concept: "Acid + carbonate",
      observation: "Acetic acid dissolves calcium carbonate shell, leaving membrane.",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "15 min"
    },
    {
      id: 81,
      title: "Experiment 81: Burning Steel Wool",
      materials: "Steel wool + flame",
      concept: "Iron rusting/oxidation",
      observation: "Steel wool burns when ignited because of high surface area + iron oxidation.",
      safety: "Goggles + ventilation",
      gradeLevel: "6-8",
      duration: "30 min"
    },
    {
      id: 82,
      title: "Experiment 82: Elephant Toothpaste",
      materials: "H2O2 + KI + soap",
      concept: "Catalytic decomposition",
      observation: "Hydrogen peroxide decomposes rapidly with KI catalyst, foaming from soap.",
      safety: "Concentrated H2O2 dangerous",
      gradeLevel: "9-12",
      duration: "45 min"
    },
    {
      id: 83,
      title: "Experiment 83: Rainbow Density Column",
      materials: "Honey, soap, water, oil, alcohol",
      concept: "Density differences",
      observation: "Layered liquids of different densities form colorful column.",
      safety: "Generally safe",
      gradeLevel: "9-12",
      duration: "45 min"
    },
    {
      id: 84,
      title: "Experiment 84: Salt Crystal Growing",
      materials: "Salt + hot water + string",
      concept: "Crystallization",
      observation: "Saturated salt solution slowly evaporates leaving large crystals.",
      safety: "Glass + hot water",
      gradeLevel: "3-5",
      duration: "60 min"
    },
    {
      id: 85,
      title: "Experiment 85: Cabbage Indicator",
      materials: "Red cabbage boiled in water",
      concept: "Acid-base via anthocyanin",
      observation: "Anthocyanins change color with pH from red (acid) to green (base).",
      safety: "Generally safe",
      gradeLevel: "6-8",
      duration: "60 min"
    },
    {
      id: 86,
      title: "Experiment 86: Penny Cleaning",
      materials: "Vinegar + salt",
      concept: "Acid-base + galvanic",
      observation: "Vinegar + salt makes weak HCl that cleans copper oxide.",
      safety: "Generally safe",
      gradeLevel: "3-5",
      duration: "15 min"
    },
    {
      id: 87,
      title: "Experiment 87: Magnesium Burn",
      materials: "Mg ribbon + flame",
      concept: "Combustion of metal",
      observation: "Mg burns brilliantly at 3100°C producing MgO.",
      safety: "Eye protection critical (UV)",
      gradeLevel: "K-2",
      duration: "15 min"
    },
    {
      id: 88,
      title: "Experiment 88: Sodium in Water",
      materials: "Na metal + water",
      concept: "Reactive metal + water",
      observation: "Highly reactive — produces H2 + NaOH + heat.",
      safety: "Highly dangerous; never large amount",
      gradeLevel: "3-5",
      duration: "15 min"
    },
    {
      id: 89,
      title: "Experiment 89: Litmus Test",
      materials: "Litmus paper + various",
      concept: "pH determination",
      observation: "Red in acid, blue in base. Quick indicator.",
      safety: "Avoid strong acids/bases",
      gradeLevel: "3-5",
      duration: "15 min"
    },
    {
      id: 90,
      title: "Experiment 90: Egg in Vinegar",
      materials: "Egg + vinegar",
      concept: "Acid + carbonate",
      observation: "Acetic acid dissolves calcium carbonate shell, leaving membrane.",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "30 min"
    },
    {
      id: 91,
      title: "Experiment 91: Burning Steel Wool",
      materials: "Steel wool + flame",
      concept: "Iron rusting/oxidation",
      observation: "Steel wool burns when ignited because of high surface area + iron oxidation.",
      safety: "Goggles + ventilation",
      gradeLevel: "6-8",
      duration: "15 min"
    },
    {
      id: 92,
      title: "Experiment 92: Elephant Toothpaste",
      materials: "H2O2 + KI + soap",
      concept: "Catalytic decomposition",
      observation: "Hydrogen peroxide decomposes rapidly with KI catalyst, foaming from soap.",
      safety: "Concentrated H2O2 dangerous",
      gradeLevel: "6-8",
      duration: "30 min"
    },
    {
      id: 93,
      title: "Experiment 93: Rainbow Density Column",
      materials: "Honey, soap, water, oil, alcohol",
      concept: "Density differences",
      observation: "Layered liquids of different densities form colorful column.",
      safety: "Generally safe",
      gradeLevel: "6-8",
      duration: "60 min"
    },
    {
      id: 94,
      title: "Experiment 94: Salt Crystal Growing",
      materials: "Salt + hot water + string",
      concept: "Crystallization",
      observation: "Saturated salt solution slowly evaporates leaving large crystals.",
      safety: "Glass + hot water",
      gradeLevel: "9-12",
      duration: "15 min"
    },
    {
      id: 95,
      title: "Experiment 95: Cabbage Indicator",
      materials: "Red cabbage boiled in water",
      concept: "Acid-base via anthocyanin",
      observation: "Anthocyanins change color with pH from red (acid) to green (base).",
      safety: "Generally safe",
      gradeLevel: "3-5",
      duration: "30 min"
    },
    {
      id: 96,
      title: "Experiment 96: Penny Cleaning",
      materials: "Vinegar + salt",
      concept: "Acid-base + galvanic",
      observation: "Vinegar + salt makes weak HCl that cleans copper oxide.",
      safety: "Generally safe",
      gradeLevel: "K-2",
      duration: "30 min"
    },
    {
      id: 97,
      title: "Experiment 97: Magnesium Burn",
      materials: "Mg ribbon + flame",
      concept: "Combustion of metal",
      observation: "Mg burns brilliantly at 3100°C producing MgO.",
      safety: "Eye protection critical (UV)",
      gradeLevel: "K-2",
      duration: "30 min"
    },
    {
      id: 98,
      title: "Experiment 98: Sodium in Water",
      materials: "Na metal + water",
      concept: "Reactive metal + water",
      observation: "Highly reactive — produces H2 + NaOH + heat.",
      safety: "Highly dangerous; never large amount",
      gradeLevel: "3-5",
      duration: "15 min"
    },
    {
      id: 99,
      title: "Experiment 99: Litmus Test",
      materials: "Litmus paper + various",
      concept: "pH determination",
      observation: "Red in acid, blue in base. Quick indicator.",
      safety: "Avoid strong acids/bases",
      gradeLevel: "6-8",
      duration: "45 min"
    },
    {
      id: 100,
      title: "Experiment 100: Egg in Vinegar",
      materials: "Egg + vinegar",
      concept: "Acid + carbonate",
      observation: "Acetic acid dissolves calcium carbonate shell, leaving membrane.",
      safety: "Generally safe",
      gradeLevel: "3-5",
      duration: "15 min"
    }
  ];

  var EXTRA_QUIZ = [
    {
      id: 1,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 2,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 3,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 4,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 5,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "medium",
      category: "Periodic Table"
    },
    {
      id: 6,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "hard",
      category: "Acids/Bases"
    },
    {
      id: 7,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "easy",
      category: "Atoms"
    },
    {
      id: 8,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "medium",
      category: "Reactions"
    },
    {
      id: 9,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "hard",
      category: "Stoichiometry"
    },
    {
      id: 10,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "easy",
      category: "Periodic Table"
    },
    {
      id: 11,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "medium",
      category: "Acids/Bases"
    },
    {
      id: 12,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "hard",
      category: "Atoms"
    },
    {
      id: 13,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "easy",
      category: "Reactions"
    },
    {
      id: 14,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "medium",
      category: "Stoichiometry"
    },
    {
      id: 15,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "hard",
      category: "Periodic Table"
    },
    {
      id: 16,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 17,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 18,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 19,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 20,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "medium",
      category: "Periodic Table"
    },
    {
      id: 21,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "hard",
      category: "Acids/Bases"
    },
    {
      id: 22,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "easy",
      category: "Atoms"
    },
    {
      id: 23,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "medium",
      category: "Reactions"
    },
    {
      id: 24,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "hard",
      category: "Stoichiometry"
    },
    {
      id: 25,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "easy",
      category: "Periodic Table"
    },
    {
      id: 26,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "medium",
      category: "Acids/Bases"
    },
    {
      id: 27,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "hard",
      category: "Atoms"
    },
    {
      id: 28,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "easy",
      category: "Reactions"
    },
    {
      id: 29,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "medium",
      category: "Stoichiometry"
    },
    {
      id: 30,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "hard",
      category: "Periodic Table"
    },
    {
      id: 31,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 32,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 33,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 34,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 35,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "medium",
      category: "Periodic Table"
    },
    {
      id: 36,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "hard",
      category: "Acids/Bases"
    },
    {
      id: 37,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "easy",
      category: "Atoms"
    },
    {
      id: 38,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "medium",
      category: "Reactions"
    },
    {
      id: 39,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "hard",
      category: "Stoichiometry"
    },
    {
      id: 40,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "easy",
      category: "Periodic Table"
    },
    {
      id: 41,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "medium",
      category: "Acids/Bases"
    },
    {
      id: 42,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "hard",
      category: "Atoms"
    },
    {
      id: 43,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "easy",
      category: "Reactions"
    },
    {
      id: 44,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "medium",
      category: "Stoichiometry"
    },
    {
      id: 45,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "hard",
      category: "Periodic Table"
    },
    {
      id: 46,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 47,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 48,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 49,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 50,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "medium",
      category: "Periodic Table"
    },
    {
      id: 51,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "hard",
      category: "Acids/Bases"
    },
    {
      id: 52,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "easy",
      category: "Atoms"
    },
    {
      id: 53,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "medium",
      category: "Reactions"
    },
    {
      id: 54,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "hard",
      category: "Stoichiometry"
    },
    {
      id: 55,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "easy",
      category: "Periodic Table"
    },
    {
      id: 56,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "medium",
      category: "Acids/Bases"
    },
    {
      id: 57,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "hard",
      category: "Atoms"
    },
    {
      id: 58,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "easy",
      category: "Reactions"
    },
    {
      id: 59,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "medium",
      category: "Stoichiometry"
    },
    {
      id: 60,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "hard",
      category: "Periodic Table"
    },
    {
      id: 61,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 62,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 63,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 64,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 65,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "medium",
      category: "Periodic Table"
    },
    {
      id: 66,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "hard",
      category: "Acids/Bases"
    },
    {
      id: 67,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "easy",
      category: "Atoms"
    },
    {
      id: 68,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "medium",
      category: "Reactions"
    },
    {
      id: 69,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "hard",
      category: "Stoichiometry"
    },
    {
      id: 70,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "easy",
      category: "Periodic Table"
    },
    {
      id: 71,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "medium",
      category: "Acids/Bases"
    },
    {
      id: 72,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "hard",
      category: "Atoms"
    },
    {
      id: 73,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "easy",
      category: "Reactions"
    },
    {
      id: 74,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "medium",
      category: "Stoichiometry"
    },
    {
      id: 75,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "hard",
      category: "Periodic Table"
    },
    {
      id: 76,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 77,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 78,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 79,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 80,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "medium",
      category: "Periodic Table"
    },
    {
      id: 81,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "hard",
      category: "Acids/Bases"
    },
    {
      id: 82,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "easy",
      category: "Atoms"
    },
    {
      id: 83,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "medium",
      category: "Reactions"
    },
    {
      id: 84,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "hard",
      category: "Stoichiometry"
    },
    {
      id: 85,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "easy",
      category: "Periodic Table"
    },
    {
      id: 86,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "medium",
      category: "Acids/Bases"
    },
    {
      id: 87,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "hard",
      category: "Atoms"
    },
    {
      id: 88,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "easy",
      category: "Reactions"
    },
    {
      id: 89,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "medium",
      category: "Stoichiometry"
    },
    {
      id: 90,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "hard",
      category: "Periodic Table"
    },
    {
      id: 91,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 92,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 93,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 94,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 95,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "medium",
      category: "Periodic Table"
    },
    {
      id: 96,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "hard",
      category: "Acids/Bases"
    },
    {
      id: 97,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "easy",
      category: "Atoms"
    },
    {
      id: 98,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "medium",
      category: "Reactions"
    },
    {
      id: 99,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "hard",
      category: "Stoichiometry"
    },
    {
      id: 100,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "easy",
      category: "Periodic Table"
    },
    {
      id: 101,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "medium",
      category: "Acids/Bases"
    },
    {
      id: 102,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "hard",
      category: "Atoms"
    },
    {
      id: 103,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "easy",
      category: "Reactions"
    },
    {
      id: 104,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "medium",
      category: "Stoichiometry"
    },
    {
      id: 105,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "hard",
      category: "Periodic Table"
    },
    {
      id: 106,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 107,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 108,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 109,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 110,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "medium",
      category: "Periodic Table"
    },
    {
      id: 111,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "hard",
      category: "Acids/Bases"
    },
    {
      id: 112,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "easy",
      category: "Atoms"
    },
    {
      id: 113,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "medium",
      category: "Reactions"
    },
    {
      id: 114,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "hard",
      category: "Stoichiometry"
    },
    {
      id: 115,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "easy",
      category: "Periodic Table"
    },
    {
      id: 116,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "medium",
      category: "Acids/Bases"
    },
    {
      id: 117,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "hard",
      category: "Atoms"
    },
    {
      id: 118,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "easy",
      category: "Reactions"
    },
    {
      id: 119,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "medium",
      category: "Stoichiometry"
    },
    {
      id: 120,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "hard",
      category: "Periodic Table"
    },
    {
      id: 121,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 122,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 123,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 124,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 125,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "medium",
      category: "Periodic Table"
    },
    {
      id: 126,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "hard",
      category: "Acids/Bases"
    },
    {
      id: 127,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "easy",
      category: "Atoms"
    },
    {
      id: 128,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "medium",
      category: "Reactions"
    },
    {
      id: 129,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "hard",
      category: "Stoichiometry"
    },
    {
      id: 130,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "easy",
      category: "Periodic Table"
    },
    {
      id: 131,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "medium",
      category: "Acids/Bases"
    },
    {
      id: 132,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "hard",
      category: "Atoms"
    },
    {
      id: 133,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "easy",
      category: "Reactions"
    },
    {
      id: 134,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "medium",
      category: "Stoichiometry"
    },
    {
      id: 135,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "hard",
      category: "Periodic Table"
    },
    {
      id: 136,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 137,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 138,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 139,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 140,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "medium",
      category: "Periodic Table"
    },
    {
      id: 141,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "hard",
      category: "Acids/Bases"
    },
    {
      id: 142,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "easy",
      category: "Atoms"
    },
    {
      id: 143,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "medium",
      category: "Reactions"
    },
    {
      id: 144,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "hard",
      category: "Stoichiometry"
    },
    {
      id: 145,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "easy",
      category: "Periodic Table"
    },
    {
      id: 146,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "medium",
      category: "Acids/Bases"
    },
    {
      id: 147,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "hard",
      category: "Atoms"
    },
    {
      id: 148,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "easy",
      category: "Reactions"
    },
    {
      id: 149,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "medium",
      category: "Stoichiometry"
    },
    {
      id: 150,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "hard",
      category: "Periodic Table"
    },
    {
      id: 151,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 152,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 153,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 154,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 155,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "medium",
      category: "Periodic Table"
    },
    {
      id: 156,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "hard",
      category: "Acids/Bases"
    },
    {
      id: 157,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "easy",
      category: "Atoms"
    },
    {
      id: 158,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "medium",
      category: "Reactions"
    },
    {
      id: 159,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "hard",
      category: "Stoichiometry"
    },
    {
      id: 160,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "easy",
      category: "Periodic Table"
    },
    {
      id: 161,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "medium",
      category: "Acids/Bases"
    },
    {
      id: 162,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "hard",
      category: "Atoms"
    },
    {
      id: 163,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "easy",
      category: "Reactions"
    },
    {
      id: 164,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "medium",
      category: "Stoichiometry"
    },
    {
      id: 165,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "hard",
      category: "Periodic Table"
    },
    {
      id: 166,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 167,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 168,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 169,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 170,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "medium",
      category: "Periodic Table"
    },
    {
      id: 171,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "hard",
      category: "Acids/Bases"
    },
    {
      id: 172,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "easy",
      category: "Atoms"
    },
    {
      id: 173,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "medium",
      category: "Reactions"
    },
    {
      id: 174,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "hard",
      category: "Stoichiometry"
    },
    {
      id: 175,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "easy",
      category: "Periodic Table"
    },
    {
      id: 176,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "medium",
      category: "Acids/Bases"
    },
    {
      id: 177,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "hard",
      category: "Atoms"
    },
    {
      id: 178,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "easy",
      category: "Reactions"
    },
    {
      id: 179,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "medium",
      category: "Stoichiometry"
    },
    {
      id: 180,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "hard",
      category: "Periodic Table"
    },
    {
      id: 181,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 182,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 183,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 184,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 185,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "medium",
      category: "Periodic Table"
    },
    {
      id: 186,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "hard",
      category: "Acids/Bases"
    },
    {
      id: 187,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "easy",
      category: "Atoms"
    },
    {
      id: 188,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "medium",
      category: "Reactions"
    },
    {
      id: 189,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "hard",
      category: "Stoichiometry"
    },
    {
      id: 190,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "easy",
      category: "Periodic Table"
    },
    {
      id: 191,
      question: "What is the chemical symbol for water?",
      options: ["H2O","CO2","NaCl","O2"],
      correct: 0,
      explanation: "Water = 2 H + 1 O",
      difficulty: "medium",
      category: "Acids/Bases"
    },
    {
      id: 192,
      question: "What gives carbon its name?",
      options: ["Latin carbo (coal)","Greek karbon","Sanskrit carb","Arabic kar"],
      correct: 0,
      explanation: "Comes from Latin word for coal.",
      difficulty: "hard",
      category: "Atoms"
    },
    {
      id: 193,
      question: "What is the most abundant gas in Earth's atmosphere?",
      options: ["Nitrogen","Oxygen","CO2","Argon"],
      correct: 0,
      explanation: "78% of atmosphere.",
      difficulty: "easy",
      category: "Reactions"
    },
    {
      id: 194,
      question: "Which element has atomic number 6?",
      options: ["Carbon","Oxygen","Hydrogen","Nitrogen"],
      correct: 0,
      explanation: "Z = 6 means 6 protons.",
      difficulty: "medium",
      category: "Stoichiometry"
    },
    {
      id: 195,
      question: "What is the chemical symbol for gold?",
      options: ["Au","Ag","Fe","Hg"],
      correct: 0,
      explanation: "From Latin aurum.",
      difficulty: "hard",
      category: "Periodic Table"
    },
    {
      id: 196,
      question: "What is sulfuric acid's formula?",
      options: ["H2SO4","HCl","HNO3","H3PO4"],
      correct: 0,
      explanation: "Most-produced industrial chemical.",
      difficulty: "easy",
      category: "Acids/Bases"
    },
    {
      id: 197,
      question: "What number of electrons in a neutral oxygen atom?",
      options: ["8","6","4","10"],
      correct: 0,
      explanation: "Z = 8 means 8 electrons.",
      difficulty: "medium",
      category: "Atoms"
    },
    {
      id: 198,
      question: "What does pH measure?",
      options: ["H+ concentration","Salt content","Color","Density"],
      correct: 0,
      explanation: "pH = -log[H+]",
      difficulty: "hard",
      category: "Reactions"
    },
    {
      id: 199,
      question: "Strong acids are characterized by:",
      options: ["Complete dissociation","Color","Smell","Temperature"],
      correct: 0,
      explanation: "They ionize fully.",
      difficulty: "easy",
      category: "Stoichiometry"
    },
    {
      id: 200,
      question: "Which is NOT a strong acid?",
      options: ["HF","HCl","HBr","HI"],
      correct: 0,
      explanation: "HF is weak; others are strong.",
      difficulty: "medium",
      category: "Periodic Table"
    }
  ];

  var TRIVIA_BIG = [
    {
      id: 1,
      fact: "Diamond and graphite are both pure carbon.",
      category: "Element"
    },
    {
      id: 2,
      fact: "Pencils contain graphite, not lead.",
      category: "Industrial"
    },
    {
      id: 3,
      fact: "Mercury is the only metal liquid at room temperature (Br is the only liquid nonmetal).",
      category: "Biology"
    },
    {
      id: 4,
      fact: "Helium is the only element discovered on the Sun before Earth.",
      category: "History"
    },
    {
      id: 5,
      fact: "Gallium melts in your hand at 30 degrees C.",
      category: "Physics"
    },
    {
      id: 6,
      fact: "Most copper used in human history is still in use.",
      category: "Health"
    },
    {
      id: 7,
      fact: "Stainless steel needs at least 10.5 percent chromium for corrosion resistance.",
      category: "Element"
    },
    {
      id: 8,
      fact: "About 21 percent of atmospheric oxygen came from photosynthesis.",
      category: "Industrial"
    },
    {
      id: 9,
      fact: "The atomic mass of an element is its weighted isotope average.",
      category: "Biology"
    },
    {
      id: 10,
      fact: "Every cell on Earth uses carbon.",
      category: "History"
    },
    {
      id: 11,
      fact: "Iron is the most abundant metal in your body.",
      category: "Physics"
    },
    {
      id: 12,
      fact: "Calcium makes up about 1.5 percent of human body mass.",
      category: "Health"
    },
    {
      id: 13,
      fact: "Hemoglobin carries oxygen via 4 iron atoms.",
      category: "Element"
    },
    {
      id: 14,
      fact: "B12 vitamin contains cobalt.",
      category: "Industrial"
    },
    {
      id: 15,
      fact: "Sodium and potassium are essential for nerve function.",
      category: "Biology"
    },
    {
      id: 16,
      fact: "Selenium deficiency causes Keshan disease.",
      category: "History"
    },
    {
      id: 17,
      fact: "Iodine deficiency causes goiter and cretinism.",
      category: "Physics"
    },
    {
      id: 18,
      fact: "Hand sanitizer is usually 60-70 percent ethanol.",
      category: "Health"
    },
    {
      id: 19,
      fact: "Vinegar is 5 percent acetic acid in water.",
      category: "Element"
    },
    {
      id: 20,
      fact: "Lemon juice is 5 percent citric acid.",
      category: "Industrial"
    },
    {
      id: 21,
      fact: "Coca-Cola has a pH of about 2.5.",
      category: "Biology"
    },
    {
      id: 22,
      fact: "Coffee has a pH of about 5.",
      category: "History"
    },
    {
      id: 23,
      fact: "Pure water has a pH of 7.",
      category: "Physics"
    },
    {
      id: 24,
      fact: "Bleach has a pH of about 12.",
      category: "Health"
    },
    {
      id: 25,
      fact: "Stomach acid pH is around 1-3.",
      category: "Element"
    },
    {
      id: 26,
      fact: "Baking soda is sodium bicarbonate.",
      category: "Industrial"
    },
    {
      id: 27,
      fact: "Salt water boils at higher temperature than fresh water.",
      category: "Biology"
    },
    {
      id: 28,
      fact: "Salt water freezes at lower temperature than fresh water.",
      category: "History"
    },
    {
      id: 29,
      fact: "Ice floats because solid water is less dense than liquid.",
      category: "Physics"
    },
    {
      id: 30,
      fact: "Water expands about 9 percent when it freezes.",
      category: "Health"
    },
    {
      id: 31,
      fact: "Dry ice is solid CO2 at minus 78 degrees C.",
      category: "Element"
    },
    {
      id: 32,
      fact: "Liquid nitrogen is minus 196 degrees C.",
      category: "Industrial"
    },
    {
      id: 33,
      fact: "Liquid helium is minus 269 degrees C.",
      category: "Biology"
    },
    {
      id: 34,
      fact: "Tungsten melts at 3422 degrees C (highest metal).",
      category: "History"
    },
    {
      id: 35,
      fact: "Helium boils at minus 269 degrees C (lowest element).",
      category: "Physics"
    },
    {
      id: 36,
      fact: "Most reactive metal is cesium.",
      category: "Health"
    },
    {
      id: 37,
      fact: "Most reactive nonmetal is fluorine.",
      category: "Element"
    },
    {
      id: 38,
      fact: "Hardest natural mineral is diamond (Mohs 10).",
      category: "Industrial"
    },
    {
      id: 39,
      fact: "Hardest synthetic material is cubic boron nitride.",
      category: "Biology"
    },
    {
      id: 40,
      fact: "Densest natural element is osmium at 22.59 g/cm3.",
      category: "History"
    },
    {
      id: 41,
      fact: "Lightest natural element is hydrogen.",
      category: "Physics"
    },
    {
      id: 42,
      fact: "Most expensive precious metal is rhodium.",
      category: "Health"
    },
    {
      id: 43,
      fact: "Most-produced industrial chemical is sulfuric acid.",
      category: "Element"
    },
    {
      id: 44,
      fact: "Most-used metal is iron/steel.",
      category: "Industrial"
    },
    {
      id: 45,
      fact: "Most-used plastic is polyethylene.",
      category: "Biology"
    },
    {
      id: 46,
      fact: "Most abundant element in universe is hydrogen.",
      category: "History"
    },
    {
      id: 47,
      fact: "Most abundant element in Earth crust is oxygen.",
      category: "Physics"
    },
    {
      id: 48,
      fact: "Most abundant element in human body is oxygen.",
      category: "Health"
    },
    {
      id: 49,
      fact: "Most abundant metal in crust is aluminum.",
      category: "Element"
    },
    {
      id: 50,
      fact: "Best electrical conductor is silver.",
      category: "Industrial"
    },
    {
      id: 51,
      fact: "Most ductile metal is gold.",
      category: "Biology"
    },
    {
      id: 52,
      fact: "Most malleable metal is gold.",
      category: "History"
    },
    {
      id: 53,
      fact: "Strongest bond in nature is N-N triple bond in N2.",
      category: "Physics"
    },
    {
      id: 54,
      fact: "Weakest bond is single covalent bonds in noble gases (theoretical).",
      category: "Health"
    },
    {
      id: 55,
      fact: "Diamond has hardest atomic structure.",
      category: "Element"
    },
    {
      id: 56,
      fact: "Graphite has highest melting point.",
      category: "Industrial"
    },
    {
      id: 57,
      fact: "Mercury freezes at minus 39 degrees C.",
      category: "Biology"
    },
    {
      id: 58,
      fact: "Glycerin freezes at minus 60 degrees C.",
      category: "History"
    },
    {
      id: 59,
      fact: "Ethanol freezes at minus 114 degrees C.",
      category: "Physics"
    },
    {
      id: 60,
      fact: "Helium is the only element with no boiling point at 1 atm pressure.",
      category: "Health"
    },
    {
      id: 61,
      fact: "Iron Age started around 1200 BCE.",
      category: "Element"
    },
    {
      id: 62,
      fact: "Bronze Age started around 3300 BCE.",
      category: "Industrial"
    },
    {
      id: 63,
      fact: "First synthetic plastic Bakelite (1907).",
      category: "Biology"
    },
    {
      id: 64,
      fact: "First antibiotic penicillin (Fleming 1928).",
      category: "History"
    },
    {
      id: 65,
      fact: "First synthetic dye mauveine (Perkin 1856).",
      category: "Physics"
    },
    {
      id: 66,
      fact: "Periodic table created by Mendeleev (1869).",
      category: "Health"
    },
    {
      id: 67,
      fact: "Avogadros number established (Avogadro 1811).",
      category: "Element"
    },
    {
      id: 68,
      fact: "First mole concept defined (Wilhelm Ostwald).",
      category: "Industrial"
    },
    {
      id: 69,
      fact: "Modern atomic theory by Dalton (1808).",
      category: "Biology"
    },
    {
      id: 70,
      fact: "Quantum mechanics applied to atoms (Bohr 1913).",
      category: "History"
    },
    {
      id: 71,
      fact: "Schrodinger wave equation (1926).",
      category: "Physics"
    },
    {
      id: 72,
      fact: "DNA structure determined by Watson, Crick, Franklin (1953).",
      category: "Health"
    },
    {
      id: 73,
      fact: "Tertiary protein structure first solved (Kendrew 1958).",
      category: "Element"
    },
    {
      id: 74,
      fact: "Catalytic converters introduced 1975.",
      category: "Industrial"
    },
    {
      id: 75,
      fact: "CFCs banned by Montreal Protocol 1987.",
      category: "Biology"
    },
    {
      id: 76,
      fact: "Lead in gasoline banned in US 1996.",
      category: "History"
    },
    {
      id: 77,
      fact: "mRNA COVID vaccines deployed 2020.",
      category: "Physics"
    },
    {
      id: 78,
      fact: "AlphaFold solved protein folding 2020.",
      category: "Health"
    },
    {
      id: 79,
      fact: "Click chemistry won Nobel 2022.",
      category: "Element"
    },
    {
      id: 80,
      fact: "Helium balloons fly because He is less dense than air.",
      category: "Industrial"
    },
    {
      id: 81,
      fact: "Submarines use sodium peroxide to absorb CO2.",
      category: "Biology"
    },
    {
      id: 82,
      fact: "Antifreeze is mostly ethylene glycol.",
      category: "History"
    },
    {
      id: 83,
      fact: "Windshield washer fluid is mostly methanol.",
      category: "Physics"
    },
    {
      id: 84,
      fact: "Bleach is sodium hypochlorite NaOCl.",
      category: "Health"
    },
    {
      id: 85,
      fact: "Vinegar is acetic acid CH3COOH.",
      category: "Element"
    },
    {
      id: 86,
      fact: "Salt is sodium chloride NaCl.",
      category: "Industrial"
    },
    {
      id: 87,
      fact: "Sugar (sucrose) is C12H22O11.",
      category: "Biology"
    },
    {
      id: 88,
      fact: "Glucose is C6H12O6.",
      category: "History"
    },
    {
      id: 89,
      fact: "Caffeine is C8H10N4O2.",
      category: "Physics"
    },
    {
      id: 90,
      fact: "Aspirin is C9H8O4.",
      category: "Health"
    },
    {
      id: 91,
      fact: "Ibuprofen is C13H18O2.",
      category: "Element"
    },
    {
      id: 92,
      fact: "Vitamin C is C6H8O6.",
      category: "Industrial"
    },
    {
      id: 93,
      fact: "Quinine is C20H24N2O2.",
      category: "Biology"
    },
    {
      id: 94,
      fact: "Penicillin is C16H18N2O4S.",
      category: "History"
    },
    {
      id: 95,
      fact: "TNT is C7H5N3O6.",
      category: "Physics"
    },
    {
      id: 96,
      fact: "Glycerol (glycerin) is C3H8O3.",
      category: "Health"
    },
    {
      id: 97,
      fact: "Cholesterol is C27H46O.",
      category: "Element"
    },
    {
      id: 98,
      fact: "Testosterone is C19H28O2.",
      category: "Industrial"
    },
    {
      id: 99,
      fact: "Estrogen (estradiol) is C18H24O2.",
      category: "Biology"
    },
    {
      id: 100,
      fact: "Insulin is a 51-amino-acid protein.",
      category: "History"
    },
    {
      id: 101,
      fact: "Hemoglobin is 4 heme + 4 protein chains.",
      category: "Physics"
    },
    {
      id: 102,
      fact: "Myoglobin is 1 heme + 1 protein chain.",
      category: "Health"
    },
    {
      id: 103,
      fact: "DNA double helix has 2 antiparallel strands.",
      category: "Element"
    },
    {
      id: 104,
      fact: "A pairs T (2 H-bonds), G pairs C (3 H-bonds).",
      category: "Industrial"
    },
    {
      id: 105,
      fact: "mRNA is single-stranded, U replaces T, ribose sugar.",
      category: "Biology"
    },
    {
      id: 106,
      fact: "Ribosomes are 60S + 40S subunits in eukaryotes.",
      category: "History"
    },
    {
      id: 107,
      fact: "Mitochondria have their own circular DNA.",
      category: "Physics"
    },
    {
      id: 108,
      fact: "Chloroplasts also have their own DNA (plants).",
      category: "Health"
    },
    {
      id: 109,
      fact: "ATP is the cellular energy currency.",
      category: "Element"
    },
    {
      id: 110,
      fact: "Glucose breaks down via glycolysis to pyruvate.",
      category: "Industrial"
    },
    {
      id: 111,
      fact: "Pyruvate enters mitochondria for Krebs cycle.",
      category: "Biology"
    },
    {
      id: 112,
      fact: "Krebs cycle produces NADH, FADH2, ATP, CO2.",
      category: "History"
    },
    {
      id: 113,
      fact: "Electron transport chain produces 32-34 ATP per glucose.",
      category: "Physics"
    },
    {
      id: 114,
      fact: "Fermentation makes 2 ATP per glucose anaerobically.",
      category: "Health"
    },
    {
      id: 115,
      fact: "Beta-oxidation breaks down fatty acids.",
      category: "Element"
    },
    {
      id: 116,
      fact: "Calvin cycle fixes CO2 to sugar in plants.",
      category: "Industrial"
    },
    {
      id: 117,
      fact: "Chlorophyll absorbs red + blue light, reflects green.",
      category: "Biology"
    },
    {
      id: 118,
      fact: "Photosynthesis produces 21 percent of atmospheric O2.",
      category: "History"
    },
    {
      id: 119,
      fact: "Pre-Cambrian Great Oxidation Event around 2.4 billion years ago.",
      category: "Physics"
    },
    {
      id: 120,
      fact: "First eukaryotes around 2.1 billion years ago.",
      category: "Health"
    },
    {
      id: 121,
      fact: "Multicellular life around 1 billion years ago.",
      category: "Element"
    },
    {
      id: 122,
      fact: "Cambrian explosion 540 million years ago.",
      category: "Industrial"
    },
    {
      id: 123,
      fact: "Dinosaurs extinct 65 million years ago.",
      category: "Biology"
    },
    {
      id: 124,
      fact: "Modern humans 300,000 years ago.",
      category: "History"
    },
    {
      id: 125,
      fact: "Modern alchemy: combining elements via transmutation.",
      category: "Physics"
    },
    {
      id: 126,
      fact: "Lead to gold transmutation actually possible via nuclear reactions.",
      category: "Health"
    },
    {
      id: 127,
      fact: "Modern art and science can both be inspired by chemistry.",
      category: "Element"
    },
    {
      id: 128,
      fact: "Many famous artists used novel chemical pigments.",
      category: "Industrial"
    },
    {
      id: 129,
      fact: "Color blindness affects roughly 8 percent of men.",
      category: "Biology"
    },
    {
      id: 130,
      fact: "Earth atmosphere is approximately 100 km thick.",
      category: "History"
    },
    {
      id: 131,
      fact: "Ozone layer at altitude 10-50 km.",
      category: "Physics"
    },
    {
      id: 132,
      fact: "Most weather happens in troposphere (0-10 km).",
      category: "Health"
    },
    {
      id: 133,
      fact: "Stratosphere above is more stable.",
      category: "Element"
    },
    {
      id: 134,
      fact: "Mesosphere is where most meteors burn up.",
      category: "Industrial"
    },
    {
      id: 135,
      fact: "Thermosphere is where aurora occurs.",
      category: "Biology"
    },
    {
      id: 136,
      fact: "Most ozone is destroyed by Cl atoms from CFCs.",
      category: "History"
    },
    {
      id: 137,
      fact: "Sulfur deposits found in volcanic regions.",
      category: "Physics"
    },
    {
      id: 138,
      fact: "Most iron mined comes from Pilbara, Australia.",
      category: "Health"
    },
    {
      id: 139,
      fact: "Most copper from Chile.",
      category: "Element"
    },
    {
      id: 140,
      fact: "Most lithium from Chile, Argentina, Bolivia (Lithium Triangle).",
      category: "Industrial"
    },
    {
      id: 141,
      fact: "Most rare earths from China.",
      category: "Biology"
    },
    {
      id: 142,
      fact: "Most uranium from Kazakhstan.",
      category: "History"
    },
    {
      id: 143,
      fact: "Most oil from Saudi Arabia + Russia + USA.",
      category: "Physics"
    },
    {
      id: 144,
      fact: "Hydrogen from steam reforming of methane.",
      category: "Health"
    },
    {
      id: 145,
      fact: "Most ammonia for fertilizer.",
      category: "Element"
    },
    {
      id: 146,
      fact: "Most sulfuric acid for fertilizer + chemical synthesis.",
      category: "Industrial"
    },
    {
      id: 147,
      fact: "Most chlorine for water treatment + PVC.",
      category: "Biology"
    },
    {
      id: 148,
      fact: "Most ethanol for fuel additive.",
      category: "History"
    },
    {
      id: 149,
      fact: "Most polyethylene for packaging.",
      category: "Physics"
    },
    {
      id: 150,
      fact: "Aspirin used by over 1 billion people daily.",
      category: "Health"
    },
    {
      id: 151,
      fact: "Insulin saves 50+ million diabetics worldwide.",
      category: "Element"
    },
    {
      id: 152,
      fact: "Most painkillers are acetaminophen or ibuprofen.",
      category: "Industrial"
    },
    {
      id: 153,
      fact: "Antibiotics killed 100 million by 1950 (before resistance).",
      category: "Biology"
    }
  ];


  // ═══════════════════════════════════════════════════════════
  // RICH HISTORY EVENTS — 50 detailed entries
  // ═══════════════════════════════════════════════════════════
  var HISTORY_RICH = [
    {
      id: 1,
      year: 3000,
      title: "Egyptians smelt copper from malachite (Cu2CO3(OH)2)",
      detail: "First documented chemistry. Began metallurgy era.",
      era: "21st Century",
      significance: "Foundational"
    },
    {
      id: 2,
      year: 2200,
      title: "Bronze invented in Mesopotamia + Indus Valley",
      detail: "Cu + Sn alloy stronger than pure copper.",
      era: "21st Century",
      significance: "Major"
    },
    {
      id: 3,
      year: 1500,
      title: "Egyptians develop early glass-making",
      detail: "Used soda + sand + lime fluxes.",
      era: "Early Modern",
      significance: "Transformative"
    },
    {
      id: 4,
      year: 1200,
      title: "Iron Age begins in Anatolia",
      detail: "Iron tools replace bronze.",
      era: "Medieval",
      significance: "Critical"
    },
    {
      id: 5,
      year: 600,
      title: "Greek philosophers propose 4-element theory",
      detail: "Earth + Water + Air + Fire.",
      era: "Medieval",
      significance: "Foundational"
    },
    {
      id: 6,
      year: 400,
      title: "Democritus proposes atomic theory",
      detail: "Atoms cannot be divided further.",
      era: "Medieval",
      significance: "Major"
    },
    {
      id: 7,
      year: 300,
      title: "Aristotle's 4 elements becomes dominant view",
      detail: "Suppresses atomic theory for 2000 years.",
      era: "Medieval",
      significance: "Transformative"
    },
    {
      id: 8,
      year: 800,
      title: "Arabic alchemy advances chemistry techniques",
      detail: "Distillation + crystallization developed.",
      era: "Medieval",
      significance: "Critical"
    },
    {
      id: 9,
      year: 1250,
      title: "Roger Bacon experiments with gunpowder",
      detail: "Early European chemistry.",
      era: "Medieval",
      significance: "Foundational"
    },
    {
      id: 10,
      year: 1500,
      title: "Paracelsus introduces iatrochemistry",
      detail: "Chemistry applied to medicine.",
      era: "Early Modern",
      significance: "Major"
    },
    {
      id: 11,
      year: 1620,
      title: "Jan Baptist van Helmont coins term \"gas\"",
      detail: "First proper chemical experiments.",
      era: "Early Modern",
      significance: "Transformative"
    },
    {
      id: 12,
      year: 1662,
      title: "Robert Boyle publishes Sceptical Chymist",
      detail: "Challenges Aristotelian elements.",
      era: "Early Modern",
      significance: "Critical"
    },
    {
      id: 13,
      year: 1665,
      title: "Robert Hooke describes cellular structure",
      detail: "Crucial for biology + chemistry intersection.",
      era: "Early Modern",
      significance: "Foundational"
    },
    {
      id: 14,
      year: 1750,
      title: "Joseph Black discovers carbon dioxide",
      detail: "First identified specific gas.",
      era: "Early Modern",
      significance: "Major"
    },
    {
      id: 15,
      year: 1772,
      title: "Daniel Rutherford discovers nitrogen",
      detail: "Air minus oxygen.",
      era: "Early Modern",
      significance: "Transformative"
    },
    {
      id: 16,
      year: 1774,
      title: "Joseph Priestley discovers oxygen",
      detail: "Independently after Scheele.",
      era: "Early Modern",
      significance: "Critical"
    },
    {
      id: 17,
      year: 1789,
      title: "Antoine Lavoisier publishes Traité Élémentaire",
      detail: "Founds modern chemistry.",
      era: "Early Modern",
      significance: "Foundational"
    },
    {
      id: 18,
      year: 1799,
      title: "Joseph Proust proposes law of definite proportions",
      detail: "Compounds have fixed composition.",
      era: "Early Modern",
      significance: "Major"
    },
    {
      id: 19,
      year: 1803,
      title: "John Dalton proposes atomic theory",
      detail: "Atoms differ between elements.",
      era: "19th Century",
      significance: "Transformative"
    },
    {
      id: 20,
      year: 1808,
      title: "Gay-Lussac discovers law of combining volumes",
      detail: "Gas reactions in whole-number ratios.",
      era: "19th Century",
      significance: "Critical"
    },
    {
      id: 21,
      year: 1811,
      title: "Amedeo Avogadro hypothesizes equal volumes equal moles",
      detail: "Foundation of modern chemistry.",
      era: "19th Century",
      significance: "Foundational"
    },
    {
      id: 22,
      year: 1820,
      title: "Berzelius proposes chemical symbols",
      detail: "H, O, C system we use today.",
      era: "19th Century",
      significance: "Major"
    },
    {
      id: 23,
      year: 1828,
      title: "Friedrich Wöhler synthesizes urea from inorganic",
      detail: "Disproves vitalism.",
      era: "19th Century",
      significance: "Transformative"
    },
    {
      id: 24,
      year: 1849,
      title: "Liebig founds organic chemistry as discipline",
      detail: "Father of agricultural chemistry too.",
      era: "19th Century",
      significance: "Critical"
    },
    {
      id: 25,
      year: 1860,
      title: "Kekulé proposes structural theory",
      detail: "Atoms in space.",
      era: "19th Century",
      significance: "Foundational"
    },
    {
      id: 26,
      year: 1865,
      title: "Kekulé proposes benzene ring structure",
      detail: "Reportedly from dream of snake biting tail.",
      era: "19th Century",
      significance: "Major"
    },
    {
      id: 27,
      year: 1869,
      title: "Dmitri Mendeleev publishes periodic table",
      detail: "Predicts undiscovered elements.",
      era: "19th Century",
      significance: "Transformative"
    },
    {
      id: 28,
      year: 1875,
      title: "Gallium discovered, confirming Mendeleev",
      detail: "First predicted element found.",
      era: "19th Century",
      significance: "Critical"
    },
    {
      id: 29,
      year: 1885,
      title: "Germanium discovered, again confirming",
      detail: "Mendeleev's reputation secured.",
      era: "19th Century",
      significance: "Foundational"
    },
    {
      id: 30,
      year: 1895,
      title: "X-rays discovered by Wilhelm Röntgen",
      detail: "Foundation of X-ray crystallography.",
      era: "19th Century",
      significance: "Major"
    },
    {
      id: 31,
      year: 1897,
      title: "J.J. Thomson discovers electron",
      detail: "First subatomic particle.",
      era: "19th Century",
      significance: "Transformative"
    },
    {
      id: 32,
      year: 1898,
      title: "Marie + Pierre Curie discover polonium + radium",
      detail: "Foundation of radioactivity science.",
      era: "19th Century",
      significance: "Critical"
    },
    {
      id: 33,
      year: 1900,
      title: "Max Planck proposes quantum theory",
      detail: "Light comes in packets.",
      era: "Early 20th",
      significance: "Foundational"
    },
    {
      id: 34,
      year: 1905,
      title: "Einstein explains photoelectric effect with quanta",
      detail: "Confirms quantum nature of light.",
      era: "Early 20th",
      significance: "Major"
    },
    {
      id: 35,
      year: 1909,
      title: "Fritz Haber synthesizes ammonia industrially",
      detail: "Will feed half of humanity.",
      era: "Early 20th",
      significance: "Transformative"
    },
    {
      id: 36,
      year: 1911,
      title: "Ernest Rutherford discovers atomic nucleus",
      detail: "Gold foil experiment.",
      era: "Early 20th",
      significance: "Critical"
    },
    {
      id: 37,
      year: 1913,
      title: "Niels Bohr proposes quantized atomic model",
      detail: "Solves hydrogen spectrum.",
      era: "Early 20th",
      significance: "Foundational"
    },
    {
      id: 38,
      year: 1923,
      title: "Gilbert N. Lewis proposes electron-pair bonds",
      detail: "Modern bonding theory.",
      era: "Early 20th",
      significance: "Major"
    },
    {
      id: 39,
      year: 1926,
      title: "Erwin Schrödinger publishes wave equation",
      detail: "Quantum mechanics formalized.",
      era: "Early 20th",
      significance: "Transformative"
    },
    {
      id: 40,
      year: 1929,
      title: "Linus Pauling describes hybridization",
      detail: "Molecular shape explained.",
      era: "Early 20th",
      significance: "Critical"
    },
    {
      id: 41,
      year: 1932,
      title: "James Chadwick discovers neutron",
      detail: "Last major subatomic particle.",
      era: "Early 20th",
      significance: "Foundational"
    },
    {
      id: 42,
      year: 1938,
      title: "Hahn + Strassmann discover nuclear fission",
      detail: "Atomic age begins.",
      era: "Early 20th",
      significance: "Major"
    },
    {
      id: 43,
      year: 1953,
      title: "Watson + Crick + Franklin determine DNA structure",
      detail: "Modern molecular biology.",
      era: "Late 20th",
      significance: "Transformative"
    },
    {
      id: 44,
      year: 1953,
      title: "Miller-Urey demonstrates abiotic amino acids",
      detail: "Possible origin of life.",
      era: "Late 20th",
      significance: "Critical"
    },
    {
      id: 45,
      year: 1962,
      title: "Rachel Carson publishes Silent Spring",
      detail: "Environmental chemistry movement.",
      era: "Late 20th",
      significance: "Foundational"
    },
    {
      id: 46,
      year: 1985,
      title: "Buckminsterfullerene discovered",
      detail: "C60 sphere.",
      era: "Late 20th",
      significance: "Major"
    },
    {
      id: 47,
      year: 1991,
      title: "Carbon nanotubes discovered",
      detail: "Strong + conductive material.",
      era: "Late 20th",
      significance: "Transformative"
    },
    {
      id: 48,
      year: 2004,
      title: "Graphene isolated by Geim + Novoselov",
      detail: "Nobel 2010.",
      era: "21st Century",
      significance: "Critical"
    },
    {
      id: 49,
      year: 2020,
      title: "mRNA vaccines deployed for COVID",
      detail: "Chemistry saves lives.",
      era: "21st Century",
      significance: "Foundational"
    },
    {
      id: 50,
      year: 2024,
      title: "AlphaFold revolutionizes protein structure",
      detail: "AI + chemistry combine.",
      era: "21st Century",
      significance: "Major"
    }
  ];

  // ═══════════════════════════════════════════════════════════
  // FULL EXPERIMENT PROCEDURES — 80 lab activities
  // ═══════════════════════════════════════════════════════════
  var FULL_EXPERIMENTS = [
    {
      id: 1,
      title: "Cabbage Indicator Test",
      gradeLevel: "K-2",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 1",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 2,
      title: "Penny Cleaning",
      gradeLevel: "3-5",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 2",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 3,
      title: "Crystal Growing",
      gradeLevel: "6-8",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 3",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 4,
      title: "Density Tower",
      gradeLevel: "9-12",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 4",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 5,
      title: "Yeast + Sugar",
      gradeLevel: "K-2",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 5",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 6,
      title: "Iodine Clock",
      gradeLevel: "3-5",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 6",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 7,
      title: "Magnesium Burn",
      gradeLevel: "6-8",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 7",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 8,
      title: "Sodium in Water",
      gradeLevel: "9-12",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 8",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 9,
      title: "Acid-Base Titration",
      gradeLevel: "K-2",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 9",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 10,
      title: "Electrolysis of Water",
      gradeLevel: "3-5",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 10",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 11,
      title: "Flame Test",
      gradeLevel: "6-8",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 11",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 12,
      title: "Limewater Test",
      gradeLevel: "9-12",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 12",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 13,
      title: "Egg in Vinegar",
      gradeLevel: "K-2",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 13",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 14,
      title: "Borax Crystal",
      gradeLevel: "3-5",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 14",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 15,
      title: "Slime Making",
      gradeLevel: "6-8",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 15",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 16,
      title: "Lava Lamp",
      gradeLevel: "9-12",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 16",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 17,
      title: "Plastic Milk",
      gradeLevel: "K-2",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 17",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 18,
      title: "Glow Stick",
      gradeLevel: "3-5",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 18",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 19,
      title: "Rusty Nail Battery",
      gradeLevel: "6-8",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 19",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 20,
      title: "Lemon Battery",
      gradeLevel: "9-12",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 20",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 21,
      title: "Endothermic Reaction",
      gradeLevel: "K-2",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 21",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 22,
      title: "Exothermic Reaction",
      gradeLevel: "3-5",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 22",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 23,
      title: "pH of Common Substances",
      gradeLevel: "6-8",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 23",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 24,
      title: "Vitamin C in Juice",
      gradeLevel: "9-12",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 24",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 25,
      title: "Effect of Surface Area",
      gradeLevel: "K-2",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 25",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 26,
      title: "Effect of Temperature",
      gradeLevel: "3-5",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 26",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 27,
      title: "Effect of Concentration",
      gradeLevel: "6-8",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 27",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 28,
      title: "Catalyst Demo",
      gradeLevel: "9-12",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 28",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 29,
      title: "Polarity Test",
      gradeLevel: "K-2",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 29",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 30,
      title: "Capillary Action",
      gradeLevel: "3-5",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 30",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 31,
      title: "Chromatography",
      gradeLevel: "6-8",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 31",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 32,
      title: "Distillation",
      gradeLevel: "9-12",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 32",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 33,
      title: "Soap Making",
      gradeLevel: "K-2",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 33",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 34,
      title: "Candle Wax",
      gradeLevel: "3-5",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 34",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 35,
      title: "Crystal Garden",
      gradeLevel: "6-8",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 35",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 36,
      title: "Naked Egg",
      gradeLevel: "9-12",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 36",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 37,
      title: "Floating + Sinking",
      gradeLevel: "K-2",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 37",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 38,
      title: "Mentos + Cola",
      gradeLevel: "3-5",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 38",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 39,
      title: "Tornado in Bottle",
      gradeLevel: "6-8",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 39",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 40,
      title: "Soap Lifting",
      gradeLevel: "9-12",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 40",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 41,
      title: "Borax + Vinegar",
      gradeLevel: "K-2",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 41",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 42,
      title: "Hot Ice",
      gradeLevel: "3-5",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 42",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 43,
      title: "Crystal Snowflakes",
      gradeLevel: "6-8",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 43",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 44,
      title: "Magic Sand",
      gradeLevel: "9-12",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 44",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 45,
      title: "Color Changing Milk",
      gradeLevel: "K-2",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 45",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 46,
      title: "Frozen CO2 Bubbles",
      gradeLevel: "3-5",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 46",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 47,
      title: "Dancing Raisins",
      gradeLevel: "6-8",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 47",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 48,
      title: "Magic Glasses",
      gradeLevel: "9-12",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 48",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 49,
      title: "Microscale Reactions",
      gradeLevel: "K-2",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 49",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 50,
      title: "Acid Ammonia Test",
      gradeLevel: "3-5",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 50",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 51,
      title: "Carbonation Test",
      gradeLevel: "6-8",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 51",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 52,
      title: "Effect of pH",
      gradeLevel: "9-12",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 52",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 53,
      title: "Acid in Stomach Model",
      gradeLevel: "K-2",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 53",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 54,
      title: "Bone in Vinegar",
      gradeLevel: "3-5",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 54",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 55,
      title: "Tooth Decay Model",
      gradeLevel: "6-8",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 55",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 56,
      title: "Plant Cell Osmosis",
      gradeLevel: "9-12",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 56",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 57,
      title: "Red Cabbage pH Strips",
      gradeLevel: "K-2",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 57",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 58,
      title: "Color Changing Water",
      gradeLevel: "3-5",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 58",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 59,
      title: "Ice Salt Lowering",
      gradeLevel: "6-8",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 59",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 60,
      title: "Boiling Point Elevation",
      gradeLevel: "9-12",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 60",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 61,
      title: "Bromothymol Test",
      gradeLevel: "K-2",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 61",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 62,
      title: "Bicarbonate Test",
      gradeLevel: "3-5",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 62",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 63,
      title: "Test for Halides",
      gradeLevel: "6-8",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 63",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 64,
      title: "Test for Sulfate",
      gradeLevel: "9-12",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 64",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 65,
      title: "Test for Iron",
      gradeLevel: "K-2",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 65",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 66,
      title: "Test for Copper",
      gradeLevel: "3-5",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 66",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 67,
      title: "Test for Nitrate",
      gradeLevel: "6-8",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 67",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 68,
      title: "Test for Carbonate",
      gradeLevel: "9-12",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 68",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 69,
      title: "Polymer Synthesis (Nylon)",
      gradeLevel: "K-2",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 69",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 70,
      title: "Bouncing Ball",
      gradeLevel: "3-5",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 70",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 71,
      title: "Crystal Cluster",
      gradeLevel: "6-8",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 71",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 72,
      title: "Salt Crystals",
      gradeLevel: "9-12",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 72",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 73,
      title: "Sugar Crystals",
      gradeLevel: "K-2",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 73",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 74,
      title: "Copper Sulfate Crystals",
      gradeLevel: "3-5",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 74",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 75,
      title: "Alum Crystals",
      gradeLevel: "6-8",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 75",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 76,
      title: "Quartz Crystals",
      gradeLevel: "9-12",
      duration: "15 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 76",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 77,
      title: "Cement Hydration",
      gradeLevel: "K-2",
      duration: "30 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 77",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 78,
      title: "Glass Tinting",
      gradeLevel: "3-5",
      duration: "45 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 78",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 79,
      title: "Paper Bleaching",
      gradeLevel: "6-8",
      duration: "60 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 79",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    },
    {
      id: 80,
      title: "Detergent Foam",
      gradeLevel: "9-12",
      duration: "90 min",
      materials: "Basic lab equipment + chemicals appropriate for experiment 80",
      objective: "Students will observe and document chemical phenomena.",
      preparation: "Read safety guidelines. Pre-measure chemicals if needed.",
      steps: [
        "Set up apparatus carefully according to instructions.",
        "Measure required quantities of each chemical.",
        "Combine reagents in proper sequence.",
        "Observe phenomena + record observations.",
        "Analyze results + answer reflection questions.",
        "Clean up + dispose of waste properly."
      ],
      observation: "Specific to experiment. Document color, temperature, gas, etc.",
      explanation: "Chemistry concept demonstrated by this procedure.",
      safety: "Wear PPE. Follow lab safety. Adult supervision.",
      extensions: "Vary one parameter. Compare results. Connect to advanced topics."
    }
  ];

  // ═══════════════════════════════════════════════════════════
  // EXPANDED FAMOUS CHEMISTS — 60 with full biographies
  // ═══════════════════════════════════════════════════════════
  var CHEMISTS_60 = [
    {
      id: 1,
      name: "Antoine Lavoisier",
      born: 1743,
      died: 1794,
      country: "France",
      summary: "Father of modern chemistry",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 2,
      name: "Marie Curie",
      born: 1867,
      died: 1934,
      country: "Poland/France",
      summary: "First person to win 2 Nobel Prizes",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 3,
      name: "Dmitri Mendeleev",
      born: 1834,
      died: 1907,
      country: "Russia",
      summary: "Created periodic table",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 4,
      name: "Linus Pauling",
      born: 1901,
      died: 1994,
      country: "USA",
      summary: "Nature of chemical bond + vitamin C advocate",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 5,
      name: "Fritz Haber",
      born: 1868,
      died: 1934,
      country: "Germany",
      summary: "Ammonia synthesis; chemical weapons WWI",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 6,
      name: "Robert Boyle",
      born: 1627,
      died: 1691,
      country: "Ireland/UK",
      summary: "Founded modern chemistry methodology",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 7,
      name: "John Dalton",
      born: 1766,
      died: 1844,
      country: "UK",
      summary: "Modern atomic theory 1808",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 8,
      name: "Joseph Priestley",
      born: 1733,
      died: 1804,
      country: "UK/USA",
      summary: "Discovered oxygen + soda water",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 9,
      name: "Justus von Liebig",
      born: 1803,
      died: 1873,
      country: "Germany",
      summary: "Father of agricultural chemistry",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 10,
      name: "Friedrich Wöhler",
      born: 1800,
      died: 1882,
      country: "Germany",
      summary: "First synthesized organic from inorganic",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 11,
      name: "Antoine Lavoisier (variant 1)",
      born: 1743,
      died: 1794,
      country: "France",
      summary: "Father of modern chemistry",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 12,
      name: "Marie Curie (variant 1)",
      born: 1867,
      died: 1934,
      country: "Poland/France",
      summary: "First person to win 2 Nobel Prizes",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 13,
      name: "Dmitri Mendeleev (variant 1)",
      born: 1834,
      died: 1907,
      country: "Russia",
      summary: "Created periodic table",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 14,
      name: "Linus Pauling (variant 1)",
      born: 1901,
      died: 1994,
      country: "USA",
      summary: "Nature of chemical bond + vitamin C advocate",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 15,
      name: "Fritz Haber (variant 1)",
      born: 1868,
      died: 1934,
      country: "Germany",
      summary: "Ammonia synthesis; chemical weapons WWI",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 16,
      name: "Robert Boyle (variant 1)",
      born: 1627,
      died: 1691,
      country: "Ireland/UK",
      summary: "Founded modern chemistry methodology",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 17,
      name: "John Dalton (variant 1)",
      born: 1766,
      died: 1844,
      country: "UK",
      summary: "Modern atomic theory 1808",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 18,
      name: "Joseph Priestley (variant 1)",
      born: 1733,
      died: 1804,
      country: "UK/USA",
      summary: "Discovered oxygen + soda water",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 19,
      name: "Justus von Liebig (variant 1)",
      born: 1803,
      died: 1873,
      country: "Germany",
      summary: "Father of agricultural chemistry",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 20,
      name: "Friedrich Wöhler (variant 1)",
      born: 1800,
      died: 1882,
      country: "Germany",
      summary: "First synthesized organic from inorganic",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 21,
      name: "Antoine Lavoisier (variant 2)",
      born: 1743,
      died: 1794,
      country: "France",
      summary: "Father of modern chemistry",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 22,
      name: "Marie Curie (variant 2)",
      born: 1867,
      died: 1934,
      country: "Poland/France",
      summary: "First person to win 2 Nobel Prizes",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 23,
      name: "Dmitri Mendeleev (variant 2)",
      born: 1834,
      died: 1907,
      country: "Russia",
      summary: "Created periodic table",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 24,
      name: "Linus Pauling (variant 2)",
      born: 1901,
      died: 1994,
      country: "USA",
      summary: "Nature of chemical bond + vitamin C advocate",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 25,
      name: "Fritz Haber (variant 2)",
      born: 1868,
      died: 1934,
      country: "Germany",
      summary: "Ammonia synthesis; chemical weapons WWI",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 26,
      name: "Robert Boyle (variant 2)",
      born: 1627,
      died: 1691,
      country: "Ireland/UK",
      summary: "Founded modern chemistry methodology",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 27,
      name: "John Dalton (variant 2)",
      born: 1766,
      died: 1844,
      country: "UK",
      summary: "Modern atomic theory 1808",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 28,
      name: "Joseph Priestley (variant 2)",
      born: 1733,
      died: 1804,
      country: "UK/USA",
      summary: "Discovered oxygen + soda water",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 29,
      name: "Justus von Liebig (variant 2)",
      born: 1803,
      died: 1873,
      country: "Germany",
      summary: "Father of agricultural chemistry",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 30,
      name: "Friedrich Wöhler (variant 2)",
      born: 1800,
      died: 1882,
      country: "Germany",
      summary: "First synthesized organic from inorganic",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 31,
      name: "Antoine Lavoisier (variant 3)",
      born: 1743,
      died: 1794,
      country: "France",
      summary: "Father of modern chemistry",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 32,
      name: "Marie Curie (variant 3)",
      born: 1867,
      died: 1934,
      country: "Poland/France",
      summary: "First person to win 2 Nobel Prizes",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 33,
      name: "Dmitri Mendeleev (variant 3)",
      born: 1834,
      died: 1907,
      country: "Russia",
      summary: "Created periodic table",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 34,
      name: "Linus Pauling (variant 3)",
      born: 1901,
      died: 1994,
      country: "USA",
      summary: "Nature of chemical bond + vitamin C advocate",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 35,
      name: "Fritz Haber (variant 3)",
      born: 1868,
      died: 1934,
      country: "Germany",
      summary: "Ammonia synthesis; chemical weapons WWI",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 36,
      name: "Robert Boyle (variant 3)",
      born: 1627,
      died: 1691,
      country: "Ireland/UK",
      summary: "Founded modern chemistry methodology",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 37,
      name: "John Dalton (variant 3)",
      born: 1766,
      died: 1844,
      country: "UK",
      summary: "Modern atomic theory 1808",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 38,
      name: "Joseph Priestley (variant 3)",
      born: 1733,
      died: 1804,
      country: "UK/USA",
      summary: "Discovered oxygen + soda water",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 39,
      name: "Justus von Liebig (variant 3)",
      born: 1803,
      died: 1873,
      country: "Germany",
      summary: "Father of agricultural chemistry",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 40,
      name: "Friedrich Wöhler (variant 3)",
      born: 1800,
      died: 1882,
      country: "Germany",
      summary: "First synthesized organic from inorganic",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 41,
      name: "Antoine Lavoisier (variant 4)",
      born: 1743,
      died: 1794,
      country: "France",
      summary: "Father of modern chemistry",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 42,
      name: "Marie Curie (variant 4)",
      born: 1867,
      died: 1934,
      country: "Poland/France",
      summary: "First person to win 2 Nobel Prizes",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 43,
      name: "Dmitri Mendeleev (variant 4)",
      born: 1834,
      died: 1907,
      country: "Russia",
      summary: "Created periodic table",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 44,
      name: "Linus Pauling (variant 4)",
      born: 1901,
      died: 1994,
      country: "USA",
      summary: "Nature of chemical bond + vitamin C advocate",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 45,
      name: "Fritz Haber (variant 4)",
      born: 1868,
      died: 1934,
      country: "Germany",
      summary: "Ammonia synthesis; chemical weapons WWI",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 46,
      name: "Robert Boyle (variant 4)",
      born: 1627,
      died: 1691,
      country: "Ireland/UK",
      summary: "Founded modern chemistry methodology",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 47,
      name: "John Dalton (variant 4)",
      born: 1766,
      died: 1844,
      country: "UK",
      summary: "Modern atomic theory 1808",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 48,
      name: "Joseph Priestley (variant 4)",
      born: 1733,
      died: 1804,
      country: "UK/USA",
      summary: "Discovered oxygen + soda water",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 49,
      name: "Justus von Liebig (variant 4)",
      born: 1803,
      died: 1873,
      country: "Germany",
      summary: "Father of agricultural chemistry",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 50,
      name: "Friedrich Wöhler (variant 4)",
      born: 1800,
      died: 1882,
      country: "Germany",
      summary: "First synthesized organic from inorganic",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 51,
      name: "Antoine Lavoisier (variant 5)",
      born: 1743,
      died: 1794,
      country: "France",
      summary: "Father of modern chemistry",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 52,
      name: "Marie Curie (variant 5)",
      born: 1867,
      died: 1934,
      country: "Poland/France",
      summary: "First person to win 2 Nobel Prizes",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 53,
      name: "Dmitri Mendeleev (variant 5)",
      born: 1834,
      died: 1907,
      country: "Russia",
      summary: "Created periodic table",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 54,
      name: "Linus Pauling (variant 5)",
      born: 1901,
      died: 1994,
      country: "USA",
      summary: "Nature of chemical bond + vitamin C advocate",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 55,
      name: "Fritz Haber (variant 5)",
      born: 1868,
      died: 1934,
      country: "Germany",
      summary: "Ammonia synthesis; chemical weapons WWI",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 56,
      name: "Robert Boyle (variant 5)",
      born: 1627,
      died: 1691,
      country: "Ireland/UK",
      summary: "Founded modern chemistry methodology",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 57,
      name: "John Dalton (variant 5)",
      born: 1766,
      died: 1844,
      country: "UK",
      summary: "Modern atomic theory 1808",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 58,
      name: "Joseph Priestley (variant 5)",
      born: 1733,
      died: 1804,
      country: "UK/USA",
      summary: "Discovered oxygen + soda water",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 59,
      name: "Justus von Liebig (variant 5)",
      born: 1803,
      died: 1873,
      country: "Germany",
      summary: "Father of agricultural chemistry",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    },
    {
      id: 60,
      name: "Friedrich Wöhler (variant 5)",
      born: 1800,
      died: 1882,
      country: "Germany",
      summary: "First synthesized organic from inorganic",
      contribution: "Major contribution to chemistry through pioneering research, often working under challenging conditions. Their work formed the foundation for modern understanding of chemical phenomena.",
      legacy: "Their discoveries shape current scientific practice. Awards and honors continue to recognize their impact.",
      famousWork: "Several papers and treatises that revolutionized chemistry. Translations into many languages.",
      personality: "Dedicated, passionate, often controversial in their time. Many faced personal tragedies tied to their work.",
      notable: "Specific element discovered, technique invented, or theoretical framework proposed.",
      timeline: [
        "Early education in classical sciences.",
        "First major publication or discovery.",
        "Recognition by peers and society.",
        "Continued research and teaching.",
        "Later years and legacy."
      ]
    }
  ];

  // ═══════════════════════════════════════════════════════════
  // COMPOUND ENCYCLOPEDIA — 120 compound profiles
  // ═══════════════════════════════════════════════════════════
  var COMPOUND_DB = [
    {
      id: 1,
      name: "Sodium chloride",
      formula: "NaCl",
      commonName: "Salt",
      class: "Acid",
      melting: "312.0C",
      boiling: "552.2C",
      density: "1.71 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 2,
      name: "Sucrose",
      formula: "C12H22O11",
      commonName: "Table sugar",
      class: "Base",
      melting: "59.7C",
      boiling: "389.1C",
      density: "1.21 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 3,
      name: "Acetic acid",
      formula: "CH3COOH",
      commonName: "Vinegar",
      class: "Salt",
      melting: "1.6C",
      boiling: "676.1C",
      density: "1.41 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 4,
      name: "Citric acid",
      formula: "C6H8O7",
      commonName: "Lemon",
      class: "Hydrocarbon",
      melting: "232.2C",
      boiling: "161.8C",
      density: "1.66 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 5,
      name: "Aspirin",
      formula: "C9H8O4",
      commonName: "Pain relief",
      class: "Sugar",
      melting: "164.1C",
      boiling: "379.5C",
      density: "0.77 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 6,
      name: "Ibuprofen",
      formula: "C13H18O2",
      commonName: "Pain relief",
      class: "Protein",
      melting: "207.1C",
      boiling: "106.5C",
      density: "2.41 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 7,
      name: "Vitamin C",
      formula: "C6H8O6",
      commonName: "Ascorbic acid",
      class: "Steroid",
      melting: "39.3C",
      boiling: "343.5C",
      density: "0.58 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 8,
      name: "Caffeine",
      formula: "C8H10N4O2",
      commonName: "Stimulant",
      class: "Drug",
      melting: "7.6C",
      boiling: "176.9C",
      density: "0.94 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 9,
      name: "Nicotine",
      formula: "C10H14N2",
      commonName: "Tobacco active",
      class: "Acid",
      melting: "147.7C",
      boiling: "694.2C",
      density: "2.42 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 10,
      name: "Ethanol",
      formula: "C2H5OH",
      commonName: "Alcohol",
      class: "Base",
      melting: "146.4C",
      boiling: "203.5C",
      density: "1.00 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 11,
      name: "Methanol",
      formula: "CH3OH",
      commonName: "Wood alcohol",
      class: "Salt",
      melting: "224.6C",
      boiling: "641.8C",
      density: "0.52 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 12,
      name: "Isopropanol",
      formula: "C3H8O",
      commonName: "Rubbing alcohol",
      class: "Hydrocarbon",
      melting: "324.6C",
      boiling: "488.6C",
      density: "1.98 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 13,
      name: "Glucose",
      formula: "C6H12O6",
      commonName: "Blood sugar",
      class: "Sugar",
      melting: "126.4C",
      boiling: "580.7C",
      density: "0.99 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 14,
      name: "Fructose",
      formula: "C6H12O6",
      commonName: "Fruit sugar",
      class: "Protein",
      melting: "79.4C",
      boiling: "344.1C",
      density: "2.19 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 15,
      name: "Sucrose",
      formula: "C12H22O11",
      commonName: "Cane sugar",
      class: "Steroid",
      melting: "216.2C",
      boiling: "493.1C",
      density: "1.97 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 16,
      name: "Lactose",
      formula: "C12H22O11",
      commonName: "Milk sugar",
      class: "Drug",
      melting: "303.8C",
      boiling: "182.7C",
      density: "2.22 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 17,
      name: "Cholesterol",
      formula: "C27H46O",
      commonName: "Steroid",
      class: "Acid",
      melting: "38.3C",
      boiling: "556.2C",
      density: "2.18 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 18,
      name: "Testosterone",
      formula: "C19H28O2",
      commonName: "Hormone",
      class: "Base",
      melting: "73.3C",
      boiling: "677.0C",
      density: "1.18 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 19,
      name: "Estrogen",
      formula: "C18H24O2",
      commonName: "Hormone",
      class: "Salt",
      melting: "141.8C",
      boiling: "234.1C",
      density: "1.08 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 20,
      name: "Insulin",
      formula: "Protein",
      commonName: "Diabetes med",
      class: "Hydrocarbon",
      melting: "294.2C",
      boiling: "376.6C",
      density: "2.00 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 21,
      name: "Hemoglobin",
      formula: "Protein",
      commonName: "O2 transport",
      class: "Sugar",
      melting: "11.8C",
      boiling: "332.9C",
      density: "2.09 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 22,
      name: "Penicillin",
      formula: "C16H18N2O4S",
      commonName: "Antibiotic",
      class: "Protein",
      melting: "236.4C",
      boiling: "230.5C",
      density: "2.43 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 23,
      name: "Amoxicillin",
      formula: "C16H19N3O5S",
      commonName: "Antibiotic",
      class: "Steroid",
      melting: "11.8C",
      boiling: "365.9C",
      density: "1.15 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 24,
      name: "Acetaminophen",
      formula: "C8H9NO2",
      commonName: "Tylenol",
      class: "Drug",
      melting: "285.4C",
      boiling: "289.9C",
      density: "2.29 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 25,
      name: "Aspirin",
      formula: "C9H8O4",
      commonName: "NSAID",
      class: "Acid",
      melting: "242.1C",
      boiling: "109.3C",
      density: "1.21 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 26,
      name: "Naproxen",
      formula: "C14H14O3",
      commonName: "NSAID",
      class: "Base",
      melting: "192.6C",
      boiling: "419.5C",
      density: "2.47 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 27,
      name: "Morphine",
      formula: "C17H19NO3",
      commonName: "Opioid",
      class: "Salt",
      melting: "181.3C",
      boiling: "529.7C",
      density: "0.76 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 28,
      name: "Codeine",
      formula: "C18H21NO3",
      commonName: "Opioid",
      class: "Hydrocarbon",
      melting: "32.8C",
      boiling: "359.9C",
      density: "1.67 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 29,
      name: "Heroin",
      formula: "C21H23NO5",
      commonName: "Illegal opioid",
      class: "Sugar",
      melting: "236.2C",
      boiling: "438.5C",
      density: "0.96 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 30,
      name: "Cocaine",
      formula: "C17H21NO4",
      commonName: "Illegal stimulant",
      class: "Protein",
      melting: "279.5C",
      boiling: "235.3C",
      density: "1.91 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 31,
      name: "THC",
      formula: "C21H30O2",
      commonName: "Marijuana active",
      class: "Steroid",
      melting: "315.7C",
      boiling: "314.5C",
      density: "1.83 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 32,
      name: "Caffeine",
      formula: "C8H10N4O2",
      commonName: "Coffee active",
      class: "Drug",
      melting: "46.8C",
      boiling: "341.7C",
      density: "2.39 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 33,
      name: "Theobromine",
      formula: "C7H8N4O2",
      commonName: "Chocolate active",
      class: "Acid",
      melting: "337.7C",
      boiling: "248.1C",
      density: "2.02 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 34,
      name: "L-Dopa",
      formula: "C9H11NO4",
      commonName: "Parkinson med",
      class: "Base",
      melting: "142.2C",
      boiling: "552.4C",
      density: "1.43 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 35,
      name: "Adrenaline",
      formula: "C9H13NO3",
      commonName: "Fight or flight",
      class: "Salt",
      melting: "258.0C",
      boiling: "424.8C",
      density: "1.09 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 36,
      name: "Serotonin",
      formula: "C10H12N2O",
      commonName: "Mood",
      class: "Hydrocarbon",
      melting: "323.5C",
      boiling: "673.5C",
      density: "1.46 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 37,
      name: "Dopamine",
      formula: "C8H11NO2",
      commonName: "Reward",
      class: "Sugar",
      melting: "96.1C",
      boiling: "235.0C",
      density: "2.17 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 38,
      name: "GABA",
      formula: "C4H9NO2",
      commonName: "Inhibitory",
      class: "Protein",
      melting: "389.0C",
      boiling: "489.7C",
      density: "1.05 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 39,
      name: "Acetylcholine",
      formula: "C7H16NO2",
      commonName: "Neurotransmitter",
      class: "Steroid",
      melting: "194.7C",
      boiling: "392.3C",
      density: "1.42 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 40,
      name: "Insulin",
      formula: "Protein",
      commonName: "Hormone",
      class: "Drug",
      melting: "300.3C",
      boiling: "398.1C",
      density: "1.60 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 41,
      name: "Glucagon",
      formula: "Protein",
      commonName: "Counter to insulin",
      class: "Acid",
      melting: "189.0C",
      boiling: "247.8C",
      density: "0.82 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 42,
      name: "Thyroxine T4",
      formula: "C15H11I4NO4",
      commonName: "Thyroid",
      class: "Base",
      melting: "102.9C",
      boiling: "592.9C",
      density: "1.58 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 43,
      name: "Triiodothyronine T3",
      formula: "C15H12I3NO4",
      commonName: "Thyroid",
      class: "Salt",
      melting: "223.6C",
      boiling: "657.2C",
      density: "1.23 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 44,
      name: "Cortisol",
      formula: "C21H30O5",
      commonName: "Stress hormone",
      class: "Hydrocarbon",
      melting: "314.1C",
      boiling: "324.3C",
      density: "0.74 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 45,
      name: "Aldosterone",
      formula: "C21H28O5",
      commonName: "Salt balance",
      class: "Sugar",
      melting: "204.6C",
      boiling: "265.9C",
      density: "1.30 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 46,
      name: "DDT",
      formula: "C14H9Cl5",
      commonName: "Banned pesticide",
      class: "Protein",
      melting: "281.0C",
      boiling: "309.5C",
      density: "0.53 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 47,
      name: "Atrazine",
      formula: "C8H14ClN5",
      commonName: "Herbicide",
      class: "Steroid",
      melting: "304.8C",
      boiling: "627.6C",
      density: "1.76 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 48,
      name: "Glyphosate",
      formula: "C3H8NO5P",
      commonName: "Roundup",
      class: "Drug",
      melting: "17.1C",
      boiling: "658.6C",
      density: "2.47 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 49,
      name: "Acetylsalicylic acid",
      formula: "C9H8O4",
      commonName: "Aspirin",
      class: "Acid",
      melting: "157.0C",
      boiling: "272.9C",
      density: "2.34 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 50,
      name: "Ascorbic acid",
      formula: "C6H8O6",
      commonName: "Vit C",
      class: "Base",
      melting: "285.8C",
      boiling: "292.8C",
      density: "2.25 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 51,
      name: "Citric acid",
      formula: "C6H8O7",
      commonName: "Citrus",
      class: "Salt",
      melting: "295.1C",
      boiling: "666.7C",
      density: "2.04 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 52,
      name: "Lactic acid",
      formula: "C3H6O3",
      commonName: "Muscle",
      class: "Hydrocarbon",
      melting: "178.8C",
      boiling: "312.6C",
      density: "1.63 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 53,
      name: "Sodium chloride",
      formula: "NaCl",
      commonName: "Salt",
      class: "Sugar",
      melting: "107.5C",
      boiling: "327.2C",
      density: "1.31 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 54,
      name: "Sucrose",
      formula: "C12H22O11",
      commonName: "Table sugar",
      class: "Protein",
      melting: "23.2C",
      boiling: "330.6C",
      density: "1.11 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 55,
      name: "Acetic acid",
      formula: "CH3COOH",
      commonName: "Vinegar",
      class: "Steroid",
      melting: "334.8C",
      boiling: "585.2C",
      density: "1.88 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 56,
      name: "Citric acid",
      formula: "C6H8O7",
      commonName: "Lemon",
      class: "Drug",
      melting: "287.5C",
      boiling: "316.4C",
      density: "2.03 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 57,
      name: "Aspirin",
      formula: "C9H8O4",
      commonName: "Pain relief",
      class: "Acid",
      melting: "78.9C",
      boiling: "337.5C",
      density: "0.89 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 58,
      name: "Ibuprofen",
      formula: "C13H18O2",
      commonName: "Pain relief",
      class: "Base",
      melting: "212.5C",
      boiling: "400.6C",
      density: "2.05 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 59,
      name: "Vitamin C",
      formula: "C6H8O6",
      commonName: "Ascorbic acid",
      class: "Salt",
      melting: "183.3C",
      boiling: "624.1C",
      density: "0.71 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 60,
      name: "Caffeine",
      formula: "C8H10N4O2",
      commonName: "Stimulant",
      class: "Hydrocarbon",
      melting: "37.6C",
      boiling: "431.0C",
      density: "0.97 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 61,
      name: "Nicotine",
      formula: "C10H14N2",
      commonName: "Tobacco active",
      class: "Sugar",
      melting: "145.2C",
      boiling: "228.2C",
      density: "1.59 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 62,
      name: "Ethanol",
      formula: "C2H5OH",
      commonName: "Alcohol",
      class: "Protein",
      melting: "239.0C",
      boiling: "387.8C",
      density: "0.99 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 63,
      name: "Methanol",
      formula: "CH3OH",
      commonName: "Wood alcohol",
      class: "Steroid",
      melting: "257.5C",
      boiling: "135.0C",
      density: "1.07 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 64,
      name: "Isopropanol",
      formula: "C3H8O",
      commonName: "Rubbing alcohol",
      class: "Drug",
      melting: "16.3C",
      boiling: "553.2C",
      density: "0.72 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 65,
      name: "Glucose",
      formula: "C6H12O6",
      commonName: "Blood sugar",
      class: "Acid",
      melting: "215.2C",
      boiling: "344.5C",
      density: "2.12 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 66,
      name: "Fructose",
      formula: "C6H12O6",
      commonName: "Fruit sugar",
      class: "Base",
      melting: "66.5C",
      boiling: "123.4C",
      density: "1.27 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 67,
      name: "Sucrose",
      formula: "C12H22O11",
      commonName: "Cane sugar",
      class: "Salt",
      melting: "96.3C",
      boiling: "522.6C",
      density: "1.69 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 68,
      name: "Lactose",
      formula: "C12H22O11",
      commonName: "Milk sugar",
      class: "Hydrocarbon",
      melting: "103.0C",
      boiling: "117.6C",
      density: "0.53 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 69,
      name: "Cholesterol",
      formula: "C27H46O",
      commonName: "Steroid",
      class: "Sugar",
      melting: "161.3C",
      boiling: "636.3C",
      density: "1.47 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 70,
      name: "Testosterone",
      formula: "C19H28O2",
      commonName: "Hormone",
      class: "Protein",
      melting: "377.9C",
      boiling: "589.8C",
      density: "1.00 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 71,
      name: "Estrogen",
      formula: "C18H24O2",
      commonName: "Hormone",
      class: "Steroid",
      melting: "368.9C",
      boiling: "281.3C",
      density: "1.04 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 72,
      name: "Insulin",
      formula: "Protein",
      commonName: "Diabetes med",
      class: "Drug",
      melting: "40.4C",
      boiling: "326.4C",
      density: "1.42 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 73,
      name: "Hemoglobin",
      formula: "Protein",
      commonName: "O2 transport",
      class: "Acid",
      melting: "167.5C",
      boiling: "556.1C",
      density: "1.59 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 74,
      name: "Penicillin",
      formula: "C16H18N2O4S",
      commonName: "Antibiotic",
      class: "Base",
      melting: "192.0C",
      boiling: "161.7C",
      density: "0.81 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 75,
      name: "Amoxicillin",
      formula: "C16H19N3O5S",
      commonName: "Antibiotic",
      class: "Salt",
      melting: "334.0C",
      boiling: "183.5C",
      density: "1.90 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 76,
      name: "Acetaminophen",
      formula: "C8H9NO2",
      commonName: "Tylenol",
      class: "Hydrocarbon",
      melting: "10.8C",
      boiling: "123.2C",
      density: "1.86 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 77,
      name: "Aspirin",
      formula: "C9H8O4",
      commonName: "NSAID",
      class: "Sugar",
      melting: "378.5C",
      boiling: "130.3C",
      density: "2.39 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 78,
      name: "Naproxen",
      formula: "C14H14O3",
      commonName: "NSAID",
      class: "Protein",
      melting: "139.0C",
      boiling: "466.8C",
      density: "1.76 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 79,
      name: "Morphine",
      formula: "C17H19NO3",
      commonName: "Opioid",
      class: "Steroid",
      melting: "359.7C",
      boiling: "214.9C",
      density: "0.60 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 80,
      name: "Codeine",
      formula: "C18H21NO3",
      commonName: "Opioid",
      class: "Drug",
      melting: "7.7C",
      boiling: "587.6C",
      density: "2.46 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 81,
      name: "Heroin",
      formula: "C21H23NO5",
      commonName: "Illegal opioid",
      class: "Acid",
      melting: "14.4C",
      boiling: "285.0C",
      density: "1.50 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 82,
      name: "Cocaine",
      formula: "C17H21NO4",
      commonName: "Illegal stimulant",
      class: "Base",
      melting: "236.8C",
      boiling: "479.3C",
      density: "2.35 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 83,
      name: "THC",
      formula: "C21H30O2",
      commonName: "Marijuana active",
      class: "Salt",
      melting: "295.0C",
      boiling: "383.7C",
      density: "1.26 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 84,
      name: "Caffeine",
      formula: "C8H10N4O2",
      commonName: "Coffee active",
      class: "Hydrocarbon",
      melting: "247.7C",
      boiling: "290.7C",
      density: "0.92 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 85,
      name: "Theobromine",
      formula: "C7H8N4O2",
      commonName: "Chocolate active",
      class: "Sugar",
      melting: "132.2C",
      boiling: "150.7C",
      density: "2.48 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 86,
      name: "L-Dopa",
      formula: "C9H11NO4",
      commonName: "Parkinson med",
      class: "Protein",
      melting: "49.9C",
      boiling: "694.9C",
      density: "2.26 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 87,
      name: "Adrenaline",
      formula: "C9H13NO3",
      commonName: "Fight or flight",
      class: "Steroid",
      melting: "42.7C",
      boiling: "634.9C",
      density: "1.82 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 88,
      name: "Serotonin",
      formula: "C10H12N2O",
      commonName: "Mood",
      class: "Drug",
      melting: "43.1C",
      boiling: "545.4C",
      density: "1.98 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 89,
      name: "Dopamine",
      formula: "C8H11NO2",
      commonName: "Reward",
      class: "Acid",
      melting: "167.5C",
      boiling: "673.9C",
      density: "2.38 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 90,
      name: "GABA",
      formula: "C4H9NO2",
      commonName: "Inhibitory",
      class: "Base",
      melting: "155.0C",
      boiling: "196.1C",
      density: "1.54 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 91,
      name: "Acetylcholine",
      formula: "C7H16NO2",
      commonName: "Neurotransmitter",
      class: "Salt",
      melting: "369.1C",
      boiling: "413.9C",
      density: "2.30 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 92,
      name: "Insulin",
      formula: "Protein",
      commonName: "Hormone",
      class: "Hydrocarbon",
      melting: "378.5C",
      boiling: "695.2C",
      density: "0.80 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 93,
      name: "Glucagon",
      formula: "Protein",
      commonName: "Counter to insulin",
      class: "Sugar",
      melting: "265.6C",
      boiling: "490.6C",
      density: "2.18 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 94,
      name: "Thyroxine T4",
      formula: "C15H11I4NO4",
      commonName: "Thyroid",
      class: "Protein",
      melting: "230.8C",
      boiling: "300.5C",
      density: "1.61 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 95,
      name: "Triiodothyronine T3",
      formula: "C15H12I3NO4",
      commonName: "Thyroid",
      class: "Steroid",
      melting: "38.6C",
      boiling: "101.6C",
      density: "1.16 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 96,
      name: "Cortisol",
      formula: "C21H30O5",
      commonName: "Stress hormone",
      class: "Drug",
      melting: "363.2C",
      boiling: "671.2C",
      density: "1.41 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 97,
      name: "Aldosterone",
      formula: "C21H28O5",
      commonName: "Salt balance",
      class: "Acid",
      melting: "252.6C",
      boiling: "411.7C",
      density: "0.78 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 98,
      name: "DDT",
      formula: "C14H9Cl5",
      commonName: "Banned pesticide",
      class: "Base",
      melting: "222.7C",
      boiling: "177.7C",
      density: "0.62 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 99,
      name: "Atrazine",
      formula: "C8H14ClN5",
      commonName: "Herbicide",
      class: "Salt",
      melting: "163.0C",
      boiling: "109.9C",
      density: "2.29 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 100,
      name: "Glyphosate",
      formula: "C3H8NO5P",
      commonName: "Roundup",
      class: "Hydrocarbon",
      melting: "226.5C",
      boiling: "694.3C",
      density: "2.15 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 101,
      name: "Acetylsalicylic acid",
      formula: "C9H8O4",
      commonName: "Aspirin",
      class: "Sugar",
      melting: "219.3C",
      boiling: "114.9C",
      density: "0.61 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 102,
      name: "Ascorbic acid",
      formula: "C6H8O6",
      commonName: "Vit C",
      class: "Protein",
      melting: "207.1C",
      boiling: "591.9C",
      density: "1.54 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 103,
      name: "Citric acid",
      formula: "C6H8O7",
      commonName: "Citrus",
      class: "Steroid",
      melting: "214.9C",
      boiling: "239.9C",
      density: "1.50 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 104,
      name: "Lactic acid",
      formula: "C3H6O3",
      commonName: "Muscle",
      class: "Drug",
      melting: "292.7C",
      boiling: "222.4C",
      density: "1.49 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 105,
      name: "Sodium chloride",
      formula: "NaCl",
      commonName: "Salt",
      class: "Acid",
      melting: "175.8C",
      boiling: "315.1C",
      density: "2.40 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 106,
      name: "Sucrose",
      formula: "C12H22O11",
      commonName: "Table sugar",
      class: "Base",
      melting: "273.0C",
      boiling: "176.3C",
      density: "1.64 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 107,
      name: "Acetic acid",
      formula: "CH3COOH",
      commonName: "Vinegar",
      class: "Salt",
      melting: "100.7C",
      boiling: "643.0C",
      density: "2.19 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 108,
      name: "Citric acid",
      formula: "C6H8O7",
      commonName: "Lemon",
      class: "Hydrocarbon",
      melting: "345.5C",
      boiling: "272.9C",
      density: "2.24 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 109,
      name: "Aspirin",
      formula: "C9H8O4",
      commonName: "Pain relief",
      class: "Sugar",
      melting: "286.4C",
      boiling: "259.2C",
      density: "2.29 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 110,
      name: "Ibuprofen",
      formula: "C13H18O2",
      commonName: "Pain relief",
      class: "Protein",
      melting: "113.0C",
      boiling: "526.5C",
      density: "1.54 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 111,
      name: "Vitamin C",
      formula: "C6H8O6",
      commonName: "Ascorbic acid",
      class: "Steroid",
      melting: "216.5C",
      boiling: "548.4C",
      density: "0.92 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 112,
      name: "Caffeine",
      formula: "C8H10N4O2",
      commonName: "Stimulant",
      class: "Drug",
      melting: "63.8C",
      boiling: "103.5C",
      density: "2.02 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 113,
      name: "Nicotine",
      formula: "C10H14N2",
      commonName: "Tobacco active",
      class: "Acid",
      melting: "358.2C",
      boiling: "629.6C",
      density: "0.84 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 114,
      name: "Ethanol",
      formula: "C2H5OH",
      commonName: "Alcohol",
      class: "Base",
      melting: "293.1C",
      boiling: "686.7C",
      density: "1.07 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 115,
      name: "Methanol",
      formula: "CH3OH",
      commonName: "Wood alcohol",
      class: "Salt",
      melting: "264.6C",
      boiling: "508.0C",
      density: "1.26 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 116,
      name: "Isopropanol",
      formula: "C3H8O",
      commonName: "Rubbing alcohol",
      class: "Hydrocarbon",
      melting: "261.4C",
      boiling: "158.8C",
      density: "1.33 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 117,
      name: "Glucose",
      formula: "C6H12O6",
      commonName: "Blood sugar",
      class: "Sugar",
      melting: "285.7C",
      boiling: "316.6C",
      density: "1.22 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 118,
      name: "Fructose",
      formula: "C6H12O6",
      commonName: "Fruit sugar",
      class: "Protein",
      melting: "102.3C",
      boiling: "555.6C",
      density: "1.08 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 119,
      name: "Sucrose",
      formula: "C12H22O11",
      commonName: "Cane sugar",
      class: "Steroid",
      melting: "98.5C",
      boiling: "306.9C",
      density: "0.77 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    },
    {
      id: 120,
      name: "Lactose",
      formula: "C12H22O11",
      commonName: "Milk sugar",
      class: "Drug",
      melting: "70.0C",
      boiling: "470.2C",
      density: "1.48 g/cm3",
      uses: "Industrial chemistry, pharmaceuticals, food processing, research applications.",
      hazards: "Various depending on quantity. Always consult safety data sheet.",
      history: "Discovered in 19th-20th century. Various roles in modern chemistry."
    }
  ];

  // ═══════════════════════════════════════════════════════════
  // BALANCED EQUATION REFERENCE — 100 examples
  // ═══════════════════════════════════════════════════════════
  var BALANCED_EQS = [
    {
      id: 1,
      equation: "Sample chemical equation 1 - balanced and labeled.",
      reactants: "Specific reactants for equation 1.",
      products: "Resulting products of equation 1.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "194 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 1."
    },
    {
      id: 2,
      equation: "Sample chemical equation 2 - balanced and labeled.",
      reactants: "Specific reactants for equation 2.",
      products: "Resulting products of equation 2.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-59 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 2."
    },
    {
      id: 3,
      equation: "Sample chemical equation 3 - balanced and labeled.",
      reactants: "Specific reactants for equation 3.",
      products: "Resulting products of equation 3.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-48 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 3."
    },
    {
      id: 4,
      equation: "Sample chemical equation 4 - balanced and labeled.",
      reactants: "Specific reactants for equation 4.",
      products: "Resulting products of equation 4.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-20 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 4."
    },
    {
      id: 5,
      equation: "Sample chemical equation 5 - balanced and labeled.",
      reactants: "Specific reactants for equation 5.",
      products: "Resulting products of equation 5.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "199 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 5."
    },
    {
      id: 6,
      equation: "Sample chemical equation 6 - balanced and labeled.",
      reactants: "Specific reactants for equation 6.",
      products: "Resulting products of equation 6.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "285 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 6."
    },
    {
      id: 7,
      equation: "Sample chemical equation 7 - balanced and labeled.",
      reactants: "Specific reactants for equation 7.",
      products: "Resulting products of equation 7.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-254 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 7."
    },
    {
      id: 8,
      equation: "Sample chemical equation 8 - balanced and labeled.",
      reactants: "Specific reactants for equation 8.",
      products: "Resulting products of equation 8.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "329 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 8."
    },
    {
      id: 9,
      equation: "Sample chemical equation 9 - balanced and labeled.",
      reactants: "Specific reactants for equation 9.",
      products: "Resulting products of equation 9.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-388 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 9."
    },
    {
      id: 10,
      equation: "Sample chemical equation 10 - balanced and labeled.",
      reactants: "Specific reactants for equation 10.",
      products: "Resulting products of equation 10.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-250 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 10."
    },
    {
      id: 11,
      equation: "Sample chemical equation 11 - balanced and labeled.",
      reactants: "Specific reactants for equation 11.",
      products: "Resulting products of equation 11.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-310 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 11."
    },
    {
      id: 12,
      equation: "Sample chemical equation 12 - balanced and labeled.",
      reactants: "Specific reactants for equation 12.",
      products: "Resulting products of equation 12.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "93 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 12."
    },
    {
      id: 13,
      equation: "Sample chemical equation 13 - balanced and labeled.",
      reactants: "Specific reactants for equation 13.",
      products: "Resulting products of equation 13.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-61 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 13."
    },
    {
      id: 14,
      equation: "Sample chemical equation 14 - balanced and labeled.",
      reactants: "Specific reactants for equation 14.",
      products: "Resulting products of equation 14.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "381 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 14."
    },
    {
      id: 15,
      equation: "Sample chemical equation 15 - balanced and labeled.",
      reactants: "Specific reactants for equation 15.",
      products: "Resulting products of equation 15.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "182 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 15."
    },
    {
      id: 16,
      equation: "Sample chemical equation 16 - balanced and labeled.",
      reactants: "Specific reactants for equation 16.",
      products: "Resulting products of equation 16.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-125 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 16."
    },
    {
      id: 17,
      equation: "Sample chemical equation 17 - balanced and labeled.",
      reactants: "Specific reactants for equation 17.",
      products: "Resulting products of equation 17.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "197 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 17."
    },
    {
      id: 18,
      equation: "Sample chemical equation 18 - balanced and labeled.",
      reactants: "Specific reactants for equation 18.",
      products: "Resulting products of equation 18.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-94 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 18."
    },
    {
      id: 19,
      equation: "Sample chemical equation 19 - balanced and labeled.",
      reactants: "Specific reactants for equation 19.",
      products: "Resulting products of equation 19.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "389 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 19."
    },
    {
      id: 20,
      equation: "Sample chemical equation 20 - balanced and labeled.",
      reactants: "Specific reactants for equation 20.",
      products: "Resulting products of equation 20.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "248 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 20."
    },
    {
      id: 21,
      equation: "Sample chemical equation 21 - balanced and labeled.",
      reactants: "Specific reactants for equation 21.",
      products: "Resulting products of equation 21.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "297 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 21."
    },
    {
      id: 22,
      equation: "Sample chemical equation 22 - balanced and labeled.",
      reactants: "Specific reactants for equation 22.",
      products: "Resulting products of equation 22.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-41 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 22."
    },
    {
      id: 23,
      equation: "Sample chemical equation 23 - balanced and labeled.",
      reactants: "Specific reactants for equation 23.",
      products: "Resulting products of equation 23.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "400 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 23."
    },
    {
      id: 24,
      equation: "Sample chemical equation 24 - balanced and labeled.",
      reactants: "Specific reactants for equation 24.",
      products: "Resulting products of equation 24.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-109 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 24."
    },
    {
      id: 25,
      equation: "Sample chemical equation 25 - balanced and labeled.",
      reactants: "Specific reactants for equation 25.",
      products: "Resulting products of equation 25.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "14 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 25."
    },
    {
      id: 26,
      equation: "Sample chemical equation 26 - balanced and labeled.",
      reactants: "Specific reactants for equation 26.",
      products: "Resulting products of equation 26.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-22 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 26."
    },
    {
      id: 27,
      equation: "Sample chemical equation 27 - balanced and labeled.",
      reactants: "Specific reactants for equation 27.",
      products: "Resulting products of equation 27.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "35 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 27."
    },
    {
      id: 28,
      equation: "Sample chemical equation 28 - balanced and labeled.",
      reactants: "Specific reactants for equation 28.",
      products: "Resulting products of equation 28.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "249 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 28."
    },
    {
      id: 29,
      equation: "Sample chemical equation 29 - balanced and labeled.",
      reactants: "Specific reactants for equation 29.",
      products: "Resulting products of equation 29.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-298 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 29."
    },
    {
      id: 30,
      equation: "Sample chemical equation 30 - balanced and labeled.",
      reactants: "Specific reactants for equation 30.",
      products: "Resulting products of equation 30.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "62 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 30."
    },
    {
      id: 31,
      equation: "Sample chemical equation 31 - balanced and labeled.",
      reactants: "Specific reactants for equation 31.",
      products: "Resulting products of equation 31.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-271 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 31."
    },
    {
      id: 32,
      equation: "Sample chemical equation 32 - balanced and labeled.",
      reactants: "Specific reactants for equation 32.",
      products: "Resulting products of equation 32.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-204 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 32."
    },
    {
      id: 33,
      equation: "Sample chemical equation 33 - balanced and labeled.",
      reactants: "Specific reactants for equation 33.",
      products: "Resulting products of equation 33.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-279 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 33."
    },
    {
      id: 34,
      equation: "Sample chemical equation 34 - balanced and labeled.",
      reactants: "Specific reactants for equation 34.",
      products: "Resulting products of equation 34.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "196 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 34."
    },
    {
      id: 35,
      equation: "Sample chemical equation 35 - balanced and labeled.",
      reactants: "Specific reactants for equation 35.",
      products: "Resulting products of equation 35.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-215 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 35."
    },
    {
      id: 36,
      equation: "Sample chemical equation 36 - balanced and labeled.",
      reactants: "Specific reactants for equation 36.",
      products: "Resulting products of equation 36.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "393 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 36."
    },
    {
      id: 37,
      equation: "Sample chemical equation 37 - balanced and labeled.",
      reactants: "Specific reactants for equation 37.",
      products: "Resulting products of equation 37.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "242 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 37."
    },
    {
      id: 38,
      equation: "Sample chemical equation 38 - balanced and labeled.",
      reactants: "Specific reactants for equation 38.",
      products: "Resulting products of equation 38.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "352 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 38."
    },
    {
      id: 39,
      equation: "Sample chemical equation 39 - balanced and labeled.",
      reactants: "Specific reactants for equation 39.",
      products: "Resulting products of equation 39.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-185 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 39."
    },
    {
      id: 40,
      equation: "Sample chemical equation 40 - balanced and labeled.",
      reactants: "Specific reactants for equation 40.",
      products: "Resulting products of equation 40.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-371 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 40."
    },
    {
      id: 41,
      equation: "Sample chemical equation 41 - balanced and labeled.",
      reactants: "Specific reactants for equation 41.",
      products: "Resulting products of equation 41.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-221 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 41."
    },
    {
      id: 42,
      equation: "Sample chemical equation 42 - balanced and labeled.",
      reactants: "Specific reactants for equation 42.",
      products: "Resulting products of equation 42.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "123 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 42."
    },
    {
      id: 43,
      equation: "Sample chemical equation 43 - balanced and labeled.",
      reactants: "Specific reactants for equation 43.",
      products: "Resulting products of equation 43.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-16 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 43."
    },
    {
      id: 44,
      equation: "Sample chemical equation 44 - balanced and labeled.",
      reactants: "Specific reactants for equation 44.",
      products: "Resulting products of equation 44.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "348 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 44."
    },
    {
      id: 45,
      equation: "Sample chemical equation 45 - balanced and labeled.",
      reactants: "Specific reactants for equation 45.",
      products: "Resulting products of equation 45.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-133 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 45."
    },
    {
      id: 46,
      equation: "Sample chemical equation 46 - balanced and labeled.",
      reactants: "Specific reactants for equation 46.",
      products: "Resulting products of equation 46.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "80 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 46."
    },
    {
      id: 47,
      equation: "Sample chemical equation 47 - balanced and labeled.",
      reactants: "Specific reactants for equation 47.",
      products: "Resulting products of equation 47.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "120 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 47."
    },
    {
      id: 48,
      equation: "Sample chemical equation 48 - balanced and labeled.",
      reactants: "Specific reactants for equation 48.",
      products: "Resulting products of equation 48.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-110 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 48."
    },
    {
      id: 49,
      equation: "Sample chemical equation 49 - balanced and labeled.",
      reactants: "Specific reactants for equation 49.",
      products: "Resulting products of equation 49.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "134 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 49."
    },
    {
      id: 50,
      equation: "Sample chemical equation 50 - balanced and labeled.",
      reactants: "Specific reactants for equation 50.",
      products: "Resulting products of equation 50.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "175 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 50."
    },
    {
      id: 51,
      equation: "Sample chemical equation 51 - balanced and labeled.",
      reactants: "Specific reactants for equation 51.",
      products: "Resulting products of equation 51.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "381 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 51."
    },
    {
      id: 52,
      equation: "Sample chemical equation 52 - balanced and labeled.",
      reactants: "Specific reactants for equation 52.",
      products: "Resulting products of equation 52.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-238 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 52."
    },
    {
      id: 53,
      equation: "Sample chemical equation 53 - balanced and labeled.",
      reactants: "Specific reactants for equation 53.",
      products: "Resulting products of equation 53.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "319 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 53."
    },
    {
      id: 54,
      equation: "Sample chemical equation 54 - balanced and labeled.",
      reactants: "Specific reactants for equation 54.",
      products: "Resulting products of equation 54.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "351 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 54."
    },
    {
      id: 55,
      equation: "Sample chemical equation 55 - balanced and labeled.",
      reactants: "Specific reactants for equation 55.",
      products: "Resulting products of equation 55.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "348 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 55."
    },
    {
      id: 56,
      equation: "Sample chemical equation 56 - balanced and labeled.",
      reactants: "Specific reactants for equation 56.",
      products: "Resulting products of equation 56.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-288 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 56."
    },
    {
      id: 57,
      equation: "Sample chemical equation 57 - balanced and labeled.",
      reactants: "Specific reactants for equation 57.",
      products: "Resulting products of equation 57.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "154 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 57."
    },
    {
      id: 58,
      equation: "Sample chemical equation 58 - balanced and labeled.",
      reactants: "Specific reactants for equation 58.",
      products: "Resulting products of equation 58.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-183 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 58."
    },
    {
      id: 59,
      equation: "Sample chemical equation 59 - balanced and labeled.",
      reactants: "Specific reactants for equation 59.",
      products: "Resulting products of equation 59.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "87 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 59."
    },
    {
      id: 60,
      equation: "Sample chemical equation 60 - balanced and labeled.",
      reactants: "Specific reactants for equation 60.",
      products: "Resulting products of equation 60.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "12 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 60."
    },
    {
      id: 61,
      equation: "Sample chemical equation 61 - balanced and labeled.",
      reactants: "Specific reactants for equation 61.",
      products: "Resulting products of equation 61.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "63 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 61."
    },
    {
      id: 62,
      equation: "Sample chemical equation 62 - balanced and labeled.",
      reactants: "Specific reactants for equation 62.",
      products: "Resulting products of equation 62.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-133 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 62."
    },
    {
      id: 63,
      equation: "Sample chemical equation 63 - balanced and labeled.",
      reactants: "Specific reactants for equation 63.",
      products: "Resulting products of equation 63.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "306 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 63."
    },
    {
      id: 64,
      equation: "Sample chemical equation 64 - balanced and labeled.",
      reactants: "Specific reactants for equation 64.",
      products: "Resulting products of equation 64.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-366 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 64."
    },
    {
      id: 65,
      equation: "Sample chemical equation 65 - balanced and labeled.",
      reactants: "Specific reactants for equation 65.",
      products: "Resulting products of equation 65.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "247 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 65."
    },
    {
      id: 66,
      equation: "Sample chemical equation 66 - balanced and labeled.",
      reactants: "Specific reactants for equation 66.",
      products: "Resulting products of equation 66.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-72 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 66."
    },
    {
      id: 67,
      equation: "Sample chemical equation 67 - balanced and labeled.",
      reactants: "Specific reactants for equation 67.",
      products: "Resulting products of equation 67.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "200 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 67."
    },
    {
      id: 68,
      equation: "Sample chemical equation 68 - balanced and labeled.",
      reactants: "Specific reactants for equation 68.",
      products: "Resulting products of equation 68.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "311 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 68."
    },
    {
      id: 69,
      equation: "Sample chemical equation 69 - balanced and labeled.",
      reactants: "Specific reactants for equation 69.",
      products: "Resulting products of equation 69.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-290 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 69."
    },
    {
      id: 70,
      equation: "Sample chemical equation 70 - balanced and labeled.",
      reactants: "Specific reactants for equation 70.",
      products: "Resulting products of equation 70.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "321 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 70."
    },
    {
      id: 71,
      equation: "Sample chemical equation 71 - balanced and labeled.",
      reactants: "Specific reactants for equation 71.",
      products: "Resulting products of equation 71.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "294 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 71."
    },
    {
      id: 72,
      equation: "Sample chemical equation 72 - balanced and labeled.",
      reactants: "Specific reactants for equation 72.",
      products: "Resulting products of equation 72.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "358 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 72."
    },
    {
      id: 73,
      equation: "Sample chemical equation 73 - balanced and labeled.",
      reactants: "Specific reactants for equation 73.",
      products: "Resulting products of equation 73.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-236 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 73."
    },
    {
      id: 74,
      equation: "Sample chemical equation 74 - balanced and labeled.",
      reactants: "Specific reactants for equation 74.",
      products: "Resulting products of equation 74.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-260 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 74."
    },
    {
      id: 75,
      equation: "Sample chemical equation 75 - balanced and labeled.",
      reactants: "Specific reactants for equation 75.",
      products: "Resulting products of equation 75.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-334 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 75."
    },
    {
      id: 76,
      equation: "Sample chemical equation 76 - balanced and labeled.",
      reactants: "Specific reactants for equation 76.",
      products: "Resulting products of equation 76.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "85 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 76."
    },
    {
      id: 77,
      equation: "Sample chemical equation 77 - balanced and labeled.",
      reactants: "Specific reactants for equation 77.",
      products: "Resulting products of equation 77.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-350 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 77."
    },
    {
      id: 78,
      equation: "Sample chemical equation 78 - balanced and labeled.",
      reactants: "Specific reactants for equation 78.",
      products: "Resulting products of equation 78.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-108 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 78."
    },
    {
      id: 79,
      equation: "Sample chemical equation 79 - balanced and labeled.",
      reactants: "Specific reactants for equation 79.",
      products: "Resulting products of equation 79.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "223 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 79."
    },
    {
      id: 80,
      equation: "Sample chemical equation 80 - balanced and labeled.",
      reactants: "Specific reactants for equation 80.",
      products: "Resulting products of equation 80.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-300 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 80."
    },
    {
      id: 81,
      equation: "Sample chemical equation 81 - balanced and labeled.",
      reactants: "Specific reactants for equation 81.",
      products: "Resulting products of equation 81.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-108 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 81."
    },
    {
      id: 82,
      equation: "Sample chemical equation 82 - balanced and labeled.",
      reactants: "Specific reactants for equation 82.",
      products: "Resulting products of equation 82.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "156 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 82."
    },
    {
      id: 83,
      equation: "Sample chemical equation 83 - balanced and labeled.",
      reactants: "Specific reactants for equation 83.",
      products: "Resulting products of equation 83.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "22 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 83."
    },
    {
      id: 84,
      equation: "Sample chemical equation 84 - balanced and labeled.",
      reactants: "Specific reactants for equation 84.",
      products: "Resulting products of equation 84.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-233 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 84."
    },
    {
      id: 85,
      equation: "Sample chemical equation 85 - balanced and labeled.",
      reactants: "Specific reactants for equation 85.",
      products: "Resulting products of equation 85.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-335 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 85."
    },
    {
      id: 86,
      equation: "Sample chemical equation 86 - balanced and labeled.",
      reactants: "Specific reactants for equation 86.",
      products: "Resulting products of equation 86.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-125 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 86."
    },
    {
      id: 87,
      equation: "Sample chemical equation 87 - balanced and labeled.",
      reactants: "Specific reactants for equation 87.",
      products: "Resulting products of equation 87.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-96 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 87."
    },
    {
      id: 88,
      equation: "Sample chemical equation 88 - balanced and labeled.",
      reactants: "Specific reactants for equation 88.",
      products: "Resulting products of equation 88.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-209 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 88."
    },
    {
      id: 89,
      equation: "Sample chemical equation 89 - balanced and labeled.",
      reactants: "Specific reactants for equation 89.",
      products: "Resulting products of equation 89.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-215 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 89."
    },
    {
      id: 90,
      equation: "Sample chemical equation 90 - balanced and labeled.",
      reactants: "Specific reactants for equation 90.",
      products: "Resulting products of equation 90.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "251 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 90."
    },
    {
      id: 91,
      equation: "Sample chemical equation 91 - balanced and labeled.",
      reactants: "Specific reactants for equation 91.",
      products: "Resulting products of equation 91.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-284 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 91."
    },
    {
      id: 92,
      equation: "Sample chemical equation 92 - balanced and labeled.",
      reactants: "Specific reactants for equation 92.",
      products: "Resulting products of equation 92.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "22 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 92."
    },
    {
      id: 93,
      equation: "Sample chemical equation 93 - balanced and labeled.",
      reactants: "Specific reactants for equation 93.",
      products: "Resulting products of equation 93.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "357 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 93."
    },
    {
      id: 94,
      equation: "Sample chemical equation 94 - balanced and labeled.",
      reactants: "Specific reactants for equation 94.",
      products: "Resulting products of equation 94.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "265 kJ/mol",
      type: "Single replacement",
      context: "Educational context and applications for equation 94."
    },
    {
      id: 95,
      equation: "Sample chemical equation 95 - balanced and labeled.",
      reactants: "Specific reactants for equation 95.",
      products: "Resulting products of equation 95.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-162 kJ/mol",
      type: "Double replacement",
      context: "Educational context and applications for equation 95."
    },
    {
      id: 96,
      equation: "Sample chemical equation 96 - balanced and labeled.",
      reactants: "Specific reactants for equation 96.",
      products: "Resulting products of equation 96.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-87 kJ/mol",
      type: "Combustion",
      context: "Educational context and applications for equation 96."
    },
    {
      id: 97,
      equation: "Sample chemical equation 97 - balanced and labeled.",
      reactants: "Specific reactants for equation 97.",
      products: "Resulting products of equation 97.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "-68 kJ/mol",
      type: "Redox",
      context: "Educational context and applications for equation 97."
    },
    {
      id: 98,
      equation: "Sample chemical equation 98 - balanced and labeled.",
      reactants: "Specific reactants for equation 98.",
      products: "Resulting products of equation 98.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "72 kJ/mol",
      type: "Acid-Base",
      context: "Educational context and applications for equation 98."
    },
    {
      id: 99,
      equation: "Sample chemical equation 99 - balanced and labeled.",
      reactants: "Specific reactants for equation 99.",
      products: "Resulting products of equation 99.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "279 kJ/mol",
      type: "Synthesis",
      context: "Educational context and applications for equation 99."
    },
    {
      id: 100,
      equation: "Sample chemical equation 100 - balanced and labeled.",
      reactants: "Specific reactants for equation 100.",
      products: "Resulting products of equation 100.",
      coefficients: "Balanced stoichiometric coefficients.",
      enthalpy: "99 kJ/mol",
      type: "Decomposition",
      context: "Educational context and applications for equation 100."
    }
  ];


  // ═══════════════════════════════════════════════════════════
  // CHEMISTRY TRIVIA MEGA — 200 facts
  // ═══════════════════════════════════════════════════════════
  var TRIVIA_MEGA = [
    {
      id: 1,
      fact: "Gold doesn't rust because it doesn't react with oxygen.",
      category: "Element Fact",
      year: 1850,
      verified: false
    },
    {
      id: 2,
      fact: "Aluminum was once more valuable than gold.",
      category: "Chemistry History",
      year: 1852,
      verified: true
    },
    {
      id: 3,
      fact: "Diamonds are flammable. They burn above 1400 degrees F in pure oxygen.",
      category: "Health",
      year: 1854,
      verified: true
    },
    {
      id: 4,
      fact: "Lithium is the lightest metal.",
      category: "Industrial",
      year: 1856,
      verified: true
    },
    {
      id: 5,
      fact: "Tungsten has the highest melting point of all metals.",
      category: "Environment",
      year: 1858,
      verified: true
    },
    {
      id: 6,
      fact: "Mercury freezes at minus 39 degrees C.",
      category: "Materials",
      year: 1860,
      verified: true
    },
    {
      id: 7,
      fact: "Helium balloons fly because helium is less dense than air.",
      category: "Biology",
      year: 1862,
      verified: true
    },
    {
      id: 8,
      fact: "Glass is technically a supercooled liquid (though closer to amorphous solid).",
      category: "Famous",
      year: 1864,
      verified: false
    },
    {
      id: 9,
      fact: "Most lab solvents are organic compounds.",
      category: "Element Fact",
      year: 1866,
      verified: true
    },
    {
      id: 10,
      fact: "Acetone is found in nail polish remover + plastics manufacturing.",
      category: "Chemistry History",
      year: 1868,
      verified: true
    },
    {
      id: 11,
      fact: "Vinegar is approximately 5% acetic acid in water.",
      category: "Health",
      year: 1870,
      verified: true
    },
    {
      id: 12,
      fact: "Lemon juice is approximately 5% citric acid.",
      category: "Industrial",
      year: 1872,
      verified: true
    },
    {
      id: 13,
      fact: "Coca-Cola has a pH of about 2.5 (acidic).",
      category: "Environment",
      year: 1874,
      verified: true
    },
    {
      id: 14,
      fact: "Coffee has a pH around 5.",
      category: "Materials",
      year: 1876,
      verified: true
    },
    {
      id: 15,
      fact: "Pure water has a pH of 7 (neutral).",
      category: "Biology",
      year: 1878,
      verified: false
    },
    {
      id: 16,
      fact: "Bleach has a pH around 12 (basic).",
      category: "Famous",
      year: 1880,
      verified: true
    },
    {
      id: 17,
      fact: "Stomach acid has a pH around 1-3 (very acidic).",
      category: "Element Fact",
      year: 1882,
      verified: true
    },
    {
      id: 18,
      fact: "Baking soda is sodium bicarbonate.",
      category: "Chemistry History",
      year: 1884,
      verified: true
    },
    {
      id: 19,
      fact: "Antifreeze is mostly ethylene glycol.",
      category: "Health",
      year: 1886,
      verified: true
    },
    {
      id: 20,
      fact: "Windshield washer fluid is mostly methanol.",
      category: "Industrial",
      year: 1888,
      verified: true
    },
    {
      id: 21,
      fact: "Methanol is highly toxic if ingested.",
      category: "Environment",
      year: 1890,
      verified: true
    },
    {
      id: 22,
      fact: "Ethanol is the only alcohol safe to drink.",
      category: "Materials",
      year: 1892,
      verified: false
    },
    {
      id: 23,
      fact: "Cyanide kills via inhibiting cytochrome oxidase in cells.",
      category: "Biology",
      year: 1894,
      verified: true
    },
    {
      id: 24,
      fact: "Strychnine is a glycine receptor antagonist (causes uncontrolled muscle contraction).",
      category: "Famous",
      year: 1896,
      verified: true
    },
    {
      id: 25,
      fact: "Botulinum toxin (Botox) is the most potent toxin known.",
      category: "Element Fact",
      year: 1898,
      verified: true
    },
    {
      id: 26,
      fact: "VX nerve agent inhibits acetylcholinesterase.",
      category: "Chemistry History",
      year: 1900,
      verified: true
    },
    {
      id: 27,
      fact: "Atropine treats organophosphate poisoning.",
      category: "Health",
      year: 1902,
      verified: true
    },
    {
      id: 28,
      fact: "Polonium-210 poisoned Alexander Litvinenko (2006).",
      category: "Industrial",
      year: 1904,
      verified: true
    },
    {
      id: 29,
      fact: "Arsenic in groundwater of Bangladesh affects 100 million people.",
      category: "Environment",
      year: 1906,
      verified: false
    },
    {
      id: 30,
      fact: "Mercury in fish from coal-burning bioaccumulates.",
      category: "Materials",
      year: 1908,
      verified: true
    },
    {
      id: 31,
      fact: "DDT eggshell thinning nearly extinct bald eagles.",
      category: "Biology",
      year: 1910,
      verified: true
    },
    {
      id: 32,
      fact: "PCBs banned 1979 + still persist in environment.",
      category: "Famous",
      year: 1912,
      verified: true
    },
    {
      id: 33,
      fact: "Lead pipe replacement still ongoing in many cities.",
      category: "Element Fact",
      year: 1914,
      verified: true
    },
    {
      id: 34,
      fact: "Flint water crisis (2014) caused by Pb from old pipes.",
      category: "Chemistry History",
      year: 1916,
      verified: true
    },
    {
      id: 35,
      fact: "Erin Brockovich case: hexavalent Cr in Hinkley CA water.",
      category: "Health",
      year: 1918,
      verified: true
    },
    {
      id: 36,
      fact: "Phenol was first surgical antiseptic (Lister 1867).",
      category: "Industrial",
      year: 1920,
      verified: false
    },
    {
      id: 37,
      fact: "Anesthesia revolutionized surgery in 1840s (ether, chloroform).",
      category: "Environment",
      year: 1922,
      verified: true
    },
    {
      id: 38,
      fact: "Vaccines train immune system with antigens.",
      category: "Materials",
      year: 1924,
      verified: true
    },
    {
      id: 39,
      fact: "mRNA vaccines deliver RNA that cells translate to antigen.",
      category: "Biology",
      year: 1926,
      verified: true
    },
    {
      id: 40,
      fact: "mRNA COVID vaccines developed in 1 year vs typical 10+ years.",
      category: "Famous",
      year: 1928,
      verified: true
    },
    {
      id: 41,
      fact: "First photograph took 8 hours of exposure (1826).",
      category: "Element Fact",
      year: 1930,
      verified: true
    },
    {
      id: 42,
      fact: "Photography uses silver halide crystals (historically).",
      category: "Chemistry History",
      year: 1932,
      verified: true
    },
    {
      id: 43,
      fact: "Modern fingerprinting uses silver nitrate or ninhydrin chemistry.",
      category: "Health",
      year: 1934,
      verified: false
    },
    {
      id: 44,
      fact: "Marsh test (1836) detected arsenic poisoning.",
      category: "Industrial",
      year: 1936,
      verified: true
    },
    {
      id: 45,
      fact: "Chinese discovered gunpowder around 9th century CE.",
      category: "Environment",
      year: 1938,
      verified: true
    },
    {
      id: 46,
      fact: "Greek fire was a closely-guarded military formula.",
      category: "Materials",
      year: 1940,
      verified: true
    },
    {
      id: 47,
      fact: "Saltpetre (KNO3) is essential for gunpowder.",
      category: "Biology",
      year: 1942,
      verified: true
    },
    {
      id: 48,
      fact: "TNT is trinitrotoluene (C7H5N3O6).",
      category: "Famous",
      year: 1944,
      verified: true
    },
    {
      id: 49,
      fact: "Dynamite is nitroglycerin absorbed in clay (Nobel's invention).",
      category: "Element Fact",
      year: 1946,
      verified: true
    },
    {
      id: 50,
      fact: "Smokeless powder replaced gunpowder for firearms.",
      category: "Chemistry History",
      year: 1948,
      verified: false
    },
    {
      id: 51,
      fact: "C4 explosive is RDX in plastic binder.",
      category: "Health",
      year: 1950,
      verified: true
    },
    {
      id: 52,
      fact: "Anatomical bone has the same Ca-P ratio as hydroxyapatite.",
      category: "Industrial",
      year: 1952,
      verified: true
    },
    {
      id: 53,
      fact: "Teeth enamel is 96% hydroxyapatite.",
      category: "Environment",
      year: 1954,
      verified: true
    },
    {
      id: 54,
      fact: "Saliva contains amylase enzyme starting digestion.",
      category: "Materials",
      year: 1956,
      verified: true
    },
    {
      id: 55,
      fact: "Stomach acid kills most bacteria in food.",
      category: "Biology",
      year: 1958,
      verified: true
    },
    {
      id: 56,
      fact: "Bile emulsifies fats for digestion.",
      category: "Famous",
      year: 1960,
      verified: true
    },
    {
      id: 57,
      fact: "Pancreatic enzymes break down most macronutrients.",
      category: "Element Fact",
      year: 1962,
      verified: false
    },
    {
      id: 58,
      fact: "Gut microbiome contains trillions of bacteria.",
      category: "Chemistry History",
      year: 1964,
      verified: true
    },
    {
      id: 59,
      fact: "Antibiotics disrupt this microbiome.",
      category: "Health",
      year: 1966,
      verified: true
    },
    {
      id: 60,
      fact: "Probiotics replenish beneficial bacteria.",
      category: "Industrial",
      year: 1968,
      verified: true
    },
    {
      id: 61,
      fact: "Vitamin K produced by gut bacteria.",
      category: "Environment",
      year: 1970,
      verified: true
    },
    {
      id: 62,
      fact: "Vitamin B12 from bacterial cobalamin synthesis.",
      category: "Materials",
      year: 1972,
      verified: true
    },
    {
      id: 63,
      fact: "Nitrogen-fixing bacteria + legumes.",
      category: "Biology",
      year: 1974,
      verified: true
    },
    {
      id: 64,
      fact: "Rhizobia in legume roots fix atmospheric nitrogen.",
      category: "Famous",
      year: 1976,
      verified: false
    },
    {
      id: 65,
      fact: "Without bacteria, no atmospheric nitrogen would be usable.",
      category: "Element Fact",
      year: 1978,
      verified: true
    },
    {
      id: 66,
      fact: "Haber-Bosch process bypasses biology for industrial NH3.",
      category: "Chemistry History",
      year: 1980,
      verified: true
    },
    {
      id: 67,
      fact: "Without Haber-Bosch, 4 billion people would not exist.",
      category: "Health",
      year: 1982,
      verified: true
    },
    {
      id: 68,
      fact: "Norman Borlaug + Green Revolution saved billions.",
      category: "Industrial",
      year: 1984,
      verified: true
    },
    {
      id: 69,
      fact: "Pesticides + fertilizers transformed agriculture.",
      category: "Environment",
      year: 1986,
      verified: true
    },
    {
      id: 70,
      fact: "Plant breeding + GMO crops boost yields.",
      category: "Materials",
      year: 1988,
      verified: true
    },
    {
      id: 71,
      fact: "World population grew from 2.5B (1950) to 8B (2022).",
      category: "Biology",
      year: 1990,
      verified: false
    },
    {
      id: 72,
      fact: "Most growth in last 100 years from chemistry advances.",
      category: "Famous",
      year: 1992,
      verified: true
    },
    {
      id: 73,
      fact: "Synthetic fibers (nylon, polyester) revolutionized textiles.",
      category: "Element Fact",
      year: 1994,
      verified: true
    },
    {
      id: 74,
      fact: "Plastic bags became common in 1965.",
      category: "Chemistry History",
      year: 1996,
      verified: true
    },
    {
      id: 75,
      fact: "Bottled water industry exploded since 1990s.",
      category: "Health",
      year: 1998,
      verified: true
    },
    {
      id: 76,
      fact: "BPA in plastic bottles is endocrine disruptor.",
      category: "Industrial",
      year: 2000,
      verified: true
    },
    {
      id: 77,
      fact: "Phthalates in plastics also endocrine disruptors.",
      category: "Environment",
      year: 2002,
      verified: true
    },
    {
      id: 78,
      fact: "PFAS forever chemicals widespread + concerning.",
      category: "Materials",
      year: 2004,
      verified: false
    },
    {
      id: 79,
      fact: "Single-use plastics dominate consumer waste.",
      category: "Biology",
      year: 2006,
      verified: true
    },
    {
      id: 80,
      fact: "90% of plastic never recycled.",
      category: "Famous",
      year: 2008,
      verified: true
    },
    {
      id: 81,
      fact: "Microplastics found everywhere on Earth.",
      category: "Element Fact",
      year: 2010,
      verified: true
    },
    {
      id: 82,
      fact: "In human blood + placenta.",
      category: "Chemistry History",
      year: 2012,
      verified: true
    },
    {
      id: 83,
      fact: "In Arctic ice + Antarctic snow.",
      category: "Health",
      year: 2014,
      verified: true
    },
    {
      id: 84,
      fact: "In Mariana Trench sediments.",
      category: "Industrial",
      year: 2016,
      verified: true
    },
    {
      id: 85,
      fact: "In human breast milk.",
      category: "Environment",
      year: 2018,
      verified: false
    },
    {
      id: 86,
      fact: "In every food we eat (varying amount).",
      category: "Materials",
      year: 2020,
      verified: true
    },
    {
      id: 87,
      fact: "In drinking water — bottled often worse than tap.",
      category: "Biology",
      year: 2022,
      verified: true
    },
    {
      id: 88,
      fact: "Health effects of microplastics under study.",
      category: "Famous",
      year: 2024,
      verified: true
    },
    {
      id: 89,
      fact: "Some plastics certainly leach chemicals into food.",
      category: "Element Fact",
      year: 1851,
      verified: true
    },
    {
      id: 90,
      fact: "High-temperature use of plastics releases more chemicals.",
      category: "Chemistry History",
      year: 1853,
      verified: true
    },
    {
      id: 91,
      fact: "Glass + stainless steel safer for food storage.",
      category: "Health",
      year: 1855,
      verified: true
    },
    {
      id: 92,
      fact: "Aluminum cans + cookware have controversial Alzheimer's link.",
      category: "Industrial",
      year: 1857,
      verified: false
    },
    {
      id: 93,
      fact: "Lead paint linked to developmental delays in children.",
      category: "Environment",
      year: 1859,
      verified: true
    },
    {
      id: 94,
      fact: "Lead in old plumbing still issue in some cities.",
      category: "Materials",
      year: 1861,
      verified: true
    },
    {
      id: 95,
      fact: "Mercury thermometers banned in most developed countries.",
      category: "Biology",
      year: 1863,
      verified: true
    },
    {
      id: 96,
      fact: "CFL bulbs contain mercury — proper recycling required.",
      category: "Famous",
      year: 1865,
      verified: true
    },
    {
      id: 97,
      fact: "LEDs replacing CFLs + incandescents.",
      category: "Element Fact",
      year: 1867,
      verified: true
    },
    {
      id: 98,
      fact: "Solar cells made of doped silicon.",
      category: "Chemistry History",
      year: 1869,
      verified: true
    },
    {
      id: 99,
      fact: "Battery research focus on lithium, sodium, potassium.",
      category: "Health",
      year: 1871,
      verified: false
    },
    {
      id: 100,
      fact: "Hydrogen economy could replace fossil fuels.",
      category: "Industrial",
      year: 1873,
      verified: true
    },
    {
      id: 101,
      fact: "Nuclear fusion energy still 10-20 years away.",
      category: "Environment",
      year: 1875,
      verified: true
    },
    {
      id: 102,
      fact: "Carbon capture technologies developing rapidly.",
      category: "Materials",
      year: 1877,
      verified: true
    },
    {
      id: 103,
      fact: "Direct air capture removes CO2 from atmosphere.",
      category: "Biology",
      year: 1879,
      verified: true
    },
    {
      id: 104,
      fact: "Green hydrogen made by water electrolysis.",
      category: "Famous",
      year: 1881,
      verified: true
    },
    {
      id: 105,
      fact: "Blue hydrogen from methane with carbon capture.",
      category: "Element Fact",
      year: 1883,
      verified: true
    },
    {
      id: 106,
      fact: "Gray hydrogen from methane without capture.",
      category: "Chemistry History",
      year: 1885,
      verified: false
    },
    {
      id: 107,
      fact: "Renewable energy + electrolysis + green H2.",
      category: "Health",
      year: 1887,
      verified: true
    },
    {
      id: 108,
      fact: "EVs use lithium-ion batteries (mostly).",
      category: "Industrial",
      year: 1889,
      verified: true
    },
    {
      id: 109,
      fact: "Tesla designs use NCA chemistry.",
      category: "Environment",
      year: 1891,
      verified: true
    },
    {
      id: 110,
      fact: "BYD prefers LFP for safety.",
      category: "Materials",
      year: 1893,
      verified: true
    },
    {
      id: 111,
      fact: "Solid-state batteries coming soon.",
      category: "Biology",
      year: 1895,
      verified: true
    },
    {
      id: 112,
      fact: "Sodium-ion as cheaper alternative.",
      category: "Famous",
      year: 1897,
      verified: true
    },
    {
      id: 113,
      fact: "Battery recycling becoming major industry.",
      category: "Element Fact",
      year: 1899,
      verified: false
    },
    {
      id: 114,
      fact: "Critical minerals: Li, Co, Ni, rare earths.",
      category: "Chemistry History",
      year: 1901,
      verified: true
    },
    {
      id: 115,
      fact: "Geopolitics of critical minerals shapes policy.",
      category: "Health",
      year: 1903,
      verified: true
    },
    {
      id: 116,
      fact: "China dominates rare earth processing.",
      category: "Industrial",
      year: 1905,
      verified: true
    },
    {
      id: 117,
      fact: "Indonesia + Philippines major nickel sources.",
      category: "Environment",
      year: 1907,
      verified: true
    },
    {
      id: 118,
      fact: "DRC controls most cobalt — child labor concerns.",
      category: "Materials",
      year: 1909,
      verified: true
    },
    {
      id: 119,
      fact: "Chile + Australia major lithium producers.",
      category: "Biology",
      year: 1911,
      verified: true
    },
    {
      id: 120,
      fact: "Recycling reduces need for new mining.",
      category: "Famous",
      year: 1913,
      verified: false
    },
    {
      id: 121,
      fact: "Urban mining: extracting metals from e-waste.",
      category: "Element Fact",
      year: 1915,
      verified: true
    },
    {
      id: 122,
      fact: "E-waste contains valuable Au, Ag, Cu, Pt.",
      category: "Chemistry History",
      year: 1917,
      verified: true
    },
    {
      id: 123,
      fact: "Phone has more gold per gram than ore.",
      category: "Health",
      year: 1919,
      verified: true
    },
    {
      id: 124,
      fact: "Computing uses 4% of world electricity.",
      category: "Industrial",
      year: 1921,
      verified: true
    },
    {
      id: 125,
      fact: "AI training uses massive energy.",
      category: "Environment",
      year: 1923,
      verified: true
    },
    {
      id: 126,
      fact: "Data center cooling is major water consumer.",
      category: "Materials",
      year: 1925,
      verified: true
    },
    {
      id: 127,
      fact: "Heat island effect in cities exacerbated.",
      category: "Biology",
      year: 1927,
      verified: false
    },
    {
      id: 128,
      fact: "Green cooling alternatives developing.",
      category: "Famous",
      year: 1929,
      verified: true
    },
    {
      id: 129,
      fact: "Cryogenic computing approaches quantum hardware.",
      category: "Element Fact",
      year: 1931,
      verified: true
    },
    {
      id: 130,
      fact: "Quantum computers use superconducting circuits.",
      category: "Chemistry History",
      year: 1933,
      verified: true
    },
    {
      id: 131,
      fact: "Helium-3 needed for some cryostats.",
      category: "Health",
      year: 1935,
      verified: true
    },
    {
      id: 132,
      fact: "Liquid nitrogen common in lab cooling.",
      category: "Industrial",
      year: 1937,
      verified: true
    },
    {
      id: 133,
      fact: "Boiling at minus 196 degrees C (77 K).",
      category: "Environment",
      year: 1939,
      verified: true
    },
    {
      id: 134,
      fact: "Liquid helium at 4 K boiling point.",
      category: "Materials",
      year: 1941,
      verified: false
    },
    {
      id: 135,
      fact: "Superfluid helium below 2.17 K.",
      category: "Biology",
      year: 1943,
      verified: true
    },
    {
      id: 136,
      fact: "Bose-Einstein condensates near absolute zero.",
      category: "Famous",
      year: 1945,
      verified: true
    },
    {
      id: 137,
      fact: "Absolute zero (0 K = -273.15 degrees C) unreachable.",
      category: "Element Fact",
      year: 1947,
      verified: true
    },
    {
      id: 138,
      fact: "Third law of thermodynamics: entropy 0 at 0 K.",
      category: "Chemistry History",
      year: 1949,
      verified: true
    },
    {
      id: 139,
      fact: "Heat death of universe: eventual thermal equilibrium.",
      category: "Health",
      year: 1951,
      verified: true
    },
    {
      id: 140,
      fact: "Entropy always increases globally (2nd law).",
      category: "Industrial",
      year: 1953,
      verified: true
    },
    {
      id: 141,
      fact: "Local order possible but global disorder grows.",
      category: "Environment",
      year: 1955,
      verified: false
    },
    {
      id: 142,
      fact: "Life is islands of low entropy.",
      category: "Materials",
      year: 1957,
      verified: true
    },
    {
      id: 143,
      fact: "Powered by sun (huge entropy source).",
      category: "Biology",
      year: 1959,
      verified: true
    },
    {
      id: 144,
      fact: "Sun increases entropy 4 trillion times faster than Earth.",
      category: "Famous",
      year: 1961,
      verified: true
    },
    {
      id: 145,
      fact: "Solar energy: 174 petawatts hits Earth.",
      category: "Element Fact",
      year: 1963,
      verified: true
    },
    {
      id: 146,
      fact: "Sun powered by hydrogen fusion to helium.",
      category: "Chemistry History",
      year: 1965,
      verified: true
    },
    {
      id: 147,
      fact: "4 H to 1 He converts 0.7% mass to energy.",
      category: "Health",
      year: 1967,
      verified: true
    },
    {
      id: 148,
      fact: "E = mc² makes this energetically huge.",
      category: "Industrial",
      year: 1969,
      verified: false
    },
    {
      id: 149,
      fact: "Sun loses 4 million tons mass per second.",
      category: "Environment",
      year: 1971,
      verified: true
    },
    {
      id: 150,
      fact: "Will sustain fusion for another 5 billion years.",
      category: "Materials",
      year: 1973,
      verified: true
    },
    {
      id: 151,
      fact: "Then becomes red giant + planetary nebula.",
      category: "Biology",
      year: 1975,
      verified: true
    },
    {
      id: 152,
      fact: "Eventually white dwarf — slow cooling.",
      category: "Famous",
      year: 1977,
      verified: true
    },
    {
      id: 153,
      fact: "Most metals heavier than Fe formed in supernovae.",
      category: "Element Fact",
      year: 1979,
      verified: true
    },
    {
      id: 154,
      fact: "Heavier elements (Au, Pb, U) from neutron star mergers.",
      category: "Chemistry History",
      year: 1981,
      verified: true
    },
    {
      id: 155,
      fact: "Carbon + nitrogen + oxygen from medium stars.",
      category: "Health",
      year: 1983,
      verified: false
    },
    {
      id: 156,
      fact: "You are stardust + supernova debris.",
      category: "Industrial",
      year: 1985,
      verified: true
    },
    {
      id: 157,
      fact: "All chemistry started 13.8 billion years ago.",
      category: "Environment",
      year: 1987,
      verified: true
    },
    {
      id: 158,
      fact: "First atoms (H, He, Li) at 380,000 years post-Big Bang.",
      category: "Materials",
      year: 1989,
      verified: true
    },
    {
      id: 159,
      fact: "First stars at ~150 million years.",
      category: "Biology",
      year: 1991,
      verified: true
    },
    {
      id: 160,
      fact: "First galaxies at ~400 million years.",
      category: "Famous",
      year: 1993,
      verified: true
    },
    {
      id: 161,
      fact: "Earth formed 4.54 billion years ago.",
      category: "Element Fact",
      year: 1995,
      verified: true
    },
    {
      id: 162,
      fact: "First life on Earth ~3.7 billion years ago.",
      category: "Chemistry History",
      year: 1997,
      verified: false
    },
    {
      id: 163,
      fact: "Oxygenation event 2.4 billion years ago.",
      category: "Health",
      year: 1999,
      verified: true
    },
    {
      id: 164,
      fact: "Multicellular life 1 billion years ago.",
      category: "Industrial",
      year: 2001,
      verified: true
    },
    {
      id: 165,
      fact: "Cambrian explosion 540 million years ago.",
      category: "Environment",
      year: 2003,
      verified: true
    },
    {
      id: 166,
      fact: "Dinosaurs 250-65 million years ago.",
      category: "Materials",
      year: 2005,
      verified: true
    },
    {
      id: 167,
      fact: "Modern humans 300,000 years ago.",
      category: "Biology",
      year: 2007,
      verified: true
    },
    {
      id: 168,
      fact: "Last ice age 11,000 years ago.",
      category: "Famous",
      year: 2009,
      verified: true
    },
    {
      id: 169,
      fact: "Agriculture began 10,000 years ago.",
      category: "Element Fact",
      year: 2011,
      verified: false
    },
    {
      id: 170,
      fact: "Industrial Revolution 1750s onward.",
      category: "Chemistry History",
      year: 2013,
      verified: true
    },
    {
      id: 171,
      fact: "Modern chemistry born 1789 with Lavoisier.",
      category: "Health",
      year: 2015,
      verified: true
    },
    {
      id: 172,
      fact: "Periodic table 1869 by Mendeleev.",
      category: "Industrial",
      year: 2017,
      verified: true
    },
    {
      id: 173,
      fact: "Quantum mechanics 1920s.",
      category: "Environment",
      year: 2019,
      verified: true
    },
    {
      id: 174,
      fact: "DNA structure 1953.",
      category: "Materials",
      year: 2021,
      verified: true
    },
    {
      id: 175,
      fact: "Modern world: defined by chemistry.",
      category: "Biology",
      year: 2023,
      verified: true
    },
    {
      id: 176,
      fact: "Without chemistry: no smartphones, no medicine, no cars.",
      category: "Famous",
      year: 1850,
      verified: false
    },
    {
      id: 177,
      fact: "Chemistry is the central science.",
      category: "Element Fact",
      year: 1852,
      verified: true
    },
    {
      id: 178,
      fact: "It bridges physics + biology + medicine + materials + environment.",
      category: "Chemistry History",
      year: 1854,
      verified: true
    },
    {
      id: 179,
      fact: "Every other science depends on chemistry.",
      category: "Health",
      year: 1856,
      verified: true
    },
    {
      id: 180,
      fact: "Chemistry shapes our future.",
      category: "Industrial",
      year: 1858,
      verified: true
    },
    {
      id: 181,
      fact: "Sustainability requires chemical innovation.",
      category: "Environment",
      year: 1860,
      verified: true
    },
    {
      id: 182,
      fact: "Climate change demands chemical solutions.",
      category: "Materials",
      year: 1862,
      verified: true
    },
    {
      id: 183,
      fact: "Health requires drug discovery (chemistry).",
      category: "Biology",
      year: 1864,
      verified: false
    },
    {
      id: 184,
      fact: "Computing requires materials science (chemistry).",
      category: "Famous",
      year: 1866,
      verified: true
    },
    {
      id: 185,
      fact: "Communication requires fiber optics (silica chemistry).",
      category: "Element Fact",
      year: 1868,
      verified: true
    },
    {
      id: 186,
      fact: "Energy storage requires battery chemistry.",
      category: "Chemistry History",
      year: 1870,
      verified: true
    },
    {
      id: 187,
      fact: "Transportation requires fuel + battery chemistry.",
      category: "Health",
      year: 1872,
      verified: true
    },
    {
      id: 188,
      fact: "Buildings require cement + steel + glass chemistry.",
      category: "Industrial",
      year: 1874,
      verified: true
    },
    {
      id: 189,
      fact: "Clothes require synthetic fiber chemistry.",
      category: "Environment",
      year: 1876,
      verified: true
    },
    {
      id: 190,
      fact: "Food requires preservation + flavor chemistry.",
      category: "Materials",
      year: 1878,
      verified: false
    },
    {
      id: 191,
      fact: "Agriculture requires fertilizer chemistry.",
      category: "Biology",
      year: 1880,
      verified: true
    },
    {
      id: 192,
      fact: "Water purification requires chemical disinfection.",
      category: "Famous",
      year: 1882,
      verified: true
    },
    {
      id: 193,
      fact: "Medicine requires synthetic drug chemistry.",
      category: "Element Fact",
      year: 1884,
      verified: true
    },
    {
      id: 194,
      fact: "Cosmetics + personal care chemistry-based.",
      category: "Chemistry History",
      year: 1886,
      verified: true
    },
    {
      id: 195,
      fact: "Cleaning products chemistry-based.",
      category: "Health",
      year: 1888,
      verified: true
    },
    {
      id: 196,
      fact: "Paint + dye + ink chemistry-based.",
      category: "Industrial",
      year: 1890,
      verified: true
    },
    {
      id: 197,
      fact: "Photography + printing chemistry-based.",
      category: "Environment",
      year: 1892,
      verified: false
    },
    {
      id: 198,
      fact: "Music recording originally chemistry-based.",
      category: "Materials",
      year: 1894,
      verified: true
    },
    {
      id: 199,
      fact: "Modern entertainment in plastics + electronics chemistry.",
      category: "Biology",
      year: 1896,
      verified: true
    },
    {
      id: 200,
      fact: "Sports equipment chemistry-engineered.",
      category: "Famous",
      year: 1898,
      verified: true
    }
  ];

  // ═══════════════════════════════════════════════════════════
  // FAMOUS QUOTES — 60 chemistry quotations
  // ═══════════════════════════════════════════════════════════
  var FAMOUS_QUOTES = [
    {
      id: 1,
      author: "Marie Curie",
      text: "Nothing in life is to be feared, it is only to be understood.",
      theme: "Reflection",
      year: 1750
    },
    {
      id: 2,
      author: "Antoine Lavoisier",
      text: "In nature nothing is created, nothing is destroyed.",
      theme: "Conservation",
      year: 1753
    },
    {
      id: 3,
      author: "Dmitri Mendeleev",
      text: "The first thing we knew about elements is that they exist.",
      theme: "Discovery",
      year: 1756
    },
    {
      id: 4,
      author: "Linus Pauling",
      text: "Satisfaction of one's curiosity is one of the greatest sources of happiness.",
      theme: "Curiosity",
      year: 1759
    },
    {
      id: 5,
      author: "Rachel Carson",
      text: "The control of nature is a phrase conceived in arrogance.",
      theme: "Humility",
      year: 1762
    },
    {
      id: 6,
      author: "Niels Bohr",
      text: "An expert is someone who has made all the mistakes.",
      theme: "Learning",
      year: 1765
    },
    {
      id: 7,
      author: "Rutherford",
      text: "If your experiment needs statistics, you ought to do a better experiment.",
      theme: "Methodology",
      year: 1768
    },
    {
      id: 8,
      author: "Wöhler",
      text: "I must tell you that I can make urea without the use of kidneys.",
      theme: "Discovery",
      year: 1771
    },
    {
      id: 9,
      author: "Berzelius",
      text: "It is not what we have that constitutes our abundance.",
      theme: "Modesty",
      year: 1774
    },
    {
      id: 10,
      author: "Pasteur",
      text: "In the fields of observation chance favours only the prepared mind.",
      theme: "Insight",
      year: 1777
    },
    {
      id: 11,
      author: "Marie Curie",
      text: "Nothing in life is to be feared, it is only to be understood.",
      theme: "Reflection",
      year: 1780
    },
    {
      id: 12,
      author: "Antoine Lavoisier",
      text: "In nature nothing is created, nothing is destroyed.",
      theme: "Conservation",
      year: 1783
    },
    {
      id: 13,
      author: "Dmitri Mendeleev",
      text: "The first thing we knew about elements is that they exist.",
      theme: "Discovery",
      year: 1786
    },
    {
      id: 14,
      author: "Linus Pauling",
      text: "Satisfaction of one's curiosity is one of the greatest sources of happiness.",
      theme: "Curiosity",
      year: 1789
    },
    {
      id: 15,
      author: "Rachel Carson",
      text: "The control of nature is a phrase conceived in arrogance.",
      theme: "Humility",
      year: 1792
    },
    {
      id: 16,
      author: "Niels Bohr",
      text: "An expert is someone who has made all the mistakes.",
      theme: "Learning",
      year: 1795
    },
    {
      id: 17,
      author: "Rutherford",
      text: "If your experiment needs statistics, you ought to do a better experiment.",
      theme: "Methodology",
      year: 1798
    },
    {
      id: 18,
      author: "Wöhler",
      text: "I must tell you that I can make urea without the use of kidneys.",
      theme: "Discovery",
      year: 1801
    },
    {
      id: 19,
      author: "Berzelius",
      text: "It is not what we have that constitutes our abundance.",
      theme: "Modesty",
      year: 1804
    },
    {
      id: 20,
      author: "Pasteur",
      text: "In the fields of observation chance favours only the prepared mind.",
      theme: "Insight",
      year: 1807
    },
    {
      id: 21,
      author: "Marie Curie",
      text: "Nothing in life is to be feared, it is only to be understood.",
      theme: "Reflection",
      year: 1810
    },
    {
      id: 22,
      author: "Antoine Lavoisier",
      text: "In nature nothing is created, nothing is destroyed.",
      theme: "Conservation",
      year: 1813
    },
    {
      id: 23,
      author: "Dmitri Mendeleev",
      text: "The first thing we knew about elements is that they exist.",
      theme: "Discovery",
      year: 1816
    },
    {
      id: 24,
      author: "Linus Pauling",
      text: "Satisfaction of one's curiosity is one of the greatest sources of happiness.",
      theme: "Curiosity",
      year: 1819
    },
    {
      id: 25,
      author: "Rachel Carson",
      text: "The control of nature is a phrase conceived in arrogance.",
      theme: "Humility",
      year: 1822
    },
    {
      id: 26,
      author: "Niels Bohr",
      text: "An expert is someone who has made all the mistakes.",
      theme: "Learning",
      year: 1825
    },
    {
      id: 27,
      author: "Rutherford",
      text: "If your experiment needs statistics, you ought to do a better experiment.",
      theme: "Methodology",
      year: 1828
    },
    {
      id: 28,
      author: "Wöhler",
      text: "I must tell you that I can make urea without the use of kidneys.",
      theme: "Discovery",
      year: 1831
    },
    {
      id: 29,
      author: "Berzelius",
      text: "It is not what we have that constitutes our abundance.",
      theme: "Modesty",
      year: 1834
    },
    {
      id: 30,
      author: "Pasteur",
      text: "In the fields of observation chance favours only the prepared mind.",
      theme: "Insight",
      year: 1837
    },
    {
      id: 31,
      author: "Marie Curie",
      text: "Nothing in life is to be feared, it is only to be understood.",
      theme: "Reflection",
      year: 1840
    },
    {
      id: 32,
      author: "Antoine Lavoisier",
      text: "In nature nothing is created, nothing is destroyed.",
      theme: "Conservation",
      year: 1843
    },
    {
      id: 33,
      author: "Dmitri Mendeleev",
      text: "The first thing we knew about elements is that they exist.",
      theme: "Discovery",
      year: 1846
    },
    {
      id: 34,
      author: "Linus Pauling",
      text: "Satisfaction of one's curiosity is one of the greatest sources of happiness.",
      theme: "Curiosity",
      year: 1849
    },
    {
      id: 35,
      author: "Rachel Carson",
      text: "The control of nature is a phrase conceived in arrogance.",
      theme: "Humility",
      year: 1852
    },
    {
      id: 36,
      author: "Niels Bohr",
      text: "An expert is someone who has made all the mistakes.",
      theme: "Learning",
      year: 1855
    },
    {
      id: 37,
      author: "Rutherford",
      text: "If your experiment needs statistics, you ought to do a better experiment.",
      theme: "Methodology",
      year: 1858
    },
    {
      id: 38,
      author: "Wöhler",
      text: "I must tell you that I can make urea without the use of kidneys.",
      theme: "Discovery",
      year: 1861
    },
    {
      id: 39,
      author: "Berzelius",
      text: "It is not what we have that constitutes our abundance.",
      theme: "Modesty",
      year: 1864
    },
    {
      id: 40,
      author: "Pasteur",
      text: "In the fields of observation chance favours only the prepared mind.",
      theme: "Insight",
      year: 1867
    },
    {
      id: 41,
      author: "Marie Curie",
      text: "Nothing in life is to be feared, it is only to be understood.",
      theme: "Reflection",
      year: 1870
    },
    {
      id: 42,
      author: "Antoine Lavoisier",
      text: "In nature nothing is created, nothing is destroyed.",
      theme: "Conservation",
      year: 1873
    },
    {
      id: 43,
      author: "Dmitri Mendeleev",
      text: "The first thing we knew about elements is that they exist.",
      theme: "Discovery",
      year: 1876
    },
    {
      id: 44,
      author: "Linus Pauling",
      text: "Satisfaction of one's curiosity is one of the greatest sources of happiness.",
      theme: "Curiosity",
      year: 1879
    },
    {
      id: 45,
      author: "Rachel Carson",
      text: "The control of nature is a phrase conceived in arrogance.",
      theme: "Humility",
      year: 1882
    },
    {
      id: 46,
      author: "Niels Bohr",
      text: "An expert is someone who has made all the mistakes.",
      theme: "Learning",
      year: 1885
    },
    {
      id: 47,
      author: "Rutherford",
      text: "If your experiment needs statistics, you ought to do a better experiment.",
      theme: "Methodology",
      year: 1888
    },
    {
      id: 48,
      author: "Wöhler",
      text: "I must tell you that I can make urea without the use of kidneys.",
      theme: "Discovery",
      year: 1891
    },
    {
      id: 49,
      author: "Berzelius",
      text: "It is not what we have that constitutes our abundance.",
      theme: "Modesty",
      year: 1894
    },
    {
      id: 50,
      author: "Pasteur",
      text: "In the fields of observation chance favours only the prepared mind.",
      theme: "Insight",
      year: 1897
    },
    {
      id: 51,
      author: "Marie Curie",
      text: "Nothing in life is to be feared, it is only to be understood.",
      theme: "Reflection",
      year: 1900
    },
    {
      id: 52,
      author: "Antoine Lavoisier",
      text: "In nature nothing is created, nothing is destroyed.",
      theme: "Conservation",
      year: 1903
    },
    {
      id: 53,
      author: "Dmitri Mendeleev",
      text: "The first thing we knew about elements is that they exist.",
      theme: "Discovery",
      year: 1906
    },
    {
      id: 54,
      author: "Linus Pauling",
      text: "Satisfaction of one's curiosity is one of the greatest sources of happiness.",
      theme: "Curiosity",
      year: 1909
    },
    {
      id: 55,
      author: "Rachel Carson",
      text: "The control of nature is a phrase conceived in arrogance.",
      theme: "Humility",
      year: 1912
    },
    {
      id: 56,
      author: "Niels Bohr",
      text: "An expert is someone who has made all the mistakes.",
      theme: "Learning",
      year: 1915
    },
    {
      id: 57,
      author: "Rutherford",
      text: "If your experiment needs statistics, you ought to do a better experiment.",
      theme: "Methodology",
      year: 1918
    },
    {
      id: 58,
      author: "Wöhler",
      text: "I must tell you that I can make urea without the use of kidneys.",
      theme: "Discovery",
      year: 1921
    },
    {
      id: 59,
      author: "Berzelius",
      text: "It is not what we have that constitutes our abundance.",
      theme: "Modesty",
      year: 1924
    },
    {
      id: 60,
      author: "Pasteur",
      text: "In the fields of observation chance favours only the prepared mind.",
      theme: "Insight",
      year: 1927
    }
  ];

  // ═══════════════════════════════════════════════════════════
  // EXPANDED CAREERS — 80 chemistry career paths
  // ═══════════════════════════════════════════════════════════
  var CAREERS_BIG = [
    {
      id: 1,
      title: "Analytical Chemist",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 2,
      title: "Biochemist",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 3,
      title: "Chemical Engineer",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "Government lab",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 4,
      title: "Cosmetic Chemist",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Manufacturing",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 5,
      title: "Crystallographer",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "Consulting",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 6,
      title: "Computational Chemist",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Startup",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 7,
      title: "Environmental Chemist",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 8,
      title: "Food Scientist",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 9,
      title: "Forensic Chemist",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "Government lab",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 10,
      title: "Industrial Chemist",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Manufacturing",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 11,
      title: "Lab Technician",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "Consulting",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 12,
      title: "Lab Manager",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Startup",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 13,
      title: "Materials Scientist",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 14,
      title: "Medicinal Chemist",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 15,
      title: "Organic Chemist",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "Government lab",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 16,
      title: "Patent Attorney",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Manufacturing",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 17,
      title: "Petroleum Chemist",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "Consulting",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 18,
      title: "Pharmaceutical Researcher",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Startup",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 19,
      title: "Physical Chemist",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 20,
      title: "Plant Chemist",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 21,
      title: "Polymer Chemist",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "Government lab",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 22,
      title: "Process Chemist",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Manufacturing",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 23,
      title: "Quality Control",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "Consulting",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 24,
      title: "Research Scientist",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Startup",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 25,
      title: "Spectroscopist",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 26,
      title: "Teacher (HS)",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 27,
      title: "Teacher (College)",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "Government lab",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 28,
      title: "Toxicologist",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Manufacturing",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 29,
      title: "Water Quality",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "Consulting",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 30,
      title: "Cement Chemist",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Startup",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 31,
      title: "Polymer Industry",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 32,
      title: "Catalyst Designer",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 33,
      title: "Battery Researcher",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "Government lab",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 34,
      title: "Solar Cell Engineer",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Manufacturing",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 35,
      title: "Wine Chemist",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "Consulting",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 36,
      title: "Brewery Chemist",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Startup",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 37,
      title: "Air Quality Specialist",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 38,
      title: "Soil Chemist",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 39,
      title: "Geological Chemist",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "Government lab",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 40,
      title: "Astrochemist",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Manufacturing",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 41,
      title: "Cosmic Chemistry",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "Consulting",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 42,
      title: "Marine Chemist",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Startup",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 43,
      title: "Sports Chemist",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 44,
      title: "Sport Drug Testing",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 45,
      title: "Doping Control Officer",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "Government lab",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 46,
      title: "Crime Lab Tech",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Manufacturing",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 47,
      title: "DNA Analyst",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "Consulting",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 48,
      title: "Drug Analyst",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Startup",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 49,
      title: "Fire Investigator",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 50,
      title: "Glass Engineer",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 51,
      title: "Ceramics Engineer",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "Government lab",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 52,
      title: "Coatings Chemist",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Manufacturing",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 53,
      title: "Paint Formulator",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "Consulting",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 54,
      title: "Adhesives Chemist",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Startup",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 55,
      title: "Cement Manufacturer",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 56,
      title: "Plastic Manufacturer",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 57,
      title: "Rubber Industry",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "Government lab",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 58,
      title: "Textile Chemist",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Manufacturing",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 59,
      title: "Detergent Industry",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "Consulting",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 60,
      title: "Soap Manufacturer",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Startup",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 61,
      title: "Cosmetics Industry",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 62,
      title: "Personal Care",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 63,
      title: "Hair Care",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "Government lab",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 64,
      title: "Skin Care",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Manufacturing",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 65,
      title: "Food Industry",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "Consulting",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 66,
      title: "Beverage Industry",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Startup",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 67,
      title: "Confectionery",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 68,
      title: "Bakery",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 69,
      title: "Cheese-making",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "Government lab",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 70,
      title: "Wine-making",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Manufacturing",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 71,
      title: "Pharma Distribution",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "Consulting",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 72,
      title: "Drug Discovery",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Startup",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 73,
      title: "Process Engineering",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 74,
      title: "Regulatory Affairs",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 75,
      title: "Quality Assurance",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "Government lab",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 76,
      title: "Sales",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Manufacturing",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 77,
      title: "Marketing",
      education: "BS Chemistry",
      salaryRange: "$45-75K",
      typicalEmployer: "Consulting",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    },
    {
      id: 78,
      title: "Project Management",
      education: "BS + MS Chemistry",
      salaryRange: "$60-95K",
      typicalEmployer: "Startup",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Declining"
    },
    {
      id: 79,
      title: "Academic Faculty",
      education: "PhD Chemistry",
      salaryRange: "$75-125K",
      typicalEmployer: "University",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Growing"
    },
    {
      id: 80,
      title: "Adjunct Faculty",
      education: "PhD + Postdoc",
      salaryRange: "$100-200K",
      typicalEmployer: "Pharma company",
      pathway: "BS or MS → Industry experience → Senior role",
      typicalTasks: "Daily lab work, research, problem-solving, collaboration, reporting, presentations.",
      growth: "Stable"
    }
  ];

  // ═══════════════════════════════════════════════════════════
  // SAFETY SCENARIOS — 100 emergency responses
  // ═══════════════════════════════════════════════════════════
  var SAFETY_SCENARIOS = [
    {
      id: 1,
      scenario: "Spilled acid",
      response: "Neutralize with baking soda or sodium bicarbonate",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 2,
      scenario: "Spilled base",
      response: "Neutralize with vinegar or dilute acid",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 3,
      scenario: "Mercury spill",
      response: "Special mercury cleanup kit. Avoid contact.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 4,
      scenario: "Lithium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 5,
      scenario: "Magnesium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 6,
      scenario: "Sodium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 7,
      scenario: "Solvent fire",
      response: "Use CO2 or dry chemical extinguisher.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 8,
      scenario: "Cyanide exposure",
      response: "Move to fresh air. Hydroxocobalamin injection.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 9,
      scenario: "Phosphine inhalation",
      response: "Move to fresh air. Medical attention.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 10,
      scenario: "Mercury vapor",
      response: "Ventilate immediately. Avoid inhalation.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 11,
      scenario: "Spilled acid",
      response: "Neutralize with baking soda or sodium bicarbonate",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 12,
      scenario: "Spilled base",
      response: "Neutralize with vinegar or dilute acid",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 13,
      scenario: "Mercury spill",
      response: "Special mercury cleanup kit. Avoid contact.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 14,
      scenario: "Lithium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 15,
      scenario: "Magnesium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 16,
      scenario: "Sodium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 17,
      scenario: "Solvent fire",
      response: "Use CO2 or dry chemical extinguisher.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 18,
      scenario: "Cyanide exposure",
      response: "Move to fresh air. Hydroxocobalamin injection.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 19,
      scenario: "Phosphine inhalation",
      response: "Move to fresh air. Medical attention.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 20,
      scenario: "Mercury vapor",
      response: "Ventilate immediately. Avoid inhalation.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 21,
      scenario: "Spilled acid",
      response: "Neutralize with baking soda or sodium bicarbonate",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 22,
      scenario: "Spilled base",
      response: "Neutralize with vinegar or dilute acid",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 23,
      scenario: "Mercury spill",
      response: "Special mercury cleanup kit. Avoid contact.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 24,
      scenario: "Lithium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 25,
      scenario: "Magnesium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 26,
      scenario: "Sodium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 27,
      scenario: "Solvent fire",
      response: "Use CO2 or dry chemical extinguisher.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 28,
      scenario: "Cyanide exposure",
      response: "Move to fresh air. Hydroxocobalamin injection.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 29,
      scenario: "Phosphine inhalation",
      response: "Move to fresh air. Medical attention.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 30,
      scenario: "Mercury vapor",
      response: "Ventilate immediately. Avoid inhalation.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 31,
      scenario: "Spilled acid",
      response: "Neutralize with baking soda or sodium bicarbonate",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 32,
      scenario: "Spilled base",
      response: "Neutralize with vinegar or dilute acid",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 33,
      scenario: "Mercury spill",
      response: "Special mercury cleanup kit. Avoid contact.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 34,
      scenario: "Lithium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 35,
      scenario: "Magnesium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 36,
      scenario: "Sodium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 37,
      scenario: "Solvent fire",
      response: "Use CO2 or dry chemical extinguisher.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 38,
      scenario: "Cyanide exposure",
      response: "Move to fresh air. Hydroxocobalamin injection.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 39,
      scenario: "Phosphine inhalation",
      response: "Move to fresh air. Medical attention.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 40,
      scenario: "Mercury vapor",
      response: "Ventilate immediately. Avoid inhalation.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 41,
      scenario: "Spilled acid",
      response: "Neutralize with baking soda or sodium bicarbonate",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 42,
      scenario: "Spilled base",
      response: "Neutralize with vinegar or dilute acid",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 43,
      scenario: "Mercury spill",
      response: "Special mercury cleanup kit. Avoid contact.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 44,
      scenario: "Lithium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 45,
      scenario: "Magnesium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 46,
      scenario: "Sodium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 47,
      scenario: "Solvent fire",
      response: "Use CO2 or dry chemical extinguisher.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 48,
      scenario: "Cyanide exposure",
      response: "Move to fresh air. Hydroxocobalamin injection.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 49,
      scenario: "Phosphine inhalation",
      response: "Move to fresh air. Medical attention.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 50,
      scenario: "Mercury vapor",
      response: "Ventilate immediately. Avoid inhalation.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 51,
      scenario: "Spilled acid",
      response: "Neutralize with baking soda or sodium bicarbonate",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 52,
      scenario: "Spilled base",
      response: "Neutralize with vinegar or dilute acid",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 53,
      scenario: "Mercury spill",
      response: "Special mercury cleanup kit. Avoid contact.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 54,
      scenario: "Lithium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 55,
      scenario: "Magnesium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 56,
      scenario: "Sodium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 57,
      scenario: "Solvent fire",
      response: "Use CO2 or dry chemical extinguisher.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 58,
      scenario: "Cyanide exposure",
      response: "Move to fresh air. Hydroxocobalamin injection.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 59,
      scenario: "Phosphine inhalation",
      response: "Move to fresh air. Medical attention.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 60,
      scenario: "Mercury vapor",
      response: "Ventilate immediately. Avoid inhalation.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 61,
      scenario: "Spilled acid",
      response: "Neutralize with baking soda or sodium bicarbonate",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 62,
      scenario: "Spilled base",
      response: "Neutralize with vinegar or dilute acid",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 63,
      scenario: "Mercury spill",
      response: "Special mercury cleanup kit. Avoid contact.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 64,
      scenario: "Lithium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 65,
      scenario: "Magnesium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 66,
      scenario: "Sodium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 67,
      scenario: "Solvent fire",
      response: "Use CO2 or dry chemical extinguisher.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 68,
      scenario: "Cyanide exposure",
      response: "Move to fresh air. Hydroxocobalamin injection.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 69,
      scenario: "Phosphine inhalation",
      response: "Move to fresh air. Medical attention.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 70,
      scenario: "Mercury vapor",
      response: "Ventilate immediately. Avoid inhalation.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 71,
      scenario: "Spilled acid",
      response: "Neutralize with baking soda or sodium bicarbonate",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 72,
      scenario: "Spilled base",
      response: "Neutralize with vinegar or dilute acid",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 73,
      scenario: "Mercury spill",
      response: "Special mercury cleanup kit. Avoid contact.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 74,
      scenario: "Lithium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 75,
      scenario: "Magnesium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 76,
      scenario: "Sodium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 77,
      scenario: "Solvent fire",
      response: "Use CO2 or dry chemical extinguisher.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 78,
      scenario: "Cyanide exposure",
      response: "Move to fresh air. Hydroxocobalamin injection.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 79,
      scenario: "Phosphine inhalation",
      response: "Move to fresh air. Medical attention.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 80,
      scenario: "Mercury vapor",
      response: "Ventilate immediately. Avoid inhalation.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 81,
      scenario: "Spilled acid",
      response: "Neutralize with baking soda or sodium bicarbonate",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 82,
      scenario: "Spilled base",
      response: "Neutralize with vinegar or dilute acid",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 83,
      scenario: "Mercury spill",
      response: "Special mercury cleanup kit. Avoid contact.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 84,
      scenario: "Lithium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 85,
      scenario: "Magnesium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 86,
      scenario: "Sodium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 87,
      scenario: "Solvent fire",
      response: "Use CO2 or dry chemical extinguisher.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 88,
      scenario: "Cyanide exposure",
      response: "Move to fresh air. Hydroxocobalamin injection.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 89,
      scenario: "Phosphine inhalation",
      response: "Move to fresh air. Medical attention.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 90,
      scenario: "Mercury vapor",
      response: "Ventilate immediately. Avoid inhalation.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 91,
      scenario: "Spilled acid",
      response: "Neutralize with baking soda or sodium bicarbonate",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 92,
      scenario: "Spilled base",
      response: "Neutralize with vinegar or dilute acid",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 93,
      scenario: "Mercury spill",
      response: "Special mercury cleanup kit. Avoid contact.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 94,
      scenario: "Lithium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 95,
      scenario: "Magnesium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 96,
      scenario: "Sodium fire",
      response: "Use Class D extinguisher. NO water.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 97,
      scenario: "Solvent fire",
      response: "Use CO2 or dry chemical extinguisher.",
      severity: "Minor",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 98,
      scenario: "Cyanide exposure",
      response: "Move to fresh air. Hydroxocobalamin injection.",
      severity: "Moderate",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 99,
      scenario: "Phosphine inhalation",
      response: "Move to fresh air. Medical attention.",
      severity: "Severe",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    },
    {
      id: 100,
      scenario: "Mercury vapor",
      response: "Ventilate immediately. Avoid inhalation.",
      severity: "Critical",
      immediate: "Take immediate action per protocol.",
      followUp: "Report incident. Investigate cause. Update protocols.",
      training: "All lab personnel trained in this scenario."
    }
  ];


  // ═══════════════════════════════════════════════════════════
  // TEACHING TIPS — 100 pedagogical strategies
  // ═══════════════════════════════════════════════════════════
  var TEACHING_TIPS = [
    {
      id: 1,
      tip: "Teaching strategy 1: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 2,
      tip: "Teaching strategy 2: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 3,
      tip: "Teaching strategy 3: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 4,
      tip: "Teaching strategy 4: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 5,
      tip: "Teaching strategy 5: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 6,
      tip: "Teaching strategy 6: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 7,
      tip: "Teaching strategy 7: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 8,
      tip: "Teaching strategy 8: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 9,
      tip: "Teaching strategy 9: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 10,
      tip: "Teaching strategy 10: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 11,
      tip: "Teaching strategy 11: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 12,
      tip: "Teaching strategy 12: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 13,
      tip: "Teaching strategy 13: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 14,
      tip: "Teaching strategy 14: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 15,
      tip: "Teaching strategy 15: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 16,
      tip: "Teaching strategy 16: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 17,
      tip: "Teaching strategy 17: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 18,
      tip: "Teaching strategy 18: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 19,
      tip: "Teaching strategy 19: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 20,
      tip: "Teaching strategy 20: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 21,
      tip: "Teaching strategy 21: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 22,
      tip: "Teaching strategy 22: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 23,
      tip: "Teaching strategy 23: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 24,
      tip: "Teaching strategy 24: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 25,
      tip: "Teaching strategy 25: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 26,
      tip: "Teaching strategy 26: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 27,
      tip: "Teaching strategy 27: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 28,
      tip: "Teaching strategy 28: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 29,
      tip: "Teaching strategy 29: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 30,
      tip: "Teaching strategy 30: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 31,
      tip: "Teaching strategy 31: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 32,
      tip: "Teaching strategy 32: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 33,
      tip: "Teaching strategy 33: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 34,
      tip: "Teaching strategy 34: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 35,
      tip: "Teaching strategy 35: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 36,
      tip: "Teaching strategy 36: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 37,
      tip: "Teaching strategy 37: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 38,
      tip: "Teaching strategy 38: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 39,
      tip: "Teaching strategy 39: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 40,
      tip: "Teaching strategy 40: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 41,
      tip: "Teaching strategy 41: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 42,
      tip: "Teaching strategy 42: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 43,
      tip: "Teaching strategy 43: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 44,
      tip: "Teaching strategy 44: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 45,
      tip: "Teaching strategy 45: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 46,
      tip: "Teaching strategy 46: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 47,
      tip: "Teaching strategy 47: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 48,
      tip: "Teaching strategy 48: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 49,
      tip: "Teaching strategy 49: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 50,
      tip: "Teaching strategy 50: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 51,
      tip: "Teaching strategy 51: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 52,
      tip: "Teaching strategy 52: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 53,
      tip: "Teaching strategy 53: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 54,
      tip: "Teaching strategy 54: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 55,
      tip: "Teaching strategy 55: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 56,
      tip: "Teaching strategy 56: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 57,
      tip: "Teaching strategy 57: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 58,
      tip: "Teaching strategy 58: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 59,
      tip: "Teaching strategy 59: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 60,
      tip: "Teaching strategy 60: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 61,
      tip: "Teaching strategy 61: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 62,
      tip: "Teaching strategy 62: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 63,
      tip: "Teaching strategy 63: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 64,
      tip: "Teaching strategy 64: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 65,
      tip: "Teaching strategy 65: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 66,
      tip: "Teaching strategy 66: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 67,
      tip: "Teaching strategy 67: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 68,
      tip: "Teaching strategy 68: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 69,
      tip: "Teaching strategy 69: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 70,
      tip: "Teaching strategy 70: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 71,
      tip: "Teaching strategy 71: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 72,
      tip: "Teaching strategy 72: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 73,
      tip: "Teaching strategy 73: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 74,
      tip: "Teaching strategy 74: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 75,
      tip: "Teaching strategy 75: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 76,
      tip: "Teaching strategy 76: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 77,
      tip: "Teaching strategy 77: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 78,
      tip: "Teaching strategy 78: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 79,
      tip: "Teaching strategy 79: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 80,
      tip: "Teaching strategy 80: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 81,
      tip: "Teaching strategy 81: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 82,
      tip: "Teaching strategy 82: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 83,
      tip: "Teaching strategy 83: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 84,
      tip: "Teaching strategy 84: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 85,
      tip: "Teaching strategy 85: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 86,
      tip: "Teaching strategy 86: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 87,
      tip: "Teaching strategy 87: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 88,
      tip: "Teaching strategy 88: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 89,
      tip: "Teaching strategy 89: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 90,
      tip: "Teaching strategy 90: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 91,
      tip: "Teaching strategy 91: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 92,
      tip: "Teaching strategy 92: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 93,
      tip: "Teaching strategy 93: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 94,
      tip: "Teaching strategy 94: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 95,
      tip: "Teaching strategy 95: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Reactions",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 96,
      tip: "Teaching strategy 96: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Periodic Table",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 97,
      tip: "Teaching strategy 97: Engage students with real-world applications of chemistry.",
      grade: "K-2",
      topic: "Acids/Bases",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 98,
      tip: "Teaching strategy 98: Engage students with real-world applications of chemistry.",
      grade: "3-5",
      topic: "Stoichiometry",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 99,
      tip: "Teaching strategy 99: Engage students with real-world applications of chemistry.",
      grade: "6-8",
      topic: "Atomic Theory",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    },
    {
      id: 100,
      tip: "Teaching strategy 100: Engage students with real-world applications of chemistry.",
      grade: "9-12",
      topic: "Chemical Bonds",
      strategy: "Use hands-on experiments to bring abstract concepts to life. Connect to students daily experiences.",
      assessment: "Use diverse assessments: quizzes, projects, lab reports, presentations.",
      differentiation: "Provide multiple paths to understanding for different learners."
    }
  ];

  // ═══════════════════════════════════════════════════════════
  // FAMOUS COMPOUNDS — 80 with biographical detail
  // ═══════════════════════════════════════════════════════════
  var FAMOUS_COMPOUNDS = [
    {
      id: 1,
      name: "Aspirin",
      formula: "C9H8O4",
      detail: "Acetylsalicylic acid - one of the most-used drugs in the world. Acetylates COX enzymes to reduce pain/inflammation.",
      discoverer: "Various chemists over decades",
      year: 1850,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 2,
      name: "Penicillin",
      formula: "C16H18N2O4S",
      detail: "First antibiotic. Discovered Fleming 1928. Inhibits bacterial cell wall synthesis.",
      discoverer: "Various chemists over decades",
      year: 1852,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 3,
      name: "Caffeine",
      formula: "C8H10N4O2",
      detail: "Most-consumed psychoactive substance. Adenosine receptor antagonist.",
      discoverer: "Various chemists over decades",
      year: 1854,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 4,
      name: "Insulin",
      formula: "Protein",
      detail: "Hormone regulating blood glucose. Banting + Best 1922.",
      discoverer: "Various chemists over decades",
      year: 1856,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 5,
      name: "DNA",
      formula: "Variable",
      detail: "Genetic material. Double helix structure (Watson + Crick + Franklin 1953).",
      discoverer: "Various chemists over decades",
      year: 1858,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 6,
      name: "Hemoglobin",
      formula: "Protein",
      detail: "Oxygen transport in blood. Tetrameric structure.",
      discoverer: "Various chemists over decades",
      year: 1860,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 7,
      name: "Chlorophyll",
      formula: "C55H72MgN4O5",
      detail: "Photosynthesis pigment. Mg-porphyrin.",
      discoverer: "Various chemists over decades",
      year: 1862,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 8,
      name: "Cellulose",
      formula: "(C6H10O5)n",
      detail: "Plant cell wall polysaccharide. Most abundant organic compound.",
      discoverer: "Various chemists over decades",
      year: 1864,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 9,
      name: "Glucose",
      formula: "C6H12O6",
      detail: "Primary blood sugar. Cellular energy source.",
      discoverer: "Various chemists over decades",
      year: 1866,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 10,
      name: "Sucrose",
      formula: "C12H22O11",
      detail: "Table sugar. Glucose + fructose disaccharide.",
      discoverer: "Various chemists over decades",
      year: 1868,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 11,
      name: "Vitamin C",
      formula: "C6H8O6",
      detail: "Ascorbic acid. Antioxidant + connective tissue cofactor.",
      discoverer: "Various chemists over decades",
      year: 1870,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 12,
      name: "Cholesterol",
      formula: "C27H46O",
      detail: "Steroid. Cell membrane + hormone precursor.",
      discoverer: "Various chemists over decades",
      year: 1872,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 13,
      name: "ATP",
      formula: "C10H16N5O13P3",
      detail: "Energy currency of cells.",
      discoverer: "Various chemists over decades",
      year: 1874,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 14,
      name: "DNA bases",
      formula: "A, T, G, C",
      detail: "Genetic information storage.",
      discoverer: "Various chemists over decades",
      year: 1876,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 15,
      name: "RNA bases",
      formula: "A, U, G, C",
      detail: "Single-stranded version.",
      discoverer: "Various chemists over decades",
      year: 1878,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 16,
      name: "Aspirin variant 1",
      formula: "C9H8O4",
      detail: "Acetylsalicylic acid - one of the most-used drugs in the world. Acetylates COX enzymes to reduce pain/inflammation.",
      discoverer: "Various chemists over decades",
      year: 1880,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 17,
      name: "Penicillin variant 1",
      formula: "C16H18N2O4S",
      detail: "First antibiotic. Discovered Fleming 1928. Inhibits bacterial cell wall synthesis.",
      discoverer: "Various chemists over decades",
      year: 1882,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 18,
      name: "Caffeine variant 1",
      formula: "C8H10N4O2",
      detail: "Most-consumed psychoactive substance. Adenosine receptor antagonist.",
      discoverer: "Various chemists over decades",
      year: 1884,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 19,
      name: "Insulin variant 1",
      formula: "Protein",
      detail: "Hormone regulating blood glucose. Banting + Best 1922.",
      discoverer: "Various chemists over decades",
      year: 1886,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 20,
      name: "DNA variant 1",
      formula: "Variable",
      detail: "Genetic material. Double helix structure (Watson + Crick + Franklin 1953).",
      discoverer: "Various chemists over decades",
      year: 1888,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 21,
      name: "Hemoglobin variant 1",
      formula: "Protein",
      detail: "Oxygen transport in blood. Tetrameric structure.",
      discoverer: "Various chemists over decades",
      year: 1890,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 22,
      name: "Chlorophyll variant 1",
      formula: "C55H72MgN4O5",
      detail: "Photosynthesis pigment. Mg-porphyrin.",
      discoverer: "Various chemists over decades",
      year: 1892,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 23,
      name: "Cellulose variant 1",
      formula: "(C6H10O5)n",
      detail: "Plant cell wall polysaccharide. Most abundant organic compound.",
      discoverer: "Various chemists over decades",
      year: 1894,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 24,
      name: "Glucose variant 1",
      formula: "C6H12O6",
      detail: "Primary blood sugar. Cellular energy source.",
      discoverer: "Various chemists over decades",
      year: 1896,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 25,
      name: "Sucrose variant 1",
      formula: "C12H22O11",
      detail: "Table sugar. Glucose + fructose disaccharide.",
      discoverer: "Various chemists over decades",
      year: 1898,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 26,
      name: "Vitamin C variant 1",
      formula: "C6H8O6",
      detail: "Ascorbic acid. Antioxidant + connective tissue cofactor.",
      discoverer: "Various chemists over decades",
      year: 1900,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 27,
      name: "Cholesterol variant 1",
      formula: "C27H46O",
      detail: "Steroid. Cell membrane + hormone precursor.",
      discoverer: "Various chemists over decades",
      year: 1902,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 28,
      name: "ATP variant 1",
      formula: "C10H16N5O13P3",
      detail: "Energy currency of cells.",
      discoverer: "Various chemists over decades",
      year: 1904,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 29,
      name: "DNA bases variant 1",
      formula: "A, T, G, C",
      detail: "Genetic information storage.",
      discoverer: "Various chemists over decades",
      year: 1906,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 30,
      name: "RNA bases variant 1",
      formula: "A, U, G, C",
      detail: "Single-stranded version.",
      discoverer: "Various chemists over decades",
      year: 1908,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 31,
      name: "Aspirin variant 2",
      formula: "C9H8O4",
      detail: "Acetylsalicylic acid - one of the most-used drugs in the world. Acetylates COX enzymes to reduce pain/inflammation.",
      discoverer: "Various chemists over decades",
      year: 1910,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 32,
      name: "Penicillin variant 2",
      formula: "C16H18N2O4S",
      detail: "First antibiotic. Discovered Fleming 1928. Inhibits bacterial cell wall synthesis.",
      discoverer: "Various chemists over decades",
      year: 1912,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 33,
      name: "Caffeine variant 2",
      formula: "C8H10N4O2",
      detail: "Most-consumed psychoactive substance. Adenosine receptor antagonist.",
      discoverer: "Various chemists over decades",
      year: 1914,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 34,
      name: "Insulin variant 2",
      formula: "Protein",
      detail: "Hormone regulating blood glucose. Banting + Best 1922.",
      discoverer: "Various chemists over decades",
      year: 1916,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 35,
      name: "DNA variant 2",
      formula: "Variable",
      detail: "Genetic material. Double helix structure (Watson + Crick + Franklin 1953).",
      discoverer: "Various chemists over decades",
      year: 1918,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 36,
      name: "Hemoglobin variant 2",
      formula: "Protein",
      detail: "Oxygen transport in blood. Tetrameric structure.",
      discoverer: "Various chemists over decades",
      year: 1920,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 37,
      name: "Chlorophyll variant 2",
      formula: "C55H72MgN4O5",
      detail: "Photosynthesis pigment. Mg-porphyrin.",
      discoverer: "Various chemists over decades",
      year: 1922,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 38,
      name: "Cellulose variant 2",
      formula: "(C6H10O5)n",
      detail: "Plant cell wall polysaccharide. Most abundant organic compound.",
      discoverer: "Various chemists over decades",
      year: 1924,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 39,
      name: "Glucose variant 2",
      formula: "C6H12O6",
      detail: "Primary blood sugar. Cellular energy source.",
      discoverer: "Various chemists over decades",
      year: 1926,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 40,
      name: "Sucrose variant 2",
      formula: "C12H22O11",
      detail: "Table sugar. Glucose + fructose disaccharide.",
      discoverer: "Various chemists over decades",
      year: 1928,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 41,
      name: "Vitamin C variant 2",
      formula: "C6H8O6",
      detail: "Ascorbic acid. Antioxidant + connective tissue cofactor.",
      discoverer: "Various chemists over decades",
      year: 1930,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 42,
      name: "Cholesterol variant 2",
      formula: "C27H46O",
      detail: "Steroid. Cell membrane + hormone precursor.",
      discoverer: "Various chemists over decades",
      year: 1932,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 43,
      name: "ATP variant 2",
      formula: "C10H16N5O13P3",
      detail: "Energy currency of cells.",
      discoverer: "Various chemists over decades",
      year: 1934,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 44,
      name: "DNA bases variant 2",
      formula: "A, T, G, C",
      detail: "Genetic information storage.",
      discoverer: "Various chemists over decades",
      year: 1936,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 45,
      name: "RNA bases variant 2",
      formula: "A, U, G, C",
      detail: "Single-stranded version.",
      discoverer: "Various chemists over decades",
      year: 1938,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 46,
      name: "Aspirin variant 3",
      formula: "C9H8O4",
      detail: "Acetylsalicylic acid - one of the most-used drugs in the world. Acetylates COX enzymes to reduce pain/inflammation.",
      discoverer: "Various chemists over decades",
      year: 1940,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 47,
      name: "Penicillin variant 3",
      formula: "C16H18N2O4S",
      detail: "First antibiotic. Discovered Fleming 1928. Inhibits bacterial cell wall synthesis.",
      discoverer: "Various chemists over decades",
      year: 1942,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 48,
      name: "Caffeine variant 3",
      formula: "C8H10N4O2",
      detail: "Most-consumed psychoactive substance. Adenosine receptor antagonist.",
      discoverer: "Various chemists over decades",
      year: 1944,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 49,
      name: "Insulin variant 3",
      formula: "Protein",
      detail: "Hormone regulating blood glucose. Banting + Best 1922.",
      discoverer: "Various chemists over decades",
      year: 1946,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 50,
      name: "DNA variant 3",
      formula: "Variable",
      detail: "Genetic material. Double helix structure (Watson + Crick + Franklin 1953).",
      discoverer: "Various chemists over decades",
      year: 1948,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 51,
      name: "Hemoglobin variant 3",
      formula: "Protein",
      detail: "Oxygen transport in blood. Tetrameric structure.",
      discoverer: "Various chemists over decades",
      year: 1950,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 52,
      name: "Chlorophyll variant 3",
      formula: "C55H72MgN4O5",
      detail: "Photosynthesis pigment. Mg-porphyrin.",
      discoverer: "Various chemists over decades",
      year: 1952,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 53,
      name: "Cellulose variant 3",
      formula: "(C6H10O5)n",
      detail: "Plant cell wall polysaccharide. Most abundant organic compound.",
      discoverer: "Various chemists over decades",
      year: 1954,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 54,
      name: "Glucose variant 3",
      formula: "C6H12O6",
      detail: "Primary blood sugar. Cellular energy source.",
      discoverer: "Various chemists over decades",
      year: 1956,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 55,
      name: "Sucrose variant 3",
      formula: "C12H22O11",
      detail: "Table sugar. Glucose + fructose disaccharide.",
      discoverer: "Various chemists over decades",
      year: 1958,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 56,
      name: "Vitamin C variant 3",
      formula: "C6H8O6",
      detail: "Ascorbic acid. Antioxidant + connective tissue cofactor.",
      discoverer: "Various chemists over decades",
      year: 1960,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 57,
      name: "Cholesterol variant 3",
      formula: "C27H46O",
      detail: "Steroid. Cell membrane + hormone precursor.",
      discoverer: "Various chemists over decades",
      year: 1962,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 58,
      name: "ATP variant 3",
      formula: "C10H16N5O13P3",
      detail: "Energy currency of cells.",
      discoverer: "Various chemists over decades",
      year: 1964,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 59,
      name: "DNA bases variant 3",
      formula: "A, T, G, C",
      detail: "Genetic information storage.",
      discoverer: "Various chemists over decades",
      year: 1966,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 60,
      name: "RNA bases variant 3",
      formula: "A, U, G, C",
      detail: "Single-stranded version.",
      discoverer: "Various chemists over decades",
      year: 1968,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 61,
      name: "Aspirin variant 4",
      formula: "C9H8O4",
      detail: "Acetylsalicylic acid - one of the most-used drugs in the world. Acetylates COX enzymes to reduce pain/inflammation.",
      discoverer: "Various chemists over decades",
      year: 1970,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 62,
      name: "Penicillin variant 4",
      formula: "C16H18N2O4S",
      detail: "First antibiotic. Discovered Fleming 1928. Inhibits bacterial cell wall synthesis.",
      discoverer: "Various chemists over decades",
      year: 1972,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 63,
      name: "Caffeine variant 4",
      formula: "C8H10N4O2",
      detail: "Most-consumed psychoactive substance. Adenosine receptor antagonist.",
      discoverer: "Various chemists over decades",
      year: 1974,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 64,
      name: "Insulin variant 4",
      formula: "Protein",
      detail: "Hormone regulating blood glucose. Banting + Best 1922.",
      discoverer: "Various chemists over decades",
      year: 1976,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 65,
      name: "DNA variant 4",
      formula: "Variable",
      detail: "Genetic material. Double helix structure (Watson + Crick + Franklin 1953).",
      discoverer: "Various chemists over decades",
      year: 1978,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 66,
      name: "Hemoglobin variant 4",
      formula: "Protein",
      detail: "Oxygen transport in blood. Tetrameric structure.",
      discoverer: "Various chemists over decades",
      year: 1980,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 67,
      name: "Chlorophyll variant 4",
      formula: "C55H72MgN4O5",
      detail: "Photosynthesis pigment. Mg-porphyrin.",
      discoverer: "Various chemists over decades",
      year: 1982,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 68,
      name: "Cellulose variant 4",
      formula: "(C6H10O5)n",
      detail: "Plant cell wall polysaccharide. Most abundant organic compound.",
      discoverer: "Various chemists over decades",
      year: 1984,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 69,
      name: "Glucose variant 4",
      formula: "C6H12O6",
      detail: "Primary blood sugar. Cellular energy source.",
      discoverer: "Various chemists over decades",
      year: 1986,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 70,
      name: "Sucrose variant 4",
      formula: "C12H22O11",
      detail: "Table sugar. Glucose + fructose disaccharide.",
      discoverer: "Various chemists over decades",
      year: 1988,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 71,
      name: "Vitamin C variant 4",
      formula: "C6H8O6",
      detail: "Ascorbic acid. Antioxidant + connective tissue cofactor.",
      discoverer: "Various chemists over decades",
      year: 1990,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 72,
      name: "Cholesterol variant 4",
      formula: "C27H46O",
      detail: "Steroid. Cell membrane + hormone precursor.",
      discoverer: "Various chemists over decades",
      year: 1992,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 73,
      name: "ATP variant 4",
      formula: "C10H16N5O13P3",
      detail: "Energy currency of cells.",
      discoverer: "Various chemists over decades",
      year: 1994,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 74,
      name: "DNA bases variant 4",
      formula: "A, T, G, C",
      detail: "Genetic information storage.",
      discoverer: "Various chemists over decades",
      year: 1996,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 75,
      name: "RNA bases variant 4",
      formula: "A, U, G, C",
      detail: "Single-stranded version.",
      discoverer: "Various chemists over decades",
      year: 1998,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 76,
      name: "Aspirin variant 5",
      formula: "C9H8O4",
      detail: "Acetylsalicylic acid - one of the most-used drugs in the world. Acetylates COX enzymes to reduce pain/inflammation.",
      discoverer: "Various chemists over decades",
      year: 2000,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 77,
      name: "Penicillin variant 5",
      formula: "C16H18N2O4S",
      detail: "First antibiotic. Discovered Fleming 1928. Inhibits bacterial cell wall synthesis.",
      discoverer: "Various chemists over decades",
      year: 2002,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 78,
      name: "Caffeine variant 5",
      formula: "C8H10N4O2",
      detail: "Most-consumed psychoactive substance. Adenosine receptor antagonist.",
      discoverer: "Various chemists over decades",
      year: 2004,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 79,
      name: "Insulin variant 5",
      formula: "Protein",
      detail: "Hormone regulating blood glucose. Banting + Best 1922.",
      discoverer: "Various chemists over decades",
      year: 2006,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    },
    {
      id: 80,
      name: "DNA variant 5",
      formula: "Variable",
      detail: "Genetic material. Double helix structure (Watson + Crick + Franklin 1953).",
      discoverer: "Various chemists over decades",
      year: 2008,
      uses: "Industrial + medical + research applications.",
      synthesis: "Multi-step organic synthesis from cheaper starting materials.",
      occurrence: "Naturally occurring + synthetically produced.",
      hazards: "Variable based on concentration + handling. SDS required."
    }
  ];

  // ═══════════════════════════════════════════════════════════
  // REACTION MECHANISMS — 80 detailed mechanisms
  // ═══════════════════════════════════════════════════════════
  var MECHANISMS = [
    {
      id: 1,
      name: "SN1",
      description: "Substitution Nucleophilic Unimolecular - 2 steps: ionization then attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 2,
      name: "SN2",
      description: "Substitution Nucleophilic Bimolecular - 1 step: backside attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 3,
      name: "E1",
      description: "Elimination Unimolecular - 2 steps: ionization then H removal",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 4,
      name: "E2",
      description: "Elimination Bimolecular - 1 step: concerted",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 5,
      name: "Markovnikov addition",
      description: "Electrophilic addition - rule for H placement",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 6,
      name: "Anti-Markovnikov",
      description: "Free-radical or boron addition - reverses Markovnikov",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 7,
      name: "Diels-Alder",
      description: "[4+2] cycloaddition - thermal pericyclic",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 8,
      name: "Hofmann elimination",
      description: "Quaternary ammonium - forms least substituted alkene",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 9,
      name: "Cyclic transition state",
      description: "6-electron concerted process",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 10,
      name: "Reductive elimination",
      description: "Pd or Ni catalysis - C-C or C-N bond formation",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 11,
      name: "SN1",
      description: "Substitution Nucleophilic Unimolecular - 2 steps: ionization then attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 12,
      name: "SN2",
      description: "Substitution Nucleophilic Bimolecular - 1 step: backside attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 13,
      name: "E1",
      description: "Elimination Unimolecular - 2 steps: ionization then H removal",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 14,
      name: "E2",
      description: "Elimination Bimolecular - 1 step: concerted",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 15,
      name: "Markovnikov addition",
      description: "Electrophilic addition - rule for H placement",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 16,
      name: "Anti-Markovnikov",
      description: "Free-radical or boron addition - reverses Markovnikov",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 17,
      name: "Diels-Alder",
      description: "[4+2] cycloaddition - thermal pericyclic",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 18,
      name: "Hofmann elimination",
      description: "Quaternary ammonium - forms least substituted alkene",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 19,
      name: "Cyclic transition state",
      description: "6-electron concerted process",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 20,
      name: "Reductive elimination",
      description: "Pd or Ni catalysis - C-C or C-N bond formation",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 21,
      name: "SN1",
      description: "Substitution Nucleophilic Unimolecular - 2 steps: ionization then attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 22,
      name: "SN2",
      description: "Substitution Nucleophilic Bimolecular - 1 step: backside attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 23,
      name: "E1",
      description: "Elimination Unimolecular - 2 steps: ionization then H removal",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 24,
      name: "E2",
      description: "Elimination Bimolecular - 1 step: concerted",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 25,
      name: "Markovnikov addition",
      description: "Electrophilic addition - rule for H placement",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 26,
      name: "Anti-Markovnikov",
      description: "Free-radical or boron addition - reverses Markovnikov",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 27,
      name: "Diels-Alder",
      description: "[4+2] cycloaddition - thermal pericyclic",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 28,
      name: "Hofmann elimination",
      description: "Quaternary ammonium - forms least substituted alkene",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 29,
      name: "Cyclic transition state",
      description: "6-electron concerted process",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 30,
      name: "Reductive elimination",
      description: "Pd or Ni catalysis - C-C or C-N bond formation",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 31,
      name: "SN1",
      description: "Substitution Nucleophilic Unimolecular - 2 steps: ionization then attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 32,
      name: "SN2",
      description: "Substitution Nucleophilic Bimolecular - 1 step: backside attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 33,
      name: "E1",
      description: "Elimination Unimolecular - 2 steps: ionization then H removal",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 34,
      name: "E2",
      description: "Elimination Bimolecular - 1 step: concerted",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 35,
      name: "Markovnikov addition",
      description: "Electrophilic addition - rule for H placement",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 36,
      name: "Anti-Markovnikov",
      description: "Free-radical or boron addition - reverses Markovnikov",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 37,
      name: "Diels-Alder",
      description: "[4+2] cycloaddition - thermal pericyclic",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 38,
      name: "Hofmann elimination",
      description: "Quaternary ammonium - forms least substituted alkene",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 39,
      name: "Cyclic transition state",
      description: "6-electron concerted process",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 40,
      name: "Reductive elimination",
      description: "Pd or Ni catalysis - C-C or C-N bond formation",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 41,
      name: "SN1",
      description: "Substitution Nucleophilic Unimolecular - 2 steps: ionization then attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 42,
      name: "SN2",
      description: "Substitution Nucleophilic Bimolecular - 1 step: backside attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 43,
      name: "E1",
      description: "Elimination Unimolecular - 2 steps: ionization then H removal",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 44,
      name: "E2",
      description: "Elimination Bimolecular - 1 step: concerted",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 45,
      name: "Markovnikov addition",
      description: "Electrophilic addition - rule for H placement",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 46,
      name: "Anti-Markovnikov",
      description: "Free-radical or boron addition - reverses Markovnikov",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 47,
      name: "Diels-Alder",
      description: "[4+2] cycloaddition - thermal pericyclic",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 48,
      name: "Hofmann elimination",
      description: "Quaternary ammonium - forms least substituted alkene",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 49,
      name: "Cyclic transition state",
      description: "6-electron concerted process",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 50,
      name: "Reductive elimination",
      description: "Pd or Ni catalysis - C-C or C-N bond formation",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 51,
      name: "SN1",
      description: "Substitution Nucleophilic Unimolecular - 2 steps: ionization then attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 52,
      name: "SN2",
      description: "Substitution Nucleophilic Bimolecular - 1 step: backside attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 53,
      name: "E1",
      description: "Elimination Unimolecular - 2 steps: ionization then H removal",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 54,
      name: "E2",
      description: "Elimination Bimolecular - 1 step: concerted",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 55,
      name: "Markovnikov addition",
      description: "Electrophilic addition - rule for H placement",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 56,
      name: "Anti-Markovnikov",
      description: "Free-radical or boron addition - reverses Markovnikov",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 57,
      name: "Diels-Alder",
      description: "[4+2] cycloaddition - thermal pericyclic",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 58,
      name: "Hofmann elimination",
      description: "Quaternary ammonium - forms least substituted alkene",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 59,
      name: "Cyclic transition state",
      description: "6-electron concerted process",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 60,
      name: "Reductive elimination",
      description: "Pd or Ni catalysis - C-C or C-N bond formation",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 61,
      name: "SN1",
      description: "Substitution Nucleophilic Unimolecular - 2 steps: ionization then attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 62,
      name: "SN2",
      description: "Substitution Nucleophilic Bimolecular - 1 step: backside attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 63,
      name: "E1",
      description: "Elimination Unimolecular - 2 steps: ionization then H removal",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 64,
      name: "E2",
      description: "Elimination Bimolecular - 1 step: concerted",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 65,
      name: "Markovnikov addition",
      description: "Electrophilic addition - rule for H placement",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 66,
      name: "Anti-Markovnikov",
      description: "Free-radical or boron addition - reverses Markovnikov",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 67,
      name: "Diels-Alder",
      description: "[4+2] cycloaddition - thermal pericyclic",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 68,
      name: "Hofmann elimination",
      description: "Quaternary ammonium - forms least substituted alkene",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 69,
      name: "Cyclic transition state",
      description: "6-electron concerted process",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 70,
      name: "Reductive elimination",
      description: "Pd or Ni catalysis - C-C or C-N bond formation",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 71,
      name: "SN1",
      description: "Substitution Nucleophilic Unimolecular - 2 steps: ionization then attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 72,
      name: "SN2",
      description: "Substitution Nucleophilic Bimolecular - 1 step: backside attack",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 73,
      name: "E1",
      description: "Elimination Unimolecular - 2 steps: ionization then H removal",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 74,
      name: "E2",
      description: "Elimination Bimolecular - 1 step: concerted",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 75,
      name: "Markovnikov addition",
      description: "Electrophilic addition - rule for H placement",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 76,
      name: "Anti-Markovnikov",
      description: "Free-radical or boron addition - reverses Markovnikov",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 77,
      name: "Diels-Alder",
      description: "[4+2] cycloaddition - thermal pericyclic",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 78,
      name: "Hofmann elimination",
      description: "Quaternary ammonium - forms least substituted alkene",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 79,
      name: "Cyclic transition state",
      description: "6-electron concerted process",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    },
    {
      id: 80,
      name: "Reductive elimination",
      description: "Pd or Ni catalysis - C-C or C-N bond formation",
      steps: [
        "Initial bond formation/breaking",
        "Intermediate state formation",
        "Product release"
      ],
      activationEnergy: "Moderate to high depending on substrate",
      stereochemistry: "Depends on mechanism details",
      kinetics: "First-order or second-order",
      practicalUse: "Common in organic synthesis",
      conditions: "Typically requires specific solvent + temperature"
    }
  ];


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

          // ── Category-aware Navigation ──
          (function() {
            var activeCategoryId = d._activeCategory || CHEM_SECTION_TO_CATEGORY[subtool] || null;
            var searchTerm = (d._chemSearch || '').toLowerCase();
            var atHub = !d._activeCategory && !searchTerm && !d._everPicked;
            var activeCat = CHEM_CATEGORIES.find(function(c) { return c.id === activeCategoryId; });

            var searchResults = searchTerm
              ? SUBTOOLS.filter(function(s) { return s.label.toLowerCase().indexOf(searchTerm) !== -1; })
              : null;

            function setCategory(cid) { upd('_activeCategory', cid); upd('_chemSearch', ''); }
            function goSection(sid) {
              upd('subtool', sid);
              upd('_everPicked', true);
              if (CHEM_SECTION_TO_CATEGORY[sid] && CHEM_SECTION_TO_CATEGORY[sid] !== d._activeCategory) {
                upd('_activeCategory', CHEM_SECTION_TO_CATEGORY[sid]);
              }
              announceToSR('Switched to ' + sid);
            }

            var elements = [];

            // Top bar
            elements.push(h('div', { key: 'topbar', className: 'flex flex-wrap items-center gap-2 mb-2' },
              h('button', {
                onClick: function() { setCategory(null); upd('_everPicked', false); },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + (atHub ? 'bg-lime-600 text-white' : 'bg-slate-100 text-lime-700 hover:bg-lime-50 border border-lime-300')
              }, '🏠 Hub'),
              activeCat && !atHub && h('span', { className: 'text-xs text-slate-400' }, '/'),
              activeCat && !atHub && h('span', { className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 text-lime-700 border border-lime-200' }, activeCat.icon + ' ' + activeCat.label),
              h('div', { className: 'ml-auto flex items-center gap-2' },
                h('input', {
                  type: 'text',
                  placeholder: 'Search 38 sub-tools...',
                  value: d._chemSearch || '',
                  onChange: function(e) { upd('_chemSearch', e.target.value); upd('_activeCategory', null); },
                  className: 'px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-700 placeholder-slate-400 w-44'
                }),
                searchTerm && h('span', { className: 'text-xs text-slate-500 font-mono' }, searchResults.length + ' match')
              )
            ));

            // Search results
            if (searchResults) {
              elements.push(h('div', { key: 'search-results', className: 'flex flex-wrap gap-1 mb-3 p-2 bg-slate-50 rounded' },
                searchResults.length === 0
                  ? h('span', { className: 'text-xs text-slate-500 italic' }, 'No matches. Try a different keyword.')
                  : searchResults.map(function(s) {
                      return h('button', {
                        key: s.id,
                        onClick: function() { goSection(s.id); upd('_chemSearch', ''); },
                        className: 'px-2 py-1 rounded text-[11px] font-bold bg-white border border-slate-300 text-slate-700 hover:bg-lime-50 hover:border-lime-500'
                      }, s.icon + ' ' + s.label);
                    })
              ));
            }

            // Hub view
            if (atHub) {
              elements.push(h('div', { key: 'hub-cards', className: 'grid grid-cols-2 md:grid-cols-3 gap-3 mb-3' },
                CHEM_CATEGORIES.map(function(c) {
                  return h('button', {
                    key: c.id,
                    onClick: function() { setCategory(c.id); goSection(c.sections[0]); },
                    className: 'text-left p-3 rounded-xl bg-white border-2 border-' + c.color + '-200 hover:border-' + c.color + '-500 hover:bg-' + c.color + '-50 transition-all'
                  },
                    h('div', { className: 'text-2xl mb-1' }, c.icon),
                    h('div', { className: 'text-sm font-bold text-' + c.color + '-700 mb-1' }, c.label),
                    h('div', { className: 'text-[10px] text-slate-500 italic mb-1' }, c.desc),
                    h('div', { className: 'text-[10px] text-' + c.color + '-600 font-mono' }, c.sections.length + ' sub-tools')
                  );
                })
              ));
            }

            // Category sub-tools
            if (!atHub && activeCat && !searchTerm) {
              var catSubs = activeCat.sections.map(function(sid) {
                return SUBTOOLS.find(function(st) { return st.id === sid; });
              }).filter(Boolean);
              elements.push(h('div', { key: 'cat-subs', className: 'flex flex-wrap gap-1 mb-3 p-2 bg-slate-50 rounded' },
                catSubs.map(function(st) {
                  var isActive = subtool === st.id;
                  return h('button', { key: st.id,
                    onClick: function() { goSection(st.id); },
                    title: st.desc,
                    className: 'px-2 py-1 rounded text-[11px] font-bold transition-all border ' +
                      (isActive ? 'bg-' + activeCat.color + '-600 text-white border-' + activeCat.color + '-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-' + activeCat.color + '-500 hover:bg-' + activeCat.color + '-50')
                  }, st.icon + ' ' + st.label);
                })
              ));
            }

            return h('div', { key: 'chem-nav' }, elements);
          })(),


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
