// stem_tool_molecule.js — Molecule & Periodic Table Lab v2.0
// Standalone enhanced module extracted from monolith (ES5)
(function() {
'use strict';

// StemLab guard
window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, cfg) { cfg.id = id; cfg.ready = cfg.ready !== false; this._registry[id] = cfg; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var t = this._registry[id]; return t && t.render ? t.render(ctx) : null; }
};
if (window.StemLab.isRegistered && window.StemLab.isRegistered('molecule')) return;

// ═══ SOUND EFFECTS ═══
var _audioCtx = null;
function getAudioCtx() { if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return _audioCtx; }

function playSound(type) {
  var ac = getAudioCtx(); if (!ac) return;
  var o = ac.createOscillator(); var g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  var now = ac.currentTime;
  var configs = {
    addAtom: { freq: 520, type: 'sine', dur: 0.12, vol: 0.15 },
    removeAtom: { freq: 320, type: 'triangle', dur: 0.15, vol: 0.12 },
    bondCreate: { freq: 660, type: 'sine', dur: 0.1, vol: 0.15 },
    bondCycle: { freq: 440, type: 'square', dur: 0.08, vol: 0.1 },
    craftSuccess: { freq: 880, type: 'sine', dur: 0.3, vol: 0.2 },
    craftFail: { freq: 260, type: 'sawtooth', dur: 0.25, vol: 0.12 },
    correct: { freq: 784, type: 'sine', dur: 0.2, vol: 0.18 },
    wrong: { freq: 220, type: 'sawtooth', dur: 0.3, vol: 0.12 },
    selectElement: { freq: 600, type: 'sine', dur: 0.08, vol: 0.1 },
    viewerSelect: { freq: 500, type: 'triangle', dur: 0.1, vol: 0.12 },
    badge: { freq: 988, type: 'sine', dur: 0.4, vol: 0.2 },
    challenge: { freq: 698, type: 'triangle', dur: 0.15, vol: 0.15 }
  };
  var c = configs[type] || configs.addAtom;
  o.type = c.type; o.frequency.setValueAtTime(c.freq, now);
  g.gain.setValueAtTime(c.vol, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + c.dur);
  o.start(now); o.stop(now + c.dur);
  if (type === 'badge' || type === 'craftSuccess') {
    var o2 = ac.createOscillator(); var g2 = ac.createGain();
    o2.connect(g2); g2.connect(ac.destination);
    o2.type = 'sine'; o2.frequency.setValueAtTime(c.freq * 1.25, now + 0.12);
    g2.gain.setValueAtTime(c.vol * 0.8, now + 0.12);
    g2.gain.exponentialRampToValueAtTime(0.001, now + c.dur + 0.1);
    o2.start(now + 0.12); o2.stop(now + c.dur + 0.15);
  }
}

// ═══ GRADE BAND ═══
function getGradeBand(ctx) {
  var g = ctx.gradeLevel || 5;
  if (g <= 2) return 'k2';
  if (g <= 5) return 'g35';
  if (g <= 8) return 'g68';
  return 'g912';
}
function gradeText(k2, g35, g68, g912) {
  return function(band) {
    if (band === 'k2') return k2;
    if (band === 'g35') return g35;
    if (band === 'g68') return g68;
    return g912;
  };
}

// ═══ BADGE DEFINITIONS ═══
var BADGES = [
  { id: 'firstCompound', icon: '\uD83E\uDDEA', label: 'First Compound', desc: 'Craft your first compound' },
  { id: 'collector10', icon: '\uD83D\uDCDA', label: 'Compound Collector', desc: 'Discover 10 different compounds' },
  { id: 'collector20', icon: '\uD83C\uDFC6', label: 'Compound Master', desc: 'Discover 20 different compounds' },
  { id: 'moleculeArchitect', icon: '\uD83C\uDFD7\uFE0F', label: 'Molecule Architect', desc: 'Build 5 molecules in Build mode' },
  { id: 'periodicExplorer', icon: '\uD83D\uDD2C', label: 'Periodic Explorer', desc: 'View 20 different elements' },
  { id: 'quizWhiz', icon: '\uD83E\uDDE0', label: 'Quiz Whiz', desc: 'Answer 5 quiz questions correctly' },
  { id: 'quizStreak3', icon: '\uD83D\uDD25', label: 'Hot Streak', desc: 'Get 3 quiz answers correct in a row' },
  { id: 'allCategories', icon: '\uD83C\uDF08', label: 'Category Explorer', desc: 'View elements from all 10 categories' },
  { id: 'bondMaster', icon: '\uD83D\uDD17', label: 'Bond Master', desc: 'Create single, double, and triple bonds' },
  { id: 'challengeChamp', icon: '\uD83C\uDFAF', label: 'Challenge Champ', desc: 'Complete 3 random build challenges' },
  { id: 'viewerPro', icon: '\uD83D\uDC40', label: 'Viewer Pro', desc: 'View 15 different molecule presets' },
  { id: 'aiScholar', icon: '\uD83E\uDD16', label: 'AI Scholar', desc: 'Ask the AI tutor 3 questions' }
];

