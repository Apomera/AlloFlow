// ═══════════════════════════════════════════
// stem_tool_molecule.js — Molecule Lab (Enhanced Standalone)
// Full 118-element periodic table, compound creator (32 recipes),
// molecule builder, Bohr model, reaction simulator, challenges & RP
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

  // ── Audio (auto-injected) ──
  var _molAC = null;
  function getMolAC() { if (!_molAC) { try { _molAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_molAC && _molAC.state === "suspended") { try { _molAC.resume(); } catch(e) {} } return _molAC; }
  function molTone(f,d,tp,v) { var ac = getMolAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxMolClick() { molTone(600, 0.03, "sine", 0.04); }
  function sfxMolSuccess() { molTone(523, 0.08, "sine", 0.07); setTimeout(function() { molTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { molTone(784, 0.1, "sine", 0.08); }, 140); }

  if (window.StemLab && window.StemLab.isRegistered && window.StemLab.isRegistered('molecule')) return;

  window.StemLab.registerTool('molecule', {
    icon: '\uD83E\uDDEA',
    label: 'molecule',
    desc: '',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'discover_compound', label: 'Discover a chemical compound', icon: '\uD83E\uDDEA', check: function(d) { return (d.discoveredCompounds || []).length >= 1; }, progress: function(d) { return (d.discoveredCompounds || []).length >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'discover_5_compounds', label: 'Discover 5 different compounds', icon: '\uD83D\uDD2C', check: function(d) { return (d.discoveredCompounds || []).length >= 5; }, progress: function(d) { return (d.discoveredCompounds || []).length + '/5'; } },
      { id: 'balance_3_reactions', label: 'Balance 3 chemical reactions', icon: '\u2696\uFE0F', check: function(d) { return (d.reactionsBalanced || 0) >= 3; }, progress: function(d) { return (d.reactionsBalanced || 0) + '/3'; } },
      { id: 'earn_50_rp', label: 'Earn 50 research points', icon: '\u2B50', check: function(d) { return (d.totalRP || 0) >= 50; }, progress: function(d) { return (d.totalRP || 0) + '/50 RP'; } },
      { id: 'complete_3_challenges', label: 'Complete 3 chemistry challenges', icon: '\uD83C\uDFC6', check: function(d) { return (d.completedChallenges || []).length >= 3; }, progress: function(d) { return (d.completedChallenges || []).length + '/3'; } }
    ],
    render: function(ctx) {
      // Aliases â€” maps ctx properties to original variable names
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
      var t = ctx.t;
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

      // â”€â”€ Tool body (molecule) â”€â”€
      return (function() {
const d = labToolData.molecule;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, molecule: { ...prev.molecule, [key]: val } }));

          const W = 400, H = 300;

          const mode = d.moleculeMode || 'viewer';

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('molecule', 'init', {
              first: 'Molecule Lab loaded. ' + (mode === 'viewer' ? 'Viewer mode active. Choose a molecule preset to view its 3D model.' : 'Current mode: ' + mode + '.'),
              repeat: 'Molecule Lab, mode: ' + mode + '.',
              terse: 'Molecule Lab.'
            }, { debounce: 800 });
          }

          // ═══ Enhanced state ═══
          const researchPoints = d.researchPoints || 0;
          const totalRP = d.totalRP || 0;
          const completedChallenges = d.completedChallenges || [];
          const tutorialStep = d.tutorialStep || 0;
          const tutorialDismissed = d.tutorialDismissed || false;
          const reactionsBalanced = d.reactionsBalanced || 0;
          const currentReactionIdx = d.currentReactionIdx || 0;
          const reactionCoeffs = d.reactionCoeffs || null;
          const reactionResult = d.reactionResult || null;
          const updMulti = (obj) => setLabToolData(prev => ({ ...prev, molecule: { ...prev.molecule, ...obj } }));
          const isDark = !!(props && props.darkMode);

          // ═══ Keyboard Shortcuts ═══
          // Note: these execute on every render but are lightweight
          const SHORTCUTS = { '1': 'viewer', '2': 'creator', '3': 'build', '4': 'table', '5': 'reactions' };
          if (typeof window !== 'undefined' && !window._molKbBound) {
            window._molKbBound = true;
            document.addEventListener('keydown', function(e) {
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
              if (e.altKey && SHORTCUTS[e.key]) {
                e.preventDefault();
                upd('moleculeMode', SHORTCUTS[e.key]);
              }
            });
          }
          const aiQuestion = d.aiQuestion || '';
          const aiAnswer = d.aiAnswer || '';
          const aiLoading = d.aiLoading || false;

          // â”€â”€ Periodic Table Data (118 elements) â”€â”€

          const ELEMENTS = [

            { n: 1, s: 'H', name: t('stem.periodic.hydrogen'), cat: 'nonmetal', c: '#60a5fa' }, { n: 2, s: 'He', name: t('stem.periodic.helium'), cat: 'noble', c: '#c084fc' },

            { n: 3, s: 'Li', name: t('stem.periodic.lithium'), cat: 'alkali', c: '#f87171' }, { n: 4, s: 'Be', name: t('stem.periodic.beryllium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 5, s: 'B', name: t('stem.periodic.boron'), cat: 'metalloid', c: '#34d399' }, { n: 6, s: 'C', name: t('stem.periodic.carbon'), cat: 'nonmetal', c: '#60a5fa' },

            { n: 7, s: 'N', name: t('stem.periodic.nitrogen'), cat: 'nonmetal', c: '#60a5fa' }, { n: 8, s: 'O', name: t('stem.periodic.oxygen'), cat: 'nonmetal', c: '#60a5fa' },

            { n: 9, s: 'F', name: t('stem.periodic.fluorine'), cat: 'halogen', c: '#2dd4bf' }, { n: 10, s: 'Ne', name: t('stem.periodic.neon'), cat: 'noble', c: '#c084fc' },

            { n: 11, s: 'Na', name: t('stem.periodic.sodium'), cat: 'alkali', c: '#f87171' }, { n: 12, s: 'Mg', name: t('stem.periodic.magnesium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 13, s: 'Al', name: t('stem.periodic.aluminum'), cat: 'metal', c: '#94a3b8' }, { n: 14, s: 'Si', name: t('stem.periodic.silicon'), cat: 'metalloid', c: '#34d399' },

            { n: 15, s: 'P', name: t('stem.periodic.phosphorus'), cat: 'nonmetal', c: '#60a5fa' }, { n: 16, s: 'S', name: t('stem.periodic.sulfur'), cat: 'nonmetal', c: '#60a5fa' },

            { n: 17, s: 'Cl', name: t('stem.periodic.chlorine'), cat: 'halogen', c: '#2dd4bf' }, { n: 18, s: 'Ar', name: t('stem.periodic.argon'), cat: 'noble', c: '#c084fc' },

            { n: 19, s: 'K', name: t('stem.periodic.potassium'), cat: 'alkali', c: '#f87171' }, { n: 20, s: 'Ca', name: t('stem.periodic.calcium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 21, s: 'Sc', name: t('stem.periodic.scandium'), cat: 'transition', c: '#fb923c' }, { n: 22, s: 'Ti', name: t('stem.periodic.titanium'), cat: 'transition', c: '#fb923c' },

            { n: 23, s: 'V', name: t('stem.periodic.vanadium'), cat: 'transition', c: '#fb923c' }, { n: 24, s: 'Cr', name: t('stem.periodic.chromium'), cat: 'transition', c: '#fb923c' },

            { n: 25, s: 'Mn', name: t('stem.periodic.manganese'), cat: 'transition', c: '#fb923c' }, { n: 26, s: 'Fe', name: t('stem.periodic.iron'), cat: 'transition', c: '#fb923c' },

            { n: 27, s: 'Co', name: t('stem.periodic.cobalt'), cat: 'transition', c: '#fb923c' }, { n: 28, s: 'Ni', name: t('stem.periodic.nickel'), cat: 'transition', c: '#fb923c' },

            { n: 29, s: 'Cu', name: t('stem.periodic.copper'), cat: 'transition', c: '#fb923c' }, { n: 30, s: 'Zn', name: t('stem.periodic.zinc'), cat: 'transition', c: '#fb923c' },

            { n: 31, s: 'Ga', name: t('stem.periodic.gallium'), cat: 'metal', c: '#94a3b8' }, { n: 32, s: 'Ge', name: t('stem.periodic.germanium'), cat: 'metalloid', c: '#34d399' },

            { n: 33, s: 'As', name: t('stem.periodic.arsenic'), cat: 'metalloid', c: '#34d399' }, { n: 34, s: 'Se', name: t('stem.periodic.selenium'), cat: 'nonmetal', c: '#60a5fa' },

            { n: 35, s: 'Br', name: t('stem.periodic.bromine'), cat: 'halogen', c: '#2dd4bf' }, { n: 36, s: 'Kr', name: t('stem.periodic.krypton'), cat: 'noble', c: '#c084fc' },

            { n: 37, s: 'Rb', name: t('stem.periodic.rubidium'), cat: 'alkali', c: '#f87171' }, { n: 38, s: 'Sr', name: t('stem.periodic.strontium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 39, s: 'Y', name: t('stem.periodic.yttrium'), cat: 'transition', c: '#fb923c' }, { n: 40, s: 'Zr', name: t('stem.periodic.zirconium'), cat: 'transition', c: '#fb923c' },

            { n: 41, s: 'Nb', name: t('stem.periodic.niobium'), cat: 'transition', c: '#fb923c' }, { n: 42, s: 'Mo', name: t('stem.periodic.molybdenum'), cat: 'transition', c: '#fb923c' },

            { n: 43, s: 'Tc', name: t('stem.periodic.technetium'), cat: 'transition', c: '#fb923c' }, { n: 44, s: 'Ru', name: t('stem.periodic.ruthenium'), cat: 'transition', c: '#fb923c' },

            { n: 45, s: 'Rh', name: t('stem.periodic.rhodium'), cat: 'transition', c: '#fb923c' }, { n: 46, s: 'Pd', name: t('stem.periodic.palladium'), cat: 'transition', c: '#fb923c' },

            { n: 47, s: 'Ag', name: t('stem.periodic.silver'), cat: 'transition', c: '#fb923c' }, { n: 48, s: 'Cd', name: t('stem.periodic.cadmium'), cat: 'transition', c: '#fb923c' },

            { n: 49, s: 'In', name: t('stem.periodic.indium'), cat: 'metal', c: '#94a3b8' }, { n: 50, s: 'Sn', name: 'Tin', cat: 'metal', c: '#94a3b8' },

            { n: 51, s: 'Sb', name: t('stem.periodic.antimony'), cat: 'metalloid', c: '#34d399' }, { n: 52, s: 'Te', name: t('stem.periodic.tellurium'), cat: 'metalloid', c: '#34d399' },

            { n: 53, s: 'I', name: t('stem.periodic.iodine'), cat: 'halogen', c: '#2dd4bf' }, { n: 54, s: 'Xe', name: t('stem.periodic.xenon'), cat: 'noble', c: '#c084fc' },

            { n: 55, s: 'Cs', name: t('stem.periodic.cesium'), cat: 'alkali', c: '#f87171' }, { n: 56, s: 'Ba', name: t('stem.periodic.barium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 57, s: 'La', name: t('stem.periodic.lanthanide'), cat: 'lanthanide', c: '#a78bfa' }, { n: 58, s: 'Ce', name: t('stem.periodic.cerium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 59, s: 'Pr', name: t('stem.periodic.praseodymium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 60, s: 'Nd', name: t('stem.periodic.neodymium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 61, s: 'Pm', name: t('stem.periodic.promethium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 62, s: 'Sm', name: t('stem.periodic.samarium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 63, s: 'Eu', name: t('stem.periodic.europium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 64, s: 'Gd', name: t('stem.periodic.gadolinium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 65, s: 'Tb', name: t('stem.periodic.terbium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 66, s: 'Dy', name: t('stem.periodic.dysprosium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 67, s: 'Ho', name: t('stem.periodic.holmium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 68, s: 'Er', name: t('stem.periodic.erbium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 69, s: 'Tm', name: t('stem.periodic.thulium'), cat: 'lanthanide', c: '#a78bfa' }, { n: 70, s: 'Yb', name: t('stem.periodic.ytterbium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 71, s: 'Lu', name: t('stem.periodic.lutetium'), cat: 'lanthanide', c: '#a78bfa' },

            { n: 72, s: 'Hf', name: t('stem.periodic.hafnium'), cat: 'transition', c: '#fb923c' }, { n: 73, s: 'Ta', name: t('stem.periodic.tantalum'), cat: 'transition', c: '#fb923c' },

            { n: 74, s: 'W', name: t('stem.periodic.tungsten'), cat: 'transition', c: '#fb923c' }, { n: 75, s: 'Re', name: t('stem.periodic.rhenium'), cat: 'transition', c: '#fb923c' },

            { n: 76, s: 'Os', name: t('stem.periodic.osmium'), cat: 'transition', c: '#fb923c' }, { n: 77, s: 'Ir', name: t('stem.periodic.iridium'), cat: 'transition', c: '#fb923c' },

            { n: 78, s: 'Pt', name: t('stem.periodic.platinum'), cat: 'transition', c: '#fb923c' }, { n: 79, s: 'Au', name: t('stem.periodic.gold'), cat: 'transition', c: '#fb923c' },

            { n: 80, s: 'Hg', name: t('stem.periodic.mercury'), cat: 'transition', c: '#fb923c' }, { n: 81, s: 'Tl', name: t('stem.periodic.thallium'), cat: 'metal', c: '#94a3b8', gravity: '0.38g', atmosphere: 'None \u2014 no significant atmosphere', surface: 'Heavily cratered, resembling the Moon', notableFeatures: ['Caloris Basin (1,550 km crater)', 'Ice in permanently shadowed craters', 'Fastest orbital speed: 47 km/s'], skyColor: '#000000', terrainColor: '#7a7a7a', terrainType: 'cratered', surfaceDesc: 'Grey cratered wasteland under a black sky. The Sun appears 3x larger than on Earth.' },

            { n: 82, s: 'Pb', name: t('stem.periodic.lead'), cat: 'metal', c: '#94a3b8' }, { n: 83, s: 'Bi', name: t('stem.periodic.bismuth'), cat: 'metal', c: '#94a3b8' },

            { n: 84, s: 'Po', name: t('stem.periodic.polonium'), cat: 'metalloid', c: '#34d399' }, { n: 85, s: 'At', name: t('stem.periodic.astatine'), cat: 'halogen', c: '#2dd4bf' },

            { n: 86, s: 'Rn', name: t('stem.periodic.radon'), cat: 'noble', c: '#c084fc' },

            { n: 87, s: 'Fr', name: t('stem.periodic.francium'), cat: 'alkali', c: '#f87171' }, { n: 88, s: 'Ra', name: t('stem.periodic.radium'), cat: 'alkaline', c: '#fbbf24' },

            { n: 89, s: 'Ac', name: t('stem.periodic.actinide'), cat: 'actinide', c: '#f472b6' }, { n: 90, s: 'Th', name: t('stem.periodic.thorium'), cat: 'actinide', c: '#f472b6' },

            { n: 91, s: 'Pa', name: t('stem.periodic.protactinium'), cat: 'actinide', c: '#f472b6' }, { n: 92, s: 'U', name: t('stem.periodic.uranium'), cat: 'actinide', c: '#f472b6' },

            { n: 93, s: 'Np', name: t('stem.periodic.neptunium'), cat: 'actinide', c: '#f472b6' }, { n: 94, s: 'Pu', name: t('stem.periodic.plutonium'), cat: 'actinide', c: '#f472b6' },

            { n: 95, s: 'Am', name: t('stem.periodic.americium'), cat: 'actinide', c: '#f472b6' }, { n: 96, s: 'Cm', name: t('stem.periodic.curium'), cat: 'actinide', c: '#f472b6' },

            { n: 97, s: 'Bk', name: t('stem.periodic.berkelium'), cat: 'actinide', c: '#f472b6' }, { n: 98, s: 'Cf', name: t('stem.periodic.californium'), cat: 'actinide', c: '#f472b6' },

            { n: 99, s: 'Es', name: t('stem.periodic.einsteinium'), cat: 'actinide', c: '#f472b6' }, { n: 100, s: 'Fm', name: t('stem.periodic.fermium'), cat: 'actinide', c: '#f472b6' },

            { n: 101, s: 'Md', name: t('stem.periodic.mendelevium'), cat: 'actinide', c: '#f472b6' }, { n: 102, s: 'No', name: t('stem.periodic.nobelium'), cat: 'actinide', c: '#f472b6' },

            { n: 103, s: 'Lr', name: t('stem.periodic.lawrencium'), cat: 'actinide', c: '#f472b6' },

            { n: 104, s: 'Rf', name: t('stem.periodic.rutherfordium'), cat: 'transition', c: '#fb923c' }, { n: 105, s: 'Db', name: t('stem.periodic.dubnium'), cat: 'transition', c: '#fb923c' },

            { n: 106, s: 'Sg', name: t('stem.periodic.seaborgium'), cat: 'transition', c: '#fb923c' }, { n: 107, s: 'Bh', name: t('stem.periodic.bohrium'), cat: 'transition', c: '#fb923c' },

            { n: 108, s: 'Hs', name: t('stem.periodic.hassium'), cat: 'transition', c: '#fb923c' }, { n: 109, s: 'Mt', name: t('stem.periodic.meitnerium'), cat: 'transition', c: '#fb923c' },

            { n: 110, s: 'Ds', name: t('stem.periodic.darmstadtium'), cat: 'transition', c: '#fb923c' }, { n: 111, s: 'Rg', name: t('stem.periodic.roentgenium'), cat: 'transition', c: '#fb923c' },

            { n: 112, s: 'Cn', name: t('stem.periodic.copernicium'), cat: 'transition', c: '#fb923c' }, { n: 113, s: 'Nh', name: t('stem.periodic.nihonium'), cat: 'metal', c: '#94a3b8' },

            { n: 114, s: 'Fl', name: t('stem.periodic.flerovium'), cat: 'metal', c: '#94a3b8' }, { n: 115, s: 'Mc', name: t('stem.periodic.moscovium'), cat: 'metal', c: '#94a3b8' },

            { n: 116, s: 'Lv', name: t('stem.periodic.livermorium'), cat: 'metal', c: '#94a3b8' }, { n: 117, s: 'Ts', name: t('stem.periodic.tennessine'), cat: 'halogen', c: '#2dd4bf' },

            { n: 118, s: 'Og', name: t('stem.periodic.oganesson'), cat: 'noble', c: '#c084fc' }

          ];



          // â”€â”€ Element Details (descriptions, uses, compounds) â”€â”€

          const ELEMENT_DETAILS = {

            H: { desc: t('stem.periodic.lightest_element_fuels_stars_via'), uses: ['Fuel cells', 'Rocket propellant', 'Ammonia production'], compounds: ['H₂O (Water)', 'HCl (Hydrochloric Acid)', 'NH₃ (Ammonia)', 'CH₄ (Methane)'] },

            He: { desc: t('stem.periodic.inert_noble_gas_2nd_most'), uses: ['Balloons & blimps', 'MRI coolant', 'Deep-sea diving gas'], compounds: ['None (noble gas â€” does not form compounds)'] },

            Li: { desc: t('stem.periodic.lightest_metal_soft_enough_to'), uses: ['Rechargeable batteries', 'Mood-stabilizing medication', 'Ceramics & glass'], compounds: ['LiOH (Lithium Hydroxide)', 'Li₂CO₃ (Lithium Carbonate)'] },

            Be: { desc: t('stem.periodic.rare_toxic_metal_that_is'), uses: ['Aerospace alloys', 'X-ray windows', 'Satellite components'], compounds: ['BeO (Beryllium Oxide)'] },

            B: { desc: t('stem.periodic.metalloid_essential_for_plant_growth'), uses: ['Borosilicate glass (Pyrex)', 'Cleaning products (borax)', 'Semiconductors'], compounds: ['B₂O₃ (Boron Trioxide)', 'H₃BO₃ (Boric Acid)'] },

            C: { desc: t('stem.periodic.basis_of_all_known_life'), uses: ['Steel production', 'Graphite pencils', 'Carbon fiber composites'], compounds: ['CO₂ (Carbon Dioxide)', 'CH₄ (Methane)', 'C₆H₁₂O₆ (Glucose)', 'CaCO₃ (Limestone)'] },

            N: { desc: t('stem.periodic.makes_up_78_of_earth') + "'s atmosphere", uses: ['Fertilizers', 'Explosives(TNT)', 'Food preservation'], compounds: ['NH₃ (Ammonia)', 'NO₂ (Nitrogen Dioxide)', 'N₂O(Laughing Gas)', 'HNO₃ (Nitric Acid)'] },

            O: { desc: t('stem.periodic.essential_for_respiration_most_abundant') + "'s crust", uses: ['Medical oxygen', 'Welding & cutting', 'Water purification'], compounds: ['H₂O(Water)', 'CO₂ (Carbon Dioxide)', 'Fe₂O₃(Rust)', 'O₃(Ozone)'] },

            F: { desc: t('stem.periodic.most_reactive_and_electronegative_element'), uses: ['Toothpaste (fluoride)', 'Teflon coatings', 'Refrigerants'], compounds: ['HF (Hydrofluoric Acid)', 'NaF (Sodium Fluoride)', 'CF₄ (Carbon Tetrafluoride)'] },

            Ne: { desc: t('stem.periodic.produces_iconic_reddishorange_glow_in'), uses: ['Neon signs', 'High-voltage indicators', 'Laser technology'], compounds: ['None (noble gas)'] },

            Na: { desc: t('stem.periodic.soft_silvery_metal_that_reacts'), uses: ['Table salt (NaCl)', 'Street lighting', 'Baking soda'], compounds: ['NaCl (Table Salt)', 'NaOH (Lye)', 'NaHCO₃ (Baking Soda)', 'Na₂CO₃ (Washing Soda)'] },

            Mg: { desc: t('stem.periodic.lightweight_metal_that_burns_with'), uses: ['Alloy wheels', 'Fireworks & flares', 'Antacid tablets'], compounds: ['MgO (Magnesium Oxide)', 'MgSO₄ (Epsom Salt)', 'Mg(OH)₂ (Milk of Magnesia)'] },

            Al: { desc: t('stem.periodic.most_abundant_metal_in_earth') + "'s crust", uses: ['Cans & foil', 'Aircraft frames', 'Window frames'], compounds: ['Al₂O₃ (Alumina)', 'AlCl₃(Aluminum Chloride)'] },

            Si: { desc: t('stem.periodic.semiconductor_that_powers_the_digital'), uses: ['Computer chips', 'Solar panels', 'Glass & concrete'], compounds: ['SiO₂ (Sand/Quartz)', 'SiC (Silicon Carbide)'] },

            P: { desc: t('stem.periodic.essential_for_dna_and_bones'), uses: ['Fertilizers', 'Matches', 'Detergents'], compounds: ['H₃PO₄ (Phosphoric Acid)', 'Ca₃(PO₄)₂ (Bone mineral)'] },

            S: { desc: t('stem.periodic.yellow_element_with_distinctive_rottenegg'), uses: ['Vulcanizing rubber', 'Sulfuric acid production', 'Gunpowder'], compounds: ['H₂SO₄ (Sulfuric Acid)', 'SO₂ (Sulfur Dioxide)', 'H₂S (Hydrogen Sulfide)'] },

            Cl: { desc: t('stem.periodic.greenishyellow_gas_used_to_purify'), uses: ['Water treatment', 'PVC plastic', 'Bleach & disinfectants'], compounds: ['NaCl (Table Salt)', 'HCl (Hydrochloric Acid)', 'NaOCl (Bleach)'] },

            Ar: { desc: t('stem.periodic.third_most_abundant_gas_in'), uses: ['Welding shield gas', 'Light bulb filling', 'Window insulation'], compounds: ['None (noble gas)'] },

            K: { desc: t('stem.periodic.essential_nutrient_found_in_bananas'), uses: ['Fertilizers (potash)', 'Soap making', 'Food preservation'], compounds: ['KCl (Potassium Chloride)', 'KOH (Potassium Hydroxide)', 'KNO₃ (Saltpeter)'] },

            Ca: { desc: t('stem.periodic.builds_bones_and_teeth_5th'), uses: ['Cement & concrete', 'Chalk & plaster', 'Dietary supplement'], compounds: ['CaCO₃ (Limestone/Chalk)', 'CaO (Quicklime)', 'Ca(OH)₂ (Slaked Lime)', 'CaSO₄ (Gypsum)'] },

            Fe: { desc: t('stem.periodic.most_used_metal_core_of'), uses: ['Steel construction', 'Cast iron cookware', 'Magnetic devices'], compounds: ['Fe₂O₃ (Rust)', 'FeSO₄ (Iron Supplement)', 'Fe₃O₄ (Magnetite)'] },

            Cu: { desc: t('stem.periodic.reddish_metal_used_since_the'), uses: ['Electrical wiring', 'Plumbing pipes', 'Coins'], compounds: ['CuSO₄ (Blue Vitriol)', 'CuO (Copper Oxide)', 'Cu₂O (Cuprous Oxide)'] },

            Zn: { desc: t('stem.periodic.bluishwhite_metal_that_prevents_rust'), uses: ['Galvanizing steel', 'Batteries', 'Sunscreen (zinc oxide)'], compounds: ['ZnO (Zinc Oxide)', 'ZnS (Zinc Sulfide)', 'ZnCl₂ (Zinc Chloride)'] },

            Ag: { desc: t('stem.periodic.best_conductor_of_electricity_among'), uses: ['Jewelry & silverware', 'Photography', 'Electronics'], compounds: ['AgNO₃ (Silver Nitrate)', 'AgCl (Silver Chloride)', 'Ag₂O (Silver Oxide)'] },

            Au: { desc: t('stem.periodic.dense_soft_shiny_precious_metal'), uses: ['Jewelry', 'Electronics (connectors)', 'Currency reserves'], compounds: ['AuCl₃ (Gold Chloride) â€” gold rarely forms compounds'] },

            Ti: { desc: t('stem.periodic.strong_as_steel_but_45'), uses: ['Aircraft & spacecraft', 'Joint replacements', 'Titanium white paint'], compounds: ['TiO₂ (Titanium Dioxide)', 'TiCl₄ (Titanium Tetrachloride)'] },

            Cr: { desc: t('stem.periodic.shiny_metal_that_gives_rubies'), uses: ['Chrome plating', 'Stainless steel', 'Leather tanning'], compounds: ['Cr₂O₃ (Chromium Oxide)', 'K₂Cr₂O₇ (Potassium Dichromate)'] },

            Mn: { desc: t('stem.periodic.essential_for_steel_production_and'), uses: ['Steel alloys', 'Alkaline batteries', 'Glass decolorizer'], compounds: ['MnO₂ (Manganese Dioxide)', 'KMnO₄ (Potassium Permanganate)'] },

            Ni: { desc: t('stem.periodic.corrosionresistant_metal_used_in_coins'), uses: ['Stainless steel', 'Rechargeable batteries', 'Coins'], compounds: ['NiO (Nickel Oxide)', 'NiSO₄ (Nickel Sulfate)'] },

            Br: { desc: t('stem.periodic.only_nonmetal_liquid_at_room'), uses: ['Flame retardants', 'Photography', 'Water purification'], compounds: ['NaBr (Sodium Bromide)', 'HBr (Hydrobromic Acid)'] },

            I: { desc: t('stem.periodic.essential_trace_element_for_thyroid'), uses: ['Antiseptic (tincture)', 'Iodized salt', 'Medical imaging'], compounds: ['KI (Potassium Iodide)', 'HI (Hydroiodic Acid)'] },

            Pt: { desc: t('stem.periodic.precious_metal_rarer_than_gold'), uses: ['Catalytic converters', 'Jewelry', 'Anti-cancer drugs'], compounds: ['PtCl₂ (Platinum Chloride)', 'H₂PtCl₆ (Chloroplatinic Acid)'] },

            U: { desc: t('stem.periodic.dense_radioactive_metal_that_powers'), uses: ['Nuclear power', 'Nuclear weapons', 'Radiation shielding'], compounds: ['UO₂ (Uranium Dioxide)', 'UF₆ (Uranium Hexafluoride)'] },

            Hg: { desc: t('stem.periodic.only_metal_liquid_at_room'), uses: ['Thermometers (historic)', 'Fluorescent lights', 'Dental amalgams'], compounds: ['HgCl₂ (Mercury Chloride)', 'HgO (Mercury Oxide)'] },

            Pb: { desc: t('stem.periodic.dense_soft_metal_once_used'), uses: ['Car batteries', 'Radiation shielding', 'Solder (lead-free now)'], compounds: ['PbO (Lead Oxide)', 'PbSO₄ (Lead Sulfate)'] },

            Sn: { desc: t('stem.periodic.soft_silvery_metal_used_since'), uses: ['Tin cans (coating)', 'Solder', 'Bronze alloy'], compounds: ['SnO₂ (Tin Oxide)', 'SnCl₂ (Tin Chloride)'] },

            W: { desc: t('stem.periodic.has_the_highest_melting_point'), uses: ['Light bulb filaments', 'Drill bits & cutting tools', 'Military armor'], compounds: ['WO₃ (Tungsten Trioxide)', 'WC (Tungsten Carbide)'] },

          };

          const getElementDetail = (sym) => ELEMENT_DETAILS[sym] || null;

          const getElementCompounds = (sym) => COMPOUNDS.filter(c => Object.keys(c.recipe).includes(sym));



          const getEl = (sym) => ELEMENTS.find(e => e.s === sym);

          // â”€â”€ Periodic Table layout (row, col) â”€â”€

          const PT_LAYOUT = [

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

          ,

            { name: 'Aspirin', formula: 'C₉H₈O₄', recipe: { C: 9, H: 8, O: 4 }, desc: 'Pain reliever & anti-inflammatory', emoji: '💊' },
            { name: 'Caffeine', formula: 'C₈H₁₀N₄O₂', recipe: { C: 8, H: 10, N: 4, O: 2 }, desc: 'The world\'s most popular stimulant', emoji: '☕' },
            { name: 'Citric Acid', formula: 'C₆H₈O₇', recipe: { C: 6, H: 8, O: 7 }, desc: 'Found in citrus fruits', emoji: '🍋' },
            { name: 'Urea', formula: 'CH₄N₂O', recipe: { C: 1, H: 4, N: 2, O: 1 }, desc: 'First organic compound synthesized', emoji: '🧪' },
            { name: 'Calcium Chloride', formula: 'CaCl₂', recipe: { Ca: 1, Cl: 2 }, desc: 'Road de-icer & cheese making', emoji: '❄️' },
            { name: 'Sodium Sulfate', formula: 'Na₂SO₄', recipe: { Na: 2, S: 1, O: 4 }, desc: 'Detergent additive', emoji: '🧴' },
            { name: 'Magnesium Hydroxide', formula: 'Mg(OH)₂', recipe: { Mg: 1, O: 2, H: 2 }, desc: 'Milk of magnesia (antacid)', emoji: '🥛' },
            { name: 'Aluminum Oxide', formula: 'Al₂O₃', recipe: { Al: 2, O: 3 }, desc: 'Corundum — ruby & sapphire', emoji: '💎' },
            { name: 'Silver Nitrate', formula: 'AgNO₃', recipe: { Ag: 1, N: 1, O: 3 }, desc: 'Photography & wound treatment', emoji: '📷' },
            { name: 'Potassium Permanganate', formula: 'KMnO₄', recipe: { K: 1, Mn: 1, O: 4 }, desc: 'Purple water purifier', emoji: '🟣' },
            { name: 'Zinc Oxide', formula: 'ZnO', recipe: { Zn: 1, O: 1 }, desc: 'Sunscreen & diaper cream', emoji: '☀️' },
            { name: 'Copper Oxide', formula: 'CuO', recipe: { Cu: 1, O: 1 }, desc: 'Black pigment in ceramics', emoji: '🎨' },
            { name: 'Iron Sulfate', formula: 'FeSO₄', recipe: { Fe: 1, S: 1, O: 4 }, desc: 'Iron supplement for anemia', emoji: '💊' },
            { name: 'Ammonium Chloride', formula: 'NH₄Cl', recipe: { N: 1, H: 4, Cl: 1 }, desc: 'Solder flux & cough drops', emoji: '🧪' },
            { name: 'Calcium Hydroxide', formula: 'Ca(OH)₂', recipe: { Ca: 1, O: 2, H: 2 }, desc: 'Slaked lime for mortar', emoji: '🪨' }];

          // â”€â”€ Compound Recipes â”€â”€

          const COMPOUNDS = [

            { name: t('stem.chem_balance.water'), formula: t('stem.periodic.hu2082o'), recipe: { H: 2, O: 1 }, desc: t('stem.periodic.essential_for_life'), emoji: '\uD83D\uDCA7' },

            { name: t('stem.periodic.carbon_dioxide'), formula: t('stem.periodic.cou2082'), recipe: { C: 1, O: 2 }, desc: t('stem.periodic.greenhouse_gas'), emoji: '\uD83C\uDF2B\uFE0F' },

            { name: t('stem.chem_balance.table_salt'), formula: t('stem.periodic.nacl'), recipe: { Na: 1, Cl: 1 }, desc: t('stem.periodic.sodium_chloride'), emoji: '\uD83E\uDDC2' },

            { name: t('stem.chem_balance.ammonia'), formula: t('stem.periodic.nhu2083'), recipe: { N: 1, H: 3 }, desc: t('stem.periodic.cleaning_agent'), emoji: '\uD83E\uDDEA' },

            { name: t('stem.periodic.methane'), formula: t('stem.periodic.chu2084'), recipe: { C: 1, H: 4 }, desc: t('stem.periodic.natural_gas'), emoji: '\uD83D\uDD25' },

            { name: t('stem.periodic.hydrogen_peroxide'), formula: 'H\u2082O\u2082', recipe: { H: 2, O: 2 }, desc: t('stem.periodic.disinfectant'), emoji: '\uD83E\uDE79' },

            { name: t('stem.periodic.ethanol'), formula: 'C\u2082H\u2085OH', recipe: { C: 2, H: 6, O: 1 }, desc: t('stem.periodic.alcohol'), emoji: '\uD83C\uDF7A' },

            { name: t('stem.periodic.sulfuric_acid'), formula: 'H\u2082SO\u2084', recipe: { H: 2, S: 1, O: 4 }, desc: t('stem.periodic.battery_acid'), emoji: '\u26A0\uFE0F' },

            { name: t('stem.periodic.glucose'), formula: 'C\u2086H\u2081\u2082O\u2086', recipe: { C: 6, H: 12, O: 6 }, desc: t('stem.periodic.blood_sugar'), emoji: '\uD83C\uDF6C' },

            { name: t('stem.periodic.baking_soda'), formula: 'NaHCO\u2083', recipe: { Na: 1, H: 1, C: 1, O: 3 }, desc: t('stem.periodic.sodium_bicarbonate'), emoji: '\uD83E\uDDC1' },

            { name: t('stem.chem_balance.calcium_carbonate'), formula: 'CaCO\u2083', recipe: { Ca: 1, C: 1, O: 3 }, desc: t('stem.periodic.chalk_marble'), emoji: '\uD83E\uDEA8' },

            { name: t('stem.chem_balance.iron_oxide'), formula: 'Fe\u2082O\u2083', recipe: { Fe: 2, O: 3 }, desc: t('stem.periodic.rust'), emoji: '\uD83D\uDFE5' },

            { name: t('stem.periodic.sodium_hydroxide'), formula: 'NaOH', recipe: { Na: 1, O: 1, H: 1 }, desc: t('stem.periodic.lye_caustic_soda'), emoji: '\uD83E\uDDEA' },

            { name: t('stem.periodic.hydrochloric_acid'), formula: 'HCl', recipe: { H: 1, Cl: 1 }, desc: t('stem.periodic.stomach_acid'), emoji: '\uD83E\uDE79' },

            { name: t('stem.periodic.acetic_acid'), formula: 'CH\u2083COOH', recipe: { C: 2, H: 4, O: 2 }, desc: t('stem.periodic.vinegar'), emoji: '\uD83E\uDD4B' },

            { name: t('stem.periodic.nitrogen_dioxide'), formula: 'NO\u2082', recipe: { N: 1, O: 2 }, desc: t('stem.periodic.brown_smog_gas'), emoji: '\uD83C\uDF2B\uFE0F' },

            { name: t('stem.periodic.sulfur_dioxide'), formula: 'SO\u2082', recipe: { S: 1, O: 2 }, desc: t('stem.periodic.acid_rain_precursor'), emoji: '\uD83C\uDF27\uFE0F' },

            { name: t('stem.periodic.ozone'), formula: 'O\u2083', recipe: { O: 3 }, desc: t('stem.periodic.uv_shield'), emoji: '\uD83D\uDEE1\uFE0F' },

            { name: t('stem.periodic.laughing_gas'), formula: 'N\u2082O', recipe: { N: 2, O: 1 }, desc: t('stem.periodic.nitrous_oxide'), emoji: '\uD83D\uDE02' },

            { name: t('stem.periodic.silicon_dioxide'), formula: 'SiO\u2082', recipe: { Si: 1, O: 2 }, desc: t('stem.periodic.sand_glass'), emoji: '\uD83C\uDFD6\uFE0F' },

          ];

          const selectedEls = d.selectedElements || {};

          // ═══ Chemical Reactions Database (10 reactions) ═══
          const REACTIONS = [
            { id: 'water_synth', name: 'Water Synthesis', emoji: '💧', type: 'Synthesis', difficulty: 1,
              desc: 'Hydrogen combines with oxygen to form water.',
              left: [{ formula: 'H₂', atoms: { H: 2 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              answer: [2, 1, 2] },
            { id: 'haber', name: 'Haber Process', emoji: '🌾', type: 'Synthesis', difficulty: 2,
              desc: 'Nitrogen and hydrogen form ammonia — feeds half the world!',
              left: [{ formula: 'N₂', atoms: { N: 2 } }, { formula: 'H₂', atoms: { H: 2 } }],
              right: [{ formula: 'NH₃', atoms: { N: 1, H: 3 } }],
              answer: [1, 3, 2] },
            { id: 'methane_combust', name: 'Methane Combustion', emoji: '🔥', type: 'Combustion', difficulty: 1,
              desc: 'Natural gas burns to produce CO₂ and water.',
              left: [{ formula: 'CH₄', atoms: { C: 1, H: 4 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'CO₂', atoms: { C: 1, O: 2 } }, { formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              answer: [1, 2, 1, 2] },
            { id: 'iron_rust', name: 'Rusting of Iron', emoji: '🟥', type: 'Synthesis', difficulty: 3,
              desc: 'Iron reacts with oxygen to form iron oxide (rust).',
              left: [{ formula: 'Fe', atoms: { Fe: 1 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'Fe₂O₃', atoms: { Fe: 2, O: 3 } }],
              answer: [4, 3, 2] },
            { id: 'salt_formation', name: 'Salt Formation', emoji: '🧂', type: 'Synthesis', difficulty: 1,
              desc: 'Sodium metal reacts with chlorine gas to make table salt.',
              left: [{ formula: 'Na', atoms: { Na: 1 } }, { formula: 'Cl₂', atoms: { Cl: 2 } }],
              right: [{ formula: 'NaCl', atoms: { Na: 1, Cl: 1 } }],
              answer: [2, 1, 2] },
            { id: 'propane_combust', name: 'Propane Combustion', emoji: '🔥', type: 'Combustion', difficulty: 3,
              desc: 'Propane burns — the BBQ grill reaction!',
              left: [{ formula: 'C₃H₈', atoms: { C: 3, H: 8 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'CO₂', atoms: { C: 1, O: 2 } }, { formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              answer: [1, 5, 3, 4] },
            { id: 'zinc_acid', name: 'Zinc in Acid', emoji: '⚗️', type: 'Single Replacement', difficulty: 2,
              desc: 'Zinc dissolves in hydrochloric acid, releasing hydrogen gas.',
              left: [{ formula: 'Zn', atoms: { Zn: 1 } }, { formula: 'HCl', atoms: { H: 1, Cl: 1 } }],
              right: [{ formula: 'ZnCl₂', atoms: { Zn: 1, Cl: 2 } }, { formula: 'H₂', atoms: { H: 2 } }],
              answer: [1, 2, 1, 1] },
            { id: 'neutralization', name: 'Neutralization', emoji: '⚖️', type: 'Double Replacement', difficulty: 1,
              desc: 'NaOH neutralizes HCl to form salt and water.',
              left: [{ formula: 'NaOH', atoms: { Na: 1, O: 1, H: 1 } }, { formula: 'HCl', atoms: { H: 1, Cl: 1 } }],
              right: [{ formula: 'NaCl', atoms: { Na: 1, Cl: 1 } }, { formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              answer: [1, 1, 1, 1] },
            { id: 'aluminum_oxide', name: 'Aluminum Oxidation', emoji: '✨', type: 'Synthesis', difficulty: 3,
              desc: 'Aluminum reacts with oxygen to form aluminum oxide.',
              left: [{ formula: 'Al', atoms: { Al: 1 } }, { formula: 'O₂', atoms: { O: 2 } }],
              right: [{ formula: 'Al₂O₃', atoms: { Al: 2, O: 3 } }],
              answer: [4, 3, 2] },
            { id: 'photosynthesis', name: 'Photosynthesis', emoji: '🌿', type: 'Synthesis', difficulty: 3,
              desc: 'Plants convert CO₂ and water into glucose and oxygen.',
              left: [{ formula: 'CO₂', atoms: { C: 1, O: 2 } }, { formula: 'H₂O', atoms: { H: 2, O: 1 } }],
              right: [{ formula: 'C₆H₁₂O₆', atoms: { C: 6, H: 12, O: 6 } }, { formula: 'O₂', atoms: { O: 2 } }],
              answer: [6, 6, 1, 6] }
          ];

          // ═══ Lab Challenges ═══
          const MOLECULE_CHALLENGES = [
            { id: 'first_discovery', emoji: '🧪', name: 'First Discovery', desc: 'Discover any compound', reward: 10,
              check: function() { return (d.discoveredCompounds || []).length >= 1; } },
            { id: 'chemist_10', emoji: '🧑‍🔬', name: 'Lab Chemist', desc: 'Discover 10 compounds', reward: 25,
              check: function() { return (d.discoveredCompounds || []).length >= 10; } },
            { id: 'master_chemist', emoji: '🏆', name: 'Master Chemist', desc: 'Discover all compounds', reward: 50,
              check: function() { return (d.discoveredCompounds || []).length >= COMPOUNDS.length; } },
            { id: 'quiz_streak', emoji: '🔥', name: 'Quiz Streak', desc: '5 correct in a row', reward: 20,
              check: function() { return (d.elStreak || 0) >= 5; } },
            { id: 'balance_3', emoji: '⚖️', name: 'Equation Balancer', desc: 'Balance 3 reactions', reward: 30,
              check: function() { return reactionsBalanced >= 3; } }
          ];

          // ═══ Reaction helpers ═══
          const checkBalance = (reaction, coeffs) => {
            const leftAtoms = {};
            const rightAtoms = {};
            reaction.left.forEach((term, i) => {
              const c = coeffs[i] || 1;
              Object.entries(term.atoms).forEach(([el, n]) => { leftAtoms[el] = (leftAtoms[el] || 0) + c * n; });
            });
            reaction.right.forEach((term, i) => {
              const c = coeffs[reaction.left.length + i] || 1;
              Object.entries(term.atoms).forEach(([el, n]) => { rightAtoms[el] = (rightAtoms[el] || 0) + c * n; });
            });
            const allEls = [...new Set([...Object.keys(leftAtoms), ...Object.keys(rightAtoms)])];
            return { balanced: allEls.every(el => (leftAtoms[el] || 0) === (rightAtoms[el] || 0)), leftAtoms, rightAtoms };
          };

          const getAtomBalance = (reaction, coeffs) => {
            const result = checkBalance(reaction, coeffs);
            const allEls = [...new Set([...Object.keys(result.leftAtoms), ...Object.keys(result.rightAtoms)])];
            return allEls.map(el => ({
              element: el, left: result.leftAtoms[el] || 0, right: result.rightAtoms[el] || 0,
              balanced: (result.leftAtoms[el] || 0) === (result.rightAtoms[el] || 0)
            }));
          };

          const initReaction = (idx) => {
            const r = REACTIONS[idx];
            const total = r.left.length + r.right.length;
            updMulti({ currentReactionIdx: idx, reactionCoeffs: Array(total).fill(1), reactionResult: null });
          };

          const setCoeff = (termIdx, delta) => {
            const coeffs = [...(reactionCoeffs || [])];
            coeffs[termIdx] = Math.max(1, Math.min(9, (coeffs[termIdx] || 1) + delta));
            updMulti({ reactionCoeffs: coeffs, reactionResult: null });
          };

          const submitReaction = () => {
            const r = REACTIONS[currentReactionIdx];
            const result = checkBalance(r, reactionCoeffs || []);
            if (result.balanced) {
              const newBal = reactionsBalanced + 1;
              const rpGain = r.difficulty * 10;
              updMulti({ reactionResult: 'correct', reactionsBalanced: newBal, researchPoints: researchPoints + rpGain, totalRP: totalRP + rpGain });
              addToast('✅ Balanced! +' + rpGain + ' RP', 'success');
              if (typeof awardStemXP === 'function') awardStemXP('molecule', 20, 'Balanced: ' + r.name);
              if (typeof stemCelebrate === 'function') stemCelebrate();
              checkMoleculeChallenges();
            } else {
              updMulti({ reactionResult: 'incorrect' });
              addToast('❌ Not balanced yet — check the atom counts!', 'warning');
            }
          };

          // ═══ Challenge checker ═══
          const checkMoleculeChallenges = () => {
            let newCompleted = [...completedChallenges];
            let rpGained = 0;
            MOLECULE_CHALLENGES.forEach(ch => {
              if (!newCompleted.includes(ch.id) && ch.check()) {
                newCompleted.push(ch.id);
                rpGained += ch.reward;
                addToast('🏆 ' + ch.name + '! +' + ch.reward + ' RP', 'success');
                if (typeof stemCelebrate === 'function') stemCelebrate();
              }
            });
            if (rpGained > 0) updMulti({ completedChallenges: newCompleted, researchPoints: researchPoints + rpGained, totalRP: totalRP + rpGained });
          };

          const advanceTutorial = () => upd('tutorialStep', Math.min(tutorialStep + 1, 4));
          const dismissTutorial = () => updMulti({ tutorialDismissed: true, tutorialStep: 0 });

          // ═══ Electron Configuration ═══
          const getElectronConfig = (atomicNum) => {
            const orbitals = ['1s','2s','2p','3s','3p','4s','3d','4p','5s','4d','5p','6s','4f','5d','6p','7s','5f','6d','7p'];
            const maxE = [2,2,6,2,6,2,10,6,2,10,6,2,14,10,6,2,14,10,6];
            let rem = atomicNum;
            const parts = [];
            for (let i = 0; i < orbitals.length && rem > 0; i++) {
              const e = Math.min(rem, maxE[i]);
              parts.push(orbitals[i] + e);
              rem -= e;
            }
            return parts.join(' ');
          };

          const getValenceElectrons = (atomicNum) => {
            const sc = [2, 8, 8, 18, 18, 32, 32];
            let rem = atomicNum;
            for (let i = 0; i < sc.length && rem > 0; i++) {
              if (rem <= sc[i]) return rem;
              rem -= sc[i];
            }
            return rem;
          };

          const ELECTRONEGATIVITY = { H:2.20,Li:0.98,Be:1.57,B:2.04,C:2.55,N:3.04,O:3.44,F:3.98,Na:0.93,Mg:1.31,Al:1.61,Si:1.90,P:2.19,S:2.58,Cl:3.16,K:0.82,Ca:1.00,Fe:1.83,Cu:1.90,Zn:1.65,Br:2.96,Ag:1.93,I:2.66,Au:2.54,Pt:2.28,Ti:1.54,Cr:1.66,Mn:1.55,Ni:1.91,Co:1.88 };

          // ═══ Atomic Masses (g/mol) ═══
          const ATOMIC_MASS = {
            H:1.008,He:4.003,Li:6.941,Be:9.012,B:10.81,C:12.011,N:14.007,O:15.999,F:18.998,Ne:20.180,
            Na:22.990,Mg:24.305,Al:26.982,Si:28.086,P:30.974,S:32.065,Cl:35.453,Ar:39.948,
            K:39.098,Ca:40.078,Sc:44.956,Ti:47.867,V:50.942,Cr:51.996,Mn:54.938,Fe:55.845,
            Co:58.933,Ni:58.693,Cu:63.546,Zn:65.38,Ga:69.723,Ge:72.630,As:74.922,Se:78.971,
            Br:79.904,Kr:83.798,Rb:85.468,Sr:87.62,Y:88.906,Zr:91.224,Nb:92.906,Mo:95.95,
            Tc:98,Ru:101.07,Rh:102.91,Pd:106.42,Ag:107.87,Cd:112.41,In:114.82,Sn:118.71,
            Sb:121.76,Te:127.60,I:126.90,Xe:131.29,Cs:132.91,Ba:137.33,La:138.91,Ce:140.12,
            Pr:140.91,Nd:144.24,Pm:145,Sm:150.36,Eu:151.96,Gd:157.25,Tb:158.93,Dy:162.50,
            Ho:164.93,Er:167.26,Tm:168.93,Yb:173.05,Lu:174.97,Hf:178.49,Ta:180.95,W:183.84,
            Re:186.21,Os:190.23,Ir:192.22,Pt:195.08,Au:196.97,Hg:200.59,Tl:204.38,Pb:207.2,
            Bi:208.98,Po:209,At:210,Rn:222,Fr:223,Ra:226,Ac:227,Th:232.04,Pa:231.04,U:238.03,
            Np:237,Pu:244,Am:243,Cm:247,Bk:247,Cf:251,Es:252,Fm:257,Md:258,No:259,Lr:266,
            Rf:267,Db:268,Sg:269,Bh:270,Hs:277,Mt:278,Ds:281,Rg:282,Cn:285,Nh:286,Fl:289,
            Mc:290,Lv:293,Ts:294,Og:294
          };

          // ═══ Molar Mass Calculator ═══
          const calcMolarMass = (atomCounts) => {
            let total = 0;
            Object.entries(atomCounts).forEach(([el, count]) => {
              total += (ATOMIC_MASS[el] || 0) * count;
            });
            return Math.round(total * 100) / 100;
          };

          // ═══ AI Chemistry Tutor ═══
          const askChemTutor = (question) => {
            if (!question || aiLoading) return;
            updMulti({ aiLoading: true, aiAnswer: '' });
            const gradeDesc = gradeLevel === 'K-2' ? 'a kindergarten to 2nd grade student' :
              gradeLevel === '3-5' ? 'a 3rd to 5th grade student' :
              gradeLevel === '6-8' ? 'a middle school student' : 'a high school student';
            const prompt = 'You are a friendly chemistry tutor for ' + gradeDesc + '. ' +
              'Answer this chemistry question concisely (2-3 sentences max): ' + question;
            if (typeof callGemini === 'function') {
              callGemini(prompt).then(function(answer) {
                updMulti({ aiAnswer: answer || 'I couldn\'t answer that. Try a different question!', aiLoading: false });
              }).catch(function() {
                updMulti({ aiAnswer: 'Oops! Something went wrong. Try again.', aiLoading: false });
              });
            } else {
              updMulti({ aiAnswer: 'AI tutor is not available right now.', aiLoading: false });
            }
          };

          // ═══ TTS Helper ═══
          const speakText = (text) => {
            if (typeof callTTS === 'function' && text) callTTS(text);
          };

          // ═══ Sound Helpers ═══
          const playBeep = () => { if (typeof stemBeep === 'function') stemBeep(); };
          const playCelebrate = () => { if (typeof stemCelebrate === 'function') stemCelebrate(); };

          const discovered = d.discoveredCompounds || [];

          const addElement = (sym) => { const cur = { ...selectedEls }; cur[sym] = (cur[sym] || 0) + 1; upd('selectedElements', cur); };

          const removeElement = (sym) => { const cur = { ...selectedEls }; if (cur[sym] > 1) cur[sym]--; else delete cur[sym]; upd('selectedElements', cur); };

          const clearElements = () => upd('selectedElements', {});

          const tryCraft = () => {

            const match = COMPOUNDS.find(c => {

              const rKeys = Object.keys(c.recipe); const sKeys = Object.keys(selectedEls);

              if (rKeys.length !== sKeys.length) return false;

              return rKeys.every(k => selectedEls[k] === c.recipe[k]);

            });

            if (match) {

              const isNew = !discovered.includes(match.formula);

              upd('craftResult', { success: true, compound: match, isNew });

              if (isNew) upd('discoveredCompounds', [...discovered, match.formula]);
              playBeep();
              checkMoleculeChallenges();

            } else {

              upd('craftResult', { success: false });

            }

          };

          const catColors = { nonmetal: 'bg-blue-100 text-blue-700 border-blue-200', noble: 'bg-purple-100 text-purple-700 border-purple-200', alkali: 'bg-red-100 text-red-700 border-red-200', alkaline: 'bg-yellow-100 text-yellow-700 border-yellow-200', transition: 'bg-orange-100 text-orange-700 border-orange-200', metal: 'bg-slate-200 text-slate-700 border-slate-300', metalloid: 'bg-emerald-100 text-emerald-700 border-emerald-200', halogen: 'bg-teal-100 text-teal-700 border-teal-200', lanthanide: 'bg-violet-100 text-violet-700 border-violet-200', actinide: 'bg-pink-100 text-pink-700 border-pink-200' };

          // â”€â”€ Molecule Viewer presets â”€â”€

          const viewerPresets = [

            { name: 'H₂O (Water)', atoms: [{ el: 'O', x: 200, y: 120, color: '#ef4444' }, { el: 'H', x: 140, y: 190, color: '#60a5fa' }, { el: 'H', x: 260, y: 190, color: '#60a5fa' }], bonds: [[0, 1], [0, 2]], formula: 'H₂O' },

            { name: 'CO₂ (Carbon Dioxide)', atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'O', x: 120, y: 150, color: '#ef4444' }, { el: 'O', x: 280, y: 150, color: '#ef4444' }], bonds: [[0, 1], [0, 2]], formula: 'CO₂' },

            { name: 'CH₄ (Methane)', atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'H', x: 200, y: 80, color: '#60a5fa' }, { el: 'H', x: 270, y: 180, color: '#60a5fa' }, { el: 'H', x: 130, y: 180, color: '#60a5fa' }, { el: 'H', x: 200, y: 220, color: '#60a5fa' }], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]], formula: 'CH₄' },

            { name: 'NaCl (Table Salt)', atoms: [{ el: 'Na', x: 160, y: 150, color: '#a855f7' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0, 1]], formula: 'NaCl' },

            { name: 'NH₃ (Ammonia)', atoms: [{ el: 'N', x: 200, y: 110, color: '#3b82f6' }, { el: 'H', x: 140, y: 185, color: '#94a3b8' }, { el: 'H', x: 200, y: 210, color: '#94a3b8' }, { el: 'H', x: 260, y: 185, color: '#94a3b8' }], bonds: [[0, 1], [0, 2], [0, 3]], formula: 'NH₃' },

            { name: 'O₂ (Oxygen Gas)', atoms: [{ el: 'O', x: 160, y: 150, color: '#ef4444' }, { el: 'O', x: 240, y: 150, color: '#ef4444' }], bonds: [[0, 1]], formula: 'O₂' },

            { name: 'N₂ (Nitrogen Gas)', atoms: [{ el: 'N', x: 155, y: 150, color: '#3b82f6' }, { el: 'N', x: 245, y: 150, color: '#3b82f6' }], bonds: [[0, 1]], formula: 'N₂' },

            { name: 'H₂O₂ (Hydrogen Peroxide)', atoms: [{ el: 'O', x: 160, y: 130, color: '#ef4444' }, { el: 'O', x: 240, y: 130, color: '#ef4444' }, { el: 'H', x: 110, y: 190, color: '#60a5fa' }, { el: 'H', x: 290, y: 190, color: '#60a5fa' }], bonds: [[0, 1], [0, 2], [1, 3]], formula: 'H₂O₂' },

            { name: 'HCl (Hydrochloric Acid)', atoms: [{ el: 'H', x: 160, y: 150, color: '#60a5fa' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0, 1]], formula: 'HCl' },

            { name: 'H₂SO₄ (Sulfuric Acid)', atoms: [{ el: 'S', x: 200, y: 140, color: '#facc15' }, { el: 'O', x: 130, y: 100, color: '#ef4444' }, { el: 'O', x: 270, y: 100, color: '#ef4444' }, { el: 'O', x: 130, y: 190, color: '#ef4444' }, { el: 'O', x: 270, y: 190, color: '#ef4444' }, { el: 'H', x: 80, y: 210, color: '#60a5fa' }, { el: 'H', x: 320, y: 210, color: '#60a5fa' }], bonds: [[0,1],[0,2],[0,3],[0,4],[3,5],[4,6]], formula: 'H₂SO₄' },

            { name: 'C₂H₅OH (Ethanol)', atoms: [{ el: 'C', x: 150, y: 140, color: '#1e293b' }, { el: 'C', x: 230, y: 140, color: '#1e293b' }, { el: 'O', x: 300, y: 140, color: '#ef4444' }, { el: 'H', x: 320, y: 200, color: '#60a5fa' }, { el: 'H', x: 110, y: 90, color: '#60a5fa' }, { el: 'H', x: 110, y: 190, color: '#60a5fa' }, { el: 'H', x: 190, y: 90, color: '#60a5fa' }], bonds: [[0,1],[1,2],[2,3],[0,4],[0,5],[0,6]], formula: 'C₂H₅OH' },

            { name: 'CaCO₃ (Calcium Carbonate)', atoms: [{ el: 'Ca', x: 100, y: 150, color: '#fbbf24' }, { el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'O', x: 200, y: 80, color: '#ef4444' }, { el: 'O', x: 270, y: 190, color: '#ef4444' }, { el: 'O', x: 130, y: 190, color: '#ef4444' }], bonds: [[0,4],[1,2],[1,3],[1,4]], formula: 'CaCO₃' },

            { name: 'C₆H₁₂O₆ (Glucose)', atoms: [{ el: 'C', x: 120, y: 110, color: '#1e293b' }, { el: 'C', x: 180, y: 110, color: '#1e293b' }, { el: 'C', x: 240, y: 110, color: '#1e293b' }, { el: 'O', x: 120, y: 180, color: '#ef4444' }, { el: 'O', x: 180, y: 180, color: '#ef4444' }, { el: 'O', x: 240, y: 180, color: '#ef4444' }, { el: 'H', x: 300, y: 110, color: '#60a5fa' }], bonds: [[0,1],[1,2],[0,3],[1,4],[2,5],[2,6]], formula: 'C₆H₁₂O₆' },

            { name: 'NaOH (Sodium Hydroxide)', atoms: [{ el: 'Na', x: 130, y: 150, color: '#a855f7' }, { el: 'O', x: 210, y: 150, color: '#ef4444' }, { el: 'H', x: 280, y: 150, color: '#60a5fa' }], bonds: [[0,1],[1,2]], formula: 'NaOH' },

            { name: 'Fe₂O₃ (Iron Oxide)', atoms: [{ el: 'Fe', x: 140, y: 120, color: '#fb923c' }, { el: 'Fe', x: 260, y: 120, color: '#fb923c' }, { el: 'O', x: 120, y: 200, color: '#ef4444' }, { el: 'O', x: 200, y: 200, color: '#ef4444' }, { el: 'O', x: 280, y: 200, color: '#ef4444' }], bonds: [[0,2],[0,3],[1,3],[1,4]], formula: 'Fe₂O₃' },

            { name: 'O₃ (Ozone)', atoms: [{ el: 'O', x: 130, y: 150, color: '#ef4444' }, { el: 'O', x: 200, y: 110, color: '#ef4444' }, { el: 'O', x: 270, y: 150, color: '#ef4444' }], bonds: [[0,1],[1,2]], formula: 'O₃' },

            { name: 'CO (Carbon Monoxide)', atoms: [{ el: 'C', x: 160, y: 150, color: '#1e293b' }, { el: 'O', x: 240, y: 150, color: '#ef4444' }], bonds: [[0,1]], formula: 'CO' },

            { name: 'NO₂ (Nitrogen Dioxide)', atoms: [{ el: 'N', x: 200, y: 110, color: '#3b82f6' }, { el: 'O', x: 140, y: 180, color: '#ef4444' }, { el: 'O', x: 260, y: 180, color: '#ef4444' }], bonds: [[0,1],[0,2]], formula: 'NO₂' },

            { name: 'SO₂ (Sulfur Dioxide)', atoms: [{ el: 'S', x: 200, y: 120, color: '#facc15' }, { el: 'O', x: 130, y: 180, color: '#ef4444' }, { el: 'O', x: 270, y: 180, color: '#ef4444' }], bonds: [[0,1],[0,2]], formula: 'SO₂' },

            { name: 'N₂O (Nitrous Oxide)', atoms: [{ el: 'N', x: 140, y: 150, color: '#3b82f6' }, { el: 'N', x: 200, y: 150, color: '#3b82f6' }, { el: 'O', x: 260, y: 150, color: '#ef4444' }], bonds: [[0,1],[1,2]], formula: 'N₂O' },

            { name: 'CH₃OH (Methanol)', atoms: [{ el: 'C', x: 160, y: 140, color: '#1e293b' }, { el: 'O', x: 240, y: 140, color: '#ef4444' }, { el: 'H', x: 300, y: 140, color: '#60a5fa' }, { el: 'H', x: 120, y: 90, color: '#60a5fa' }, { el: 'H', x: 120, y: 190, color: '#60a5fa' }, { el: 'H', x: 190, y: 80, color: '#60a5fa' }], bonds: [[0,1],[1,2],[0,3],[0,4],[0,5]], formula: 'CH₃OH' },

            { name: 'HNO₃ (Nitric Acid)', atoms: [{ el: 'N', x: 200, y: 130, color: '#3b82f6' }, { el: 'O', x: 140, y: 80, color: '#ef4444' }, { el: 'O', x: 270, y: 100, color: '#ef4444' }, { el: 'O', x: 200, y: 200, color: '#ef4444' }, { el: 'H', x: 260, y: 200, color: '#60a5fa' }], bonds: [[0,1],[0,2],[0,3],[3,4]], formula: 'HNO₃' },

            { name: 'H₃PO₄ (Phosphoric Acid)', atoms: [{ el: 'P', x: 200, y: 140, color: '#f97316' }, { el: 'O', x: 140, y: 80, color: '#ef4444' }, { el: 'O', x: 270, y: 90, color: '#ef4444' }, { el: 'O', x: 270, y: 195, color: '#ef4444' }, { el: 'O', x: 130, y: 195, color: '#ef4444' }, { el: 'H', x: 310, y: 60, color: '#60a5fa' }, { el: 'H', x: 320, y: 210, color: '#60a5fa' }, { el: 'H', x: 80, y: 210, color: '#60a5fa' }], bonds: [[0,1],[0,2],[0,3],[0,4],[2,5],[3,6],[4,7]], formula: 'H₃PO₄' },

            { name: 'C₃H₈ (Propane)', atoms: [{ el: 'C', x: 130, y: 140, color: '#1e293b' }, { el: 'C', x: 200, y: 140, color: '#1e293b' }, { el: 'C', x: 270, y: 140, color: '#1e293b' }, { el: 'H', x: 100, y: 90, color: '#60a5fa' }, { el: 'H', x: 100, y: 190, color: '#60a5fa' }, { el: 'H', x: 130, y: 210, color: '#60a5fa' }, { el: 'H', x: 200, y: 90, color: '#60a5fa' }, { el: 'H', x: 200, y: 190, color: '#60a5fa' }, { el: 'H', x: 300, y: 90, color: '#60a5fa' }, { el: 'H', x: 300, y: 190, color: '#60a5fa' }, { el: 'H', x: 270, y: 210, color: '#60a5fa' }], bonds: [[0,1],[1,2],[0,3],[0,4],[0,5],[1,6],[1,7],[2,8],[2,9],[2,10]], formula: 'C₃H₈' },

            { name: 'C₄H₁₀ (Butane)', atoms: [{ el: 'C', x: 100, y: 140, color: '#1e293b' }, { el: 'C', x: 170, y: 140, color: '#1e293b' }, { el: 'C', x: 240, y: 140, color: '#1e293b' }, { el: 'C', x: 310, y: 140, color: '#1e293b' }, { el: 'H', x: 70, y: 100, color: '#60a5fa' }, { el: 'H', x: 70, y: 180, color: '#60a5fa' }, { el: 'H', x: 100, y: 210, color: '#60a5fa' }, { el: 'H', x: 170, y: 100, color: '#60a5fa' }, { el: 'H', x: 170, y: 195, color: '#60a5fa' }, { el: 'H', x: 240, y: 100, color: '#60a5fa' }, { el: 'H', x: 240, y: 195, color: '#60a5fa' }, { el: 'H', x: 340, y: 100, color: '#60a5fa' }, { el: 'H', x: 340, y: 180, color: '#60a5fa' }, { el: 'H', x: 310, y: 210, color: '#60a5fa' }], bonds: [[0,1],[1,2],[2,3],[0,4],[0,5],[0,6],[1,7],[1,8],[2,9],[2,10],[3,11],[3,12],[3,13]], formula: 'C₄H₁₀' },

            { name: 'SiO₂ (Silicon Dioxide)', atoms: [{ el: 'Si', x: 200, y: 150, color: '#34d399' }, { el: 'O', x: 130, y: 150, color: '#ef4444' }, { el: 'O', x: 270, y: 150, color: '#ef4444' }], bonds: [[0,1],[0,2]], formula: 'SiO₂' },

            { name: 'KCl (Potassium Chloride)', atoms: [{ el: 'K', x: 160, y: 150, color: '#f87171' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0,1]], formula: 'KCl' },

            { name: 'MgO (Magnesium Oxide)', atoms: [{ el: 'Mg', x: 160, y: 150, color: '#fbbf24' }, { el: 'O', x: 240, y: 150, color: '#ef4444' }], bonds: [[0,1]], formula: 'MgO' },

            { name: 'NaHCO₃ (Baking Soda)', atoms: [{ el: 'Na', x: 80, y: 150, color: '#a855f7' }, { el: 'O', x: 150, y: 150, color: '#ef4444' }, { el: 'C', x: 220, y: 150, color: '#1e293b' }, { el: 'O', x: 220, y: 80, color: '#ef4444' }, { el: 'O', x: 290, y: 150, color: '#ef4444' }, { el: 'H', x: 340, y: 150, color: '#60a5fa' }], bonds: [[0,1],[1,2],[2,3],[2,4],[4,5]], formula: 'NaHCO₃' },

            { name: 'CH₃COOH (Acetic Acid)', atoms: [{ el: 'C', x: 140, y: 140, color: '#1e293b' }, { el: 'C', x: 220, y: 140, color: '#1e293b' }, { el: 'O', x: 220, y: 70, color: '#ef4444' }, { el: 'O', x: 290, y: 160, color: '#ef4444' }, { el: 'H', x: 340, y: 160, color: '#60a5fa' }, { el: 'H', x: 100, y: 95, color: '#60a5fa' }, { el: 'H', x: 100, y: 185, color: '#60a5fa' }, { el: 'H', x: 140, y: 210, color: '#60a5fa' }], bonds: [[0,1],[1,2],[1,3],[3,4],[0,5],[0,6],[0,7]], formula: 'CH₃COOH' },

            { name: 'KNO₃ (Potassium Nitrate)', atoms: [{ el: 'K', x: 100, y: 150, color: '#f87171' }, { el: 'N', x: 200, y: 130, color: '#3b82f6' }, { el: 'O', x: 160, y: 190, color: '#ef4444' }, { el: 'O', x: 240, y: 190, color: '#ef4444' }, { el: 'O', x: 200, y: 70, color: '#ef4444' }], bonds: [[0,2],[1,2],[1,3],[1,4]], formula: 'KNO₃' },

            { name: 'CuSO₄ (Copper Sulfate)', atoms: [{ el: 'Cu', x: 100, y: 150, color: '#fb923c' }, { el: 'S', x: 200, y: 140, color: '#facc15' }, { el: 'O', x: 160, y: 80, color: '#ef4444' }, { el: 'O', x: 260, y: 90, color: '#ef4444' }, { el: 'O', x: 260, y: 200, color: '#ef4444' }, { el: 'O', x: 140, y: 200, color: '#ef4444' }], bonds: [[0,5],[1,2],[1,3],[1,4],[1,5]], formula: 'CuSO₄' },

          ];



            

return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" + (isDark ? " dark-mode" : "") },
            React.createElement("div", { "aria-live": "polite", "aria-atomic": "true", style: { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" } }, d._srMsg || ""),

            // Header

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDD2C Molecule Lab"),

              discovered.length > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full" }, "\uD83E\uDDEA " + discovered.length + "/" + COMPOUNDS.length + " discovered"),

              totalRP > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full" }, "⭐ " + totalRP + " RP")

            ),

            // Mode tabs

            React.createElement("div", { className: "flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl" },

              [['viewer', '\uD83D\uDD2C Viewer'], ['creator', '\u2697\uFE0F Compound Creator'], ['build', '\uD83E\uDDF1 Build'], ['table', '\uD83D\uDDC2\uFE0F Periodic Table'], ['reactions', '⚗️ Reactions']].map(([m, label]) =>

                React.createElement("button", { "aria-label": "Switch to " + label + " mode", key: m, onClick: () => { upd('moleculeMode', m); if (typeof canvasNarrate === 'function') { canvasNarrate('molecule', 'mode_switch', { first: 'Switched to ' + label + ' mode.', repeat: label + ' mode.', terse: label + '.' }, { debounce: 500 }); } }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-700') }, label)

              )

            ),

            // â”€â”€ Viewer Mode â”€â”€

            mode === 'viewer' && React.createElement("div", null,

              React.createElement("div", { className: "flex gap-1 mb-3 flex-wrap" }, viewerPresets.map(p => React.createElement("button", { "aria-label": "View molecule: " + p.name, key: p.name, onClick: () => { upd('atoms', p.atoms.map(a => ({ ...a }))); upd('bonds', [...p.bonds]); upd('formula', p.formula); }, className: "px-2 py-1 rounded-lg text-xs font-bold " + (d.formula === p.formula ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200') }, p.name))),

              React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full bg-gradient-to-b from-slate-50 to-white rounded-xl border border-stone-200", style: { maxHeight: "300px" }, onMouseMove: e => { if (d.dragging !== null && d.dragging !== undefined) { const svg = e.currentTarget; const rect = svg.getBoundingClientRect(); const nx = (e.clientX - rect.left) / rect.width * W; const ny = (e.clientY - rect.top) / rect.height * H; const na = d.atoms.map((a, i) => i === d.dragging ? { ...a, x: Math.round(nx), y: Math.round(ny) } : a); upd("atoms", na); } }, onMouseUp: () => upd("dragging", null), onMouseLeave: () => upd("dragging", null) },

                (d.bonds || []).map((b, i) => d.atoms[b[0]] && d.atoms[b[1]] ? React.createElement("line", { key: 'b' + i, x1: d.atoms[b[0]].x, y1: d.atoms[b[0]].y, x2: d.atoms[b[1]].x, y2: d.atoms[b[1]].y, stroke: "#94a3b8", strokeWidth: 4, strokeLinecap: "round" }) : null),

                (d.atoms || []).map((a, i) => React.createElement("g", { key: i },

                  React.createElement("circle", { cx: a.x, cy: a.y, r: 24, fill: a.color || '#64748b', stroke: '#fff', strokeWidth: 3, style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', cursor: 'grab' }, onMouseDown: e => { e.preventDefault(); upd('dragging', i); } }),

                  React.createElement("text", { x: a.x, y: a.y + 5, textAnchor: "middle", fill: "white", style: { fontSize: '14px', fontWeight: 'bold' } }, a.el)

                ))

              ),

              React.createElement("div", { className: "mt-2 text-center" },

                React.createElement("span", { className: "text-sm font-bold text-slate-600" }, "Formula: "),

                React.createElement("span", { className: "text-lg font-bold text-slate-800" }, d.formula || '\u2014'),

              d.formula && d.atoms && React.createElement("span", { className: "ml-2 text-xs text-slate-600" },
                calcMolarMass((() => { const c = {}; (d.atoms || []).forEach(a => { c[a.el] = (c[a.el] || 0) + 1; }); return c; })()) + " g/mol"
              )
              )

            ),

            // â”€â”€ Compound Creator Mode â”€â”€

            mode === 'creator' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-3" }, "Select elements to craft compounds \u2014 discover real-world chemistry by combining atoms!"),

              // Element selector grid (common elements)

              React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-4" },

                ['H', 'C', 'N', 'O', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'K', 'Ca', 'Fe', 'Cu', 'Zn', 'Br', 'Ag', 'I', 'Au'].map(sym => {

                  const el = getEl(sym);

                  return React.createElement("button", { "aria-label": "Add Element", key: sym, onClick: () => addElement(sym), className: "w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold text-xs border-2 transition-all hover:scale-110 hover:shadow-md active:scale-95 " + (catColors[el?.cat] || 'bg-slate-100 text-slate-600 border-slate-200'), title: el?.name || sym },

                    React.createElement("span", { className: "text-sm font-black" }, sym),

                    React.createElement("span", { className: "text-[11px] opacity-70" }, el?.n || '')

                  );

                })

              ),

              // Selected elements display

              React.createElement("div", { className: "bg-white rounded-xl border-2 border-dashed border-slate-300 p-4 mb-4 min-h-[80px] flex items-center justify-center gap-2 flex-wrap" },

                Object.keys(selectedEls).length === 0

                  ? React.createElement("p", { className: "text-slate-600 text-sm italic" }, "Tap elements above to add them...")

                  : Object.entries(selectedEls).map(([sym, count]) => {

                    const el = getEl(sym);

                    return React.createElement("div", { key: sym, className: "flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1 border" },

                      React.createElement("span", { className: "w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm", style: { backgroundColor: el?.c || '#64748b' } }, sym),

                      React.createElement("span", { className: "text-lg font-black text-slate-700" }, "\u00D7" + count),

                      React.createElement("button", { "aria-label": "Remove Element", onClick: () => removeElement(sym), className: "ml-1 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs font-bold hover:bg-red-200 flex items-center justify-center" }, "\u2212")

                    );

                  })

              ),

              // Action buttons

              React.createElement("div", { className: "flex gap-2 mb-4" },

                React.createElement("button", { "aria-label": "Combine!", onClick: tryCraft, disabled: Object.keys(selectedEls).length === 0, className: "flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed" }, "\u2697\uFE0F Combine!"),

                React.createElement("button", { "aria-label": "Clear", onClick: clearElements, className: "px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors" }, "\uD83D\uDD04 Clear")

              ),

              // Craft result

              d.craftResult && (d.craftResult.success

                ? React.createElement("div", { className: "bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center animate-in zoom-in" },

                  React.createElement("p", { className: "text-3xl mb-1" }, d.craftResult.compound.emoji),

                  React.createElement("p", { className: "text-lg font-black text-emerald-700" }, (d.craftResult.isNew ? '\uD83C\uDF89 NEW! ' : '\u2705 ') + d.craftResult.compound.name),

                  React.createElement("p", { className: "text-sm font-bold text-emerald-600" }, d.craftResult.compound.formula),

                  React.createElement("p", { className: "text-xs text-emerald-500 mt-1" }, d.craftResult.compound.desc),

                )

                : React.createElement("div", { className: "bg-amber-50 border-2 border-amber-200 rounded-xl p-3 text-center" },

                  React.createElement("p", { className: "text-sm font-bold text-amber-700" }, "\uD83E\uDD14 No known compound matches this combination. Try different elements!"))

              ),

              // Discovery log

              discovered.length > 0 && React.createElement("div", { className: "mt-4 bg-slate-50 rounded-xl p-3 border" },

                React.createElement("p", { className: "text-xs font-bold text-slate-600 mb-2" }, "\uD83D\uDCDA Discovery Log (" + discovered.length + "/" + COMPOUNDS.length + ")"),

                React.createElement("div", { className: "flex flex-wrap gap-1" },

                  COMPOUNDS.map(c => React.createElement("span", { key: c.formula, className: "px-2 py-0.5 rounded text-xs font-bold " + (discovered.includes(c.formula) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500') }, discovered.includes(c.formula) ? c.emoji + ' ' + c.name : '\uD83D\uDD12 ???'))

                )

              )

            ),

            // â”€â”€ Build Mode â”€â”€

            mode === 'build' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-2" }, "Drag atoms onto the canvas and draw bonds to build molecules! Click two atoms to connect them."),

              // Atom palette

              React.createElement("div", { className: "flex gap-1 mb-3 flex-wrap" },

                [

                  { sym: 'H', color: '#60a5fa', label: 'Hydrogen' },

                  { sym: 'C', color: '#1e293b', label: 'Carbon' },

                  { sym: 'N', color: '#3b82f6', label: 'Nitrogen' },

                  { sym: 'O', color: '#ef4444', label: 'Oxygen' },

                  { sym: 'S', color: '#facc15', label: 'Sulfur' },

                  { sym: 'P', color: '#f97316', label: 'Phosphorus' },

                  { sym: 'Cl', color: '#22c55e', label: 'Chlorine' },

                  { sym: 'Na', color: '#a855f7', label: 'Sodium' },

                  { sym: 'Ca', color: '#fbbf24', label: 'Calcium' },

                  { sym: 'Fe', color: '#fb923c', label: 'Iron' },

                  { sym: 'K', color: '#f87171', label: 'Potassium' },

                  { sym: 'Si', color: '#34d399', label: 'Silicon' },

                ].map(a => React.createElement("button", { "aria-label": "Add " + a.label + " atom to canvas",

                  key: a.sym,

                  onClick: () => {

                    const ba = d.buildAtoms || [];

                    // Place new atom at a random position in the canvas

                    const nx = 80 + Math.random() * (W - 160);

                    const ny = 60 + Math.random() * (H - 120);

                    upd('buildAtoms', [...ba, { el: a.sym, x: Math.round(nx), y: Math.round(ny), color: a.color }]);

                    upd('buildCheckResult', null);

                  },

                  className: "px-2 py-1.5 rounded-lg text-xs font-bold border-2 transition-all hover:scale-105 hover:shadow-md active:scale-95",

                  style: { borderColor: a.color, color: a.color, backgroundColor: a.color + '18' },

                  title: 'Add ' + a.label

                }, a.sym))

              ),

              // Canvas workspace

              React.createElement("svg", {

                viewBox: "0 0 " + W + " " + H,

                className: "w-full bg-gradient-to-b from-slate-50 to-white rounded-xl border-2 border-dashed border-slate-300 cursor-crosshair",

                style: { maxHeight: "320px", touchAction: 'none' },

                onMouseMove: e => {

                  if (d.buildDragging !== null && d.buildDragging !== undefined) {

                    const svg = e.currentTarget;

                    const rect = svg.getBoundingClientRect();

                    const nx = (e.clientX - rect.left) / rect.width * W;

                    const ny = (e.clientY - rect.top) / rect.height * H;

                    const na = (d.buildAtoms || []).map((a, i) => i === d.buildDragging ? { ...a, x: Math.max(20, Math.min(W - 20, Math.round(nx))), y: Math.max(20, Math.min(H - 20, Math.round(ny))) } : a);

                    upd('buildAtoms', na);

                  }

                },

                onMouseUp: () => upd('buildDragging', null),

                onMouseLeave: () => upd('buildDragging', null)

              },

                // Grid dots for visual guide

                Array.from({ length: 10 }, (_, r) => Array.from({ length: 13 }, (_, c) => React.createElement("circle", { key: 'g' + r + '-' + c, cx: 30 + c * 28, cy: 25 + r * 28, r: 1, fill: '#e2e8f0' }))).flat(),

                // Draw bonds

                (d.buildBonds || []).map((b, i) => {

                  const atoms = d.buildAtoms || [];

                  const a1 = atoms[b[0]], a2 = atoms[b[1]];

                  if (!a1 || !a2) return null;

                  const bondType = b[2] || 1; // 1=single, 2=double, 3=triple

                  const dx = a2.x - a1.x, dy = a2.y - a1.y;

                  const len = Math.sqrt(dx * dx + dy * dy) || 1;

                  const px = -dy / len, py = dx / len; // perpendicular

                  const bondLines = [];

                  if (bondType === 1) {

                    bondLines.push(React.createElement("line", { key: 'bl' + i, x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, stroke: "#64748b", strokeWidth: 3.5, strokeLinecap: "round" }));

                  } else if (bondType === 2) {

                    const off = 3;

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'a', x1: a1.x + px * off, y1: a1.y + py * off, x2: a2.x + px * off, y2: a2.y + py * off, stroke: "#64748b", strokeWidth: 2.5, strokeLinecap: "round" }));

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'b', x1: a1.x - px * off, y1: a1.y - py * off, x2: a2.x - px * off, y2: a2.y - py * off, stroke: "#64748b", strokeWidth: 2.5, strokeLinecap: "round" }));

                  } else {

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'a', x1: a1.x + px * 5, y1: a1.y + py * 5, x2: a2.x + px * 5, y2: a2.y + py * 5, stroke: "#64748b", strokeWidth: 2, strokeLinecap: "round" }));

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'b', x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, stroke: "#64748b", strokeWidth: 2, strokeLinecap: "round" }));

                    bondLines.push(React.createElement("line", { key: 'bl' + i + 'c', x1: a1.x - px * 5, y1: a1.y - py * 5, x2: a2.x - px * 5, y2: a2.y - py * 5, stroke: "#64748b", strokeWidth: 2, strokeLinecap: "round" }));

                  }

                  // Clickable hit area to cycle bond type

                  bondLines.push(React.createElement("line", {

                    key: 'bh' + i, x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y,

                    stroke: "transparent", strokeWidth: 12, style: { cursor: 'pointer' },

                    onClick: (e) => {

                      e.stopPropagation();

                      const nb = (d.buildBonds || []).map((bb, bi) => bi === i ? [bb[0], bb[1], ((bb[2] || 1) % 3) + 1] : bb);

                      upd('buildBonds', nb);

                      upd('buildCheckResult', null);

                    }

                  }));

                  return React.createElement("g", { key: 'bg' + i }, ...bondLines);

                }),

                // Draw atoms

                (d.buildAtoms || []).map((a, i) => {

                  const isSelected = d.buildBondFrom === i;

                  return React.createElement("g", { key: 'ba' + i },

                    // Selection ring

                    isSelected && React.createElement("circle", { cx: a.x, cy: a.y, r: 28, fill: "none", stroke: "#3b82f6", strokeWidth: 2, strokeDasharray: "4 2", className: "animate-spin" }),

                    // Atom circle

                    React.createElement("circle", {

                      cx: a.x, cy: a.y, r: 22, fill: a.color || '#64748b', stroke: isSelected ? '#3b82f6' : '#fff', strokeWidth: isSelected ? 3 : 2.5,

                      style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', cursor: 'grab' },

                      onMouseDown: e => {

                        e.preventDefault();

                        e.stopPropagation();

                        // If in bond-drawing mode

                        if (d.buildBondFrom !== null && d.buildBondFrom !== undefined && d.buildBondFrom !== i) {

                          // Create bond

                          const existingBonds = d.buildBonds || [];

                          const already = existingBonds.find(b => (b[0] === d.buildBondFrom && b[1] === i) || (b[0] === i && b[1] === d.buildBondFrom));

                          if (!already) {

                            upd('buildBonds', [...existingBonds, [d.buildBondFrom, i, 1]]);

                          }

                          upd('buildBondFrom', null);

                          upd('buildCheckResult', null);

                        } else {

                          upd('buildDragging', i);

                        }

                      }

                    }),

                    // Atom label

                    React.createElement("text", { x: a.x, y: a.y + 5, textAnchor: "middle", fill: "white", style: { fontSize: '13px', fontWeight: 'bold', pointerEvents: 'none' } }, a.el),

                    // Delete button (small x in corner)

                    React.createElement("g", {

                      onClick: e => {

                        e.stopPropagation();

                        const newAtoms = (d.buildAtoms || []).filter((_, ai) => ai !== i);

                        const newBonds = (d.buildBonds || []).filter(b => b[0] !== i && b[1] !== i).map(b => [b[0] > i ? b[0] - 1 : b[0], b[1] > i ? b[1] - 1 : b[1], b[2] || 1]);

                        upd('buildAtoms', newAtoms);

                        upd('buildBonds', newBonds);

                        if (d.buildBondFrom === i) upd('buildBondFrom', null);

                        upd('buildCheckResult', null);

                      },

                      style: { cursor: 'pointer' }

                    },

                      React.createElement("circle", { cx: a.x + 16, cy: a.y - 16, r: 7, fill: '#ef4444', stroke: '#fff', strokeWidth: 1.5 }),

                      React.createElement("text", { x: a.x + 16, y: a.y - 12.5, textAnchor: "middle", fill: "white", style: { fontSize: '11px', fontWeight: 'bold', pointerEvents: 'none' } }, "\u2715")

                    )

                  );

                }),

                // "Drawing bond from..." indicator line

                d.buildBondFrom !== null && d.buildBondFrom !== undefined && (d.buildAtoms || [])[d.buildBondFrom] && React.createElement("text", { x: W / 2, y: H - 10, textAnchor: "middle", fill: "#3b82f6", style: { fontSize: '10px', fontWeight: 'bold' } }, "\u{1F517} Click another atom to connect...")

              ),

              // Controls bar

              React.createElement("div", { className: "flex items-center gap-2 mt-3 flex-wrap" },

                // Bond draw button

                React.createElement("button", { "aria-label": (d.buildBondFrom !== null && d.buildBondFrom !== undefined ? "Cancel bond drawing" : "Enter bond drawing mode"),

                  onClick: () => {

                    if (d.buildBondFrom !== null && d.buildBondFrom !== undefined) {

                      upd('buildBondFrom', null);

                    } else {

                      // Enter bond mode â€” user must click first atom

                      upd('buildBondFrom', null);

                      addToast('\u{1F517} Click an atom to start a bond, then click another to connect.', 'info');

                    }

                  },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all " + (d.buildBondFrom !== null && d.buildBondFrom !== undefined ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200')

                }, "\u{1F517} " + (d.buildBondFrom !== null && d.buildBondFrom !== undefined ? 'Cancel Bond' : 'Draw Bond')),

                // Bond-from selector â€” click an atom first

                (d.buildAtoms || []).length >= 2 && d.buildBondFrom === null && React.createElement("div", { className: "flex gap-1" },

                  (d.buildAtoms || []).map((a, i) => React.createElement("button", { "aria-label": "Start bond from atom " + a.el,

                    key: 'bf' + i,

                    onClick: () => { upd('buildBondFrom', i); },

                    className: "w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold border-2 border-white hover:scale-110 transition-transform shadow-sm",

                    style: { backgroundColor: a.color },

                    title: 'Start bond from ' + a.el

                  }, a.el))

                ),

                // Clear all

                React.createElement("button", { "aria-label": "Clear All",

                  onClick: () => { upd('buildAtoms', []); upd('buildBonds', []); upd('buildBondFrom', null); upd('buildCheckResult', null); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all ml-auto"

                }, "\uD83D\uDDD1\uFE0F Clear All")

              ),

              // Running formula display

              (d.buildAtoms || []).length > 0 && (() => {

                const counts = {};

                (d.buildAtoms || []).forEach(a => { counts[a.el] = (counts[a.el] || 0) + 1; });

                // Standard chemistry ordering: C, H, then alphabetical

                const order = ['C', 'H'];

                const remaining = Object.keys(counts).filter(k => !order.includes(k)).sort();

                const sorted = [...order.filter(k => counts[k]), ...remaining];

                const formulaStr = sorted.map(k => k + (counts[k] > 1 ? counts[k] : '')).join('');

                return React.createElement("div", { className: "mt-3 bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between" },

                  React.createElement("div", null,

                    React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider" }, "Formula: "),

                    React.createElement("span", { className: "text-lg font-black text-slate-800 font-mono" }, formulaStr)

                  ),

                  React.createElement("div", { className: "flex items-center gap-1 text-[11px] text-slate-600" },

                    React.createElement("span", null, (d.buildAtoms || []).length + " atoms"),

                    React.createElement("span", null, "•"),
                    React.createElement("span", null, calcMolarMass((() => { const c = {}; (d.buildAtoms || []).forEach(a => { c[a.el] = (c[a.el] || 0) + 1; }); return c; })()) + " g/mol"),

                    React.createElement("span", null, "\u2022"),

                    React.createElement("span", null, (d.buildBonds || []).length + " bonds")

                  )

                );

              })(),

              // Check molecule button + result

              (d.buildAtoms || []).length > 0 && React.createElement("div", { className: "mt-3 flex gap-2" },

                React.createElement("button", { "aria-label": "Check built molecule",

                  onClick: () => {

                    const counts = {};

                    (d.buildAtoms || []).forEach(a => { counts[a.el] = (counts[a.el] || 0) + 1; });

                    const match = COMPOUNDS.find(c => {

                      const rKeys = Object.keys(c.recipe); const bKeys = Object.keys(counts);

                      if (rKeys.length !== bKeys.length) return false;

                      return rKeys.every(k => counts[k] === c.recipe[k]);

                    });

                    if (match) {

                      upd('buildCheckResult', { success: true, compound: match });

                      addToast('\u2705 You built ' + match.name + '!', 'success');

                      if (typeof awardStemXP === 'function') awardStemXP('molecule', 15, 'Built ' + match.name);

                      // Add to discovered

                      const disc = d.discoveredCompounds || [];

                      if (!disc.includes(match.formula)) upd('discoveredCompounds', [...disc, match.formula]);
                      checkMoleculeChallenges();

                    } else {

                      upd('buildCheckResult', { success: false });

                      addToast('\u{1F914} No known compound matches this structure.', 'warning');

                    }

                  },

                  className: "flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all"

                }, "\u{1F50D} Check Molecule"),

                React.createElement("button", { "aria-label": "Random Challenge",

                  onClick: () => {

                    // Random challenge: pick a compound and show target

                    const target = COMPOUNDS[Math.floor(Math.random() * COMPOUNDS.length)];

                    upd('buildTarget', target);

                    upd('buildAtoms', []); upd('buildBonds', []); upd('buildBondFrom', null); upd('buildCheckResult', null);

                    addToast('\u{1F3AF} Build: ' + target.name + ' (' + target.formula + ')', 'info');

                  },

                  className: "px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl hover:from-amber-500 hover:to-orange-600 shadow-md transition-all"

                }, "\u{1F3AF} Random Challenge")

              ),

              // Target compound display

              d.buildTarget && React.createElement("div", { className: "mt-2 bg-amber-50 rounded-xl p-3 border border-amber-200 flex items-center gap-3" },

                React.createElement("span", { className: "text-2xl" }, d.buildTarget.emoji),

                React.createElement("div", null,

                  React.createElement("p", { className: "text-sm font-bold text-amber-800" }, "\u{1F3AF} Target: " + d.buildTarget.name),

                  React.createElement("p", { className: "text-xs text-amber-600" }, d.buildTarget.formula + " \u2014 " + d.buildTarget.desc),

                  React.createElement("p", { className: "text-[11px] text-amber-500 mt-0.5" }, "Recipe: " + Object.entries(d.buildTarget.recipe).map(([el, n]) => el + (n > 1 ? '\u00D7' + n : '')).join(' + '))

                )

              ),

              // Check result

              d.buildCheckResult && (d.buildCheckResult.success

                ? React.createElement("div", { className: "mt-2 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 text-center animate-in zoom-in" },

                    React.createElement("p", { className: "text-3xl mb-1" }, d.buildCheckResult.compound.emoji),

                    React.createElement("p", { className: "text-lg font-black text-emerald-700" }, "\u{1F389} " + d.buildCheckResult.compound.name),

                    React.createElement("p", { className: "text-sm font-bold text-emerald-600" }, d.buildCheckResult.compound.formula + " \u2014 " + d.buildCheckResult.compound.desc),

                    React.createElement("p", { className: "text-xs text-emerald-500 mt-1" }, "+15 XP \u{1F31F}")

                  )

                : React.createElement("div", { className: "mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center" },

                    React.createElement("p", { className: "text-sm font-bold text-amber-700" }, "\u{1F914} No known compound matches. Keep experimenting!"),

                    React.createElement("p", { className: "text-[11px] text-amber-500 mt-1" }, "Tip: Click bonds to cycle between single, double, and triple bonds")

                  )

              ),

              // Build tips

              (d.buildAtoms || []).length === 0 && React.createElement("div", { className: "mt-4 bg-indigo-50 rounded-xl p-4 border border-indigo-200" },

                React.createElement("p", { className: "text-sm font-bold text-indigo-700 mb-2" }, "\u{1F4A1} How to Build"),

                React.createElement("div", { className: "grid grid-cols-1 gap-1.5 text-xs text-indigo-600" },

                  React.createElement("p", null, "\u2460 Click element buttons above to add atoms to the canvas"),

                  React.createElement("p", null, "\u2461 Drag atoms to arrange them"),

                  React.createElement("p", null, "\u2462 Click an atom in the bond selector, then click another atom to draw a bond"),

                  React.createElement("p", null, "\u2463 Click a bond to cycle: single \u2192 double \u2192 triple"),

                  React.createElement("p", null, "\u2464 Click \u{1F50D} Check to identify your molecule!"),

                  React.createElement("p", null, "\u{1F3AF} Try 'Random Challenge' for a guided build quest")

                )

              )

            ),

            // â”€â”€ Periodic Table Mode â”€â”€

            mode === 'table' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-2" }, "Tap any element to learn about it. The full 118-element periodic table."),

              d.selectedElement && (() => {

                const detail = getElementDetail(d.selectedElement.s);

                const relatedCompounds = getElementCompounds(d.selectedElement.s);

                return React.createElement("div", { className: "mb-3 rounded-xl border-2 overflow-hidden " + (catColors[d.selectedElement.cat] || 'bg-slate-50 border-slate-200') },

                  React.createElement("div", { className: "p-3 flex items-center gap-3" },

                    React.createElement("div", { className: "w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-md flex-shrink-0", style: { backgroundColor: d.selectedElement.c } },

                      React.createElement("span", { className: "text-[11px] opacity-80" }, d.selectedElement.n),

                      React.createElement("span", { className: "text-xl font-black" }, d.selectedElement.s)

                    ),

                    React.createElement("div", { className: "flex-1 min-w-0" },

                      React.createElement("p", { className: "text-lg font-bold text-slate-800" }, d.selectedElement.name),

                      React.createElement("p", { className: "text-xs text-slate-600" }, "Atomic #" + d.selectedElement.n + " \u2022 " + (d.selectedElement.cat || 'element').replace(/^\w/, c => c.toUpperCase())),

                      detail && React.createElement("p", { className: "text-xs text-slate-600 mt-1 italic" }, detail.desc),

                      detail && React.createElement("button", { "aria-label": "Speak Text",
                        onClick: () => speakText(d.selectedElement.name + '. ' + detail.desc),
                        className: "ml-1 px-1.5 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center"
                      }, "🔊"),

                    ),

                    React.createElement("button", { onClick: () => upd('selectedElement', null), className: "p-1 text-slate-600 hover:text-slate-600 flex-shrink-0", "aria-label": "Close" }, "\u2715")

                  ),

                  detail && React.createElement("div", { className: "border-t border-slate-200/50 px-3 pb-3" },

                    React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2 mt-2" },

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, "\uD83D\uDD27 Common Uses"),

                        React.createElement("div", { className: "flex flex-wrap gap-1" },

                          (detail.uses || []).map((use, i) => React.createElement("span", { key: i, className: "px-2 py-0.5 bg-white/60 rounded-full text-[11px] font-medium text-slate-700 border border-slate-200/80" }, use))

                        )

                      ),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, "\uD83E\uDDEA Key Compounds"),

                        React.createElement("div", { className: "flex flex-wrap gap-1" },

                          (detail.compounds || []).map((comp, i) => React.createElement("span", { key: i, className: "px-2 py-0.5 bg-white/60 rounded-full text-[11px] font-medium text-slate-700 border border-slate-200/80" }, comp))

                        )

                      )

                    ),

                    relatedCompounds.length > 0 && React.createElement("div", { className: "mt-2" },

                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, "\u2697\uFE0F Craftable in Compound Creator (" + relatedCompounds.length + ")"),

                      React.createElement("div", { className: "flex flex-wrap gap-1" },

                        relatedCompounds.map((comp, i) => React.createElement("button", { "aria-label": "Open " + comp.name + " in Compound Creator", key: i, onClick: () => { upd('moleculeMode', 'creator'); upd('selectedElements', { ...comp.recipe }); }, className: "px-2 py-0.5 bg-emerald-50 rounded-full text-[11px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors" }, comp.emoji + " " + comp.name + " (" + comp.formula + ")"))

                      )

                    ),

                    // â”€â”€â”€ BOHR MODEL ATOM VISUALIZATION â”€â”€â”€

                    React.createElement("div", { className: "mt-3 pt-3 border-t border-slate-200/50" },

                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2" }, "\u269B\uFE0F Bohr Model"),

                      React.createElement("span", { className: "ml-2 text-[11px] text-slate-600 font-normal" },
                        "Config: " + getElectronConfig(d.selectedElement.n) +
                        " | Valence: " + getValenceElectrons(d.selectedElement.n) + "e⁻" +
                        (ELECTRONEGATIVITY[d.selectedElement.s] ? " | EN: " + ELECTRONEGATIVITY[d.selectedElement.s] : "")
                      ),

                      React.createElement("div", { className: "flex items-start gap-3" },

                        React.createElement("canvas", { width: 220, height: 220,

                          className: "rounded-xl border border-slate-200 bg-slate-900 flex-shrink-0",

                          key: 'bohr-' + d.selectedElement.n,

                          ref: function(canvas) {

                            if (!canvas) return;

                            var el = d.selectedElement;

                            var atomicNum = el.n;

                            var massNum = Math.round(el.mass || (atomicNum * 2.15));

                            var protons = atomicNum;

                            var neutrons = massNum - protons;

                            if (neutrons < 0) neutrons = 0;

                            var electrons = atomicNum;

                            // Shell configuration: 2, 8, 18, 32, 32, 18, 8

                            var shellCapacity = [2, 8, 18, 32, 32, 18, 8];

                            var shells = [];

                            var remaining = electrons;

                            for (var si = 0; si < shellCapacity.length && remaining > 0; si++) {

                              var count = Math.min(remaining, shellCapacity[si]);

                              shells.push(count);

                              remaining -= count;

                            }

                            var ctx = canvas.getContext('2d');

                            var W = canvas.width, H = canvas.height;

                            var cx = W / 2, cy = H / 2;

                            var maxR = Math.min(W, H) / 2 - 8;

                            var nShells = shells.length;

                            var nucleusR = Math.max(8, Math.min(22, 6 + protons * 0.15));

                            var shellColors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c', '#38bdf8'];

                            var angle = 0;

                            var animId = null;

                            function draw() {

                              ctx.clearRect(0, 0, W, H);

                              // Draw shells (concentric rings)

                              for (var s = 0; s < nShells; s++) {

                                var r = nucleusR + 12 + (maxR - nucleusR - 12) * ((s + 1) / (nShells + 0.5));

                                ctx.beginPath();

                                ctx.arc(cx, cy, r, 0, Math.PI * 2);

                                ctx.strokeStyle = 'rgba(148,163,184,0.25)';

                                ctx.lineWidth = 1;

                                ctx.stroke();

                              }

                              // Draw nucleus

                              var nucGrad = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, nucleusR);

                              nucGrad.addColorStop(0, '#ff6b6b');

                              nucGrad.addColorStop(0.6, '#e74c3c');

                              nucGrad.addColorStop(1, '#c0392b');

                              ctx.beginPath();

                              ctx.arc(cx, cy, nucleusR, 0, Math.PI * 2);

                              ctx.fillStyle = nucGrad;

                              ctx.fill();

                              // Nucleus spots (protons red, neutrons blue)

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

                                  ctx.beginPath();

                                  ctx.arc(fx, fy, Math.max(1.5, nucleusR * 0.15), 0, Math.PI * 2);

                                  ctx.fillStyle = nucItems[qi] === 'p' ? '#ffaaaa' : '#aaaaff';

                                  ctx.fill();

                                }

                              }

                              // Nucleus label

                              ctx.fillStyle = '#ffffff';

                              ctx.font = 'bold ' + Math.max(7, Math.min(11, nucleusR * 0.7)) + 'px sans-serif';

                              ctx.textAlign = 'center';

                              ctx.textBaseline = 'middle';

                              if (protons <= 4) {

                                ctx.fillText(protons + 'p', cx, cy - 2);

                                ctx.fillText(neutrons + 'n', cx, cy + 7);

                              }

                              // Draw electrons orbiting

                              for (var s2 = 0; s2 < nShells; s2++) {

                                var r2 = nucleusR + 12 + (maxR - nucleusR - 12) * ((s2 + 1) / (nShells + 0.5));

                                var eCount = shells[s2];

                                var speed = (0.3 + s2 * 0.15) * (s2 % 2 === 0 ? 1 : -1);

                                var eColor = shellColors[s2 % shellColors.length];

                                for (var ei = 0; ei < eCount; ei++) {

                                  var eAngle = angle * speed + (ei / eCount) * Math.PI * 2;

                                  var ex = cx + Math.cos(eAngle) * r2;

                                  var ey = cy + Math.sin(eAngle) * r2;

                                  // Glow

                                  ctx.beginPath();

                                  ctx.arc(ex, ey, 5, 0, Math.PI * 2);

                                  ctx.fillStyle = eColor + '44';

                                  ctx.fill();

                                  // Electron dot

                                  ctx.beginPath();

                                  ctx.arc(ex, ey, 3, 0, Math.PI * 2);

                                  ctx.fillStyle = eColor;

                                  ctx.fill();

                                }

                              }

                              // Symbol label at top

                              ctx.fillStyle = 'rgba(255,255,255,0.6)';

                              ctx.font = 'bold 10px sans-serif';

                              ctx.textAlign = 'center';

                              ctx.fillText(el.s + ' (' + atomicNum + ')', cx, 14);

                              angle += 0.015;

                              animId = requestAnimationFrame(draw);

                            }

                            draw();

                            // Cleanup on unmount

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

                        React.createElement("div", { className: "text-[11px] text-slate-600 space-y-1 leading-relaxed" },

                          React.createElement("p", null, React.createElement("strong", { className: "text-slate-700" }, "Protons: "), "" + d.selectedElement.n),

                          React.createElement("p", null, React.createElement("strong", { className: "text-slate-700" }, "Electrons: "), "" + d.selectedElement.n),

                          React.createElement("p", null, React.createElement("strong", { className: "text-slate-700" }, "Shells: "), (function() {

                            var e = d.selectedElement.n;

                            var sc = [2, 8, 18, 32, 32, 18, 8];

                            var sh = [];

                            var rem = e;

                            for (var i = 0; i < sc.length && rem > 0; i++) {

                              var c = Math.min(rem, sc[i]);

                              sh.push(c);

                              rem -= c;

                            }

                            return sh.join('-');

                          })()),

                          React.createElement("p", { className: "text-[11px] text-slate-600 italic mt-1" }, "\u26A1 Electrons orbit the nucleus in energy levels called \"shells.\" Inner shells fill first before outer ones begin.")

                        )

                      )

                    )

                  )

                );

              })(),

              // Table grid

              React.createElement("div", { className: "overflow-x-auto" },

                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(18, minmax(0, 1fr))', gap: '1px', minWidth: '600px' } },

                  PT_LAYOUT.flatMap((row, ri) => {

                    if (row.length === 0) return [React.createElement("div", { key: 'gap-' + ri, style: { gridColumn: 'span 18', height: '4px' } })];

                    return row.map((num, ci) => {

                      if (num === 0) return React.createElement("div", { key: ri + '-' + ci });

                      const el = ELEMENTS[num - 1];

                      if (!el) return React.createElement("div", { key: ri + '-' + ci });

                      return React.createElement("button", { "aria-label": "Select element: " + el.name + " (" + el.s + ")", key: el.s, onClick: () => upd('selectedElement', el), className: "w-full aspect-square rounded flex flex-col items-center justify-center text-[11px] font-bold border transition-all hover:scale-125 hover:z-10 hover:shadow-lg " + (catColors[el.cat] || 'bg-slate-50 border-slate-200'), title: el.name, style: { minWidth: '28px' } },

                        React.createElement("span", { className: "font-black text-[11px] leading-none" }, el.s),

                        React.createElement("span", { className: "opacity-60 leading-none" }, el.n)

                      );

                    });

                  })

                )

              ),

              // Legend

              React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3 justify-center" },

                [['alkali', 'Alkali'], ['alkaline', 'Alkaline'], ['transition', 'Transition'], ['metal', 'Post-trans.'], ['metalloid', 'Metalloid'], ['nonmetal', 'Nonmetal'], ['halogen', 'Halogen'], ['noble', 'Noble Gas'], ['lanthanide', t('stem.periodic.lanthanide')], ['actinide', t('stem.periodic.actinide')]].map(([cat, label]) =>

                  React.createElement("span", { key: cat, className: "px-1.5 py-0.5 rounded text-[11px] font-bold border " + (catColors[cat] || '') }, label)

                )

              ),

              // â”€â”€ Quiz: Element Hunt â”€â”€

              (() => {

                var elQuiz = d.elQuiz || null;

                var elScore = d.elScore || 0;

                var elStreak = d.elStreak || 0;

                function makeElQuiz() {

                  var quizTypes = [

                    function () { var el = ELEMENTS[Math.floor(Math.random() * 36)]; return { text: 'Which element has the symbol "' + el.s + '"?', answer: el.name, opts: [el.name].concat(ELEMENTS.filter(function (e) { return e.name !== el.name; }).sort(function () { return Math.random() - 0.5; }).slice(0, 3).map(function (e) { return e.name; })).sort(function () { return Math.random() - 0.5; }) }; },

                    function () { var el = ELEMENTS[Math.floor(Math.random() * 36)]; return { text: 'What is the atomic number of ' + el.name + '?', answer: String(el.n), opts: [String(el.n), String(el.n + 2), String(el.n > 3 ? el.n - 2 : el.n + 4), String(el.n + 7)].sort(function () { return Math.random() - 0.5; }) }; },

                    function () { var cats = ['alkali', 'noble', 'halogen', 'transition', 'nonmetal']; var catLabels = { alkali: 'Alkali Metal', noble: 'Noble Gas', halogen: 'Halogen', transition: 'Transition Metal', nonmetal: 'Nonmetal' }; var cat = cats[Math.floor(Math.random() * cats.length)]; var ex = ELEMENTS.filter(function (e) { return e.cat === cat; }); var el = ex[Math.floor(Math.random() * ex.length)]; return { text: 'What category does ' + el.name + ' (' + el.s + ') belong to?', answer: catLabels[cat], opts: Object.values(catLabels).sort(function () { return Math.random() - 0.5; }).slice(0, 4) }; },

                  ];

                  var gen = quizTypes[Math.floor(Math.random() * quizTypes.length)];

                  var q = gen(); q.answered = false;

                  if (q.opts.indexOf(q.answer) < 0) q.opts[0] = q.answer;

                  return q;

                }

                return React.createElement("div", { className: "border-t border-slate-200 pt-3 mt-3" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                    React.createElement("button", { "aria-label": "Start element quiz or get next question", onClick: function () { upd('elQuiz', makeElQuiz()); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (elQuiz ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-700 text-white') + " hover:opacity-90 transition-all" }, elQuiz ? 'ðŸ”„ Next Question' : 'ðŸ”¬ Element Quiz'),

                    elScore > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, 'â­ ' + elScore + ' | ðŸ”¥ ' + elStreak)

                  ),

                  elQuiz && !elQuiz.answered && React.createElement("div", { className: "bg-cyan-50 rounded-xl p-3 border border-cyan-200" },

                    React.createElement("p", { className: "text-sm font-bold text-cyan-800 mb-2" }, elQuiz.text),

                    React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                      elQuiz.opts.map(function (opt) {

                        return React.createElement("button", { "aria-label": "Select answer: " + opt,

                          key: opt, onClick: function () {

                            var correct = opt === elQuiz.answer;

                            upd('elQuiz', Object.assign({}, elQuiz, { answered: true, chosen: opt }));

                            upd('elScore', elScore + (correct ? 1 : 0)); upd('elStreak', correct ? elStreak + 1 : 0);
                            if (correct) checkMoleculeChallenges();

                            if (correct) addToast(t('stem.periodic.correct'), 'success'); else addToast(t('stem.periodic.answer') + elQuiz.answer, 'error');

                          }, className: "px-2 py-1.5 rounded-lg text-xs font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 transition-all"

                        }, opt);

                      })

                    )

                  ),

                  elQuiz && elQuiz.answered && React.createElement("div", { className: "p-3 rounded-xl text-sm font-bold " + (elQuiz.chosen === elQuiz.answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') }, elQuiz.chosen === elQuiz.answer ? 'âœ… Correct!' : 'âŒ Answer: ' + elQuiz.answer)

                );

              })()

            )

,

            // ═══ Reactions Mode ═══
            mode === 'reactions' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-3" }, "Balance chemical equations by adjusting coefficients. Make atoms equal on both sides!"),

              // Reaction selector
              React.createElement("div", { className: "flex gap-1 mb-4 flex-wrap" },
                REACTIONS.map((r, idx) => React.createElement("button", { "aria-label": "Select reaction: " + r.name,
                  key: r.id,
                  onClick: () => initReaction(idx),
                  className: "px-2 py-1 rounded-lg text-xs font-bold transition-all " +
                    (currentReactionIdx === idx && reactionCoeffs ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                }, r.emoji + " " + (idx + 1)))
              ),

              // Active reaction
              (() => {
                const r = REACTIONS[currentReactionIdx];
                const coeffs = reactionCoeffs || r.left.concat(r.right).map(() => 1);
                const balance = getAtomBalance(r, coeffs);

                return React.createElement("div", null,
                  // Reaction info
                  React.createElement("div", { className: "bg-indigo-50 rounded-xl p-3 border border-indigo-200 mb-3" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-xl" }, r.emoji),
                      React.createElement("span", { className: "text-sm font-bold text-indigo-800" }, r.name),
                      React.createElement("span", { className: "px-1.5 py-0.5 rounded text-[11px] font-bold " +
                        (r.difficulty === 1 ? 'bg-green-100 text-green-700' : r.difficulty === 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700') },
                        r.difficulty === 1 ? 'Easy' : r.difficulty === 2 ? 'Medium' : 'Hard'),
                      React.createElement("span", { className: "px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600" }, r.type)
                    ),
                    React.createElement("p", { className: "text-xs text-indigo-600" }, r.desc)
                  ),

                  // Equation balancer
                  React.createElement("div", { className: "bg-white rounded-xl border-2 border-dashed border-slate-300 p-4 mb-3" },
                    React.createElement("div", { className: "flex items-center justify-center gap-2 flex-wrap" },

                      // Left side (reactants)
                      r.left.map((term, i) => React.createElement("div", { key: 'l' + i, className: "flex items-center gap-1" },
                        i > 0 && React.createElement("span", { className: "text-lg font-bold text-slate-600 mx-1" }, "+"),
                        React.createElement("div", { className: "flex flex-col items-center" },
                          React.createElement("div", { className: "flex items-center gap-0.5" },
                            React.createElement("button", { "aria-label": "Decrease coefficient for " + term.formula,
                              onClick: () => setCoeff(i, -1),
                              className: "w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 flex items-center justify-center"
                            }, "−"),
                            React.createElement("span", { className: "w-8 text-center text-lg font-black text-indigo-700" }, coeffs[i]),
                            React.createElement("button", { "aria-label": "Increase coefficient for " + term.formula,
                              onClick: () => setCoeff(i, 1),
                              className: "w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 flex items-center justify-center"
                            }, "+")
                          ),
                          React.createElement("span", { className: "text-sm font-bold text-slate-700 mt-0.5 bg-slate-50 px-2 py-0.5 rounded border" }, term.formula)
                        )
                      )),

                      // Arrow
                      React.createElement("span", { className: "text-2xl font-bold text-slate-600 mx-2" }, "→"),

                      // Right side (products)
                      r.right.map((term, i) => React.createElement("div", { key: 'r' + i, className: "flex items-center gap-1" },
                        i > 0 && React.createElement("span", { className: "text-lg font-bold text-slate-600 mx-1" }, "+"),
                        React.createElement("div", { className: "flex flex-col items-center" },
                          React.createElement("div", { className: "flex items-center gap-0.5" },
                            React.createElement("button", { "aria-label": "Decrease coefficient for " + term.formula,
                              onClick: () => setCoeff(r.left.length + i, -1),
                              className: "w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 flex items-center justify-center"
                            }, "−"),
                            React.createElement("span", { className: "w-8 text-center text-lg font-black text-indigo-700" }, coeffs[r.left.length + i]),
                            React.createElement("button", { "aria-label": "Increase coefficient for " + term.formula,
                              onClick: () => setCoeff(r.left.length + i, 1),
                              className: "w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 flex items-center justify-center"
                            }, "+")
                          ),
                          React.createElement("span", { className: "text-sm font-bold text-slate-700 mt-0.5 bg-slate-50 px-2 py-0.5 rounded border" }, term.formula)
                        )
                      ))
                    )
                  ),

                  // Atom count table
                  React.createElement("div", { className: "bg-slate-50 rounded-xl p-3 border mb-3" },
                    React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2" }, "Atom Count"),
                    React.createElement("div", { className: "grid grid-cols-3 gap-1 text-xs" },
                      React.createElement("span", { className: "font-bold text-slate-600 text-center" }, "Element"),
                      React.createElement("span", { className: "font-bold text-slate-600 text-center" }, "Left"),
                      React.createElement("span", { className: "font-bold text-slate-600 text-center" }, "Right"),
                      balance.map(b => [
                        React.createElement("span", { key: b.element + 'n', className: "text-center font-bold text-slate-700" }, b.element),
                        React.createElement("span", { key: b.element + 'l', className: "text-center font-bold " + (b.balanced ? 'text-emerald-600' : 'text-red-500') }, b.left),
                        React.createElement("span", { key: b.element + 'r', className: "text-center font-bold " + (b.balanced ? 'text-emerald-600' : 'text-red-500') }, b.right)
                      ]).flat()
                    )
                  ),

                  // Submit button
                  React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { "aria-label": "Check Balance",
                      onClick: submitReaction,
                      disabled: reactionResult === 'correct',
                      className: "flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all disabled:opacity-40"
                    }, "⚖️ Check Balance"),
                    React.createElement("button", { "aria-label": "Next",
                      onClick: () => { const next = (currentReactionIdx + 1) % REACTIONS.length; initReaction(next); },
                      className: "px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                    }, "➡️ Next")
                  ),

                  // Result feedback
                  reactionResult === 'correct' && React.createElement("div", { className: "mt-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 text-center" },
                    React.createElement("p", { className: "text-lg font-black text-emerald-700" }, "🎉 Balanced!"),
                    React.createElement("p", { className: "text-xs text-emerald-600 mt-1" }, "+" + (r.difficulty * 10) + " RP earned")
                  ),
                  reactionResult === 'incorrect' && React.createElement("div", { className: "mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center" },
                    React.createElement("p", { className: "text-sm font-bold text-amber-700" }, "💡 Hint: check which atoms have different counts on each side.")
                  ),

                  // Progress
                  React.createElement("div", { className: "mt-3 flex items-center justify-between text-[11px] text-slate-600" },
                    React.createElement("span", null, "⚖️ " + reactionsBalanced + " balanced"),
                    React.createElement("span", null, "Reaction " + (currentReactionIdx + 1) + "/" + REACTIONS.length)
                  )
                );
              })()
            ),

            // ═══ Challenges Panel ═══
            React.createElement("div", { className: "mt-4 border-t border-slate-200 pt-3" },
              React.createElement("details", { open: completedChallenges.length > 0 && completedChallenges.length < MOLECULE_CHALLENGES.length },
                React.createElement("summary", { className: "text-xs font-bold text-slate-600 cursor-pointer hover:text-slate-800 select-none" },
                  "🏆 Challenges (" + completedChallenges.length + "/" + MOLECULE_CHALLENGES.length + ")"
                ),
                React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2" },
                  MOLECULE_CHALLENGES.map(ch => {
                    const done = completedChallenges.includes(ch.id);
                    return React.createElement("div", {
                      key: ch.id,
                      className: "flex items-center gap-2 p-2 rounded-lg border " + (done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200')
                    },
                      React.createElement("span", { className: "text-lg" }, done ? '✅' : ch.emoji),
                      React.createElement("div", { className: "flex-1 min-w-0" },
                        React.createElement("p", { className: "text-xs font-bold " + (done ? 'text-emerald-700 line-through' : 'text-slate-700') }, ch.name),
                        React.createElement("p", { className: "text-[11px] " + (done ? 'text-emerald-500' : 'text-slate-500') }, ch.desc)
                      ),
                      React.createElement("span", { className: "text-[11px] font-bold " + (done ? 'text-emerald-600' : 'text-slate-500') }, "+" + ch.reward + " RP")
                    );
                  })
                )
              )
            ),

            
            // ═══ AI Chemistry Tutor ═══
            React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },
              React.createElement("details", null,
                React.createElement("summary", { className: "text-xs font-bold text-slate-600 cursor-pointer hover:text-slate-800 select-none" },
                  "🧑‍🔬 Ask the Chemistry Tutor"
                ),
                React.createElement("div", { className: "mt-2" },
                  React.createElement("div", { className: "flex gap-2 mb-2" },
                    React.createElement("input", {
                      type: "text",
                      value: aiQuestion,
                      onChange: (e) => upd('aiQuestion', e.target.value),
                      onKeyDown: (e) => { if (e.key === 'Enter') askChemTutor(aiQuestion); },
                      placeholder: "Ask about any element, compound, or reaction...",
                      className: "flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    }),
                    React.createElement("button", { "aria-label": "Ask Chem Tutor",
                      onClick: () => askChemTutor(aiQuestion),
                      disabled: aiLoading || !aiQuestion,
                      className: "px-3 py-2 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-all"
                    }, aiLoading ? "⏳" : "🔬 Ask")
                  ),
                  React.createElement("div", { className: "flex gap-1 mb-2 flex-wrap" },
                    ["What is an ionic bond?", "Why is water a polar molecule?", "How does rust form?", "What is pH?"].map(q =>
                      React.createElement("button", { "aria-label": "Ask: " + q,
                        key: q,
                        onClick: () => { upd('aiQuestion', q); askChemTutor(q); },
                        className: "px-2 py-1 rounded text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      }, q)
                    )
                  ),
                  aiAnswer && React.createElement("div", { className: "bg-indigo-50 rounded-xl p-3 border border-indigo-200" },
                    React.createElement("div", { className: "flex items-start gap-2" },
                      React.createElement("span", { className: "text-lg flex-shrink-0" }, "🧑‍🔬"),
                      React.createElement("div", { className: "flex-1" },
                        React.createElement("p", { className: "text-xs text-indigo-700 leading-relaxed" }, aiAnswer),
                        React.createElement("button", { "aria-label": "Read Aloud",
                          onClick: () => speakText(aiAnswer),
                          className: "mt-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                        }, "🔊 Read Aloud")
                      )
                    )
                  )
                )
              )
            ),
// ═══ Tutorial Overlay ═══
            !tutorialDismissed && React.createElement("div", { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
              className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40",
              onClick: (e) => { if (e.target === e.currentTarget) dismissTutorial(); }
            },
              React.createElement("div", { className: "bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-4 relative" },
                React.createElement("button", { "aria-label": "Dismiss Tutorial",
                  onClick: dismissTutorial,
                  className: "absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 text-sm font-bold"
                }, "✕"),

                React.createElement("p", { className: "text-2xl mb-1" }, ["🔬", "⚗️", "🧱", "🗂️", "🔥"][tutorialStep]),
                React.createElement("p", { className: "text-lg font-bold text-slate-800 mb-2" },
                  ['Welcome to Molecule Lab!', 'Compound Creator', 'Build Mode', 'Periodic Table', 'Reaction Simulator'][tutorialStep]
                ),
                React.createElement("p", { className: "text-sm text-slate-600 mb-4 leading-relaxed" },
                  [
                    'Explore chemistry through 5 interactive modes. View molecules, create compounds, build structures, study elements, and balance reactions!',
                    'Select elements from the grid to craft real compounds. Discover all 32 recipes to earn the Master Chemist challenge!',
                    'Place atoms on the canvas and draw bonds between them. Click bonds to cycle single → double → triple. Try the Random Challenge!',
                    'Browse all 118 elements with animated Bohr models, electron configurations, and electronegativity values. Test yourself with the Element Quiz!',
                    'Adjust coefficients to balance chemical equations. Match atom counts on both sides. 10 reactions from easy to hard — earn RP for each!'
                  ][tutorialStep]
                ),
                React.createElement("div", { className: "flex items-center justify-between" },
                  React.createElement("div", { className: "flex gap-1" },
                    [0,1,2,3,4].map(i => React.createElement("div", {
                      key: i,
                      className: "w-2 h-2 rounded-full " + (i === tutorialStep ? 'bg-indigo-500' : 'bg-slate-200')
                    }))
                  ),
                  React.createElement("div", { className: "flex gap-2" },
                    tutorialStep > 0 && React.createElement("button", { "aria-label": "Back",
                      onClick: () => upd('tutorialStep', tutorialStep - 1),
                      className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }, "← Back"),
                    tutorialStep < 4
                      ? React.createElement("button", { "aria-label": "Next",
                          onClick: advanceTutorial,
                          className: "px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600"
                        }, "Next →")
                      : React.createElement("button", { "aria-label": "Start Exploring!",
                          onClick: dismissTutorial,
                          className: "px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600"
                        }, "✅ Start Exploring!")
                  )
                )
              )
            )
          )
      })();
    }
  });

})();