// Register tool
window.StemLab.registerTool('molecule', {
  icon: '\uD83E\uDDEA',
  label: 'Molecule & Periodic Table',
  desc: 'Explore elements, build molecules, craft compounds, and master the periodic table',
  color: '#6366f1',
  category: 'science',
  render: function(ctx) {
    var React = ctx.React;
    var h = React.createElement;
    var labToolData = ctx.toolData;
    var setLabToolData = ctx.setToolData;
    var addToast = ctx.addToast;
    var awardStemXP = ctx.awardXP;
    var callGemini = ctx.callGemini;
    var callTTS = ctx.callTTS;
    var announceToSR = ctx.announceToSR;
    var gradeLevel = ctx.gradeLevel;
    var setStemLabTool = ctx.setStemLabTool;
    var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;

    // ── Data arrays ──

    // ── 118 Elements ──
    var ELEMENTS = [
      { n: 1, s: 'H', name: 'Hydrogen', cat: 'nonmetal', c: '#60a5fa' },
      { n: 2, s: 'He', name: 'Helium', cat: 'noble', c: '#c084fc' },
      { n: 3, s: 'Li', name: 'Lithium', cat: 'alkali', c: '#f87171' },
      { n: 4, s: 'Be', name: 'Beryllium', cat: 'alkaline', c: '#fbbf24' },
      { n: 5, s: 'B', name: 'Boron', cat: 'metalloid', c: '#34d399' },
      { n: 6, s: 'C', name: 'Carbon', cat: 'nonmetal', c: '#60a5fa' },
      { n: 7, s: 'N', name: 'Nitrogen', cat: 'nonmetal', c: '#60a5fa' },
      { n: 8, s: 'O', name: 'Oxygen', cat: 'nonmetal', c: '#60a5fa' },
      { n: 9, s: 'F', name: 'Fluorine', cat: 'halogen', c: '#2dd4bf' },
      { n: 10, s: 'Ne', name: 'Neon', cat: 'noble', c: '#c084fc' },
      { n: 11, s: 'Na', name: 'Sodium', cat: 'alkali', c: '#f87171' },
      { n: 12, s: 'Mg', name: 'Magnesium', cat: 'alkaline', c: '#fbbf24' },
      { n: 13, s: 'Al', name: 'Aluminum', cat: 'metal', c: '#94a3b8' },
      { n: 14, s: 'Si', name: 'Silicon', cat: 'metalloid', c: '#34d399' },
      { n: 15, s: 'P', name: 'Phosphorus', cat: 'nonmetal', c: '#60a5fa' },
      { n: 16, s: 'S', name: 'Sulfur', cat: 'nonmetal', c: '#60a5fa' },
      { n: 17, s: 'Cl', name: 'Chlorine', cat: 'halogen', c: '#2dd4bf' },
      { n: 18, s: 'Ar', name: 'Argon', cat: 'noble', c: '#c084fc' },
      { n: 19, s: 'K', name: 'Potassium', cat: 'alkali', c: '#f87171' },
      { n: 20, s: 'Ca', name: 'Calcium', cat: 'alkaline', c: '#fbbf24' },
      { n: 21, s: 'Sc', name: 'Scandium', cat: 'transition', c: '#fb923c' },
      { n: 22, s: 'Ti', name: 'Titanium', cat: 'transition', c: '#fb923c' },
      { n: 23, s: 'V', name: 'Vanadium', cat: 'transition', c: '#fb923c' },
      { n: 24, s: 'Cr', name: 'Chromium', cat: 'transition', c: '#fb923c' },
      { n: 25, s: 'Mn', name: 'Manganese', cat: 'transition', c: '#fb923c' },
      { n: 26, s: 'Fe', name: 'Iron', cat: 'transition', c: '#fb923c' },
      { n: 27, s: 'Co', name: 'Cobalt', cat: 'transition', c: '#fb923c' },
      { n: 28, s: 'Ni', name: 'Nickel', cat: 'transition', c: '#fb923c' },
      { n: 29, s: 'Cu', name: 'Copper', cat: 'transition', c: '#fb923c' },
      { n: 30, s: 'Zn', name: 'Zinc', cat: 'transition', c: '#fb923c' },
      { n: 31, s: 'Ga', name: 'Gallium', cat: 'metal', c: '#94a3b8' },
      { n: 32, s: 'Ge', name: 'Germanium', cat: 'metalloid', c: '#34d399' },
      { n: 33, s: 'As', name: 'Arsenic', cat: 'metalloid', c: '#34d399' },
      { n: 34, s: 'Se', name: 'Selenium', cat: 'nonmetal', c: '#60a5fa' },
      { n: 35, s: 'Br', name: 'Bromine', cat: 'halogen', c: '#2dd4bf' },
      { n: 36, s: 'Kr', name: 'Krypton', cat: 'noble', c: '#c084fc' },
      { n: 37, s: 'Rb', name: 'Rubidium', cat: 'alkali', c: '#f87171' },
      { n: 38, s: 'Sr', name: 'Strontium', cat: 'alkaline', c: '#fbbf24' },
      { n: 39, s: 'Y', name: 'Yttrium', cat: 'transition', c: '#fb923c' },
      { n: 40, s: 'Zr', name: 'Zirconium', cat: 'transition', c: '#fb923c' },
      { n: 41, s: 'Nb', name: 'Niobium', cat: 'transition', c: '#fb923c' },
      { n: 42, s: 'Mo', name: 'Molybdenum', cat: 'transition', c: '#fb923c' },
      { n: 43, s: 'Tc', name: 'Technetium', cat: 'transition', c: '#fb923c' },
      { n: 44, s: 'Ru', name: 'Ruthenium', cat: 'transition', c: '#fb923c' },
      { n: 45, s: 'Rh', name: 'Rhodium', cat: 'transition', c: '#fb923c' },
      { n: 46, s: 'Pd', name: 'Palladium', cat: 'transition', c: '#fb923c' },
      { n: 47, s: 'Ag', name: 'Silver', cat: 'transition', c: '#fb923c' },
      { n: 48, s: 'Cd', name: 'Cadmium', cat: 'transition', c: '#fb923c' },
      { n: 49, s: 'In', name: 'Indium', cat: 'metal', c: '#94a3b8' },
      { n: 50, s: 'Sn', name: 'Tin', cat: 'metal', c: '#94a3b8' },
      { n: 51, s: 'Sb', name: 'Antimony', cat: 'metalloid', c: '#34d399' },
      { n: 52, s: 'Te', name: 'Tellurium', cat: 'metalloid', c: '#34d399' },
      { n: 53, s: 'I', name: 'Iodine', cat: 'halogen', c: '#2dd4bf' },
      { n: 54, s: 'Xe', name: 'Xenon', cat: 'noble', c: '#c084fc' },
      { n: 55, s: 'Cs', name: 'Cesium', cat: 'alkali', c: '#f87171' },
      { n: 56, s: 'Ba', name: 'Barium', cat: 'alkaline', c: '#fbbf24' },
      { n: 57, s: 'La', name: 'Lanthanum', cat: 'lanthanide', c: '#a78bfa' },
      { n: 58, s: 'Ce', name: 'Cerium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 59, s: 'Pr', name: 'Praseodymium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 60, s: 'Nd', name: 'Neodymium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 61, s: 'Pm', name: 'Promethium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 62, s: 'Sm', name: 'Samarium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 63, s: 'Eu', name: 'Europium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 64, s: 'Gd', name: 'Gadolinium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 65, s: 'Tb', name: 'Terbium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 66, s: 'Dy', name: 'Dysprosium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 67, s: 'Ho', name: 'Holmium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 68, s: 'Er', name: 'Erbium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 69, s: 'Tm', name: 'Thulium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 70, s: 'Yb', name: 'Ytterbium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 71, s: 'Lu', name: 'Lutetium', cat: 'lanthanide', c: '#a78bfa' },
      { n: 72, s: 'Hf', name: 'Hafnium', cat: 'transition', c: '#fb923c' },
      { n: 73, s: 'Ta', name: 'Tantalum', cat: 'transition', c: '#fb923c' },
      { n: 74, s: 'W', name: 'Tungsten', cat: 'transition', c: '#fb923c' },
      { n: 75, s: 'Re', name: 'Rhenium', cat: 'transition', c: '#fb923c' },
      { n: 76, s: 'Os', name: 'Osmium', cat: 'transition', c: '#fb923c' },
      { n: 77, s: 'Ir', name: 'Iridium', cat: 'transition', c: '#fb923c' },
      { n: 78, s: 'Pt', name: 'Platinum', cat: 'transition', c: '#fb923c' },
      { n: 79, s: 'Au', name: 'Gold', cat: 'transition', c: '#fb923c' },
      { n: 80, s: 'Hg', name: 'Mercury', cat: 'transition', c: '#fb923c' },
      { n: 81, s: 'Tl', name: 'Thallium', cat: 'metal', c: '#94a3b8' },
      { n: 82, s: 'Pb', name: 'Lead', cat: 'metal', c: '#94a3b8' },
      { n: 83, s: 'Bi', name: 'Bismuth', cat: 'metal', c: '#94a3b8' },
      { n: 84, s: 'Po', name: 'Polonium', cat: 'metalloid', c: '#34d399' },
      { n: 85, s: 'At', name: 'Astatine', cat: 'halogen', c: '#2dd4bf' },
      { n: 86, s: 'Rn', name: 'Radon', cat: 'noble', c: '#c084fc' },
      { n: 87, s: 'Fr', name: 'Francium', cat: 'alkali', c: '#f87171' },
      { n: 88, s: 'Ra', name: 'Radium', cat: 'alkaline', c: '#fbbf24' },
      { n: 89, s: 'Ac', name: 'Actinium', cat: 'actinide', c: '#f472b6' },
      { n: 90, s: 'Th', name: 'Thorium', cat: 'actinide', c: '#f472b6' },
      { n: 91, s: 'Pa', name: 'Protactinium', cat: 'actinide', c: '#f472b6' },
      { n: 92, s: 'U', name: 'Uranium', cat: 'actinide', c: '#f472b6' },
      { n: 93, s: 'Np', name: 'Neptunium', cat: 'actinide', c: '#f472b6' },
      { n: 94, s: 'Pu', name: 'Plutonium', cat: 'actinide', c: '#f472b6' },
      { n: 95, s: 'Am', name: 'Americium', cat: 'actinide', c: '#f472b6' },
      { n: 96, s: 'Cm', name: 'Curium', cat: 'actinide', c: '#f472b6' },
      { n: 97, s: 'Bk', name: 'Berkelium', cat: 'actinide', c: '#f472b6' },
      { n: 98, s: 'Cf', name: 'Californium', cat: 'actinide', c: '#f472b6' },
      { n: 99, s: 'Es', name: 'Einsteinium', cat: 'actinide', c: '#f472b6' },
      { n: 100, s: 'Fm', name: 'Fermium', cat: 'actinide', c: '#f472b6' },
      { n: 101, s: 'Md', name: 'Mendelevium', cat: 'actinide', c: '#f472b6' },
      { n: 102, s: 'No', name: 'Nobelium', cat: 'actinide', c: '#f472b6' },
      { n: 103, s: 'Lr', name: 'Lawrencium', cat: 'actinide', c: '#f472b6' },
      { n: 104, s: 'Rf', name: 'Rutherfordium', cat: 'transition', c: '#fb923c' },
      { n: 105, s: 'Db', name: 'Dubnium', cat: 'transition', c: '#fb923c' },
      { n: 106, s: 'Sg', name: 'Seaborgium', cat: 'transition', c: '#fb923c' },
      { n: 107, s: 'Bh', name: 'Bohrium', cat: 'transition', c: '#fb923c' },
      { n: 108, s: 'Hs', name: 'Hassium', cat: 'transition', c: '#fb923c' },
      { n: 109, s: 'Mt', name: 'Meitnerium', cat: 'transition', c: '#fb923c' },
      { n: 110, s: 'Ds', name: 'Darmstadtium', cat: 'transition', c: '#fb923c' },
      { n: 111, s: 'Rg', name: 'Roentgenium', cat: 'transition', c: '#fb923c' },
      { n: 112, s: 'Cn', name: 'Copernicium', cat: 'transition', c: '#fb923c' },
      { n: 113, s: 'Nh', name: 'Nihonium', cat: 'metal', c: '#94a3b8' },
      { n: 114, s: 'Fl', name: 'Flerovium', cat: 'metal', c: '#94a3b8' },
      { n: 115, s: 'Mc', name: 'Moscovium', cat: 'metal', c: '#94a3b8' },
      { n: 116, s: 'Lv', name: 'Livermorium', cat: 'metal', c: '#94a3b8' },
      { n: 117, s: 'Ts', name: 'Tennessine', cat: 'halogen', c: '#2dd4bf' },
      { n: 118, s: 'Og', name: 'Oganesson', cat: 'noble', c: '#c084fc' }
    ];

    // ── Element Details ──
    var ELEMENT_DETAILS = {
      H: { desc: 'Lightest element; fuels stars via nuclear fusion', uses: ['Fuel cells', 'Rocket propellant', 'Ammonia production'], compounds: ['H2O (Water)', 'HCl (Hydrochloric Acid)', 'NH3 (Ammonia)', 'CH4 (Methane)'] },
      He: { desc: 'Inert noble gas; 2nd most abundant element in the universe', uses: ['Balloons & blimps', 'MRI coolant', 'Deep-sea diving gas'], compounds: ['None (noble gas - does not form compounds)'] },
      Li: { desc: 'Lightest metal; soft enough to cut with a knife', uses: ['Rechargeable batteries', 'Mood-stabilizing medication', 'Ceramics & glass'], compounds: ['LiOH (Lithium Hydroxide)', 'Li2CO3 (Lithium Carbonate)'] },
      Be: { desc: 'Rare toxic metal that is exceptionally lightweight and strong', uses: ['Aerospace alloys', 'X-ray windows', 'Satellite components'], compounds: ['BeO (Beryllium Oxide)'] },
      B: { desc: 'Metalloid essential for plant growth and industrial materials', uses: ['Borosilicate glass (Pyrex)', 'Cleaning products (borax)', 'Semiconductors'], compounds: ['B2O3 (Boron Trioxide)', 'H3BO3 (Boric Acid)'] },
      C: { desc: 'Basis of all known life; forms more compounds than any other element', uses: ['Steel production', 'Graphite pencils', 'Carbon fiber composites'], compounds: ['CO2 (Carbon Dioxide)', 'CH4 (Methane)', 'C6H12O6 (Glucose)', 'CaCO3 (Limestone)'] },
      N: { desc: 'Makes up 78% of Earth\'s atmosphere', uses: ['Fertilizers', 'Explosives (TNT)', 'Food preservation'], compounds: ['NH3 (Ammonia)', 'NO2 (Nitrogen Dioxide)', 'N2O (Laughing Gas)', 'HNO3 (Nitric Acid)'] },
      O: { desc: 'Essential for respiration; most abundant element in Earth\'s crust', uses: ['Medical oxygen', 'Welding & cutting', 'Water purification'], compounds: ['H2O (Water)', 'CO2 (Carbon Dioxide)', 'Fe2O3 (Rust)', 'O3 (Ozone)'] },
      F: { desc: 'Most reactive and electronegative element', uses: ['Toothpaste (fluoride)', 'Teflon coatings', 'Refrigerants'], compounds: ['HF (Hydrofluoric Acid)', 'NaF (Sodium Fluoride)', 'CF4 (Carbon Tetrafluoride)'] },
      Ne: { desc: 'Produces iconic reddish-orange glow in discharge tubes', uses: ['Neon signs', 'High-voltage indicators', 'Laser technology'], compounds: ['None (noble gas)'] },
      Na: { desc: 'Soft silvery metal that reacts violently with water', uses: ['Table salt (NaCl)', 'Street lighting', 'Baking soda'], compounds: ['NaCl (Table Salt)', 'NaOH (Lye)', 'NaHCO3 (Baking Soda)', 'Na2CO3 (Washing Soda)'] },
      Mg: { desc: 'Lightweight metal that burns with a brilliant white flame', uses: ['Alloy wheels', 'Fireworks & flares', 'Antacid tablets'], compounds: ['MgO (Magnesium Oxide)', 'MgSO4 (Epsom Salt)', 'Mg(OH)2 (Milk of Magnesia)'] },
      Al: { desc: 'Most abundant metal in Earth\'s crust', uses: ['Cans & foil', 'Aircraft frames', 'Window frames'], compounds: ['Al2O3 (Alumina)', 'AlCl3 (Aluminum Chloride)'] },
      Si: { desc: 'Semiconductor that powers the digital world', uses: ['Computer chips', 'Solar panels', 'Glass & concrete'], compounds: ['SiO2 (Sand/Quartz)', 'SiC (Silicon Carbide)'] },
      P: { desc: 'Essential for DNA and bones; comes in white and red forms', uses: ['Fertilizers', 'Matches', 'Detergents'], compounds: ['H3PO4 (Phosphoric Acid)', 'Ca3(PO4)2 (Bone mineral)'] },
      S: { desc: 'Yellow element with distinctive rotten-egg smell in compounds', uses: ['Vulcanizing rubber', 'Sulfuric acid production', 'Gunpowder'], compounds: ['H2SO4 (Sulfuric Acid)', 'SO2 (Sulfur Dioxide)', 'H2S (Hydrogen Sulfide)'] },
      Cl: { desc: 'Greenish-yellow gas used to purify drinking water', uses: ['Water treatment', 'PVC plastic', 'Bleach & disinfectants'], compounds: ['NaCl (Table Salt)', 'HCl (Hydrochloric Acid)', 'NaOCl (Bleach)'] },
      Ar: { desc: 'Third most abundant gas in the atmosphere', uses: ['Welding shield gas', 'Light bulb filling', 'Window insulation'], compounds: ['None (noble gas)'] },
      K: { desc: 'Essential nutrient found in bananas and many foods', uses: ['Fertilizers (potash)', 'Soap making', 'Food preservation'], compounds: ['KCl (Potassium Chloride)', 'KOH (Potassium Hydroxide)', 'KNO3 (Saltpeter)'] },
      Ca: { desc: 'Builds bones and teeth; 5th most abundant element in Earth\'s crust', uses: ['Cement & concrete', 'Chalk & plaster', 'Dietary supplement'], compounds: ['CaCO3 (Limestone/Chalk)', 'CaO (Quicklime)', 'Ca(OH)2 (Slaked Lime)', 'CaSO4 (Gypsum)'] },
      Fe: { desc: 'Most used metal; core of the Earth is mostly iron', uses: ['Steel construction', 'Cast iron cookware', 'Magnetic devices'], compounds: ['Fe2O3 (Rust)', 'FeSO4 (Iron Supplement)', 'Fe3O4 (Magnetite)'] },
      Cu: { desc: 'Reddish metal used since the Bronze Age for tools and art', uses: ['Electrical wiring', 'Plumbing pipes', 'Coins'], compounds: ['CuSO4 (Blue Vitriol)', 'CuO (Copper Oxide)', 'Cu2O (Cuprous Oxide)'] },
      Zn: { desc: 'Bluish-white metal that prevents rust via galvanization', uses: ['Galvanizing steel', 'Batteries', 'Sunscreen (zinc oxide)'], compounds: ['ZnO (Zinc Oxide)', 'ZnS (Zinc Sulfide)', 'ZnCl2 (Zinc Chloride)'] },
      Ag: { desc: 'Best conductor of electricity among all metals', uses: ['Jewelry & silverware', 'Photography', 'Electronics'], compounds: ['AgNO3 (Silver Nitrate)', 'AgCl (Silver Chloride)', 'Ag2O (Silver Oxide)'] },
      Au: { desc: 'Dense, soft, shiny precious metal prized throughout history', uses: ['Jewelry', 'Electronics (connectors)', 'Currency reserves'], compounds: ['AuCl3 (Gold Chloride) - gold rarely forms compounds'] },
      Ti: { desc: 'Strong as steel but 45% lighter; highly corrosion-resistant', uses: ['Aircraft & spacecraft', 'Joint replacements', 'Titanium white paint'], compounds: ['TiO2 (Titanium Dioxide)', 'TiCl4 (Titanium Tetrachloride)'] },
      Cr: { desc: 'Shiny metal that gives rubies their red color', uses: ['Chrome plating', 'Stainless steel', 'Leather tanning'], compounds: ['Cr2O3 (Chromium Oxide)', 'K2Cr2O7 (Potassium Dichromate)'] },
      Mn: { desc: 'Essential for steel production and enzyme function', uses: ['Steel alloys', 'Alkaline batteries', 'Glass decolorizer'], compounds: ['MnO2 (Manganese Dioxide)', 'KMnO4 (Potassium Permanganate)'] },
      Ni: { desc: 'Corrosion-resistant metal used in coins and alloys', uses: ['Stainless steel', 'Rechargeable batteries', 'Coins'], compounds: ['NiO (Nickel Oxide)', 'NiSO4 (Nickel Sulfate)'] },
      Br: { desc: 'Only nonmetal that is liquid at room temperature', uses: ['Flame retardants', 'Photography', 'Water purification'], compounds: ['NaBr (Sodium Bromide)', 'HBr (Hydrobromic Acid)'] },
      I: { desc: 'Essential trace element for thyroid hormone production', uses: ['Antiseptic (tincture)', 'Iodized salt', 'Medical imaging'], compounds: ['KI (Potassium Iodide)', 'HI (Hydroiodic Acid)'] },
      Pt: { desc: 'Precious metal rarer than gold; outstanding catalyst', uses: ['Catalytic converters', 'Jewelry', 'Anti-cancer drugs'], compounds: ['PtCl2 (Platinum Chloride)', 'H2PtCl6 (Chloroplatinic Acid)'] },
      U: { desc: 'Dense radioactive metal that powers nuclear reactors', uses: ['Nuclear power', 'Nuclear weapons', 'Radiation shielding'], compounds: ['UO2 (Uranium Dioxide)', 'UF6 (Uranium Hexafluoride)'] },
      Hg: { desc: 'Only metal that is liquid at room temperature', uses: ['Thermometers (historic)', 'Fluorescent lights', 'Dental amalgams'], compounds: ['HgCl2 (Mercury Chloride)', 'HgO (Mercury Oxide)'] },
      Pb: { desc: 'Dense soft metal once used widely in pipes and paint', uses: ['Car batteries', 'Radiation shielding', 'Solder (lead-free now)'], compounds: ['PbO (Lead Oxide)', 'PbSO4 (Lead Sulfate)'] },
      Sn: { desc: 'Soft silvery metal used since ancient times in bronze', uses: ['Tin cans (coating)', 'Solder', 'Bronze alloy'], compounds: ['SnO2 (Tin Oxide)', 'SnCl2 (Tin Chloride)'] },
      W: { desc: 'Has the highest melting point of any element (3422 C)', uses: ['Light bulb filaments', 'Drill bits & cutting tools', 'Military armor'], compounds: ['WO3 (Tungsten Trioxide)', 'WC (Tungsten Carbide)'] }
    };

    var getElementDetail = function(sym) { return ELEMENT_DETAILS[sym] || null; };

    var getEl = function(sym) {
      for (var i = 0; i < ELEMENTS.length; i++) {
        if (ELEMENTS[i].s === sym) return ELEMENTS[i];
      }
      return null;
    };

    // ── Periodic Table layout (row, col) ──
    var PT_LAYOUT = [
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 7, 8, 9, 10],
      [11, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 14, 15, 16, 17, 18],
      [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
      [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],
      [55, 56, 0, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86],
      [87, 88, 0, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118],
      [],
      [0, 0, 0, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71],
      [0, 0, 0, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103]
    ];

    // ── Compound Recipes ──
    var COMPOUNDS = [
      { name: 'Water', formula: 'H2O', recipe: { H: 2, O: 1 }, desc: 'Essential for life', emoji: '\uD83D\uDCA7' },
      { name: 'Carbon Dioxide', formula: 'CO2', recipe: { C: 1, O: 2 }, desc: 'Greenhouse gas', emoji: '\uD83C\uDF2B\uFE0F' },
      { name: 'Table Salt', formula: 'NaCl', recipe: { Na: 1, Cl: 1 }, desc: 'Sodium chloride', emoji: '\uD83E\uDDC2' },
      { name: 'Ammonia', formula: 'NH3', recipe: { N: 1, H: 3 }, desc: 'Cleaning agent and fertilizer precursor', emoji: '\uD83E\uDDEA' },
      { name: 'Methane', formula: 'CH4', recipe: { C: 1, H: 4 }, desc: 'Natural gas', emoji: '\uD83D\uDD25' },
      { name: 'Hydrogen Peroxide', formula: 'H2O2', recipe: { H: 2, O: 2 }, desc: 'Disinfectant', emoji: '\uD83E\uDE79' },
      { name: 'Ethanol', formula: 'C2H5OH', recipe: { C: 2, H: 6, O: 1 }, desc: 'Alcohol found in beverages', emoji: '\uD83C\uDF7A' },
      { name: 'Sulfuric Acid', formula: 'H2SO4', recipe: { H: 2, S: 1, O: 4 }, desc: 'Battery acid', emoji: '\u26A0\uFE0F' },
      { name: 'Glucose', formula: 'C6H12O6', recipe: { C: 6, H: 12, O: 6 }, desc: 'Blood sugar', emoji: '\uD83C\uDF6C' },
      { name: 'Baking Soda', formula: 'NaHCO3', recipe: { Na: 1, H: 1, C: 1, O: 3 }, desc: 'Sodium bicarbonate', emoji: '\uD83E\uDDC1' },
      { name: 'Calcium Carbonate', formula: 'CaCO3', recipe: { Ca: 1, C: 1, O: 3 }, desc: 'Chalk and marble', emoji: '\uD83E\uDEA8' },
      { name: 'Iron Oxide', formula: 'Fe2O3', recipe: { Fe: 2, O: 3 }, desc: 'Rust', emoji: '\uD83D\uDFE5' },
      { name: 'Sodium Hydroxide', formula: 'NaOH', recipe: { Na: 1, O: 1, H: 1 }, desc: 'Lye / caustic soda', emoji: '\uD83E\uDDEA' },
      { name: 'Hydrochloric Acid', formula: 'HCl', recipe: { H: 1, Cl: 1 }, desc: 'Stomach acid', emoji: '\uD83E\uDE79' },
      { name: 'Acetic Acid', formula: 'CH3COOH', recipe: { C: 2, H: 4, O: 2 }, desc: 'Vinegar', emoji: '\uD83E\uDD4B' },
      { name: 'Nitrogen Dioxide', formula: 'NO2', recipe: { N: 1, O: 2 }, desc: 'Brown smog gas', emoji: '\uD83C\uDF2B\uFE0F' },
      { name: 'Sulfur Dioxide', formula: 'SO2', recipe: { S: 1, O: 2 }, desc: 'Acid rain precursor', emoji: '\uD83C\uDF27\uFE0F' },
      { name: 'Ozone', formula: 'O3', recipe: { O: 3 }, desc: 'UV shield in the stratosphere', emoji: '\uD83D\uDEE1\uFE0F' },
      { name: 'Laughing Gas', formula: 'N2O', recipe: { N: 2, O: 1 }, desc: 'Nitrous oxide anesthetic', emoji: '\uD83D\uDE02' },
      { name: 'Silicon Dioxide', formula: 'SiO2', recipe: { Si: 1, O: 2 }, desc: 'Sand and glass', emoji: '\uD83C\uDFD6\uFE0F' },
      // 15 additional compounds
      { name: 'Potassium Chloride', formula: 'KCl', recipe: { K: 1, Cl: 1 }, desc: 'Salt substitute and fertilizer', emoji: '\uD83E\uDDC2' },
      { name: 'Magnesium Oxide', formula: 'MgO', recipe: { Mg: 1, O: 1 }, desc: 'Refractory material and antacid', emoji: '\uD83D\uDD25' },
      { name: 'Potassium Nitrate', formula: 'KNO3', recipe: { K: 1, N: 1, O: 3 }, desc: 'Saltpeter used in gunpowder', emoji: '\uD83D\uDCA5' },
      { name: 'Copper Sulfate', formula: 'CuSO4', recipe: { Cu: 1, S: 1, O: 4 }, desc: 'Blue vitriol used as fungicide', emoji: '\uD83D\uDD35' },
      { name: 'Carbon Monoxide', formula: 'CO', recipe: { C: 1, O: 1 }, desc: 'Toxic colorless gas', emoji: '\u26A0\uFE0F' },
      { name: 'Methanol', formula: 'CH3OH', recipe: { C: 1, H: 4, O: 1 }, desc: 'Wood alcohol solvent', emoji: '\uD83E\uDDEA' },
      { name: 'Nitric Acid', formula: 'HNO3', recipe: { H: 1, N: 1, O: 3 }, desc: 'Strong acid used in fertilizers', emoji: '\uD83E\uDE79' },
      { name: 'Phosphoric Acid', formula: 'H3PO4', recipe: { H: 3, P: 1, O: 4 }, desc: 'Found in cola drinks', emoji: '\uD83E\uDD64' },
      { name: 'Propane', formula: 'C3H8', recipe: { C: 3, H: 8 }, desc: 'Barbecue and heating fuel', emoji: '\uD83D\uDD25' },
      { name: 'Butane', formula: 'C4H10', recipe: { C: 4, H: 10 }, desc: 'Lighter fluid', emoji: '\uD83D\uDD25' },
      { name: 'Aluminum Oxide', formula: 'Al2O3', recipe: { Al: 2, O: 3 }, desc: 'Alumina used in ceramics and abrasives', emoji: '\uD83E\uDEA8' },
      { name: 'Sodium Carbonate', formula: 'Na2CO3', recipe: { Na: 2, C: 1, O: 3 }, desc: 'Washing soda', emoji: '\uD83E\uDDFC' },
      { name: 'Calcium Hydroxide', formula: 'Ca(OH)2', recipe: { Ca: 1, O: 2, H: 2 }, desc: 'Slaked lime used in construction', emoji: '\uD83C\uDFD7\uFE0F' },
      { name: 'Hydrogen Gas', formula: 'H2', recipe: { H: 2 }, desc: 'Lightest gas; clean fuel source', emoji: '\uD83D\uDCA8' },
      { name: 'Chlorine Gas', formula: 'Cl2', recipe: { Cl: 2 }, desc: 'Disinfectant for water treatment', emoji: '\uD83E\uDDEA' }
    ];

    var getElementCompounds = function(sym) {
      return COMPOUNDS.filter(function(c) {
        var keys = Object.keys(c.recipe);
        for (var i = 0; i < keys.length; i++) {
          if (keys[i] === sym) return true;
        }
        return false;
      });
    };

    // ── Category colors ──
    var catColors = {
      nonmetal: 'bg-blue-100 text-blue-700 border-blue-200',
      noble: 'bg-purple-100 text-purple-700 border-purple-200',
      alkali: 'bg-red-100 text-red-700 border-red-200',
      alkaline: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      transition: 'bg-orange-100 text-orange-700 border-orange-200',
      metal: 'bg-slate-200 text-slate-700 border-slate-300',
      metalloid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      halogen: 'bg-teal-100 text-teal-700 border-teal-200',
      lanthanide: 'bg-violet-100 text-violet-700 border-violet-200',
      actinide: 'bg-pink-100 text-pink-700 border-pink-200'
    };

    // ── Viewer Presets ──
    var viewerPresets = [
      { name: 'H2O (Water)', atoms: [{ el: 'O', x: 200, y: 120, color: '#ef4444' }, { el: 'H', x: 140, y: 190, color: '#60a5fa' }, { el: 'H', x: 260, y: 190, color: '#60a5fa' }], bonds: [[0, 1], [0, 2]], formula: 'H2O' },
      { name: 'CO2 (Carbon Dioxide)', atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'O', x: 120, y: 150, color: '#ef4444' }, { el: 'O', x: 280, y: 150, color: '#ef4444' }], bonds: [[0, 1], [0, 2]], formula: 'CO2' },
      { name: 'CH4 (Methane)', atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'H', x: 200, y: 80, color: '#60a5fa' }, { el: 'H', x: 270, y: 180, color: '#60a5fa' }, { el: 'H', x: 130, y: 180, color: '#60a5fa' }, { el: 'H', x: 200, y: 220, color: '#60a5fa' }], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]], formula: 'CH4' },
      { name: 'NaCl (Table Salt)', atoms: [{ el: 'Na', x: 160, y: 150, color: '#a855f7' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0, 1]], formula: 'NaCl' },
      { name: 'NH3 (Ammonia)', atoms: [{ el: 'N', x: 200, y: 110, color: '#3b82f6' }, { el: 'H', x: 140, y: 185, color: '#94a3b8' }, { el: 'H', x: 200, y: 210, color: '#94a3b8' }, { el: 'H', x: 260, y: 185, color: '#94a3b8' }], bonds: [[0, 1], [0, 2], [0, 3]], formula: 'NH3' },
      { name: 'O2 (Oxygen Gas)', atoms: [{ el: 'O', x: 160, y: 150, color: '#ef4444' }, { el: 'O', x: 240, y: 150, color: '#ef4444' }], bonds: [[0, 1]], formula: 'O2' },
      { name: 'N2 (Nitrogen Gas)', atoms: [{ el: 'N', x: 155, y: 150, color: '#3b82f6' }, { el: 'N', x: 245, y: 150, color: '#3b82f6' }], bonds: [[0, 1]], formula: 'N2' },
      { name: 'H2O2 (Hydrogen Peroxide)', atoms: [{ el: 'O', x: 160, y: 130, color: '#ef4444' }, { el: 'O', x: 240, y: 130, color: '#ef4444' }, { el: 'H', x: 110, y: 190, color: '#60a5fa' }, { el: 'H', x: 290, y: 190, color: '#60a5fa' }], bonds: [[0, 1], [0, 2], [1, 3]], formula: 'H2O2' },
      { name: 'HCl (Hydrochloric Acid)', atoms: [{ el: 'H', x: 160, y: 150, color: '#60a5fa' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0, 1]], formula: 'HCl' },
      { name: 'H2SO4 (Sulfuric Acid)', atoms: [{ el: 'S', x: 200, y: 140, color: '#facc15' }, { el: 'O', x: 130, y: 100, color: '#ef4444' }, { el: 'O', x: 270, y: 100, color: '#ef4444' }, { el: 'O', x: 130, y: 190, color: '#ef4444' }, { el: 'O', x: 270, y: 190, color: '#ef4444' }, { el: 'H', x: 80, y: 210, color: '#60a5fa' }, { el: 'H', x: 320, y: 210, color: '#60a5fa' }], bonds: [[0,1],[0,2],[0,3],[0,4],[3,5],[4,6]], formula: 'H2SO4' },
      { name: 'C2H5OH (Ethanol)', atoms: [{ el: 'C', x: 150, y: 140, color: '#1e293b' }, { el: 'C', x: 230, y: 140, color: '#1e293b' }, { el: 'O', x: 300, y: 140, color: '#ef4444' }, { el: 'H', x: 320, y: 200, color: '#60a5fa' }, { el: 'H', x: 110, y: 90, color: '#60a5fa' }, { el: 'H', x: 110, y: 190, color: '#60a5fa' }, { el: 'H', x: 190, y: 90, color: '#60a5fa' }], bonds: [[0,1],[1,2],[2,3],[0,4],[0,5],[0,6]], formula: 'C2H5OH' },
      { name: 'CaCO3 (Calcium Carbonate)', atoms: [{ el: 'Ca', x: 100, y: 150, color: '#fbbf24' }, { el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'O', x: 200, y: 80, color: '#ef4444' }, { el: 'O', x: 270, y: 190, color: '#ef4444' }, { el: 'O', x: 130, y: 190, color: '#ef4444' }], bonds: [[0,4],[1,2],[1,3],[1,4]], formula: 'CaCO3' },
      { name: 'C6H12O6 (Glucose)', atoms: [{ el: 'C', x: 120, y: 110, color: '#1e293b' }, { el: 'C', x: 180, y: 110, color: '#1e293b' }, { el: 'C', x: 240, y: 110, color: '#1e293b' }, { el: 'O', x: 120, y: 180, color: '#ef4444' }, { el: 'O', x: 180, y: 180, color: '#ef4444' }, { el: 'O', x: 240, y: 180, color: '#ef4444' }, { el: 'H', x: 300, y: 110, color: '#60a5fa' }], bonds: [[0,1],[1,2],[0,3],[1,4],[2,5],[2,6]], formula: 'C6H12O6' },
      { name: 'NaOH (Sodium Hydroxide)', atoms: [{ el: 'Na', x: 130, y: 150, color: '#a855f7' }, { el: 'O', x: 210, y: 150, color: '#ef4444' }, { el: 'H', x: 280, y: 150, color: '#60a5fa' }], bonds: [[0,1],[1,2]], formula: 'NaOH' },
      { name: 'Fe2O3 (Iron Oxide)', atoms: [{ el: 'Fe', x: 140, y: 120, color: '#fb923c' }, { el: 'Fe', x: 260, y: 120, color: '#fb923c' }, { el: 'O', x: 120, y: 200, color: '#ef4444' }, { el: 'O', x: 200, y: 200, color: '#ef4444' }, { el: 'O', x: 280, y: 200, color: '#ef4444' }], bonds: [[0,2],[0,3],[1,3],[1,4]], formula: 'Fe2O3' },
      { name: 'O3 (Ozone)', atoms: [{ el: 'O', x: 130, y: 150, color: '#ef4444' }, { el: 'O', x: 200, y: 110, color: '#ef4444' }, { el: 'O', x: 270, y: 150, color: '#ef4444' }], bonds: [[0,1],[1,2]], formula: 'O3' },
      { name: 'CO (Carbon Monoxide)', atoms: [{ el: 'C', x: 160, y: 150, color: '#1e293b' }, { el: 'O', x: 240, y: 150, color: '#ef4444' }], bonds: [[0,1]], formula: 'CO' },
      { name: 'NO2 (Nitrogen Dioxide)', atoms: [{ el: 'N', x: 200, y: 110, color: '#3b82f6' }, { el: 'O', x: 140, y: 180, color: '#ef4444' }, { el: 'O', x: 260, y: 180, color: '#ef4444' }], bonds: [[0,1],[0,2]], formula: 'NO2' },
      { name: 'SO2 (Sulfur Dioxide)', atoms: [{ el: 'S', x: 200, y: 120, color: '#facc15' }, { el: 'O', x: 130, y: 180, color: '#ef4444' }, { el: 'O', x: 270, y: 180, color: '#ef4444' }], bonds: [[0,1],[0,2]], formula: 'SO2' },
      { name: 'N2O (Nitrous Oxide)', atoms: [{ el: 'N', x: 140, y: 150, color: '#3b82f6' }, { el: 'N', x: 200, y: 150, color: '#3b82f6' }, { el: 'O', x: 260, y: 150, color: '#ef4444' }], bonds: [[0,1],[1,2]], formula: 'N2O' },
      { name: 'CH3OH (Methanol)', atoms: [{ el: 'C', x: 160, y: 140, color: '#1e293b' }, { el: 'O', x: 240, y: 140, color: '#ef4444' }, { el: 'H', x: 300, y: 140, color: '#60a5fa' }, { el: 'H', x: 120, y: 90, color: '#60a5fa' }, { el: 'H', x: 120, y: 190, color: '#60a5fa' }, { el: 'H', x: 190, y: 80, color: '#60a5fa' }], bonds: [[0,1],[1,2],[0,3],[0,4],[0,5]], formula: 'CH3OH' },
      { name: 'HNO3 (Nitric Acid)', atoms: [{ el: 'N', x: 200, y: 130, color: '#3b82f6' }, { el: 'O', x: 140, y: 80, color: '#ef4444' }, { el: 'O', x: 270, y: 100, color: '#ef4444' }, { el: 'O', x: 200, y: 200, color: '#ef4444' }, { el: 'H', x: 260, y: 200, color: '#60a5fa' }], bonds: [[0,1],[0,2],[0,3],[3,4]], formula: 'HNO3' },
      { name: 'H3PO4 (Phosphoric Acid)', atoms: [{ el: 'P', x: 200, y: 140, color: '#f97316' }, { el: 'O', x: 140, y: 80, color: '#ef4444' }, { el: 'O', x: 270, y: 90, color: '#ef4444' }, { el: 'O', x: 270, y: 195, color: '#ef4444' }, { el: 'O', x: 130, y: 195, color: '#ef4444' }, { el: 'H', x: 310, y: 60, color: '#60a5fa' }, { el: 'H', x: 320, y: 210, color: '#60a5fa' }, { el: 'H', x: 80, y: 210, color: '#60a5fa' }], bonds: [[0,1],[0,2],[0,3],[0,4],[2,5],[3,6],[4,7]], formula: 'H3PO4' },
      { name: 'C3H8 (Propane)', atoms: [{ el: 'C', x: 130, y: 140, color: '#1e293b' }, { el: 'C', x: 200, y: 140, color: '#1e293b' }, { el: 'C', x: 270, y: 140, color: '#1e293b' }, { el: 'H', x: 100, y: 90, color: '#60a5fa' }, { el: 'H', x: 100, y: 190, color: '#60a5fa' }, { el: 'H', x: 130, y: 210, color: '#60a5fa' }, { el: 'H', x: 200, y: 90, color: '#60a5fa' }, { el: 'H', x: 200, y: 190, color: '#60a5fa' }, { el: 'H', x: 300, y: 90, color: '#60a5fa' }, { el: 'H', x: 300, y: 190, color: '#60a5fa' }, { el: 'H', x: 270, y: 210, color: '#60a5fa' }], bonds: [[0,1],[1,2],[0,3],[0,4],[0,5],[1,6],[1,7],[2,8],[2,9],[2,10]], formula: 'C3H8' },
      { name: 'C4H10 (Butane)', atoms: [{ el: 'C', x: 100, y: 140, color: '#1e293b' }, { el: 'C', x: 170, y: 140, color: '#1e293b' }, { el: 'C', x: 240, y: 140, color: '#1e293b' }, { el: 'C', x: 310, y: 140, color: '#1e293b' }, { el: 'H', x: 70, y: 100, color: '#60a5fa' }, { el: 'H', x: 70, y: 180, color: '#60a5fa' }, { el: 'H', x: 100, y: 210, color: '#60a5fa' }, { el: 'H', x: 170, y: 100, color: '#60a5fa' }, { el: 'H', x: 170, y: 195, color: '#60a5fa' }, { el: 'H', x: 240, y: 100, color: '#60a5fa' }, { el: 'H', x: 240, y: 195, color: '#60a5fa' }, { el: 'H', x: 340, y: 100, color: '#60a5fa' }, { el: 'H', x: 340, y: 180, color: '#60a5fa' }, { el: 'H', x: 310, y: 210, color: '#60a5fa' }], bonds: [[0,1],[1,2],[2,3],[0,4],[0,5],[0,6],[1,7],[1,8],[2,9],[2,10],[3,11],[3,12],[3,13]], formula: 'C4H10' },
      { name: 'SiO2 (Silicon Dioxide)', atoms: [{ el: 'Si', x: 200, y: 150, color: '#34d399' }, { el: 'O', x: 130, y: 150, color: '#ef4444' }, { el: 'O', x: 270, y: 150, color: '#ef4444' }], bonds: [[0,1],[0,2]], formula: 'SiO2' },
      { name: 'KCl (Potassium Chloride)', atoms: [{ el: 'K', x: 160, y: 150, color: '#f87171' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0,1]], formula: 'KCl' },
      { name: 'MgO (Magnesium Oxide)', atoms: [{ el: 'Mg', x: 160, y: 150, color: '#fbbf24' }, { el: 'O', x: 240, y: 150, color: '#ef4444' }], bonds: [[0,1]], formula: 'MgO' },
      { name: 'NaHCO3 (Baking Soda)', atoms: [{ el: 'Na', x: 80, y: 150, color: '#a855f7' }, { el: 'O', x: 150, y: 150, color: '#ef4444' }, { el: 'C', x: 220, y: 150, color: '#1e293b' }, { el: 'O', x: 220, y: 80, color: '#ef4444' }, { el: 'O', x: 290, y: 150, color: '#ef4444' }, { el: 'H', x: 340, y: 150, color: '#60a5fa' }], bonds: [[0,1],[1,2],[2,3],[2,4],[4,5]], formula: 'NaHCO3' },
      { name: 'CH3COOH (Acetic Acid)', atoms: [{ el: 'C', x: 140, y: 140, color: '#1e293b' }, { el: 'C', x: 220, y: 140, color: '#1e293b' }, { el: 'O', x: 220, y: 70, color: '#ef4444' }, { el: 'O', x: 290, y: 160, color: '#ef4444' }, { el: 'H', x: 340, y: 160, color: '#60a5fa' }, { el: 'H', x: 100, y: 95, color: '#60a5fa' }, { el: 'H', x: 100, y: 185, color: '#60a5fa' }, { el: 'H', x: 140, y: 210, color: '#60a5fa' }], bonds: [[0,1],[1,2],[1,3],[3,4],[0,5],[0,6],[0,7]], formula: 'CH3COOH' },
      { name: 'KNO3 (Potassium Nitrate)', atoms: [{ el: 'K', x: 100, y: 150, color: '#f87171' }, { el: 'N', x: 200, y: 130, color: '#3b82f6' }, { el: 'O', x: 160, y: 190, color: '#ef4444' }, { el: 'O', x: 240, y: 190, color: '#ef4444' }, { el: 'O', x: 200, y: 70, color: '#ef4444' }], bonds: [[0,2],[1,2],[1,3],[1,4]], formula: 'KNO3' },
      { name: 'CuSO4 (Copper Sulfate)', atoms: [{ el: 'Cu', x: 100, y: 150, color: '#fb923c' }, { el: 'S', x: 200, y: 140, color: '#facc15' }, { el: 'O', x: 160, y: 80, color: '#ef4444' }, { el: 'O', x: 260, y: 90, color: '#ef4444' }, { el: 'O', x: 260, y: 200, color: '#ef4444' }, { el: 'O', x: 140, y: 200, color: '#ef4444' }], bonds: [[0,5],[1,2],[1,3],[1,4],[1,5]], formula: 'CuSO4' }
    ];

    // ── Electronegativity map ──
    var ELECTRONEGATIVITY = {
      H: 2.20, He: 0, Li: 0.98, Be: 1.57, B: 2.04, C: 2.55, N: 3.04, O: 3.44,
      F: 3.98, Ne: 0, Na: 0.93, Mg: 1.31, Al: 1.61, Si: 1.90, P: 2.19, S: 2.58,
      Cl: 3.16, Ar: 0, K: 0.82, Ca: 1.00, Fe: 1.83, Cu: 1.90, Zn: 1.65, Br: 2.96, I: 2.66
    };

    // ── Atomic mass map ──
    var ATOMIC_MASS = {
      H: 1.008, He: 4.003, Li: 6.941, Be: 9.012, B: 10.81, C: 12.011, N: 14.007,
      O: 15.999, F: 18.998, Ne: 20.180, Na: 22.990, Mg: 24.305, Al: 26.982,
      Si: 28.086, P: 30.974, S: 32.065, Cl: 35.453, Ar: 39.948, K: 39.098,
      Ca: 40.078, Fe: 55.845, Cu: 63.546, Zn: 65.38, Br: 79.904, Ag: 107.868,
      I: 126.904, Au: 196.967, Pt: 195.084, Hg: 200.592, Pb: 207.2, Sn: 118.710,
      Ti: 47.867, Cr: 51.996, Mn: 54.938, Ni: 58.693, Co: 58.933
    };

    // ── Build palette ──
    var BUILD_PALETTE = [
      { sym: 'H', color: '#60a5fa', label: 'Hydrogen' },
      { sym: 'C', color: '#1e293b', label: 'Carbon' },
      { sym: 'N', color: '#3b82f6', label: 'Nitrogen' },
      { sym: 'O', color: '#ef4444', label: 'Oxygen' },
      { sym: 'S', color: '#facc15', label: 'Sulfur' },
      { sym: 'P', color: '#f97316', label: 'Phosphorus' },
      { sym: 'Na', color: '#a855f7', label: 'Sodium' },
      { sym: 'Cl', color: '#22c55e', label: 'Chlorine' },
      { sym: 'Ca', color: '#fbbf24', label: 'Calcium' },
      { sym: 'Fe', color: '#fb923c', label: 'Iron' },
      { sym: 'K', color: '#f87171', label: 'Potassium' },
      { sym: 'Mg', color: '#fbbf24', label: 'Magnesium' },
      { sym: 'Cu', color: '#fb923c', label: 'Copper' },
      { sym: 'Si', color: '#34d399', label: 'Silicon' },
      { sym: 'Al', color: '#94a3b8', label: 'Aluminum' }
    ];

    // ── State setup ──
    var d = labToolData.molecule || {};
    var upd = function(key, val) {
      setLabToolData(function(prev) {
        var mol = Object.assign({}, prev.molecule || {});
        mol[key] = val;
        return Object.assign({}, prev, { molecule: mol });
      });
    };
    var updMulti = function(obj) {
      setLabToolData(function(prev) {
        return Object.assign({}, prev, { molecule: Object.assign({}, prev.molecule || {}, obj) });
      });
    };
    var W = 400, H_CANVAS = 300;
    var mode = d.moleculeMode || 'viewer';

    // ── Badge state & check ──
    function getBadgeState() { return d.badges || {}; }
    function checkBadges() {
      var bs = Object.assign({}, getBadgeState());
      var changed = false;
      var disc = d.discoveredCompounds || [];
      var builds = d.buildSuccessCount || 0;
      var viewedEls = d.viewedElements || [];
      var quizCorrect = d.elScore || 0;
      var quizStreak = d.elStreak || 0;
      var viewedCats = d.viewedCategories || [];
      var bondTypes = d.bondTypesUsed || [];
      var challengesDone = d.challengesDone || 0;
      var viewedPresets = d.viewedPresets || [];
      var aiQuestions = d.aiQuestionCount || 0;

      function award(id) {
        if (!bs[id]) {
          bs[id] = true;
          changed = true;
          var badge = null;
          for (var i = 0; i < BADGES.length; i++) {
            if (BADGES[i].id === id) { badge = BADGES[i]; break; }
          }
          if (badge) {
            playSound('badge');
            if (addToast) addToast(badge.icon + ' Badge earned: ' + badge.label + '!', 'success');
            if (typeof awardStemXP === 'function') awardStemXP('molecule', 25, 'Badge: ' + badge.label);
          }
        }
      }

      if (disc.length >= 1) award('firstCompound');
      if (disc.length >= 10) award('collector10');
      if (disc.length >= 20) award('collector20');
      if (builds >= 5) award('moleculeArchitect');
      if (viewedEls.length >= 20) award('periodicExplorer');
      if (quizCorrect >= 5) award('quizWhiz');
      if (quizStreak >= 3) award('quizStreak3');
      if (viewedCats.length >= 10) award('allCategories');
      if (bondTypes.length >= 3) award('bondMaster');
      if (challengesDone >= 3) award('challengeChamp');
      if (viewedPresets.length >= 15) award('viewerPro');
      if (aiQuestions >= 3) award('aiScholar');

      if (changed) {
        upd('badges', bs);
      }
    }

    // ── Compound crafting ──
    var selectedEls = d.selectedElements || {};
    var discovered = d.discoveredCompounds || [];

    var addElement = function(sym) {
      var cur = Object.assign({}, selectedEls);
      cur[sym] = (cur[sym] || 0) + 1;
      upd('selectedElements', cur);
      playSound('addAtom');
    };

    var removeElement = function(sym) {
      var cur = Object.assign({}, selectedEls);
      if (cur[sym] > 1) { cur[sym]--; } else { delete cur[sym]; }
      upd('selectedElements', cur);
      playSound('removeAtom');
    };

    var clearElements = function() { upd('selectedElements', {}); };

    var tryCraft = function() {
      var match = null;
      for (var ci = 0; ci < COMPOUNDS.length; ci++) {
        var c = COMPOUNDS[ci];
        var rKeys = Object.keys(c.recipe);
        var sKeys = Object.keys(selectedEls);
        if (rKeys.length !== sKeys.length) continue;
        var allMatch = true;
        for (var ki = 0; ki < rKeys.length; ki++) {
          if (selectedEls[rKeys[ki]] !== c.recipe[rKeys[ki]]) { allMatch = false; break; }
        }
        if (allMatch) { match = c; break; }
      }

      if (match) {
        var isNew = discovered.indexOf(match.formula) < 0;
        upd('craftResult', { success: true, compound: match, isNew: isNew });
        playSound('craftSuccess');
        if (isNew) {
          upd('discoveredCompounds', discovered.concat([match.formula]));
        }
        if (typeof awardStemXP === 'function') awardStemXP('molecule', isNew ? 20 : 5, 'Crafted ' + match.name);
        setTimeout(checkBadges, 100);
      } else {
        upd('craftResult', { success: false });
        playSound('craftFail');
      }
    };

    // ── Molecular mass calculator ──
    function calcMolecularMass(atomCounts) {
      var total = 0;
      var keys = Object.keys(atomCounts);
      for (var i = 0; i < keys.length; i++) {
        var mass = ATOMIC_MASS[keys[i]] || 0;
        total += mass * atomCounts[keys[i]];
      }
      return Math.round(total * 100) / 100;
    }

    // ── Bond polarity helper ──
    function getBondPolarity(sym1, sym2) {
      var en1 = ELECTRONEGATIVITY[sym1];
      var en2 = ELECTRONEGATIVITY[sym2];
      if (en1 === undefined || en2 === undefined) return null;
      var diff = Math.abs(en1 - en2);
      if (diff < 0.5) return 'nonpolar covalent';
      if (diff < 1.7) return 'polar covalent';
      return 'ionic';
    }

    // ── Quiz generator ──
    function makeElQuiz() {
      var quizTypes = [
        function() {
          var el = ELEMENTS[Math.floor(Math.random() * 36)];
          var opts = [el.name];
          var others = ELEMENTS.filter(function(e) { return e.name !== el.name; }).sort(function() { return Math.random() - 0.5; }).slice(0, 3);
          for (var i = 0; i < others.length; i++) opts.push(others[i].name);
          opts.sort(function() { return Math.random() - 0.5; });
          return { text: 'Which element has the symbol "' + el.s + '"?', answer: el.name, opts: opts };
        },
        function() {
          var el = ELEMENTS[Math.floor(Math.random() * 36)];
          var opts = [String(el.n), String(el.n + 2), String(el.n > 3 ? el.n - 2 : el.n + 4), String(el.n + 7)];
          opts.sort(function() { return Math.random() - 0.5; });
          return { text: 'What is the atomic number of ' + el.name + '?', answer: String(el.n), opts: opts };
        },
        function() {
          var cats = ['alkali', 'noble', 'halogen', 'transition', 'nonmetal'];
          var catLabels = { alkali: 'Alkali Metal', noble: 'Noble Gas', halogen: 'Halogen', transition: 'Transition Metal', nonmetal: 'Nonmetal' };
          var cat = cats[Math.floor(Math.random() * cats.length)];
          var ex = ELEMENTS.filter(function(e) { return e.cat === cat; });
          var el = ex[Math.floor(Math.random() * ex.length)];
          var allLabels = [];
          for (var k in catLabels) allLabels.push(catLabels[k]);
          allLabels.sort(function() { return Math.random() - 0.5; });
          var opts = allLabels.slice(0, 4);
          if (opts.indexOf(catLabels[cat]) < 0) opts[0] = catLabels[cat];
          return { text: 'What category does ' + el.name + ' (' + el.s + ') belong to?', answer: catLabels[cat], opts: opts };
        },
        // Electronegativity comparison
        function() {
          var enKeys = Object.keys(ELECTRONEGATIVITY).filter(function(k) { return ELECTRONEGATIVITY[k] > 0; });
          var a = enKeys[Math.floor(Math.random() * enKeys.length)];
          var b = enKeys[Math.floor(Math.random() * enKeys.length)];
          while (b === a) b = enKeys[Math.floor(Math.random() * enKeys.length)];
          var answer = ELECTRONEGATIVITY[a] > ELECTRONEGATIVITY[b] ? a : b;
          var wrong = answer === a ? b : a;
          var opts = [answer, wrong, 'They are equal', enKeys[Math.floor(Math.random() * enKeys.length)]];
          opts.sort(function() { return Math.random() - 0.5; });
          if (opts.indexOf(answer) < 0) opts[0] = answer;
          return { text: 'Which element is more electronegative: ' + a + ' or ' + b + '?', answer: answer, opts: opts };
        },
        // Molecular mass calculation
        function() {
          var simple = [
            { f: 'H2O', m: calcMolecularMass({ H: 2, O: 1 }) },
            { f: 'CO2', m: calcMolecularMass({ C: 1, O: 2 }) },
            { f: 'NaCl', m: calcMolecularMass({ Na: 1, Cl: 1 }) },
            { f: 'CH4', m: calcMolecularMass({ C: 1, H: 4 }) },
            { f: 'NH3', m: calcMolecularMass({ N: 1, H: 3 }) }
          ];
          var pick = simple[Math.floor(Math.random() * simple.length)];
          var correct = String(pick.m) + ' g/mol';
          var wrong1 = String(Math.round((pick.m + 5) * 100) / 100) + ' g/mol';
          var wrong2 = String(Math.round((pick.m - 4) * 100) / 100) + ' g/mol';
          var wrong3 = String(Math.round((pick.m * 1.3) * 100) / 100) + ' g/mol';
          var opts = [correct, wrong1, wrong2, wrong3];
          opts.sort(function() { return Math.random() - 0.5; });
          if (opts.indexOf(correct) < 0) opts[0] = correct;
          return { text: 'What is the molecular mass of ' + pick.f + '?', answer: correct, opts: opts };
        }
      ];

      var gen = quizTypes[Math.floor(Math.random() * quizTypes.length)];
      var q = gen();
      q.answered = false;
      if (q.opts.indexOf(q.answer) < 0) q.opts[0] = q.answer;
      return q;
    }

    // ── AI tutor helper ──
    function askAITutor(question) {
      var band = getGradeBand(ctx);
      var level = band === 'k2' ? 'K-2' : band === 'g35' ? 'grade 3-5' : band === 'g68' ? 'grade 6-8' : 'grade 9-12';
      var prompt = 'You are a friendly chemistry tutor for a ' + level + ' student. Answer concisely in 2-3 sentences. ' + question;
      updMulti({ aiLoading: true, aiAnswer: null });
      if (callGemini) {
        callGemini(prompt, false, false, 0.7).then(function(answer) {
          var cnt = (d.aiQuestionCount || 0) + 1;
          updMulti({ aiLoading: false, aiAnswer: answer, aiQuestionCount: cnt });
          setTimeout(checkBadges, 100);
        });
      }
    }

    // ── Grade band intro text ──
    var band = getGradeBand(ctx);
    var introText = gradeText(
      'Explore atoms and molecules! Tap elements to see what they are.',
      'Discover the periodic table, build molecules, and craft compounds!',
      'Investigate chemical bonding, electronegativity, and molecular structure.',
      'Analyze molecular geometry, bond polarity, and advanced compound chemistry.'
    )(band);

    // ═══ MAIN RENDER ═══
    // Helper to generate grid dots for build canvas
    var gridDots = [];
    var gr, gc;
    for (gr = 0; gr < 10; gr++) {
      for (gc = 0; gc < 13; gc++) {
        gridDots.push(h('circle', { key: 'g' + gr + '-' + gc, cx: 30 + gc * 28, cy: 25 + gr * 28, r: 1, fill: '#e2e8f0' }));
      }
    }

    // Badge count
    var badgeState = getBadgeState();
    var earnedBadgeCount = 0;
    var bk;
    for (bk in badgeState) { if (badgeState[bk]) earnedBadgeCount++; }

    // Build formula helper
    function buildFormulaStr(atoms) {
      var counts = {};
      for (var i = 0; i < atoms.length; i++) {
        counts[atoms[i].el] = (counts[atoms[i].el] || 0) + 1;
      }
      var order = ['C', 'H'];
      var remaining = Object.keys(counts).filter(function(k) { return order.indexOf(k) < 0; }).sort();
      var sorted = order.filter(function(k) { return counts[k]; }).concat(remaining);
      return sorted.map(function(k) { return k + (counts[k] > 1 ? counts[k] : ''); }).join('');
    }

    // Build mass helper for current atoms
    function buildMassFromAtoms(atoms) {
      var counts = {};
      for (var i = 0; i < atoms.length; i++) {
        counts[atoms[i].el] = (counts[atoms[i].el] || 0) + 1;
      }
      return calcMolecularMass(counts);
    }

    // Viewer mass helper
    function viewerMassFromFormula(preset) {
      var total = 0;
      for (var i = 0; i < preset.atoms.length; i++) {
        var m = ATOMIC_MASS[preset.atoms[i].el] || 0;
        total += m;
      }
      return Math.round(total * 100) / 100;
    }

    // ─── RENDER TREE ───
    var children = [];

    // ── Header ──
    var headerItems = [];
    if (ArrowLeft && setStemLabTool) {
      headerItems.push(h('button', { key: 'back', onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back to tools' }, h(ArrowLeft, { size: 18, className: 'text-slate-500' })));
    }
    headerItems.push(h('h3', { key: 'title', className: 'text-lg font-bold text-slate-800' }, '\uD83D\uDD2C Molecule Lab'));
    if (discovered.length > 0) {
      headerItems.push(h('span', { key: 'disc', className: 'ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full' }, '\uD83E\uDDEA ' + discovered.length + '/' + COMPOUNDS.length + ' discovered'));
    }
    if (earnedBadgeCount > 0) {
      headerItems.push(h('span', { key: 'badges', className: 'ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full' }, '\uD83C\uDFC5 ' + earnedBadgeCount + '/' + BADGES.length));
    }
    children.push(h('div', { key: 'header', className: 'flex items-center gap-3 mb-2' }, headerItems));

    // ── Grade-band intro ──
    children.push(h('p', { key: 'intro', className: 'text-xs text-slate-500 mb-3' }, introText));

    // ── Mode tabs ──
    var modes = [['viewer', '\uD83D\uDD2C Viewer'], ['creator', '\u2697\uFE0F Compound Creator'], ['build', '\uD83E\uDDF1 Build'], ['table', '\uD83D\uDDC2\uFE0F Periodic Table']];
    children.push(h('div', { key: 'tabs', className: 'flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl' },
      modes.map(function(item) {
        var m = item[0]; var label = item[1];
        return h('button', {
          key: m,
          onClick: function() { upd('moleculeMode', m); },
          className: 'flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')
        }, label);
      })
    ));

    // ═══ VIEWER MODE ═══
    if (mode === 'viewer') {
      var viewerChildren = [];

      // Preset selector
      viewerChildren.push(h('div', { key: 'presets', className: 'flex gap-1 mb-3 flex-wrap' },
        viewerPresets.map(function(p) {
          return h('button', {
            key: p.name,
            onClick: function() {
              var copiedAtoms = p.atoms.map(function(a) { return Object.assign({}, a); });
              var copiedBonds = p.bonds.map(function(b) { return [b[0], b[1]]; });
              updMulti({ atoms: copiedAtoms, bonds: copiedBonds, formula: p.formula });
              playSound('viewerSelect');
              // Track viewed presets
              var vp = (d.viewedPresets || []).slice();
              if (vp.indexOf(p.formula) < 0) {
                vp.push(p.formula);
                upd('viewedPresets', vp);
              }
              setTimeout(checkBadges, 100);
            },
            className: 'px-2 py-1 rounded-lg text-xs font-bold ' + (d.formula === p.formula ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200')
          }, p.name);
        })
      ));

      // SVG viewer
      var viewerSvgChildren = [];
      // Bonds
      var vBonds = d.bonds || [];
      var vAtoms = d.atoms || [];
      for (var vbi = 0; vbi < vBonds.length; vbi++) {
        var vb = vBonds[vbi];
        if (vAtoms[vb[0]] && vAtoms[vb[1]]) {
          viewerSvgChildren.push(h('line', {
            key: 'b' + vbi,
            x1: vAtoms[vb[0]].x, y1: vAtoms[vb[0]].y,
            x2: vAtoms[vb[1]].x, y2: vAtoms[vb[1]].y,
            stroke: '#94a3b8', strokeWidth: 4, strokeLinecap: 'round'
          }));
        }
      }
      // Atoms
      for (var vai = 0; vai < vAtoms.length; vai++) {
        (function(i) {
          var a = vAtoms[i];
          viewerSvgChildren.push(h('g', { key: 'a' + i },
            h('circle', {
              cx: a.x, cy: a.y, r: 24,
              fill: a.color || '#64748b', stroke: '#fff', strokeWidth: 3,
              style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', cursor: 'grab' },
              onMouseDown: function(e) { e.preventDefault(); upd('dragging', i); }
            }),
            h('text', { x: a.x, y: a.y + 5, textAnchor: 'middle', fill: 'white', style: { fontSize: '14px', fontWeight: 'bold' } }, a.el)
          ));
        })(vai);
      }

      viewerChildren.push(h('svg', {
        key: 'svg',
        viewBox: '0 0 ' + W + ' ' + H_CANVAS,
        className: 'w-full bg-gradient-to-b from-slate-50 to-white rounded-xl border border-stone-200',
        style: { maxHeight: '300px' },
        onMouseMove: function(e) {
          if (d.dragging !== null && d.dragging !== undefined) {
            var svg = e.currentTarget;
            var rect = svg.getBoundingClientRect();
            var nx = (e.clientX - rect.left) / rect.width * W;
            var ny = (e.clientY - rect.top) / rect.height * H_CANVAS;
            var na = (d.atoms || []).map(function(a, i) {
              if (i === d.dragging) return Object.assign({}, a, { x: Math.round(nx), y: Math.round(ny) });
              return a;
            });
            upd('atoms', na);
          }
        },
        onMouseUp: function() { upd('dragging', null); },
        onMouseLeave: function() { upd('dragging', null); }
      }, viewerSvgChildren));

      // Formula + mass display
      var viewerInfoChildren = [
        h('span', { key: 'fl', className: 'text-sm font-bold text-slate-500' }, 'Formula: '),
        h('span', { key: 'fv', className: 'text-lg font-bold text-slate-800' }, d.formula || '\u2014')
      ];
      if (d.formula && vAtoms.length > 0) {
        var vMass = viewerMassFromFormula({ atoms: vAtoms });
        viewerInfoChildren.push(h('span', { key: 'mass', className: 'ml-3 text-xs text-slate-400' }, 'Mass: ' + vMass + ' g/mol'));
      }
      viewerChildren.push(h('div', { key: 'info', className: 'mt-2 text-center' }, viewerInfoChildren));

      // TTS button for current formula
      if (callTTS && d.formula) {
        viewerChildren.push(h('div', { key: 'tts', className: 'mt-2 text-center' },
          h('button', {
            onClick: function() {
              var currentPreset = null;
              for (var pi = 0; pi < viewerPresets.length; pi++) {
                if (viewerPresets[pi].formula === d.formula) { currentPreset = viewerPresets[pi]; break; }
              }
              var text = currentPreset ? currentPreset.name : d.formula;
              callTTS(text);
            },
            className: 'px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-all'
          }, '\uD83D\uDD0A Read Aloud')
        ));
      }

      children.push(h('div', { key: 'viewer' }, viewerChildren));
    }

    // ═══ CREATOR MODE ═══
    if (mode === 'creator') {
      var creatorChildren = [];

      creatorChildren.push(h('p', { key: 'desc', className: 'text-xs text-slate-500 mb-3' }, 'Select elements to craft compounds - discover real-world chemistry by combining atoms!'));

      // Element selector grid
      var creatorElSyms = ['H', 'C', 'N', 'O', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'K', 'Ca', 'Fe', 'Cu', 'Zn', 'Br', 'Ag', 'I', 'Au'];
      creatorChildren.push(h('div', { key: 'grid', className: 'flex flex-wrap gap-1.5 mb-4' },
        creatorElSyms.map(function(sym) {
          var el = getEl(sym);
          var elCat = el ? el.cat : '';
          var elName = el ? el.name : sym;
          var elN = el ? el.n : '';
          return h('button', {
            key: sym,
            onClick: function() { addElement(sym); },
            className: 'w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold text-xs border-2 transition-all hover:scale-110 hover:shadow-md active:scale-95 ' + (catColors[elCat] || 'bg-slate-100 text-slate-600 border-slate-200'),
            title: elName
          },
            h('span', { className: 'text-sm font-black' }, sym),
            h('span', { className: 'text-[8px] opacity-70' }, elN)
          );
        })
      ));

      // Selected elements display
      var selKeys = Object.keys(selectedEls);
      var selContent;
      if (selKeys.length === 0) {
        selContent = h('p', null, 'Tap elements above to add them...');
      } else {
        selContent = selKeys.map(function(sym) {
          var el = getEl(sym);
          var count = selectedEls[sym];
          return h('div', { key: sym, className: 'flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1 border' },
            h('span', { className: 'w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm', style: { backgroundColor: (el && el.c) || '#64748b' } }, sym),
            h('span', { className: 'text-lg font-black text-slate-700' }, '\u00D7' + count),
            h('button', { onClick: function() { removeElement(sym); }, className: 'ml-1 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs font-bold hover:bg-red-200 flex items-center justify-center' }, '\u2212')
          );
        });
      }
      creatorChildren.push(h('div', { key: 'selected', className: 'bg-white rounded-xl border-2 border-dashed border-slate-300 p-4 mb-4 min-h-[80px] flex items-center justify-center gap-2 flex-wrap' },
        selKeys.length === 0
          ? h('p', { className: 'text-slate-400 text-sm italic' }, 'Tap elements above to add them...')
          : selContent
      ));

      // Molecular mass of selected
      if (selKeys.length > 0) {
        var selMass = calcMolecularMass(selectedEls);
        creatorChildren.push(h('p', { key: 'selmass', className: 'text-xs text-slate-400 mb-2 text-center' }, 'Estimated mass: ' + selMass + ' g/mol'));
      }

      // Action buttons
      creatorChildren.push(h('div', { key: 'actions', className: 'flex gap-2 mb-4' },
        h('button', {
          onClick: tryCraft,
          disabled: selKeys.length === 0,
          className: 'flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed'
        }, '\u2697\uFE0F Combine!'),
        h('button', { onClick: clearElements, className: 'px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors' }, '\uD83D\uDD04 Clear')
      ));

      // Craft result
      if (d.craftResult) {
        if (d.craftResult.success) {
          var cr = d.craftResult;
          creatorChildren.push(h('div', { key: 'result', className: 'bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center animate-in zoom-in' },
            h('p', { className: 'text-3xl mb-1' }, cr.compound.emoji),
            h('p', { className: 'text-lg font-black text-emerald-700' }, (cr.isNew ? '\uD83C\uDF89 NEW! ' : '\u2705 ') + cr.compound.name),
            h('p', { className: 'text-sm font-bold text-emerald-600' }, cr.compound.formula),
            h('p', { className: 'text-xs text-emerald-500 mt-1' }, cr.compound.desc)
          ));
        } else {
          creatorChildren.push(h('div', { key: 'result', className: 'bg-amber-50 border-2 border-amber-200 rounded-xl p-3 text-center' },
            h('p', { className: 'text-sm font-bold text-amber-700' }, '\uD83E\uDD14 No known compound matches this combination. Try different elements!')
          ));
        }
      }

      // Discovery log
      if (discovered.length > 0) {
        creatorChildren.push(h('div', { key: 'log', className: 'mt-4 bg-slate-50 rounded-xl p-3 border' },
          h('p', { className: 'text-xs font-bold text-slate-600 mb-2' }, '\uD83D\uDCDA Discovery Log (' + discovered.length + '/' + COMPOUNDS.length + ')'),
          h('div', { className: 'flex flex-wrap gap-1' },
            COMPOUNDS.map(function(c) {
              var found = discovered.indexOf(c.formula) >= 0;
              return h('span', {
                key: c.formula,
                className: 'px-2 py-0.5 rounded text-xs font-bold ' + (found ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400')
              }, found ? c.emoji + ' ' + c.name : '\uD83D\uDD12 ???');
            })
          )
        ));
      }

      children.push(h('div', { key: 'creator' }, creatorChildren));
    }

    // ═══ BUILD MODE ═══
    if (mode === 'build') {
      var buildChildren = [];

      buildChildren.push(h('p', { key: 'desc', className: 'text-xs text-slate-500 mb-2' }, 'Drag atoms onto the canvas and draw bonds to build molecules! Click two atoms to connect them.'));

      // Atom palette
      buildChildren.push(h('div', { key: 'palette', className: 'flex gap-1 mb-3 flex-wrap' },
        BUILD_PALETTE.map(function(a) {
          return h('button', {
            key: a.sym,
            onClick: function() {
              var ba = (d.buildAtoms || []).slice();
              var nx = 80 + Math.random() * (W - 160);
              var ny = 60 + Math.random() * (H_CANVAS - 120);
              ba.push({ el: a.sym, x: Math.round(nx), y: Math.round(ny), color: a.color });
              upd('buildAtoms', ba);
              upd('buildCheckResult', null);
              playSound('addAtom');
            },
            className: 'px-2 py-1.5 rounded-lg text-xs font-bold border-2 transition-all hover:scale-105 hover:shadow-md active:scale-95',
            style: { borderColor: a.color, color: a.color, backgroundColor: a.color + '18' },
            title: 'Add ' + a.label
          }, a.sym);
        })
      ));

      // Canvas SVG
      var buildSvgChildren = gridDots.slice();

      // Draw bonds
      var bBonds = d.buildBonds || [];
      var bAtoms = d.buildAtoms || [];
      for (var bbi = 0; bbi < bBonds.length; bbi++) {
        (function(i) {
          var b = bBonds[i];
          var a1 = bAtoms[b[0]], a2 = bAtoms[b[1]];
          if (!a1 || !a2) return;
          var bondType = b[2] || 1;
          var dx = a2.x - a1.x, dy = a2.y - a1.y;
          var len = Math.sqrt(dx * dx + dy * dy) || 1;
          var px = -dy / len, py = dx / len;

          if (bondType === 1) {
            buildSvgChildren.push(h('line', { key: 'bl' + i, x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, stroke: '#64748b', strokeWidth: 3.5, strokeLinecap: 'round' }));
          } else if (bondType === 2) {
            var off = 3;
            buildSvgChildren.push(h('line', { key: 'bl' + i + 'a', x1: a1.x + px * off, y1: a1.y + py * off, x2: a2.x + px * off, y2: a2.y + py * off, stroke: '#64748b', strokeWidth: 2.5, strokeLinecap: 'round' }));
            buildSvgChildren.push(h('line', { key: 'bl' + i + 'b', x1: a1.x - px * off, y1: a1.y - py * off, x2: a2.x - px * off, y2: a2.y - py * off, stroke: '#64748b', strokeWidth: 2.5, strokeLinecap: 'round' }));
          } else {
            buildSvgChildren.push(h('line', { key: 'bl' + i + 'a', x1: a1.x + px * 5, y1: a1.y + py * 5, x2: a2.x + px * 5, y2: a2.y + py * 5, stroke: '#64748b', strokeWidth: 2, strokeLinecap: 'round' }));
            buildSvgChildren.push(h('line', { key: 'bl' + i + 'b', x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, stroke: '#64748b', strokeWidth: 2, strokeLinecap: 'round' }));
            buildSvgChildren.push(h('line', { key: 'bl' + i + 'c', x1: a1.x - px * 5, y1: a1.y - py * 5, x2: a2.x - px * 5, y2: a2.y - py * 5, stroke: '#64748b', strokeWidth: 2, strokeLinecap: 'round' }));
          }

          // Clickable hit area to cycle bond type
          buildSvgChildren.push(h('line', {
            key: 'bh' + i,
            x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y,
            stroke: 'transparent', strokeWidth: 12,
            style: { cursor: 'pointer' },
            onClick: function(e) {
              e.stopPropagation();
              var nb = (d.buildBonds || []).map(function(bb, bi) {
                if (bi === i) return [bb[0], bb[1], ((bb[2] || 1) % 3) + 1];
                return bb;
              });
              upd('buildBonds', nb);
              upd('buildCheckResult', null);
              playSound('bondCycle');
              // Track bond types
              var newType = ((b[2] || 1) % 3) + 1;
              var bt = (d.bondTypesUsed || []).slice();
              if (bt.indexOf(newType) < 0) {
                bt.push(newType);
                upd('bondTypesUsed', bt);
              }
              setTimeout(checkBadges, 100);
            }
          }));
        })(bbi);
      }

      // Draw atoms
      for (var bai = 0; bai < bAtoms.length; bai++) {
        (function(i) {
          var a = bAtoms[i];
          var isSelected = d.buildBondFrom === i;
          var atomGroup = [];

          // Selection ring
          if (isSelected) {
            atomGroup.push(h('circle', { key: 'ring', cx: a.x, cy: a.y, r: 28, fill: 'none', stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '4 2' }));
          }

          // Atom circle
          atomGroup.push(h('circle', {
            key: 'circ',
            cx: a.x, cy: a.y, r: 22,
            fill: a.color || '#64748b',
            stroke: isSelected ? '#3b82f6' : '#fff',
            strokeWidth: isSelected ? 3 : 2.5,
            style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', cursor: 'grab' },
            onMouseDown: function(e) {
              e.preventDefault();
              e.stopPropagation();
              if (d.buildBondFrom !== null && d.buildBondFrom !== undefined && d.buildBondFrom !== i) {
                var existingBonds = d.buildBonds || [];
                var already = false;
                for (var eb = 0; eb < existingBonds.length; eb++) {
                  if ((existingBonds[eb][0] === d.buildBondFrom && existingBonds[eb][1] === i) || (existingBonds[eb][0] === i && existingBonds[eb][1] === d.buildBondFrom)) {
                    already = true; break;
                  }
                }
                if (!already) {
                  upd('buildBonds', existingBonds.concat([[d.buildBondFrom, i, 1]]));
                  playSound('bondCreate');
                  var bt = (d.bondTypesUsed || []).slice();
                  if (bt.indexOf(1) < 0) { bt.push(1); upd('bondTypesUsed', bt); }
                }
                upd('buildBondFrom', null);
                upd('buildCheckResult', null);
              } else {
                upd('buildDragging', i);
              }
            }
          }));

          // Atom label
          atomGroup.push(h('text', { key: 'lbl', x: a.x, y: a.y + 5, textAnchor: 'middle', fill: 'white', style: { fontSize: '13px', fontWeight: 'bold', pointerEvents: 'none' } }, a.el));

          // Delete button
          atomGroup.push(h('g', {
            key: 'del',
            onClick: function(e) {
              e.stopPropagation();
              var newAtoms = (d.buildAtoms || []).filter(function(_, ai) { return ai !== i; });
              var newBonds = (d.buildBonds || []).filter(function(b) { return b[0] !== i && b[1] !== i; }).map(function(b) {
                return [b[0] > i ? b[0] - 1 : b[0], b[1] > i ? b[1] - 1 : b[1], b[2] || 1];
              });
              upd('buildAtoms', newAtoms);
              upd('buildBonds', newBonds);
              if (d.buildBondFrom === i) upd('buildBondFrom', null);
              upd('buildCheckResult', null);
              playSound('removeAtom');
            },
            style: { cursor: 'pointer' }
          },
            h('circle', { cx: a.x + 16, cy: a.y - 16, r: 7, fill: '#ef4444', stroke: '#fff', strokeWidth: 1.5 }),
            h('text', { x: a.x + 16, y: a.y - 12.5, textAnchor: 'middle', fill: 'white', style: { fontSize: '9px', fontWeight: 'bold', pointerEvents: 'none' } }, '\u2715')
          ));

          buildSvgChildren.push(h('g', { key: 'ba' + i }, atomGroup));
        })(bai);
      }

      // Bond drawing indicator
      if (d.buildBondFrom !== null && d.buildBondFrom !== undefined && bAtoms[d.buildBondFrom]) {
        buildSvgChildren.push(h('text', { key: 'bondindicator', x: W / 2, y: H_CANVAS - 10, textAnchor: 'middle', fill: '#3b82f6', style: { fontSize: '10px', fontWeight: 'bold' } }, '\uD83D\uDD17 Click another atom to connect...'));
      }

      buildChildren.push(h('svg', {
        key: 'canvas',
        viewBox: '0 0 ' + W + ' ' + H_CANVAS,
        className: 'w-full bg-gradient-to-b from-slate-50 to-white rounded-xl border-2 border-dashed border-slate-300 cursor-crosshair',
        style: { maxHeight: '320px', touchAction: 'none' },
        onMouseMove: function(e) {
          if (d.buildDragging !== null && d.buildDragging !== undefined) {
            var svg = e.currentTarget;
            var rect = svg.getBoundingClientRect();
            var nx = (e.clientX - rect.left) / rect.width * W;
            var ny = (e.clientY - rect.top) / rect.height * H_CANVAS;
            var na = (d.buildAtoms || []).map(function(a, idx) {
              if (idx === d.buildDragging) {
                return Object.assign({}, a, {
                  x: Math.max(20, Math.min(W - 20, Math.round(nx))),
                  y: Math.max(20, Math.min(H_CANVAS - 20, Math.round(ny)))
                });
              }
              return a;
            });
            upd('buildAtoms', na);
          }
        },
        onMouseUp: function() { upd('buildDragging', null); },
        onMouseLeave: function() { upd('buildDragging', null); }
      }, buildSvgChildren));

      // Controls bar
      var controlItems = [];

      // Bond draw button
      controlItems.push(h('button', {
        key: 'bondbtn',
        onClick: function() {
          if (d.buildBondFrom !== null && d.buildBondFrom !== undefined) {
            upd('buildBondFrom', null);
          } else {
            upd('buildBondFrom', null);
            addToast('\uD83D\uDD17 Click an atom to start a bond, then click another to connect.', 'info');
          }
        },
        className: 'px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ' + (d.buildBondFrom !== null && d.buildBondFrom !== undefined ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200')
      }, '\uD83D\uDD17 ' + (d.buildBondFrom !== null && d.buildBondFrom !== undefined ? 'Cancel Bond' : 'Draw Bond')));

      // Bond-from selector
      if (bAtoms.length >= 2 && (d.buildBondFrom === null || d.buildBondFrom === undefined)) {
        var bfButtons = bAtoms.map(function(a, i) {
          return h('button', {
            key: 'bf' + i,
            onClick: function() { upd('buildBondFrom', i); },
            className: 'w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white hover:scale-110 transition-transform shadow-sm',
            style: { backgroundColor: a.color },
            title: 'Start bond from ' + a.el
          }, a.el);
        });
        controlItems.push(h('div', { key: 'bfsel', className: 'flex gap-1' }, bfButtons));
      }

      // Clear all
      controlItems.push(h('button', {
        key: 'clear',
        onClick: function() {
          upd('buildAtoms', []);
          upd('buildBonds', []);
          upd('buildBondFrom', null);
          upd('buildCheckResult', null);
        },
        className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all ml-auto'
      }, '\uD83D\uDDD1\uFE0F Clear All'));

      buildChildren.push(h('div', { key: 'controls', className: 'flex items-center gap-2 mt-3 flex-wrap' }, controlItems));

      // Running formula display + mass + polarity
      if (bAtoms.length > 0) {
        var formulaStr = buildFormulaStr(bAtoms);
        var bMass = buildMassFromAtoms(bAtoms);

        var formulaInfoChildren = [
          h('div', { key: 'left' },
            h('span', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-wider' }, 'Formula: '),
            h('span', { className: 'text-lg font-black text-slate-800 font-mono' }, formulaStr),
            h('span', { className: 'ml-2 text-xs text-slate-400' }, bMass + ' g/mol')
          ),
          h('div', { key: 'right', className: 'flex items-center gap-1 text-[10px] text-slate-400' },
            h('span', null, bAtoms.length + ' atoms'),
            h('span', null, '\u2022'),
            h('span', null, (d.buildBonds || []).length + ' bonds')
          )
        ];

        buildChildren.push(h('div', { key: 'formula', className: 'mt-3 bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between' }, formulaInfoChildren));

        // Bond polarity hints
        if (bBonds.length > 0) {
          var polarityHints = [];
          for (var phi = 0; phi < bBonds.length; phi++) {
            var pb = bBonds[phi];
            var pa1 = bAtoms[pb[0]], pa2 = bAtoms[pb[1]];
            if (pa1 && pa2) {
              var pol = getBondPolarity(pa1.el, pa2.el);
              if (pol) {
                polarityHints.push(h('span', { key: 'pol' + phi, className: 'px-1.5 py-0.5 rounded text-[9px] font-bold ' + (pol === 'ionic' ? 'bg-red-50 text-red-600' : pol === 'polar covalent' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600') }, pa1.el + '-' + pa2.el + ': ' + pol));
              }
            }
          }
          if (polarityHints.length > 0) {
            buildChildren.push(h('div', { key: 'polarity', className: 'mt-2 flex flex-wrap gap-1' },
              [h('span', { key: 'label', className: 'text-[9px] font-bold text-slate-400 mr-1' }, 'Bond polarity:')].concat(polarityHints)
            ));
          }
        }
      }

      // Check molecule + Random challenge buttons
      if (bAtoms.length > 0) {
        buildChildren.push(h('div', { key: 'checkbtns', className: 'mt-3 flex gap-2' },
          h('button', {
            onClick: function() {
              var counts = {};
              (d.buildAtoms || []).forEach(function(a) { counts[a.el] = (counts[a.el] || 0) + 1; });
              var match = null;
              for (var mi = 0; mi < COMPOUNDS.length; mi++) {
                var c = COMPOUNDS[mi];
                var rKeys = Object.keys(c.recipe);
                var bKeys = Object.keys(counts);
                if (rKeys.length !== bKeys.length) continue;
                var allMatch = true;
                for (var ki = 0; ki < rKeys.length; ki++) {
                  if (counts[rKeys[ki]] !== c.recipe[rKeys[ki]]) { allMatch = false; break; }
                }
                if (allMatch) { match = c; break; }
              }
              if (match) {
                upd('buildCheckResult', { success: true, compound: match });
                playSound('craftSuccess');
                addToast('\u2705 You built ' + match.name + '!', 'success');
                if (typeof awardStemXP === 'function') awardStemXP('molecule', 15, 'Built ' + match.name);
                var disc = d.discoveredCompounds || [];
                if (disc.indexOf(match.formula) < 0) upd('discoveredCompounds', disc.concat([match.formula]));
                var bsc = (d.buildSuccessCount || 0) + 1;
                upd('buildSuccessCount', bsc);
                // Check if challenge target matched
                if (d.buildTarget && d.buildTarget.formula === match.formula) {
                  var cd = (d.challengesDone || 0) + 1;
                  upd('challengesDone', cd);
                }
                setTimeout(checkBadges, 100);
              } else {
                upd('buildCheckResult', { success: false });
                playSound('craftFail');
                addToast('\uD83E\uDD14 No known compound matches this structure.', 'warning');
              }
            },
            className: 'flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all'
          }, '\uD83D\uDD0D Check Molecule'),
          h('button', {
            onClick: function() {
              var target = COMPOUNDS[Math.floor(Math.random() * COMPOUNDS.length)];
              upd('buildTarget', target);
              upd('buildAtoms', []);
              upd('buildBonds', []);
              upd('buildBondFrom', null);
              upd('buildCheckResult', null);
              playSound('challenge');
              addToast('\uD83C\uDFAF Build: ' + target.name + ' (' + target.formula + ')', 'info');
            },
            className: 'px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl hover:from-amber-500 hover:to-orange-600 shadow-md transition-all'
          }, '\uD83C\uDFAF Random Challenge')
        ));
      }

      // Target compound display
      if (d.buildTarget) {
        var tgt = d.buildTarget;
        var recipeStr = Object.keys(tgt.recipe).map(function(el) { return el + (tgt.recipe[el] > 1 ? '\u00D7' + tgt.recipe[el] : ''); }).join(' + ');
        buildChildren.push(h('div', { key: 'target', className: 'mt-2 bg-amber-50 rounded-xl p-3 border border-amber-200 flex items-center gap-3' },
          h('span', { className: 'text-2xl' }, tgt.emoji),
          h('div', null,
            h('p', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFAF Target: ' + tgt.name),
            h('p', { className: 'text-xs text-amber-600' }, tgt.formula + ' - ' + tgt.desc),
            h('p', { className: 'text-[10px] text-amber-500 mt-0.5' }, 'Recipe: ' + recipeStr)
          )
        ));
      }

      // Check result
      if (d.buildCheckResult) {
        if (d.buildCheckResult.success) {
          var bcr = d.buildCheckResult;
          buildChildren.push(h('div', { key: 'checkresult', className: 'mt-2 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 text-center animate-in zoom-in' },
            h('p', { className: 'text-3xl mb-1' }, bcr.compound.emoji),
            h('p', { className: 'text-lg font-black text-emerald-700' }, '\uD83C\uDF89 ' + bcr.compound.name),
            h('p', { className: 'text-sm font-bold text-emerald-600' }, bcr.compound.formula + ' - ' + bcr.compound.desc),
            h('p', { className: 'text-xs text-emerald-500 mt-1' }, '+15 XP \uD83C\uDF1F')
          ));
        } else {
          buildChildren.push(h('div', { key: 'checkresult', className: 'mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center' },
            h('p', { className: 'text-sm font-bold text-amber-700' }, '\uD83E\uDD14 No known compound matches. Keep experimenting!'),
            h('p', { className: 'text-[10px] text-amber-500 mt-1' }, 'Tip: Click bonds to cycle between single, double, and triple bonds')
          ));
        }
      }

      // Build tips (shown when empty)
      if (bAtoms.length === 0) {
        buildChildren.push(h('div', { key: 'tips', className: 'mt-4 bg-indigo-50 rounded-xl p-4 border border-indigo-200' },
          h('p', { className: 'text-sm font-bold text-indigo-700 mb-2' }, '\uD83D\uDCA1 How to Build'),
          h('div', { className: 'grid grid-cols-1 gap-1.5 text-xs text-indigo-600' },
            h('p', null, '\u2460 Click element buttons above to add atoms to the canvas'),
            h('p', null, '\u2461 Drag atoms to arrange them'),
            h('p', null, '\u2462 Click an atom in the bond selector, then click another atom to draw a bond'),
            h('p', null, '\u2463 Click a bond to cycle: single \u2192 double \u2192 triple'),
            h('p', null, '\u2464 Click \uD83D\uDD0D Check to identify your molecule!'),
            h('p', null, '\uD83C\uDFAF Try "Random Challenge" for a guided build quest')
          )
        ));
      }

      children.push(h('div', { key: 'build' }, buildChildren));
    }

    // ═══ PERIODIC TABLE MODE ═══
    if (mode === 'table') {
      var tableChildren = [];

      tableChildren.push(h('p', { key: 'desc', className: 'text-xs text-slate-500 mb-2' }, 'Tap any element to learn about it. The full 118-element periodic table.'));

      // Selected element detail panel
      if (d.selectedElement) {
        var selEl = d.selectedElement;
        var detail = getElementDetail(selEl.s);
        var relatedCompounds = getElementCompounds(selEl.s);

        var detailChildren = [];

        // Header row
        detailChildren.push(h('div', { key: 'hdr', className: 'p-3 flex items-center gap-3' },
          h('div', { className: 'w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-md flex-shrink-0', style: { backgroundColor: selEl.c } },
            h('span', { className: 'text-[10px] opacity-80' }, selEl.n),
            h('span', { className: 'text-xl font-black' }, selEl.s)
          ),
          h('div', { className: 'flex-1 min-w-0' },
            h('p', { className: 'text-lg font-bold text-slate-800' }, selEl.name),
            h('p', { className: 'text-xs text-slate-500' }, 'Atomic #' + selEl.n + ' \u2022 ' + (selEl.cat || 'element').charAt(0).toUpperCase() + (selEl.cat || 'element').slice(1) +
              (ATOMIC_MASS[selEl.s] ? ' \u2022 ' + ATOMIC_MASS[selEl.s] + ' g/mol' : '') +
              (ELECTRONEGATIVITY[selEl.s] ? ' \u2022 EN: ' + ELECTRONEGATIVITY[selEl.s] : '')
            ),
            detail ? h('p', { className: 'text-xs text-slate-600 mt-1 italic' }, detail.desc) : null
          ),
          h('button', { onClick: function() { upd('selectedElement', null); }, className: 'p-1 text-slate-400 hover:text-slate-600 flex-shrink-0', 'aria-label': 'Close' }, '\u2715')
        ));

        // TTS button
        if (callTTS && detail) {
          detailChildren.push(h('div', { key: 'tts', className: 'px-3 pb-1' },
            h('button', {
              onClick: function() { callTTS(selEl.name + '. ' + detail.desc); },
              className: 'px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-all'
            }, '\uD83D\uDD0A Read Aloud')
          ));
        }

        // Detail sections
        if (detail) {
          var detailSections = [];

          // Uses
          detailSections.push(h('div', { key: 'uses' },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1' }, '\uD83D\uDD27 Common Uses'),
            h('div', { className: 'flex flex-wrap gap-1' },
              (detail.uses || []).map(function(use, i) {
                return h('span', { key: i, className: 'px-2 py-0.5 bg-white/60 rounded-full text-[10px] font-medium text-slate-700 border border-slate-200/80' }, use);
              })
            )
          ));

          // Compounds
          detailSections.push(h('div', { key: 'compounds' },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1' }, '\uD83E\uDDEA Key Compounds'),
            h('div', { className: 'flex flex-wrap gap-1' },
              (detail.compounds || []).map(function(comp, i) {
                return h('span', { key: i, className: 'px-2 py-0.5 bg-white/60 rounded-full text-[10px] font-medium text-slate-700 border border-slate-200/80' }, comp);
              })
            )
          ));

          detailChildren.push(h('div', { key: 'details', className: 'border-t border-slate-200/50 px-3 pb-3' },
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mt-2' }, detailSections),

            // Craftable compounds
            relatedCompounds.length > 0 ? h('div', { className: 'mt-2' },
              h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1' }, '\u2697\uFE0F Craftable in Compound Creator (' + relatedCompounds.length + ')'),
              h('div', { className: 'flex flex-wrap gap-1' },
                relatedCompounds.map(function(comp, i) {
                  return h('button', {
                    key: i,
                    onClick: function() {
                      upd('moleculeMode', 'creator');
                      upd('selectedElements', Object.assign({}, comp.recipe));
                    },
                    className: 'px-2 py-0.5 bg-emerald-50 rounded-full text-[10px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors'
                  }, comp.emoji + ' ' + comp.name + ' (' + comp.formula + ')');
                })
              )
            ) : null,

            // ── BOHR MODEL ──
            h('div', { className: 'mt-3 pt-3 border-t border-slate-200/50' },
              h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2' }, '\u269B\uFE0F Bohr Model'),
              h('div', { className: 'flex items-start gap-3' },
                h('canvas', {
                  width: 220, height: 220,
                  className: 'rounded-xl border border-slate-200 bg-slate-900 flex-shrink-0',
                  key: 'bohr-' + selEl.n,
                  ref: function(canvas) {
                    if (!canvas) return;
                    var el = selEl;
                    var atomicNum = el.n;
                    var massNum = Math.round(ATOMIC_MASS[el.s] || (atomicNum * 2.15));
                    var protons = atomicNum;
                    var neutrons = massNum - protons;
                    if (neutrons < 0) neutrons = 0;
                    var electrons = atomicNum;
                    var shellCapacity = [2, 8, 18, 32, 32, 18, 8];
                    var shells = [];
                    var remaining = electrons;
                    for (var si = 0; si < shellCapacity.length && remaining > 0; si++) {
                      var count = Math.min(remaining, shellCapacity[si]);
                      shells.push(count);
                      remaining -= count;
                    }
                    var canvasCtx = canvas.getContext('2d');
                    var cW = canvas.width, cH = canvas.height;
                    var cx = cW / 2, cy = cH / 2;
                    var maxR = Math.min(cW, cH) / 2 - 8;
                    var nShells = shells.length;
                    var nucleusR = Math.max(8, Math.min(22, 6 + protons * 0.15));
                    var shellColors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c', '#38bdf8'];
                    var angle = 0;
                    var animId = null;

                    function draw() {
                      canvasCtx.clearRect(0, 0, cW, cH);
                      // Draw shells
                      for (var s = 0; s < nShells; s++) {
                        var r = nucleusR + 12 + (maxR - nucleusR - 12) * ((s + 1) / (nShells + 0.5));
                        canvasCtx.beginPath();
                        canvasCtx.arc(cx, cy, r, 0, Math.PI * 2);
                        canvasCtx.strokeStyle = 'rgba(148,163,184,0.25)';
                        canvasCtx.lineWidth = 1;
                        canvasCtx.stroke();
                      }
                      // Draw nucleus
                      var nucGrad = canvasCtx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, nucleusR);
                      nucGrad.addColorStop(0, '#ff6b6b');
                      nucGrad.addColorStop(0.6, '#e74c3c');
                      nucGrad.addColorStop(1, '#c0392b');
                      canvasCtx.beginPath();
                      canvasCtx.arc(cx, cy, nucleusR, 0, Math.PI * 2);
                      canvasCtx.fillStyle = nucGrad;
                      canvasCtx.fill();
                      // Nucleus spots
                      if (protons <= 20) {
                        var nucItems = [];
                        for (var pi = 0; pi < Math.min(protons, 10); pi++) nucItems.push('p');
                        for (var ni = 0; ni < Math.min(neutrons, 10); ni++) nucItems.push('n');
                        var golden = 2.399963;
                        for (var qi = 0; qi < nucItems.length; qi++) {
                          var fr = Math.sqrt(qi / nucItems.length) * (nucleusR * 0.7);
                          var fa = qi * golden;
                          var fx = cx + Math.cos(fa) * fr;
                          var fy = cy + Math.sin(fa) * fr;
                          canvasCtx.beginPath();
                          canvasCtx.arc(fx, fy, Math.max(1.5, nucleusR * 0.15), 0, Math.PI * 2);
                          canvasCtx.fillStyle = nucItems[qi] === 'p' ? '#ffaaaa' : '#aaaaff';
                          canvasCtx.fill();
                        }
                      }
                      // Nucleus label
                      canvasCtx.fillStyle = '#ffffff';
                      canvasCtx.font = 'bold ' + Math.max(7, Math.min(11, nucleusR * 0.7)) + 'px sans-serif';
                      canvasCtx.textAlign = 'center';
                      canvasCtx.textBaseline = 'middle';
                      if (protons <= 4) {
                        canvasCtx.fillText(protons + 'p', cx, cy - 2);
                        canvasCtx.fillText(neutrons + 'n', cx, cy + 7);
                      }
                      // Electrons
                      for (var s2 = 0; s2 < nShells; s2++) {
                        var r2 = nucleusR + 12 + (maxR - nucleusR - 12) * ((s2 + 1) / (nShells + 0.5));
                        var eCount = shells[s2];
                        var speed = (0.3 + s2 * 0.15) * (s2 % 2 === 0 ? 1 : -1);
                        var eColor = shellColors[s2 % shellColors.length];
                        for (var ei = 0; ei < eCount; ei++) {
                          var eAngle = angle * speed + (ei / eCount) * Math.PI * 2;
                          var ex = cx + Math.cos(eAngle) * r2;
                          var ey = cy + Math.sin(eAngle) * r2;
                          canvasCtx.beginPath();
                          canvasCtx.arc(ex, ey, 5, 0, Math.PI * 2);
                          canvasCtx.fillStyle = eColor + '44';
                          canvasCtx.fill();
                          canvasCtx.beginPath();
                          canvasCtx.arc(ex, ey, 3, 0, Math.PI * 2);
                          canvasCtx.fillStyle = eColor;
                          canvasCtx.fill();
                        }
                      }
                      // Symbol
                      canvasCtx.fillStyle = 'rgba(255,255,255,0.6)';
                      canvasCtx.font = 'bold 10px sans-serif';
                      canvasCtx.textAlign = 'center';
                      canvasCtx.fillText(el.s + ' (' + atomicNum + ')', cx, 14);
                      angle += 0.015;
                      animId = requestAnimationFrame(draw);
                    }
                    draw();
                    canvas._bohrCleanup = function() { if (animId) cancelAnimationFrame(animId); };
                    var observer = new MutationObserver(function(mutations) {
                      mutations.forEach(function(m) {
                        m.removedNodes.forEach(function(node) {
                          if (node === canvas || (node.contains && node.contains(canvas))) {
                            if (canvas._bohrCleanup) canvas._bohrCleanup();
                            observer.disconnect();
                          }
                        });
                      });
                    });
                    if (canvas.parentNode && canvas.parentNode.parentNode) {
                      observer.observe(canvas.parentNode.parentNode, { childList: true, subtree: true });
                    }
                  }
                }),
                h('div', { className: 'text-[10px] text-slate-600 space-y-1 leading-relaxed' },
                  h('p', null, h('strong', { className: 'text-slate-700' }, 'Protons: '), '' + selEl.n),
                  h('p', null, h('strong', { className: 'text-slate-700' }, 'Electrons: '), '' + selEl.n),
                  h('p', null, h('strong', { className: 'text-slate-700' }, 'Shells: '), (function() {
                    var e = selEl.n;
                    var sc = [2, 8, 18, 32, 32, 18, 8];
                    var sh = [];
                    var rem = e;
                    for (var i = 0; i < sc.length && rem > 0; i++) {
                      var cc = Math.min(rem, sc[i]);
                      sh.push(cc);
                      rem -= cc;
                    }
                    return sh.join('-');
                  })()),
                  ATOMIC_MASS[selEl.s] ? h('p', null, h('strong', { className: 'text-slate-700' }, 'Mass: '), ATOMIC_MASS[selEl.s] + ' g/mol') : null,
                  ELECTRONEGATIVITY[selEl.s] ? h('p', null, h('strong', { className: 'text-slate-700' }, 'Electronegativity: '), '' + ELECTRONEGATIVITY[selEl.s]) : null,
                  h('p', { className: 'text-[9px] text-slate-400 italic mt-1' }, '\u26A1 Electrons orbit the nucleus in energy levels called "shells." Inner shells fill first before outer ones begin.')
                )
              )
            )
          ));
        }

        tableChildren.push(h('div', { key: 'detail', className: 'mb-3 rounded-xl border-2 overflow-hidden ' + (catColors[selEl.cat] || 'bg-slate-50 border-slate-200') }, detailChildren));
      }

      // Table grid
      var tableGridCells = [];
      for (var ri = 0; ri < PT_LAYOUT.length; ri++) {
        var row = PT_LAYOUT[ri];
        if (row.length === 0) {
          tableGridCells.push(h('div', { key: 'gap-' + ri, style: { gridColumn: 'span 18', height: '4px' } }));
        } else {
          for (var ci = 0; ci < row.length; ci++) {
            var num = row[ci];
            if (num === 0) {
              tableGridCells.push(h('div', { key: ri + '-' + ci }));
            } else {
              (function(elNum) {
                var el = ELEMENTS[elNum - 1];
                if (!el) {
                  tableGridCells.push(h('div', { key: ri + '-' + ci }));
                  return;
                }
                tableGridCells.push(h('button', {
                  key: el.s,
                  onClick: function() {
                    upd('selectedElement', el);
                    playSound('selectElement');
                    // Track viewed elements and categories
                    var ve = (d.viewedElements || []).slice();
                    if (ve.indexOf(el.s) < 0) { ve.push(el.s); upd('viewedElements', ve); }
                    var vc = (d.viewedCategories || []).slice();
                    if (vc.indexOf(el.cat) < 0) { vc.push(el.cat); upd('viewedCategories', vc); }
                    setTimeout(checkBadges, 100);
                  },
                  className: 'w-full aspect-square rounded flex flex-col items-center justify-center text-[8px] font-bold border transition-all hover:scale-125 hover:z-10 hover:shadow-lg ' + (catColors[el.cat] || 'bg-slate-50 border-slate-200'),
                  title: el.name,
                  style: { minWidth: '28px' }
                },
                  h('span', { className: 'font-black text-[10px] leading-none' }, el.s),
                  h('span', { className: 'opacity-60 leading-none' }, el.n)
                ));
              })(num);
            }
          }
        }
      }

      tableChildren.push(h('div', { key: 'grid', className: 'overflow-x-auto' },
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(18, minmax(0, 1fr))', gap: '1px', minWidth: '600px' } }, tableGridCells)
      ));

      // Legend
      var legendItems = [
        ['alkali', 'Alkali'], ['alkaline', 'Alkaline'], ['transition', 'Transition'],
        ['metal', 'Post-trans.'], ['metalloid', 'Metalloid'], ['nonmetal', 'Nonmetal'],
        ['halogen', 'Halogen'], ['noble', 'Noble Gas'], ['lanthanide', 'Lanthanide'], ['actinide', 'Actinide']
      ];
      tableChildren.push(h('div', { key: 'legend', className: 'flex flex-wrap gap-1.5 mt-3 justify-center' },
        legendItems.map(function(item) {
          return h('span', { key: item[0], className: 'px-1.5 py-0.5 rounded text-[9px] font-bold border ' + (catColors[item[0]] || '') }, item[1]);
        })
      ));

      // ── Element Quiz ──
      var elQuiz = d.elQuiz || null;
      var elScore = d.elScore || 0;
      var elStreak = d.elStreak || 0;

      var quizChildren = [];
      quizChildren.push(h('div', { key: 'qhdr', className: 'flex items-center gap-2 mb-2' },
        h('button', {
          onClick: function() { upd('elQuiz', makeElQuiz()); playSound('challenge'); },
          className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + (elQuiz ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-600 text-white') + ' hover:opacity-90 transition-all'
        }, elQuiz ? '\uD83D\uDD04 Next Question' : '\uD83D\uDD2C Element Quiz'),
        elScore > 0 ? h('span', { className: 'text-xs font-bold text-emerald-600' }, '\u2B50 ' + elScore + ' | \uD83D\uDD25 ' + elStreak) : null
      ));

      if (elQuiz && !elQuiz.answered) {
        quizChildren.push(h('div', { key: 'qbody', className: 'bg-cyan-50 rounded-xl p-3 border border-cyan-200' },
          h('p', { className: 'text-sm font-bold text-cyan-800 mb-2' }, elQuiz.text),
          h('div', { className: 'grid grid-cols-2 gap-2' },
            elQuiz.opts.map(function(opt) {
              return h('button', {
                key: opt,
                onClick: function() {
                  var correct = opt === elQuiz.answer;
                  upd('elQuiz', Object.assign({}, elQuiz, { answered: true, chosen: opt }));
                  var newScore = elScore + (correct ? 1 : 0);
                  var newStreak = correct ? elStreak + 1 : 0;
                  updMulti({ elScore: newScore, elStreak: newStreak });
                  if (correct) {
                    playSound('correct');
                    addToast('Correct!', 'success');
                  } else {
                    playSound('wrong');
                    addToast('Answer: ' + elQuiz.answer, 'error');
                  }
                  setTimeout(checkBadges, 100);
                },
                className: 'px-2 py-1.5 rounded-lg text-xs font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 transition-all'
              }, opt);
            })
          )
        ));
      }

      if (elQuiz && elQuiz.answered) {
        quizChildren.push(h('div', { key: 'qresult', className: 'p-3 rounded-xl text-sm font-bold ' + (elQuiz.chosen === elQuiz.answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') },
          elQuiz.chosen === elQuiz.answer ? '\u2705 Correct!' : '\u274C Answer: ' + elQuiz.answer
        ));
      }

      tableChildren.push(h('div', { key: 'quiz', className: 'border-t border-slate-200 pt-3 mt-3' }, quizChildren));

      children.push(h('div', { key: 'table' }, tableChildren));
    }

    // ═══ AI TUTOR PANEL ═══
    var aiChildren = [];
    aiChildren.push(h('p', { key: 'ail', className: 'text-xs font-bold text-slate-600 mb-1' }, '\uD83E\uDD16 AI Chemistry Tutor'));
    aiChildren.push(h('div', { key: 'aiinput', className: 'flex gap-2' },
      h('input', {
        type: 'text',
        value: d.aiQuestion || '',
        onChange: function(e) { upd('aiQuestion', e.target.value); },
        onKeyDown: function(e) {
          if (e.key === 'Enter' && (d.aiQuestion || '').trim()) {
            askAITutor(d.aiQuestion);
            upd('aiQuestion', '');
          }
        },
        placeholder: 'Ask a chemistry question...',
        className: 'flex-1 px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-indigo-300 focus:outline-none'
      }),
      h('button', {
        onClick: function() {
          if ((d.aiQuestion || '').trim()) {
            askAITutor(d.aiQuestion);
            upd('aiQuestion', '');
          }
        },
        disabled: d.aiLoading || !(d.aiQuestion || '').trim(),
        className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 transition-all'
      }, d.aiLoading ? 'Thinking...' : 'Ask')
    ));

    if (d.aiLoading) {
      aiChildren.push(h('p', { key: 'aiload', className: 'text-xs text-slate-400 mt-2 italic' }, 'Thinking...'));
    }
    if (d.aiAnswer) {
      aiChildren.push(h('div', { key: 'aianswer', className: 'mt-2 bg-indigo-50 rounded-lg p-3 text-xs text-indigo-800 border border-indigo-200' }, d.aiAnswer));
    }

    children.push(h('div', { key: 'ai', className: 'mt-4 bg-white rounded-xl p-3 border border-slate-200' }, aiChildren));

    // ═══ BADGE DISPLAY ═══
    if (earnedBadgeCount > 0) {
      var badgeItems = [];
      for (var bi = 0; bi < BADGES.length; bi++) {
        var bdg = BADGES[bi];
        var earned = badgeState[bdg.id];
        if (earned) {
          badgeItems.push(h('div', {
            key: bdg.id,
            className: 'flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200',
            title: bdg.desc
          },
            h('span', { className: 'text-lg' }, bdg.icon),
            h('span', { className: 'text-[10px] font-bold text-amber-700' }, bdg.label)
          ));
        }
      }
      children.push(h('div', { key: 'badges', className: 'mt-3 bg-slate-50 rounded-xl p-3 border' },
        h('p', { className: 'text-xs font-bold text-slate-600 mb-2' }, '\uD83C\uDFC5 Badges (' + earnedBadgeCount + '/' + BADGES.length + ')'),
        h('div', { className: 'flex flex-wrap gap-2' }, badgeItems)
      ));
    }

    return h('div', { className: 'max-w-4xl mx-auto animate-in fade-in duration-200' }, children);
  }
});

})();
