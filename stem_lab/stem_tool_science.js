// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// stem_tool_science.js â€” STEM Lab Science Tools
// 7 registered tools (aquarium, ecosystem, molecule, solarSystem, universe, behaviorLab extracted) (cell, chemBalance, punnett, fractionViz, gameStudio extracted)
// Auto-extracted (Phase 2 modularization)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â•â•â• Defensive StemLab guard â•â•â•
// Ensure window.StemLab is available before registering tools.
// If stem_lab_module.js hasn't loaded yet, create the registry stub.
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
// â•â•â• End Guard â•â•â•

(function() {
  'use strict';


  /* molecule tool extracted to stem_tool_molecule.js */


  /* solarSystem tool extracted to stem_tool_solarsystem.js */

  // â•â•â• ðŸ”¬ universe (universe) â•â•â•

  /* universe tool extracted to stem_tool_universe.js */

    window.StemLab.registerTool('decomposer', {
    icon: 'ðŸ”¬',
    label: 'decomposer',
    desc: '',
    color: 'slate',
    category: 'science',
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

      // â”€â”€ Tool body (decomposer) â”€â”€
      return (function() {
const d = labToolData.decomposer || {};

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, decomposer: { ...prev.decomposer, [key]: val } }));



          // Material database with correct chemical formulas

          const MATERIALS = [

            { name: t('stem.chem_balance.water'), formula: 'Hâ‚‚O', emoji: 'ðŸ’§', color: '#60a5fa', desc: 'The most essential molecule for life. Two hydrogen atoms bonded to one oxygen.', elements: [{ sym: 'H', name: t('stem.periodic.hydrogen'), num: 1, count: 2, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' }, { sym: 'O', name: t('stem.periodic.oxygen'), num: 8, count: 1, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }], bondType: 'Covalent', state: 'Liquid', molarMass: '18.015 g/mol', realUse: 'Covers 71% of Earth. Every living cell requires water.' },

            { name: t('stem.chem_balance.table_salt'), formula: t('stem.periodic.nacl'), emoji: 'ðŸ§‚', color: '#a855f7', desc: 'Sodium chloride â€” an ionic crystal essential for nerve function.', elements: [{ sym: 'Na', name: t('stem.periodic.sodium'), num: 11, count: 1, color: '#a855f7', group: 'Alkali Metal', mass: '22.990' }, { sym: 'Cl', name: t('stem.periodic.chlorine'), num: 17, count: 1, color: '#22c55e', group: 'Halogen', mass: '35.453' }], bondType: 'Ionic', state: 'Solid', molarMass: '58.44 g/mol', realUse: 'Used in cooking, road de-icing, and IV fluids. Humans need ~5g daily.' },

            { name: t('stem.decomposer.sugar_sucrose'), formula: 'Câ‚â‚‚Hâ‚‚â‚‚Oâ‚â‚', emoji: 'ðŸ¬', color: '#f59e0b', desc: 'A disaccharide made of glucose + fructose. 45 atoms in one molecule!', elements: [{ sym: 'C', name: t('stem.periodic.carbon'), num: 6, count: 12, color: '#1e293b', group: 'Nonmetal', mass: '12.011' }, { sym: 'H', name: t('stem.periodic.hydrogen'), num: 1, count: 22, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' }, { sym: 'O', name: t('stem.periodic.oxygen'), num: 8, count: 11, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }], bondType: 'Covalent', state: 'Solid', molarMass: '342.30 g/mol', realUse: 'Plants make sucrose via photosynthesis. Your body breaks it into glucose for energy.' },

            { name: t('stem.periodic.baking_soda'), formula: 'NaHCOâ‚ƒ', emoji: 'ðŸ§', color: '#fb923c', desc: 'Sodium bicarbonate â€” releases COâ‚‚ when heated, making baked goods rise.', elements: [{ sym: 'Na', name: t('stem.periodic.sodium'), num: 11, count: 1, color: '#a855f7', group: 'Alkali Metal', mass: '22.990' }, { sym: 'H', name: t('stem.periodic.hydrogen'), num: 1, count: 1, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' }, { sym: 'C', name: t('stem.periodic.carbon'), num: 6, count: 1, color: '#1e293b', group: 'Nonmetal', mass: '12.011' }, { sym: 'O', name: t('stem.periodic.oxygen'), num: 8, count: 3, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }], bondType: 'Ionic + Covalent', state: 'Solid', molarMass: '84.01 g/mol', realUse: 'Used in baking, cleaning, antacids, and fire extinguishers.' },

            { name: t('stem.periodic.rust'), formula: 'Feâ‚‚Oâ‚ƒ', emoji: 'ðŸŸ¤', color: '#b45309', desc: 'Iron(III) oxide â€” what happens when iron reacts with oxygen and water.', elements: [{ sym: 'Fe', name: t('stem.periodic.iron'), num: 26, count: 2, color: '#fb923c', group: 'Transition Metal', mass: '55.845' }, { sym: 'O', name: t('stem.periodic.oxygen'), num: 8, count: 3, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }], bondType: 'Ionic', state: 'Solid', molarMass: '159.69 g/mol', realUse: 'Costs ~$7 billion/year in damage. Mars is red because of iron oxide on its surface!' },

            { name: t('stem.periodic.carbon_dioxide'), formula: 'COâ‚‚', emoji: 'ðŸ’¨', color: '#94a3b8', desc: 'A greenhouse gas we exhale. Plants absorb it during photosynthesis.', elements: [{ sym: 'C', name: t('stem.periodic.carbon'), num: 6, count: 1, color: '#1e293b', group: 'Nonmetal', mass: '12.011' }, { sym: 'O', name: t('stem.periodic.oxygen'), num: 8, count: 2, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }], bondType: 'Covalent', state: 'Gas', molarMass: '44.01 g/mol', realUse: 'Makes soda fizzy. Dry ice is solid COâ‚‚ at -78.5Â°C. Key greenhouse gas.' },

            { name: t('stem.chem_balance.ammonia'), formula: 'NHâ‚ƒ', emoji: 'ðŸ§ª', color: '#3b82f6', desc: t('stem.decomposer.a_pungent_compound_essential_for'), elements: [{ sym: 'N', name: t('stem.periodic.nitrogen'), num: 7, count: 1, color: '#3b82f6', group: 'Nonmetal', mass: '14.007' }, { sym: 'H', name: t('stem.periodic.hydrogen'), num: 1, count: 3, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' }], bondType: 'Covalent', state: 'Gas', molarMass: '17.03 g/mol', realUse: 'Haber process makes 150M tons/year for fertilizer. Found in household cleaners.' },

            { name: t('stem.periodic.glucose'), formula: 'Câ‚†Hâ‚â‚‚Oâ‚†', emoji: 'ðŸ©¸', color: '#ef4444', desc: 'The primary energy source for cells. Your blood carries ~5g at all times.', elements: [{ sym: 'C', name: t('stem.periodic.carbon'), num: 6, count: 6, color: '#1e293b', group: 'Nonmetal', mass: '12.011' }, { sym: 'H', name: t('stem.periodic.hydrogen'), num: 1, count: 12, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' }, { sym: 'O', name: t('stem.periodic.oxygen'), num: 8, count: 6, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }], bondType: 'Covalent', state: 'Solid', molarMass: '180.16 g/mol', realUse: 'Produced by photosynthesis. Cellular respiration breaks it for ATP energy.' },

            { name: t('stem.chem_balance.calcium_carbonate'), formula: 'CaCOâ‚ƒ', emoji: 'ðŸš', color: '#fbbf24', desc: t('stem.decomposer.found_in_chalk_limestone_marble'), elements: [{ sym: 'Ca', name: t('stem.periodic.calcium'), num: 20, count: 1, color: '#f59e0b', group: 'Alkaline Earth Metal', mass: '40.078' }, { sym: 'C', name: t('stem.periodic.carbon'), num: 6, count: 1, color: '#1e293b', group: 'Nonmetal', mass: '12.011' }, { sym: 'O', name: t('stem.periodic.oxygen'), num: 8, count: 3, color: '#ef4444', group: 'Nonmetal', mass: '15.999' }], bondType: 'Ionic + Covalent', state: 'Solid', molarMass: '100.09 g/mol', realUse: 'Used in cement, antacids (Tums), and toothpaste. Coral reefs are made of this.' },

            { name: t('stem.periodic.methane'), formula: 'CHâ‚„', emoji: 'ðŸ”¥', color: '#22c55e', desc: t('stem.decomposer.the_simplest_hydrocarbon_natural_gas'), elements: [{ sym: 'C', name: t('stem.periodic.carbon'), num: 6, count: 1, color: '#1e293b', group: 'Nonmetal', mass: '12.011' }, { sym: 'H', name: t('stem.periodic.hydrogen'), num: 1, count: 4, color: '#60a5fa', group: 'Nonmetal', mass: '1.008' }], bondType: 'Covalent', state: 'Gas', molarMass: '16.04 g/mol', realUse: 'Burned for energy. Cow burps release ~100L/day. A potent greenhouse gas.' },

          ];



          var sel = MATERIALS.find(function (m) { return m.name === (d.selected || t('stem.chem_balance.water')); }) || MATERIALS[0];

          var totalAtoms = sel.elements.reduce(function (s, e) { return s + e.count; }, 0);

          var decomposed = d.decomposed || false;

          var quizMode = d.quizMode || false;

          var quizQ = d.quizQ || null;



          var quizScore = d.quizScore || 0;

          var quizStreak = d.quizStreak || 0;



          // Generate quiz question

          function makeQuiz() {

            var types = ['formula', 'elements', 'count', 'bond'];

            var type = types[Math.floor(Math.random() * types.length)];

            var mat = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];

            var q = {}, opts = [];

            if (type === 'formula') {

              q = { text: 'What is the chemical formula for ' + mat.name + '?', answer: mat.formula };

              opts = [mat.formula];

              while (opts.length < 4) { var r = MATERIALS[Math.floor(Math.random() * MATERIALS.length)].formula; if (opts.indexOf(r) < 0) opts.push(r); }

            } else if (type === 'elements') {

              var elNames = mat.elements.map(function (e) { return e.name; }).join(', ');

              q = { text: mat.formula + ' contains which elements?', answer: elNames };

              opts = [elNames];

              while (opts.length < 4) { var rm = MATERIALS[Math.floor(Math.random() * MATERIALS.length)]; var rn = rm.elements.map(function (e) { return e.name; }).join(', '); if (opts.indexOf(rn) < 0) opts.push(rn); }

            } else if (type === 'count') {

              var tc = mat.elements.reduce(function (s, e) { return s + e.count; }, 0);

              q = { text: 'How many total atoms in one molecule of ' + mat.formula + '?', answer: String(tc) };

              opts = [String(tc)];

              while (opts.length < 4) { var rv = String(tc + Math.floor(Math.random() * 10) - 4); if (rv !== String(tc) && parseInt(rv) > 0 && opts.indexOf(rv) < 0) opts.push(rv); }

            } else {

              q = { text: 'What type of bonding does ' + mat.name + ' have?', answer: mat.bondType };

              opts = [mat.bondType]; var allBonds = ['Ionic', 'Covalent', 'Ionic + Covalent', 'Metallic'];

              allBonds.forEach(function (b) { if (opts.indexOf(b) < 0 && opts.length < 4) opts.push(b); });

            }

            q.opts = opts.sort(function () { return Math.random() - 0.5; }); q.answered = false;

            return q;

          }



          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "âš—ï¸ Material Decomposer"),

              React.createElement("span", { className: "px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full" }, totalAtoms + " ATOMS")

            ),

            // Material selector chips

            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-4" },

              MATERIALS.map(function (m) {

                return React.createElement("button", { key: m.name, onClick: function () { upd('selected', m.name); upd('decomposed', false); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (sel.name === m.name ? 'text-white shadow-md scale-105' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-amber-300'), style: sel.name === m.name ? { background: m.color } : {} }, m.emoji + ' ' + m.name);

              })

            ),

            // Material info card

            React.createElement("div", { className: "bg-gradient-to-br from-slate-50 to-amber-50 rounded-xl border-2 border-amber-200 p-4 mb-3" },

              React.createElement("div", { className: "flex items-start gap-3 mb-3" },

                React.createElement("span", { className: "text-4xl" }, sel.emoji),

                React.createElement("div", { className: "flex-1" },

                  React.createElement("div", { className: "flex items-center gap-2" },

                    React.createElement("h4", { className: "font-bold text-slate-800 text-lg" }, sel.name),

                    React.createElement("span", { className: "px-2 py-0.5 bg-white rounded-full text-sm font-mono font-bold text-slate-700 border border-slate-200 shadow-sm" }, sel.formula)

                  ),

                  React.createElement("p", { className: "text-xs text-slate-500 mt-1 leading-relaxed" }, sel.desc),

                  React.createElement("div", { className: "flex gap-3 mt-2 text-[10px] font-bold" },

                    React.createElement("span", { className: "text-cyan-600" }, "ðŸ”— " + sel.bondType),

                    React.createElement("span", { className: "text-indigo-600" }, "ðŸ“Š " + sel.state),

                    React.createElement("span", { className: "text-emerald-600" }, "âš– " + sel.molarMass)

                  )

                )

              ),

              // Decompose button

              React.createElement("button", { onClick: function () { upd('decomposed', !decomposed); }, className: "w-full py-2.5 rounded-xl text-sm font-bold transition-all " + (decomposed ? 'bg-amber-600 text-white shadow-lg' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md') }, decomposed ? "ðŸ”„ Reassemble" : "âš—ï¸ Decompose into Elements"),

              // Animated decomposition visual

              React.createElement("div", { className: "mt-4 flex items-center justify-center gap-2 min-h-[80px] transition-all duration-500" },

                decomposed ? sel.elements.map(function (el, i) {

                  return React.createElement("div", { key: el.sym, className: "flex flex-col items-center animate-in zoom-in fade-in", style: { animationDelay: (i * 150) + 'ms', animationFillMode: 'both' } },

                    React.createElement("div", { className: "w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg border-2 border-white/30", style: { background: el.color } },

                      el.sym

                    ),

                    React.createElement("span", { className: "text-[10px] font-bold text-slate-600 mt-1" }, el.name),

                    React.createElement("span", { className: "text-[10px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full mt-0.5" }, "Ã—" + el.count)

                  );

                }) : React.createElement("div", { className: "flex flex-col items-center" },

                  React.createElement("div", { className: "w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-lg border-2 border-amber-200", style: { background: 'linear-gradient(135deg, ' + sel.color + '22, ' + sel.color + '44)' } }, sel.emoji),

                  React.createElement("span", { className: "mt-2 font-mono font-bold text-slate-700" }, sel.formula)

                )

              )

            ),

            // Element detail cards (shown when decomposed)

            decomposed && React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3" },

              sel.elements.map(function (el) {

                return React.createElement("div", { key: el.sym, className: "bg-white rounded-xl border border-slate-200 p-3 hover:border-amber-300 transition-all hover:shadow-sm" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-1.5" },

                    React.createElement("div", { className: "w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-sm", style: { background: el.color } },

                      React.createElement("div", { className: "text-center leading-tight" },

                        React.createElement("div", { className: "text-[8px] opacity-70" }, el.num),

                        React.createElement("div", { className: "text-base font-black" }, el.sym)

                      )

                    ),

                    React.createElement("div", null,

                      React.createElement("p", { className: "font-bold text-sm text-slate-800" }, el.name),

                      React.createElement("p", { className: "text-[10px] text-slate-400" }, el.group + " Â· " + el.mass + " u")

                    ),

                    React.createElement("span", { className: "ml-auto px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold" }, "Ã—" + el.count + " in " + sel.formula)

                  ),

                  // Atom count bar

                  React.createElement("div", { className: "h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1" },

                    React.createElement("div", { className: "h-full rounded-full transition-all duration-700", style: { width: Math.round(el.count / totalAtoms * 100) + '%', background: el.color } })

                  ),

                  React.createElement("p", { className: "text-[10px] text-slate-400 mt-1" }, Math.round(el.count / totalAtoms * 100) + "% of atoms in this molecule")

                );

              })

            ),

            // Compare molecules mode

            (() => {

              var cmpMode = d.compareMode || false;

              var cmpMat = MATERIALS.find(function(m) { return m.name === (d.compareTo || ''); }) || MATERIALS[1];

              if (!cmpMode) return React.createElement("div", { className: "mb-3" },

                React.createElement("button", { onClick: function() { upd('compareMode', true); upd('compareTo', MATERIALS[1].name); }, className: "w-full py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-all" }, "\u2696 Compare Molecules")

              );

              return React.createElement("div", { className: "bg-indigo-50 rounded-xl border-2 border-indigo-200 p-4 mb-3" },

                React.createElement("div", { className: "flex items-center gap-2 mb-3" },

                  React.createElement("span", { className: "text-sm font-bold text-indigo-800" }, "\u2696 Compare: " + sel.name + " vs"),

                  React.createElement("select", { value: d.compareTo || cmpMat.name, onChange: function(e) { upd('compareTo', e.target.value); }, className: "px-2 py-1 rounded-lg text-xs font-bold border border-indigo-300 bg-white text-indigo-700" },

                    MATERIALS.filter(function(m) { return m.name !== sel.name; }).map(function(m) {

                      return React.createElement("option", { key: m.name, value: m.name }, m.emoji + " " + m.name);

                    })

                  ),

                  React.createElement("button", { onClick: function() { upd('compareMode', false); }, className: "ml-auto text-xs text-indigo-400 hover:text-indigo-600" }, "\u2715 Close")

                ),

                React.createElement("div", { className: "grid grid-cols-2 gap-3" },

                  [sel, cmpMat].map(function(mat) {

                    var tc = mat.elements.reduce(function(s, e) { return s + e.count; }, 0);

                    return React.createElement("div", { key: mat.name, className: "bg-white rounded-xl p-3 border border-indigo-100" },

                      React.createElement("div", { className: "text-center mb-2" },

                        React.createElement("span", { className: "text-2xl" }, mat.emoji),

                        React.createElement("div", { className: "text-sm font-bold text-slate-800" }, mat.name),

                        React.createElement("div", { className: "text-xs font-mono text-slate-500" }, mat.formula)

                      ),

                      React.createElement("div", { className: "space-y-1" },

                        mat.elements.map(function(el) {

                          return React.createElement("div", { key: el.sym, className: "flex items-center gap-1.5" },

                            React.createElement("div", { className: "w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold", style: { background: el.color } }, el.sym),

                            React.createElement("div", { className: "flex-1 h-2 bg-slate-100 rounded-full overflow-hidden" },

                              React.createElement("div", { className: "h-full rounded-full", style: { width: Math.round(el.count / tc * 100) + '%', background: el.color } })

                            ),

                            React.createElement("span", { className: "text-[10px] font-bold text-slate-500 w-5 text-right" }, "\u00D7" + el.count)

                          );

                        })

                      ),

                      React.createElement("div", { className: "mt-2 grid grid-cols-3 gap-1 text-center text-[9px]" },

                        React.createElement("div", { className: "bg-slate-50 rounded p-1" }, React.createElement("div", { className: "font-bold text-slate-400" }, "Atoms"), React.createElement("div", { className: "font-black text-slate-700" }, tc)),

                        React.createElement("div", { className: "bg-slate-50 rounded p-1" }, React.createElement("div", { className: "font-bold text-slate-400" }, "Bond"), React.createElement("div", { className: "font-black text-slate-700" }, mat.bondType)),

                        React.createElement("div", { className: "bg-slate-50 rounded p-1" }, React.createElement("div", { className: "font-bold text-slate-400" }, "State"), React.createElement("div", { className: "font-black text-slate-700" }, mat.state))

                      )

                    );

                  })

                )

              );

            })(),



            // Real-world fact

            React.createElement("div", { className: "bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 p-3 mb-3" },

              React.createElement("p", { className: "text-[10px] font-bold text-cyan-600 uppercase tracking-wider mb-1" }, "ðŸŒ Real World"),

              React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, sel.realUse)

            ),

            // Quiz mode

            React.createElement("div", { className: "border-t border-slate-200 pt-3 mb-3" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                React.createElement("button", {

                  onClick: function () {

                    if (!quizMode) { upd('quizMode', true); upd('quizQ', makeQuiz()); }

                    else { upd('quizQ', makeQuiz()); }

                  }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (quizMode ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600 text-white') + " hover:opacity-90 transition-all"

                }, quizMode ? "ðŸ”„ Next Question" : "ðŸ§  Quiz Mode"),

                quizScore > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, "â­ " + quizScore + " correct | ðŸ”¥ " + quizStreak + " streak")

              ),

              quizMode && quizQ && React.createElement("div", { className: "bg-indigo-50 rounded-xl p-4 border border-indigo-200" },

                React.createElement("p", { className: "text-sm font-bold text-indigo-800 mb-3" }, quizQ.text),

                React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                  quizQ.opts.map(function (opt) {

                    var isCorrect = opt === quizQ.answer;

                    var wasChosen = quizQ.chosen === opt;

                    var cls = !quizQ.answered ? 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50' : isCorrect ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : wasChosen && !isCorrect ? 'bg-red-100 text-red-800 border-red-300' : 'bg-slate-50 text-slate-400 border-slate-200';

                    return React.createElement("button", {

                      key: opt, disabled: quizQ.answered, onClick: function () {

                        var correct = opt === quizQ.answer;

                        upd('quizQ', Object.assign({}, quizQ, { answered: true, chosen: opt }));

                        upd('quizScore', quizScore + (correct ? 1 : 0));

                        upd('quizStreak', correct ? quizStreak + 1 : 0);

                        if (correct) addToast(t('stem.decomposer.correct'), 'success');

                        else addToast(t('stem.decomposer.the_answer_is') + quizQ.answer, 'error');

                      }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all " + cls

                    }, opt);

                  })

                )

              )

            ),

            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'dc-' + Date.now(), tool: 'decomposer', label: sel.name + ' (' + sel.formula + ')', data: Object.assign({}, d), timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-1 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "ðŸ“¸ Snapshot")

          );
      })();
    }
  });

  // â•â•â• ðŸ”¬ anatomy (anatomy) â•â•â•
  window.StemLab.registerTool('anatomy', {
    icon: 'ðŸ”¬',
    label: 'anatomy',
    desc: '',
    color: 'slate',
    category: 'science',
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

      // â”€â”€ Tool body (anatomy) â”€â”€
      return (function() {
var d = labToolData.anatomy || {};

          var upd = function (k, v) { setLabToolData(function (p) { return Object.assign({}, p, { anatomy: Object.assign({}, p.anatomy, (function () { var o = {}; o[k] = v; return o; })()) }); }); };



          var SYSTEMS = {

            skeletal: {

              name: t('stem.synth_ui.skeletal'), icon: '\uD83E\uDDB4', color: '#fef3c7', accent: '#b45309',

              desc: '206 bones \u2014 support, protection, movement, mineral storage, hematopoiesis.',

              structures: [

                { id: 'skull', name: t('stem.synth_ui.skull_cranium'), x: 0.50, y: 0.06, v: 'b', fn: 'Protects the brain. 22 fused bones form the cranial vault (frontal, parietal\u00D72, temporal\u00D72, occipital, sphenoid, ethmoid) and facial skeleton (14 bones).', clinical: 'Fractures may cause epidural or subdural hematoma. Open fontanelles in infants allow brain growth and birth canal passage.', detail: 'Houses meninges, brain, and cranial nerve foramina. Sutures (coronal, sagittal, lambdoid) fuse by age 2.' },

                { id: 'mandible', name: t('stem.synth_ui.mandible'), x: 0.50, y: 0.10, v: 'a', fn: 'Only moveable skull bone. Enables mastication, speech, and facial expression. Houses lower teeth.', clinical: 'TMJ dysfunction causes jaw pain and clicking. Mandibular fractures are the second most common facial fracture.' },

                { id: 'clavicle', name: t('stem.synth_ui.clavicle'), x: 0.40, y: 0.155, v: 'a', fn: 'Horizontal strut connecting scapula to sternum. Transmits forces from upper limb to axial skeleton.', clinical: 'Most frequently fractured bone (fall on outstretched hand). Middle third fractures most common.' },

                { id: 'sternum', name: t('stem.synth_ui.sternum'), x: 0.50, y: 0.22, v: 'a', fn: 'Flat bone protecting heart and great vessels. Manubrium, body, and xiphoid process. Site for bone marrow biopsy in adults.', clinical: 'Sternal fractures from blunt chest trauma (steering wheel). CPR may cause xiphoid fractures.' },

                { id: 'ribs', name: t('stem.synth_ui.ribs_1_to_12'), x: 0.58, y: 0.25, v: 'b', fn: '12 pairs: 7 true (1\u20137), 3 false (8\u201310), 2 floating (11\u201312). Protect thoracic organs and assist ventilation.', clinical: 'Flail chest: 3+ adjacent ribs fractured in 2+ places. Rib fractures 9\u201311 may lacerate spleen or liver.' },

                { id: 'scapula', name: t('stem.synth_ui.scapula'), x: 0.38, y: 0.22, v: 'p', fn: 'Triangular flat bone on posterior thorax. Attachment for 17 muscles. Acromion and coracoid processes are key landmarks.', clinical: 'Winged scapula from long thoracic nerve (C5\u2013C7) palsy \u2014 serratus anterior paralysis.' },

                { id: 'humerus', name: t('stem.synth_ui.humerus'), x: 0.26, y: 0.27, v: 'a', fn: 'Upper arm bone. Articulates with scapula (shoulder) and radius/ulna (elbow). Greater/lesser tubercles for rotator cuff.', clinical: 'Midshaft fracture \u2192 radial nerve palsy (wrist drop). Surgical neck fracture \u2192 axillary nerve injury.' },

                { id: 'radius', name: t('stem.synth_ui.radius'), x: 0.21, y: 0.36, v: 'a', fn: 'Lateral forearm bone. Pivots around ulna for pronation/supination. Radial head at elbow, styloid process at wrist.', clinical: 'Colles fracture: distal radius fracture from FOOSH (fall on outstretched hand). "Dinner fork" deformity.' },

                { id: 'ulna', name: t('stem.synth_ui.ulna'), x: 0.24, y: 0.36, v: 'a', fn: 'Medial forearm bone. Olecranon forms elbow point. Trochlear notch articulates with humerus for hinge motion.', clinical: 'Olecranon fractures from direct trauma. Monteggia fracture: proximal ulna + radial head dislocation.' },

                { id: 'carpals', name: t('stem.synth_ui.carpals'), x: 0.17, y: 0.44, v: 'a', fn: '8 small bones in 2 rows: scaphoid, lunate, triquetrum, pisiform (proximal); trapezium, trapezoid, capitate, hamate (distal).', clinical: 'Scaphoid fracture: anatomical snuffbox tenderness. Avascular necrosis risk due to retrograde blood supply.' },

                { id: 'vertebral', name: t('stem.synth_ui.vertebral_column'), x: 0.50, y: 0.30, v: 'p', fn: '33 vertebrae: 7 cervical, 12 thoracic, 5 lumbar, 5 sacral (fused), 4 coccygeal (fused). Protects spinal cord. Four curves provide spring-like shock absorption.', clinical: 'Herniated disc (L4\u2013L5, L5\u2013S1 most common). Scoliosis, kyphosis, lordosis. Spinal stenosis.' },

                { id: 'pelvis', name: t('stem.synth_ui.pelvis'), x: 0.50, y: 0.42, v: 'b', fn: 'Ilium, ischium, pubis fused at acetabulum. Transfers weight from spine to lower limbs. Male pelvis narrower; female pelvis wider for childbirth.', clinical: 'Pelvic fractures \u2192 life-threatening hemorrhage from internal iliac vessels. Acetabular fractures require surgical fixation.' },

                { id: 'femur', name: t('stem.synth_ui.femur'), x: 0.42, y: 0.57, v: 'a', fn: 'Longest, strongest bone. Head fits into acetabulum. Neck angled 125\u00B0. Supports 2\u20133\u00D7 body weight during walking.', clinical: 'Hip fractures in elderly have 20\u201330% one-year mortality. Femoral neck fractures may disrupt blood supply \u2192 avascular necrosis.' },

                { id: 'patella', name: t('stem.synth_ui.patella'), x: 0.43, y: 0.66, v: 'a', fn: 'Largest sesamoid bone. Embedded in quadriceps tendon. Increases mechanical advantage of quadriceps by 30%.', clinical: 'Patellar fracture from direct trauma or forceful quad contraction. Patellofemoral syndrome ("runner\'s knee").' },

                { id: 'tibia', name: t('stem.synth_ui.tibia'), x: 0.42, y: 0.76, v: 'a', fn: 'Main weight-bearing bone of the leg. Medial malleolus forms inner ankle. Tibial plateau articulates with femoral condyles.', clinical: 'Tibial plateau fractures from axial loading. Open fractures common (subcutaneous anterior surface). Compartment syndrome risk.' },

                { id: 'fibula', name: t('stem.synth_ui.fibula'), x: 0.46, y: 0.76, v: 'a', fn: 'Non-weight-bearing lateral leg bone. Lateral malleolus forms outer ankle. Attachment for interosseous membrane and lateral compartment muscles.', clinical: 'Lateral malleolus fractures in ankle sprains. Maisonneuve fracture: proximal fibula + medial ankle injury.' },

                { id: 'tarsals', name: t('stem.synth_ui.tarsals'), x: 0.42, y: 0.89, v: 'a', fn: '7 bones: talus, calcaneus, navicular, cuboid, 3 cuneiforms. Form longitudinal and transverse foot arches for shock absorption.', clinical: 'Calcaneal fractures from axial loading (falls from height). Talus fractures risk avascular necrosis.' },

                { id: 'sacrum', name: t('stem.synth_ui.sacrum_coccyx'), x: 0.50, y: 0.44, v: 'p', fn: 'Sacrum: 5 fused vertebrae forming posterior pelvis. Sacral canal contains cauda equina. Coccyx: vestigial tail bone.', clinical: 'Sacral fractures in high-energy trauma. Coccydynia (tailbone pain) from falls or prolonged sitting.' },

                { id: 'hyoid', name: 'Hyoid Bone', x: 0.50, y: 0.12, v: 'a', fn: 'U-shaped bone at C3 level. Only bone not articulating with another bone \u2014 suspended by muscles and ligaments. Anchors tongue and aids swallowing and speech. Greater and lesser horns (cornua).', clinical: 'Hyoid fracture strongly associated with strangulation (forensic significance). Important in swallowing disorders (dysphagia evaluation). Attachment for suprahyoid and infrahyoid muscles.' },

                { id: 'atlas_axis', name: 'Atlas (C1) & Axis (C2)', x: 0.50, y: 0.08, v: 'p', fn: 'Atlas (C1): ring-shaped, no body or spinous process. Supports skull, allows nodding (yes). Axis (C2): has odontoid process (dens) that acts as pivot. Atlas rotates around dens for head rotation (no). Transverse ligament holds dens against atlas.', clinical: 'Jefferson fracture (C1 burst from axial loading). Hangman fracture (C2 pedicle bilateral fracture). Atlantoaxial subluxation in rheumatoid arthritis and Down syndrome. Odontoid fractures in elderly falls.' },

                { id: 'metatarsals', name: 'Metatarsals & Phalanges (Foot)', x: 0.44, y: 0.94, v: 'a', fn: '5 metatarsals form forefoot, 14 phalanges (great toe has 2, others have 3). First metatarsal bears most weight during push-off. Metatarsal heads form \u201cball of foot.\u201d Sesamoid bones under 1st metatarsal head.', clinical: 'Jones fracture (5th metatarsal base): poor healing due to watershed blood supply. Stress fractures in runners (2nd/3rd metatarsal). Morton neuroma: interdigital nerve compression. Hallux valgus (bunion).' },

                { id: 'metacarpals', name: 'Metacarpals & Phalanges (Hand)', x: 0.15, y: 0.48, v: 'a', fn: '5 metacarpals and 14 phalanges. Thumb (1st metacarpal) has saddle joint at CMC for opposition \u2014 unique to primates. Each finger has 3 phalanges (proximal, middle, distal) except thumb (2). Extensor mechanism on dorsum.', clinical: 'Boxer fracture (5th metacarpal neck). Bennett fracture (1st metacarpal base). Mallet finger (extensor tendon avulsion at DIP). Jersey finger (FDP avulsion). Dupuytren contracture: palmar fascia thickening.' },

                { id: 'scaphoid_bone', name: 'Scaphoid Bone', x: 0.18, y: 0.45, v: 'a', fn: 'Largest carpal bone in proximal row. Crosses both carpal rows, making it vulnerable to fracture. Blood supply enters distally (retrograde) \u2014 fractures may disrupt blood flow to proximal pole. Palpable in anatomical snuffbox.', clinical: 'Most commonly fractured carpal bone (FOOSH mechanism). Anatomical snuffbox tenderness is key exam finding. Risk of avascular necrosis of proximal pole (retrograde blood supply). Often missed on initial X-ray \u2014 requires repeat imaging or MRI.' }

              ]

            },

            muscular: {

              name: t('stem.synth_ui.muscular'), icon: '\uD83D\uDCAA', color: '#fce7f3', accent: '#be185d',

              desc: '600+ muscles \u2014 movement, posture, heat production, joint stabilization.',

              structures: [

                { id: 'deltoid', name: t('stem.synth_ui.deltoid'), x: 0.30, y: 0.18, v: 'a', fn: 'Primary shoulder abductor (middle fibers). Anterior fibers flex/medially rotate; posterior fibers extend/laterally rotate the arm.', origin: 'Lateral third of clavicle, acromion, scapular spine', insertion: 'Deltoid tuberosity of humerus', clinical: 'Atrophy from axillary nerve injury (C5\u2013C6). IM injection site (avoid in children < 3 yrs).' },

                { id: 'pectoralis', name: t('stem.synth_ui.pectoralis_major'), x: 0.42, y: 0.22, v: 'a', fn: 'Powerful arm adductor, flexor, and medial rotator. Clavicular head flexes; sternocostal head adducts and extends from flexed position.', origin: 'Clavicle, sternum, ribs 1\u20136, external oblique aponeurosis', insertion: 'Lateral lip of bicipital groove (humerus)', clinical: 'Rupture during bench press \u2014 "dropped pec" sign. Poland syndrome: congenital absence.' },

                { id: 'biceps', name: t('stem.synth_ui.biceps_brachii'), x: 0.24, y: 0.29, v: 'a', fn: 'Powerful forearm supinator and elbow flexor. Long head stabilizes shoulder joint. Short head assists shoulder flexion.', origin: 'Short head: coracoid process; Long head: supraglenoid tubercle', insertion: 'Radial tuberosity and bicipital aponeurosis', clinical: 'Long head tendon rupture \u2192 "Popeye deformity." Biceps reflex tests C5\u2013C6 nerve roots.' },

                { id: 'triceps', name: t('stem.synth_ui.triceps_brachii'), x: 0.73, y: 0.29, v: 'p', fn: 'Only elbow extensor. Three heads: long (crosses shoulder), lateral, and medial. Essential for pushing movements.', origin: 'Long: infraglenoid tubercle; Lateral/medial: posterior humerus', insertion: 'Olecranon process of ulna', clinical: 'Weakness in radial nerve palsy (C7 root). Triceps reflex tests C7\u2013C8 nerve roots.' },

                { id: 'rectus_ab', name: t('stem.synth_ui.rectus_abdominis'), x: 0.50, y: 0.34, v: 'a', fn: 'Flexes trunk (sit-ups/crunches). Compresses abdominal contents. Assists forced expiration and stabilizes pelvis during walking.', origin: 'Pubic crest and symphysis', insertion: 'Xiphoid process, costal cartilages 5\u20137', clinical: 'Diastasis recti: midline separation (common in pregnancy). "Six-pack" \u2014 tendinous intersections create segmented appearance.' },

                { id: 'obliques', name: t('stem.synth_ui.external_obliques'), x: 0.58, y: 0.34, v: 'a', fn: 'Trunk rotation (contralateral), lateral flexion, and abdominal compression. Largest and most superficial abdominal muscle.', origin: 'External surfaces of ribs 5\u201312', insertion: 'Linea alba, pubic tubercle, iliac crest', clinical: 'Strains from twisting sports. Inguinal ligament (lower border) is key landmark for hernia surgery.' },

                { id: 'quads', name: t('stem.synth_ui.quadriceps_femoris'), x: 0.42, y: 0.55, v: 'a', fn: 'Four muscles (rectus femoris, vastus lateralis/medialis/intermedius). Primary knee extensor. Rectus femoris also flexes hip.', origin: 'Rectus femoris: AIIS; Vasti: femoral shaft', insertion: 'Tibial tuberosity via patellar tendon', clinical: 'Quadriceps tendon/patellar tendon rupture. VMO weakness \u2192 patellofemoral tracking issues.' },

                { id: 'hamstrings', name: t('stem.synth_ui.hamstrings'), x: 0.58, y: 0.58, v: 'p', fn: 'Three muscles (biceps femoris, semitendinosus, semimembranosus). Flex knee and extend hip. Critical for deceleration in running.', origin: 'Ischial tuberosity (all three); biceps femoris short head: linea aspera', insertion: 'Biceps: fibular head; Semi-T: pes anserinus; Semi-M: posterior medial tibial condyle', clinical: '"Pulled hamstring" \u2014 most common muscle strain in athletes. Proximal avulsion in sprinters.' },

                { id: 'gastrocnemius', name: t('stem.synth_ui.gastrocnemius'), x: 0.58, y: 0.74, v: 'p', fn: 'Superficial calf muscle. Powerful plantar flexor (push-off in gait) and weak knee flexor. Two heads span the knee joint.', origin: 'Medial and lateral femoral condyles', insertion: 'Calcaneus via Achilles tendon', clinical: 'Achilles tendon rupture (positive Thompson test). "Tennis leg" \u2014 medial head tear.' },

                { id: 'trapezius', name: t('stem.synth_ui.trapezius'), x: 0.50, y: 0.20, v: 'p', fn: 'Large diamond-shaped muscle. Upper fibers elevate scapula (shrug); middle fibers retract; lower fibers depress and rotate scapula upward.', origin: 'External occipital protuberance, nuchal ligament, C7\u2013T12 spinous processes', insertion: 'Lateral third of clavicle, acromion, scapular spine', clinical: 'Spinal accessory nerve (CN XI) palsy \u2192 inability to shrug shoulder. Shoulder droop.' },

                { id: 'lats', name: t('stem.synth_ui.latissimus_dorsi'), x: 0.62, y: 0.32, v: 'p', fn: 'Broadest back muscle. Powerful arm extensor, adductor, and medial rotator. Key muscle in swimming, climbing, and pull-ups.', origin: 'T6\u2013T12 spinous processes, thoracolumbar fascia, iliac crest, ribs 9\u201312', insertion: 'Floor of bicipital (intertubercular) groove', clinical: 'Used in reconstructive surgery (myocutaneous flaps). Thoracodorsal nerve (C6\u2013C8) innervation.' },

                { id: 'glutes', name: t('stem.synth_ui.gluteus_maximus'), x: 0.50, y: 0.44, v: 'p', fn: 'Largest muscle in the body. Powerful hip extensor and lateral rotator. Essential for standing from seated position, climbing stairs, running.', origin: 'Posterior ilium, sacrum, coccyx, sacrotuberous ligament', insertion: 'IT band and gluteal tuberosity of femur', clinical: 'Weakness \u2192 Trendelenburg gait (compensatory trunk lean). Inferior gluteal nerve (L5\u2013S2).' },

                { id: 'sartorius', name: t('stem.synth_ui.sartorius'), x: 0.38, y: 0.52, v: 'a', fn: 'Longest muscle in the body. Crosses hip and knee. Produces the "tailor\'s position" (cross-legged sitting): hip flexion, abduction, lateral rotation + knee flexion.', origin: 'Anterior superior iliac spine (ASIS)', insertion: 'Pes anserinus (medial proximal tibia)', clinical: 'Pes anserinus bursitis causes medial knee pain. Landmark for femoral triangle.' },

                { id: 'tibialis', name: t('stem.synth_ui.tibialis_anterior'), x: 0.40, y: 0.76, v: 'a', fn: 'Primary ankle dorsiflexor and foot inverter. Prevents foot slap during heel strike. Supports medial longitudinal arch.', origin: 'Lateral tibial condyle, upper 2/3 of lateral tibial surface', insertion: 'Medial cuneiform, base of 1st metatarsal', clinical: 'Foot drop from deep peroneal nerve injury. Shin splints (medial tibial stress syndrome).' },

                { id: 'soleus', name: t('stem.synth_ui.soleus'), x: 0.58, y: 0.78, v: 'p', fn: 'Deep calf muscle beneath gastrocnemius. Plantar flexion (postural muscle \u2014 prevents forward falling while standing). Does not cross knee.', origin: 'Soleal line and posterior proximal fibula', insertion: 'Calcaneus via Achilles tendon', clinical: 'Soleus muscle pump aids venous return. DVT risk when immobile (long flights). Soleus strain in runners.' },

                { id: 'rotator_cuff', name: 'Rotator Cuff (SITS)', x: 0.34, y: 0.20, v: 'p', fn: 'Four muscles: Supraspinatus (initiates abduction, most commonly torn), Infraspinatus (lateral rotation), Teres minor (lateral rotation), Subscapularis (medial rotation). Stabilize glenohumeral joint and keep humeral head in glenoid fossa.', origin: 'Scapula (various fossae)', insertion: 'Greater and lesser tubercles of humerus', clinical: 'Rotator cuff tears: most common shoulder pathology (especially supraspinatus). Impingement syndrome: supraspinatus compressed under acromion during abduction. Positive empty can test, drop arm test.' },

                { id: 'iliopsoas', name: 'Iliopsoas', x: 0.44, y: 0.44, v: 'a', fn: 'Compound muscle: iliacus + psoas major. Most powerful hip flexor. Psoas major originates from T12\u2013L5 vertebral bodies (only muscle connecting spine to lower limb). Critical for walking, running, and maintaining upright posture.', origin: 'Psoas: T12\u2013L5 vertebrae. Iliacus: iliac fossa', insertion: 'Lesser trochanter of femur', clinical: 'Psoas abscess from spinal TB or Crohn disease. Psoas sign: pain on hip extension (suggests appendicitis/abscess). Hip flexion contracture in elderly/wheelchair-bound. Thomas test for hip flexion contracture.' },

                { id: 'intercostals', name: 'Intercostal Muscles', x: 0.56, y: 0.24, v: 'a', fn: 'Three layers between ribs. External intercostals: elevate ribs for inspiration. Internal intercostals: depress ribs for forced expiration. Innermost intercostals: similar to internal. Intercostal neurovascular bundle runs in costal groove (vein, artery, nerve \u2014 VAN, superior to inferior).', origin: 'Inferior border of rib above', insertion: 'Superior border of rib below', clinical: 'Intercostal nerve block for rib fracture pain. Chest tube insertion above rib to avoid neurovascular bundle. Intercostal neuralgia: chronic chest wall pain. Herpes zoster (shingles) follows intercostal dermatome.' },

                { id: 'pelvic_floor', name: 'Pelvic Floor (Levator Ani)', x: 0.50, y: 0.46, v: 'p', fn: 'Muscular \u201chammock\u201d supporting pelvic organs: pubococcygeus, puborectalis, iliococcygeus. Supports bladder, uterus/prostate, rectum. Puborectalis maintains fecal continence (anorectal angle). Contracts during Kegel exercises.', origin: 'Pubis, obturator fascia (arcus tendineus), ischial spine', insertion: 'Coccyx, anococcygeal raphe, perineal body', clinical: 'Pelvic floor weakness: urinary incontinence, pelvic organ prolapse (cystocele, rectocele, uterine prolapse). Common after vaginal delivery. Kegel exercises for strengthening. Pelvic floor dysfunction: chronic pelvic pain, dyspareunia.' },

                { id: 'diaphragm_m', name: 'Diaphragm (Muscle)', x: 0.50, y: 0.27, v: 'b', fn: 'Primary muscle of respiration (responsible for 70% of quiet breathing). Dome-shaped musculotendinous partition between thorax and abdomen. Central tendon + peripheral muscle fibers from xiphoid, ribs 7\u201312, L1\u2013L3 vertebrae (crura). Right crus larger, encircles esophagus.', origin: 'Xiphoid process, costal cartilages 7\u201312, L1\u2013L3 crura', insertion: 'Central tendon', clinical: 'Hiccups: involuntary diaphragm spasm. Phrenic nerve (C3\u2013C5): \u201cC3, 4, 5 keeps the diaphragm alive.\u201d Diaphragmatic hernia: abdominal contents in thorax. Congenital diaphragmatic hernia (Bochdalek): left-sided, neonatal respiratory distress.' }

              ]

            },

            circulatory: {

              name: t('stem.synth_ui.circulatory'), icon: '\u2764\uFE0F', color: '#fee2e2', accent: '#dc2626',

              desc: 'Heart, 60,000 miles of vessels, 5L of blood \u2014 delivers O\u2082, nutrients, hormones; removes waste.',

              structures: [

                { id: 'heart', name: t('stem.synth_ui.heart'), x: 0.48, y: 0.24, v: 'a', fn: 'Muscular pump. 4 chambers: RA/RV (pulmonary circuit), LA/LV (systemic circuit). Beats ~100,000\u00D7/day, pumps ~5L/min at rest.', clinical: 'MI (heart attack): coronary artery occlusion. Heart failure, arrhythmias, valvular disease. Leading cause of death worldwide.' },

                { id: 'aorta', name: t('stem.synth_ui.aorta'), x: 0.52, y: 0.22, v: 'a', fn: 'Largest artery. Ascending aorta \u2192 aortic arch (brachiocephalic, left common carotid, left subclavian) \u2192 descending thoracic \u2192 abdominal aorta.', clinical: 'Aortic aneurysm (abdominal > 5.5cm \u2192 surgical repair). Aortic dissection: tearing chest pain, emergency.' },

                { id: 'sup_vena', name: t('stem.synth_ui.superior_vena_cava'), x: 0.54, y: 0.20, v: 'a', fn: 'Returns deoxygenated blood from head, neck, upper limbs, and thorax to the right atrium. Formed by union of brachiocephalic veins.', clinical: 'SVC syndrome: obstruction (often by lung cancer/lymphoma) causes facial swelling, dyspnea, distended neck veins.' },

                { id: 'inf_vena', name: t('stem.synth_ui.inferior_vena_cava'), x: 0.52, y: 0.36, v: 'a', fn: 'Largest vein. Returns blood from lower body to right atrium. Formed at L5 by union of common iliac veins. Passes through diaphragm at T8.', clinical: 'IVC filter placement for recurrent PE. IVC compression during pregnancy (supine hypotension syndrome).' },

                { id: 'pulm_art', name: t('stem.synth_ui.pulmonary_arteries'), x: 0.46, y: 0.22, v: 'a', fn: 'Carry deoxygenated blood from RV to lungs. Only arteries that carry deoxygenated blood. Bifurcates at T5.', clinical: 'Pulmonary embolism (PE): clot from DVT lodges in pulmonary arteries. Saddle PE is life-threatening.' },

                { id: 'carotid', name: t('stem.synth_ui.carotid_arteries'), x: 0.44, y: 0.12, v: 'a', fn: 'Common carotid bifurcates at C4 into internal (brain) and external (face/scalp). Internal carotid supplies anterior 2/3 of brain.', clinical: 'Carotid stenosis causes stroke/TIA. Carotid endarterectomy for >70% stenosis. Carotid body senses O\u2082/CO\u2082/pH.' },

                { id: 'jugular', name: t('stem.synth_ui.jugular_veins'), x: 0.56, y: 0.12, v: 'a', fn: 'Internal jugular drains brain and face (runs with carotid in carotid sheath). External jugular visible on neck surface.', clinical: 'JVD (jugular venous distension) \u2192 sign of right heart failure, cardiac tamponade, tension pneumothorax.' },

                { id: 'coronary', name: t('stem.synth_ui.coronary_arteries'), x: 0.46, y: 0.25, v: 'a', fn: 'LAD (left anterior descending) supplies anterior LV wall and septum ("widow maker"). LCx supplies lateral LV. RCA supplies RV and inferior LV.', clinical: 'LAD occlusion: anterior STEMI (most dangerous). RCA occlusion: inferior MI with possible heart block.' },

                { id: 'femoral_a', name: t('stem.synth_ui.femoral_artery'), x: 0.44, y: 0.48, v: 'a', fn: 'Main blood supply to lower limb. Palpable at mid-inguinal point (midway ASIS to pubic symphysis). Becomes popliteal artery behind knee.', clinical: 'Femoral artery catheterization for angiography. Femoral artery laceration \u2192 rapid exsanguination.' },

                { id: 'brachial', name: t('stem.synth_ui.brachial_artery'), x: 0.28, y: 0.30, v: 'a', fn: 'Continuation of axillary artery. Runs medially in arm. Blood pressure measured here (antecubital fossa). Bifurcates into radial and ulnar arteries.', clinical: 'BP cuff occludes brachial artery (Korotkoff sounds). Supracondylar fracture may damage brachial artery \u2192 Volkmann contracture.' },

                { id: 'portal', name: t('stem.synth_ui.hepatic_portal_vein'), x: 0.52, y: 0.32, v: 'a', fn: 'Carries nutrient-rich blood from GI tract and spleen to liver for processing. Formed by superior mesenteric and splenic veins. Portal circulation is unique.', clinical: 'Portal hypertension in cirrhosis \u2192 esophageal varices, caput medusae, hemorrhoids, splenomegaly.' },

                { id: 'circle_willis', name: 'Circle of Willis', x: 0.50, y: 0.08, v: 'a', fn: 'Arterial anastomotic ring at base of brain. Formed by: anterior communicating artery connecting ACA\u2013ACA, posterior communicating arteries connecting ICA\u2013PCA, plus segments of ACA, ICA, and PCA. Provides collateral blood flow if one vessel is occluded. Complete circle in only ~25% of people.', clinical: 'Berry (saccular) aneurysms: most common at anterior communicating artery junction. Rupture \u2192 subarachnoid hemorrhage (\u201cthunderclap headache\u201d). Congenital variants may limit collateral flow \u2192 increased stroke risk.' },

                { id: 'saphenous', name: 'Great Saphenous Vein', x: 0.40, y: 0.70, v: 'a', fn: 'Longest vein in body. Runs from dorsum of foot, anterior to medial malleolus, up medial leg and thigh, drains into femoral vein at saphenous opening (saphenofemoral junction). Superficial position makes it accessible for cannulation and grafting.', clinical: 'Varicose veins from incompetent valves (superficial venous insufficiency). Used as conduit for CABG (coronary artery bypass graft surgery). Saphenous nerve runs alongside \u2014 may be injured during vein stripping. DVT risk in varicosities.' },

                { id: 'lymph_circ', name: 'Lymphatic Vessels', x: 0.36, y: 0.50, v: 'a', fn: 'One-way drainage system parallel to venous system. Begins as blind-ended lymph capillaries in tissues, drains through lymph nodes, collecting vessels, trunks, and ducts. Right lymphatic duct drains right upper body; thoracic duct drains everything else. Lymph propelled by skeletal muscle contraction and one-way valves.', clinical: 'Lymphedema: impaired drainage \u2192 chronic swelling (post-surgical, filariasis in tropics). Lymphangitis: red streaking from infected lymph vessel. Sentinel lymph node biopsy for cancer staging. Chylothorax from thoracic duct injury.' }

              ]

            },

            nervous: {

              name: t('stem.synth_ui.nervous'), icon: '\u26A1', color: '#ede9fe', accent: '#7c3aed',

              desc: 'CNS (brain + spinal cord) and PNS (31 spinal nerve pairs, 12 cranial nerve pairs, autonomic NS).',

              structures: [

                { id: 'brain', name: t('stem.synth_ui.brain'), x: 0.50, y: 0.05, v: 'b', fn: '~86 billion neurons. Cerebrum (cognition, sensation, motor), cerebellum (coordination), brainstem (vital functions). Weighs ~1.4 kg, uses 20% of O\u2082. Protected by meninges (dura, arachnoid, pia mater) and cerebrospinal fluid (CSF). Four lobes per hemisphere: frontal, parietal, temporal, occipital.', clinical: 'Stroke (ischemic/hemorrhagic), TBI, neurodegenerative diseases (Alzheimer, Parkinson), brain tumors, epilepsy. EEG measures brain waves for diagnosis of seizures, sleep disorders, and brain death.',

                  brainWaves: [

                    { type: 'Delta (\u03b4)', freq: '0.5\u20134 Hz', amplitude: 'Highest', state: 'Deep dreamless sleep (N3)', color: '#6366f1', emoji: '\uD83D\uDE34', characteristics: 'Dominant in deep NREM sleep (stage N3). Associated with growth hormone release, tissue repair, and immune system strengthening. Excessive delta in waking = brain injury or encephalopathy.', clinical: 'Abnormal waking delta waves indicate brain lesions, metabolic encephalopathy, or diffuse cortical damage. Used to assess depth of anesthesia and coma.' },

                    { type: 'Theta (\u03b8)', freq: '4\u20138 Hz', amplitude: 'Medium\u2013High', state: 'Drowsiness, light sleep, meditation', color: '#8b5cf6', emoji: '\uD83E\uDDD8', characteristics: 'Prominent in light sleep (N1), deep meditation, and creative insight. Hippocampal theta rhythms are critical for memory encoding and spatial navigation.', clinical: 'Excessive theta in waking = ADHD, cognitive impairment, or drowsiness. Theta bursts during memory tasks reflect hippocampal-cortical dialogue for memory consolidation.' },

                    { type: 'Alpha (\u03b1)', freq: '8\u201313 Hz', amplitude: 'Medium', state: 'Relaxed wakefulness, eyes closed', color: '#06b6d4', emoji: '\uD83C\uDF3F', characteristics: 'First brain wave discovered (Hans Berger, 1929). Dominant when relaxed with eyes closed. Blocked by eye opening or mental effort ("alpha blocking"). Generated primarily in the occipital cortex.', clinical: 'Reduced alpha = anxiety, insomnia. Asymmetric alpha = cortical lesion or stroke. Alpha training used in neurofeedback for anxiety, ADHD, and peak performance.' },

                    { type: 'Beta (\u03b2)', freq: '13\u201330 Hz', amplitude: 'Low', state: 'Active thinking, focus, alertness', color: '#f59e0b', emoji: '\u26A1', characteristics: 'Dominant during active cognition, problem-solving, conversation, and decision-making. Sub-bands: low beta (13\u201315 Hz, relaxed focus), mid beta (15\u201320 Hz, active thinking), high beta (20\u201330 Hz, anxiety/excitement).', clinical: 'Excessive high beta = anxiety, stress, insomnia. Medications like benzodiazepines increase beta. Beta activity used in BCI (brain-computer interfaces) for motor imagery.' },

                    { type: 'Gamma (\u03b3)', freq: '30\u2013100+ Hz', amplitude: 'Lowest', state: 'Higher cognition, binding, consciousness', color: '#ef4444', emoji: '\uD83E\uDDE0', characteristics: 'Associated with sensory binding (combining sight, sound, touch into unified percepts), peak concentration, expanded consciousness, and compassion meditation. Highest frequency, lowest amplitude. Generated by fast-spiking interneurons.', clinical: 'Reduced gamma = schizophrenia, Alzheimer disease. Gamma entrainment via 40 Hz light/sound stimulation is being researched for Alzheimer treatment. Experienced meditators show elevated gamma.' }

                  ],

                  sleepStages: [

                    { stage: 'N1 (NREM Stage 1)', pct: '2\u20135%', duration: '1\u20137 min', waves: 'Theta (4\u20138 Hz)', emoji: '\uD83D\uDE0C', desc: 'Lightest sleep \u2014 transition from wakefulness. Slow rolling eye movements, muscle tone decreasing. Hypnic jerks (myoclonic twitches) common. Easily aroused. Vertex sharp waves appear on EEG.', clinical: 'Excessive N1 = sleep fragmentation (sleep apnea, restless legs). Hypnic hallucinations may occur. Sleep onset latency measured here for narcolepsy diagnosis (MSLT test).' },

                    { stage: 'N2 (NREM Stage 2)', pct: '45\u201355%', duration: '10\u201325 min', waves: 'Theta + Sleep spindles (12\u201314 Hz) + K-complexes', emoji: '\uD83D\uDCA4', desc: 'True sleep begins. Core body temperature drops, heart rate slows. Sleep spindles (thalamocortical bursts) protect sleep and consolidate motor memory. K-complexes are large waveforms responding to external stimuli.', clinical: 'Sleep spindles correlate with IQ and learning ability. Reduced spindles in schizophrenia and aging. K-complexes are the brain\u2019s "sentry" \u2014 evaluating stimuli without waking.' },

                    { stage: 'N3 (NREM Stage 3)', pct: '15\u201325%', duration: '20\u201340 min', waves: 'Delta (0.5\u20132 Hz), >20% of epoch', emoji: '\uD83C\uDF19', desc: 'Deep/slow-wave sleep (SWS). Most restorative stage. Growth hormone secretion peaks. Glymphatic system clears brain waste (amyloid-\u03b2). Declarative memory consolidation occurs. Hardest to awaken from; sleep inertia if aroused.', clinical: 'Reduced N3 in aging, Alzheimer (amyloid accumulation). Sleepwalking, night terrors, and bedwetting occur during N3 arousal. Critical for immune function \u2014 sleep deprivation impairs T-cell function.' },

                    { stage: 'REM (Rapid Eye Movement)', pct: '20\u201325%', duration: '10\u201360 min (increases across night)', waves: 'Beta/Gamma (desynchronized, "paradoxical" \u2014 looks like waking EEG)', emoji: '\uD83C\uDF1F', desc: 'Dreaming stage. Brain is highly active (similar to waking) but body is paralyzed (atonia via brainstem inhibition of motor neurons). Rapid conjugate eye movements. Emotional memory processing and creative problem-solving. Cycles lengthen through the night.', clinical: 'REM behavior disorder (RBD): loss of atonia \u2192 acting out dreams \u2014 strong predictor of Parkinson/Lewy body dementia. Narcolepsy: premature REM onset (SOREMPs). Nightmares occur in REM. SSRIs suppress REM sleep.' }

                  ]

                },

                { id: 'cerebral_cortex', name: 'Cerebral Cortex (4 Lobes)', x: 0.50, y: 0.04, v: 'a', fn: 'Thin (2\u20134mm) outer layer of gray matter with ~16 billion neurons. 6 layers of cortical columns. Divided into 4 lobes: Frontal (executive function, motor, Broca area), Parietal (somatosensory, spatial), Temporal (auditory, Wernicke area, memory), Occipital (vision). Comprises 80% of brain mass.', clinical: 'Frontal lobe damage: personality change (Phineas Gage case), impaired judgment. Parietal lesions: hemispatial neglect. Temporal lobe epilepsy: most common focal seizure type. Occipital stroke: cortical blindness.', detail: 'Brodmann areas map 52 cytoarchitectural regions. Primary motor cortex (area 4), primary somatosensory (areas 3,1,2), primary visual (area 17), primary auditory (areas 41,42). Prefrontal cortex is last to myelinate (age ~25).' },

                { id: 'cerebellum', name: 'Cerebellum', x: 0.52, y: 0.07, v: 'p', fn: '10% of brain volume but contains ~50% of all neurons (~69 billion). "Little brain" at posterior fossa. Three functional divisions: vestibulocerebellum (balance), spinocerebellum (limb coordination), cerebrocerebellum (motor planning, cognition). Compares intended vs actual movement for error correction.', clinical: 'Cerebellar lesions: ataxia (uncoordinated gait), intention tremor, dysarthria (scanning speech), nystagmus, past-pointing. Cerebellar stroke: acute vertigo and ataxia may be misdiagnosed as inner ear problems. Fetal alcohol syndrome damages cerebellum.', detail: 'Purkinje cells are among the largest neurons, each receiving ~200,000 synaptic inputs. Cerebellar cortex has 3 layers: molecular, Purkinje, granular. Emerging research shows roles in cognition, emotion, and language.' },

                { id: 'brainstem', name: 'Brainstem (Midbrain, Pons, Medulla)', x: 0.50, y: 0.08, v: 'p', fn: 'Connects cerebrum to spinal cord. Three parts: Midbrain (visual/auditory reflexes, substantia nigra for dopamine), Pons (relay between cortex and cerebellum, respiratory rhythm), Medulla oblongata (cardiovascular center, respiratory center, vomiting, swallowing). Reticular formation spans all three \u2014 controls arousal and consciousness.', clinical: 'Brainstem death = legal death in many jurisdictions (irreversible loss of consciousness and vital reflexes). Locked-in syndrome (ventral pons lesion): conscious but unable to move except eyes. Central sleep apnea from medullary dysfunction.', detail: 'Contains nuclei for cranial nerves III\u2013XII. Reticular activating system (RAS) is the brain\u2019s "on switch" \u2014 damage causes coma. Decussation of pyramids in medulla: motor crossover explains contralateral motor control.' },

                { id: 'hippocampus', name: 'Hippocampus', x: 0.48, y: 0.06, v: 'a', fn: 'Seahorse-shaped structure in medial temporal lobe. Critical for converting short-term memory to long-term memory (consolidation). Contains place cells for spatial navigation (Nobel Prize 2014, O\u2019Keefe). One of two brain regions with adult neurogenesis (new neuron formation). Theta rhythms during memory encoding.', clinical: 'Alzheimer disease begins here \u2014 hippocampal atrophy on MRI is an early diagnostic marker. Bilateral hippocampal damage (e.g., Patient H.M.) causes severe anterograde amnesia. Chronic stress and cortisol shrink the hippocampus. PTSD associated with reduced hippocampal volume.', detail: 'Memory replay during sleep: hippocampal neurons "replay" daytime experiences during N3 sleep, transferring memories to neocortex. Grid cells in entorhinal cortex provide spatial coordinates to hippocampal place cells.' },

                { id: 'amygdala', name: 'Amygdala', x: 0.46, y: 0.06, v: 'a', fn: 'Almond-shaped nuclei in anterior temporal lobe. Key hub for processing fear, threat detection, and emotional memory. Receives fast "low road" input from thalamus for rapid danger response (before conscious awareness). Modulates memory storage based on emotional arousal (why emotional events are remembered better).', clinical: 'Hyperactive amygdala in anxiety disorders, PTSD, and phobias. Bilateral amygdala damage (Urbach-Wiethe disease): inability to recognize fear in faces, impaired fear conditioning. Amygdala involved in autism spectrum disorder (social threat processing).', detail: 'Fear conditioning pathway: auditory cortex \u2192 lateral amygdala \u2192 central amygdala \u2192 hypothalamus (stress response) + PAG (freezing). Amygdala-prefrontal interactions allow emotional regulation \u2014 basis of CBT therapy.' },

                { id: 'thalamus', name: 'Thalamus', x: 0.50, y: 0.06, v: 'b', fn: 'Paired egg-shaped structures forming 80% of diencephalon. "Gateway to consciousness" \u2014 relays and filters ALL sensory information to cortex (except olfaction). Contains ~60 nuclei organized into functional groups. Generates sleep spindles during N2 sleep. Thalamocortical oscillations underlie consciousness itself.', clinical: 'Thalamic stroke: contralateral sensory loss + thalamic pain syndrome (Dejerine-Roussy: severe, burning pain). Fatal familial insomnia: prion disease destroying thalamus \u2192 complete inability to sleep \u2192 death. Deep brain stimulation of thalamus for essential tremor.', detail: 'Key nuclei: VPL/VPM (somatosensory relay), LGN (visual relay to V1), MGN (auditory relay to A1), pulvinar (attention), anterior nuclear group (memory, Papez circuit).' },

                { id: 'hypothalamus', name: 'Hypothalamus', x: 0.50, y: 0.07, v: 'a', fn: 'Small (4g, ~1% of brain) but controls: body temperature, hunger/thirst, circadian rhythm (SCN = master clock), autonomic nervous system, pituitary gland (via hypothalamic-hypophyseal portal system). Suprachiasmatic nucleus (SCN) receives light input from retina and entrains 24-hr circadian cycle.', clinical: 'Hypothalamic dysfunction: diabetes insipidus (no ADH), obesity (ventromedial lesion = hyperphagia), anorexia (lateral lesion = aphagia). Circadian disruption linked to depression, metabolic syndrome, cancer. Jet lag = SCN resynchronizing.', detail: 'Thermostat analogy: anterior hypothalamus triggers cooling (vasodilation, sweating); posterior hypothalamus triggers warming (shivering, vasoconstriction). Fever = elevated set point by prostaglandins from infection.' },

                { id: 'corpus_callosum', name: 'Corpus Callosum', x: 0.50, y: 0.05, v: 'b', fn: 'Largest white matter structure in brain. ~200 million axons connecting left and right hemispheres. Enables interhemispheric communication and integration. Develops throughout childhood; fully myelinated by age ~12. Four regions: rostrum, genu, body, splenium.', clinical: 'Split-brain patients (callosotomy for epilepsy): each hemisphere operates independently \u2014 left hand "doesn\u2019t know" what right hand is doing (Roger Sperry, Nobel 1981). Agenesis of corpus callosum: congenital absence, often incidental finding. Callosal lesions in MS.', detail: 'Split-brain experiments revealed hemispheric specialization: left hemisphere = language, logic; right hemisphere = spatial, holistic processing. Information presented to one visual field is processed by contralateral hemisphere.' },

                { id: 'basal_ganglia', name: 'Basal Ganglia', x: 0.48, y: 0.05, v: 'a', fn: 'Deep gray matter nuclei: caudate, putamen (together = striatum), globus pallidus. With substantia nigra and subthalamic nucleus, form circuits for motor initiation/inhibition, habit formation, reward learning, and procedural memory. Direct pathway facilitates movement; indirect pathway inhibits movement.', clinical: 'Parkinson disease: dopamine depletion in substantia nigra \u2192 bradykinesia, rigidity, resting tremor, postural instability. Huntington disease: caudate/putamen degeneration \u2192 chorea (involuntary dance-like movements). OCD linked to caudate hyperactivity. Deep brain stimulation of subthalamic nucleus for Parkinson.', detail: 'Dopamine from substantia nigra modulates the direct (D1, excitatory) and indirect (D2, inhibitory) pathways. Loss of this modulation in Parkinson creates the characteristic difficulty initiating movement.' },

                { id: 'spinal_cord', name: t('stem.synth_ui.spinal_cord'), x: 0.50, y: 0.30, v: 'p', fn: 'Extends from foramen magnum to L1\u2013L2 (conus medullaris). Conducts sensory/motor signals. 31 segments, each with dorsal (sensory) and ventral (motor) roots.', clinical: 'Spinal cord injury: above C4 \u2192 quadriplegia + ventilator. Complete transection \u2192 loss of motor/sensory below level.' },

                { id: 'vagus', name: t('stem.synth_ui.vagus_nerve_cn_x'), x: 0.44, y: 0.14, v: 'a', fn: 'Longest cranial nerve. Parasympathetic innervation to thoracic and abdominal viscera. Slows heart rate, increases GI motility, controls laryngeal muscles.', clinical: 'Vagal stimulation: carotid sinus massage, Valsalva maneuver for SVT. Vagus nerve stimulator for epilepsy/depression. Recurrent laryngeal nerve injury \u2192 hoarseness.' },

                { id: 'sciatic', name: t('stem.synth_ui.sciatic_nerve'), x: 0.55, y: 0.50, v: 'p', fn: 'Largest/longest nerve in body. L4\u2013S3 roots. Exits pelvis through greater sciatic foramen below piriformis. Divides into tibial and common peroneal nerves above knee.', clinical: 'Sciatica: radiculopathy from herniated disc (L4\u2013S1). Piriformis syndrome mimics sciatica. IM injection site avoidance.' },

                { id: 'brachial_plexus', name: t('stem.synth_ui.brachial_plexus'), x: 0.34, y: 0.16, v: 'a', fn: 'C5\u2013T1 nerve roots form trunks, divisions, cords, branches. Innervates entire upper limb. "Robert Taylor Drinks Cold Beer" (roots, trunks, divisions, cords, branches).', clinical: 'Erb-Duchenne palsy (C5\u2013C6): "waiter\'s tip" position. Klumpke palsy (C8\u2013T1): claw hand. Birth injuries, motorcycle accidents.' },

                { id: 'median', name: t('stem.synth_ui.median_nerve'), x: 0.22, y: 0.38, v: 'a', fn: 'C5\u2013T1 via lateral and medial cords. Motor: forearm pronators, wrist/finger flexors, thenar muscles. Sensory: palmar lateral 3.5 digits.', clinical: 'Carpal tunnel syndrome: median nerve compression under flexor retinaculum. Hand of benediction (can\'t flex index/middle fingers).' },

                { id: 'ulnar_n', name: t('stem.synth_ui.ulnar_nerve'), x: 0.78, y: 0.34, v: 'a', fn: 'C8\u2013T1 via medial cord. Motor: intrinsic hand muscles (interossei, hypothenar), FCU, medial FDP. Sensory: medial 1.5 digits.', clinical: '"Funny bone" \u2014 vulnerable at medial epicondyle. Cubital tunnel syndrome. Claw hand deformity. Froment sign.' },

                { id: 'femoral_n', name: t('stem.synth_ui.femoral_nerve'), x: 0.40, y: 0.48, v: 'a', fn: 'L2\u2013L4 via lumbar plexus. Motor: quadriceps (knee extension), iliacus, sartorius. Sensory: anterior thigh, medial leg (saphenous branch).', clinical: 'Femoral neuropathy: difficulty climbing stairs, absent knee jerk. L4 radiculopathy mimics. Femoral nerve block for hip surgery.' },

                { id: 'sympathetic', name: t('stem.synth_ui.sympathetic_chain'), x: 0.54, y: 0.30, v: 'p', fn: 'Paired paravertebral ganglia from C1 to coccyx. "Fight or flight": increases HR, dilates pupils, bronchodilation, vasoconstriction, inhibits GI.', clinical: 'Horner syndrome (sympathetic disruption): miosis, ptosis, anhidrosis. Sympathectomy for hyperhidrosis.' },

                { id: 'cranial_n', name: t('stem.synth_ui.cranial_nerves_iu2013xii'), x: 0.50, y: 0.08, v: 'a', fn: '12 pairs: olfactory, optic, oculomotor, trochlear, trigeminal, abducens, facial, vestibulocochlear, glossopharyngeal, vagus, spinal accessory, hypoglossal.', clinical: 'CN III palsy: "down and out" eye, ptosis, dilated pupil. CN VII (Bell palsy): facial droop. CN XII: tongue deviates toward lesion.' }

              ]

            },

            lymphatic: {

              name: t('stem.synth_ui.lymphatic'), icon: '\uD83D\uDFE2', color: '#dcfce7', accent: '#16a34a',

              desc: 'Returns interstitial fluid, absorbs dietary fat, immune surveillance \u2014 600\u2013700 lymph nodes, thymus, spleen.',

              structures: [

                { id: 'thymus', name: t('stem.synth_ui.thymus'), x: 0.50, y: 0.19, v: 'a', fn: 'Primary lymphoid organ in anterior mediastinum. T-cell maturation and positive/negative selection. Largest in childhood, involutes after puberty (replaced by fat).', clinical: 'Thymoma: associated with myasthenia gravis (anti-AChR antibodies). DiGeorge syndrome: thymic aplasia \u2192 T-cell deficiency.' },

                { id: 'spleen', name: t('stem.synth_ui.spleen'), x: 0.58, y: 0.30, v: 'a', fn: 'Largest lymphoid organ. Filters blood: removes old RBCs (red pulp), mounts immune responses to blood-borne antigens (white pulp). Stores 1/3 of platelets.', clinical: 'Splenomegaly in mono, malaria, leukemia. Splenic rupture from trauma \u2192 emergency splenectomy. Post-splenectomy: encapsulated bacteria risk.' },

                { id: 'tonsils', name: t('stem.synth_ui.tonsils_waldeyer_ring'), x: 0.50, y: 0.11, v: 'a', fn: 'Pharyngeal (adenoids), palatine, tubal, and lingual tonsils form a lymphoid ring at the oropharyngeal entrance. First line of defense against inhaled/ingested pathogens.', clinical: 'Tonsillitis, peritonsillar abscess ("quinsy"). Adenoid hypertrophy \u2192 mouth breathing, sleep apnea in children.' },

                { id: 'cervical_ln', name: t('stem.synth_ui.cervical_lymph_nodes'), x: 0.56, y: 0.13, v: 'a', fn: 'Drain head and neck including scalp, face, oral cavity, pharynx. Deep cervical chain runs along IJV. Virchow node (left supraclavicular) drains thoracic duct.', clinical: 'Enlarged: infection, lymphoma, metastatic cancer. Virchow node enlargement \u2192 suspect GI malignancy (Troisier sign).' },

                { id: 'axillary_ln', name: t('stem.synth_ui.axillary_lymph_nodes'), x: 0.32, y: 0.22, v: 'a', fn: '5 groups draining upper limb, breast, chest wall. Sentinel lymph node biopsy in breast cancer staging.', clinical: 'Breast cancer staging depends on axillary LN involvement. Axillary dissection may cause lymphedema of arm.' },

                { id: 'inguinal_ln', name: t('stem.synth_ui.inguinal_lymph_nodes'), x: 0.44, y: 0.44, v: 'a', fn: 'Superficial group drains lower limb, perineum, lower abdominal wall, external genitalia. Deep group drains along femoral vein.', clinical: 'Lymphadenopathy in STIs, lower limb infections, lymphoma. Buboes in lymphogranuloma venereum, plague.' },

                { id: 'thoracic_duct', name: t('stem.synth_ui.thoracic_duct'), x: 0.48, y: 0.26, v: 'p', fn: 'Main lymphatic channel (40 cm). Drains \u00BE of body (everything except right upper quadrant). Empties into left subclavian/internal jugular junction (left venous angle).', clinical: 'Chylothorax from thoracic duct injury (trauma, surgery). Milky pleural effusion with high triglycerides.' },

                { id: 'bone_marrow', name: t('stem.synth_ui.bone_marrow'), x: 0.42, y: 0.57, v: 'a', fn: 'Primary lymphoid organ. Red marrow produces all blood cells (hematopoiesis) including lymphocyte precursors. Adults: mainly in axial skeleton, proximal femur/humerus.', clinical: 'Leukemia (malignant WBC proliferation). Aplastic anemia. Bone marrow biopsy from posterior iliac crest. Bone marrow transplant.' }

              ]

            },

            organs: {

              name: t('stem.synth_ui.organ_systems'), icon: '\uD83C\uDFE5', color: '#e0f2fe', accent: '#0284c7',

              desc: 'Major visceral organs \u2014 respiration, digestion, filtration, endocrine regulation.',

              structures: [

                { id: 'lungs', name: t('stem.synth_ui.lungs'), x: 0.42, y: 0.24, v: 'a', fn: 'Right lung: 3 lobes (superior, middle, inferior). Left lung: 2 lobes + lingula (cardiac notch). ~300 million alveoli provide ~70 m\u00B2 surface area for gas exchange.', clinical: 'Pneumonia, COPD, asthma, lung cancer (#1 cancer killer). Pneumothorax. Right bronchus more vertical \u2192 foreign body aspiration.' },

                { id: 'liver', name: t('stem.synth_ui.liver'), x: 0.56, y: 0.30, v: 'a', fn: 'Largest internal organ (1.5 kg). 2 anatomical lobes (right larger). Functions: bile production, detoxification, protein synthesis (albumin, clotting factors), glycogen storage, drug metabolism.', clinical: 'Hepatitis (viral A/B/C), cirrhosis, hepatocellular carcinoma. Liver failure: jaundice, coagulopathy, encephalopathy. Transplantation.' },

                { id: t('stem.dissection.stomach_label'), name: t('stem.synth_ui.stomach'), x: 0.55, y: 0.33, v: 'a', fn: 'J-shaped muscular sac. Regions: cardia, fundus, body, antrum, pylorus. Produces HCl (pH 1\u20132), pepsin, intrinsic factor (B12 absorption). Capacity ~1L.', clinical: 'Peptic ulcer disease (H. pylori, NSAIDs). Gastric cancer. GERD. Gastrectomy may cause dumping syndrome, B12 deficiency.' },

                { id: 'kidneys', name: t('stem.synth_ui.kidneys'), x: 0.58, y: 0.36, v: 'p', fn: 'Bean-shaped, retroperitoneal at T12\u2013L3. Each has ~1 million nephrons. Filter 180L/day, produce 1\u20132L urine. Regulate fluid balance, electrolytes, acid-base, blood pressure (RAAS).', clinical: 'CKD, nephrotic/nephritic syndrome, kidney stones, renal cell carcinoma. Right kidney lower due to liver. Dialysis when GFR <15.' },

                { id: 'sm_intestine', name: t('stem.synth_ui.small_intestine'), x: 0.50, y: 0.38, v: 'a', fn: '6m long: duodenum (25cm, C-shaped), jejunum (2.5m), ileum (3.5m). Primary site of nutrient absorption. Villi and microvilli increase surface area to ~200 m\u00B2.', clinical: 'Celiac disease (gluten sensitivity), Crohn disease (often terminal ileum), SBO (adhesions #1 cause), duodenal ulcers.' },

                { id: 'lg_intestine', name: t('stem.synth_ui.large_intestine'), x: 0.50, y: 0.40, v: 'a', fn: '1.5m: cecum, ascending, transverse, descending, sigmoid colon, rectum. Absorbs water and electrolytes. Houses gut microbiome (~100 trillion bacteria). Forms and stores feces.', clinical: 'Colorectal cancer (3rd most common cancer). Diverticulosis/diverticulitis. Ulcerative colitis. Appendicitis (McBurney point).' },

                { id: 'pancreas', name: t('stem.synth_ui.pancreas'), x: 0.52, y: 0.34, v: 'a', fn: 'Retroperitoneal organ. Exocrine (98%): digestive enzymes (lipase, amylase, trypsinogen) and bicarbonate. Endocrine (2%): islets of Langerhans \u2014 insulin (\u03B2), glucagon (\u03B1).', clinical: 'Acute pancreatitis (gallstones, alcohol). Pancreatic cancer (poor prognosis, 5-yr survival <10%). Type 1 diabetes (autoimmune \u03B2-cell destruction).' },

                { id: 'gallbladder', name: t('stem.synth_ui.gallbladder'), x: 0.55, y: 0.31, v: 'a', fn: 'Pear-shaped sac on inferior liver surface. Stores and concentrates bile (5\u201310\u00D7). Contracts in response to CCK after fatty meals to release bile into duodenum.', clinical: 'Cholelithiasis (gallstones, 10\u201315% of adults). Cholecystitis. Murphy sign. Cholecystectomy is one of most common surgeries.' },

                { id: 'bladder', name: t('stem.synth_ui.urinary_bladder'), x: 0.50, y: 0.44, v: 'a', fn: 'Distensible muscular sac. Stores 400\u2013600mL urine. Detrusor muscle contracts for micturition. Internal sphincter (involuntary), external sphincter (voluntary, pudendal nerve).', clinical: 'UTIs (more common in females due to short urethra). Bladder cancer (painless hematuria). Neurogenic bladder in spinal cord injury.' },

                { id: 'diaphragm', name: t('stem.synth_ui.diaphragm'), x: 0.50, y: 0.27, v: 'a', fn: 'Primary muscle of respiration. Dome-shaped, separates thorax from abdomen. Contracts and flattens during inspiration \u2192 negative intrathoracic pressure. Three openings: T8 (IVC), T10 (esophagus), T12 (aorta).', clinical: 'Hiatal hernia (stomach through esophageal hiatus). Diaphragmatic paralysis from phrenic nerve injury (C3\u2013C5). "C3, 4, 5 keeps the diaphragm alive."' },

                { id: 'thyroid', name: t('stem.synth_ui.thyroid_gland'), x: 0.50, y: 0.135, v: 'a', fn: 'Butterfly-shaped, anterior neck at C5\u2013T1. Produces T3/T4 (metabolism, growth, development) and calcitonin (lowers blood calcium). Requires iodine.', clinical: 'Hypothyroidism (Hashimoto): fatigue, weight gain, cold intolerance. Hyperthyroidism (Graves): weight loss, tremor, exophthalmos. Thyroid nodules/cancer.' },

                { id: 'adrenals', name: t('stem.synth_ui.adrenal_glands'), x: 0.56, y: 0.34, v: 'p', fn: 'Suprarenal glands. Cortex (3 zones): zona glomerulosa (aldosterone), zona fasciculata (cortisol), zona reticularis (androgens). Medulla: epinephrine/norepinephrine.', clinical: 'Addison disease (cortical insufficiency): hypotension, hyperpigmentation. Cushing syndrome (cortisol excess). Pheochromocytoma (medullary tumor \u2192 episodic HTN).' }

              ]

            },

            integumentary: {

              name: 'Integumentary', icon: '\uD83E\uDDF4', color: '#fef9c3', accent: '#a16207',

              desc: 'Skin (largest organ, ~2m\u00B2), hair, nails, glands \u2014 barrier, thermoregulation, sensation, vitamin D synthesis.',

              structures: [

                { id: 'epidermis', name: 'Epidermis', x: 0.50, y: 0.15, v: 'a', fn: 'Outermost skin layer. 5 strata (thick skin): basale, spinosum, granulosum, lucidum, corneum. Keratinocytes (90%), melanocytes (8%), Langerhans cells (immune), Merkel cells (touch). Avascular \u2014 nutrients diffuse from dermis. Turnover every 28\u201330 days.', clinical: 'Psoriasis: hyperproliferation (turnover 3\u20134 days). Melanoma from melanocyte mutation. Eczema (atopic dermatitis). Burns classified by depth of epidermal/dermal involvement.' },

                { id: 'dermis', name: 'Dermis', x: 0.50, y: 0.20, v: 'a', fn: 'Connective tissue layer beneath epidermis. Papillary dermis (loose CT, dermal papillae for fingerprints) and reticular dermis (dense irregular CT, collagen/elastin for strength/elasticity). Contains blood vessels, nerves, hair follicles, glands.', clinical: 'Stretch marks (striae): torn collagen fibers. Cellulitis: bacterial infection of dermis. Dermal injection site for TB test (Mantoux). Keloid scarring from excess collagen.' },

                { id: 'hypodermis', name: 'Hypodermis (Subcutaneous)', x: 0.50, y: 0.25, v: 'a', fn: 'Deep to dermis (not technically skin). Adipose tissue for insulation, energy storage, and mechanical cushioning. Contains large blood vessels and nerves. Subcutaneous injection site.', clinical: 'Lipomas (benign fat tumors). Subcutaneous emphysema (air under skin, crepitus). Insulin and heparin injected subcutaneously. Obesity increases this layer.' },

                { id: 'hair_follicle', name: 'Hair Follicles', x: 0.50, y: 0.06, v: 'a', fn: '~5 million follicles (100,000 on scalp). Hair shaft: medulla, cortex, cuticle. Arrector pili muscle causes goosebumps. Hair growth cycle: anagen (growth, 2\u20136 yrs), catagen (regression), telogen (rest/shedding). Stem cells in bulge region.', clinical: 'Alopecia areata (autoimmune hair loss). Folliculitis (infected follicle). Male pattern baldness (androgenetic alopecia, DHT-mediated). Hirsutism from excess androgens.' },

                { id: 'sweat_glands', name: 'Sweat Glands', x: 0.30, y: 0.30, v: 'a', fn: 'Eccrine glands (~3 million): watery sweat for thermoregulation, open directly to skin surface, densest on palms/soles. Apocrine glands: thicker secretion into hair follicles in axillae/groin, active after puberty, bacterial breakdown causes body odor.', clinical: 'Hyperhidrosis (excessive sweating). Anhidrosis in Horner syndrome. Heat stroke when sweating fails. Cystic fibrosis: elevated sweat chloride (diagnostic sweat test).' },

                { id: 'sebaceous', name: 'Sebaceous Glands', x: 0.45, y: 0.10, v: 'a', fn: 'Holocrine glands associated with hair follicles (except palms/soles). Produce sebum (lipid mixture) that waterproofs skin and hair, prevents drying, has bactericidal properties. Activity increases at puberty (androgens).', clinical: 'Acne vulgaris: sebaceous gland hyperactivity + P. acnes bacteria + follicular plugging. Sebaceous cysts. Isotretinoin (Accutane) shrinks sebaceous glands for severe acne.' },

                { id: 'nails', name: 'Nails', x: 0.16, y: 0.44, v: 'a', fn: 'Keratinized epidermal derivatives. Nail plate grows from nail matrix (under proximal fold) at ~3mm/month (fingernails) or ~1mm/month (toenails). Lunula: visible part of matrix. Nail bed highly vascular (pink color).', clinical: 'Clubbing: sign of chronic hypoxia (lung/heart disease). Koilonychia (spoon nails): iron deficiency. Onychomycosis (fungal infection). Splinter hemorrhages: endocarditis. Beau lines: illness/stress.' },

                { id: 'melanocytes', name: 'Melanocytes & Pigmentation', x: 0.50, y: 0.35, v: 'a', fn: 'Neural crest-derived cells in stratum basale. Produce melanin (eumelanin=brown/black, pheomelanin=red/yellow) in melanosomes, transferred to surrounding keratinocytes via dendrites. UV radiation increases melanin production (tanning). Same number in all races; differences are in melanin amount/type.', clinical: 'Vitiligo: autoimmune melanocyte destruction (depigmented patches). Albinism: defective melanin synthesis. Melanoma: deadliest skin cancer, arises from melanocytes, ABCDE criteria for detection.' }

              ]

            },

            respiratory: {

              name: 'Respiratory', icon: '\uD83E\uDEC1', color: '#e0f2fe', accent: '#0369a1',

              desc: 'Oxygen delivery and CO\u2082 removal \u2014 ~12\u201320 breaths/min, ~6L air/min, 300 million alveoli.',

              structures: [

                { id: 'nasal_cavity', name: 'Nasal Cavity & Sinuses', x: 0.50, y: 0.06, v: 'a', fn: 'Warms, humidifies, and filters inspired air. Nasal conchae (turbinates) increase surface area. Rich vascular plexus (Kiesselbach plexus) on septum. Paranasal sinuses (frontal, maxillary, ethmoid, sphenoid) lighten skull, add resonance to voice.', clinical: 'Epistaxis (nosebleed): 90% anterior from Kiesselbach plexus. Sinusitis. Deviated septum. Nasal polyps in chronic rhinitis/asthma/CF. Anosmia from COVID-19.' },

                { id: 'pharynx', name: 'Pharynx', x: 0.50, y: 0.10, v: 'a', fn: 'Muscular tube from skull base to C6. Three regions: nasopharynx (adenoids, Eustachian tube), oropharynx (palatine tonsils), laryngopharynx (diverges into esophagus and larynx). Shared airway and food passage.', clinical: 'Pharyngitis (sore throat): viral most common, Group A Strep requires antibiotics (prevent rheumatic fever). Obstructive sleep apnea from pharyngeal collapse. Pharyngeal cancer (HPV-related rising).' },

                { id: 'larynx', name: 'Larynx (Voice Box)', x: 0.50, y: 0.13, v: 'a', fn: 'Cartilaginous framework at C3\u2013C6. Thyroid cartilage (Adam\u2019s apple), cricoid (complete ring), arytenoids (move vocal cords). True vocal cords (folds) vibrate for phonation. Epiglottis closes during swallowing to protect airway.', clinical: 'Laryngitis (hoarseness). Recurrent laryngeal nerve injury (thyroid surgery) \u2192 vocal cord paralysis. Croup in children (barking cough). Laryngeal cancer from smoking. Emergency cricothyrotomy through cricothyroid membrane.' },

                { id: 'trachea', name: 'Trachea', x: 0.50, y: 0.17, v: 'a', fn: '10\u201312 cm tube from C6 to T4\u2013T5 (carina). 16\u201320 C-shaped cartilage rings (open posteriorly to allow esophageal expansion). Pseudostratified ciliated columnar epithelium with goblet cells \u2014 mucociliary escalator traps and clears particles.', clinical: 'Tracheostomy for prolonged ventilation. Tracheomalacia (softened cartilage, floppy airway). Foreign body aspiration: right main bronchus more vertical. Tracheal intubation for general anesthesia.' },

                { id: 'bronchi', name: 'Bronchial Tree', x: 0.46, y: 0.22, v: 'a', fn: 'Trachea \u2192 R/L main bronchi \u2192 lobar bronchi (3R, 2L) \u2192 segmental \u2192 terminal bronchioles \u2192 respiratory bronchioles. Progressive loss of cartilage, increase in smooth muscle. ~23 generations of branching. Total cross-section increases enormously.', clinical: 'Asthma: bronchospasm + inflammation of bronchi/bronchioles. Bronchitis: inflammation of bronchial mucosa. Bronchiectasis: permanent dilation from chronic infection. Bronchoscopy for diagnosis/biopsy.' },

                { id: 'alveoli', name: 'Alveoli', x: 0.54, y: 0.26, v: 'a', fn: '~300 million alveoli provide ~70m\u00B2 gas exchange surface. Type I pneumocytes (95% surface, gas exchange). Type II pneumocytes (surfactant production, reduces surface tension). Alveolar macrophages (dust cells) phagocytose particles. Blood-air barrier: 0.5\u03BCm thick.', clinical: 'Pneumonia: alveolar infection/inflammation. ARDS: diffuse alveolar damage, pulmonary edema. Emphysema: alveolar wall destruction (COPD). Neonatal RDS: surfactant deficiency in premature infants.' },

                { id: 'pleura', name: 'Pleura', x: 0.58, y: 0.24, v: 'a', fn: 'Visceral pleura (covers lungs) and parietal pleura (lines chest wall) create pleural cavity containing ~5mL serous fluid. Surface tension keeps lungs expanded. Negative intrapleural pressure (\u22124 cmH\u2082O) prevents lung collapse.', clinical: 'Pneumothorax: air in pleural space \u2192 lung collapse. Tension pneumothorax: life-threatening, mediastinal shift. Pleural effusion: fluid collection (transudate vs exudate). Mesothelioma: asbestos-related pleural cancer.' },

                { id: 'resp_muscles', name: 'Respiratory Muscles', x: 0.42, y: 0.28, v: 'a', fn: 'Inspiration: diaphragm (70% of quiet breathing, C3\u2013C5 phrenic nerve) + external intercostals. Forced inspiration adds: SCM, scalenes, pectoralis minor. Expiration: passive in quiet breathing (elastic recoil). Forced expiration: internal intercostals + abdominals.', clinical: 'Phrenic nerve palsy \u2192 hemidiaphragm paralysis. C3\u2013C5 spinal cord injury \u2192 respiratory failure. Myasthenia gravis: respiratory muscle weakness (myasthenic crisis). Flail chest impairs breathing mechanics.' }

              ]

            },

            endocrine: {

              name: 'Endocrine', icon: '\u2697\uFE0F', color: '#fae8ff', accent: '#a21caf',

              desc: 'Hormone-producing glands \u2014 regulate metabolism, growth, reproduction, stress, homeostasis via chemical messengers.',

              structures: [

                { id: 'pituitary', name: 'Pituitary Gland (Hypophysis)', x: 0.50, y: 0.07, v: 'a', fn: 'Pea-sized \u201cmaster gland\u201d in sella turcica. Anterior (adenohypophysis): GH, ACTH, TSH, FSH, LH, prolactin. Posterior (neurohypophysis): stores/releases oxytocin and ADH (made in hypothalamus). Regulated by hypothalamic releasing/inhibiting hormones.', clinical: 'Pituitary adenoma: visual field defect (bitemporal hemianopia from chiasm compression). Acromegaly (excess GH in adults). Hyperprolactinemia \u2192 galactorrhea, amenorrhea. Panhypopituitarism.' },

                { id: 'pineal', name: 'Pineal Gland', x: 0.50, y: 0.05, v: 'p', fn: 'Small endocrine gland in epithalamus. Produces melatonin (from serotonin, regulated by light/dark cycle via SCN). Melatonin regulates circadian rhythm and has antioxidant properties. Calcifies with age (visible on X-ray as a midline marker).', clinical: 'Pineal tumors may cause obstructive hydrocephalus (compresses cerebral aqueduct). Parinaud syndrome: upgaze palsy. Jet lag and shift-work disorder related to melatonin disruption. Exogenous melatonin used as sleep aid.' },

                { id: 'parathyroid', name: 'Parathyroid Glands', x: 0.52, y: 0.14, v: 'p', fn: '4 small glands on posterior thyroid surface. Produce PTH (parathyroid hormone): raises blood calcium by increasing bone resorption, renal Ca\u00B2\u207A reabsorption, and activating vitamin D. PTH and calcitonin are antagonists.', clinical: 'Hyperparathyroidism: \u201cbones, stones, groans, and psychiatric moans\u201d (osteoporosis, kidney stones, abdominal pain, depression). Hypoparathyroidism: hypocalcemia \u2192 tetany, Chvostek/Trousseau signs. Accidental removal during thyroidectomy.' },

                { id: 'islets', name: 'Islets of Langerhans', x: 0.52, y: 0.34, v: 'a', fn: 'Endocrine clusters within pancreas (~1\u20132 million islets). \u03B2-cells (70%): insulin (lowers glucose). \u03B1-cells (20%): glucagon (raises glucose). \u03B4-cells: somatostatin (inhibits both). PP-cells: pancreatic polypeptide. Islets are highly vascularized.', clinical: 'Type 1 diabetes: autoimmune \u03B2-cell destruction (insulin-dependent). Type 2 diabetes: insulin resistance + \u03B2-cell dysfunction. Insulinoma: insulin-secreting tumor \u2192 hypoglycemia. Islet transplantation research.' },

                { id: 'ovaries_endo', name: 'Ovaries (Endocrine)', x: 0.46, y: 0.44, v: 'a', fn: 'Produce estrogen (follicular cells) and progesterone (corpus luteum). Estrogen: secondary sex characteristics, bone density, endometrial proliferation. Progesterone: maintains pregnancy, endometrial secretion. Also produce inhibin and small amounts of testosterone.', clinical: 'PCOS: hyperandrogenism, anovulation, polycystic ovaries. Premature ovarian failure. Menopause: estrogen decline \u2192 hot flashes, osteoporosis, cardiovascular risk. HRT replaces declining hormones.' },

                { id: 'testes_endo', name: 'Testes (Endocrine)', x: 0.50, y: 0.48, v: 'a', fn: 'Leydig cells (interstitial) produce testosterone under LH stimulation. Testosterone: male secondary sex characteristics, spermatogenesis (with FSH), muscle mass, bone density, libido. Also converted to DHT (5\u03B1-reductase) and estradiol (aromatase).', clinical: 'Hypogonadism: low testosterone \u2192 infertility, decreased libido, osteoporosis. Testosterone replacement therapy. Anabolic steroid abuse: testicular atrophy, cardiovascular risk. Klinefelter syndrome (47,XXY).' },

                { id: 'hypothal_endo', name: 'Hypothalamic-Pituitary Axis', x: 0.50, y: 0.04, v: 'a', fn: 'Master regulatory cascade. Hypothalamus releases hormones into hypophyseal portal system \u2192 anterior pituitary. Key axes: HPA (stress/cortisol), HPT (thyroid/T3/T4), HPG (gonadal/sex hormones). Negative feedback loops maintain homeostasis.', clinical: 'HPA axis dysregulation in chronic stress, depression, PTSD. Central hypothyroidism (TSH deficiency). Kallmann syndrome: GnRH deficiency \u2192 hypogonadism + anosmia. Sheehan syndrome: pituitary necrosis postpartum.' },

                { id: 'adrenal_endo', name: 'Adrenal Cortex Zones', x: 0.58, y: 0.34, v: 'a', fn: 'Three zones (\u201cGFR = salt, sugar, sex\u201d): Glomerulosa \u2192 aldosterone (mineralocorticoid, Na\u207A/K\u207A balance, RAAS). Fasciculata \u2192 cortisol (glucocorticoid, stress, anti-inflammatory). Reticularis \u2192 DHEA/androgens (weak androgens).', clinical: 'Conn syndrome: aldosterone-secreting adenoma \u2192 hypertension, hypokalemia. Cushing syndrome: cortisol excess (moon face, buffalo hump, striae). Congenital adrenal hyperplasia (21-hydroxylase deficiency): ambiguous genitalia.' }

              ]

            },

            reproductive: {

              name: 'Reproductive', icon: '\uD83D\uDC76', color: '#fce7f3', accent: '#db2777',

              desc: 'Male and female reproductive organs \u2014 gamete production, fertilization, fetal development, hormonal regulation.',

              structures: [

                { id: 'testes_repro', name: 'Testes', x: 0.50, y: 0.52, v: 'a', fn: 'Paired oval organs in scrotum (2\u20133\u00B0C below body temperature for spermatogenesis). Each contains ~250 lobules with seminiferous tubules (sperm production, 64\u201372 day cycle). Sertoli cells provide nutritive/structural support. ~200 million sperm produced daily.', clinical: 'Cryptorchidism (undescended testis): infertility and cancer risk if uncorrected. Testicular torsion: surgical emergency (6hr window). Testicular cancer: most common solid tumor in men 15\u201335.' },

                { id: 'epididymis', name: 'Epididymis', x: 0.52, y: 0.50, v: 'p', fn: 'Coiled tube (~6m uncoiled) on posterior testis. Three regions: head (receives sperm from efferent ductules), body, tail (stores mature sperm). Sperm undergo maturation during 12-day transit \u2014 gain motility and fertilizing capacity.', clinical: 'Epididymitis: infection (STI in young men, UTI organisms in older men) \u2192 scrotal pain/swelling. Positive Prehn sign (pain relief with elevation) distinguishes from torsion. Epididymal cyst (spermatocele).' },

                { id: 'prostate', name: 'Prostate Gland', x: 0.50, y: 0.46, v: 'a', fn: 'Walnut-sized gland surrounding prostatic urethra below bladder. Produces ~30% of seminal fluid (citric acid, PSA, zinc, proteolytic enzymes). Five lobes; peripheral zone largest and most common site of cancer. Grows throughout life under DHT influence.', clinical: 'BPH (benign prostatic hyperplasia): urinary obstruction in elderly men. Prostate cancer: most common male cancer, detected by PSA and DRE. Prostatitis. TURP (transurethral resection) for BPH.' },

                { id: 'uterus', name: 'Uterus', x: 0.50, y: 0.42, v: 'a', fn: 'Pear-shaped muscular organ. Regions: fundus, body, cervix. Three layers: endometrium (cyclically shed in menstruation), myometrium (smooth muscle, contractions during labor), perimetrium (serosa). Normally anteverted and anteflexed. Capacity expands 500\u00D7 in pregnancy.', clinical: 'Uterine fibroids (leiomyomas): most common pelvic tumor in women. Endometriosis: endometrial tissue outside uterus. Endometrial cancer (most common GYN malignancy). C-section incision through all layers.' },

                { id: 'ovaries_repro', name: 'Ovaries', x: 0.42, y: 0.44, v: 'a', fn: 'Paired, almond-sized organs lateral to uterus. Contain ~1\u20132 million oocytes at birth (depleted to ~400,000 by puberty, ~400 ovulated in lifetime). Follicular development: primordial \u2192 primary \u2192 secondary \u2192 Graafian follicle \u2192 ovulation \u2192 corpus luteum.', clinical: 'Ovarian cysts (functional most common). Ovarian cancer: \u201csilent killer\u201d (often diagnosed late). PCOS. Ovarian torsion: surgical emergency. Ectopic pregnancy if fertilized egg implants in tube instead of uterus.' },

                { id: 'fallopian', name: 'Fallopian Tubes (Oviducts)', x: 0.38, y: 0.41, v: 'a', fn: '~10cm tubes connecting ovaries to uterus. Regions: infundibulum (fimbriae catch ovulated oocyte), ampulla (usual site of fertilization), isthmus (narrow, connects to uterus). Ciliated epithelium and peristalsis transport ovum/embryo toward uterus over 3\u20134 days.', clinical: 'Ectopic pregnancy (95% in fallopian tube): life-threatening rupture risk. PID (pelvic inflammatory disease, often from Chlamydia/Gonorrhea): scarring \u2192 infertility. Tubal ligation for permanent contraception. Salpingectomy.' },

                { id: 'mammary', name: 'Mammary Glands', x: 0.42, y: 0.24, v: 'a', fn: 'Modified apocrine sweat glands. 15\u201320 lobes of glandular tissue, each with lactiferous duct opening at nipple. Development: estrogen (ductal growth), progesterone (lobular growth), prolactin (milk production), oxytocin (milk ejection/let-down reflex).', clinical: 'Breast cancer: most common cancer in women. BRCA1/2 gene mutations increase risk. Fibrocystic changes (benign, cyclical tenderness). Mastitis: infection during lactation. Mammography screening from age 40\u201350.' },

                { id: 'placenta', name: 'Placenta', x: 0.50, y: 0.38, v: 'a', fn: 'Temporary organ during pregnancy (develops from trophoblast). Maternal-fetal exchange: O\u2082, nutrients (maternal \u2192 fetal), CO\u2082, waste (fetal \u2192 maternal). Produces hCG, progesterone, estrogen, hPL. Barrier to most pathogens (not all: TORCH infections cross). Weighs ~500g at term.', clinical: 'Placenta previa: placenta covers cervical os \u2192 painless bleeding. Placental abruption: premature separation \u2192 painful bleeding, emergency. Pre-eclampsia: abnormal placentation \u2192 HTN, proteinuria. hCG is the basis of pregnancy tests.' }

              ]

            }

          };



          var sysKey = d.system || 'skeletal';

          var sys = SYSTEMS[sysKey];

          var view = d.view || 'anterior';

          var searchTerm = (d.search || '').toLowerCase();

          var complexity = d.complexity || 3;



          // â”€â”€ Layer Transparency System â”€â”€

          var LAYER_DEFS = [

            { id: 'skin', icon: '\uD83E\uDDB4', name: 'Skin', color: '#f5e6d3', accent: '#c4aa94' },

            { id: 'skeletal', icon: '\uD83E\uDDB4', name: 'Skeletal', color: '#e2e8f0', accent: '#94a3b8', systems: ['skeletal'] },

            { id: 'muscular', icon: '\uD83D\uDCAA', name: 'Muscular', color: '#fecaca', accent: '#dc2626', systems: ['muscular'] },

            { id: 'organs', icon: '\uD83E\uDEC1', name: 'Organs', color: '#d1fae5', accent: '#16a34a', systems: ['digestive', 'respiratory', 'endocrine', 'reproductive'] },

            { id: 'circulatory', icon: '\u2764\uFE0F', name: 'Circulatory', color: '#fee2e2', accent: '#ef4444', systems: ['circulatory'] },

            { id: 'nervous', icon: '\u26A1', name: 'Nervous', color: '#fef9c3', accent: '#eab308', systems: ['nervous'] },

            { id: 'lymphatic', icon: '\uD83D\uDFE2', name: 'Lymphatic', color: '#d1fae5', accent: '#22c55e', systems: ['lymphatic', 'integumentary'] }

          ];

          var layers = d.visibleLayers || { skin: true };

          var toggleLayer = function (lid) {

            var newLayers = Object.assign({}, layers);

            newLayers[lid] = !newLayers[lid];

            upd('visibleLayers', newLayers);

          };

          // Auto-activate layer matching current system

          var autoLayerId = null;

          LAYER_DEFS.forEach(function (ld) {

            if (ld.systems && ld.systems.indexOf(sysKey) !== -1) autoLayerId = ld.id;

          });

          var anyDeepLayer = LAYER_DEFS.some(function (ld) { return ld.id !== 'skin' && (layers[ld.id] || ld.id === autoLayerId); });

          var skinOpacity = anyDeepLayer ? 0.20 : 1.0;



          // Complexity level lookup â€” structures shown at each tier

          var ELEMENTARY_IDS = ['skull', 'ribs', 'femur', 'humerus', 'vertebral', 'pelvis', 'biceps', 'quads', 'heart', 'brain', 'lungs', 'stomach', 'kidneys', 'spinal_cord', 'deltoid', 'hamstrings', 'gastrocnemius', 'aorta', 'carotid', 'sciatic', 'liver', 'diaphragm', 'spleen', 'thymus', 'epidermis', 'dermis', 'trachea', 'alveoli', 'pituitary', 'uterus', 'testes_repro', 'mammary', 'cerebral_cortex', 'cerebellum', 'brainstem'];

          var MIDDLE_IDS = ELEMENTARY_IDS.concat(['mandible', 'clavicle', 'sternum', 'scapula', 'radius', 'ulna', 'tibia', 'fibula', 'patella', 'tarsals', 'carpals', 'sacrum', 'pectoralis', 'triceps', 'rectus_ab', 'obliques', 'trapezius', 'lats', 'glutes', 'tibialis', 'soleus', 'sartorius', 'sup_vena', 'inf_vena', 'pulm_art', 'jugular', 'coronary', 'femoral_a', 'brachial', 'portal', 'vagus', 'brachial_plexus', 'median', 'ulnar_n', 'femoral_n', 'cranial_n', 'sympathetic', 'sm_intestine', 'lg_intestine', 'pancreas', 'gallbladder', 'bladder', 'thyroid', 'adrenals', 'cervical_ln', 'axillary_ln', 'inguinal_ln', 'thoracic_duct', 'bone_marrow', 'hyoid', 'atlas_axis', 'metatarsals', 'metacarpals', 'scaphoid_bone', 'rotator_cuff', 'iliopsoas', 'intercostals', 'pelvic_floor', 'diaphragm_m', 'circle_willis', 'saphenous', 'lymph_circ', 'hypodermis', 'hair_follicle', 'sweat_glands', 'sebaceous', 'nails', 'melanocytes', 'nasal_cavity', 'pharynx', 'larynx', 'bronchi', 'pleura', 'resp_muscles', 'pineal', 'parathyroid', 'islets', 'ovaries_endo', 'testes_endo', 'hypothal_endo', 'adrenal_endo', 'epididymis', 'prostate', 'ovaries_repro', 'fallopian', 'placenta', 'hippocampus', 'amygdala', 'thalamus', 'hypothalamus', 'corpus_callosum', 'basal_ganglia']);

          function passesComplexity(st) {

            if (complexity >= 3) return true;

            if (complexity === 1) return ELEMENTARY_IDS.indexOf(st.id) !== -1;

            return MIDDLE_IDS.indexOf(st.id) !== -1;

          }



          var allStructures = sys.structures;

          var viewFiltered = allStructures.filter(function (s) { return (s.v === 'b' || s.v === (view === 'anterior' ? 'a' : 'p')) && passesComplexity(s); });

          var filtered = searchTerm ? viewFiltered.filter(function (s) { return s.name.toLowerCase().indexOf(searchTerm) >= 0 || s.fn.toLowerCase().indexOf(searchTerm) >= 0; }) : viewFiltered;

          var sel = d.selectedStructure ? allStructures.find(function (s) { return s.id === d.selectedStructure; }) : null;



          // Quiz logic â€” options memoized in state to prevent re-shuffle on render

          var quizPool = allStructures.filter(function (s) { return s.fn && passesComplexity(s); });

          var quizQ = d.quizMode && quizPool.length > 0 ? quizPool[d.quizIdx % quizPool.length] : null;

          var quizOptions = d._quizOpts || [];

          if (quizQ && d._quizOptsFor !== (sysKey + '|' + d.quizIdx)) {

            var wrong = quizPool.filter(function (s) { return s.id !== quizQ.id; });

            var shuffled = wrong.sort(function () { return Math.random() - 0.5; }).slice(0, 3);

            quizOptions = shuffled.concat([quizQ]).sort(function () { return Math.random() - 0.5; });

            upd('_quizOpts', quizOptions);

            upd('_quizOptsFor', sysKey + '|' + d.quizIdx);

          }



          // Body drawing on canvas â€” animated

          var canvasRef = function (canvas) {

            if (!canvas) return;

            if (canvas._anatomyAnim) { cancelAnimationFrame(canvas._anatomyAnim); canvas._anatomyAnim = null; }

            var ctx = canvas.getContext('2d');

            var W = canvas.width, H = canvas.height;

            var anatTick = 0;

            function drawAnatomyFrame() {

              anatTick++;

              ctx.clearRect(0, 0, W, H);



              // â”€â”€ Enhanced Anatomical Figure â”€â”€

              // Apply skin layer opacity

              ctx.save();

              ctx.globalAlpha = skinOpacity;

              ctx.lineJoin = 'round';

              ctx.lineCap = 'round';



              // Skin gradient for realistic shading

              var skinGrad = ctx.createLinearGradient(W * 0.3, 0, W * 0.7, H);

              skinGrad.addColorStop(0, '#f5e6d3');

              skinGrad.addColorStop(0.3, '#f0ddd0');

              skinGrad.addColorStop(0.6, '#ebd5c6');

              skinGrad.addColorStop(1, '#e8cfc0');



              // Ambient shadow gradient

              var shadowGrad = ctx.createRadialGradient(W * 0.5, H * 0.4, W * 0.05, W * 0.5, H * 0.4, W * 0.4);

              shadowGrad.addColorStop(0, 'rgba(180,160,140,0.08)');

              shadowGrad.addColorStop(1, 'rgba(180,160,140,0)');



              // Helper: draw body part with gradient/shadow

              function drawBodyPart(pathFn, extraShadow) {

                // Shadow layer

                ctx.save();

                ctx.shadowColor = 'rgba(120,100,80,0.15)';

                ctx.shadowBlur = 6;

                ctx.shadowOffsetX = 2;

                ctx.shadowOffsetY = 3;

                ctx.beginPath(); pathFn(ctx);

                ctx.fillStyle = skinGrad;

                ctx.fill();

                ctx.restore();

                // Main fill

                ctx.beginPath(); pathFn(ctx);

                ctx.fillStyle = skinGrad;

                ctx.fill();

                // Outline

                ctx.beginPath(); pathFn(ctx);

                ctx.strokeStyle = '#c4aa94';

                ctx.lineWidth = 1.2;

                ctx.stroke();

              }



              // Head (oval with jaw definition)

              drawBodyPart(function (c) {

                c.ellipse(W * 0.5, H * 0.06, W * 0.058, H * 0.046, 0, 0, Math.PI * 2);

              });

              // Jaw hint

              ctx.beginPath();

              ctx.moveTo(W * 0.46, H * 0.085);

              ctx.quadraticCurveTo(W * 0.50, H * 0.11, W * 0.54, H * 0.085);

              ctx.strokeStyle = '#d4b8a0'; ctx.lineWidth = 0.7; ctx.stroke();

              // Ear hints

              ctx.beginPath(); ctx.ellipse(W * 0.44, H * 0.06, W * 0.008, H * 0.018, 0, 0, Math.PI * 2);

              ctx.strokeStyle = '#d4b8a0'; ctx.lineWidth = 0.6; ctx.stroke();

              ctx.beginPath(); ctx.ellipse(W * 0.56, H * 0.06, W * 0.008, H * 0.018, 0, 0, Math.PI * 2);

              ctx.strokeStyle = '#d4b8a0'; ctx.lineWidth = 0.6; ctx.stroke();



              // Neck (tapered)

              drawBodyPart(function (c) {

                c.moveTo(W * 0.465, H * 0.10);

                c.quadraticCurveTo(W * 0.46, H * 0.115, W * 0.44, H * 0.135);

                c.lineTo(W * 0.56, H * 0.135);

                c.quadraticCurveTo(W * 0.54, H * 0.115, W * 0.535, H * 0.10);

                c.closePath();

              });

              // Sternocleidomastoid hint

              ctx.beginPath();

              ctx.moveTo(W * 0.47, H * 0.105); ctx.quadraticCurveTo(W * 0.45, H * 0.12, W * 0.45, H * 0.135);

              ctx.strokeStyle = '#d9c0a8'; ctx.lineWidth = 0.5; ctx.stroke();

              ctx.beginPath();

              ctx.moveTo(W * 0.53, H * 0.105); ctx.quadraticCurveTo(W * 0.55, H * 0.12, W * 0.55, H * 0.135);

              ctx.stroke();



              // Torso (anatomical proportions with waist taper)

              drawBodyPart(function (c) {

                c.moveTo(W * 0.34, H * 0.135);

                c.quadraticCurveTo(W * 0.38, H * 0.13, W * 0.50, H * 0.132);

                c.quadraticCurveTo(W * 0.62, H * 0.13, W * 0.66, H * 0.135);

                c.quadraticCurveTo(W * 0.69, H * 0.16, W * 0.68, H * 0.20);

                c.quadraticCurveTo(W * 0.67, H * 0.28, W * 0.64, H * 0.34);

                c.quadraticCurveTo(W * 0.61, H * 0.38, W * 0.58, H * 0.40);

                c.quadraticCurveTo(W * 0.55, H * 0.425, W * 0.50, H * 0.43);

                c.quadraticCurveTo(W * 0.45, H * 0.425, W * 0.42, H * 0.40);

                c.quadraticCurveTo(W * 0.39, H * 0.38, W * 0.36, H * 0.34);

                c.quadraticCurveTo(W * 0.33, H * 0.28, W * 0.32, H * 0.20);

                c.quadraticCurveTo(W * 0.31, H * 0.16, W * 0.34, H * 0.135);

              });

              // Torso musculature contours

              ctx.globalAlpha = 0.3;

              // Pec line

              ctx.beginPath();

              ctx.moveTo(W * 0.36, H * 0.155); ctx.quadraticCurveTo(W * 0.42, H * 0.19, W * 0.50, H * 0.19);

              ctx.quadraticCurveTo(W * 0.58, H * 0.19, W * 0.64, H * 0.155);

              ctx.strokeStyle = '#c4aa94'; ctx.lineWidth = 0.6; ctx.stroke();

              // Midline (linea alba)

              ctx.beginPath();

              ctx.moveTo(W * 0.50, H * 0.15); ctx.lineTo(W * 0.50, H * 0.42);

              ctx.strokeStyle = '#c4aa94'; ctx.lineWidth = 0.5; ctx.stroke();

              // Rib hints (subtle curves)

              for (var ri = 0; ri < 4; ri++) {

                var ry = H * (0.19 + ri * 0.032);

                ctx.beginPath();

                ctx.moveTo(W * 0.42, ry); ctx.quadraticCurveTo(W * 0.46, ry + H * 0.008, W * 0.50, ry + H * 0.003);

                ctx.strokeStyle = '#d0b89e'; ctx.lineWidth = 0.4; ctx.stroke();

                ctx.beginPath();

                ctx.moveTo(W * 0.58, ry); ctx.quadraticCurveTo(W * 0.54, ry + H * 0.008, W * 0.50, ry + H * 0.003);

                ctx.stroke();

              }

              // Rectus abdominis segments

              for (var ai = 0; ai < 3; ai++) {

                var ay = H * (0.30 + ai * 0.035);

                ctx.beginPath();

                ctx.moveTo(W * 0.44, ay); ctx.lineTo(W * 0.56, ay);

                ctx.strokeStyle = '#d0b89e'; ctx.lineWidth = 0.4; ctx.stroke();

              }

              // Navel

              ctx.beginPath(); ctx.arc(W * 0.50, H * 0.36, 2.5, 0, Math.PI * 2);

              ctx.strokeStyle = '#c4aa94'; ctx.lineWidth = 0.5; ctx.stroke();

              ctx.globalAlpha = 1.0;



              // Shoulders (defined deltoid caps)

              drawBodyPart(function (c) {

                c.moveTo(W * 0.34, H * 0.135);

                c.quadraticCurveTo(W * 0.28, H * 0.125, W * 0.25, H * 0.145);

                c.quadraticCurveTo(W * 0.24, H * 0.165, W * 0.27, H * 0.185);

                c.quadraticCurveTo(W * 0.30, H * 0.17, W * 0.34, H * 0.155);

                c.closePath();

              });

              drawBodyPart(function (c) {

                c.moveTo(W * 0.66, H * 0.135);

                c.quadraticCurveTo(W * 0.72, H * 0.125, W * 0.75, H * 0.145);

                c.quadraticCurveTo(W * 0.76, H * 0.165, W * 0.73, H * 0.185);

                c.quadraticCurveTo(W * 0.70, H * 0.17, W * 0.66, H * 0.155);

                c.closePath();

              });



              // Left arm (bicep/forearm definition)

              drawBodyPart(function (c) {

                c.moveTo(W * 0.27, H * 0.185);

                c.quadraticCurveTo(W * 0.22, H * 0.22, W * 0.20, H * 0.28);

                c.quadraticCurveTo(W * 0.185, H * 0.33, W * 0.175, H * 0.36);

                c.quadraticCurveTo(W * 0.17, H * 0.39, W * 0.155, H * 0.44);

                c.lineTo(W * 0.13, H * 0.46);

                c.lineTo(W * 0.17, H * 0.47);

                c.quadraticCurveTo(W * 0.19, H * 0.42, W * 0.195, H * 0.38);

                c.quadraticCurveTo(W * 0.21, H * 0.33, W * 0.22, H * 0.29);

                c.quadraticCurveTo(W * 0.25, H * 0.22, W * 0.30, H * 0.185);

                c.closePath();

              });

              // Left arm muscle contour

              ctx.globalAlpha = 0.25;

              ctx.beginPath();

              ctx.moveTo(W * 0.24, H * 0.22); ctx.quadraticCurveTo(W * 0.215, H * 0.27, W * 0.20, H * 0.30);

              ctx.strokeStyle = '#c4aa94'; ctx.lineWidth = 0.5; ctx.stroke();

              ctx.globalAlpha = 1.0;



              // Right arm

              drawBodyPart(function (c) {

                c.moveTo(W * 0.73, H * 0.185);

                c.quadraticCurveTo(W * 0.78, H * 0.22, W * 0.80, H * 0.28);

                c.quadraticCurveTo(W * 0.815, H * 0.33, W * 0.825, H * 0.36);

                c.quadraticCurveTo(W * 0.83, H * 0.39, W * 0.845, H * 0.44);

                c.lineTo(W * 0.87, H * 0.46);

                c.lineTo(W * 0.83, H * 0.47);

                c.quadraticCurveTo(W * 0.81, H * 0.42, W * 0.805, H * 0.38);

                c.quadraticCurveTo(W * 0.79, H * 0.33, W * 0.78, H * 0.29);

                c.quadraticCurveTo(W * 0.75, H * 0.22, W * 0.70, H * 0.185);

                c.closePath();

              });

              // Right arm muscle contour

              ctx.globalAlpha = 0.25;

              ctx.beginPath();

              ctx.moveTo(W * 0.76, H * 0.22); ctx.quadraticCurveTo(W * 0.785, H * 0.27, W * 0.80, H * 0.30);

              ctx.strokeStyle = '#c4aa94'; ctx.lineWidth = 0.5; ctx.stroke();

              ctx.globalAlpha = 1.0;



              // Hands (simple paddle shape)

              drawBodyPart(function (c) { c.ellipse(W * 0.15, H * 0.468, W * 0.022, H * 0.014, -0.2, 0, Math.PI * 2); });

              drawBodyPart(function (c) { c.ellipse(W * 0.85, H * 0.468, W * 0.022, H * 0.014, 0.2, 0, Math.PI * 2); });



              // Left leg (thigh + calf muscle definition)

              drawBodyPart(function (c) {

                c.moveTo(W * 0.42, H * 0.425);

                c.quadraticCurveTo(W * 0.39, H * 0.46, W * 0.375, H * 0.52);

                c.quadraticCurveTo(W * 0.365, H * 0.58, W * 0.355, H * 0.63);

                c.quadraticCurveTo(W * 0.35, H * 0.66, W * 0.36, H * 0.70);

                c.quadraticCurveTo(W * 0.355, H * 0.74, W * 0.345, H * 0.80);

                c.quadraticCurveTo(W * 0.34, H * 0.86, W * 0.335, H * 0.90);

                c.lineTo(W * 0.30, H * 0.935);

                c.lineTo(W * 0.39, H * 0.935);

                c.lineTo(W * 0.40, H * 0.90);

                c.quadraticCurveTo(W * 0.405, H * 0.86, W * 0.41, H * 0.80);

                c.quadraticCurveTo(W * 0.42, H * 0.74, W * 0.425, H * 0.70);

                c.quadraticCurveTo(W * 0.43, H * 0.66, W * 0.435, H * 0.63);

                c.quadraticCurveTo(W * 0.44, H * 0.58, W * 0.45, H * 0.52);

                c.quadraticCurveTo(W * 0.46, H * 0.46, W * 0.49, H * 0.425);

                c.closePath();

              });

              // Left leg muscle contours

              ctx.globalAlpha = 0.22;

              ctx.beginPath();

              ctx.moveTo(W * 0.40, H * 0.46); ctx.quadraticCurveTo(W * 0.39, H * 0.54, W * 0.38, H * 0.62);

              ctx.strokeStyle = '#c4aa94'; ctx.lineWidth = 0.5; ctx.stroke();

              // Kneecap hint

              ctx.beginPath(); ctx.arc(W * 0.395, H * 0.68, 4, 0, Math.PI * 2);

              ctx.strokeStyle = '#c4aa94'; ctx.lineWidth = 0.5; ctx.stroke();

              // Calf bulge

              ctx.beginPath();

              ctx.moveTo(W * 0.37, H * 0.73); ctx.quadraticCurveTo(W * 0.36, H * 0.77, W * 0.36, H * 0.80);

              ctx.stroke();

              ctx.globalAlpha = 1.0;



              // Right leg

              drawBodyPart(function (c) {

                c.moveTo(W * 0.58, H * 0.425);

                c.quadraticCurveTo(W * 0.61, H * 0.46, W * 0.625, H * 0.52);

                c.quadraticCurveTo(W * 0.635, H * 0.58, W * 0.645, H * 0.63);

                c.quadraticCurveTo(W * 0.65, H * 0.66, W * 0.64, H * 0.70);

                c.quadraticCurveTo(W * 0.645, H * 0.74, W * 0.655, H * 0.80);

                c.quadraticCurveTo(W * 0.66, H * 0.86, W * 0.665, H * 0.90);

                c.lineTo(W * 0.70, H * 0.935);

                c.lineTo(W * 0.61, H * 0.935);

                c.lineTo(W * 0.60, H * 0.90);

                c.quadraticCurveTo(W * 0.595, H * 0.86, W * 0.59, H * 0.80);

                c.quadraticCurveTo(W * 0.58, H * 0.74, W * 0.575, H * 0.70);

                c.quadraticCurveTo(W * 0.57, H * 0.66, W * 0.565, H * 0.63);

                c.quadraticCurveTo(W * 0.56, H * 0.58, W * 0.55, H * 0.52);

                c.quadraticCurveTo(W * 0.54, H * 0.46, W * 0.51, H * 0.425);

                c.closePath();

              });

              // Right leg muscle contours

              ctx.globalAlpha = 0.22;

              ctx.beginPath();

              ctx.moveTo(W * 0.60, H * 0.46); ctx.quadraticCurveTo(W * 0.61, H * 0.54, W * 0.62, H * 0.62);

              ctx.strokeStyle = '#c4aa94'; ctx.lineWidth = 0.5; ctx.stroke();

              ctx.beginPath(); ctx.arc(W * 0.605, H * 0.68, 4, 0, Math.PI * 2);

              ctx.strokeStyle = '#c4aa94'; ctx.lineWidth = 0.5; ctx.stroke();

              ctx.beginPath();

              ctx.moveTo(W * 0.63, H * 0.73); ctx.quadraticCurveTo(W * 0.64, H * 0.77, W * 0.64, H * 0.80);

              ctx.stroke();

              ctx.globalAlpha = 1.0;



              // Feet

              drawBodyPart(function (c) {

                c.moveTo(W * 0.30, H * 0.935); c.lineTo(W * 0.28, H * 0.955); c.quadraticCurveTo(W * 0.30, H * 0.965, W * 0.38, H * 0.96); c.lineTo(W * 0.39, H * 0.935); c.closePath();

              });

              drawBodyPart(function (c) {

                c.moveTo(W * 0.70, H * 0.935); c.lineTo(W * 0.72, H * 0.955); c.quadraticCurveTo(W * 0.70, H * 0.965, W * 0.62, H * 0.96); c.lineTo(W * 0.61, H * 0.935); c.closePath();

              });



              // â”€â”€ Restore skin save & draw system-specific overlays (layer-aware) â”€â”€

              ctx.restore(); // end skin opacity group

              ctx.globalAlpha = 1.0;



              // Helper: check if a layer should render

              function layerOn(lid) { return layers[lid] || lid === autoLayerId; }



              // â”€â”€ SKELETAL LAYER â”€â”€

              if (layerOn('skeletal')) {

                ctx.save(); ctx.globalAlpha = 0.45;

                // Spine

                ctx.beginPath(); ctx.moveTo(W * 0.50, H * 0.10);

                for (var si = 0; si < 18; si++) { var sy = H * (0.11 + si * 0.018); ctx.lineTo(W * (0.50 + Math.sin(si * 0.3) * 0.003), sy); }

                ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3.5; ctx.stroke();

                for (var vi2 = 0; vi2 < 18; vi2++) { var vy2 = H * (0.11 + vi2 * 0.018); ctx.beginPath(); ctx.moveTo(W * 0.48, vy2); ctx.lineTo(W * 0.52, vy2); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke(); }

                // Skull outline

                ctx.beginPath(); ctx.arc(W * 0.50, H * 0.055, W * 0.046, 0, Math.PI * 2);

                ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();

                // Rib cage

                for (var ri2 = 0; ri2 < 6; ri2++) { var ry2 = H * (0.175 + ri2 * 0.025); ctx.beginPath(); ctx.moveTo(W * 0.43, ry2); ctx.quadraticCurveTo(W * 0.38, ry2 + H * 0.01, W * 0.36, ry2 + H * 0.005); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.3; ctx.stroke(); ctx.beginPath(); ctx.moveTo(W * 0.57, ry2); ctx.quadraticCurveTo(W * 0.62, ry2 + H * 0.01, W * 0.64, ry2 + H * 0.005); ctx.stroke(); }

                // Pelvis

                ctx.beginPath(); ctx.moveTo(W * 0.40, H * 0.39); ctx.quadraticCurveTo(W * 0.36, H * 0.42, W * 0.38, H * 0.45); ctx.quadraticCurveTo(W * 0.44, H * 0.46, W * 0.50, H * 0.44); ctx.quadraticCurveTo(W * 0.56, H * 0.46, W * 0.62, H * 0.45); ctx.quadraticCurveTo(W * 0.64, H * 0.42, W * 0.60, H * 0.39);

                ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.stroke();

                // Clavicles

                ctx.beginPath(); ctx.moveTo(W * 0.42, H * 0.138); ctx.quadraticCurveTo(W * 0.36, H * 0.132, W * 0.30, H * 0.145); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.58, H * 0.138); ctx.quadraticCurveTo(W * 0.64, H * 0.132, W * 0.70, H * 0.145); ctx.stroke();

                // Femur lines

                ctx.beginPath(); ctx.moveTo(W * 0.44, H * 0.46); ctx.lineTo(W * 0.40, H * 0.66); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.56, H * 0.46); ctx.lineTo(W * 0.60, H * 0.66); ctx.stroke();

                // Tibia/fibula

                ctx.beginPath(); ctx.moveTo(W * 0.40, H * 0.68); ctx.lineTo(W * 0.37, H * 0.90); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.41, H * 0.68); ctx.lineTo(W * 0.39, H * 0.90); ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = 1.2; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.60, H * 0.68); ctx.lineTo(W * 0.63, H * 0.90); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.59, H * 0.68); ctx.lineTo(W * 0.61, H * 0.90); ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = 1.2; ctx.stroke();

                // Humerus

                ctx.beginPath(); ctx.moveTo(W * 0.30, H * 0.16); ctx.lineTo(W * 0.22, H * 0.34); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.70, H * 0.16); ctx.lineTo(W * 0.78, H * 0.34); ctx.stroke();

                // Radius/ulna

                ctx.beginPath(); ctx.moveTo(W * 0.22, H * 0.35); ctx.lineTo(W * 0.17, H * 0.46); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.23, H * 0.35); ctx.lineTo(W * 0.18, H * 0.46); ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = 1; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.78, H * 0.35); ctx.lineTo(W * 0.83, H * 0.46); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.77, H * 0.35); ctx.lineTo(W * 0.82, H * 0.46); ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = 1; ctx.stroke();

                ctx.restore();

              }



              // â”€â”€ MUSCULAR LAYER â”€â”€

              if (layerOn('muscular')) {

                ctx.save(); ctx.globalAlpha = 0.40;

                // Pecs

                ctx.beginPath(); ctx.moveTo(W * 0.37, H * 0.14); ctx.quadraticCurveTo(W * 0.42, H * 0.20, W * 0.49, H * 0.20); ctx.quadraticCurveTo(W * 0.46, H * 0.17, W * 0.37, H * 0.14);

                ctx.fillStyle = '#fca5a5'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.2; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.63, H * 0.14); ctx.quadraticCurveTo(W * 0.58, H * 0.20, W * 0.51, H * 0.20); ctx.quadraticCurveTo(W * 0.54, H * 0.17, W * 0.63, H * 0.14);

                ctx.fillStyle = '#fca5a5'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.2; ctx.stroke();

                // Deltoids

                ctx.beginPath(); ctx.ellipse(W * 0.30, H * 0.16, W * 0.04, H * 0.022, -0.3, 0, Math.PI * 2);

                ctx.fillStyle = '#fecaca'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.8; ctx.stroke();

                ctx.beginPath(); ctx.ellipse(W * 0.70, H * 0.16, W * 0.04, H * 0.022, 0.3, 0, Math.PI * 2);

                ctx.fillStyle = '#fecaca'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.8; ctx.stroke();

                // Abs

                for (var mi = 0; mi < 4; mi++) { var my = H * (0.28 + mi * 0.03); ctx.beginPath(); ctx.moveTo(W * 0.45, my); ctx.lineTo(W * 0.55, my); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1; ctx.stroke(); }

                ctx.beginPath(); ctx.moveTo(W * 0.50, H * 0.22); ctx.lineTo(W * 0.50, H * 0.40); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.8; ctx.stroke();

                // Quads

                ctx.beginPath(); ctx.ellipse(W * 0.41, H * 0.54, W * 0.028, H * 0.07, 0.08, 0, Math.PI * 2); ctx.fillStyle = '#fecaca'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.8; ctx.stroke();

                ctx.beginPath(); ctx.ellipse(W * 0.59, H * 0.54, W * 0.028, H * 0.07, -0.08, 0, Math.PI * 2); ctx.fillStyle = '#fecaca'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.8; ctx.stroke();

                // Biceps

                ctx.beginPath(); ctx.ellipse(W * 0.25, H * 0.27, W * 0.016, H * 0.035, 0.5, 0, Math.PI * 2); ctx.fillStyle = '#fecaca'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.8; ctx.stroke();

                ctx.beginPath(); ctx.ellipse(W * 0.75, H * 0.27, W * 0.016, H * 0.035, -0.5, 0, Math.PI * 2); ctx.fillStyle = '#fecaca'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.8; ctx.stroke();

                // Calves

                ctx.beginPath(); ctx.ellipse(W * 0.38, H * 0.77, W * 0.018, H * 0.04, 0.05, 0, Math.PI * 2); ctx.fillStyle = '#fecaca'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.8; ctx.stroke();

                ctx.beginPath(); ctx.ellipse(W * 0.62, H * 0.77, W * 0.018, H * 0.04, -0.05, 0, Math.PI * 2); ctx.fillStyle = '#fecaca'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.8; ctx.stroke();

                ctx.restore();

              }



              // â”€â”€ ORGAN LAYER â”€â”€

              if (layerOn('organs')) {

                ctx.save(); ctx.globalAlpha = 0.50;

                // Lungs

                ctx.beginPath(); ctx.ellipse(W * 0.42, H * 0.22, W * 0.055, H * 0.055, 0, 0, Math.PI * 2); ctx.fillStyle = '#bfdbfe'; ctx.fill(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.stroke();

                ctx.beginPath(); ctx.ellipse(W * 0.58, H * 0.22, W * 0.055, H * 0.055, 0, 0, Math.PI * 2); ctx.fillStyle = '#bfdbfe'; ctx.fill(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.stroke();

                // Heart (small, between lungs)

                ctx.beginPath();

                var hx = W * 0.50, hy = H * 0.24;

                ctx.moveTo(hx, hy + 6); ctx.bezierCurveTo(hx - 8, hy - 4, hx - 14, hy, hx - 14, hy + 6); ctx.bezierCurveTo(hx - 14, hy + 12, hx - 4, hy + 18, hx, hy + 22); ctx.bezierCurveTo(hx + 4, hy + 18, hx + 14, hy + 12, hx + 14, hy + 6); ctx.bezierCurveTo(hx + 14, hy, hx + 8, hy - 4, hx, hy + 6);

                ctx.fillStyle = '#fca5a5'; ctx.fill(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1; ctx.stroke();

                // Liver

                ctx.beginPath(); ctx.ellipse(W * 0.56, H * 0.30, W * 0.045, H * 0.028, 0.2, 0, Math.PI * 2); ctx.fillStyle = '#a1887f'; ctx.fill(); ctx.strokeStyle = '#795548'; ctx.lineWidth = 0.8; ctx.stroke();

                // Stomach

                ctx.beginPath(); ctx.ellipse(W * 0.47, H * 0.31, W * 0.032, H * 0.028, -0.3, 0, Math.PI * 2); ctx.fillStyle = '#c8e6c9'; ctx.fill(); ctx.strokeStyle = '#43a047'; ctx.lineWidth = 0.8; ctx.stroke();

                // Kidneys

                ctx.beginPath(); ctx.ellipse(W * 0.43, H * 0.35, W * 0.015, H * 0.02, 0, 0, Math.PI * 2); ctx.fillStyle = '#ef9a9a'; ctx.fill(); ctx.strokeStyle = '#c62828'; ctx.lineWidth = 0.7; ctx.stroke();

                ctx.beginPath(); ctx.ellipse(W * 0.57, H * 0.35, W * 0.015, H * 0.02, 0, 0, Math.PI * 2); ctx.fillStyle = '#ef9a9a'; ctx.fill(); ctx.strokeStyle = '#c62828'; ctx.lineWidth = 0.7; ctx.stroke();

                // Intestines (coil)

                ctx.beginPath(); ctx.moveTo(W * 0.44, H * 0.35);

                for (var ii = 0; ii < 8; ii++) { ctx.lineTo(W * (0.44 + (ii % 2 === 0 ? 0.06 : 0)), H * (0.36 + ii * 0.01)); }

                ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = 1.5; ctx.stroke();

                // Bladder

                ctx.beginPath(); ctx.ellipse(W * 0.50, H * 0.43, W * 0.02, H * 0.015, 0, 0, Math.PI * 2); ctx.fillStyle = '#ffe082'; ctx.fill(); ctx.strokeStyle = '#ffa000'; ctx.lineWidth = 0.7; ctx.stroke();

                ctx.restore();

              }



              // â”€â”€ CIRCULATORY LAYER â”€â”€

              if (layerOn('circulatory')) {

                ctx.save(); ctx.globalAlpha = 0.45;

                // Pulsing heart

                var heartPulse = 1.0 + Math.sin(anatTick * 0.08) * 0.08;

                ctx.save(); ctx.translate(W * 0.50, H * 0.23); ctx.scale(heartPulse, heartPulse);

                ctx.beginPath(); ctx.moveTo(0, 4); ctx.bezierCurveTo(-10, -5, -18, -1, -18, 6); ctx.bezierCurveTo(-18, 14, -4, 20, 0, 28); ctx.bezierCurveTo(4, 20, 18, 14, 18, 6); ctx.bezierCurveTo(18, -1, 10, -5, 0, 4);

                ctx.fillStyle = '#ef4444'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.restore();

                // Aorta line

                ctx.beginPath(); ctx.moveTo(W * 0.50, H * 0.20); ctx.quadraticCurveTo(W * 0.52, H * 0.17, W * 0.54, H * 0.15); ctx.quadraticCurveTo(W * 0.53, H * 0.13, W * 0.50, H * 0.10);

                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.stroke();

                // Descending aorta

                ctx.beginPath(); ctx.moveTo(W * 0.50, H * 0.23); ctx.lineTo(W * 0.50, H * 0.44);

                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.stroke();

                // Carotids

                ctx.beginPath(); ctx.moveTo(W * 0.48, H * 0.10); ctx.lineTo(W * 0.47, H * 0.06); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.52, H * 0.10); ctx.lineTo(W * 0.53, H * 0.06); ctx.stroke();

                // Femoral arteries

                ctx.beginPath(); ctx.moveTo(W * 0.47, H * 0.44); ctx.lineTo(W * 0.41, H * 0.68); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.8; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.53, H * 0.44); ctx.lineTo(W * 0.59, H * 0.68); ctx.stroke();

                // Tibial arteries

                ctx.beginPath(); ctx.moveTo(W * 0.41, H * 0.69); ctx.lineTo(W * 0.38, H * 0.90); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.2; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.59, H * 0.69); ctx.lineTo(W * 0.62, H * 0.90); ctx.stroke();

                // Brachial/radial

                ctx.beginPath(); ctx.moveTo(W * 0.34, H * 0.16); ctx.lineTo(W * 0.22, H * 0.34); ctx.lineTo(W * 0.17, H * 0.46); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.2; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.66, H * 0.16); ctx.lineTo(W * 0.78, H * 0.34); ctx.lineTo(W * 0.83, H * 0.46); ctx.stroke();

                // Veins (blue)

                ctx.beginPath(); ctx.moveTo(W * 0.52, H * 0.22); ctx.lineTo(W * 0.52, H * 0.15); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.52, H * 0.28); ctx.lineTo(W * 0.52, H * 0.44); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.49, H * 0.44); ctx.lineTo(W * 0.43, H * 0.68); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.2; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.51, H * 0.44); ctx.lineTo(W * 0.57, H * 0.68); ctx.stroke();

                ctx.restore();

              }



              // â”€â”€ NERVOUS LAYER â”€â”€

              if (layerOn('nervous')) {

                ctx.save(); ctx.globalAlpha = 0.45;

                // Brain glow

                var brGlow = ctx.createRadialGradient(W * 0.50, H * 0.055, 4, W * 0.50, H * 0.055, W * 0.05);

                brGlow.addColorStop(0, '#fef08a'); brGlow.addColorStop(1, '#fef08a00');

                ctx.beginPath(); ctx.arc(W * 0.50, H * 0.055, W * 0.05, 0, Math.PI * 2); ctx.fillStyle = brGlow; ctx.fill();

                ctx.beginPath(); ctx.arc(W * 0.50, H * 0.055, W * 0.042, 0, Math.PI * 2); ctx.strokeStyle = '#eab308'; ctx.lineWidth = 1.5; ctx.stroke();

                // Spinal cord

                ctx.beginPath(); ctx.moveTo(W * 0.50, H * 0.09); ctx.lineTo(W * 0.50, H * 0.44);

                ctx.strokeStyle = '#eab308'; ctx.lineWidth = 3; ctx.stroke();

                // Nerve branches

                var nervePts = [

                  [0.50, 0.14, 0.30, 0.30], [0.50, 0.14, 0.70, 0.30],

                  [0.50, 0.20, 0.28, 0.36], [0.50, 0.20, 0.72, 0.36],

                  [0.50, 0.30, 0.20, 0.44], [0.50, 0.30, 0.80, 0.44],

                  [0.50, 0.44, 0.39, 0.72], [0.50, 0.44, 0.61, 0.72],

                  [0.39, 0.72, 0.37, 0.90], [0.61, 0.72, 0.63, 0.90]

                ];

                nervePts.forEach(function (np) { ctx.beginPath(); ctx.moveTo(W * np[0], H * np[1]); ctx.quadraticCurveTo(W * (np[0] + np[2]) * 0.5, H * (np[1] + np[3]) * 0.5, W * np[2], H * np[3]); ctx.strokeStyle = '#eab308'; ctx.lineWidth = 1.2; ctx.stroke(); });

                // Nerve nodes

                [[0.50, 0.14], [0.50, 0.20], [0.50, 0.30], [0.50, 0.38]].forEach(function (n) {

                  ctx.beginPath(); ctx.arc(W * n[0], H * n[1], 2.5, 0, Math.PI * 2); ctx.fillStyle = '#eab308'; ctx.fill();

                });

                ctx.restore();

              }



              // â”€â”€ LYMPHATIC LAYER â”€â”€

              if (layerOn('lymphatic')) {

                ctx.save(); ctx.globalAlpha = 0.40;

                // Thoracic duct

                ctx.beginPath(); ctx.moveTo(W * 0.50, H * 0.14); ctx.quadraticCurveTo(W * 0.48, H * 0.30, W * 0.50, H * 0.44);

                ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);

                // Lymph nodes (green dots)

                var lnPts = [[0.46, 0.13], [0.54, 0.13], [0.34, 0.20], [0.66, 0.20], [0.44, 0.30], [0.56, 0.30], [0.44, 0.44], [0.56, 0.44], [0.42, 0.58], [0.58, 0.58]];

                lnPts.forEach(function (ln) { ctx.beginPath(); ctx.arc(W * ln[0], H * ln[1], 4, 0, Math.PI * 2); ctx.fillStyle = '#86efac'; ctx.fill(); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1; ctx.stroke(); });

                // Spleen hint

                ctx.beginPath(); ctx.ellipse(W * 0.58, H * 0.32, W * 0.02, H * 0.018, 0, 0, Math.PI * 2); ctx.fillStyle = '#86efac80'; ctx.fill(); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1; ctx.stroke();

                // Thymus hint

                ctx.beginPath(); ctx.ellipse(W * 0.50, H * 0.18, W * 0.015, H * 0.012, 0, 0, Math.PI * 2); ctx.fillStyle = '#86efac80'; ctx.fill(); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1; ctx.stroke();

                // Connecting vessels

                for (var li = 0; li < lnPts.length - 2; li++) { ctx.beginPath(); ctx.moveTo(W * lnPts[li][0], H * lnPts[li][1]); ctx.lineTo(W * lnPts[li + 2][0], H * lnPts[li + 2][1]); ctx.strokeStyle = '#22c55e50'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]); }

                ctx.restore();

              }



              // â”€â”€ Enhanced Structure Markers â”€â”€

              filtered.forEach(function (st) {

                var px = st.x * W, py = st.y * H;

                var isSel = sel && sel.id === st.id;

                var r = isSel ? 9 : 5;

                // Animated pulsing ring for selected

                if (isSel) {

                  var pulse = 1.0 + Math.sin(anatTick * 0.06) * 0.3;

                  ctx.save();

                  ctx.globalAlpha = 0.3 - pulse * 0.1;

                  ctx.beginPath(); ctx.arc(px, py, r + 6 + pulse * 4, 0, Math.PI * 2);

                  ctx.strokeStyle = sys.accent; ctx.lineWidth = 1.5; ctx.stroke();

                  ctx.restore();

                  // Inner glow

                  ctx.save();

                  var sGlow = ctx.createRadialGradient(px, py, r * 0.3, px, py, r + 4);

                  sGlow.addColorStop(0, sys.accent + '50');

                  sGlow.addColorStop(1, sys.accent + '00');

                  ctx.beginPath(); ctx.arc(px, py, r + 4, 0, Math.PI * 2);

                  ctx.fillStyle = sGlow; ctx.fill();

                  ctx.restore();

                }

                // Marker dot (gradient sphere)

                var mG = ctx.createRadialGradient(px - 1, py - 1, 1, px, py, r);

                mG.addColorStop(0, isSel ? sys.accent + 'cc' : sys.accent + '88');

                mG.addColorStop(1, sys.accent);

                ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);

                ctx.fillStyle = mG; ctx.fill();

                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

                // Label with leader line + tooltip pill

                if (isSel) {

                  ctx.save();

                  var isRight = px > W * 0.5;

                  var labelX = isRight ? px - 18 : px + 18;

                  ctx.font = 'bold 9px Inter, system-ui, sans-serif';

                  var tw = ctx.measureText(st.name).width;

                  var pillX = isRight ? labelX - tw - 8 : labelX - 4;

                  var pillY = py - 7;

                  // Leader line

                  ctx.beginPath();

                  ctx.moveTo(px + (isRight ? -r - 2 : r + 2), py);

                  ctx.lineTo(isRight ? pillX + tw + 8 : pillX, py);

                  ctx.strokeStyle = sys.accent + '60'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);

                  // Tooltip pill

                  ctx.beginPath();

                  ctx.roundRect(pillX, pillY, tw + 10, 15, 4);

                  ctx.fillStyle = sys.accent; ctx.fill();

                  ctx.shadowColor = sys.accent + '40'; ctx.shadowBlur = 4;

                  // Label text

                  ctx.textAlign = isRight ? 'right' : 'left';

                  ctx.fillStyle = '#fff';

                  ctx.fillText(st.name, isRight ? pillX + tw + 5 : pillX + 5, py + 3);

                  ctx.restore();

                }

              });

              // â”€â”€ Styled View Label â”€â”€

              ctx.save();

              var viewLbl = view === 'anterior' ? 'ANTERIOR VIEW' : 'POSTERIOR VIEW';

              ctx.font = 'bold 9px Inter, system-ui, sans-serif';

              var vW = ctx.measureText(viewLbl).width + 16;

              ctx.beginPath();

              ctx.roundRect(W * 0.5 - vW / 2, H - 18, vW, 14, 4);

              ctx.fillStyle = '#f8fafc'; ctx.fill();

              ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.5; ctx.stroke();

              ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';

              ctx.fillText(viewLbl, W * 0.5, H - 8);

              ctx.restore();



              // Continue animation

              canvas._anatomyAnim = requestAnimationFrame(drawAnatomyFrame);

            };

            drawAnatomyFrame();

          };

          var handleClick = function (e) {

            var rect = e.target.getBoundingClientRect();

            var cx = (e.clientX - rect.left) / rect.width;

            var cy = (e.clientY - rect.top) / rect.height;

            var closest = null, minD = 0.06;

            filtered.forEach(function (st) {

              var dist = Math.sqrt(Math.pow(st.x - cx, 2) + Math.pow(st.y - cy, 2));

              if (dist < minD) { minD = dist; closest = st; }

            });

            if (closest) upd('selectedStructure', closest.id);

          };



          return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },

            // Header

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: function () { setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("div", null,

                React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83E\uDEC0 Human Anatomy Explorer"),

                React.createElement("p", { className: "text-xs text-slate-400" }, sys.desc)

              )

            ),

            // System tabs

            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },

              Object.keys(SYSTEMS).map(function (key) {

                var s = SYSTEMS[key];

                return React.createElement("button", {

                  key: key,

                  onClick: function () { upd('system', key); upd('selectedStructure', null); upd('quizMode', false); upd('search', ''); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (sysKey === key ? 'text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'),

                  style: sysKey === key ? { background: s.accent } : {}

                }, s.icon + ' ' + s.name);

              })

            ),

            // Layer toggle bar

            React.createElement("div", { className: "flex items-center gap-1.5 mb-3 flex-wrap bg-slate-50 rounded-xl px-3 py-2 border border-slate-200" },

              React.createElement("span", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1" }, "\uD83E\uDDE0 Layers"),

              LAYER_DEFS.map(function (ld) {

                var isOn = layers[ld.id] || ld.id === autoLayerId;

                return React.createElement("button", {

                  key: ld.id,

                  onClick: function () { toggleLayer(ld.id); },

                  title: (isOn ? 'Hide ' : 'Show ') + ld.name + ' layer',

                  className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all border " +

                    (isOn

                      ? 'text-white shadow-sm border-transparent'

                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-100'),

                  style: isOn ? { background: ld.accent, borderColor: ld.accent } : {}

                }, ld.icon + ' ' + ld.name);

              }),

              React.createElement("button", {

                onClick: function () { upd('visibleLayers', { skin: true }); },

                title: 'Reset all layers to default (skin only)',

                className: "ml-auto px-2 py-1 rounded-lg text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"

              }, "\u21BA Reset")

            ),

            // Controls: view toggle, search, quiz

            React.createElement("div", { className: "flex items-center gap-2 mb-3 flex-wrap" },

              React.createElement("div", { className: "flex rounded-lg border border-slate-200 overflow-hidden" },

                ['anterior', 'posterior'].map(function (v) {

                  return React.createElement("button", {

                    key: v,

                    onClick: function () { upd('view', v); upd('selectedStructure', null); },

                    className: "px-3 py-1 text-xs font-bold transition-all " + (view === v ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')

                  }, v.charAt(0).toUpperCase() + v.slice(1));

                })

              ),

              React.createElement("input", {

                type: "text", placeholder: "\uD83D\uDD0D Search structures...",

                value: d.search || '',

                onChange: function (e) { upd('search', e.target.value); },

                className: "flex-1 min-w-[140px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-300 outline-none"

              }),

              React.createElement("button", {

                onClick: function () { upd('quizMode', !d.quizMode); upd('quizIdx', 0); upd('quizScore', 0); upd('quizFeedback', null); },

                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.quizMode ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100')

              }, d.quizMode ? '\u2705 Quiz On' : '\uD83E\uDDEA Quiz'),

              React.createElement("div", { className: "flex rounded-lg border border-slate-200 overflow-hidden" },

                [{ v: 1, label: 'K\u20135', tip: 'Elementary' }, { v: 2, label: '6\u20138', tip: 'Middle' }, { v: 3, label: '9\u201312+', tip: 'Advanced' }].map(function (lv) {

                  return React.createElement("button", {

                    key: lv.v, title: lv.tip + ' level',

                    onClick: function () { upd('complexity', lv.v); upd('selectedStructure', null); },

                    className: "px-2 py-1 text-[10px] font-bold transition-all " + (complexity === lv.v ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')

                  }, lv.label);

                })

              ),

              React.createElement("span", { className: "text-[10px] text-slate-500 font-bold" }, filtered.length + ' structures')

            ),

            // Main content: canvas + detail panel

            React.createElement("div", { className: "flex gap-4", style: { alignItems: 'flex-start' } },

              // Canvas

              React.createElement("div", { className: "flex-shrink-0" },

                React.createElement("canvas", {

                  ref: canvasRef, width: 360, height: 520,

                  onClick: handleClick,

                  className: "rounded-xl border-2 cursor-crosshair",

                  style: { borderColor: sys.accent + '30', background: '#fafaf9' }

                })

              ),

              // Right panel

              React.createElement("div", { className: "flex-1 min-w-0" },

                d.quizMode ? (

                  // Quiz panel

                  quizQ ? React.createElement("div", { className: "bg-white rounded-xl border-2 border-green-200 p-4 space-y-3" },

                    React.createElement("div", { className: "flex items-center justify-between mb-2" },

                      React.createElement("h4", { className: "font-bold text-green-800 text-sm" }, "\uD83E\uDDEA Anatomy Quiz"),

                      React.createElement("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700" }, "\u2B50 " + (d.quizScore || 0) + "/" + Math.min((d.quizIdx || 0) + 1, quizPool.length))

                    ),

                    React.createElement("p", { className: "text-sm text-slate-800 font-bold leading-relaxed" }, "Which structure has this function?"),

                    React.createElement("p", { className: "text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed italic" }, quizQ.fn.substring(0, 120) + (quizQ.fn.length > 120 ? '...' : '')),

                    React.createElement("div", { className: "grid grid-cols-1 gap-1.5" },

                      quizOptions.map(function (opt) {

                        var fb = d.quizFeedback;

                        var isCorrect = opt.id === quizQ.id;

                        var wasChosen = fb && fb.chosen === opt.id;

                        var showResult = fb !== null && fb !== undefined;

                        return React.createElement("button", {

                          key: opt.id,

                          disabled: showResult,

                          onClick: function () {

                            var correct = opt.id === quizQ.id;

                            upd('quizFeedback', { chosen: opt.id, correct: correct });

                            if (correct) upd('quizScore', (d.quizScore || 0) + 1);

                          },

                          className: "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 " +

                            (showResult && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :

                              showResult && wasChosen && !isCorrect ? 'border-red-400 bg-red-50 text-red-700' :

                                'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50')

                        }, (showResult && isCorrect ? '\u2705 ' : showResult && wasChosen ? '\u274C ' : '') + opt.name);

                      })

                    ),

                    d.quizFeedback && React.createElement("div", { className: "rounded-lg p-3 text-xs leading-relaxed space-y-1.5 " + (d.quizFeedback.correct ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },

                      React.createElement("p", { className: "font-black " + (d.quizFeedback.correct ? 'text-green-800' : 'text-amber-800') }, (d.quizFeedback.correct ? '\u2705 Correct! ' : '\u274C The answer was: ') + quizQ.name),

                      React.createElement("p", { className: "text-slate-700" }, React.createElement("span", { className: "font-bold text-slate-500" }, "Function: "), quizQ.fn),

                      quizQ.clinical && React.createElement("p", { className: "text-slate-600 italic" }, React.createElement("span", { className: "font-bold text-rose-500" }, "\u26A0 Clinical: "), quizQ.clinical)

                    ),

                    d.quizFeedback && React.createElement("button", {

                      onClick: function () { upd('quizIdx', (d.quizIdx || 0) + 1); upd('quizFeedback', null); },

                      className: "w-full py-2 mt-2 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-all"

                    }, "Next Question \u2192")

                  ) : React.createElement("p", { className: "text-sm text-slate-500 italic" }, "No quiz questions available.")

                ) : (

                  sel ? (

                    // Detail panel

                    React.createElement("div", { className: "bg-white rounded-xl border-2 p-4 space-y-3", style: { borderColor: sys.accent + '40' } },

                      React.createElement("div", { className: "flex items-start justify-between" },

                        React.createElement("h4", { className: "text-base font-black", style: { color: sys.accent } }, sel.name),

                        React.createElement("button", { onClick: function () { upd('selectedStructure', null); }, className: "p-1 hover:bg-slate-100 rounded" }, React.createElement(X, { size: 14, className: "text-slate-400" }))

                      ),

                      React.createElement("div", { className: "space-y-2.5" },

                        React.createElement("div", null,

                          React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase mb-0.5" }, "Function"),

                          React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, sel.fn)

                        ),

                        sel.origin && React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                          React.createElement("div", null,

                            React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase mb-0.5" }, "Origin"),

                            React.createElement("p", { className: "text-xs text-slate-600" }, sel.origin)

                          ),

                          React.createElement("div", null,

                            React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase mb-0.5" }, "Insertion"),

                            React.createElement("p", { className: "text-xs text-slate-600" }, sel.insertion)

                          )

                        ),

                        React.createElement("div", null,

                          React.createElement("p", { className: "text-[10px] font-bold text-rose-500 uppercase mb-0.5" }, "\u26A0 Clinical Significance"),

                          React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-rose-50 rounded-lg p-2" }, sel.clinical)

                        ),

                        sel.detail && React.createElement("div", null,

                          React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase mb-0.5" }, "Detail"),

                          React.createElement("p", { className: "text-xs text-slate-500 leading-relaxed" }, sel.detail)

                        ),

                        // â”€â”€ Brain Waves Section â”€â”€

                        sel.brainWaves && React.createElement("div", { className: "mt-3 pt-3 border-t border-slate-200" },

                          React.createElement("p", { className: "text-[10px] font-bold text-violet-600 uppercase mb-2" }, "\u26A1 Brain Wave Types (EEG)"),

                          React.createElement("div", { className: "space-y-2" },

                            sel.brainWaves.map(function (w) {

                              return React.createElement("div", { key: w.type, className: "rounded-lg p-2.5 border", style: { borderColor: w.color + '40', background: w.color + '08' } },

                                React.createElement("div", { className: "flex items-center gap-2 mb-1" },

                                  React.createElement("span", { className: "text-base" }, w.emoji),

                                  React.createElement("span", { className: "text-xs font-black", style: { color: w.color } }, w.type),

                                  React.createElement("span", { className: "ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full", style: { background: w.color + '18', color: w.color } }, w.freq)

                                ),

                                React.createElement("p", { className: "text-[10px] font-bold text-slate-500 mb-0.5" }, "State: ", React.createElement("span", { className: "text-slate-700" }, w.state)),

                                React.createElement("p", { className: "text-[10px] text-slate-600 leading-relaxed mb-1" }, w.characteristics),

                                React.createElement("p", { className: "text-[10px] text-rose-600 italic leading-relaxed" }, "\u26A0 ", w.clinical)

                              );

                            })

                          )

                        ),

                        // â”€â”€ Sleep Stages Section â”€â”€

                        sel.sleepStages && React.createElement("div", { className: "mt-3 pt-3 border-t border-slate-200" },

                          React.createElement("p", { className: "text-[10px] font-bold text-indigo-600 uppercase mb-2" }, "\uD83D\uDCA4 Sleep Architecture"),

                          React.createElement("div", { className: "space-y-2" },

                            sel.sleepStages.map(function (s) {

                              return React.createElement("div", { key: s.stage, className: "rounded-lg p-2.5 border border-indigo-100 bg-indigo-50/30" },

                                React.createElement("div", { className: "flex items-center gap-2 mb-1" },

                                  React.createElement("span", { className: "text-base" }, s.emoji),

                                  React.createElement("span", { className: "text-xs font-black text-indigo-700" }, s.stage),

                                  React.createElement("span", { className: "ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600" }, s.pct + " of night")

                                ),

                                React.createElement("div", { className: "flex gap-3 mb-1" },

                                  React.createElement("span", { className: "text-[10px] text-slate-500" }, "\u23F1 ", React.createElement("span", { className: "font-bold" }, s.duration)),

                                  React.createElement("span", { className: "text-[10px] text-slate-500" }, "\uD83C\uDF0A ", React.createElement("span", { className: "font-bold" }, s.waves))

                                ),

                                React.createElement("p", { className: "text-[10px] text-slate-600 leading-relaxed mb-1" }, s.desc),

                                React.createElement("p", { className: "text-[10px] text-rose-600 italic leading-relaxed" }, "\u26A0 ", s.clinical)

                              );

                            })

                          )

                        )

                      )

                    )

                  ) : (

                    // Structure list

                    React.createElement("div", { className: "space-y-1 max-h-[460px] overflow-y-auto pr-1" },

                      filtered.length === 0 && React.createElement("p", { className: "text-xs text-slate-400 italic py-4 text-center" }, "No structures match your search."),

                      filtered.map(function (st) {

                        return React.createElement("button", {

                          key: st.id,

                          onClick: function () { upd('selectedStructure', st.id); },

                          className: "w-full text-left px-3 py-2 rounded-lg text-xs transition-all hover:shadow-sm " +

                            (d.selectedStructure === st.id ? 'font-bold border-2' : 'bg-slate-50 hover:bg-white border border-slate-200'),

                          style: d.selectedStructure === st.id ? { borderColor: sys.accent, background: sys.color } : {}

                        },

                          React.createElement("div", { className: "font-bold text-slate-800" }, st.name),

                          React.createElement("div", { className: "text-[10px] text-slate-400 mt-0.5 line-clamp-1" }, st.fn.substring(0, 80) + (st.fn.length > 80 ? '...' : ''))

                        );

                      })

                    )

                  )

                )

              )

            )

          );
      })();
    }
  });


  /* dissection: removed — see stem_tool_dissection.js */



  /* brainAtlas: removed â€” see stem_tool_brainatlas.js */

  // â•â•â• ðŸ”¬ companionPlanting (companionPlanting) â•â•â•
  window.StemLab.registerTool('companionPlanting', {
    icon: 'ðŸ”¬',
    label: 'companionPlanting',
    desc: '',
    color: 'slate',
    category: 'science',
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

      // â”€â”€ Tool body (companionPlanting) â”€â”€
      return (function() {
var d = (labToolData.companionPlanting) || {};

          var upd = function (key, val) { var _k = {}; _k[key] = val; setLabToolData(function (prev) { return Object.assign({}, prev, { companionPlanting: Object.assign({}, prev.companionPlanting || {}, _k) }); }); };



          // â”€â”€ State defaults â”€â”€

          var phase = d.phase || 'plant';  // 'plant' | 'grow' | 'harvest'

          var growthTime = d.growthTime || 0;   // 0-100

          var growSpeed = d.growSpeed || 1;  // 1, 2, or 5

          var cornPlanted = d.cornPlanted || false;

          var beansPlanted = d.beansPlanted || false;

          var squashPlanted = d.squashPlanted || false;

          var compareMode = d.compareMode || false;

          var showCulture = d.showCulture || false;

          var showSoilDetail = d.showSoilDetail || false;

          var quizActive = d.quizActive || false;

          var quizQ = d.quizQ || 0;

          var showSciencePanel = d.showSciencePanel || false;

          var quizAnswer = d.quizAnswer || '';

          var quizFeedback = d.quizFeedback || '';



          // â”€â”€ Sims-style needs/meters â”€â”€

          var day = d.day || 0;

          var moisture = typeof d.moisture === 'number' ? d.moisture : 60;

          var nitrogenLevel = typeof d.nitrogenLevel === 'number' ? d.nitrogenLevel : 35;

          var pestPressure = typeof d.pestPressure === 'number' ? d.pestPressure : 10;

          var weedCover = typeof d.weedCover === 'number' ? d.weedCover : 15;

          var soilTemp = typeof d.soilTemp === 'number' ? d.soilTemp : 20;

          var plantHealth = typeof d.plantHealth === 'number' ? d.plantHealth : 100;

          var actionCooldowns = d.actionCooldowns || {};    // { water: 0, compost: 0, weed: 0, inspect: 0, mulch: 0 }

          var eventLog = d.eventLog || [];

          var eventPopup = d.eventPopup || null;

          var synCornBeans = typeof d.synCornBeans === 'number' ? d.synCornBeans : 0;

          var synBeansSoil = typeof d.synBeansSoil === 'number' ? d.synBeansSoil : 0;

          var synSquashAll = typeof d.synSquashAll === 'number' ? d.synSquashAll : 0;

          var seasonScore = d.seasonScore || 0;

          var totalScore = d.totalScore || 0;

          var harvestCount = d.harvestCount || 0;

          var lastEventDay = d.lastEventDay || 0;

          var nitrogenCarryover = d.nitrogenCarryover || 0;



          // â”€â”€ Season calculation â”€â”€

          var DAYS_PER_SEASON = 30;

          var seasonIndex = Math.floor((day % 120) / DAYS_PER_SEASON);  // 0=spring, 1=summer, 2=autumn, 3=winter

          var seasonNames = ['ðŸŒ± Spring', 'â˜€ï¸ Summer', 'ðŸ‚ Autumn', 'â„ï¸ Winter'];

          var seasonName = seasonNames[seasonIndex];

          var dayInSeason = (day % 120) % DAYS_PER_SEASON;

          var seasonFactors = [

            { growth: 1.0, pestRate: 0.6, moistureDecay: 1.5, ambientTemp: 18 },  // spring

            { growth: 1.4, pestRate: 1.3, moistureDecay: 2.5, ambientTemp: 30 },  // summer

            { growth: 0.6, pestRate: 0.4, moistureDecay: 1.0, ambientTemp: 15 },  // autumn

            { growth: 0.0, pestRate: 0.1, moistureDecay: 0.5, ambientTemp: 4 }    // winter

          ];

          var sf = seasonFactors[seasonIndex];



          // â”€â”€ Computed values from meters â”€â”€

          var allPlanted = cornPlanted && beansPlanted && squashPlanted;

          var soilHealth = Math.round(Math.max(0, Math.min(100,

            (Math.min(nitrogenLevel, 100) * 0.25) +

            (Math.min(moisture, 100) * 0.25) +

            ((100 - Math.min(pestPressure, 100)) * 0.2) +

            ((100 - Math.min(weedCover, 100)) * 0.15) +

            (plantHealth * 0.15)

          )));



          // Synergy bonuses

          var synergyBonus = 1 + (synCornBeans / 500) + (synBeansSoil / 500) + (synSquashAll / 500);



          // Monoculture comparison (simulated decline)

          var t_norm = growthTime / 100;

          var monoN = Math.max(5, 30 - 25 * t_norm);

          var monoH2O = Math.max(15, 40 - 25 * t_norm);

          var monoWeeds = Math.min(95, 30 + 65 * t_norm);

          var monoHealth = Math.round((monoN + monoH2O + (100 - monoWeeds)) / 3);



          // Legacy aliases for gauge display

          var nitrogen = nitrogenLevel;

          var weedPressure = weedCover;

          var temperature = soilTemp;



          // â”€â”€ Random Events Table â”€â”€

          var _EVENTS = [

            { id: 'rain', emoji: 'ðŸŒ§ï¸', title: 'Heavy Rain', desc: 'A downpour soaks the soil! Nitrogen leaches with runoff.', effects: { moisture: 40, nitrogenLevel: -5 }, lesson: 'Nutrient leaching: Heavy rain washes soluble nitrogen deeper into soil, away from plant roots. Cover crops and mulch help prevent this.' },

            { id: 'aphids', emoji: 'ðŸ›', title: 'Aphid Outbreak', desc: 'Aphids swarm the garden!', effects: { pestPressure: 30 }, lesson: 'Biological pest control: Aphids feed on plant sap. Ladybugs, lacewings, and parasitic wasps are natural predators that control aphid populations without chemicals.' },

            { id: 'pollinators', emoji: 'ðŸ', title: 'Pollinator Visit', desc: 'Bees and butterflies visit the garden!', effects: { plantHealth: 15 }, lesson: 'Pollination biology: Squash flowers especially depend on pollinators. Companion planting attracts diverse pollinators, improving fruit set across all crops.' },

            { id: 'wind', emoji: 'ðŸŒªï¸', title: 'Wind Storm', desc: 'Strong winds stress the plants.', effects: { plantHealth: -10, moisture: -10 }, lesson: 'Windbreak design: Dense planting and tall stalks (like corn) create natural windbreaks. Bean vines wrapped around corn stalks add structural stability.' },

            { id: 'ladybugs', emoji: 'ðŸž', title: 'Ladybug Arrival', desc: 'Ladybugs colonize the garden!', effects: { pestPressure: -25 }, lesson: 'Beneficial insects: A single ladybug eats ~5,000 aphids in its lifetime. Companion planting creates habitat diversity that attracts these natural pest controllers.' },

            { id: 'heatwave', emoji: 'â˜€ï¸', title: 'Heat Wave', desc: 'Scorching heat dries the soil.', effects: { moisture: -20, soilTemp: 5 }, lesson: 'Microclimate management: Squash leaves shade the soil, reducing temperature by up to 10Â°F and cutting evaporation by 50%. This living mulch is nature\'s AC.' },

            { id: 'mycorrhiza', emoji: 'ðŸ„', title: 'Mycorrhizal Bloom', desc: 'Beneficial fungi spread through the root zone!', effects: { nitrogenLevel: 15, plantHealth: 10 }, lesson: 'Fungal symbiosis: Mycorrhizal fungi extend plant root systems 100-1000Ã—, trading soil minerals for plant sugars. This underground network connects all three sisters.' }

          ];



          // â”€â”€ Action definitions â”€â”€

          var _ACTIONS = [

            { id: 'water', emoji: 'ðŸ’§', label: 'Water', effect: function () { return { moisture: 25 }; }, cooldownDays: 4, tip: 'Irrigate the soil' },

            { id: 'compost', emoji: 'ðŸ§±', label: 'Compost', effect: function () { return { nitrogenLevel: 20, plantHealth: 5 }; }, cooldownDays: 6, tip: 'Add organic compost' },

            { id: 'weed', emoji: 'ðŸ§¹', label: 'Weed', effect: function () { return { weedCover: -30, pestPressure: -10 }; }, cooldownDays: 3, tip: 'Remove weeds' },

            { id: 'inspect', emoji: 'ðŸ”', label: 'Inspect', effect: function () { return { pestPressure: -5 }; }, cooldownDays: 2, tip: 'Check for pests' },

            { id: 'mulch', emoji: 'ðŸ‚', label: 'Mulch', effect: function () { return { weedCover: -15, moisture: 10 }; }, cooldownDays: 5, tip: 'Spread organic mulch' }

          ];



          // â”€â”€ Helper: apply effects dict â”€â”€

          function applyEffects(efx) {

            setLabToolData(function (prev) {

              var cp = Object.assign({}, prev.companionPlanting || {});

              Object.keys(efx).forEach(function (k) {

                var cur = typeof cp[k] === 'number' ? cp[k] : 0;

                cp[k] = Math.max(0, Math.min(100, cur + efx[k]));

              });

              return Object.assign({}, prev, { companionPlanting: cp });

            });

          }



          // â”€â”€ Perform action â”€â”€

          function doAction(actionDef) {

            var efx = actionDef.effect();

            applyEffects(efx);

            // Set cooldown

            var newCD = Object.assign({}, actionCooldowns);

            newCD[actionDef.id] = day + actionDef.cooldownDays;

            upd('actionCooldowns', newCD);

            awardStemXP('companion_action_' + actionDef.id, 5, actionDef.label + ' action');

            if (addToast) addToast(actionDef.emoji + ' ' + actionDef.label + '! ' + actionDef.tip, 'success');

          }



          // â”€â”€ Quiz data â”€â”€

          var quizzes = [

            { q: 'Which plant fixes atmospheric nitrogen into the soil?', opts: ['Corn', 'Beans', 'Squash'], correct: 'Beans', explain: 'Bean roots house Rhizobium bacteria that convert Nâ‚‚ gas into ammonia (NHâ‚ƒ), enriching the soil for all three plants.' },

            { q: 'What role do squash leaves play in the Three Sisters system?', opts: ['Structural support', 'Living mulch', 'Nitrogen fixation'], correct: 'Living mulch', explain: 'Squash\'s large leaves shade the soil, retaining moisture, cooling roots, and suppressing weed growth â€” acting as living mulch.' },

            { q: 'Why are beans planted around the corn stalks?', opts: ['For shade', 'To climb the stalks', 'For color'], correct: 'To climb the stalks', explain: 'Corn provides a natural trellis for bean vines to climb, replacing the need for artificial supports.' },

            { q: 'The milpa system originated approximately how many years ago?', opts: ['500 years', '2,000 years', '7,000+ years'], correct: '7,000+ years', explain: 'Archaeological evidence traces the milpa companion planting system to Mesoamerica over 7,000 years ago.' },

            { q: 'Corn and beans together provide a complete protein because:', opts: ['They taste good together', 'Their amino acid profiles complement each other', 'They grow at the same rate'], correct: 'Their amino acid profiles complement each other', explain: 'Corn is rich in methionine but low in lysine; beans are rich in lysine but low in methionine. Together they form a complete protein.' },

            { q: 'What organisms in bean root nodules actually fix nitrogen?', opts: ['Mycorrhizal fungi', 'Rhizobium bacteria', 'Earthworms'], correct: 'Rhizobium bacteria', explain: 'Rhizobium bacteria form a symbiotic relationship with legume roots, converting atmospheric Nâ‚‚ into plant-usable ammonia through nitrogenase enzyme.' },

            { q: 'How do prickly squash stems help the garden?', opts: ['They attract pollinators', 'They deter pests like raccoons and deer', 'They provide nutrients'], correct: 'They deter pests like raccoons and deer', explain: 'The spiny, prickly stems and vines of many squash varieties create a natural barrier that discourages animals from entering the garden.' },

            { q: 'What is the Haudenosaunee name for the Three Sisters?', opts: ['Milpa', 'De-oh-hÃ¡-ko', 'Teosinte'], correct: 'De-oh-hÃ¡-ko', explain: 'De-oh-hÃ¡-ko means "they sustain us" â€” the Haudenosaunee view the Three Sisters as inseparable spiritual beings, not merely crops.' }

          ];

          var currentQuiz = quizzes[quizQ % quizzes.length];



          // â”€â”€ Canvas Renderer â”€â”€

          var _lastGardenCanvas = null;

          var canvasRef = function (canvasEl) {

            if (!canvasEl) {

              if (_lastGardenCanvas && _lastGardenCanvas._gardenAnim) {

                cancelAnimationFrame(_lastGardenCanvas._gardenAnim);

                _lastGardenCanvas._gardenInit = false;

              }

              _lastGardenCanvas = null;

              return;

            }

            _lastGardenCanvas = canvasEl;

            if (canvasEl._gardenInit) return;

            canvasEl._gardenInit = true;

            var cW = canvasEl.width = canvasEl.offsetWidth * 2;

            var cH = canvasEl.height = canvasEl.offsetHeight * 2;

            var ctx = canvasEl.getContext('2d');

            var dpr = 2;

            var tick = 0;

            var _gt = growthTime;



            // Listen for growth updates via data attribute

            canvasEl.setAttribute('data-growth', growthTime);

            canvasEl.setAttribute('data-corn', cornPlanted ? '1' : '0');

            canvasEl.setAttribute('data-beans', beansPlanted ? '1' : '0');

            canvasEl.setAttribute('data-squash', squashPlanted ? '1' : '0');

            canvasEl.setAttribute('data-compare', compareMode ? '1' : '0');



            // Garden entities

            var particles = [];

            for (var pi = 0; pi < 40; pi++) {

              particles.push({ x: Math.random() * cW / dpr, y: Math.random() * cH * 0.3 / dpr, vx: (Math.random() - 0.5) * 0.3, vy: -0.1 - Math.random() * 0.2, life: Math.random() * 200, type: pi < 15 ? 'pollen' : pi < 25 ? 'butterfly' : 'n2' });

            }



            function drawMound(cx, cy, w, h, label, _corn, _beans, _squash, _growth, isMono) {

              var gt = _growth / 100;



              // â”€â”€ Underground soil layers â”€â”€

              // Subsoil

              ctx.fillStyle = '#8B6914';

              ctx.beginPath();

              ctx.ellipse(cx, cy + h * 0.7, w * 1.2, h * 0.5, 0, 0, Math.PI * 2);

              ctx.fill();

              // Topsoil / mound

              var moundGrad = ctx.createRadialGradient(cx, cy - h * 0.1, 0, cx, cy, w);

              moundGrad.addColorStop(0, '#5C4033');

              moundGrad.addColorStop(0.6, '#3E2723');

              moundGrad.addColorStop(1, '#2E1A0E');

              ctx.fillStyle = moundGrad;

              ctx.beginPath();

              ctx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);

              ctx.fill();

              // Topsoil highlights

              ctx.fillStyle = 'rgba(139,109,60,0.3)';

              ctx.beginPath();

              ctx.ellipse(cx - w * 0.2, cy - h * 0.3, w * 0.3, h * 0.2, -0.3, 0, Math.PI * 2);

              ctx.fill();



              // â”€â”€ Root systems underground â”€â”€

              if (_corn && gt > 0.1) {

                ctx.strokeStyle = 'rgba(255,235,180,0.25)';

                ctx.lineWidth = 1.5;

                for (var ri = 0; ri < 5; ri++) {

                  ctx.beginPath();

                  ctx.moveTo(cx, cy + h * 0.2);

                  var rx = cx + (ri - 2) * w * 0.15;

                  var ry = cy + h * (0.5 + gt * 0.4);

                  ctx.quadraticCurveTo(cx + (ri - 2) * w * 0.08, cy + h * 0.4, rx, ry);

                  ctx.stroke();

                }

              }

              // Bean root nodules (nitrogen-fixing!)

              if (_beans && gt > 0.2) {

                var noduleGlow = 0.3 + 0.4 * Math.sin(tick * 0.03);

                for (var ni = 0; ni < 6; ni++) {

                  var nx = cx + (Math.random() - 0.5) * w * 0.8;

                  var ny = cy + h * (0.3 + Math.random() * 0.4);

                  ctx.fillStyle = 'rgba(120,255,180,' + (noduleGlow * gt) + ')';

                  ctx.beginPath();

                  ctx.arc(nx, ny, 2 + gt * 3, 0, Math.PI * 2);

                  ctx.fill();

                  // Nâ‚‚ label near nodule

                  if (ni < 2 && gt > 0.5) {

                    ctx.fillStyle = 'rgba(100,255,160,' + (noduleGlow * 0.7) + ')';

                    ctx.font = (8 + gt * 4) + 'px monospace';

                    ctx.fillText('Nâ‚‚â†’NHâ‚ƒ', nx + 5, ny - 3);

                  }

                }

              }

              // â”€â”€ Mycorrhizal fungal network (connecting all root systems) â”€â”€

              if ((_corn && _beans || _corn && _squash || _beans && _squash) && gt > 0.25) {

                var netAlpha = Math.min(0.5, (gt - 0.25) * 0.8) * (0.5 + 0.5 * Math.sin(tick * 0.015));

                ctx.strokeStyle = 'rgba(180,140,255,' + netAlpha + ')';

                ctx.lineWidth = 0.8;

                // Draw branching fungal threads across the underground zone

                var netY0 = cy + h * 0.3;

                var netY1 = cy + h * 0.7;

                var netSpanX = w * 0.9;

                for (var fi = 0; fi < 8; fi++) {

                  var fx0 = cx - netSpanX * 0.5 + fi * netSpanX * 0.14;

                  var fy0 = netY0 + (fi % 3) * (netY1 - netY0) * 0.3;

                  var fx1 = fx0 + netSpanX * 0.18 + Math.sin(tick * 0.008 + fi) * 5;

                  var fy1 = fy0 + (netY1 - netY0) * 0.2 + Math.cos(tick * 0.01 + fi * 2) * 4;

                  ctx.beginPath();

                  ctx.moveTo(fx0, fy0);

                  ctx.bezierCurveTo(fx0 + 8, fy0 - 4, fx1 - 6, fy1 + 3, fx1, fy1);

                  ctx.stroke();

                  // Branch nodes (hyphal tips / arbuscules)

                  if (fi % 2 === 0) {

                    ctx.fillStyle = 'rgba(200,160,255,' + (netAlpha * 0.8) + ')';

                    ctx.beginPath(); ctx.arc(fx1, fy1, 1.5 + gt, 0, Math.PI * 2); ctx.fill();

                  }

                }

                // Nutrient transfer indicators (small dots flowing along threads)

                if (gt > 0.5) {

                  for (var nd = 0; nd < 4; nd++) {

                    var ndFrac = ((tick * 0.01 + nd * 0.25) % 1);

                    var ndX = cx - netSpanX * 0.4 + ndFrac * netSpanX * 0.8;

                    var ndY = netY0 + (netY1 - netY0) * 0.3 + Math.sin(ndFrac * Math.PI * 2 + nd) * 6;

                    ctx.fillStyle = 'rgba(255,215,100,' + (0.3 + 0.4 * Math.sin(tick * 0.04 + nd)) + ')';

                    ctx.beginPath(); ctx.arc(ndX, ndY, 1.8, 0, Math.PI * 2); ctx.fill();

                  }

                }

              }



              // â”€â”€ Corn stalks (enhanced with segments, leaf midribs, silk, husks) â”€â”€

              if (_corn) {

                var cornH = gt * h * 2.2;

                var sway = Math.sin(tick * 0.015) * 3 * gt;

                for (var ci = 0; ci < 3; ci++) {

                  var cornX = cx + (ci - 1) * w * 0.15;

                  // Stalk with segments

                  var segCount = Math.floor(3 + gt * 5);

                  for (var seg = 0; seg < segCount; seg++) {

                    var segFrac0 = seg / segCount;

                    var segFrac1 = (seg + 1) / segCount;

                    var sx0 = cornX + sway * segFrac0;

                    var sy0 = cy - h * 0.2 - cornH * segFrac0;

                    var sx1 = cornX + sway * segFrac1;

                    var sy1 = cy - h * 0.2 - cornH * segFrac1;

                    var segWidth = 3 + gt * 3 - seg * 0.3;

                    // Alternating segment shading for realism

                    ctx.strokeStyle = seg % 2 === 0 ? '#2E7D32' : '#388E3C';

                    ctx.lineWidth = Math.max(1.5, segWidth);

                    ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx1, sy1); ctx.stroke();

                    // Node joint ring

                    if (seg > 0 && seg < segCount - 1) {

                      ctx.beginPath();

                      ctx.arc(sx0, sy0, segWidth * 0.6, 0, Math.PI * 2);

                      ctx.fillStyle = 'rgba(27,94,32,0.4)';

                      ctx.fill();

                    }

                  }

                  // Corn leaves with midrib

                  if (gt > 0.3) {

                    for (var li = 0; li < 4; li++) {

                      var ly = cy - h * 0.2 - cornH * (0.25 + li * 0.2);

                      var leafSway = Math.sin(tick * 0.02 + li + ci) * 5;

                      var leafDir = (li % 2 === 0 ? 1 : -1);

                      var leafLen = 30 + gt * 10 - li * 3;

                      var leafTipX = cornX + sway * (0.25 + li * 0.2) + leafDir * leafLen + leafSway;

                      var leafTipY = ly + 8;

                      // Leaf blade

                      ctx.beginPath();

                      ctx.moveTo(cornX + sway * (0.25 + li * 0.2), ly);

                      ctx.quadraticCurveTo(

                        cornX + sway * (0.25 + li * 0.2) + leafDir * leafLen * 0.6 + leafSway * 0.5, ly - 6,

                        leafTipX, leafTipY

                      );

                      ctx.strokeStyle = '#43A047';

                      ctx.lineWidth = 2.5;

                      ctx.stroke();

                      // Fill leaf shape

                      ctx.beginPath();

                      ctx.moveTo(cornX + sway * (0.25 + li * 0.2), ly);

                      ctx.quadraticCurveTo(

                        cornX + sway * (0.25 + li * 0.2) + leafDir * leafLen * 0.6 + leafSway * 0.5, ly - 8,

                        leafTipX, leafTipY

                      );

                      ctx.quadraticCurveTo(

                        cornX + sway * (0.25 + li * 0.2) + leafDir * leafLen * 0.5 + leafSway * 0.3, ly + 3,

                        cornX + sway * (0.25 + li * 0.2), ly

                      );

                      ctx.fillStyle = 'rgba(76,175,80,' + (0.3 + gt * 0.2) + ')';

                      ctx.fill();

                      // Midrib line

                      ctx.beginPath();

                      ctx.moveTo(cornX + sway * (0.25 + li * 0.2), ly);

                      ctx.lineTo(leafTipX, leafTipY);

                      ctx.strokeStyle = 'rgba(27,94,32,0.4)';

                      ctx.lineWidth = 0.8;

                      ctx.stroke();

                    }

                  }

                  // Corn tassels with silk threads

                  if (gt > 0.7) {

                    var tasselBase = cy - h * 0.2 - cornH;

                    ctx.fillStyle = '#FDD835';

                    for (var ti = 0; ti < 5; ti++) {

                      var tAngle = (ti / 5) * Math.PI - Math.PI * 0.5;

                      var tLen = 6 + gt * 4;

                      ctx.beginPath();

                      ctx.moveTo(cornX + sway * 1.3, tasselBase);

                      ctx.lineTo(cornX + sway * 1.3 + Math.cos(tAngle) * tLen, tasselBase - Math.abs(Math.sin(tAngle)) * tLen * 0.8);

                      ctx.strokeStyle = '#FDD835';

                      ctx.lineWidth = 1.2;

                      ctx.stroke();

                      // Pollen dots at tips

                      ctx.beginPath();

                      ctx.arc(cornX + sway * 1.3 + Math.cos(tAngle) * tLen, tasselBase - Math.abs(Math.sin(tAngle)) * tLen * 0.8, 1.5, 0, Math.PI * 2);

                      ctx.fill();

                    }

                  }

                  // Corn ears with husk detail

                  if (gt > 0.6) {

                    var earY = cy - h * 0.2 - cornH * 0.55;

                    var earX = cornX + sway * 0.5 + 8;

                    // Husk (outer layers)

                    ctx.beginPath();

                    ctx.ellipse(earX - 1, earY, 6 + gt * 2, 10 + gt * 5, 0.3, 0, Math.PI * 2);

                    ctx.fillStyle = '#8BC34A';

                    ctx.fill();

                    // Ear (inner yellow)

                    ctx.beginPath();

                    ctx.ellipse(earX, earY, 4, 8 + gt * 4, 0.3, 0, Math.PI * 2);

                    ctx.fillStyle = '#FFB300';

                    ctx.fill();

                    // Kernel rows

                    ctx.beginPath();

                    ctx.ellipse(earX, earY, 3, 6 + gt * 3, 0.3, 0, Math.PI * 2);

                    ctx.fillStyle = '#C8B900';

                    ctx.fill();

                    // Silk threads emerging from top of ear

                    if (gt > 0.75) {

                      for (var si2 = 0; si2 < 4; si2++) {

                        ctx.beginPath();

                        ctx.moveTo(earX, earY - 8 - gt * 4);

                        ctx.quadraticCurveTo(

                          earX + (si2 - 1.5) * 4 + Math.sin(tick * 0.03 + si2) * 2,

                          earY - 12 - gt * 6,

                          earX + (si2 - 1.5) * 6 + Math.sin(tick * 0.02 + si2) * 3,

                          earY - 16 - gt * 5

                        );

                        ctx.strokeStyle = 'rgba(255,235,180,0.6)';

                        ctx.lineWidth = 0.6;

                        ctx.stroke();

                      }

                    }

                  }

                }

              }



              // â”€â”€ Bean vines climbing corn â”€â”€

              if (_beans && _corn) {

                var beanH = gt * h * 1.8;

                for (var bi = 0; bi < 2; bi++) {

                  var bx = cx + (bi === 0 ? -1 : 1) * w * 0.12;

                  var bSway = Math.sin(tick * 0.02 + bi * 2) * 4;

                  ctx.strokeStyle = '#1B5E20';

                  ctx.lineWidth = 1.5 + gt;

                  ctx.beginPath();

                  ctx.moveTo(bx, cy - h * 0.1);

                  // Spiral up corn stalk

                  for (var bsi = 0; bsi < 10; bsi++) {

                    var bsy = cy - h * 0.1 - beanH * bsi / 10;

                    var bsx = bx + Math.sin(bsi * 0.8 + tick * 0.01) * (6 + gt * 4) + bSway * (bsi / 10);

                    ctx.lineTo(bsx, bsy);

                  }

                  ctx.stroke();

                  // Bean pods

                  if (gt > 0.5) {

                    ctx.fillStyle = '#4CAF50';

                    for (var bpi = 0; bpi < 3; bpi++) {

                      var bpy = cy - h * 0.1 - beanH * (0.3 + bpi * 0.2);

                      var bpx = bx + Math.sin(bpi * 0.8 + tick * 0.01) * (6 + gt * 4) + bSway * (bpi * 0.3 / 3) + 6;

                      ctx.beginPath();

                      ctx.ellipse(bpx, bpy, 2, 5 + gt * 3, 0.5, 0, Math.PI * 2);

                      ctx.fill();

                    }

                  }

                }

              } else if (_beans && !_corn) {

                // Beans without corn â€” sprawling on ground

                ctx.strokeStyle = '#1B5E20';

                ctx.lineWidth = 1.5;

                for (var bgi = 0; bgi < 4; bgi++) {

                  ctx.beginPath();

                  ctx.moveTo(cx, cy - h * 0.1);

                  ctx.quadraticCurveTo(cx + (bgi - 1.5) * w * 0.3, cy - h * 0.15 - gt * 15, cx + (bgi - 1.5) * w * 0.5, cy - h * 0.05);

                  ctx.stroke();

                }

              }



              // â”€â”€ Squash vines & leaves (enhanced with multi-lobed leaves, cross-veins, flowers, ribbed fruit) â”€â”€

              if (_squash) {

                var sqSpread = gt * w * 1.3;

                for (var si = 0; si < 5; si++) {

                  var angle = (si / 5) * Math.PI * 2 - Math.PI * 0.5;

                  var sqx = cx + Math.cos(angle) * sqSpread * (0.5 + si * 0.12);

                  var sqy = cy + Math.sin(angle) * h * 0.3 * gt + h * 0.1;

                  var vineSway = Math.sin(tick * 0.01 + si) * 3;

                  // Vine with tapered width

                  ctx.strokeStyle = '#2E7D32';

                  ctx.lineWidth = 2 + gt * 2;

                  ctx.beginPath();

                  ctx.moveTo(cx, cy);

                  ctx.quadraticCurveTo(cx + (sqx - cx) * 0.5 + vineSway, sqy - 10, sqx, sqy);

                  ctx.stroke();

                  // Tendrils along vine

                  if (gt > 0.3) {

                    var midVX = cx + (sqx - cx) * 0.5 + vineSway;

                    var midVY = sqy - 10;

                    ctx.strokeStyle = 'rgba(46,125,50,0.5)';

                    ctx.lineWidth = 0.8;

                    for (var tn = 0; tn < 2; tn++) {

                      var tnX = midVX + (tn === 0 ? -8 : 8);

                      var tnY = midVY + tn * 5;

                      ctx.beginPath(); ctx.moveTo(midVX + (sqx - cx) * 0.1 * tn, midVY + tn * 3);

                      ctx.bezierCurveTo(tnX, tnY - 6, tnX + (tn === 0 ? -4 : 4), tnY - 8, tnX + (tn === 0 ? -2 : 2), tnY - 3);

                      ctx.stroke();

                    }

                  }

                  // Multi-lobed squash leaves

                  if (gt > 0.2) {

                    var leafSize = 8 + gt * 18;

                    var leafAlpha = 0.6 + gt * 0.3;

                    // Draw 5-lobed leaf shape

                    ctx.save();

                    ctx.translate(sqx + vineSway, sqy);

                    ctx.rotate(angle + Math.sin(tick * 0.01) * 0.1);

                    // Main leaf body

                    ctx.beginPath();

                    for (var lobe = 0; lobe < 5; lobe++) {

                      var lobeAngle = (lobe / 5) * Math.PI * 2 - Math.PI / 2;

                      var lobeR = leafSize * (lobe % 2 === 0 ? 1 : 0.7);

                      if (lobe === 0) {

                        ctx.moveTo(Math.cos(lobeAngle) * lobeR, Math.sin(lobeAngle) * lobeR * 0.6);

                      } else {

                        ctx.quadraticCurveTo(

                          Math.cos(lobeAngle - 0.3) * leafSize * 0.4,

                          Math.sin(lobeAngle - 0.3) * leafSize * 0.35,

                          Math.cos(lobeAngle) * lobeR,

                          Math.sin(lobeAngle) * lobeR * 0.6

                        );

                      }

                    }

                    ctx.closePath();

                    ctx.fillStyle = 'rgba(76,175,80,' + leafAlpha + ')';

                    ctx.fill();

                    ctx.strokeStyle = 'rgba(46,125,50,0.4)';

                    ctx.lineWidth = 0.6;

                    ctx.stroke();

                    // Central vein + cross veins

                    ctx.strokeStyle = 'rgba(27,94,32,0.35)';

                    ctx.lineWidth = 0.8;

                    ctx.beginPath(); ctx.moveTo(-leafSize * 0.6, 0); ctx.lineTo(leafSize * 0.6, 0); ctx.stroke();

                    ctx.beginPath(); ctx.moveTo(0, -leafSize * 0.4); ctx.lineTo(0, leafSize * 0.4); ctx.stroke();

                    // Cross veins

                    for (var cv = 0; cv < 3; cv++) {

                      var cvX = (-0.4 + cv * 0.4) * leafSize;

                      ctx.beginPath();

                      ctx.moveTo(cvX, -leafSize * 0.25); ctx.lineTo(cvX + 2, leafSize * 0.25);

                      ctx.strokeStyle = 'rgba(27,94,32,0.2)'; ctx.lineWidth = 0.5; ctx.stroke();

                    }

                    ctx.restore();

                  }

                  // Squash flower buds (before fruit)

                  if (gt > 0.4 && gt < 0.7 && si < 3) {

                    var flX = sqx + vineSway + 6;

                    var flY = sqy - 3;

                    ctx.beginPath();

                    for (var petal = 0; petal < 5; petal++) {

                      var petalAngle = (petal / 5) * Math.PI * 2;

                      var petalR = 4 + gt * 3;

                      ctx.ellipse(

                        flX + Math.cos(petalAngle) * petalR * 0.5,

                        flY + Math.sin(petalAngle) * petalR * 0.5,

                        petalR * 0.4, petalR * 0.25, petalAngle, 0, Math.PI * 2

                      );

                    }

                    ctx.fillStyle = 'rgba(255,193,7,0.7)';

                    ctx.fill();

                    // Flower center

                    ctx.beginPath(); ctx.arc(flX, flY, 2, 0, Math.PI * 2);

                    ctx.fillStyle = 'rgba(255,152,0,0.8)'; ctx.fill();

                  }

                  // Squash fruits with ribs

                  if (gt > 0.65 && si < 3) {

                    var frX = sqx + 5;

                    var frY = sqy + 3;

                    var frW = 6 + gt * 5;

                    var frH = 4 + gt * 3;

                    ctx.fillStyle = si === 0 ? '#FF8F00' : si === 1 ? '#F9A825' : '#FFB300';

                    ctx.beginPath();

                    ctx.ellipse(frX, frY, frW, frH, 0.2, 0, Math.PI * 2);

                    ctx.fill();

                    // Ribs

                    ctx.strokeStyle = 'rgba(0,0,0,0.12)';

                    ctx.lineWidth = 0.6;

                    for (var rib = 0; rib < 4; rib++) {

                      ctx.beginPath();

                      var ribAngle = (rib / 4) * Math.PI;

                      ctx.ellipse(frX, frY, frW * 0.95, frH * 0.3, 0.2 + ribAngle * 0.15, 0, Math.PI * 2);

                      ctx.stroke();

                    }

                    // Shadow

                    ctx.fillStyle = 'rgba(0,0,0,0.1)';

                    ctx.beginPath();

                    ctx.ellipse(frX + 2, frY + frH * 0.7, frW * 0.8, frH * 0.3, 0.2, 0, Math.PI * 2);

                    ctx.fill();

                    // Stem nub

                    ctx.fillStyle = '#558B2F';

                    ctx.beginPath(); ctx.arc(frX - frW + 2, frY - 1, 2, 0, Math.PI * 2); ctx.fill();

                  }

                }

                // Shade coverage indicator

                if (gt > 0.3) {

                  ctx.fillStyle = 'rgba(76,175,80,0.08)';

                  ctx.beginPath();

                  ctx.ellipse(cx, cy + h * 0.1, sqSpread * 1.1, h * 0.5, 0, 0, Math.PI * 2);

                  ctx.fill();

                }

              }



              // â”€â”€ Earthworms in soil â”€â”€

              if (gt > 0.15) {

                for (var wi = 0; wi < 3; wi++) {

                  var wormX = cx + (wi - 1) * w * 0.35;

                  var wormY = cy + h * (0.25 + wi * 0.15);

                  var wormPhase = tick * 0.03 + wi * 2;

                  var wormAlpha = 0.3 + gt * 0.3;

                  ctx.strokeStyle = 'rgba(205,133,110,' + wormAlpha + ')';

                  ctx.lineWidth = 2;

                  ctx.lineCap = 'round';

                  ctx.beginPath();

                  ctx.moveTo(wormX, wormY);

                  for (var ws = 1; ws <= 6; ws++) {

                    ctx.lineTo(

                      wormX + ws * 4 + Math.sin(wormPhase + ws * 0.8) * 3,

                      wormY + Math.cos(wormPhase + ws * 0.6) * 2

                    );

                  }

                  ctx.stroke();

                  // Worm head

                  ctx.fillStyle = 'rgba(180,110,90,' + wormAlpha + ')';

                  ctx.beginPath();

                  ctx.arc(wormX + 24 + Math.sin(wormPhase + 4.8) * 3, wormY + Math.cos(wormPhase + 3.6) * 2, 2, 0, Math.PI * 2);

                  ctx.fill();

                }

              }



              // Mound label

              if (label) {

                ctx.fillStyle = 'rgba(255,255,255,0.85)';

                ctx.font = 'bold ' + 11 + 'px system-ui';

                ctx.textAlign = 'center';

                ctx.fillText(label, cx, cy + h + 16);

              }

            }



            function draw() {

              tick++;

              // Read data attrs for latest state

              _gt = parseFloat(canvasEl.getAttribute('data-growth') || '0');

              var _corn = canvasEl.getAttribute('data-corn') === '1';

              var _beans = canvasEl.getAttribute('data-beans') === '1';

              var _squash = canvasEl.getAttribute('data-squash') === '1';

              var _compare = canvasEl.getAttribute('data-compare') === '1';

              var _season = parseInt(canvasEl.getAttribute('data-season') || '0', 10);

              var _dayNum = parseInt(canvasEl.getAttribute('data-day') || '0', 10);

              var _moistLvl = parseInt(canvasEl.getAttribute('data-moisture') || '60', 10);

              var _pestLvl = parseInt(canvasEl.getAttribute('data-pest') || '0', 10);

              var _weedLvl = parseInt(canvasEl.getAttribute('data-weed') || '0', 10);

              var _healthLvl = parseInt(canvasEl.getAttribute('data-health') || '100', 10);



              ctx.clearRect(0, 0, cW, cH);



              // â”€â”€ Season-aware Sky â”€â”€

              var dayPhase = (Math.sin(tick * 0.003) + 1) / 2;

              var seasonSkies = [

                { topH: 170, topS: 65, topL: 65, botH: 90, botS: 45, botL: 80 },   // spring â€” fresh blue-green

                { topH: 210, topS: 70, topL: 60, botH: 40, botS: 55, botL: 82 },   // summer â€” deep blue

                { topH: 220, topS: 35, topL: 50, botH: 25, botS: 60, botL: 70 },   // autumn â€” muted orange

                { topH: 215, topS: 25, topL: 40, botH: 220, botS: 15, botL: 65 }   // winter â€” gray-blue

              ];

              var ssky = seasonSkies[_season];

              var skyGrad = ctx.createLinearGradient(0, 0, 0, cH * 0.45);

              skyGrad.addColorStop(0, 'hsl(' + ssky.topH + ',' + Math.round(ssky.topS + dayPhase * 10) + '%,' + Math.round(ssky.topL + dayPhase * 10) + '%)');

              skyGrad.addColorStop(1, 'hsl(' + ssky.botH + ',' + Math.round(ssky.botS + dayPhase * 15) + '%,' + Math.round(ssky.botL + dayPhase * 8) + '%)');

              ctx.fillStyle = skyGrad;

              ctx.fillRect(0, 0, cW, cH * 0.45);



              // Sun (smaller in winter, bigger in summer)

              var sunSize = _season === 1 ? 18 : _season === 3 ? 10 : 14;

              var sunX = cW * 0.15 + cW * 0.7 * dayPhase;

              var sunY = cH * 0.05 + Math.sin(dayPhase * Math.PI) * cH * -0.12 + cH * 0.15;

              var sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunSize * 3);

              sunGlow.addColorStop(0, _season === 3 ? 'rgba(200,210,230,0.7)' : 'rgba(255,235,59,0.9)');

              sunGlow.addColorStop(0.5, _season === 3 ? 'rgba(180,195,220,0.2)' : 'rgba(255,193,7,0.3)');

              sunGlow.addColorStop(1, 'rgba(255,193,7,0)');

              ctx.fillStyle = sunGlow;

              ctx.fillRect(sunX - sunSize * 4, sunY - sunSize * 4, sunSize * 8, sunSize * 8);

              ctx.fillStyle = _season === 3 ? '#B0BEC5' : '#FDD835';

              ctx.beginPath(); ctx.arc(sunX, sunY, sunSize, 0, Math.PI * 2); ctx.fill();



              // Snowflakes in winter

              if (_season === 3) {

                ctx.fillStyle = 'rgba(255,255,255,0.7)';

                for (var sfi = 0; sfi < 20; sfi++) {

                  var sfx = ((tick * 0.5 + sfi * 53) % cW);

                  var sfy = ((tick * 0.8 + sfi * 97) % (cH * 0.45));

                  ctx.beginPath();

                  ctx.arc(sfx, sfy, 1.5, 0, Math.PI * 2);

                  ctx.fill();

                }

              }



              // Clouds

              ctx.fillStyle = _season === 3 ? 'rgba(200,210,230,0.7)' : 'rgba(255,255,255,0.6)';

              for (var cli = 0; cli < 4; cli++) {

                var clx = ((tick * 0.15 + cli * cW / 4) % (cW + 80)) - 40;

                var cly = cH * (0.05 + cli * 0.06);

                ctx.beginPath();

                ctx.ellipse(clx, cly, 30 + cli * 8, 10 + cli * 3, 0, 0, Math.PI * 2);

                ctx.fill();

                ctx.beginPath();

                ctx.ellipse(clx + 20, cly - 5, 20 + cli * 5, 8 + cli * 2, 0, 0, Math.PI * 2);

                ctx.fill();

              }



              // â”€â”€ Ground (season-tinted) â”€â”€

              var groundColors = [

                ['#7CB342', '#558B2F', '#33691E'],  // spring

                ['#8BC34A', '#689F38', '#33691E'],  // summer

                ['#A1887F', '#795548', '#4E342E'],  // autumn

                ['#B0BEC5', '#78909C', '#546E7A']   // winter

              ];

              var gc = groundColors[_season];

              var groundGrad = ctx.createLinearGradient(0, cH * 0.4, 0, cH);

              groundGrad.addColorStop(0, gc[0]);

              groundGrad.addColorStop(0.3, gc[1]);

              groundGrad.addColorStop(1, gc[2]);

              ctx.fillStyle = groundGrad;

              ctx.fillRect(0, cH * 0.4, cW, cH * 0.6);



              // Grass blades (brown in autumn/winter)

              for (var gi = 0; gi < 60; gi++) {

                var gx = (gi / 60) * cW;

                var gy = cH * 0.4 + 2;

                var gSway = Math.sin(tick * 0.015 + gi * 0.5) * 3;

                ctx.strokeStyle = _season >= 2 ? 'rgba(161,136,127,0.4)' : 'rgba(104,159,56,0.5)';

                ctx.lineWidth = 1;

                ctx.beginPath();

                ctx.moveTo(gx, gy);

                ctx.lineTo(gx + gSway, gy - 6 - Math.random() * 6);

                ctx.stroke();

              }



              // â”€â”€ Draw garden mound(s) â”€â”€

              if (_compare) {

                // Split view

                drawMound(cW * 0.27, cH * 0.55, 70, 25, 'Three Sisters (Milpa)', _corn, _beans, _squash, _gt, false);

                drawMound(cW * 0.73, cH * 0.55, 70, 25, 'Monoculture Corn', true, false, false, _gt, true);



                // Divider

                ctx.strokeStyle = 'rgba(255,255,255,0.3)';

                ctx.setLineDash([6, 4]);

                ctx.lineWidth = 1;

                ctx.beginPath();

                ctx.moveTo(cW / 2, cH * 0.1);

                ctx.lineTo(cW / 2, cH * 0.95);

                ctx.stroke();

                ctx.setLineDash([]);



                // Labels

                ctx.fillStyle = 'rgba(255,255,255,0.7)';

                ctx.font = 'bold 10px system-ui';

                ctx.textAlign = 'center';

                ctx.fillText('COMPANION PLANTING', cW * 0.27, cH * 0.92);

                ctx.fillText('MONOCULTURE', cW * 0.73, cH * 0.92);

              } else {

                drawMound(cW * 0.5, cH * 0.58, 100, 35, '', _corn, _beans, _squash, _gt, false);

              }



              // â”€â”€ Floating particles (pollen, pollinators, Nâ‚‚ symbols) â”€â”€

              particles.forEach(function (p) {

                p.life++;

                p.x += p.vx + Math.sin(tick * 0.01 + p.life * 0.1) * 0.2;

                p.y += p.vy;

                if (p.y < -10 || p.life > 250) { p.y = cH * 0.35 / dpr; p.x = Math.random() * cW / dpr; p.life = 0; }

                var pAlpha = Math.min(1, p.life / 30) * (1 - Math.max(0, p.life - 200) / 50);

                if (p.type === 'pollen' && _gt > 50) {

                  // Pollen with glow

                  ctx.fillStyle = 'rgba(255,235,59,' + (pAlpha * 0.5) + ')';

                  ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fill();

                  // Pollen glow halo

                  ctx.fillStyle = 'rgba(255,235,59,' + (pAlpha * 0.15) + ')';

                  ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();

                } else if (p.type === 'butterfly' && _gt > 30) {

                  // Enhanced butterfly with detailed wings

                  var wingFlap = Math.sin(tick * 0.08 + p.life) * 0.5;

                  var bfSize = 3.5;

                  ctx.save();

                  ctx.translate(p.x, p.y);

                  // Left upper wing

                  ctx.beginPath();

                  ctx.ellipse(-bfSize * 0.7, -bfSize * 0.15, bfSize * 0.9 * (0.5 + wingFlap * 0.5), bfSize * 0.55, -0.2, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(255,152,0,' + (pAlpha * 0.7) + ')';

                  ctx.fill();

                  // Right upper wing

                  ctx.beginPath();

                  ctx.ellipse(bfSize * 0.7, -bfSize * 0.15, bfSize * 0.9 * (0.5 + wingFlap * 0.5), bfSize * 0.55, 0.2, 0, Math.PI * 2);

                  ctx.fill();

                  // Left lower wing (smaller)

                  ctx.beginPath();

                  ctx.ellipse(-bfSize * 0.5, bfSize * 0.25, bfSize * 0.55 * (0.5 + wingFlap * 0.5), bfSize * 0.35, -0.3, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(255,183,77,' + (pAlpha * 0.6) + ')';

                  ctx.fill();

                  // Right lower wing

                  ctx.beginPath();

                  ctx.ellipse(bfSize * 0.5, bfSize * 0.25, bfSize * 0.55 * (0.5 + wingFlap * 0.5), bfSize * 0.35, 0.3, 0, Math.PI * 2);

                  ctx.fill();

                  // Wing pattern spots

                  ctx.fillStyle = 'rgba(230,100,0,' + (pAlpha * 0.4) + ')';

                  ctx.beginPath(); ctx.arc(-bfSize * 0.6, -bfSize * 0.1, bfSize * 0.2, 0, Math.PI * 2); ctx.fill();

                  ctx.beginPath(); ctx.arc(bfSize * 0.6, -bfSize * 0.1, bfSize * 0.2, 0, Math.PI * 2); ctx.fill();

                  // Body

                  ctx.beginPath();

                  ctx.ellipse(0, 0, bfSize * 0.08, bfSize * 0.45, 0, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(40,40,40,' + pAlpha + ')';

                  ctx.fill();

                  // Head

                  ctx.beginPath(); ctx.arc(0, -bfSize * 0.42, bfSize * 0.1, 0, Math.PI * 2);

                  ctx.fill();

                  // Antennae

                  ctx.strokeStyle = 'rgba(40,40,40,' + (pAlpha * 0.6) + ')';

                  ctx.lineWidth = 0.5;

                  ctx.beginPath(); ctx.moveTo(0, -bfSize * 0.5); ctx.lineTo(-bfSize * 0.3, -bfSize * 0.75); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(0, -bfSize * 0.5); ctx.lineTo(bfSize * 0.3, -bfSize * 0.75); ctx.stroke();

                  // Antenna bulbs

                  ctx.fillStyle = 'rgba(40,40,40,' + (pAlpha * 0.5) + ')';

                  ctx.beginPath(); ctx.arc(-bfSize * 0.3, -bfSize * 0.75, 0.6, 0, Math.PI * 2); ctx.fill();

                  ctx.beginPath(); ctx.arc(bfSize * 0.3, -bfSize * 0.75, 0.6, 0, Math.PI * 2); ctx.fill();

                  ctx.restore();

                } else if (p.type === 'n2' && _beans && _gt > 20) {

                  ctx.fillStyle = 'rgba(130,230,170,' + (pAlpha * 0.4) + ')';

                  ctx.font = '8px monospace';

                  ctx.fillText('Nâ‚‚', p.x, p.y);

                }

              });



              // â”€â”€ Rain effect (moisture indicator when squash is planted) â”€â”€

              if (_squash && _gt > 10) {

                var rainIntensity = Math.min(1, _gt / 60);

                var rainCount = Math.floor(12 * rainIntensity);

                ctx.strokeStyle = 'rgba(100,180,255,' + (0.15 + rainIntensity * 0.2) + ')';

                ctx.lineWidth = 1;

                for (var ri = 0; ri < rainCount; ri++) {

                  var rx = ((tick * 2 + ri * 73) % cW);

                  var ryStart = ((tick * 3 + ri * 137) % (cH * 0.4));

                  var ryLen = 6 + rainIntensity * 8;

                  ctx.beginPath();

                  ctx.moveTo(rx, ryStart);

                  ctx.lineTo(rx - 1, ryStart + ryLen);

                  ctx.stroke();

                  // Splash at ground level

                  if (ryStart + ryLen > cH * 0.38) {

                    ctx.fillStyle = 'rgba(100,180,255,' + (0.1 + rainIntensity * 0.15) + ')';

                    ctx.beginPath();

                    ctx.arc(rx, cH * 0.4, 2, 0, Math.PI * 2);

                    ctx.fill();

                  }

                }

              }



              // â”€â”€ Pest swarm overlay â”€â”€

              if (_pestLvl > 40) {

                var pestAlpha = Math.min(0.6, (_pestLvl - 40) / 100);

                ctx.fillStyle = 'rgba(180,50,30,' + pestAlpha + ')';

                for (var pi2 = 0; pi2 < Math.floor(_pestLvl / 8); pi2++) {

                  var px = ((tick * 1.5 + pi2 * 67) % cW);

                  var py = ((tick * 0.8 + pi2 * 89) % (cH * 0.35)) + cH * 0.1;

                  ctx.beginPath();

                  ctx.arc(px, py, 2 + Math.sin(tick * 0.05 + pi2) * 1, 0, Math.PI * 2);

                  ctx.fill();

                }

              }



              // â”€â”€ Weed overlay â”€â”€

              if (_weedLvl > 30) {

                var weedAlpha = Math.min(0.5, (_weedLvl - 30) / 140);

                ctx.strokeStyle = 'rgba(60,120,40,' + weedAlpha + ')';

                ctx.lineWidth = 1.5;

                for (var wi2 = 0; wi2 < Math.floor(_weedLvl / 10); wi2++) {

                  var wx = ((wi2 * 83 + 30) % cW);

                  var wy = cH * 0.42;

                  var wSway = Math.sin(tick * 0.02 + wi2) * 4;

                  ctx.beginPath();

                  ctx.moveTo(wx, wy);

                  ctx.quadraticCurveTo(wx + wSway, wy - 12, wx + wSway * 1.5, wy - 18 - wi2 % 4 * 3);

                  ctx.stroke();

                }

              }



              // â”€â”€ Wilting tint (low moisture) â”€â”€

              if (_moistLvl < 25 && (_corn || _beans || _squash)) {

                ctx.fillStyle = 'rgba(180,150,50,' + (0.05 + (25 - _moistLvl) / 100) + ')';

                ctx.fillRect(0, cH * 0.1, cW, cH * 0.35);

              }



              // â”€â”€ Day / Season HUD â”€â”€

              if (_corn || _beans || _squash) {

                var seasonNames = ['ðŸŒ± Spring', 'â˜€ï¸ Summer', 'ðŸ‚ Autumn', 'â„ï¸ Winter'];

                var hudText = seasonNames[_season] + '  Day ' + (_dayNum % 30 + 1) + '/30';

                ctx.save();

                ctx.fillStyle = 'rgba(0,0,0,0.55)';

                var hudW = 150, hudH = 24;

                var hudX = 6, hudY = 6;

                ctx.beginPath();

                ctx.roundRect(hudX, hudY, hudW, hudH, 6);

                ctx.fill();

                ctx.fillStyle = '#fff';

                ctx.font = 'bold 11px system-ui';

                ctx.textAlign = 'left';

                ctx.fillText(hudText, hudX + 8, hudY + 16);

                ctx.restore();

              }



              // â”€â”€ Seasonal Transition Animation â”€â”€

              var _dayInSeason = _dayNum % 30;

              if (_dayInSeason < 2 && _dayNum > 1 && (_corn || _beans || _squash)) {

                var _transAlpha = Math.max(0, (2 - _dayInSeason) / 2) * (0.3 + 0.25 * Math.sin(tick * 0.04));

                var _seasonOverlays = [

                  { color: 'rgba(100,200,100,', emoji: 'ðŸŒ±', name: 'Spring' },

                  { color: 'rgba(255,200,50,', emoji: 'â˜€ï¸', name: 'Summer' },

                  { color: 'rgba(180,120,50,', emoji: 'ðŸ‚', name: 'Autumn' },

                  { color: 'rgba(180,200,230,', emoji: 'â„ï¸', name: 'Winter' }

                ];

                var _so = _seasonOverlays[_season];

                ctx.fillStyle = _so.color + _transAlpha + ')';

                ctx.fillRect(0, 0, cW, cH);

                // Banner

                var _bannerAlpha = Math.max(0, (2 - _dayInSeason) / 2) * (0.6 + 0.3 * Math.sin(tick * 0.06));

                ctx.save();

                ctx.fillStyle = 'rgba(0,0,0,' + (_bannerAlpha * 0.6) + ')';

                var _bannerH = 50;

                var _bannerY = cH / 2 - _bannerH / 2;

                ctx.fillRect(0, _bannerY, cW, _bannerH);

                ctx.fillStyle = 'rgba(255,255,255,' + _bannerAlpha + ')';

                ctx.font = 'bold 20px system-ui';

                ctx.textAlign = 'center';

                ctx.textBaseline = 'middle';

                ctx.fillText(_so.emoji + ' ' + _so.name + ' has arrived!', cW / 2, cH / 2);

                ctx.restore();

                // Particles burst (seasonal)

                for (var _tp = 0; _tp < 8; _tp++) {

                  var _tpx = Math.random() * cW;

                  var _tpy = Math.random() * cH * 0.4;

                  var _tpSize = 2 + Math.random() * 3;

                  var _tpAlpha2 = _transAlpha * (0.3 + Math.random() * 0.4);

                  if (_season === 0) { ctx.fillStyle = 'rgba(100,220,100,' + _tpAlpha2 + ')'; } // green buds

                  else if (_season === 1) { ctx.fillStyle = 'rgba(255,220,50,' + _tpAlpha2 + ')'; } // sun sparkles

                  else if (_season === 2) { ctx.fillStyle = 'rgba(200,120,40,' + _tpAlpha2 + ')'; } // falling leaves

                  else { ctx.fillStyle = 'rgba(240,240,255,' + _tpAlpha2 + ')'; } // snowflakes

                  ctx.beginPath(); ctx.arc(_tpx, _tpy, _tpSize, 0, Math.PI * 2); ctx.fill();

                }

              }



              canvasEl._gardenAnim = requestAnimationFrame(draw);

            }

            canvasEl._gardenAnim = requestAnimationFrame(draw);

          };



          // NOTE: Companion Planting hooks (canvas sync + day ticker) have been hoisted

          // to top level of StemLabModal to satisfy React Rules of Hooks.

          // See the top-level hooks near the Synth Keyboard Hook.



          // â”€â”€ Gauge helper (inline colors to avoid Tailwind JIT purge) â”€â”€

          var _gaugeColors = {

            emerald: { light: '#34d399', dark: '#059669', text: '#047857' },

            blue: { light: '#60a5fa', dark: '#2563eb', text: '#1d4ed8' },

            orange: { light: '#fb923c', dark: '#ea580c', text: '#c2410c' },

            red: { light: '#f87171', dark: '#dc2626', text: '#b91c1c' }

          };

          function gauge(label, value, color, icon, unit) {

            var c = _gaugeColors[color] || _gaugeColors.emerald;

            return React.createElement("div", { className: "flex items-center gap-2" },

              React.createElement("span", { className: "text-sm w-5 text-center" }, icon),

              React.createElement("div", { className: "flex-1" },

                React.createElement("div", { className: "flex justify-between mb-0.5" },

                  React.createElement("span", { className: "text-[10px] font-bold text-slate-600" }, label),

                  React.createElement("span", { className: "text-[10px] font-bold", style: { color: c.text } }, Math.round(value) + (unit || '%'))

                ),

                React.createElement("div", { className: "w-full h-2 bg-slate-200 rounded-full overflow-hidden" },

                  React.createElement("div", { className: "h-full rounded-full transition-all duration-500", style: { width: Math.round(value) + '%', background: 'linear-gradient(to right, ' + c.light + ', ' + c.dark + ')' } })

                )

              )

            );

          }



          return React.createElement("div", { className: "space-y-4 animate-in fade-in duration-200" },

            // â”€â”€ Tutorial â”€â”€

            renderTutorial('companionPlanting', _tutCompanionPlanting),



            // â”€â”€ Header â”€â”€

            React.createElement("div", { className: "flex items-center justify-between" },

              React.createElement("div", { className: "flex items-center gap-3" },

                React.createElement("button", {

                  onClick: function () { setStemLabTool(null); },

                  className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors", "aria-label": "Back to tools"

                }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

                React.createElement("div", null,

                  React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "ðŸŒ± Companion Planting Lab"),

                  React.createElement("p", { className: "text-xs text-slate-400" }, "The milpa / Three Sisters â€” 7,000+ years of agricultural science")

                )

              ),

              React.createElement("div", { className: "flex items-center gap-2" },

                React.createElement("button", {

                  onClick: function () { upd('showCulture', !showCulture); },

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (showCulture ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-amber-50'),

                  "aria-label": "Cultural context"

                }, "ðŸ“œ Origins"),

                React.createElement("button", {

                  onClick: function () { upd('compareMode', !compareMode); },

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (compareMode ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-100 text-slate-600 hover:bg-blue-50')

                }, "ðŸ”¬ Compare"),

                React.createElement("button", {

                  onClick: function () { upd('showSoilDetail', !showSoilDetail); },

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (showSoilDetail ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50')

                }, "ðŸ§ª Soil Science")

              )

            ),



            // â”€â”€ Cultural Context Panel â”€â”€

            showCulture && React.createElement("div", { className: "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-xl border border-amber-200 p-4 space-y-3" },

              React.createElement("h4", { className: "text-sm font-bold text-amber-900 flex items-center gap-2" }, "ðŸ“œ Cultural Origins & Living Knowledge"),

              React.createElement("div", { className: "grid md:grid-cols-2 gap-3 text-xs text-amber-800 leading-relaxed" },

                React.createElement("div", { className: "space-y-2" },

                  React.createElement("p", { className: "font-bold text-amber-900" }, "Mesoamerican Origins: The Milpa"),

                  React.createElement("p", null, "The companion planting of corn, beans, and squash â€” known as milpa in Mesoamerica â€” is one of humanity's oldest agricultural innovations. Archaeological evidence traces this system to over 7,000 years ago in present-day Mexico. Squash was domesticated ~10,000 years ago, maize ~9,000 years ago from the wild grass teosinte, and common beans ~7,000 years ago."),

                  React.createElement("p", null, "The milpa system diffused northward over millennia, appearing in North America around 1070 CE. By the time European colonizers arrived around 1500, it was a foundational food system across Central and North America.")

                ),

                React.createElement("div", { className: "space-y-2" },

                  React.createElement("p", { className: "font-bold text-amber-900" }, "Haudenosaunee Tradition: De-oh-hÃ¡-ko"),

                  React.createElement("p", null, "The Haudenosaunee (Iroquois Confederacy) call these plants De-oh-hÃ¡-ko â€” \"they sustain us.\" The Three Sisters are spiritual beings and precious gifts, central to Haudenosaunee language, ceremony, songs, and cosmology. This is not merely a farming technique â€” it is a living relationship between people and plants."),

                  React.createElement("p", null, "This knowledge is not historical artifact. Milpa and Three Sisters gardens are actively cultivated today across the Americas, representing a continuous tradition of ecological wisdom.")

                )

              ),

              React.createElement("div", { className: "flex items-center gap-2 pt-1 flex-wrap" },

                React.createElement("span", { className: "text-[10px] font-bold text-amber-600" }, "Learn more:"),

                React.createElement("a", { href: "https://www.haudenosauneeconfederacy.com/", target: "_blank", rel: "noopener noreferrer", className: "text-[10px] text-amber-700 underline hover:text-amber-900" }, "Haudenosaunee Confederacy"),

                React.createElement("span", { className: "text-[10px] text-amber-400" }, "â€¢"),

                React.createElement("a", { href: "https://americanindian.si.edu/", target: "_blank", rel: "noopener noreferrer", className: "text-[10px] text-amber-700 underline hover:text-amber-900" }, "Smithsonian NMAI"),

                React.createElement("span", { className: "text-[10px] text-amber-400" }, "â€¢"),

                React.createElement("a", { href: "https://www.usda.gov/media/blog/2021/11/02/three-sisters-and-more-indigenous-food-systems", target: "_blank", rel: "noopener noreferrer", className: "text-[10px] text-amber-700 underline hover:text-amber-900" }, "USDA: Three Sisters")

              )

            ),



            // â”€â”€ Main Layout: Canvas + Dashboard â”€â”€

            React.createElement("div", { className: "grid md:grid-cols-3 gap-4" },



              // â”€â”€ Canvas â”€â”€

              React.createElement("div", { className: "md:col-span-2" },

                React.createElement("canvas", {

                  ref: canvasRef,

                  "data-companion-canvas": "true",

                  className: "w-full rounded-xl border-2 border-emerald-200 shadow-lg",

                  style: { height: 320, cursor: phase === 'plant' ? 'pointer' : 'default', background: 'linear-gradient(180deg, #87CEEB 0%, #E8F5E9 45%, #558B2F 45%, #33691E 100%)' },

                  role: "img", "aria-label": "Companion planting garden visualization showing corn, beans, and squash growing together"

                })

              ),



              // â”€â”€ Soil Chemistry Dashboard â”€â”€

              React.createElement("div", { className: "space-y-3" },

                React.createElement("div", { className: "bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-3 space-y-2.5" },

                  React.createElement("div", { className: "flex items-center justify-between mb-1" },

                    React.createElement("h4", { className: "text-xs font-bold text-emerald-800 flex items-center gap-1.5" }, "ðŸ§ª Needs & Meters"),

                    phase === 'grow' && React.createElement("span", { className: "text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full" },

                      seasonName + ' â€¢ Day ' + dayInSeason + '/30'

                    )

                  ),

                  gauge('Moisture', moisture, 'blue', 'ðŸ’§', '%'),

                  gauge('Nitrogen (Nâ‚‚)', nitrogen, 'emerald', 'ðŸ«˜', '%'),

                  gauge('Pest Pressure', pestPressure, 'red', 'ðŸ›', '%'),

                  gauge('Weed Cover', weedPressure, 'orange', 'ðŸŒ¿', '%'),

                  gauge('Soil Temp', temperature, 'orange', 'ðŸŒ¡ï¸', 'Â°C'),

                  gauge('Plant Health', plantHealth, plantHealth > 60 ? 'emerald' : plantHealth > 30 ? 'orange' : 'red', 'â¤ï¸', '%'),

                  React.createElement("div", { className: "border-t border-emerald-200 pt-2 mt-2" },

                    React.createElement("div", { className: "flex justify-between items-center" },

                      React.createElement("span", { className: "text-[10px] font-bold text-emerald-700" }, "Overall Soil Health"),

                      React.createElement("span", { className: "text-sm font-bold " + (soilHealth > 70 ? 'text-emerald-700' : soilHealth > 40 ? 'text-amber-600' : 'text-red-600') }, soilHealth + '%')

                    )

                  )

                ),



                // Comparison stats (visible when compare mode is on)

                compareMode && React.createElement("div", { className: "bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200 p-3 space-y-2" },

                  React.createElement("h4", { className: "text-xs font-bold text-red-800" }, "ðŸŒ½ Monoculture Comparison"),

                  gauge('Nitrogen', monoN, 'red', 'ðŸ“‰', '%'),

                  gauge('Moisture', monoH2O, 'red', 'ðŸ“‰', '%'),

                  gauge('Weeds', monoWeeds, 'red', 'ðŸ“ˆ', '%'),

                  React.createElement("div", { className: "border-t border-red-200 pt-2" },

                    React.createElement("span", { className: "text-[10px] font-bold text-red-700" }, "Soil Health: " + monoHealth + "%")

                  ),

                  growthTime > 30 && React.createElement("div", { className: "text-[10px] text-red-600 bg-red-100 rounded-lg p-2 mt-1" },

                    "âš ï¸ Without beans, nitrogen depletes. Without squash leaves, moisture drops and weeds take over."

                  )

                ),



                // Soil detail panel

                showSoilDetail && React.createElement("div", { className: "bg-gradient-to-br from-stone-50 to-amber-50 rounded-xl border border-stone-200 p-3 text-[10px] text-stone-700 space-y-2 leading-relaxed" },

                  React.createElement("h4", { className: "font-bold text-stone-800 text-xs" }, "ðŸ”¬ The Science"),

                  React.createElement("p", null, React.createElement("b", null, "Nitrogen Fixation:"), " Rhizobium bacteria in bean root nodules convert atmospheric Nâ‚‚ â†’ NHâ‚ƒ (ammonia) via nitrogenase enzyme. This biological process enriches soil without synthetic fertilizers."),

                  React.createElement("p", null, React.createElement("b", null, "Living Mulch:"), " Squash's broad leaves create ground cover that shades soil, reducing evapotranspiration by up to 50% and suppressing weed germination by blocking sunlight."),

                  React.createElement("p", null, React.createElement("b", null, "Structural Symbiosis:"), " Corn stalks serve as natural trellises for bean vines. Bean vines, in turn, stabilize corn against wind shear."),

                  React.createElement("p", null, React.createElement("b", null, "Nutritional Complementarity:"), " Corn provides methionine-rich carbohydrates; beans provide lysine-rich protein. Together they form a complete amino acid profile â€” a balanced diet from one garden.")

                )

              )

            ),



            // â”€â”€ Event Popup â”€â”€

            eventPopup && React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-300 p-4 space-y-2 animate-in slide-in-from-top duration-300 shadow-xl" },

              React.createElement("div", { className: "flex items-center justify-between" },

                React.createElement("h4", { className: "text-sm font-bold text-indigo-900 flex items-center gap-2" }, eventPopup.emoji + ' ' + eventPopup.title),

                React.createElement("button", {

                  onClick: function () { upd('eventPopup', null); },

                  className: "text-indigo-400 hover:text-indigo-700 text-lg font-bold"

                }, "âœ•")

              ),

              React.createElement("p", { className: "text-xs text-indigo-800 leading-relaxed bg-white/50 rounded-lg p-2" },

                "ðŸ”¬ ", React.createElement("b", null, "Science: "), eventPopup.lesson

              )

            ),



            // â”€â”€ Controls Bar â”€â”€

            React.createElement("div", { className: "space-y-3" },



              // Seed buttons (planting phase)

              phase === 'plant' && React.createElement("div", { className: "flex items-center gap-3 flex-wrap" },

                React.createElement("div", { className: "flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-2" },

                  React.createElement("span", { className: "text-[10px] font-bold text-slate-400 uppercase px-1" }, "Plant:"),

                  React.createElement("button", {

                    onClick: function () {

                      upd('cornPlanted', !cornPlanted);

                      if (!cornPlanted) {

                        awardStemXP('companion_planting_corn', 10, 'Planted corn');

                        if (addToast) addToast('ðŸŒ½ Corn planted! Tall stalks provide a trellis for beans.', 'success');

                      }

                    },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (cornPlanted ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-slate-50 text-slate-600 hover:bg-yellow-50 border border-slate-200')

                  }, "ðŸŒ½ Corn" + (cornPlanted ? ' âœ“' : '')),

                  React.createElement("button", {

                    onClick: function () {

                      upd('beansPlanted', !beansPlanted);

                      if (!beansPlanted) {

                        awardStemXP('companion_planting_beans', 10, 'Planted beans');

                        if (addToast) addToast('ðŸ«˜ Beans planted! Rhizobium bacteria fix nitrogen.', 'success');

                      }

                    },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (beansPlanted ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-slate-50 text-slate-600 hover:bg-green-50 border border-slate-200')

                  }, "ðŸ«˜ Beans" + (beansPlanted ? ' âœ“' : '')),

                  React.createElement("button", {

                    onClick: function () {

                      upd('squashPlanted', !squashPlanted);

                      if (!squashPlanted) {

                        awardStemXP('companion_planting_squash', 10, 'Planted squash');

                        if (addToast) addToast('ðŸŽƒ Squash planted! Leaves shade soil and trap moisture.', 'success');

                      }

                    },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (squashPlanted ? 'bg-orange-100 text-orange-800 border border-orange-300' : 'bg-slate-50 text-slate-600 hover:bg-orange-50 border border-slate-200')

                  }, "ðŸŽƒ Squash" + (squashPlanted ? ' âœ“' : ''))

                ),

                allPlanted && React.createElement("button", {

                  onClick: function () { upd('phase', 'grow'); awardStemXP('companion_planting_grow', 15, 'Started growth simulation'); },

                  className: "px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-200 hover:from-emerald-600 hover:to-green-700 transition-all flex items-center gap-1.5"

                }, "â–¶ Grow!"),

                !allPlanted && React.createElement("span", { className: "text-[10px] text-slate-400 italic" }, "Plant all three seeds to begin")

              ),



              // â”€â”€ Action Toolbar (grow phase) â”€â”€

              phase === 'grow' && React.createElement("div", { className: "bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-3" },

                React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                  React.createElement("span", { className: "text-xs font-bold text-emerald-800" }, "ðŸŽ® Actions"),

                  React.createElement("div", { className: "flex-1" }),

                  // Speed controls

                  React.createElement("div", { className: "flex items-center gap-1" },

                    React.createElement("span", { className: "text-[10px] text-emerald-600 font-bold mr-1" }, "Speed:"),

                    [1, 2, 5].map(function (s) {

                      return React.createElement("button", {

                        key: s,

                        onClick: function () { upd('growSpeed', s); },

                        className: "px-2 py-0.5 rounded text-[10px] font-bold transition-all " + (growSpeed === s ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50')

                      }, s + 'Ã—');

                    })

                  ),

                  React.createElement("span", { className: "text-[10px] font-bold text-emerald-700 ml-2" }, Math.round(growthTime) + "% grown")

                ),

                React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },

                  // Action buttons with cooldowns

                  [

                    { id: 'water', emoji: 'ðŸ’§', label: 'Water', tip: 'Irrigation replenishes soil moisture. Over-watering leaches nutrients.' },

                    { id: 'compost', emoji: 'ðŸ§ª', label: 'Compost', tip: 'Composting adds organic nitrogen and beneficial microbes.' },

                    { id: 'weed', emoji: 'ðŸŒ¿', label: 'Weed', tip: 'Weeding removes competition for light, water, and nutrients.' },

                    { id: 'inspect', emoji: 'ðŸ”', label: 'Inspect', tip: 'Inspecting reveals plant condition and early pest signs.' },

                    { id: 'mulch', emoji: 'ðŸ‚', label: 'Mulch', tip: 'Mulching regulates soil temperature and retains moisture.' }

                  ].map(function (action) {

                    var cd = (actionCooldowns && actionCooldowns[action.id]) || 0;

                    var onCooldown = cd > day;

                    var pct = onCooldown ? Math.min(100, Math.round(((cd - day) / 5) * 100)) : 0;

                    return React.createElement("button", {

                      key: action.id,

                      disabled: onCooldown,

                      title: action.tip,

                      onClick: function () {

                        setLabToolData(function (prev) {

                          var cp = Object.assign({}, prev.companionPlanting || {});

                          var cds = Object.assign({}, cp.actionCooldowns || {});

                          cds[action.id] = (cp.day || 0) + 5;

                          if (action.id === 'water') cp.moisture = Math.min(100, (cp.moisture || 60) + 30);

                          else if (action.id === 'compost') cp.nitrogenLevel = Math.min(100, (cp.nitrogenLevel || 35) + 20);

                          else if (action.id === 'weed') cp.weedCover = Math.max(0, (cp.weedCover || 15) - 25);

                          else if (action.id === 'inspect') {

                            cp.plantHealth = Math.min(100, (cp.plantHealth || 100) + 5);

                            cp.pestPressure = Math.max(0, (cp.pestPressure || 10) - 10);

                          }

                          else if (action.id === 'mulch') {

                            cp.soilTemp = cp.soilTemp + (22 - cp.soilTemp) * 0.3;

                            cp.moisture = Math.min(100, (cp.moisture || 60) + 10);

                          }

                          cp.actionCooldowns = cds;

                          return Object.assign({}, prev, { companionPlanting: cp });

                        });

                        if (addToast) addToast(action.emoji + ' ' + action.tip, 'success');

                        awardStemXP('companion_action_' + action.id, 5, action.label);

                      },

                      className: "relative px-3 py-2 rounded-xl text-xs font-bold transition-all border " + (

                        onCooldown

                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'

                          : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 shadow-sm hover:shadow-md'

                      ),

                      style: onCooldown ? { background: 'linear-gradient(to top, rgba(209,250,229,' + pct / 100 + ') ' + pct + '%, #f1f5f9 ' + pct + '%)' } : {}

                    }, action.emoji + ' ' + action.label + (onCooldown ? ' (' + (cd - day) + 'd)' : ''));

                  })

                )

              ),



              // â”€â”€ Synergy Panel (grow phase) â”€â”€

              phase === 'grow' && React.createElement("div", { className: "bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl border border-purple-200 p-3 space-y-2" },

                React.createElement("h4", { className: "text-xs font-bold text-purple-800 flex items-center gap-1.5" }, "ðŸ¤ Companion Synergies"),

                React.createElement("div", { className: "grid grid-cols-3 gap-3" },

                  [

                    { label: 'Corn â†” Beans', val: synCornBeans, desc: 'Structural support & N-fixation', color: 'emerald' },

                    { label: 'Beans â†’ Soil', val: synBeansSoil, desc: 'Rhizobium nitrogen enrichment', color: 'blue' },

                    { label: 'Squash â†’ All', val: synSquashAll, desc: 'Living mulch & pest deterrent', color: 'orange' }

                  ].map(function (syn) {

                    var c = _gaugeColors[syn.color] || _gaugeColors.emerald;

                    var unlocked = syn.val >= 50;

                    return React.createElement("div", { key: syn.label, className: "text-center space-y-1" },

                      React.createElement("div", { className: "text-[10px] font-bold " + (unlocked ? 'text-purple-700' : 'text-slate-500') }, (unlocked ? 'âœ¨ ' : 'ðŸ”’ ') + syn.label),

                      React.createElement("div", { className: "w-full h-2 bg-slate-200 rounded-full overflow-hidden" },

                        React.createElement("div", { className: "h-full rounded-full transition-all duration-700", style: { width: Math.round(syn.val) + '%', background: 'linear-gradient(to right, ' + c.light + ', ' + c.dark + ')' } })

                      ),

                      React.createElement("div", { className: "text-[9px] text-slate-400" }, syn.desc),

                      React.createElement("div", { className: "text-[10px] font-bold", style: { color: c.text } }, Math.round(syn.val) + '%')

                    );

                  })

                )

              ),



              // â”€â”€ Harvest Panel â”€â”€

              phase === 'harvest' && (() => {

                // Calculate per-crop yields based on health, synergies, and growth

                var _yieldBase = plantHealth / 100;

                var _cornYield = cornPlanted ? Math.round(_yieldBase * (70 + synCornBeans * 0.3) * synergyBonus) : 0;

                var _beanYield = beansPlanted ? Math.round(_yieldBase * (50 + synBeansSoil * 0.4) * synergyBonus) : 0;

                var _squashYield = squashPlanted ? Math.round(_yieldBase * (60 + synSquashAll * 0.35) * synergyBonus) : 0;

                var _totalYield = _cornYield + _beanYield + _squashYield;

                var _maxSingleYield = Math.max(_cornYield, _beanYield, _squashYield, 1);

                return React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-300 p-4 space-y-3 shadow-lg" },

                React.createElement("h4", { className: "text-sm font-bold text-amber-900 flex items-center gap-2" }, "ðŸŒ¾ Season " + (seasonIndex + 1) + " Harvest Report"),

                // â”€â”€ Per-Crop Yield Indicators â”€â”€

                React.createElement("div", { className: "bg-white rounded-xl p-3 space-y-2 border border-amber-200" },

                  React.createElement("div", { className: "text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1" }, "ðŸŒ¾ Crop Yields"),

                  [

                    { emoji: 'ðŸŒ½', name: 'Corn', value: _cornYield, planted: cornPlanted, color: '#ca8a04', bgColor: '#fef9c3', unit: 'ears' },

                    { emoji: 'ðŸ«˜', name: 'Beans', value: _beanYield, planted: beansPlanted, color: '#16a34a', bgColor: '#dcfce7', unit: 'lbs' },

                    { emoji: 'ðŸŽƒ', name: 'Squash', value: _squashYield, planted: squashPlanted, color: '#ea580c', bgColor: '#fff7ed', unit: 'lbs' }

                  ].map(function (crop) {

                    var pct = _maxSingleYield > 0 ? (crop.value / _maxSingleYield) * 100 : 0;

                    return React.createElement("div", { key: crop.name, className: "flex items-center gap-2" },

                      React.createElement("span", { className: "text-base w-6 text-center" }, crop.emoji),

                      React.createElement("div", { className: "flex-1" },

                        React.createElement("div", { className: "flex justify-between mb-0.5" },

                          React.createElement("span", { className: "text-[10px] font-bold text-slate-600" }, crop.name),

                          React.createElement("span", { className: "text-[10px] font-bold", style: { color: crop.color } }, crop.planted ? crop.value + ' ' + crop.unit : 'â€”')

                        ),

                        React.createElement("div", { className: "w-full h-2.5 rounded-full overflow-hidden", style: { background: crop.bgColor } },

                          React.createElement("div", { className: "h-full rounded-full transition-all duration-700", style: { width: (crop.planted ? Math.round(pct) : 0) + '%', background: crop.color } })

                        )

                      )

                    );

                  }),

                  React.createElement("div", { className: "flex items-center justify-between pt-1.5 border-t border-amber-100 mt-1" },

                    React.createElement("span", { className: "text-[10px] font-bold text-amber-800" }, "Total Harvest"),

                    React.createElement("span", { className: "text-sm font-bold text-amber-700" }, _totalYield + ' units'),

                    synergyBonus > 1.05 && React.createElement("span", { className: "text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full" }, 'âœ¨ +' + Math.round((synergyBonus - 1) * 100) + '% synergy bonus')

                  )

                ),

                React.createElement("div", { className: "grid grid-cols-3 gap-3 text-center" },

                  React.createElement("div", { className: "bg-white rounded-lg p-2" },

                    React.createElement("div", { className: "text-lg font-bold text-emerald-700" }, Math.round(plantHealth)),

                    React.createElement("div", { className: "text-[10px] text-slate-500" }, "Health Score")

                  ),

                  React.createElement("div", { className: "bg-white rounded-lg p-2" },

                    React.createElement("div", { className: "text-lg font-bold text-blue-700" }, Math.round((synCornBeans + synBeansSoil + synSquashAll) / 3)),

                    React.createElement("div", { className: "text-[10px] text-slate-500" }, "Avg Synergy")

                  ),

                  React.createElement("div", { className: "bg-white rounded-lg p-2" },

                    React.createElement("div", { className: "text-lg font-bold text-amber-700" }, seasonScore),

                    React.createElement("div", { className: "text-[10px] text-slate-500" }, "Season Score")

                  )

                ),

                React.createElement("div", { className: "flex items-center justify-between bg-amber-100 rounded-lg p-2" },

                  React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "ðŸ† Total Score: " + totalScore),

                  React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "ðŸŒ¾ Harvests: " + harvestCount)

                ),

                React.createElement("button", {

                  onClick: function () {

                    var _carry = Math.min(30, nitrogenLevel * 0.3);

                    awardStemXP('companion_planting_harvest', 20, 'Completed harvest');

                    setLabToolData(function (prev) {

                      var cp = Object.assign({}, prev.companionPlanting || {});

                      cp.phase = 'plant';

                      cp.growthTime = 0;

                      cp.cornPlanted = false; cp.beansPlanted = false; cp.squashPlanted = false;

                      cp.moisture = 60; cp.pestPressure = 10; cp.weedCover = 15;

                      cp.plantHealth = 100;

                      cp.nitrogenLevel = 35 + _carry; // nitrogen carryover from good management

                      cp.nitrogenCarryover = _carry;

                      cp.synCornBeans = 0; cp.synBeansSoil = 0; cp.synSquashAll = 0;

                      cp.totalScore = (cp.totalScore || 0) + (cp.seasonScore || 0);

                      cp.harvestCount = (cp.harvestCount || 0) + 1;

                      cp.seasonScore = 0;

                      cp.eventPopup = null;

                      return Object.assign({}, prev, { companionPlanting: cp });

                    });

                    if (addToast) addToast('ðŸŒ¾ Harvest complete! Yield: ' + (_cornYield + _beanYield + _squashYield) + ' units. Nitrogen carryover: +' + Math.round(_carry) + '%. +20 XP', 'success');

                  },

                  className: "w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-200 hover:from-amber-600 hover:to-yellow-700 transition-all"

                }, "ðŸŒ¾ Harvest & Start Next Season â†’")

              ); })()

            ),



            // â”€â”€ Quiz Button â”€â”€

            React.createElement("div", { className: "flex items-center gap-3" },

              React.createElement("div", { className: "flex-1" }),

              React.createElement("button", {

                onClick: function () { upd('quizActive', !quizActive); upd('quizAnswer', ''); upd('quizFeedback', ''); },

                className: "px-4 py-2 rounded-xl text-xs font-bold transition-all " + (quizActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100')

              }, "ðŸ§  Quiz"),

              React.createElement("button", {

                onClick: function () { upd('showSciencePanel', !showSciencePanel); },

                className: "px-4 py-2 rounded-xl text-xs font-bold transition-all " + (showSciencePanel ? 'bg-emerald-600 text-white shadow-lg' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100')

              }, "\uD83D\uDCDA Science")

            ),



            // â”€â”€ Quiz Panel â”€â”€

            showSciencePanel && React.createElement("div", { className: "bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-4 space-y-4", style: { maxHeight: '60vh', overflowY: 'auto' } },

              React.createElement("h3", { className: "text-lg font-bold text-emerald-900 flex items-center gap-2" }, "\uD83C\uDF3E The Three Sisters: Science of Companion Planting"),

              React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3" },

                React.createElement("div", { className: "bg-yellow-50 rounded-lg p-3 border border-yellow-200" },

                  React.createElement("div", { className: "text-2xl mb-1" }, "\uD83C\uDF3D"),

                  React.createElement("h4", { className: "font-bold text-yellow-800" }, "Corn (Structural Support)"),

                  React.createElement("p", { className: "text-xs text-yellow-700 mt-1" }, "Grows tall stalks (6\u201310 ft) that serve as natural trellises for bean vines, providing vertical structure and replacing the need for artificial poles.")

                ),

                React.createElement("div", { className: "bg-green-50 rounded-lg p-3 border border-green-200" },

                  React.createElement("div", { className: "text-2xl mb-1" }, "\uD83C\uDF3E"),

                  React.createElement("h4", { className: "font-bold text-green-800" }, "Beans (Nitrogen Fixation)"),

                  React.createElement("p", { className: "text-xs text-green-700 mt-1" }, "Rhizobium bacteria in root nodules convert atmospheric N\u2082 into plant-usable ammonia. This biological nitrogen fixation enriches the soil without synthetic fertilizer.")

                ),

                React.createElement("div", { className: "bg-orange-50 rounded-lg p-3 border border-orange-200" },

                  React.createElement("div", { className: "text-2xl mb-1" }, "\uD83C\uDF83"),

                  React.createElement("h4", { className: "font-bold text-orange-800" }, "Squash (Living Mulch)"),

                  React.createElement("p", { className: "text-xs text-orange-700 mt-1" }, "Broad leaves shade the soil, reducing water evaporation by up to 50%. Prickly stems deter animal pests. Acts as natural weed suppression through ground cover.")

                )

              ),

              React.createElement("div", { className: "bg-amber-50 rounded-lg p-4 border border-amber-200" },

                React.createElement("h4", { className: "font-bold text-amber-900 mb-2" }, "\uD83E\uDDEA Underground Chemistry"),

                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },

                  React.createElement("div", { className: "space-y-2" },

                    React.createElement("div", { className: "flex items-start gap-2" },

                      React.createElement("span", { className: "text-lg" }, "\uD83C\uDF44"),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-xs font-bold text-amber-800" }, "Mycorrhizal Network"),

                        React.createElement("p", { className: "text-xs text-amber-700" }, "Fungal threads extend root systems 100\u20131000x, creating an underground wood wide web that trades soil minerals for plant sugars.")

                      )

                    ),

                    React.createElement("div", { className: "flex items-start gap-2" },

                      React.createElement("span", { className: "text-lg" }, "\uD83E\uDDA0"),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-xs font-bold text-amber-800" }, "Rhizobium Nodules"),

                        React.createElement("p", { className: "text-xs text-amber-700" }, "Specialized bacteria colonize bean roots, forming visible pink nodules. Nitrogenase enzyme breaks the triple bond in N\u2082 gas, producing ammonia for all plants.")

                      )

                    )

                  ),

                  React.createElement("div", { className: "space-y-2" },

                    React.createElement("div", { className: "flex items-start gap-2" },

                      React.createElement("span", { className: "text-lg" }, "\uD83D\uDCA7"),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-xs font-bold text-amber-800" }, "Water Cycling"),

                        React.createElement("p", { className: "text-xs text-amber-700" }, "Squash leaf shade reduces soil temperature by up to 10\u00B0F, cutting evaporation in half. Fallen leaves build organic matter, improving water retention.")

                      )

                    ),

                    React.createElement("div", { className: "flex items-start gap-2" },

                      React.createElement("span", { className: "text-lg" }, "\uD83C\uDF31"),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-xs font-bold text-amber-800" }, "Nutrient Cycling"),

                        React.createElement("p", { className: "text-xs text-amber-700" }, "Corn is a heavy nitrogen feeder. Beans replace what corn takes. Squash returns organic matter. Together they maintain soil fertility without synthetic inputs.")

                      )

                    )

                  )

                )

              ),

              React.createElement("div", { className: "bg-violet-50 rounded-lg p-4 border border-violet-200" },

                React.createElement("h4", { className: "font-bold text-violet-900 mb-2" }, "\uD83C\uDFDB\uFE0F Cultural Heritage"),

                React.createElement("p", { className: "text-xs text-violet-800" }, "The Three Sisters (De-oh-h\u00E1-ko, meaning \u201Cthey sustain us\u201D in Haudenosaunee) is a 7,000-year-old agricultural system originating in Mesoamerica. Indigenous agricultural science developed sophisticated polyculture techniques millennia before modern ecology."),

                React.createElement("p", { className: "text-xs text-violet-700 mt-2 italic" }, "Together, corn and beans provide a complete protein \u2014 corn supplies methionine while beans supply lysine \u2014 forming the nutritional foundation of many Indigenous diets.")

              )

            ),



            quizActive && React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-200 p-4 space-y-3" },

              React.createElement("h4", { className: "text-sm font-bold text-indigo-900" }, "ðŸ§  Question " + ((quizQ % quizzes.length) + 1) + " of " + quizzes.length),

              React.createElement("p", { className: "text-sm text-indigo-800" }, currentQuiz.q),

              React.createElement("div", { className: "flex flex-wrap gap-2" },

                currentQuiz.opts.map(function (opt) {

                  var isCorrect = opt === currentQuiz.correct;

                  var isSelected = quizAnswer === opt;

                  var showResult = quizAnswer !== '';

                  return React.createElement("button", {

                    key: opt,

                    disabled: showResult,

                    onClick: function () {

                      upd('quizAnswer', opt);

                      if (isCorrect) {

                        upd('quizFeedback', 'âœ… Correct! ' + currentQuiz.explain);

                        awardStemXP('companion_planting_quiz', 15, 'Quiz correct: ' + currentQuiz.q.substring(0, 30));

                      } else {

                        upd('quizFeedback', 'âŒ Not quite. ' + currentQuiz.explain);

                      }

                    },

                    className: "px-4 py-2 rounded-xl text-xs font-bold transition-all border " + (

                      showResult && isCorrect ? 'bg-green-100 text-green-800 border-green-400' :

                        showResult && isSelected && !isCorrect ? 'bg-red-100 text-red-800 border-red-400' :

                          'bg-white text-indigo-700 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50'

                    )

                  }, opt);

                })

              ),

              quizFeedback && React.createElement("div", { className: "text-xs leading-relaxed p-3 rounded-lg " + (quizAnswer === currentQuiz.correct ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700') }, quizFeedback),

              quizFeedback && React.createElement("button", {

                onClick: function () { upd('quizQ', (quizQ + 1)); upd('quizAnswer', ''); upd('quizFeedback', ''); },

                className: "px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"

              }, quizQ + 1 < quizzes.length ? "Next Question â†’" : "ðŸ”„ Restart Quiz"),

              // AI hint for wrong answers

              quizAnswer && quizAnswer !== currentQuiz.correct && StemAIHintButton('companionPlanting', currentQuiz.q, quizAnswer, currentQuiz.correct)

            ),



            // â”€â”€ Snapshot button â”€â”€

            React.createElement("button", {

              onClick: function () {

                setToolSnapshots(function (prev) { return prev.concat([{ id: 'garden-' + Date.now(), tool: 'companionPlanting', label: 'Companion Planting Lab', data: Object.assign({}, d), timestamp: Date.now() }]); });

                if (addToast) addToast('ðŸ“¸ Garden snapshot saved!', 'success');

              },

              className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 rounded-full hover:from-emerald-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all"

            }, "ðŸ“¸ Snapshot")

          );
      })();
    }
  });


  // â•â•â• ðŸ”¬ graphCalc (graphCalc) â•â•â•
  window.StemLab.registerTool('graphCalc', {
    icon: 'ðŸ”¬',
    label: 'graphCalc',
    desc: '',
    color: 'slate',
    category: 'science',
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

      // â”€â”€ Tool body (graphCalc) â”€â”€
      return (function() {
const d = labToolData.graphCalc || {};

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, graphCalc: { ...(prev.graphCalc || {}), [key]: val } }));

          const tier = d.tier || 'explorer';

          const funcs = d.funcs || [{ expr: '', color: '#38bdf8' }, { expr: '', color: '#f472b6' }, { expr: '', color: '#34d399' }, { expr: '', color: '#fbbf24' }, { expr: '', color: '#a78bfa' }, { expr: '', color: '#fb923c' }];

          const win = d.window || { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };

          const showTable = d.showTable || false;

          const showWindow = d.showWindow || false;

          const showChallenge = d.showChallenge || false;

          const showMathPad = d.showMathPad != null ? d.showMathPad : false;

          const showArith = d.showArith || false;

          const arithExpr = d.arithExpr || '';

          const arithResult = d.arithResult || '';

          const showSliders = d.showSliders || false;

          const focusedInput = d.focusedInput || 0;

          const tableX = d.tableX != null ? d.tableX : -5;

          const tableStep = d.tableStep || 1;



          // Math Pad symbols gated by tier

          const MATH_SYMBOLS = [

            // Explorer tier (always visible)

            { label: 'x', insert: 'x', tier: 'explorer' },

            { label: '^', insert: '^', tier: 'explorer' },

            { label: '( )', insert: '()', tier: 'explorer' },

            { label: '\u03C0', insert: 'pi', tier: 'explorer' },

            { label: '\u221A', insert: 'sqrt(', tier: 'explorer' },

            { label: '|x|', insert: 'abs(', tier: 'explorer' },

            // Analyst tier

            { label: 'x\u00B2', insert: '^2', tier: 'analyst' },

            { label: 'x\u00B3', insert: '^3', tier: 'analyst' },

            { label: '\u00B1', insert: '-', tier: 'analyst' },

            { label: '1/x', insert: '1/', tier: 'analyst' },

            // Engineer tier

            { label: 'sin', insert: 'sin(', tier: 'engineer' },

            { label: 'cos', insert: 'cos(', tier: 'engineer' },

            { label: 'tan', insert: 'tan(', tier: 'engineer' },

            { label: 'log', insert: 'log(', tier: 'engineer' },

            { label: 'ln', insert: 'ln(', tier: 'engineer' },

            { label: 'e', insert: 'e', tier: 'engineer' },

          ];

          const visibleSymbols = MATH_SYMBOLS.filter(function (s) {

            if (tier === 'researcher') return true;

            if (tier === 'engineer') return s.tier !== 'researcher';

            if (tier === 'analyst') return s.tier === 'explorer' || s.tier === 'analyst';

            return s.tier === 'explorer';

          });

          var insertSymbol = function (text) {

            var nf = funcs.slice();

            var idx = focusedInput;

            nf[idx] = Object.assign({}, nf[idx], { expr: (nf[idx].expr || '') + text });

            upd('funcs', nf);

          };



          // NOTE: useEffect hooks for math.js loading and canvas rendering

          // have been moved to the component body level (above) to satisfy

          // React's Rules of Hooks. They guard internally with early returns.



          const COACH_TIPS = {

            explorer: [

              { icon: '\uD83D\uDCA1', title: 'Entering Functions', text: 'Type y = mx + b where m is the slope (steepness) and b is where the line crosses the y-axis. Try: y = 2x + 3' },

              { icon: '\uD83D\uDD0D', title: 'Zoom & Window', text: 'The window controls how much of the graph you see. If your graph disappeared, try resetting the window to Standard (-10 to 10).' },

              { icon: '\uD83D\uDCCA', title: 'Reading the Table', text: 'The table shows exact y-values for each x. Use it to check calculations or find patterns in your function.' },

              { icon: '\uD83C\uDFAF', title: 'Multiple Functions', text: 'Enter different equations in each slot to compare them. Where the lines cross is called an intersection!' }

            ],

            analyst: [

              { icon: '\uD83D\uDCC8', title: 'Linear vs Quadratic', text: 'y = 2x + 1 is a straight line. y = x\u00B2 is a parabola. The exponent determines the shape!' },

              { icon: '\uD83E\uDDEE', title: 'Finding Zeros', text: 'Where the graph crosses the x-axis, y = 0. These points are called zeros, roots, or x-intercepts.' },

              { icon: '\uD83D\uDCCA', title: 'Slope Meaning', text: 'In y = mx + b, slope m tells you: for every 1 step right, the line goes up by m. Negative m = downhill.' },

              { icon: '\u26A1', title: 'Transformations', text: 'y = (x-3)\u00B2 shifts the parabola right by 3. y = x\u00B2 + 5 shifts it up by 5. Try it!' }

            ],

            engineer: [

              { icon: '\uD83E\uDDE9', title: 'Trig Functions', text: 'sin(x), cos(x), tan(x) create waves. The period of sin(x) is 2\u03C0 \u2248 6.28.' },

              { icon: '\uD83D\uDD22', title: 'Logarithms', text: 'log(x) is the inverse of 10^x. ln(x) is the natural log (base e). They grow very slowly.' },

              { icon: '\u221E', title: 'Asymptotes', text: 'Some functions approach a line but never touch it. y = 1/x has asymptotes at x=0 and y=0.' }

            ],

            researcher: [

              { icon: '\uD83D\uDE80', title: 'Full Access', text: 'All features unlocked. You have the power of a full graphing calculator. Explore freely!' }

            ]

          };

          const currentTips = [...(COACH_TIPS.explorer || []), ...(tier !== 'explorer' ? COACH_TIPS.analyst || [] : []), ...(tier === 'engineer' || tier === 'researcher' ? COACH_TIPS.engineer || [] : []), ...(tier === 'researcher' ? COACH_TIPS.researcher || [] : [])];

          const coachIdx = d.coachIdx || 0;



          const ZOOM_PRESETS = [

            { name: 'Standard', xmin: -10, xmax: 10, ymin: -10, ymax: 10 },

            { name: 'Trig', xmin: -6.28, xmax: 6.28, ymin: -2, ymax: 2 },

            { name: 'Quadratic', xmin: -5, xmax: 5, ymin: -5, ymax: 25 },

            { name: 'Wide', xmin: -50, xmax: 50, ymin: -50, ymax: 50 },

            { name: 'Positive', xmin: 0, xmax: 20, ymin: 0, ymax: 20 }

          ];



          const PREMADE_CHALLENGES = [

            { tier: 'explorer', topic: 'Linear Functions', prompt: 'Graph y = 3x - 2. What is the y-intercept? What is the slope?', hint: 'The y-intercept is where the line crosses the y-axis (x=0). The slope is the coefficient of x.' },

            { tier: 'explorer', topic: 'Linear Functions', prompt: 'Graph y = -x + 5 and y = x - 1. Where do they intersect?', hint: 'The intersection is where both equations give the same y for the same x. Look at the table!' },

            { tier: 'explorer', topic: 'Tables', prompt: 'Enter y = x^2. Look at the table. What pattern do you see in the y-values?', hint: 'Compare consecutive y-values. The differences between them increase by 2 each time!' },

            { tier: 'analyst', topic: 'Quadratics', prompt: 'Graph y = x^2 - 4. Where are the zeros (x-intercepts)? Can you verify with the equation?', hint: 'Set y = 0: x^2 - 4 = 0, so x^2 = 4, so x = +/-2. Check the graph!' },

            { tier: 'analyst', topic: 'Transformations', prompt: 'Graph y = x^2, then y = (x-3)^2, then y = (x+2)^2. How does the number inside affect the graph?', hint: '(x-h) shifts the graph RIGHT by h. (x+h) shifts LEFT by h.' },

            { tier: 'analyst', topic: 'Slope', prompt: 'Graph y = 0.5x, y = x, y = 2x, and y = 5x. What happens as the slope gets bigger?', hint: 'Bigger slope = steeper line. Slope is the rise/run ratio.' },

            { tier: 'engineer', topic: 'Trigonometry', prompt: 'Graph y = sin(x) and y = cos(x) using the Trig zoom preset. How are they related?', hint: 'cos(x) is sin(x) shifted left by pi/2. They have the same shape!' },

            { tier: 'engineer', topic: 'Exponential', prompt: 'Graph y = 2^x and y = log(x)/log(2). What do you notice? These are inverse functions!', hint: 'Inverse functions are mirror images across the line y = x.' },

            { tier: 'engineer', topic: 'Asymptotes', prompt: 'Graph y = 1/x. What happens near x = 0? What happens as x gets very large?', hint: 'The graph gets infinitely close to the axes but never touches them. These lines are asymptotes.' }

          ];



          const TIER_INFO = {

            explorer: { icon: '\uD83D\uDFE2', name: 'Explorer', desc: 'Linear functions, basic graphing, tables', color: '#34d399' },

            analyst: { icon: '\uD83D\uDFE1', name: 'Analyst', desc: 'Quadratics, transformations, intersections', color: '#fbbf24' },

            engineer: { icon: '\uD83D\uDD35', name: 'Engineer', desc: 'Trig, logs, exponentials, advanced analysis', color: '#60a5fa' },

            researcher: { icon: '\uD83D\uDFE3', name: 'Researcher', desc: 'Full access - all features unlocked', color: '#a78bfa' }

          };

          const tierInfo = TIER_INFO[tier] || TIER_INFO.explorer;



          const availableChallenges = PREMADE_CHALLENGES.filter(c => {

            if (tier === 'researcher') return true;

            if (tier === 'engineer') return c.tier !== 'researcher';

            if (tier === 'analyst') return c.tier === 'explorer' || c.tier === 'analyst';

            return c.tier === 'explorer';

          });



          let tableRows = [];

          if (showTable && funcs[0] && funcs[0].expr && window.math) {

            try {

              let tExpr = funcs[0].expr.replace(/^y\s*=\s*/i, '').replace(/^f\s*\(x\)\s*=\s*/i, '');

              tExpr = tExpr.replace(/(\d)([x])/gi, '$1*$2').replace(/([x])(\d)/gi, '$1*$2');

              const tCompiled = math.compile(tExpr);

              for (let tx = tableX; tx <= tableX + 10 * tableStep; tx += tableStep) {

                try { var _tScope = { x: tx }; if (d.sliderA != null) _tScope.a = d.sliderA; if (d.sliderB != null) _tScope.b = d.sliderB; if (d.sliderC != null) _tScope.c = d.sliderC; const ty = tCompiled.evaluate(_tScope); tableRows.push({ x: tx, y: typeof ty === 'number' && isFinite(ty) ? Number(ty.toFixed(4)) : '---' }); }

                catch (e) { tableRows.push({ x: tx, y: 'ERR' }); }

              }

            } catch (e) { tableRows = [{ x: 0, y: 'Invalid expression' }]; }

          }



          return React.createElement('div', {

            style: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a', color: '#e2e8f0', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' }

          },

            React.createElement('div', {

              style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderBottom: '1px solid rgba(99,102,241,0.2)' }

            },

              React.createElement('button', { onClick: () => setStemLabTool(null), style: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#c7d2fe', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }, 'aria-label': 'Back to STEM Lab tools' }, '\u2190 Back'),

              React.createElement('div', { style: { fontWeight: 'bold', fontSize: '16px', letterSpacing: '0.5px', color: '#c7d2fe' } }, '\uD83D\uDCC8 Graphing Calculator'),

              React.createElement('div', { style: { marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' } },

                React.createElement('span', { style: { background: tierInfo.color + '22', color: tierInfo.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid ' + tierInfo.color + '44' } }, tierInfo.icon + ' ' + tierInfo.name),

                React.createElement('select', { value: tier, onChange: e => upd('tier', e.target.value), style: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', padding: '3px 8px', color: '#c7d2fe', fontSize: '10px', cursor: 'pointer' }, 'aria-label': 'Select skill tier' },

                  React.createElement('option', { value: 'explorer' }, '\uD83D\uDFE2 Explorer'),

                  React.createElement('option', { value: 'analyst' }, '\uD83D\uDFE1 Analyst'),

                  React.createElement('option', { value: 'engineer' }, '\uD83D\uDD35 Engineer'),

                  React.createElement('option', { value: 'researcher' }, '\uD83D\uDFE3 Researcher')

                )

              )

            ),



            React.createElement('div', {

              style: { display: 'flex', flex: 1, overflow: 'hidden' }

            },

              React.createElement('div', {

                style: { width: '220px', borderRight: '1px solid rgba(99,102,241,0.15)', display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.8)' }

              },

                React.createElement('div', { style: { padding: '10px 12px', borderBottom: '1px solid rgba(99,102,241,0.1)', fontSize: '11px', fontWeight: 'bold', color: '#818cf8', letterSpacing: '1px' } }, '\uD83D\uDCDD FUNCTIONS'),

                React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },

                  ...funcs.map((fn, i) => React.createElement('div', { key: 'f' + i, style: { marginBottom: '8px' } },

                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' } },

                      React.createElement('div', { style: { width: '10px', height: '10px', borderRadius: '50%', background: fn.color } }),

                      React.createElement('span', { style: { fontSize: '10px', color: '#94a3b8' } }, 'y' + (i + 1) + ' =')

                    ),

                    React.createElement('input', {

                      type: 'text', value: fn.expr || '', placeholder: i === 0 ? '2x + 3' : i === 1 ? 'x^2 - 4' : 'sin(x)',

                      onChange: e => { const nf = [...funcs]; nf[i] = { ...nf[i], expr: e.target.value }; upd('funcs', nf); },

                      onFocus: function () { upd('focusedInput', i); },

                      style: { width: '100%', padding: '6px 8px', borderRadius: '8px', border: '1px solid ' + fn.color + '44', background: fn.color + '11', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px', outline: 'none' },

                      'aria-label': 'Function y' + (i + 1) + ' expression'

                    })

                  ))

                ),



                // â”€â”€ Math Pad (collapsible symbol buttons) â”€â”€

                React.createElement('div', { style: { padding: '4px 12px', borderTop: '1px solid rgba(99,102,241,0.1)' } },

                  React.createElement('button', {

                    onClick: function () { upd('showMathPad', !showMathPad); },

                    style: { width: '100%', padding: '4px', borderRadius: '6px', background: showMathPad ? '#818cf833' : 'rgba(255,255,255,0.05)', color: showMathPad ? '#a5b4fc' : '#64748b', border: showMathPad ? '1px solid #818cf844' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', marginBottom: showMathPad ? '6px' : '0' }

                  }, '\u2328 Math Pad ' + (showMathPad ? '\u25B2' : '\u25BC')),

                  showMathPad && React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '3px', paddingBottom: '4px' } },

                    visibleSymbols.map(function (sym) {

                      return React.createElement('button', {

                        key: sym.label,

                        onClick: function () { insertSymbol(sym.insert); },

                        style: { padding: '3px 7px', borderRadius: '5px', background: 'rgba(99,102,241,0.12)', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.2)', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer', lineHeight: '1.2', transition: 'background 0.15s' },

                        onMouseEnter: function (e) { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; },

                        onMouseLeave: function (e) { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; },

                        title: 'Insert ' + sym.insert,

                        'aria-label': 'Insert ' + sym.label

                      }, sym.label);

                    })

                  )

                ),



                React.createElement('div', { style: { padding: '8px 12px', borderTop: '1px solid rgba(99,102,241,0.1)', display: 'flex', flexWrap: 'wrap', gap: '4px' } },

                  React.createElement('button', { onClick: () => upd('showTable', !showTable), style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: showTable ? '#818cf833' : 'rgba(255,255,255,0.05)', color: showTable ? '#a5b4fc' : '#94a3b8', border: showTable ? '1px solid #818cf844' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDCCA Table'),

                  React.createElement('button', { onClick: () => upd('showWindow', !showWindow), style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: showWindow ? '#818cf833' : 'rgba(255,255,255,0.05)', color: showWindow ? '#a5b4fc' : '#94a3b8', border: showWindow ? '1px solid #818cf844' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\u2699\uFE0F Window'),

                  React.createElement('button', { onClick: () => upd('showChallenge', !showChallenge), style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: showChallenge ? '#a78bfa33' : 'rgba(255,255,255,0.05)', color: showChallenge ? '#c4b5fd' : '#94a3b8', border: showChallenge ? '1px solid #a78bfa44' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83C\uDFAF Challenge'),

                  React.createElement('button', { onClick: () => { const nf = funcs.map(f => ({ ...f, expr: '' })); upd('funcs', nf); }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDDD1 Clear'),

                  React.createElement('button', { onClick: function () { upd('traceMode', !d.traceMode); }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: d.traceMode ? '#fbbf2433' : 'rgba(255,255,255,0.05)', color: d.traceMode ? '#fbbf24' : '#94a3b8', border: d.traceMode ? '1px solid #fbbf2444' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDD0D Trace'),

                  React.createElement('button', {

                    onClick: function () {

                      if (!window.math) return;

                      var an = !d.showAnalysis;

                      upd('showAnalysis', an);

                      if (an) {

                        var zeros = []; var inters = [];

                        try {

                          var f1 = funcs[0]; if (f1 && f1.expr && f1.expr.trim()) {

                            var e1 = f1.expr.replace(/^y\s*=\s*/i, '').replace(/^f\s*\(x\)\s*=\s*/i, '');

                            e1 = e1.replace(/(\d)([x])/gi, '$1*$2').replace(/([x])(\d)/gi, '$1*$2');

                            var c1 = math.compile(e1);

                            var sA = {}; if (d.sliderA != null) sA.a = d.sliderA; if (d.sliderB != null) sA.b = d.sliderB; if (d.sliderC != null) sA.c = d.sliderC;

                            var step = (win.xmax - win.xmin) / 500;

                            var prevY = null; var prevX = null;

                            for (var sx = win.xmin; sx <= win.xmax; sx += step) {

                              try {

                                var sy = c1.evaluate(Object.assign({ x: sx }, sA));

                                if (prevY != null && typeof sy === 'number' && isFinite(sy) && typeof prevY === 'number') {

                                  if (prevY * sy < 0) {

                                    var lo = prevX, hi = sx;

                                    for (var bi = 0; bi < 30; bi++) { var mid = (lo + hi) / 2; var mval = c1.evaluate(Object.assign({ x: mid }, sA)); if (c1.evaluate(Object.assign({ x: lo }, sA)) * mval < 0) hi = mid; else lo = mid; }

                                    var root = (lo + hi) / 2;

                                    if (zeros.length === 0 || Math.abs(zeros[zeros.length - 1].x - root) > step * 2) zeros.push({ x: root, fi: 0 });

                                  }

                                }

                                prevY = sy; prevX = sx;

                              } catch (e) { prevY = null; }

                            }

                            for (var fi2 = 1; fi2 < funcs.length; fi2++) {

                              var f2 = funcs[fi2]; if (!f2 || !f2.expr || !f2.expr.trim()) continue;

                              try {

                                var e2 = f2.expr.replace(/^y\s*=\s*/i, '').replace(/^f\s*\(x\)\s*=\s*/i, '');

                                e2 = e2.replace(/(\d)([x])/gi, '$1*$2').replace(/([x])(\d)/gi, '$1*$2');

                                var c2 = math.compile(e2);

                                var pDiff = null; var pXd = null;

                                for (var ix = win.xmin; ix <= win.xmax; ix += step) {

                                  try {

                                    var iy1 = c1.evaluate(Object.assign({ x: ix }, sA));

                                    var iy2 = c2.evaluate(Object.assign({ x: ix }, sA));

                                    var diff = iy1 - iy2;

                                    if (pDiff != null && typeof diff === 'number' && isFinite(diff) && pDiff * diff < 0) {

                                      var ilo = pXd, ihi = ix;

                                      for (var ibi = 0; ibi < 30; ibi++) { var imid = (ilo + ihi) / 2; var d1 = c1.evaluate(Object.assign({ x: imid }, sA)) - c2.evaluate(Object.assign({ x: imid }, sA)); if ((c1.evaluate(Object.assign({ x: ilo }, sA)) - c2.evaluate(Object.assign({ x: ilo }, sA))) * d1 < 0) ihi = imid; else ilo = imid; }

                                      var iroot = (ilo + ihi) / 2;

                                      var irootY = c1.evaluate(Object.assign({ x: iroot }, sA));

                                      inters.push({ x: iroot, y: irootY, f1: 0, f2: fi2 });

                                    }

                                    pDiff = diff; pXd = ix;

                                  } catch (e) { pDiff = null; }

                                }

                              } catch (e) { }

                            }

                          }

                        } catch (e) { }

                        upd('_zeros', zeros);

                        upd('_intersections', inters);

                      }

                    },

                    style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: d.showAnalysis ? '#34d39933' : 'rgba(255,255,255,0.05)', color: d.showAnalysis ? '#34d399' : '#94a3b8', border: d.showAnalysis ? '1px solid #34d39944' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }

                  }, '\u26A1 Analyze'),

                  React.createElement('button', { onClick: function () { upd('showDeriv', !d.showDeriv); if (!d.showDeriv && d.derivX == null) upd('derivX', 0); }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: d.showDeriv ? '#fb923c33' : 'rgba(255,255,255,0.05)', color: d.showDeriv ? '#fb923c' : '#94a3b8', border: d.showDeriv ? '1px solid #fb923c44' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, "\u2202 f\'(x)"),

                  React.createElement('button', { onClick: function () { upd('showArith', !showArith); }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: showArith ? '#60a5fa33' : 'rgba(255,255,255,0.05)', color: showArith ? '#60a5fa' : '#94a3b8', border: showArith ? '1px solid #60a5fa44' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83E\uDDEE Calc'),

                  React.createElement('button', { onClick: function () { upd('showSliders', !showSliders); if (!showSliders) { if (d.sliderA == null) upd('sliderA', 1); if (d.sliderB == null) upd('sliderB', 0); if (d.sliderC == null) upd('sliderC', 0); } }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: showSliders ? '#a78bfa33' : 'rgba(255,255,255,0.05)', color: showSliders ? '#a78bfa' : '#94a3b8', border: showSliders ? '1px solid #a78bfa44' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83C\uDFA8 Sliders')

                ),



                React.createElement('div', { style: { padding: '6px 12px 10px', borderTop: '1px solid rgba(99,102,241,0.1)' } },

                  React.createElement('div', { style: { fontSize: '9px', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' } }, 'ZOOM PRESETS'),

                  React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '3px' } },

                    ...ZOOM_PRESETS.map(z => React.createElement('button', { key: z.name, onClick: () => upd('window', { xmin: z.xmin, xmax: z.xmax, ymin: z.ymin, ymax: z.ymax }), style: { padding: '3px 7px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)', fontSize: '9px', cursor: 'pointer' } }, z.name))

                  )

                ),



                // â”€â”€ Arithmetic Calculator â”€â”€

                showArith && React.createElement('div', { style: { padding: '8px 12px', borderTop: '1px solid rgba(99,102,241,0.1)', background: 'rgba(96,165,250,0.06)' } },

                  React.createElement('div', { style: { fontSize: '9px', color: '#60a5fa', fontWeight: 'bold', marginBottom: '4px' } }, '\uD83E\uDDEE CALCULATOR'),

                  React.createElement('div', { style: { display: 'flex', gap: '4px', marginBottom: '4px' } },

                    React.createElement('input', { type: 'text', value: arithExpr, placeholder: 'e.g. sqrt(144) + 3^2', onChange: function (e) { upd('arithExpr', e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter' && window.math) { try { var res = math.evaluate(arithExpr); upd('arithResult', typeof res === 'number' ? String(Number(res.toPrecision(10))) : String(res)); } catch (er) { upd('arithResult', 'Error'); } } }, style: { flex: 1, padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.08)', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px', outline: 'none' }, 'aria-label': 'Calculator expression' }),

                    React.createElement('button', { onClick: function () { if (!window.math) return; try { var res = math.evaluate(arithExpr); upd('arithResult', typeof res === 'number' ? String(Number(res.toPrecision(10))) : String(res)); } catch (er) { upd('arithResult', 'Error'); } }, style: { padding: '5px 10px', borderRadius: '6px', background: '#3b82f6', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' } }, '=')

                  ),

                  arithResult && React.createElement('div', { style: { padding: '5px 8px', borderRadius: '6px', background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)', fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold', color: '#93c5fd', marginBottom: '4px' } }, '= ' + arithResult),

                  React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '2px' } },

                    ['7', '8', '9', '/', '+', '4', '5', '6', '*', '-', '1', '2', '3', '(', ')', '0', '.', 'pi', 'e', '^'].map(function (b) {

                      return React.createElement('button', { key: b, onClick: function () { upd('arithExpr', arithExpr + b); }, style: { width: '18%', padding: '4px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.15)', fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer' } }, b);

                    }),

                    React.createElement('button', { onClick: function () { upd('arithExpr', ''); upd('arithResult', ''); }, style: { width: '18%', padding: '4px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, 'C'),

                    React.createElement('button', { onClick: function () { upd('arithExpr', arithExpr.slice(0, -1)); }, style: { width: '18%', padding: '4px', borderRadius: '4px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\u232B'),

                    ['sin(', 'cos(', 'tan(', 'log(', 'ln(', 'sqrt(', 'abs(', '!', '%'].map(function (b) {

                      return React.createElement('button', { key: 'fn_' + b, onClick: function () { upd('arithExpr', arithExpr + b); }, style: { width: '18%', padding: '4px', borderRadius: '4px', background: 'rgba(167,139,250,0.12)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.2)', fontSize: '9px', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer' } }, b.replace('(', ''));

                    })

                  )

                ),

                // â”€â”€ Slider Parameters â”€â”€

                showSliders && React.createElement('div', { style: { padding: '8px 12px', borderTop: '1px solid rgba(99,102,241,0.1)', background: 'rgba(167,139,250,0.06)' } },

                  React.createElement('div', { style: { fontSize: '9px', color: '#a78bfa', fontWeight: 'bold', marginBottom: '6px' } }, '\uD83C\uDFA8 PARAMETER SLIDERS \u2014 Use a, b, c in your equations'),

                  ['a', 'b', 'c'].map(function (p) {

                    var key = 'slider' + p.toUpperCase();

                    var val = d[key] != null ? d[key] : (p === 'a' ? 1 : 0);

                    return React.createElement('div', { key: p, style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },

                      React.createElement('span', { style: { fontFamily: 'monospace', fontWeight: 'bold', color: '#c4b5fd', fontSize: '12px', width: '16px' } }, p),

                      React.createElement('input', { type: 'range', min: -10, max: 10, step: 0.1, value: val, onChange: function (e) { upd(key, parseFloat(e.target.value)); }, style: { flex: 1, accentColor: '#a78bfa' }, 'aria-label': 'Parameter ' + p }),

                      React.createElement('span', { style: { fontFamily: 'monospace', fontSize: '11px', color: '#e2e8f0', minWidth: '36px', textAlign: 'right', fontWeight: 'bold' } }, Number(val.toFixed(1)))

                    );

                  })

                ),

                // â”€â”€ Derivative â”€â”€

                d.showDeriv && React.createElement('div', { style: { padding: '8px 12px', borderTop: '1px solid rgba(99,102,241,0.1)', background: 'rgba(251,146,60,0.06)' } },

                  React.createElement('div', { style: { fontSize: '9px', color: '#fb923c', fontWeight: 'bold', marginBottom: '4px' } }, '\u2202 DERIVATIVE \u2014 Tangent line to y\u2081'),

                  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },

                    React.createElement('span', { style: { fontSize: '10px', color: '#94a3b8' } }, 'x ='),

                    React.createElement('input', { type: 'range', min: win.xmin, max: win.xmax, step: (win.xmax - win.xmin) / 200, value: d.derivX != null ? d.derivX : 0, onChange: function (e) { upd('derivX', parseFloat(e.target.value)); }, style: { flex: 1, accentColor: '#fb923c' }, 'aria-label': 'Derivative x value' }),

                    React.createElement('span', { style: { fontFamily: 'monospace', fontSize: '11px', color: '#fb923c', fontWeight: 'bold', minWidth: '40px', textAlign: 'right' } }, d.derivX != null ? Number(d.derivX.toPrecision(4)) : '0'),

                    (function () {

                      if (!window.math || !funcs[0] || !funcs[0].expr) return null;

                      try {

                        var de = funcs[0].expr.replace(/^y\s*=\s*/i, '').replace(/^f\s*\(x\)\s*=\s*/i, '');

                        de = de.replace(/(\d)([x])/gi, '$1*$2').replace(/([x])(\d)/gi, '$1*$2');

                        var dc = math.compile(de); var dx = d.derivX != null ? d.derivX : 0; var dh2 = 0.0001;

                        var dsc = { x: dx }; if (d.sliderA != null) dsc.a = d.sliderA; if (d.sliderB != null) dsc.b = d.sliderB; if (d.sliderC != null) dsc.c = d.sliderC;

                        var dscp = Object.assign({}, dsc, { x: dx + dh2 }); var dscm = Object.assign({}, dsc, { x: dx - dh2 });

                        var slope = (dc.evaluate(dscp) - dc.evaluate(dscm)) / (2 * dh2);

                        return React.createElement('span', { style: { fontFamily: 'monospace', fontSize: '11px', color: '#fbbf24', fontWeight: 'bold', background: 'rgba(251,191,36,0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(251,191,36,0.3)' } }, "f'=" + Number(slope.toPrecision(5)));

                      } catch (e) { return null; }

                    })()

                  )

                ),

                // â”€â”€ Analysis Results â”€â”€

                d.showAnalysis && React.createElement('div', { style: { padding: '8px 12px', borderTop: '1px solid rgba(99,102,241,0.1)', background: 'rgba(52,211,153,0.06)' } },

                  React.createElement('div', { style: { fontSize: '9px', color: '#34d399', fontWeight: 'bold', marginBottom: '4px' } }, '\u26A1 ANALYSIS RESULTS'),

                  React.createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },

                    React.createElement('div', { style: { flex: 1, minWidth: '80px' } },

                      React.createElement('div', { style: { fontSize: '9px', color: '#34d399', fontWeight: 'bold', marginBottom: '2px' } }, 'Zeros (y\u2081 = 0)'),

                      (d._zeros && d._zeros.length > 0) ? d._zeros.map(function (z, zi) {

                        return React.createElement('div', { key: zi, style: { fontSize: '10px', fontFamily: 'monospace', color: '#a7f3d0', padding: '1px 0' } }, 'x = ' + Number(z.x.toPrecision(5)));

                      }) : React.createElement('div', { style: { fontSize: '10px', color: '#64748b', fontStyle: 'italic' } }, 'No zeros found')

                    ),

                    React.createElement('div', { style: { flex: 1, minWidth: '80px' } },

                      React.createElement('div', { style: { fontSize: '9px', color: '#f472b6', fontWeight: 'bold', marginBottom: '2px' } }, 'Intersections'),

                      (d._intersections && d._intersections.length > 0) ? d._intersections.map(function (pt, pi) {

                        return React.createElement('div', { key: pi, style: { fontSize: '10px', fontFamily: 'monospace', color: '#f9a8d4', padding: '1px 0' } }, '(' + Number(pt.x.toPrecision(4)) + ', ' + Number(pt.y.toPrecision(4)) + ')');

                      }) : React.createElement('div', { style: { fontSize: '10px', color: '#64748b', fontStyle: 'italic' } }, 'Enter 2+ functions')

                    )

                  )

                )

              ),



              React.createElement('div', {

                style: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }

              },

                React.createElement('canvas', {

                  id: 'graph-calc-canvas', width: 600, height: 420,

                  style: { width: '100%', flex: 1, background: '#0f172a', borderRadius: '0', cursor: d.traceMode ? 'crosshair' : 'default' },

                  'aria-label': 'Graphing calculator coordinate plane',

                  onMouseMove: function (e) {

                    if (!d.traceMode) return;

                    var rect = e.currentTarget.getBoundingClientRect();

                    var px = (e.clientX - rect.left) / rect.width * 600;

                    var cv2 = e.currentTarget;

                    if (cv2._toMathX) upd('traceX', cv2._toMathX(px));

                  },

                  onMouseLeave: function () { if (d.traceMode) upd('traceX', null); }

                }),



                showWindow && React.createElement('div', { style: { padding: '8px 12px', background: 'rgba(30,27,75,0.9)', borderTop: '1px solid rgba(99,102,241,0.2)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },

                  React.createElement('span', { style: { fontSize: '10px', color: '#818cf8', fontWeight: 'bold' } }, 'WINDOW:'),

                  ...['xmin', 'xmax', 'ymin', 'ymax'].map(k => React.createElement('label', { key: k, style: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#94a3b8' } },

                    k + ':', React.createElement('input', { type: 'number', value: win[k], onChange: e => upd('window', { ...win, [k]: parseFloat(e.target.value) || 0 }), style: { width: '50px', padding: '2px 4px', borderRadius: '4px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '10px' }, 'aria-label': k })

                  ))

                ),



                showTable && React.createElement('div', { style: { maxHeight: '150px', overflowY: 'auto', borderTop: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.95)' } },

                  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderBottom: '1px solid rgba(99,102,241,0.1)' } },

                    React.createElement('span', { style: { fontSize: '10px', fontWeight: 'bold', color: '#818cf8' } }, '\uD83D\uDCCA TABLE'),

                    React.createElement('label', { style: { fontSize: '9px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' } }, 'Start:', React.createElement('input', { type: 'number', value: tableX, onChange: e => upd('tableX', parseFloat(e.target.value) || 0), style: { width: '40px', padding: '1px 3px', borderRadius: '3px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.1)', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '9px' } })),

                    React.createElement('label', { style: { fontSize: '9px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' } }, 'Step:', React.createElement('input', { type: 'number', value: tableStep, onChange: e => upd('tableStep', parseFloat(e.target.value) || 1), style: { width: '40px', padding: '1px 3px', borderRadius: '3px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.1)', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '9px' } }))

                  ),

                  React.createElement('table', { style: { width: '100%', fontSize: '11px', fontFamily: 'monospace', borderCollapse: 'collapse' } },

                    React.createElement('thead', null, React.createElement('tr', null,

                      React.createElement('th', { style: { padding: '3px 10px', textAlign: 'right', color: '#818cf8', fontWeight: 'bold', borderBottom: '1px solid rgba(99,102,241,0.15)' } }, 'x'),

                      React.createElement('th', { style: { padding: '3px 10px', textAlign: 'right', color: funcs[0] ? funcs[0].color : '#38bdf8', fontWeight: 'bold', borderBottom: '1px solid rgba(99,102,241,0.15)' } }, 'y\u2081')

                    )),

                    React.createElement('tbody', null, ...tableRows.map((r, ri) => React.createElement('tr', { key: ri, style: { background: ri % 2 === 0 ? 'transparent' : 'rgba(99,102,241,0.04)' } },

                      React.createElement('td', { style: { padding: '2px 10px', textAlign: 'right', color: '#94a3b8' } }, r.x),

                      React.createElement('td', { style: { padding: '2px 10px', textAlign: 'right', color: '#e2e8f0' } }, r.y)

                    )))

                  )

                )

              ),



              React.createElement('div', {

                style: { width: '230px', borderLeft: '1px solid rgba(99,102,241,0.15)', display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.8)' }

              },

                React.createElement('div', { style: { padding: '10px 12px', borderBottom: '1px solid rgba(99,102,241,0.1)', fontSize: '11px', fontWeight: 'bold', color: '#818cf8', letterSpacing: '1px' } }, showChallenge ? '\uD83C\uDFAF CHALLENGES' : '\uD83D\uDCA1 COACH'),

                !showChallenge && React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },

                  ...currentTips.map((tip, i) => React.createElement('div', { key: i, style: { padding: '10px', marginBottom: '6px', borderRadius: '10px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)' } },

                    React.createElement('div', { style: { fontWeight: 'bold', fontSize: '12px', marginBottom: '4px', color: '#a5b4fc' } }, tip.icon + ' ' + tip.title),

                    React.createElement('div', { style: { fontSize: '11px', lineHeight: '1.5', color: '#cbd5e1' } }, tip.text)

                  ))

                ),



                showChallenge && React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },

                  React.createElement('div', { style: { marginBottom: '10px' } },

                    React.createElement('div', { style: { display: 'flex', gap: '4px', marginBottom: '8px' } },

                      React.createElement('button', { onClick: () => upd('challengeSource', 'premade'), style: { flex: 1, padding: '5px', borderRadius: '6px', background: (d.challengeSource || 'premade') === 'premade' ? '#818cf8' : 'rgba(255,255,255,0.05)', color: (d.challengeSource || 'premade') === 'premade' ? '#fff' : '#94a3b8', border: 'none', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDCDA Pre-made'),

                      React.createElement('button', { onClick: () => { upd('challengeSource', 'ai'); if (typeof addToast === 'function') addToast('AI challenges use Gemini to generate custom problems', 'info'); }, style: { flex: 1, padding: '5px', borderRadius: '6px', background: d.challengeSource === 'ai' ? '#a78bfa' : 'rgba(255,255,255,0.05)', color: d.challengeSource === 'ai' ? '#fff' : '#94a3b8', border: 'none', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83E\uDD16 AI Generated')

                    )

                  ),

                  ...availableChallenges.map((ch, ci) => React.createElement('div', { key: ci, style: { padding: '10px', marginBottom: '6px', borderRadius: '10px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)', cursor: 'pointer' }, onClick: () => upd('activeChallenge', d.activeChallenge === ci ? -1 : ci) },

                    React.createElement('div', { style: { fontSize: '9px', color: '#a78bfa', fontWeight: 'bold', marginBottom: '3px' } }, ch.topic),

                    React.createElement('div', { style: { fontSize: '11px', lineHeight: '1.5', color: '#e2e8f0', marginBottom: '4px' } }, ch.prompt),

                    d.activeChallenge === ci && React.createElement('div', { style: { fontSize: '10px', color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '6px 8px', borderRadius: '6px', marginTop: '4px', lineHeight: '1.4' } }, '\uD83D\uDCA1 Hint: ' + ch.hint)

                  ))

                )

              )

            )

          );
      })();
    }
  });

  // â•â•â• ðŸ”¬ algebraCAS (algebraCAS) â•â•â•
  window.StemLab.registerTool('algebraCAS', {
    icon: 'ðŸ”¬',
    label: 'algebraCAS',
    desc: '',
    color: 'slate',
    category: 'science',
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

      // â”€â”€ Tool body (algebraCAS) â”€â”€
      return (function() {
var d = (labToolData && labToolData._algebraCAS) || {};

          var updCAS = function (key, val) {

            setLabToolData(function (prev) {

              var cas = Object.assign({}, (prev && prev._algebraCAS) || {});

              cas[key] = val;

              return Object.assign({}, prev, { _algebraCAS: cas });

            });

          };

          var expression = d.expression || '';

          var mode = d.mode || 'solve';

          var result = d.result || null;

          var isLoading = d.isLoading || false;

          var history = d.history || [];

          var difficulty = d.difficulty || 'elementary';

          var practiceMode = d.practiceMode || false;

          var practiceQ = d.practiceQ || null;

          var practiceAnswer = d.practiceAnswer || '';

          var practiceFeedback = d.practiceFeedback || null;

          var practiceType = d.practiceType || 'random';

          var practiceScore = d.practiceScore || 0;

          var practiceStreak = d.practiceStreak || 0;

          var showSolution = d.showSolution || false;



          var PROBLEM_TYPES = [

            { id: 'linear', label: 'ðŸ“ Linear', desc: 'e.g. 3x + 7 = 22' },

            { id: 'quadratic', label: 'ðŸ“ Quadratic', desc: 'e.g. xÂ² + 3x - 10 = 0' },

            { id: 'multi-step', label: 'ðŸ”¢ Multi-Step', desc: 'e.g. 2(x+3) - 5 = 11' },

            { id: 'fractions', label: 'ðŸ• Fractions', desc: 'e.g. x/3 + 2 = 5' },

            { id: 'word-problem', label: 'ðŸ“– Word Problem', desc: 'Story-based equations' },

            { id: 'systems', label: 'âš–ï¸ Systems', desc: 'e.g. 2x + y = 10' },

            { id: 'random', label: 'ðŸŽ² Random', desc: 'Mix of all types' }

          ];



          var MODES = [

            { id: 'solve', label: 'ðŸ” Solve', desc: 'Find the value of a variable' },

            { id: 'factor', label: 'ðŸ§© Factor', desc: 'Factor an expression' },

            { id: 'simplify', label: 'âœ¨ Simplify', desc: 'Simplify an expression' },

            { id: 'expand', label: 'ðŸ“ Expand', desc: 'Expand & distribute' }

          ];



          var DIFFICULTIES = [

            { id: 'elementary', label: 'Elementary', desc: 'Single variable, basic operations' },

            { id: 'middle', label: 'Middle School', desc: 'Quadratics, systems, fractions' },

            { id: 'advanced', label: 'Advanced', desc: 'Rational, radical, polynomial' }

          ];



          var EXAMPLES = {

            solve: ['2x + 5 = 13', 'xÂ² - 4x + 3 = 0', '3(x - 2) = 15'],

            factor: ['xÂ² - 9', 'xÂ² + 5x + 6', '2xÂ² - 8'],

            simplify: ['(3xÂ² + 6x) / 3x', '2(x + 3) - (x - 1)', 'âˆš(50)'],

            expand: ['(x + 3)(x - 2)', '(2x + 1)Â²', '3(xÂ² - 4x + 1)']

          };



          var handleSolve = function () {

            if (!expression.trim() || !callGemini || isLoading) return;

            updCAS('isLoading', true);

            updCAS('result', null);

            var modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);

            var prompt = 'You are a math CAS (Computer Algebra System) tutor for a ' + _stemGrade + ' student.\n\n' +

              'MODE: ' + modeLabel + '\n' +

              'EXPRESSION: ' + expression.trim() + '\n\n' +

              'Instructions:\n' +

              '1. ' + modeLabel + ' this expression step by step.\n' +

              '2. For EACH step, show the work AND label the algebraic rule used in [brackets].\n' +

              '   Rules include: [Distributive Property], [Combining Like Terms], [Addition Property of Equality],\n' +

              '   [Division Property of Equality], [Zero Product Property], [Quadratic Formula], [Factoring],\n' +

              '   [Difference of Squares], [Perfect Square Trinomial], [GCF Factoring], [Simplification], etc.\n' +

              '3. Format your response as:\n' +

              '   STEP 1: (show work) [Rule Name]\n' +

              '   STEP 2: (show work) [Rule Name]\n' +

              '   ...\n' +

              '   ANSWER: (final result)\n\n' +

              'Be mathematically rigorous. Show every step clearly. Keep explanations concise but educational.';



            callGemini(prompt).then(function (res) {

              updCAS('isLoading', false);

              if (res) {

                updCAS('result', res);

                var newH = (history || []).slice(-9);

                newH.push({ expr: expression, mode: mode, result: res, ts: Date.now() });

                updCAS('history', newH);

                awardStemXP('algebraCAS', 5, 'Solved: ' + expression.trim().substring(0, 30));

              }

            }).catch(function (e) {

              updCAS('isLoading', false);

              updCAS('result', 'Error: ' + (e.message || 'Failed to process'));

            });

          };



          var handlePracticeGenerate = function () {

            if (!callGemini || isLoading) return;

            updCAS('isLoading', true);

            updCAS('practiceFeedback', null);

            updCAS('practiceAnswer', '');

            updCAS('showSolution', false);

            var diffDesc = difficulty === 'elementary' ? 'single-variable linear equation (e.g. 3x + 7 = 22)' :

              difficulty === 'middle' ? 'quadratic or two-step equation (e.g. xÂ² + 3x - 10 = 0)' :

                'rational, radical, or multi-step polynomial equation';

            var typeDesc = '';

            if (practiceType !== 'random') {

              var typeMap = { 'linear': 'a linear equation', 'quadratic': 'a quadratic equation', 'multi-step': 'a multi-step equation with parentheses/distribution', 'fractions': 'an equation involving fractions', 'word-problem': 'a real-world word problem that translates to an equation', 'systems': 'a system of two equations with two variables' };

              typeDesc = '\nProblem type: ' + (typeMap[practiceType] || practiceType) + '\n';

            }

            var prompt = 'Generate ONE algebra practice problem at the ' + difficulty + ' level.\n' +

              'Difficulty: ' + diffDesc + '\n' + typeDesc +

              'Format your response as EXACTLY:\n' +

              'PROBLEM: (the equation or word problem)\n' +

              'ANSWER: (the correct answer, simplified)\n' +

              'HINT: (a one-sentence hint without giving away the answer)\n\n' +

              'Do not include any other text.';



            callGemini(prompt).then(function (res) {

              updCAS('isLoading', false);

              if (res) {

                var pMatch = res.match(/PROBLEM:\s*(.+)/i);

                var aMatch = res.match(/ANSWER:\s*(.+)/i);

                var hMatch = res.match(/HINT:\s*(.+)/i);

                updCAS('practiceQ', {

                  problem: pMatch ? pMatch[1].trim() : res,

                  answer: aMatch ? aMatch[1].trim() : '',

                  hint: hMatch ? hMatch[1].trim() : 'Think step by step!'

                });

              }

            }).catch(function () { updCAS('isLoading', false); });

          };



          var handlePracticeCheck = function () {

            if (!practiceQ || !practiceAnswer.trim()) return;

            updCAS('isLoading', true);

            var prompt = 'A student is solving this algebra problem:\n' +

              'PROBLEM: ' + practiceQ.problem + '\n' +

              'CORRECT ANSWER: ' + practiceQ.answer + '\n' +

              'STUDENT ANSWER: ' + practiceAnswer.trim() + '\n\n' +

              'Respond in this EXACT format:\n' +

              'CORRECT: yes/no\n' +

              'FEEDBACK: (1-2 encouraging sentences)\n' +

              'SOLUTION:\n' +

              'STEP 1: (show work) [Rule Name]\n' +

              'STEP 2: (show work) [Rule Name]\n' +

              '...\n' +

              'ANSWER: (final result)\n\n' +

              'ALWAYS include the full step-by-step SOLUTION with labeled algebraic rules in [brackets], ' +

              'even if the student is correct. This helps them verify their reasoning. ' +

              'Rules include: [Distributive Property], [Combining Like Terms], [Addition Property of Equality], ' +

              '[Division Property of Equality], [Zero Product Property], [Quadratic Formula], [Factoring], etc.';



            callGemini(prompt).then(function (res) {

              updCAS('isLoading', false);

              if (res) {

                var isCorrect = /CORRECT:\s*yes/i.test(res);

                updCAS('practiceFeedback', { correct: isCorrect, text: res });

                updCAS('practiceScore', practiceScore + (isCorrect ? 1 : 0));

                updCAS('practiceStreak', isCorrect ? practiceStreak + 1 : 0);

                if (isCorrect) awardStemXP('algebraCAS', 10, 'Practice problem correct');

                updCAS('showSolution', !isCorrect);

              }

            }).catch(function () { updCAS('isLoading', false); });

          };



          // â”€â”€ Dark theme styles â”€â”€

          var _bg = isDark || isContrast ? '#1e1b4b' : '#fffbeb';

          var _text = isDark || isContrast ? '#e0e7ff' : '#1e293b';

          var _card = isDark || isContrast ? 'rgba(99,102,241,0.08)' : 'rgba(245,158,11,0.06)';

          var _border = isDark || isContrast ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.2)';

          var _accent = isDark || isContrast ? '#a5b4fc' : '#d97706';

          var _muted = isDark || isContrast ? '#94a3b8' : '#64748b';

          var _btnBg = isDark || isContrast ? '#6366f1' : '#f59e0b';

          var _btnText = isDark || isContrast ? '#fff' : '#fff';



          return React.createElement("div", { className: "p-4 space-y-4", style: { color: _text } },

            // â”€â”€ Header â”€â”€

            React.createElement("div", { className: "flex items-center justify-between mb-2" },

              React.createElement("div", null,

                React.createElement("h3", { className: "text-lg font-bold flex items-center gap-2" }, "ðŸ§® Algebra Solver"),

                React.createElement("p", { className: "text-xs", style: { color: _muted } }, "Step-by-step symbolic math powered by AI")

              ),

              React.createElement("div", { className: "flex gap-2" },

                React.createElement("button", {

                  onClick: function () { updCAS('practiceMode', !practiceMode); updCAS('result', null); updCAS('practiceFeedback', null); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",

                  style: { background: practiceMode ? _btnBg : _card, color: practiceMode ? _btnText : _text, border: '1px solid ' + _border }

                }, practiceMode ? 'ðŸ“ Practice Mode' : 'ðŸŽ¯ Practice Mode'),

                React.createElement("button", {

                  onClick: function () { setStemLabTool(null); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold",

                  style: { background: _card, border: '1px solid ' + _border, color: _text }

                }, "â† Back")

              )

            ),



            // â”€â”€ Practice Mode â”€â”€

            practiceMode ? React.createElement("div", { className: "space-y-4" },

              // Score + Streak display

              (practiceScore > 0 || practiceStreak > 0) && React.createElement("div", { className: "flex items-center gap-3" },

                practiceScore > 0 && React.createElement("span", { className: "text-xs font-bold", style: { color: 'rgba(34,197,94,0.9)' } }, 'â­ ' + practiceScore + ' correct'),

                practiceStreak > 1 && React.createElement("span", { className: "text-xs font-bold", style: { color: '#f97316' } }, 'ðŸ”¥ ' + practiceStreak + ' streak')

              ),

              // Difficulty Selector

              React.createElement("div", null,

                React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-wider mb-1.5", style: { color: _muted } }, "ðŸ“Š Difficulty"),

                React.createElement("div", { className: "flex gap-2 flex-wrap" },

                  DIFFICULTIES.map(function (df) {

                    return React.createElement("button", {

                      key: df.id,

                      onClick: function () { updCAS('difficulty', df.id); updCAS('practiceQ', null); updCAS('practiceFeedback', null); },

                      className: "px-3 py-2 rounded-xl text-xs font-bold transition-all",

                      style: { background: difficulty === df.id ? _btnBg : _card, color: difficulty === df.id ? _btnText : _text, border: '1px solid ' + _border }

                    }, df.label);

                  })

                )

              ),

              // Problem Type Selector

              React.createElement("div", null,

                React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-wider mb-1.5", style: { color: _muted } }, "ðŸ“ Problem Type"),

                React.createElement("div", { className: "flex gap-1.5 flex-wrap" },

                  PROBLEM_TYPES.map(function (pt) {

                    return React.createElement("button", {

                      key: pt.id,

                      onClick: function () { updCAS('practiceType', pt.id); updCAS('practiceQ', null); updCAS('practiceFeedback', null); },

                      className: "px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all",

                      style: { background: practiceType === pt.id ? _btnBg : _card, color: practiceType === pt.id ? _btnText : _text, border: '1px solid ' + (practiceType === pt.id ? _accent : _border) },

                      title: pt.desc

                    }, pt.label);

                  })

                )

              ),

              // Generate / Current Problem

              !practiceQ ? React.createElement("div", { className: "text-center py-8 rounded-2xl", style: { background: _card, border: '1px solid ' + _border } },

                React.createElement("p", { className: "text-sm mb-2", style: { color: _muted } }, "Generate a " + (practiceType === 'random' ? '' : practiceType + ' ') + "problem at the " + difficulty + " level"),

                React.createElement("button", {

                  onClick: handlePracticeGenerate,

                  disabled: isLoading,

                  className: "px-6 py-3 rounded-xl text-sm font-bold transition-all",

                  style: { background: _btnBg, color: _btnText, opacity: isLoading ? 0.5 : 1 }

                }, isLoading ? 'â³ Generating...' : 'ðŸŽ² Generate Problem')

              ) : React.createElement("div", { className: "space-y-3" },

                // Problem display

                React.createElement("div", { className: "p-4 rounded-2xl", style: { background: _card, border: '2px solid ' + _accent } },

                  React.createElement("div", { className: "text-xs font-bold mb-2", style: { color: _accent } }, "ðŸ“‹ PROBLEM"),

                  React.createElement("div", { className: "text-xl font-mono font-bold text-center py-3" }, practiceQ.problem),

                  React.createElement("p", { className: "text-xs text-center mt-2", style: { color: _muted } }, "ðŸ’¡ Hint: " + practiceQ.hint)

                ),

                // Answer input

                !practiceFeedback && React.createElement("div", { className: "flex gap-2" },

                  React.createElement("input", {

                    type: "text",

                    value: practiceAnswer,

                    onChange: function (e) { updCAS('practiceAnswer', e.target.value); },

                    onKeyDown: function (e) { if (e.key === 'Enter') handlePracticeCheck(); },

                    placeholder: "Type your answer...",

                    className: "flex-1 px-4 py-3 rounded-xl text-sm font-mono",

                    style: { background: _card, border: '1px solid ' + _border, color: _text, outline: 'none' }

                  }),

                  React.createElement("button", {

                    onClick: handlePracticeCheck,

                    disabled: isLoading || !practiceAnswer.trim(),

                    className: "px-5 py-3 rounded-xl text-sm font-bold transition-all",

                    style: { background: _btnBg, color: _btnText, opacity: (isLoading || !practiceAnswer.trim()) ? 0.5 : 1 }

                  }, isLoading ? 'â³' : 'âœ… Check')

                ),

                // Feedback header

                practiceFeedback && React.createElement("div", {

                  className: "p-4 rounded-2xl",

                  style: { background: practiceFeedback.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (practiceFeedback.correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)') }

                },

                  React.createElement("div", { className: "text-sm font-bold mb-2" }, practiceFeedback.correct ? 'ðŸŽ‰ Correct!' : 'âŒ Not quite...'),

                  React.createElement("div", { className: "text-xs leading-relaxed mb-2" },

                    (function () { var fb = practiceFeedback.text.match(/FEEDBACK:\s*(.+)/i); return fb ? fb[1].trim() : ''; })()

                  ),

                  // Step-by-step solution toggle + display

                  React.createElement("button", {

                    onClick: function () { updCAS('showSolution', !showSolution); },

                    className: "text-xs font-bold px-3 py-1.5 rounded-lg transition-all mb-2",

                    style: { background: showSolution ? 'rgba(99,102,241,0.15)' : _card, color: showSolution ? (isDark || isContrast ? '#a5b4fc' : '#6366f1') : _muted, border: '1px solid ' + _border }

                  }, (showSolution ? 'â–¼' : 'â–¶') + ' Step-by-Step Solution'),

                  showSolution && React.createElement("div", { className: "mt-2 p-3 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed", style: { background: isDark || isContrast ? 'rgba(15,23,42,0.5)' : 'rgba(248,250,252,1)', border: '1px solid ' + _border } },

                    (function () {

                      var solMatch = practiceFeedback.text.match(/SOLUTION:[\s\S]*/i);

                      var solText = solMatch ? solMatch[0] : '';

                      if (!solText) return React.createElement("span", { style: { color: _muted } }, "No detailed solution available.");

                      return solText.split('\n').map(function (line, i) {

                        var isStep = /^STEP\s+\d+/i.test(line.trim());

                        var isAnswer = /^ANSWER:/i.test(line.trim());

                        var ruleMatch = line.match(/\[([^\]]+)\]/);

                        if (isAnswer) return React.createElement("div", { key: i, className: "mt-3 p-2.5 rounded-xl text-sm font-bold", style: { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' } }, 'âœ… ' + line.trim());

                        if (isStep) return React.createElement("div", { key: i, className: "py-1.5 flex items-start gap-2" },

                          React.createElement("span", { className: "flex-1" }, ruleMatch ? line.replace(ruleMatch[0], '').trim() : line.trim()),

                          ruleMatch && React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap flex-shrink-0", style: { background: 'rgba(99,102,241,0.15)', color: isDark || isContrast ? '#a5b4fc' : '#6366f1', border: '1px solid rgba(99,102,241,0.2)' } }, ruleMatch[1])

                        );

                        if (/^SOLUTION:/i.test(line.trim())) return null;

                        return line.trim() ? React.createElement("div", { key: i, className: "py-0.5" }, line) : null;

                      });

                    })()

                  )

                ),

                // Next problem button

                React.createElement("button", {

                  onClick: function () { updCAS('practiceQ', null); updCAS('practiceFeedback', null); updCAS('practiceAnswer', ''); updCAS('showSolution', false); handlePracticeGenerate(); },

                  className: "w-full py-2 rounded-xl text-xs font-bold transition-all",

                  style: { background: _card, border: '1px solid ' + _border, color: _text }

                }, "ðŸ”„ New Problem")

              )

            ) :

              // â”€â”€ Solver Mode â”€â”€

              React.createElement("div", { className: "space-y-4" },

                // Mode selector

                React.createElement("div", { className: "grid grid-cols-4 gap-2" },

                  MODES.map(function (m) {

                    return React.createElement("button", {

                      key: m.id,

                      onClick: function () { updCAS('mode', m.id); updCAS('result', null); },

                      className: "p-2 rounded-xl text-center transition-all",

                      style: { background: mode === m.id ? _btnBg : _card, color: mode === m.id ? _btnText : _text, border: '1px solid ' + (mode === m.id ? _accent : _border) }

                    },

                      React.createElement("div", { className: "text-lg" }, m.label.split(' ')[0]),

                      React.createElement("div", { className: "text-[10px] font-bold mt-0.5" }, m.label.split(' ').slice(1).join(' '))

                    );

                  })

                ),

                // Input

                React.createElement("div", { className: "flex gap-2" },

                  React.createElement("input", {

                    type: "text",

                    value: expression,

                    onChange: function (e) { updCAS('expression', e.target.value); },

                    onKeyDown: function (e) { if (e.key === 'Enter') handleSolve(); },

                    placeholder: 'Enter expression, e.g. ' + (EXAMPLES[mode] || ['2x + 5 = 13'])[0],

                    className: "flex-1 px-4 py-3 rounded-xl text-sm font-mono",

                    style: { background: _card, border: '1px solid ' + _border, color: _text, outline: 'none' }

                  }),

                  React.createElement("button", {

                    onClick: handleSolve,

                    disabled: isLoading || !expression.trim(),

                    className: "px-5 py-3 rounded-xl text-sm font-bold transition-all",

                    style: { background: _btnBg, color: _btnText, opacity: (isLoading || !expression.trim()) ? 0.5 : 1 }

                  }, isLoading ? 'â³ Computing...' : 'â–¶ ' + (mode.charAt(0).toUpperCase() + mode.slice(1)))

                ),

                // Quick examples

                React.createElement("div", { className: "flex gap-2 flex-wrap" },

                  React.createElement("span", { className: "text-[10px] font-bold", style: { color: _muted } }, "TRY:"),

                  (EXAMPLES[mode] || []).map(function (ex, i) {

                    return React.createElement("button", {

                      key: i,

                      onClick: function () { updCAS('expression', ex); },

                      className: "px-2 py-1 rounded-lg text-[10px] font-mono transition-all hover:scale-105",

                      style: { background: _card, border: '1px solid ' + _border, color: _accent }

                    }, ex);

                  })

                ),

                // Result

                result && React.createElement("div", { className: "p-4 rounded-2xl", style: { background: _card, border: '1px solid ' + _accent } },

                  React.createElement("div", { className: "text-xs font-bold mb-3 flex items-center gap-2", style: { color: _accent } }, "ðŸ“‹ Step-by-Step Solution"),

                  React.createElement("div", { className: "text-sm whitespace-pre-wrap leading-relaxed font-mono" },

                    result.split('\n').map(function (line, i) {

                      var isStep = /^STEP\s+\d+/i.test(line.trim());

                      var isAnswer = /^ANSWER:/i.test(line.trim());

                      var ruleMatch = line.match(/\[([^\]]+)\]/);

                      if (isAnswer) return React.createElement("div", { key: i, className: "mt-3 p-3 rounded-xl text-base font-bold", style: { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' } }, "âœ… " + line.trim());

                      if (isStep) return React.createElement("div", { key: i, className: "py-1.5 flex items-start gap-2" },

                        React.createElement("span", { className: "flex-1" }, ruleMatch ? line.replace(ruleMatch[0], '').trim() : line.trim()),

                        ruleMatch && React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap", style: { background: 'rgba(99,102,241,0.15)', color: isDark || isContrast ? '#a5b4fc' : '#6366f1', border: '1px solid rgba(99,102,241,0.2)' } }, ruleMatch[1])

                      );

                      return line.trim() ? React.createElement("div", { key: i, className: "py-0.5" }, line) : null;

                    })

                  )

                ),

                // History

                history.length > 0 && React.createElement("div", null,

                  React.createElement("div", { className: "text-xs font-bold mb-2", style: { color: _muted } }, "ðŸ“œ Recent (last " + history.length + ")"),

                  React.createElement("div", { className: "flex gap-2 flex-wrap" },

                    history.slice().reverse().slice(0, 5).map(function (h, i) {

                      return React.createElement("button", {

                        key: i,

                        onClick: function () { updCAS('expression', h.expr); updCAS('mode', h.mode); updCAS('result', h.result); },

                        className: "px-2 py-1 rounded-lg text-[10px] font-mono transition-all hover:scale-105",

                        style: { background: _card, border: '1px solid ' + _border, color: _text }

                      }, h.mode + ': ' + h.expr.substring(0, 20) + (h.expr.length > 20 ? '...' : ''));

                    })

                  )

                )

              )

          );
      })();
    }
  });

  // â•â•â• ðŸ”¬ economicsLab (economicsLab) â•â•â•
  window.StemLab.registerTool('economicsLab', {
    icon: 'ðŸ”¬',
    label: 'economicsLab',
    desc: '',
    color: 'slate',
    category: 'science',
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

      // â”€â”€ Tool body (economicsLab) â”€â”€
      return (function() {
var d = labToolData || {};

          var upd = function (k, v) { setLabToolData(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); };

          var econTab = d.econTab || 'supplyDemand';

          if (!window._econCanvasRef) window._econCanvasRef = { current: null };

          var canvasRef = window._econCanvasRef;



          // â”€â”€ Supply & Demand State â”€â”€

          var sdDemandShift = d.sdDemandShift || 0;

          var sdSupplyShift = d.sdSupplyShift || 0;

          var sdPriceFloor = d.sdPriceFloor || 0;

          var sdPriceCeiling = d.sdPriceCeiling || 0;

          var sdTax = d.sdTax || 0;



          // â”€â”€ Personal Finance Life Sim State â”€â”€

          var pfAge = d.pfAge || 22;

          var pfCash = d.pfCash || 2000;

          var pfDebt = d.pfDebt || 0;

          var pfSalary = d.pfSalary || 35000;

          var pfHappiness = d.pfHappiness || 70;



          // â”€â”€ Personal Finance Budget Breakdown â”€â”€

          var pfIncome = Math.round((d.pfSalary || 35000) / 12);

          var pfRent = d.pfRent || Math.round(pfIncome * 0.30);

          var pfFood = d.pfFood || Math.round(pfIncome * 0.15);

          var pfTransport = d.pfTransport || Math.round(pfIncome * 0.10);

          var pfEntertain = d.pfEntertain || Math.round(pfIncome * 0.05);

          var pfSavings = d.pfSavings || Math.round(pfIncome * 0.20);



          // â”€â”€ Stock Market State â”€â”€

          var smCash = d.smCash !== undefined ? d.smCash : 10000;

          var smPortfolio = d.smPortfolio || {};

          var smDay = d.smDay || 0;

          var smCompanies = d.smCompanies || [];

          var smSelected = d.smSelected || 0;

          var smNews = d.smNews || null;



          // â”€â”€ Entrepreneur State â”€â”€

          var enDay = d.enDay || 1;

          var enCash = d.enCash !== undefined ? d.enCash : 20;

          var enPrice = d.enPrice || 1.00;

          var enCups = d.enCups || 30;

          var enAdBudget = d.enAdBudget || 0;

          var enWeather = d.enWeather || 'sunny';

          var enHistory = d.enHistory || [];



          // â”€â”€ National Economy (Macro) State â”€â”€

          var macroGDP = d.macroGDP || 2.1;

          var macroInflation = d.macroInflation || 3.2;

          var macroInterest = d.macroInterest || 5.25;

          var macroUnemployment = d.macroUnemployment || 3.8;

          var macroTrade = d.macroTrade || -0.5;

          var macroYear = d.macroYear || 2025;

          var macroHistory = d.macroHistory || [];



          // â”€â”€ Achievement Tracking â”€â”€

          var econAchievements = [];

          if ((d.pfCash || 0) >= 100000) econAchievements.push({ icon: '\uD83D\uDCB0', title: 'Six Figures', desc: 'Saved $100K+' });

          if ((d.pfCash || 0) >= 1000000) econAchievements.push({ icon: '\uD83D\uDC8E', title: 'Millionaire', desc: 'Net worth $1M+' });

          if ((d.pfAge || 22) >= 65 && (d.pfCash || 0) > 500000) econAchievements.push({ icon: '\uD83C\uDFD6\uFE0F', title: 'Comfortable Retirement', desc: 'Retired with $500K+' });

          if ((d.pfCredit || 650) >= 800) econAchievements.push({ icon: '\u2B50', title: 'Excellent Credit', desc: 'Credit score 800+' });

          if ((d.pfHappiness || 70) >= 95) econAchievements.push({ icon: '\uD83C\uDF1F', title: 'Living the Dream', desc: '95%+ happiness' });

          if ((d.pfDebt || 0) === 0 && (d.pfAge || 22) > 25) econAchievements.push({ icon: '\u2705', title: 'Debt Free', desc: 'Eliminated all debt' });

          var smTotalVal = (d.smCash || 10000) + (d.smCompanies || []).reduce(function (s, c) { return s + ((d.smPortfolio || {})[c.ticker] || 0) * c.price; }, 0);

          if (smTotalVal >= 15000) econAchievements.push({ icon: '\uD83D\uDCC8', title: 'Market Gains', desc: 'Portfolio grew 50%+' });

          if (smTotalVal >= 25000) econAchievements.push({ icon: '\uD83D\uDE80', title: 'Wall Street Wolf', desc: 'Portfolio hit $25K' });

          if ((d.smDay || 0) >= 30) econAchievements.push({ icon: '\uD83D\uDCC5', title: 'Seasoned Trader', desc: '30+ trading days' });

          if ((d.enBizDay || 0) >= 20) econAchievements.push({ icon: '\uD83C\uDFC6', title: 'Business Survivor', desc: '20+ days in business' });

          if ((d.enBizCash || 0) >= 50000) econAchievements.push({ icon: '\uD83D\uDCBC', title: 'Tycoon', desc: 'Business cash $50K+' });

          if ((d.enBizRep || 0) >= 90) econAchievements.push({ icon: '\uD83C\uDF1F', title: '5-Star Business', desc: 'Reputation 90+' });

          if ((d.enBizEmployees || 0) >= 5) econAchievements.push({ icon: '\uD83D\uDC65', title: 'Job Creator', desc: 'Hired 5+ employees' });

          if ((d.macroHistory || []).length >= 10) econAchievements.push({ icon: '\uD83C\uDFDB\uFE0F', title: 'Policy Veteran', desc: '10+ years of policy' });

          if (macroGDP >= 5) econAchievements.push({ icon: '\uD83D\uDCC8', title: 'Economic Boom', desc: 'GDP growth 5%+' });

          if (macroUnemployment <= 2) econAchievements.push({ icon: '\uD83D\uDCAA', title: 'Full Employment', desc: 'Unemployment <2%' });

          var conceptsLearned = (d.econGlossary || []).length;

          // Economic Literacy Score (0-100)

          var econLiteracyScore = Math.min(100, Math.round(

            conceptsLearned * 2 +

            Math.min(20, (d.pfHistory || []).length * 1.5) +

            Math.min(15, (d.smDay || 0) * 0.5) +

            Math.min(15, (d.enBizDay || 0) * 0.75) +

            Math.min(15, (d.macroHistory || []).length * 1.5) +

            Math.min(10, (d.quizScore || 0) * 2) +

            (econAchievements.length * 0.5)

          ));

          if (conceptsLearned >= 5) econAchievements.push({ icon: '\uD83D\uDCDA', title: 'Student', desc: '5+ concepts learned' });

          if (conceptsLearned >= 15) econAchievements.push({ icon: '\uD83C\uDF93', title: 'Economics Major', desc: '15+ concepts learned' });

          if (conceptsLearned >= 30) econAchievements.push({ icon: '\uD83E\uDDD1\u200D\uD83C\uDF93', title: 'PhD Economist', desc: '30+ concepts learned' });



          // â”€â”€ Canvas Rendering â”€â”€ (non-hook: setTimeout to avoid conditional hook)

          setTimeout(function () {

            var canvas = canvasRef.current;

            if (!canvas) return;

            var ctx = canvas.getContext('2d');

            var W = canvas.width = canvas.offsetWidth * 2;

            var H = canvas.height = 500;

            ctx.scale(1, 1);

            ctx.clearRect(0, 0, W, H);



            if (econTab === 'supplyDemand') {

              // â”€â”€ Supply & Demand Graph â”€â”€

              var gx = 60, gy = 30, gw = W - 120, gh = H - 80;

              // Background

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              // Grid

              ctx.strokeStyle = 'rgba(148,163,184,0.1)'; ctx.lineWidth = 1;

              for (var gi = 0; gi <= 10; gi++) {

                ctx.beginPath(); ctx.moveTo(gx + gi * gw / 10, gy); ctx.lineTo(gx + gi * gw / 10, gy + gh); ctx.stroke();

                ctx.beginPath(); ctx.moveTo(gx, gy + gi * gh / 10); ctx.lineTo(gx + gw, gy + gi * gh / 10); ctx.stroke();

              }

              // Axes

              ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;

              ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();

              ctx.font = 'bold 14px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('Price ($)', gx - 50, gy + gh / 2);

              ctx.fillText('Quantity', gx + gw / 2 - 25, gy + gh + 35);

              // Labels

              ctx.font = '11px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

              for (var li = 0; li <= 10; li++) {

                ctx.fillText((100 - li * 10).toString(), gx - 30, gy + li * gh / 10 + 4);

                ctx.fillText((li * 10).toString(), gx + li * gw / 10 - 5, gy + gh + 18);

              }



              // Demand curve (downward sloping, shifted)

              ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.beginPath();

              for (var dx = 0; dx <= 100; dx++) {

                var dp = 90 - dx * 0.8 + sdDemandShift * 5;

                var px = gx + dx / 100 * gw;

                var py = gy + (100 - dp) / 100 * gh;

                dx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);

              }

              ctx.stroke();

              ctx.fillStyle = '#3b82f6'; ctx.font = 'bold 13px Inter, system-ui';

              ctx.fillText('D' + (sdDemandShift !== 0 ? '\'' : ''), gx + gw - 30, gy + 30 - sdDemandShift * 25);



              // Supply curve (upward sloping, shifted)

              ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath();

              for (var sx = 0; sx <= 100; sx++) {

                var sp = 10 + sx * 0.8 + sdSupplyShift * 5;

                var spx = gx + sx / 100 * gw;

                var spy = gy + (100 - sp) / 100 * gh;

                sx === 0 ? ctx.moveTo(spx, spy) : ctx.lineTo(spx, spy);

              }

              ctx.stroke();

              ctx.fillStyle = '#ef4444';

              ctx.fillText('S' + (sdSupplyShift !== 0 ? '\'' : ''), gx + gw - 30, gy + gh - 30 - sdSupplyShift * 25);



              // Equilibrium point

              var eqQ = (80 - sdSupplyShift * 5 + sdDemandShift * 5) / 1.6;

              var eqP = 10 + eqQ * 0.8 + sdSupplyShift * 5;

              var eqPx = gx + eqQ / 100 * gw;

              var eqPy = gy + (100 - eqP) / 100 * gh;

              // Dashed lines to axes

              ctx.setLineDash([5, 5]); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;

              ctx.beginPath(); ctx.moveTo(eqPx, eqPy); ctx.lineTo(gx, eqPy); ctx.stroke();

              ctx.beginPath(); ctx.moveTo(eqPx, eqPy); ctx.lineTo(eqPx, gy + gh); ctx.stroke();

              ctx.setLineDash([]);

              // Equilibrium dot

              ctx.beginPath(); ctx.arc(eqPx, eqPy, 8, 0, Math.PI * 2);

              ctx.fillStyle = '#fbbf24'; ctx.fill();

              ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();

              ctx.font = 'bold 12px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

              ctx.fillText('E', eqPx + 12, eqPy - 8);

              ctx.font = '11px Inter, system-ui';

              ctx.fillText('P* = $' + eqP.toFixed(0), gx + 5, eqPy - 5);

              ctx.fillText('Q* = ' + eqQ.toFixed(0), eqPx - 10, gy + gh + 30);

              // Concept summary

              ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

              var csY = gy + gh + 50;

              ctx.fillText('\u2022 Consumer Surplus = area ABOVE equilibrium price, BELOW demand curve', gx, csY);

              ctx.fillText('\u2022 Producer Surplus = area BELOW equilibrium price, ABOVE supply curve', gx, csY + 14);

              ctx.fillText('\u2022 Total Surplus = Consumer + Producer surplus (maximized at equilibrium)', gx, csY + 28);



              // Price floor

              if (sdPriceFloor > 0) {

                var pfY = gy + (100 - sdPriceFloor) / 100 * gh;

                ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.setLineDash([8, 4]);

                ctx.beginPath(); ctx.moveTo(gx, pfY); ctx.lineTo(gx + gw, pfY); ctx.stroke();

                ctx.setLineDash([]); ctx.fillStyle = '#22c55e'; ctx.font = 'bold 11px Inter, system-ui';

                ctx.fillText('Price Floor $' + sdPriceFloor, gx + gw - 120, pfY - 8);

                if (sdPriceFloor > eqP) {

                  ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                  ctx.fillText('\u26A0 SURPLUS (above equilibrium)', gx + 10, pfY - 20);

                }

              }

              // Price ceiling

              if (sdPriceCeiling > 0) {

                var pcY = gy + (100 - sdPriceCeiling) / 100 * gh;

                ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.setLineDash([8, 4]);

                ctx.beginPath(); ctx.moveTo(gx, pcY); ctx.lineTo(gx + gw, pcY); ctx.stroke();

                ctx.setLineDash([]); ctx.fillStyle = '#f97316'; ctx.font = 'bold 11px Inter, system-ui';

                ctx.fillText('Price Ceiling $' + sdPriceCeiling, gx + gw - 130, pcY + 18);

                if (sdPriceCeiling < eqP) {

                  ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                  ctx.fillText('\u26A0 SHORTAGE (below equilibrium)', gx + 10, pcY + 30);

                }

              }

              // Tax wedge

              if (sdTax > 0) {

                ctx.fillStyle = 'rgba(168,85,247,0.15)';

                ctx.fillRect(eqPx - 20, eqPy - sdTax / 100 * gh / 2, 40, sdTax / 100 * gh);

                ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#a855f7';

                ctx.fillText('Tax: $' + sdTax, eqPx + 25, eqPy);

              }

            }



            else if (econTab === 'personalFinance') {

              // â”€â”€ Life Sim Net Worth Chart â”€â”€

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              var pieX = W * 0.25, pieY = H * 0.45, pieR = Math.min(W * 0.2, H * 0.35);

              var expenses = [

                { name: 'Rent/Housing', val: pfRent, color: '#ef4444' },

                { name: 'Food', val: pfFood, color: '#f59e0b' },

                { name: 'Transport', val: pfTransport, color: '#3b82f6' },

                { name: 'Entertainment', val: pfEntertain, color: '#8b5cf6' },

                { name: 'Savings', val: pfSavings, color: '#22c55e' }

              ];

              var totalExp = expenses.reduce(function (s, e) { return s + e.val; }, 0);

              var remaining = Math.max(0, pfIncome - totalExp);

              if (remaining > 0) expenses.push({ name: 'Remaining', val: remaining, color: '#64748b' });

              var total = expenses.reduce(function (s, e) { return s + e.val; }, 0);

              var angle = -Math.PI / 2;

              expenses.forEach(function (e) {

                var sliceAngle = (e.val / total) * Math.PI * 2;

                ctx.beginPath(); ctx.moveTo(pieX, pieY);

                ctx.arc(pieX, pieY, pieR, angle, angle + sliceAngle);

                ctx.closePath(); ctx.fillStyle = e.color; ctx.fill();

                ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();

                // Label

                var midAngle = angle + sliceAngle / 2;

                var lx = pieX + Math.cos(midAngle) * (pieR * 0.65);

                var ly = pieY + Math.sin(midAngle) * (pieR * 0.65);

                if (e.val / total > 0.05) {

                  ctx.font = 'bold 11px Inter, system-ui'; ctx.fillStyle = '#fff';

                  ctx.textAlign = 'center';

                  ctx.fillText(Math.round(e.val / total * 100) + '%', lx, ly);

                  ctx.fillText(e.name, lx, ly + 14);

                }

                angle += sliceAngle;

              });

              ctx.textAlign = 'left';

              // Income display

              ctx.font = 'bold 16px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('Monthly Income: $' + pfIncome.toLocaleString(), W * 0.55, 40);

              ctx.font = '13px Inter, system-ui'; ctx.fillStyle = totalExp > pfIncome ? '#ef4444' : '#22c55e';

              ctx.fillText('Total Expenses: $' + totalExp.toLocaleString() + (totalExp > pfIncome ? ' \u26A0 OVER BUDGET' : ' \u2713 Within Budget'), W * 0.55, 65);

              ctx.fillStyle = '#94a3b8';

              ctx.fillText('Savings Rate: ' + (pfSavings / pfIncome * 100).toFixed(1) + '%', W * 0.55, 85);



              // Compound Interest Chart (right side)

              ctx.font = 'bold 14px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('\uD83D\uDCC8 Compound Interest Growth', W * 0.55, 130);

              var ciX = W * 0.55, ciY = 150, ciW = W * 0.4, ciH = H - 200;

              ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;

              ctx.strokeRect(ciX, ciY, ciW, ciH);

              // Growth curve

              var maxVal = pfPrincipal * Math.pow(1 + pfRate / 100, pfYears);

              ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2.5; ctx.beginPath();

              for (var yr = 0; yr <= pfYears; yr++) {

                var val = pfPrincipal * Math.pow(1 + pfRate / 100, yr);

                var cx2 = ciX + (yr / pfYears) * ciW;

                var cy2 = ciY + ciH - (val / maxVal) * ciH;

                yr === 0 ? ctx.moveTo(cx2, cy2) : ctx.lineTo(cx2, cy2);

              }

              ctx.stroke();

              // Fill under curve

              ctx.lineTo(ciX + ciW, ciY + ciH); ctx.lineTo(ciX, ciY + ciH); ctx.closePath();

              ctx.fillStyle = 'rgba(34,197,94,0.1)'; ctx.fill();

              // End value label

              ctx.font = 'bold 13px Inter, system-ui'; ctx.fillStyle = '#22c55e';

              ctx.fillText('$' + Math.round(maxVal).toLocaleString(), ciX + ciW - 80, ciY + 20);

              ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

              ctx.fillText('Year 0', ciX, ciY + ciH + 15);

              ctx.fillText('Year ' + pfYears, ciX + ciW - 40, ciY + ciH + 15);

              ctx.fillText('$' + pfPrincipal.toLocaleString() + ' @ ' + pfRate + '% for ' + pfYears + ' years', ciX, ciY + ciH + 30);

            }



            else if (econTab === 'stockMarket') {

              // â”€â”€ Stock Market Chart â”€â”€

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              var co = smCompanies[smSelected];

              if (!co) return;

              // Price chart area

              var chX = 60, chY = 50, chW = W - 120, chH = H * 0.55;

              // Chart background

              ctx.fillStyle = '#1e293b'; ctx.fillRect(chX, chY, chW, chH);

              // Grid

              ctx.strokeStyle = 'rgba(148,163,184,0.08)'; ctx.lineWidth = 1;

              for (var cgi = 0; cgi <= 5; cgi++) {

                var cgy = chY + cgi * chH / 5;

                ctx.beginPath(); ctx.moveTo(chX, cgy); ctx.lineTo(chX + chW, cgy); ctx.stroke();

              }

              // Price history line

              var hist = co.history;

              if (hist.length > 1) {

                var minP = Math.min.apply(null, hist) * 0.9;

                var maxP = Math.max.apply(null, hist) * 1.1;

                var priceRange = maxP - minP || 1;

                // Area fill

                ctx.beginPath();

                for (var hi = 0; hi < hist.length; hi++) {

                  var hx = chX + (hi / (hist.length - 1)) * chW;

                  var hy = chY + chH - ((hist[hi] - minP) / priceRange) * chH;

                  hi === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);

                }

                ctx.lineTo(chX + chW, chY + chH); ctx.lineTo(chX, chY + chH); ctx.closePath();

                ctx.fillStyle = co.color.replace(')', ',0.1)').replace('rgb', 'rgba');

                if (!ctx.fillStyle.startsWith('rgba')) ctx.fillStyle = 'rgba(59,130,246,0.1)';

                ctx.fill();

                // Line

                ctx.beginPath();

                for (var hi2 = 0; hi2 < hist.length; hi2++) {

                  var hx2 = chX + (hi2 / (hist.length - 1)) * chW;

                  var hy2 = chY + chH - ((hist[hi2] - minP) / priceRange) * chH;

                  hi2 === 0 ? ctx.moveTo(hx2, hy2) : ctx.lineTo(hx2, hy2);

                }

                ctx.strokeStyle = co.color; ctx.lineWidth = 2.5; ctx.stroke();

                // Moving average line (5-period)

                if (hist.length >= 5) {

                  ctx.strokeStyle = 'rgba(251,191,36,0.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath();

                  for (var mai = 4; mai < hist.length; mai++) {

                    var maVal = (hist[mai] + hist[mai - 1] + hist[mai - 2] + hist[mai - 3] + hist[mai - 4]) / 5;

                    var maxr = chX + (mai / (hist.length - 1)) * chW;

                    var mayr = chY + chH - ((maVal - minP) / priceRange) * chH;

                    mai === 4 ? ctx.moveTo(maxr, mayr) : ctx.lineTo(maxr, mayr);

                  }

                  ctx.stroke(); ctx.setLineDash([]);

                  ctx.font = '9px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                  ctx.fillText('MA(5)', chX + chW - 40, chY + 15);

                }

                // Current price dot

                var lastX = chX + chW;

                var lastY = chY + chH - ((hist[hist.length - 1] - minP) / priceRange) * chH;

                ctx.beginPath(); ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);

                ctx.fillStyle = co.color; ctx.fill();

                // Price labels

                ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                ctx.fillText('$' + maxP.toFixed(0), chX - 35, chY + 12);

                ctx.fillText('$' + minP.toFixed(0), chX - 35, chY + chH);

              }

              // Company header

              ctx.font = 'bold 18px Inter, system-ui'; ctx.fillStyle = co.color;

              ctx.fillText(co.ticker, chX, 30);

              ctx.font = '13px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

              ctx.fillText(co.name + ' | ' + co.sector, chX + 80, 30);

              ctx.font = 'bold 16px Inter, system-ui';

              var priceChange = hist.length > 1 ? hist[hist.length - 1] - hist[hist.length - 2] : 0;

              ctx.fillStyle = priceChange >= 0 ? '#22c55e' : '#ef4444';

              ctx.fillText('$' + co.price.toFixed(2) + ' ' + (priceChange >= 0 ? '\u25B2' : '\u25BC') + Math.abs(priceChange).toFixed(2), chX + chW - 150, 30);



              // Portfolio summary at bottom

              var portY = chY + chH + 30;

              ctx.font = 'bold 14px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('\uD83D\uDCBC Portfolio', chX, portY);

              ctx.font = '12px Inter, system-ui'; ctx.fillStyle = '#22c55e';

              ctx.fillText('Cash: $' + smCash.toFixed(2), chX + 120, portY);

              // Holdings

              var portVal = 0;

              var holdX = chX;

              smCompanies.forEach(function (c, ci) {

                var shares = (smPortfolio[c.ticker] || 0);

                if (shares > 0) {

                  portVal += shares * c.price;

                  ctx.fillStyle = c.color; ctx.font = '11px Inter, system-ui';

                  ctx.fillText(c.ticker + ': ' + shares + ' ($' + (shares * c.price).toFixed(0) + ')', holdX, portY + 25);

                  holdX += 140;

                }

              });

              ctx.font = 'bold 12px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

              ctx.fillText('Total Value: $' + (smCash + portVal).toFixed(2), chX + chW - 180, portY);

              // News banner

              if (smNews) {

                ctx.fillStyle = 'rgba(251,191,36,0.15)';

                ctx.fillRect(chX, portY + 45, chW, 30);

                ctx.font = 'bold 11px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                ctx.fillText('\uD83D\uDCF0 ' + smNews, chX + 10, portY + 65);

              }

            }



            else if (econTab === 'macro') {

              // â”€â”€ National Economy Dashboard â”€â”€

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              ctx.font = 'bold 18px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('\uD83C\uDFDB\uFE0F National Economy â€” Year ' + macroYear, 30, 35);

              // Indicator gauges

              var indicators = [

                { label: 'GDP Growth', val: macroGDP, unit: '%', good: macroGDP > 0, color: macroGDP > 2 ? '#22c55e' : macroGDP > 0 ? '#fbbf24' : '#ef4444' },

                { label: 'Inflation', val: macroInflation, unit: '%', good: macroInflation < 3, color: macroInflation > 5 ? '#ef4444' : macroInflation > 3 ? '#fbbf24' : '#22c55e' },

                { label: 'Interest Rate', val: macroInterest, unit: '%', good: macroInterest < 5, color: macroInterest > 7 ? '#ef4444' : macroInterest > 4 ? '#fbbf24' : '#22c55e' },

                { label: 'Unemployment', val: macroUnemployment, unit: '%', good: macroUnemployment < 5, color: macroUnemployment > 7 ? '#ef4444' : macroUnemployment > 4 ? '#fbbf24' : '#22c55e' },

                { label: 'Trade Balance', val: macroTrade, unit: '%', good: macroTrade > 0, color: macroTrade > 0 ? '#22c55e' : macroTrade > -2 ? '#fbbf24' : '#ef4444' }

              ];

              var gaugeW = (W - 80) / 5;

              indicators.forEach(function (ind, ii) {

                var gx2 = 40 + ii * gaugeW;

                // Background bar

                ctx.fillStyle = '#1e293b'; ctx.fillRect(gx2, 60, gaugeW - 10, 50);

                // Value bar

                var pct = Math.min(1, Math.abs(ind.val) / 10);

                ctx.fillStyle = ind.color;

                ctx.fillRect(gx2, 60, (gaugeW - 10) * pct, 50);

                ctx.globalAlpha = 0.3; ctx.fillRect(gx2, 60, (gaugeW - 10) * pct, 50); ctx.globalAlpha = 1;

                // Labels

                ctx.font = 'bold 11px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                ctx.fillText(ind.label, gx2 + 5, 80);

                ctx.font = 'bold 16px Inter, system-ui'; ctx.fillStyle = ind.color;

                ctx.fillText((ind.val >= 0 ? '+' : '') + ind.val.toFixed(1) + ind.unit, gx2 + 5, 100);

              });

              // History chart

              if (macroHistory.length > 1) {

                var mhX = 40, mhY = 140, mhW = W - 80, mhH = H - 200;

                ctx.fillStyle = '#1e293b'; ctx.fillRect(mhX, mhY, mhW, mhH);

                // Plot GDP line

                var gdpVals = macroHistory.map(function (h) { return h.gdp; });

                var gdpMin = Math.min.apply(null, gdpVals) - 1;

                var gdpMax = Math.max.apply(null, gdpVals) + 1;

                var gdpRange = gdpMax - gdpMin || 1;

                ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.beginPath();

                gdpVals.forEach(function (v, vi) {

                  var x = mhX + (vi / Math.max(1, gdpVals.length - 1)) * mhW;

                  var y = mhY + mhH - ((v - gdpMin) / gdpRange) * mhH;

                  vi === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);

                });

                ctx.stroke();

                // Plot inflation line

                var infVals = macroHistory.map(function (h) { return h.inflation; });

                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.beginPath();

                infVals.forEach(function (v, vi) {

                  var infRange = (Math.max.apply(null, infVals) + 1) - (Math.min.apply(null, infVals) - 1) || 1;

                  var infMin = Math.min.apply(null, infVals) - 1;

                  var x = mhX + (vi / Math.max(1, infVals.length - 1)) * mhW;

                  var y = mhY + mhH - ((v - infMin) / infRange) * mhH;

                  vi === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);

                });

                ctx.stroke(); ctx.setLineDash([]);

                // Legend

                ctx.font = '10px Inter, system-ui';

                ctx.fillStyle = '#22c55e'; ctx.fillText('\u2014 GDP Growth', mhX + 10, mhY + 15);

                ctx.fillStyle = '#ef4444'; ctx.fillText('--- Inflation', mhX + 110, mhY + 15);

                ctx.fillStyle = '#64748b';

                ctx.fillText('Year ' + (macroHistory[0].year || 2025), mhX, mhY + mhH + 15);

                ctx.fillText('Year ' + (macroHistory[macroHistory.length - 1].year || macroYear), mhX + mhW - 60, mhY + mhH + 15);

              } else {

                ctx.font = '14px Inter, system-ui'; ctx.fillStyle = '#64748b'; ctx.textAlign = 'center';

                ctx.fillText('Click "Next Year" to simulate national economic policy changes', W / 2, H / 2);

                ctx.font = '11px Inter, system-ui'; ctx.fillStyle = '#475569';

                ctx.fillText('AI will generate policy events that cascade to all other simulators', W / 2, H / 2 + 25);

                ctx.textAlign = 'left';

              }

            }



            else if (econTab === 'entrepreneur') {

              // â”€â”€ Lemonade Stand â”€â”€

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              // Weather display

              var weatherEmoji = enWeather === 'sunny' ? '\u2600\uFE0F' : enWeather === 'cloudy' ? '\u2601\uFE0F' : enWeather === 'rainy' ? '\uD83C\uDF27\uFE0F' : '\uD83C\uDF24\uFE0F';

              ctx.font = 'bold 40px Inter, system-ui'; ctx.fillText(weatherEmoji, W / 2 - 25, 60);

              ctx.font = 'bold 16px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('Day ' + enDay + ' | ' + enWeather.charAt(0).toUpperCase() + enWeather.slice(1), W / 2 - 60, 90);



              // Lemonade stand illustration

              ctx.fillStyle = '#fbbf24';

              ctx.fillRect(W / 2 - 60, 110, 120, 80);

              ctx.fillStyle = '#f59e0b';

              ctx.beginPath(); ctx.moveTo(W / 2 - 80, 110); ctx.lineTo(W / 2, 85); ctx.lineTo(W / 2 + 80, 110); ctx.closePath(); ctx.fill();

              ctx.font = 'bold 12px Inter, system-ui'; ctx.fillStyle = '#7c2d12';

              ctx.fillText('LEMONADE', W / 2 - 35, 155);

              ctx.fillText('$' + enPrice.toFixed(2), W / 2 - 15, 175);



              // Cash register

              ctx.font = 'bold 20px Inter, system-ui'; ctx.fillStyle = '#22c55e';

              ctx.fillText('\uD83D\uDCB5 $' + enCash.toFixed(2), W / 2 - 50, 230);



              // Daily stats

              ctx.font = '13px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

              ctx.fillText('Price per cup: $' + enPrice.toFixed(2), 40, 270);

              ctx.fillText('Cups prepared: ' + enCups, 40, 290);

              ctx.fillText('Ad budget: $' + enAdBudget.toFixed(2), 40, 310);

              // Cost breakdown

              var cupCost = 0.25; var lemonCost = 0.15; var sugarCost = 0.05;

              var totalCostPerCup = cupCost + lemonCost + sugarCost;

              var dailyFixedCost = enCups * totalCostPerCup + enAdBudget;

              ctx.fillStyle = '#ef4444';

              ctx.fillText('Cost/cup: $' + totalCostPerCup.toFixed(2) + ' (cup $0.25 + lemon $0.15 + sugar $0.05)', 40, 340);

              ctx.fillText('Daily costs: $' + dailyFixedCost.toFixed(2), 40, 360);

              // Break-even

              var breakEven = dailyFixedCost / Math.max(0.01, enPrice - totalCostPerCup);

              ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 12px Inter, system-ui';

              ctx.fillText('Break-even: ' + Math.ceil(breakEven) + ' cups', 40, 390);



              // Profit history chart

              if (enHistory.length > 0) {

                var phX = W * 0.55, phY = 260, phW = W * 0.4, phH = 170;

                ctx.fillStyle = '#1e293b'; ctx.fillRect(phX, phY, phW, phH);

                ctx.font = 'bold 12px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                ctx.fillText('Profit History', phX, phY - 8);

                var maxProfit = Math.max.apply(null, enHistory.map(function (h) { return Math.abs(h.profit); })) || 1;

                var zeroY = phY + phH / 2;

                ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;

                ctx.beginPath(); ctx.moveTo(phX, zeroY); ctx.lineTo(phX + phW, zeroY); ctx.stroke();

                ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.beginPath();

                enHistory.forEach(function (h, hi) {

                  var hx3 = phX + (hi / (Math.max(1, enHistory.length - 1))) * phW;

                  var hy3 = zeroY - (h.profit / maxProfit) * phH / 2;

                  hi === 0 ? ctx.moveTo(hx3, hy3) : ctx.lineTo(hx3, hy3);

                });

                ctx.stroke();

                // Dots

                enHistory.forEach(function (h, hi) {

                  var hx4 = phX + (hi / (Math.max(1, enHistory.length - 1))) * phW;

                  var hy4 = zeroY - (h.profit / maxProfit) * phH / 2;

                  ctx.beginPath(); ctx.arc(hx4, hy4, 3, 0, Math.PI * 2);

                  ctx.fillStyle = h.profit >= 0 ? '#22c55e' : '#ef4444'; ctx.fill();

                });

              }

            }

          }, 0);



          return React.createElement('div', { className: 'max-w-4xl mx-auto' },

            // Header

            React.createElement('div', { className: 'flex items-center gap-3 mb-4' },

              React.createElement('button', {

                onClick: function () { setStemLabTool(null); },

                className: 'text-slate-400 hover:text-white transition-colors text-lg'

              }, '\u2190'),

              React.createElement('h2', { className: 'text-xl font-bold text-slate-800' }, '\uD83D\uDCB0 Economics Lab'),

              React.createElement('span', { className: 'text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full' }, '5 simulators'),

              React.createElement('span', {

                className: 'text-[9px] font-bold px-2 py-0.5 rounded-full border ' +

                  (econLiteracyScore >= 80 ? 'text-green-700 bg-green-50 border-green-200' :

                    econLiteracyScore >= 50 ? 'text-blue-700 bg-blue-50 border-blue-200' :

                      econLiteracyScore >= 25 ? 'text-amber-700 bg-amber-50 border-amber-200' :

                        'text-slate-500 bg-slate-50 border-slate-200')

              }, '\uD83C\uDF93 Literacy: ' + econLiteracyScore + '%'),

              React.createElement('span', { className: 'text-[9px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200' }, '\uD83D\uDCDA AI-Powered Learning'),

              econAchievements.length > 0 && React.createElement('span', {

                className: 'text-[9px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 cursor-pointer',

                onClick: function () { upd('showAchievements', !(d.showAchievements)); }

              }, '\uD83C\uDFC6 ' + econAchievements.length + ' achievements'),

              React.createElement('span', {

                className: 'text-[9px] text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 cursor-pointer',

                onClick: function () { upd('showGlossary', !(d.showGlossary)); }

              }, '\uD83D\uDCD6 Glossary (' + (d.econGlossary || []).length + ')'),

              React.createElement('button', {

                onClick: function () { upd('showQuiz', !(d.showQuiz)); },

                className: 'text-[9px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 cursor-pointer font-bold'

              }, '\u270D\uFE0F Quiz Me'),

              React.createElement('button', {

                onClick: function () { upd('showAdvisor', !(d.showAdvisor)); },

                className: 'text-[9px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 cursor-pointer font-bold'

              }, '\uD83E\uDDD1\u200D\uD83C\uDFEB Ask Tutor'),

              React.createElement('select', {

                value: d.econDifficulty || 'medium',

                onChange: function (e) { upd('econDifficulty', e.target.value); if (addToast) addToast('Difficulty: ' + e.target.value.toUpperCase(), 'info'); },

                className: 'text-[9px] bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 text-slate-600 outline-none cursor-pointer'

              },

                React.createElement('option', { value: 'easy' }, '\uD83C\uDF31 Easy'),

                React.createElement('option', { value: 'medium' }, '\u2699\uFE0F Medium'),

                React.createElement('option', { value: 'hard' }, '\uD83D\uDD25 Hard')

              )

            ),

            // Tab bar

            React.createElement('div', { className: 'flex gap-1 mb-4 bg-slate-100 rounded-xl p-1' },

              [

                { id: 'supplyDemand', label: '\uD83D\uDCC9 Supply & Demand' },

                { id: 'personalFinance', label: '\uD83C\uDFE6 Personal Finance' },

                { id: 'stockMarket', label: '\uD83D\uDCC8 Stock Market' },

                { id: 'entrepreneur', label: '\uD83C\uDFEA Business Sim' },

                { id: 'macro', label: '\uD83C\uDFDB\uFE0F National Economy' }

              ].map(function (tab) {

                return React.createElement('button', {

                  key: tab.id,

                  onClick: function () { upd('econTab', tab.id); },

                  className: 'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ' +

                    (econTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')

                }, tab.label);

              })

            ),

            // Achievement panel

            d.showAchievements && React.createElement('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 mb-4' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFC6 Achievements (' + econAchievements.length + '/20)'),

                React.createElement('button', { onClick: function () { upd('showAchievements', false); }, className: 'text-amber-400 hover:text-amber-600 text-xs' }, '\u2715')

              ),

              React.createElement('div', { className: 'grid grid-cols-4 gap-2' },

                econAchievements.map(function (a, ai) {

                  return React.createElement('div', { key: ai, className: 'bg-white rounded-lg p-2 text-center border border-amber-100 shadow-sm' },

                    React.createElement('div', { className: 'text-xl' }, a.icon),

                    React.createElement('div', { className: 'text-[9px] font-bold text-amber-800 mt-1' }, a.title),

                    React.createElement('div', { className: 'text-[8px] text-amber-600' }, a.desc)

                  );

                })

              )

            ),

            // Glossary panel

            d.showGlossary && React.createElement('div', { className: 'bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200 mb-4 max-h-60 overflow-y-auto' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-violet-800' }, '\uD83D\uDCD6 Economics Glossary (' + (d.econGlossary || []).length + ' concepts learned)'),

                React.createElement('button', { onClick: function () { upd('showGlossary', false); }, className: 'text-violet-400 hover:text-violet-600 text-xs' }, '\u2715')

              ),

              (d.econGlossary || []).length === 0 ? React.createElement('p', { className: 'text-xs text-violet-500 text-center py-4' }, 'Play the simulations to discover economics concepts! Each event teaches a new concept that gets added here.') :

                React.createElement('div', { className: 'space-y-2' },

                  (d.econGlossary || []).map(function (g, gi) {

                    return React.createElement('div', { key: gi, className: 'bg-white rounded-lg p-2 border border-violet-100' },

                      React.createElement('div', { className: 'flex items-center gap-2' },

                        React.createElement('span', { className: 'text-[9px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-bold' }, g.tab),

                        React.createElement('span', { className: 'text-[10px] font-bold text-slate-700' }, g.concept)

                      ),

                      React.createElement('p', { className: 'text-[9px] text-slate-500 mt-1' }, g.explanation)

                    );

                  })

                )

            ),

            // Quiz mode

            d.showQuiz && React.createElement('div', { className: 'bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200 mb-4' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-rose-800' }, '\u270D\uFE0F Economics Quiz'),

                React.createElement('button', { onClick: function () { upd('showQuiz', false); upd('quizQuestion', null); }, className: 'text-rose-400 hover:text-rose-600 text-xs' }, '\u2715')

              ),

              d.quizQuestion ? React.createElement('div', null,

                React.createElement('p', { className: 'text-xs text-slate-700 font-bold mb-3' }, d.quizQuestion.question),

                React.createElement('div', { className: 'grid gap-2' },

                  (d.quizQuestion.options || []).map(function (opt, oi) {

                    var isAnswered = d.quizAnswer !== undefined && d.quizAnswer !== null;

                    var isCorrect = oi === d.quizQuestion.correctIndex;

                    var isSelected = d.quizAnswer === oi;

                    return React.createElement('button', {

                      key: oi,

                      onClick: function () {

                        if (isAnswered) return;

                        upd('quizAnswer', oi);

                        upd('quizScore', (d.quizScore || 0) + (oi === d.quizQuestion.correctIndex ? 1 : 0));

                        if (oi === d.quizQuestion.correctIndex && typeof addXP === 'function') addXP(20, 'Economics Quiz: Correct answer!');

                        upd('quizTotal', (d.quizTotal || 0) + 1);

                      },

                      className: 'w-full text-left p-3 rounded-xl border-2 text-xs transition-all ' +

                        (isAnswered && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :

                          isAnswered && isSelected && !isCorrect ? 'border-red-400 bg-red-50 text-red-800' :

                            isAnswered ? 'border-slate-200 bg-white text-slate-400' :

                              'border-rose-100 bg-white hover:border-rose-400 text-slate-700')

                    }, (isAnswered && isCorrect ? '\u2705 ' : isAnswered && isSelected ? '\u274C ' : '') + opt);

                  })

                ),

                d.quizAnswer !== undefined && d.quizAnswer !== null && React.createElement('div', { className: 'mt-3 bg-white rounded-lg p-3 border border-rose-100' },

                  React.createElement('p', { className: 'text-xs text-slate-600' },

                    React.createElement('span', { className: 'font-bold text-rose-700' }, '\uD83D\uDCDA Explanation: '),

                    d.quizQuestion.explanation

                  )

                ),

                d.quizAnswer !== undefined && d.quizAnswer !== null && React.createElement('button', {

                  onClick: function () { upd('quizQuestion', null); upd('quizAnswer', null); },

                  className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200'

                }, '\u27A1\uFE0F Next Question')

              ) :

                React.createElement('div', { className: 'text-center' },

                  React.createElement('div', { className: 'text-xs text-slate-500 mb-2' }, 'Score: ' + (d.quizScore || 0) + '/' + (d.quizTotal || 0) + (d.quizTotal > 0 ? ' (' + Math.round((d.quizScore || 0) / (d.quizTotal || 1) * 100) + '%)' : '')),

                  React.createElement('button', {

                    onClick: function () {

                      upd('quizLoading', true);

                      var topics = (d.econGlossary || []).map(function (g) { return g.concept; }).join(', ') || 'supply and demand, inflation, GDP, interest rates, opportunity cost';

                      var prompt = 'You are an economics teacher creating a quiz. The student has studied these topics: ' + topics + '.\n\nGenerate 1 multiple-choice question. Return ONLY valid JSON:\n{"question":"<question text>","options":["<option A>","<option B>","<option C>","<option D>"],"correctIndex":<0-3>,"explanation":"<2-3 sentence explanation of the correct answer and the underlying economic concept>"}\n\nMake questions that test UNDERSTANDING, not just definitions. Include real-world application questions, cause-and-effect reasoning, and scenario-based problems. Vary difficulty.';

                      callGemini(prompt, true).then(function (result) {

                        try {

                          var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                          var s = cleaned.indexOf('{'); if (s > 0) cleaned = cleaned.substring(s);

                          var e = cleaned.lastIndexOf('}'); if (e > 0) cleaned = cleaned.substring(0, e + 1);

                          upd('quizQuestion', JSON.parse(cleaned));

                          upd('quizAnswer', null);

                          upd('quizLoading', false);

                        } catch (err) { upd('quizLoading', false); if (addToast) addToast('Quiz generation failed', 'error'); }

                      }).catch(function () { upd('quizLoading', false); });

                    },

                    disabled: d.quizLoading,

                    className: 'py-3 px-8 rounded-xl text-sm font-bold transition-all ' + (d.quizLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-lg')

                  }, d.quizLoading ? '\u23F3 Generating...' : '\uD83C\uDFB2 Generate Quiz Question')

                )

            ),

            // AI Economic Advisor

            d.showAdvisor && React.createElement('div', { className: 'bg-gradient-to-r from-sky-50 to-cyan-50 rounded-xl p-4 border border-sky-200 mb-4' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-sky-800' }, '\uD83E\uDDD1\u200D\uD83C\uDFEB AI Economics Tutor'),

                React.createElement('button', { onClick: function () { upd('showAdvisor', false); }, className: 'text-sky-400 hover:text-sky-600 text-xs' }, '\u2715')

              ),

              d.advisorAnswer && React.createElement('div', { className: 'bg-white rounded-lg p-3 border border-sky-100 mb-3 text-xs text-slate-700 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto' },

                d.advisorAnswer

              ),

              React.createElement('div', { className: 'flex gap-2' },

                React.createElement('input', {

                  type: 'text',

                  value: d.advisorInput || '',

                  onChange: function (e) { upd('advisorInput', e.target.value); },

                  onKeyDown: function (e) { if (e.key === 'Enter' && (d.advisorInput || '').trim()) { document.getElementById('econ-advisor-ask').click(); } },

                  placeholder: 'Ask any economics question...',

                  className: 'flex-1 px-3 py-2 border-2 border-sky-200 rounded-xl text-xs focus:border-sky-400 outline-none'

                }),

                React.createElement('button', {

                  id: 'econ-advisor-ask',

                  onClick: function () {

                    if (!(d.advisorInput || '').trim()) return;

                    upd('advisorLoading', true);

                    var context = 'Student is using an economics simulator with: Supply & Demand (equilibrium, shifts, price controls), Personal Finance Life Sim (age ' + (d.pfAge || 22) + ', salary $' + (d.pfSalary || 35000) + ', credit ' + (d.pfCredit || 650) + '), Stock Market (day ' + (d.smDay || 0) + '), Business Sim (day ' + (d.enBizDay || 0) + '), and National Economy (GDP ' + (d.macroGDP || 2.1) + '%, inflation ' + (d.macroInflation || 3.2) + '%, interest ' + (d.macroInterest || 5.25) + '%).';

                    var prompt = 'You are a friendly economics tutor for students. ' + context + '\n\nStudent asks: "' + d.advisorInput.trim() + '"\n\nProvide a clear, educational answer. Use real-world examples. If relevant, explain how this connects to what the student is experiencing in their simulation. Keep the answer concise but thorough (3-5 paragraphs max). Use simple language appropriate for students.';

                    callGemini(prompt, true).then(function (result) {

                      upd('advisorAnswer', result);

                      upd('advisorLoading', false);

                      upd('advisorInput', '');

                      // Add to glossary

                      var gl = (d.econGlossary || []).slice();

                      var exists = gl.some(function (g) { return g.concept === d.advisorInput.trim().substring(0, 50); });

                      if (!exists && gl.length < 100) { gl.push({ tab: 'Advisor', concept: d.advisorInput.trim().substring(0, 50), explanation: result.substring(0, 200) + '...' }); upd('econGlossary', gl); }

                      if (typeof addXP === 'function') addXP(10, 'Asked an economics question');

                    }).catch(function () { upd('advisorLoading', false); });

                  },

                  disabled: d.advisorLoading || !(d.advisorInput || '').trim(),

                  className: 'px-4 py-2 rounded-xl text-xs font-bold ' + (d.advisorLoading ? 'bg-slate-300 text-slate-500' : 'bg-sky-500 text-white')

                }, d.advisorLoading ? '\u23F3' : '\uD83D\uDCAC Ask')

              ),

              // Quick question suggestions

              !d.advisorAnswer && React.createElement('div', { className: 'flex flex-wrap gap-1 mt-2' },

                ['What is inflation?', 'How do interest rates work?', 'What causes a recession?', 'Why diversify investments?', 'What is GDP?', 'How do taxes work?'].map(function (q) {

                  return React.createElement('button', {

                    key: q,

                    onClick: function () { upd('advisorInput', q); },

                    className: 'text-[9px] px-2 py-1 rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200'

                  }, q);

                })

              )

            ),

            // Macro indicators banner (always visible)

            (d.macroHistory || []).length > 0 && React.createElement('div', { className: 'flex gap-2 mb-2 bg-slate-800 rounded-lg px-3 py-1.5 text-[9px] font-mono text-slate-300 overflow-x-auto' },

              React.createElement('span', { className: 'text-slate-500' }, '\uD83C\uDFDB\uFE0F MACRO |'),

              React.createElement('span', { className: macroGDP >= 0 ? 'text-green-400' : 'text-red-400' }, 'GDP ' + (macroGDP >= 0 ? '+' : '') + macroGDP.toFixed(1) + '%'),

              React.createElement('span', { className: macroInflation > 4 ? 'text-red-400' : macroInflation > 2 ? 'text-amber-400' : 'text-green-400' }, 'INF ' + macroInflation.toFixed(1) + '%'),

              React.createElement('span', { className: macroInterest > 6 ? 'text-red-400' : 'text-amber-400' }, 'INT ' + macroInterest.toFixed(2) + '%'),

              React.createElement('span', { className: macroUnemployment > 5 ? 'text-red-400' : 'text-green-400' }, 'UNEMP ' + macroUnemployment.toFixed(1) + '%'),

              React.createElement('span', { className: macroTrade >= 0 ? 'text-green-400' : 'text-amber-400' }, 'TRADE ' + (macroTrade >= 0 ? '+' : '') + macroTrade.toFixed(1) + '%')

            ),

            // Canvas

            React.createElement('canvas', {

              ref: canvasRef,

              className: 'w-full rounded-xl border border-slate-200',

              style: { height: '250px', background: '#0f172a' }

            }),

            // Controls (below canvas, based on active tab)

            econTab === 'supplyDemand' && React.createElement('div', { className: 'mt-4' },

              // Educational Concept Panel

              React.createElement('div', { className: 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 mb-4' },

                React.createElement('h4', { className: 'text-sm font-bold text-blue-800 mb-2' }, '\uD83D\uDCDA Key Concepts'),

                React.createElement('div', { className: 'grid grid-cols-2 gap-3 text-[10px] text-slate-600 leading-relaxed' },

                  React.createElement('div', null,

                    React.createElement('span', { className: 'font-bold text-blue-700' }, 'Law of Demand: '),

                    'As price \u2191, quantity demanded \u2193. Consumers buy less when prices rise. The demand curve slopes downward.'

                  ),

                  React.createElement('div', null,

                    React.createElement('span', { className: 'font-bold text-red-600' }, 'Law of Supply: '),

                    'As price \u2191, quantity supplied \u2191. Producers make more when prices are high. The supply curve slopes upward.'

                  ),

                  React.createElement('div', null,

                    React.createElement('span', { className: 'font-bold text-amber-600' }, 'Equilibrium: '),

                    'Where supply meets demand. This "E" point sets the market price (P*) and quantity (Q*) automatically.'

                  ),

                  React.createElement('div', null,

                    React.createElement('span', { className: 'font-bold text-emerald-600' }, 'Shifts vs. Movements: '),

                    'Changing the price moves ALONG a curve. External factors (technology, income, preferences) SHIFT the entire curve.'

                  )

                ),

                // Dynamic educational feedback based on current slider values

                (sdPriceFloor > 0 || sdPriceCeiling > 0 || sdTax > 0 || sdDemandShift !== 0 || sdSupplyShift !== 0) && React.createElement('div', { className: 'mt-3 bg-white rounded-lg p-3 border border-blue-100' },

                  React.createElement('h5', { className: 'text-[10px] font-bold text-indigo-700 mb-1' }, '\uD83D\uDCA1 What\'s Happening Right Now:'),

                  React.createElement('div', { className: 'text-[10px] text-slate-600 space-y-1' },

                    sdDemandShift > 0 && React.createElement('p', null, '\u25B6 Demand shifted RIGHT \u2014 More people want this product (maybe income rose, or a trend made it popular). This raises both equilibrium price AND quantity.'),

                    sdDemandShift < 0 && React.createElement('p', null, '\u25B6 Demand shifted LEFT \u2014 Fewer people want this product (substitute became cheaper, or preferences changed). Both price AND quantity fall.'),

                    sdSupplyShift > 0 && React.createElement('p', null, '\u25B6 Supply shifted RIGHT \u2014 Producers can make more cheaply (new technology, lower input costs). Price falls, but quantity rises.'),

                    sdSupplyShift < 0 && React.createElement('p', null, '\u25B6 Supply shifted LEFT \u2014 Production became harder (natural disaster, regulations). Price rises, but quantity falls.'),

                    sdPriceFloor > 0 && React.createElement('p', null, '\u25B6 Price Floor at $' + sdPriceFloor + ' \u2014 Government sets a MINIMUM price (e.g., minimum wage). If above equilibrium: creates SURPLUS (quantity supplied > quantity demanded). Workers want jobs, but firms hire fewer.'),

                    sdPriceCeiling > 0 && React.createElement('p', null, '\u25B6 Price Ceiling at $' + sdPriceCeiling + ' \u2014 Government sets a MAXIMUM price (e.g., rent control). If below equilibrium: creates SHORTAGE (quantity demanded > quantity supplied). Everyone wants it, but not enough is produced.'),

                    sdTax > 0 && React.createElement('p', null, '\u25B6 Tax of $' + sdTax + ' \u2014 Government adds a per-unit tax. This creates a "tax wedge" between what buyers pay and sellers receive. Both sides bear some of the tax burden. This creates DEADWEIGHT LOSS \u2014 transactions that would have benefited both parties no longer happen.')

                  )

                )

              ),

              React.createElement('div', { className: 'grid grid-cols-2 gap-4' },

                React.createElement('div', { className: 'space-y-3 bg-blue-50 rounded-xl p-4 border border-blue-200' },

                  React.createElement('h4', { className: 'text-sm font-bold text-blue-700' }, '\uD83D\uDCC9 Curve Shifts'),

                  React.createElement('label', { className: 'block text-xs text-blue-600' }, 'Demand Shift: ' + sdDemandShift),

                  React.createElement('input', {

                    type: 'range', min: -5, max: 5, value: sdDemandShift,

                    onChange: function (e) { upd('sdDemandShift', parseInt(e.target.value)); },

                    className: 'w-full accent-blue-500'

                  }),

                  React.createElement('label', { className: 'block text-xs text-red-600' }, 'Supply Shift: ' + sdSupplyShift),

                  React.createElement('input', {

                    type: 'range', min: -5, max: 5, value: sdSupplyShift,

                    onChange: function (e) { upd('sdSupplyShift', parseInt(e.target.value)); },

                    className: 'w-full accent-red-500'

                  })

                ),

                React.createElement('div', { className: 'space-y-3 bg-emerald-50 rounded-xl p-4 border border-emerald-200' },

                  React.createElement('h4', { className: 'text-sm font-bold text-emerald-700' }, '\u2696\uFE0F Government Controls'),

                  React.createElement('label', { className: 'block text-xs text-emerald-600' }, 'Price Floor: $' + sdPriceFloor),

                  React.createElement('input', {

                    type: 'range', min: 0, max: 90, value: sdPriceFloor,

                    onChange: function (e) { upd('sdPriceFloor', parseInt(e.target.value)); },

                    className: 'w-full accent-emerald-500'

                  }),

                  React.createElement('label', { className: 'block text-xs text-orange-600' }, 'Price Ceiling: $' + sdPriceCeiling),

                  React.createElement('input', {

                    type: 'range', min: 0, max: 90, value: sdPriceCeiling,

                    onChange: function (e) { upd('sdPriceCeiling', parseInt(e.target.value)); },

                    className: 'w-full accent-orange-500'

                  }),

                  React.createElement('label', { className: 'block text-xs text-purple-600' }, 'Tax: $' + sdTax),

                  React.createElement('input', {

                    type: 'range', min: 0, max: 30, value: sdTax,

                    onChange: function (e) { upd('sdTax', parseInt(e.target.value)); },

                    className: 'w-full accent-purple-500'

                  })

                )

              ),

              // Elasticity Education

              React.createElement('div', { className: 'col-span-2 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-3 border border-cyan-200 mb-2' },

                React.createElement('h4', { className: 'text-[10px] font-bold text-cyan-700 mb-1' }, '\uD83D\uDCCF Price Elasticity of Demand'),

                React.createElement('div', { className: 'text-[9px] text-slate-600 leading-relaxed' },

                  React.createElement('p', null, '\uD83D\uDCDA ',

                    React.createElement('strong', null, 'Elasticity'), ' measures how much quantity demanded changes when price changes. ',

                    React.createElement('strong', null, 'Elastic'), ' goods (luxury items, products with substitutes) see big demand drops from small price increases. ',

                    React.createElement('strong', null, 'Inelastic'), ' goods (necessities like medicine, gasoline) have stable demand regardless of price.'

                  ),

                  React.createElement('div', { className: 'grid grid-cols-3 gap-2 mt-2' },

                    React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center border border-cyan-100' },

                      React.createElement('div', { className: 'text-lg' }, '\uD83D\uDC8E'),

                      React.createElement('div', { className: 'text-[9px] font-bold text-cyan-700' }, 'Elastic (>1)'),

                      React.createElement('div', { className: 'text-[8px] text-slate-400' }, 'Luxury goods, restaurants, vacations')

                    ),

                    React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center border border-cyan-100' },

                      React.createElement('div', { className: 'text-lg' }, '\u2696\uFE0F'),

                      React.createElement('div', { className: 'text-[9px] font-bold text-cyan-700' }, 'Unit Elastic (=1)'),

                      React.createElement('div', { className: 'text-[8px] text-slate-400' }, 'Revenue unchanged by price')

                    ),

                    React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center border border-cyan-100' },

                      React.createElement('div', { className: 'text-lg' }, '\uD83D\uDC8A'),

                      React.createElement('div', { className: 'text-[9px] font-bold text-cyan-700' }, 'Inelastic (<1)'),

                      React.createElement('div', { className: 'text-[8px] text-slate-400' }, 'Medicine, gasoline, utilities')

                    )

                  )

                )

              ),

              // AI Scenario Generator

              React.createElement('div', { className: 'col-span-2 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200' },

                React.createElement('h4', { className: 'text-sm font-bold text-violet-700 mb-2' }, '\u2728 AI Scenario Generator'),

                d.sdScenario ? React.createElement('div', null,

                  React.createElement('div', { className: 'bg-white rounded-lg p-3 mb-2 border border-violet-100' },

                    React.createElement('h5', { className: 'text-xs font-bold text-slate-800' }, d.sdScenario.title),

                    React.createElement('p', { className: 'text-[10px] text-slate-600 mt-1' }, d.sdScenario.explanation),

                    React.createElement('div', { className: 'flex gap-2 mt-2 text-[10px]' },

                      React.createElement('span', { className: 'text-blue-600 font-bold' }, 'Demand: ' + (d.sdScenario.demandShift > 0 ? '+' : '') + d.sdScenario.demandShift),

                      React.createElement('span', { className: 'text-red-600 font-bold' }, 'Supply: ' + (d.sdScenario.supplyShift > 0 ? '+' : '') + d.sdScenario.supplyShift)

                    ),

                    d.sdScenario.lesson && React.createElement('div', { className: 'mt-2 bg-violet-100 rounded-lg px-3 py-2 text-[10px] text-violet-800 border border-violet-200' },

                      React.createElement('span', { className: 'font-bold' }, '\uD83D\uDCDA Concept: '),

                      d.sdScenario.lesson

                    )

                  ),

                  React.createElement('button', {

                    onClick: function () {

                      upd('sdDemandShift', d.sdScenario.demandShift || 0);

                      upd('sdSupplyShift', d.sdScenario.supplyShift || 0);

                      upd('sdPriceFloor', d.sdScenario.priceFloor || 0);

                      upd('sdPriceCeiling', d.sdScenario.priceCeiling || 0);

                      upd('sdTax', d.sdScenario.tax || 0);

                      if (addToast) addToast('\u2705 Scenario applied to graph!', 'success');

                      if (d.sdScenario && d.sdScenario.lesson) {

                        var gl5 = (d.econGlossary || []).slice();

                        var exists5 = gl5.some(function (g) { return g.concept === d.sdScenario.title; });

                        if (!exists5) { gl5.push({ tab: 'S&D', concept: d.sdScenario.title, explanation: d.sdScenario.lesson }); upd('econGlossary', gl5); }

                      }

                    },

                    className: 'w-full py-2 rounded-lg text-xs font-bold bg-violet-500 text-white mb-1'

                  }, '\u2705 Apply Scenario to Graph'),

                  React.createElement('button', {

                    onClick: function () { upd('sdScenario', null); },

                    className: 'w-full py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500'

                  }, 'Dismiss')

                ) : React.createElement('button', {

                  onClick: function () {

                    upd('sdLoading', true);

                    var prompt = 'You are an economics teacher. Generate a real-world supply and demand scenario for students.\n\nReturn ONLY valid JSON:\n{"title":"<short scenario title>","explanation":"<2-3 sentences explaining what happened and why it shifts supply/demand>","demandShift":<integer -5 to 5>,"supplyShift":<integer -5 to 5>,"priceFloor":<0 or number if relevant>,"priceCeiling":<0 or number if relevant>,"tax":<0 or number if relevant>}\n\nExamples: new iPhone launch (demand +3), oil embargo (supply -4), minimum wage law (price floor 40), rent control (price ceiling 30), sugar tax (tax 5). Be creative.\n\nIMPORTANT: Include a "lesson" field with a 1-2 sentence economics concept (e.g., elasticity, substitute goods, complement goods, deadweight loss, consumer surplus, producer surplus, market failure, externalities, public goods).';

                    callGemini(prompt, true).then(function (result) {

                      try {

                        var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                        var s = cleaned.indexOf('{'); if (s > 0) cleaned = cleaned.substring(s);

                        var e = cleaned.lastIndexOf('}'); if (e > 0) cleaned = cleaned.substring(0, e + 1);

                        upd('sdScenario', JSON.parse(cleaned));

                        upd('sdLoading', false);

                      } catch (err2) { upd('sdLoading', false); if (addToast) addToast('Scenario generation failed', 'error'); }

                    }).catch(function () { upd('sdLoading', false); });

                  },

                  disabled: d.sdLoading,

                  className: 'w-full py-3 rounded-xl text-xs font-bold transition-all ' + (d.sdLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg')

                }, d.sdLoading ? '\u23F3 Generating...' : '\uD83C\uDFB2 Generate Random Scenario')

              )

            ),



            econTab === 'personalFinance' && React.createElement('div', { className: 'mt-4' },

              // Life Sim Event Display

              d.lifeEvent ? React.createElement('div', { className: 'bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-5 border border-indigo-200 mb-4 shadow-sm' },

                React.createElement('div', { className: 'flex items-start gap-3 mb-4' },

                  React.createElement('span', { className: 'text-3xl' }, d.lifeEvent.emoji || '\uD83C\uDFB2'),

                  React.createElement('div', null,

                    React.createElement('h4', { className: 'text-sm font-bold text-slate-800' }, d.lifeEvent.title || 'Life Event'),

                    React.createElement('p', { className: 'text-xs text-slate-600 mt-1 leading-relaxed' }, d.lifeEvent.description),

                    d.lifeEvent.lesson && React.createElement('div', { className: 'mt-2 bg-indigo-100 rounded-lg px-3 py-2 text-[10px] text-indigo-800 border border-indigo-200' },

                      React.createElement('span', { className: 'font-bold' }, '\uD83D\uDCDA Economics Concept: '),

                      d.lifeEvent.lesson

                    )

                  )

                ),

                React.createElement('div', { className: 'grid gap-2' },

                  (d.lifeEvent.choices || []).map(function (choice, ci) {

                    return React.createElement('button', {

                      key: ci,

                      onClick: function () {

                        var eff = choice.effect || {};

                        upd('pfCash', (d.pfCash || 2000) + (eff.cash || 0));

                        upd('pfDebt', Math.max(0, (d.pfDebt || 0) + (eff.debt || 0)));

                        upd('pfSalary', Math.max(0, (d.pfSalary || 35000) + (eff.salary || 0)));

                        upd('pfHappiness', Math.min(100, Math.max(0, (d.pfHappiness || 70) + (eff.happiness || 0))));

                        upd('pfCredit', Math.min(850, Math.max(300, (d.pfCredit || 650) + (eff.credit || 0))));

                        if (eff.career) upd('pfCareer', eff.career);

                        if (eff.insurance !== undefined && eff.insurance !== null) upd('pfInsurance', eff.insurance);

                        var h = (d.pfHistory || []).slice(-29);

                        h.push({ age: d.pfAge || 22, cash: (d.pfCash || 2000) + (eff.cash || 0), debt: Math.max(0, (d.pfDebt || 0) + (eff.debt || 0)), event: d.lifeEvent.title, choice: choice.label });

                        upd('pfHistory', h);

                        // Apply housing costs

                        var housingCost = { renting: 12000, owning: 21600, frugal: 6000 };

                        var hCost = housingCost[d.pfHousing || 'renting'] || 12000;

                        // If owning, build equity (30% of payment goes to equity)

                        if ((d.pfHousing || 'renting') === 'owning') {

                          upd('pfEquity', (d.pfEquity || 0) + Math.round(hCost * 0.3));

                        }

                        upd('pfCash', (d.pfCash || 2000) + (eff.cash || 0) - hCost);

                        // Apply investment returns

                        if ((d.pfInvestPct || 0) > 0 && d.pfInvestType) {

                          var investAmt = (d.pfSalary || 35000) * (d.pfInvestPct || 0) / 100;

                          var returns = { Conservative: 0.04, Balanced: 0.07, Aggressive: 0.10, Speculative: (Math.random() - 0.3) * 0.5 };

                          var returnRate = returns[d.pfInvestType] || 0;

                          var gain = Math.round(investAmt * returnRate);

                          upd('pfCash', (d.pfCash || 2000) + (eff.cash || 0) + gain - investAmt);

                        }

                        upd('pfAge', (d.pfAge || 22) + 1);

                        upd('lifeEvent', null);

                        upd('pfLoading', false);

                        if (typeof addXP === 'function') addXP(15, 'Life Sim: Made a financial decision');

                        if (addToast) addToast((eff.cash >= 0 ? '\uD83D\uDCB0 +$' : '\uD83D\uDCC9 -$') + Math.abs(eff.cash || 0).toLocaleString() + ' | ' + choice.label, eff.cash >= 0 ? 'success' : 'warning');

                        // Auto-add lesson to glossary

                        if (d.lifeEvent && d.lifeEvent.lesson) {

                          var gl = (d.econGlossary || []).slice();

                          var exists = gl.some(function (g) { return g.concept === d.lifeEvent.title; });

                          if (!exists) { gl.push({ tab: 'Life Sim', concept: d.lifeEvent.title, explanation: d.lifeEvent.lesson }); upd('econGlossary', gl); }

                        }

                      },

                      className: 'w-full text-left p-3 rounded-xl border-2 border-indigo-100 hover:border-indigo-400 bg-white hover:bg-indigo-50 transition-all text-xs group'

                    },

                      React.createElement('div', { className: 'font-bold text-slate-700 group-hover:text-indigo-700' }, choice.label),

                      React.createElement('div', { className: 'text-slate-400 mt-0.5 flex gap-3 flex-wrap' },

                        choice.effect && choice.effect.cash ? React.createElement('span', { className: choice.effect.cash >= 0 ? 'text-green-600' : 'text-red-500' }, (choice.effect.cash >= 0 ? '+' : '') + '$' + choice.effect.cash.toLocaleString()) : null,

                        choice.effect && choice.effect.debt ? React.createElement('span', { className: 'text-orange-500' }, 'Debt ' + (choice.effect.debt > 0 ? '+' : '') + '$' + choice.effect.debt.toLocaleString()) : null,

                        choice.effect && choice.effect.salary ? React.createElement('span', { className: 'text-blue-500' }, 'Salary ' + (choice.effect.salary > 0 ? '+' : '') + '$' + choice.effect.salary.toLocaleString()) : null,

                        choice.effect && choice.effect.happiness ? React.createElement('span', { className: choice.effect.happiness >= 0 ? 'text-pink-500' : 'text-slate-500' }, (choice.effect.happiness > 0 ? '+' : '') + choice.effect.happiness + ' happiness') : null,

                        choice.effect && choice.effect.credit ? React.createElement('span', { className: choice.effect.credit >= 0 ? 'text-emerald-500' : 'text-orange-500' }, (choice.effect.credit > 0 ? '+' : '') + choice.effect.credit + ' credit') : null

                      )

                    );

                  })

                )

              ) : null,

              // Stats bar

              React.createElement('div', { className: 'grid grid-cols-5 gap-2 mb-4' },

                [

                  { label: 'Age', val: (d.pfAge || 22), icon: '\uD83C\uDF82', color: 'indigo' },

                  { label: 'Cash', val: '$' + (d.pfCash || 2000).toLocaleString(), icon: '\uD83D\uDCB5', color: (d.pfCash || 2000) >= 0 ? 'green' : 'red' },

                  { label: 'Debt', val: '$' + (d.pfDebt || 0).toLocaleString(), icon: '\uD83D\uDCB3', color: (d.pfDebt || 0) > 0 ? 'red' : 'green' },

                  { label: 'Happiness', val: (d.pfHappiness || 70) + '%', icon: '\u2764\uFE0F', color: (d.pfHappiness || 70) > 50 ? 'pink' : 'slate' },

                  { label: 'Credit', val: (d.pfCredit || 650), icon: '\uD83D\uDCB3', color: (d.pfCredit || 650) > 700 ? 'green' : (d.pfCredit || 650) > 580 ? 'amber' : 'red' }

                ].map(function (s) {

                  return React.createElement('div', { key: s.label, className: 'bg-white rounded-xl p-3 border border-slate-200 text-center' },

                    React.createElement('div', { className: 'text-lg' }, s.icon),

                    React.createElement('div', { className: 'text-[10px] text-slate-400 font-bold uppercase tracking-wide' }, s.label),

                    React.createElement('div', { className: 'text-sm font-bold text-' + s.color + '-600' }, s.val)

                  );

                })

              ),

              React.createElement('div', { className: 'text-xs text-slate-400 text-center mb-2' }, (d.pfCareer ? '\uD83D\uDCBC ' + d.pfCareer + ' | ' : '') + 'Salary: $' + (d.pfSalary || 35000).toLocaleString() + '/yr | Net Worth: $' + ((d.pfCash || 2000) - (d.pfDebt || 0)).toLocaleString() + ' | Credit: ' + (d.pfCredit || 650) + (d.pfInsurance ? ' | \uD83D\uDEE1\uFE0F Insured' : ' | \u26A0\uFE0F No Insurance')),

              // Next Year / Generate Event button

              !d.lifeEvent && React.createElement('button', {

                onClick: function () {

                  upd('pfLoading', true);

                  var prompt = 'You are a life simulation game engine (difficulty: ' + (d.econDifficulty || 'medium') + '). The player is ' + (d.pfAge || 22) + ' years old, earns $' + (d.pfSalary || 35000).toLocaleString() + '/year, has $' + (d.pfCash || 2000).toLocaleString() + ' in savings, $' + (d.pfDebt || 0).toLocaleString() + ' in debt, and ' + (d.pfHappiness || 70) + '% happiness.\n\nGenerate a realistic random life event with 3 choices. Return ONLY valid JSON:\n{"emoji":"<single emoji>","title":"<short title>","description":"<2-3 sentence scenario>","choices":[{"label":"<action description>","effect":{"cash":<number>,"debt":<number>,"salary":<number>,"happiness":<number>,"credit":<number -50 to 50>,"career":<optional string or null>,"insurance":<optional true/false or null>}}]}\n\nEvent categories to rotate through: CAREER (promotion, job offer, layoff, interview, raise negotiation, networking opportunity, career pivot, sabbatical), FINANCIAL (tax refund, bank error, stock tip, loan offer, credit card fraud, inheritance, gambling opportunity, unexpected bill), HOUSING (lease renewal, repair needed, roommate issue, property tax, home improvement, neighbor dispute), HEALTH (medical bill, gym membership, insurance claim, dental work, mental health day), EDUCATION (online course, certification, student loan, scholarship, mentorship), SOCIAL (wedding, baby shower, charity request, family emergency, holiday spending, friend opening business), MARKET (inflation spike, stock crash, crypto opportunity, interest rate change). Tailor to player age bracket and career stage. Make effects realistic. Cash effects should be -5000 to +10000 range. Salary changes should be -5000 to +15000 range. Happiness -20 to +20. Credit -50 to +50.\n\nIMPORTANT: Include a "lesson" field in your JSON with a 1-2 sentence financial literacy lesson explaining the real-world economics behind this event (e.g., compound interest, opportunity cost, inflation, risk vs. reward, emergency funds, diversification). Format: {"emoji":"...","title":"...","description":"...","lesson":"<financial literacy concept>","choices":[...]}';

                  callGemini(prompt, true).then(function (result) {

                    try {

                      var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                      var start = cleaned.indexOf('{');

                      if (start > 0) cleaned = cleaned.substring(start);

                      var end = cleaned.lastIndexOf('}');

                      if (end > 0) cleaned = cleaned.substring(0, end + 1);

                      var parsed = JSON.parse(cleaned);

                      upd('lifeEvent', parsed);

                      upd('pfLoading', false);

                    } catch (e) {

                      console.error('[EconLab] Parse error:', e);

                      upd('pfLoading', false);

                      if (addToast) addToast('Failed to generate event. Try again!', 'error');

                    }

                  }).catch(function (e) { upd('pfLoading', false); if (addToast) addToast('AI error: ' + e.message, 'error'); });

                },

                disabled: d.pfLoading,

                className: 'w-full py-4 rounded-2xl text-sm font-bold shadow-lg transition-all ' + (d.pfLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 hover:shadow-xl hover:scale-[1.02]')

              }, d.pfLoading ? '\u23F3 Generating life event...' : '\u2728 Next Year (Age ' + ((d.pfAge || 22) + 1) + ')'),

              // Housing decision

              React.createElement('div', { className: 'bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200 mt-3 mb-1' },

                React.createElement('h4', { className: 'text-[10px] font-bold text-orange-700 mb-2' }, '\uD83C\uDFE0 Housing Strategy'),

                React.createElement('div', { className: 'flex gap-2' },

                  [

                    { id: 'renting', label: '\uD83C\uDFE2 Rent', desc: 'Lower monthly cost, flexibility', cost: '-$1,000/mo' },

                    { id: 'owning', label: '\uD83C\uDFE0 Own', desc: 'Build equity, but mortgage + maintenance', cost: '-$1,800/mo' },

                    { id: 'frugal', label: '\uD83D\uDECB\uFE0F Roommate', desc: 'Cheapest option, save more', cost: '-$500/mo' }

                  ].map(function (h) {

                    return React.createElement('button', {

                      key: h.id,

                      onClick: function () { upd('pfHousing', h.id); },

                      className: 'flex-1 p-2 rounded-lg text-center transition-all border-2 ' +

                        ((d.pfHousing || 'renting') === h.id ? 'border-orange-400 bg-orange-100' : 'border-slate-200 bg-white hover:border-orange-300')

                    },

                      React.createElement('div', { className: 'text-[10px] font-bold text-slate-700' }, h.label),

                      React.createElement('div', { className: 'text-[8px] text-slate-400' }, h.desc),

                      React.createElement('div', { className: 'text-[9px] font-bold text-orange-600 mt-1' }, h.cost)

                    );

                  })

                ),

                React.createElement('div', { className: 'text-[9px] text-orange-600 mt-2 bg-white rounded-lg p-2 border border-orange-100' },

                  (d.pfHousing || 'renting') === 'renting' && '\uD83D\uDCDA Renting means paying a landlord monthly. Pros: flexibility to move, no maintenance costs, lower upfront cost. Cons: no equity buildup, rent may increase annually, no tax deductions.',

                  (d.pfHousing || 'renting') === 'owning' && '\uD83D\uDCDA Homeownership builds equity (ownership stake). Your mortgage payment partly goes to principal (equity) and partly to interest (bank profit). Pros: equity buildup, tax deductions, stable payments. Cons: maintenance, property tax, less flexibility.',

                  (d.pfHousing || 'renting') === 'frugal' && '\uD83D\uDCDA Sharing housing dramatically cuts your largest expense. The "Pay Yourself First" principle: living below your means lets you invest the difference. Many millionaires built wealth by keeping housing costs under 25% of income.'

                )

              ),

              // Investment allocation

              React.createElement('div', { className: 'bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200 mt-3 mb-3' },

                React.createElement('h4', { className: 'text-[10px] font-bold text-green-700 mb-2' }, '\uD83D\uDCCA Investment Allocation (% of annual salary invested)'),

                React.createElement('div', { className: 'flex items-center gap-3' },

                  React.createElement('input', {

                    type: 'range', min: 0, max: 50, value: d.pfInvestPct || 0,

                    onChange: function (e) { upd('pfInvestPct', parseInt(e.target.value)); },

                    className: 'flex-1 accent-green-500'

                  }),

                  React.createElement('span', { className: 'text-xs font-bold text-green-700 w-12 text-right' }, (d.pfInvestPct || 0) + '%'),

                  React.createElement('span', { className: 'text-[10px] text-slate-500' }, '$' + Math.round((d.pfSalary || 35000) * (d.pfInvestPct || 0) / 100).toLocaleString() + '/yr')

                ),

                React.createElement('div', { className: 'flex gap-1 mt-2' },

                  ['Conservative (Bonds)', 'Balanced (60/40)', 'Aggressive (Stocks)', 'Speculative (Crypto)'].map(function (type) {

                    var short = type.split(' ')[0];

                    return React.createElement('button', {

                      key: type,

                      onClick: function () { upd('pfInvestType', short); },

                      className: 'flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ' +

                        ((d.pfInvestType || '') === short ? 'bg-green-500 text-white shadow-sm' : 'bg-white text-slate-500 border border-green-200 hover:border-green-400')

                    }, type);

                  })

                ),

                (d.pfInvestPct || 0) > 0 && (d.pfInvestType) && React.createElement('div', { className: 'mt-2 text-[9px] text-green-600 bg-white rounded-lg p-2 border border-green-100' },

                  d.pfInvestType === 'Conservative' && '\uD83D\uDCDA Bonds are low-risk, low-return (~3-5% annual). Best for capital preservation and stable income. Less volatile but won\'t beat inflation long-term.',

                  d.pfInvestType === 'Balanced' && '\uD83D\uDCDA A 60/40 stock/bond portfolio balances growth with stability (~7-8% avg). This is the classic "set and forget" strategy recommended by most financial advisors.',

                  d.pfInvestType === 'Aggressive' && '\uD83D\uDCDA All-stock portfolios historically return ~10%/yr but with HIGH volatility. You could lose 30%+ in a bad year. Best when you\'re young and have time to recover.',

                  d.pfInvestType === 'Speculative' && '\uD83D\uDCDA Crypto/speculative assets can return 100%+ OR lose 80%+. Extremely volatile. Most advisors recommend <5% of portfolio. High risk, high potential reward.'

                )

              ),

              // History log

              (d.pfHistory || []).length > 0 && React.createElement('div', { className: 'mt-4 bg-white rounded-xl border border-slate-200 p-3 max-h-40 overflow-y-auto' },

                React.createElement('h4', { className: 'text-xs font-bold text-slate-500 mb-2' }, '\uD83D\uDCDC Life History'),

                (d.pfHistory || []).slice().reverse().map(function (h, hi) {

                  return React.createElement('div', { key: hi, className: 'flex justify-between text-[10px] py-1 border-b border-slate-50' },

                    React.createElement('span', { className: 'text-slate-400' }, 'Age ' + h.age),

                    React.createElement('span', { className: 'text-slate-600 flex-1 px-2 truncate' }, h.event + ' \u2192 ' + h.choice),

                    React.createElement('span', { className: h.cash >= (d.pfHistory[Math.max(0, d.pfHistory.length - hi - 2)] || {}).cash ? 'text-green-600 font-bold' : 'text-red-500 font-bold' }, '$' + (h.cash || 0).toLocaleString())

                  );

                })

              ),

              // Reset button

              React.createElement('button', {

                onClick: function () { upd('pfAge', 22); upd('pfCash', 2000); upd('pfDebt', 0); upd('pfSalary', 35000); upd('pfHappiness', 70); upd('pfCredit', 650); upd('pfCareer', null); upd('pfInsurance', false); upd('pfHistory', []); upd('lifeEvent', null); if (addToast) addToast('\u267B Starting over at age 22!', 'info'); },

                className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200'

              }, '\u267B New Life')

            ),



            econTab === 'stockMarket' && React.createElement('div', { className: 'mt-4' },

              // AI Market Setup (if no companies yet)

              (!smCompanies || smCompanies.length === 0) ? React.createElement('div', { className: 'text-center py-8' },

                React.createElement('div', { className: 'text-5xl mb-4' }, '\uD83D\uDCC8'),

                React.createElement('h3', { className: 'text-lg font-bold text-slate-800 mb-2' }, 'Create Your Market'),

                React.createElement('p', { className: 'text-xs text-slate-500 mb-4 max-w-sm mx-auto' }, 'Describe what kind of market you want to trade in. AI will generate 5 fictional companies with realistic financials.'),

                React.createElement('input', {

                  type: 'text',

                  value: d.smInput || '',

                  onChange: function (e) { upd('smInput', e.target.value); },

                  placeholder: 'e.g. "renewable energy startups", "gaming companies", "space industry", or leave blank for mixed...',

                  className: 'w-full max-w-md px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all mb-3'

                }),

                React.createElement('button', {

                  onClick: function () {

                    upd('smLoading', true);

                    var theme = (d.smInput || '').trim() || 'diverse mix of tech, energy, healthcare, food, and finance';

                    var prompt = 'You are a stock market simulator for students. Generate 5 fictional publicly traded companies for a market themed around: "' + theme + '".\n\nReturn ONLY valid JSON:\n{"companies":[{"name":"<company name>","ticker":"<3-4 letter ticker>","price":<number 10-200>,"sector":"<sector>","description":"<1 sentence>"}]}\n\nMake company names creative and realistic. Prices should vary. Include diverse sectors within the theme.';

                    callGemini(prompt, true).then(function (result) {

                      try {

                        var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                        var s = cleaned.indexOf('{'); if (s > 0) cleaned = cleaned.substring(s);

                        var e = cleaned.lastIndexOf('}'); if (e > 0) cleaned = cleaned.substring(0, e + 1);

                        var parsed = JSON.parse(cleaned);

                        var colors = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6'];

                        var companies = (parsed.companies || []).slice(0, 5).map(function (c, ci) {

                          return { name: c.name, ticker: c.ticker, price: c.price || 50, history: [c.price * 0.95, c.price * 0.97, c.price * 0.99, c.price], sector: c.sector, color: colors[ci % 5], description: c.description };

                        });

                        upd('smCompanies', companies);

                        upd('smCash', 10000);

                        upd('smPortfolio', {});

                        upd('smDay', 0);

                        upd('smLoading', false);

                        if (addToast) addToast('\uD83D\uDCC8 Market open! 5 companies generated. Start trading!', 'success');

                      } catch (err) { upd('smLoading', false); if (addToast) addToast('Failed to generate market. Try again!', 'error'); console.error('[StockSim]', err); }

                    }).catch(function (err) { upd('smLoading', false); if (addToast) addToast('AI error', 'error'); });

                  },

                  disabled: d.smLoading,

                  className: 'w-full max-w-md py-3 rounded-xl text-sm font-bold shadow-lg transition-all ' + (d.smLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-xl')

                }, d.smLoading ? '\u23F3 AI generating companies...' : '\uD83D\uDE80 Open Market')

              ) :

                // Company selector (only when companies exist)

                smCompanies && smCompanies.length > 0 && React.createElement('div', null,

                  React.createElement('div', { className: 'flex gap-2 mb-3' },

                    smCompanies.map(function (c, ci) {

                      return React.createElement('button', {

                        key: ci,

                        onClick: function () { upd('smSelected', ci); },

                        className: 'flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all border-2 ' +

                          (smSelected === ci ? 'text-white shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200'),

                        style: smSelected === ci ? { background: c.color, borderColor: c.color } : {}

                      }, c.ticker + ' $' + c.price.toFixed(0) + (c.history && c.history.length > 1 ? ' ' + (c.price >= c.history[c.history.length - 2] ? '\u25B2' : '\u25BC') : ''));

                    })

                  ),

                  // Selected company detail

                  smCompanies[smSelected] && React.createElement('div', { className: 'bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-3 border border-slate-200 mb-3' },

                    React.createElement('div', { className: 'flex justify-between items-center' },

                      React.createElement('div', null,

                        React.createElement('h4', { className: 'text-sm font-bold text-slate-800' }, smCompanies[smSelected].name + ' (' + smCompanies[smSelected].ticker + ')'),

                        React.createElement('span', { className: 'text-[10px] text-slate-500' }, smCompanies[smSelected].sector + (smCompanies[smSelected].description ? ' \u2014 ' + smCompanies[smSelected].description : ''))

                      ),

                      React.createElement('div', { className: 'text-right' },

                        React.createElement('div', { className: 'text-lg font-bold', style: { color: smCompanies[smSelected].color } }, '$' + smCompanies[smSelected].price.toFixed(2)),

                        smCompanies[smSelected].history && smCompanies[smSelected].history.length > 1 && React.createElement('div', {

                          className: 'text-[10px] font-bold ' + (smCompanies[smSelected].price >= smCompanies[smSelected].history[smCompanies[smSelected].history.length - 2] ? 'text-green-600' : 'text-red-500')

                        }, (smCompanies[smSelected].price >= smCompanies[smSelected].history[smCompanies[smSelected].history.length - 2] ? '\u25B2 +' : '\u25BC ') +

                        ((smCompanies[smSelected].price / smCompanies[smSelected].history[smCompanies[smSelected].history.length - 2] - 1) * 100).toFixed(1) + '%'),

                        React.createElement('div', { className: 'text-[9px] text-slate-400' }, 'Held: ' + (smPortfolio[smCompanies[smSelected].ticker] || 0) + ' shares ($' + ((smPortfolio[smCompanies[smSelected].ticker] || 0) * smCompanies[smSelected].price).toFixed(0) + ')')

                      )

                    )

                  ),

                  // AI News Event display

                  d.smNewsEvent ? React.createElement('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 mb-3' },

                    React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, '\uD83D\uDCF0 ' + (d.smNewsEvent.headline || 'Breaking News')),

                    React.createElement('p', { className: 'text-xs text-amber-700 mt-1' }, d.smNewsEvent.analysis || ''),

                    React.createElement('div', { className: 'text-[10px] text-amber-600 mt-2 font-bold' }, 'Impact: ' + (d.smNewsEvent.impact > 0 ? '\u25B2 +' : '\u25BC ') + (d.smNewsEvent.impact * 100).toFixed(1) + '%'),

                    d.smNewsEvent.lesson && React.createElement('div', { className: 'mt-2 bg-amber-100 rounded-lg px-3 py-2 text-[10px] text-amber-800 border border-amber-200' },

                      React.createElement('span', { className: 'font-bold' }, '\uD83D\uDCDA Investing Concept: '),

                      d.smNewsEvent.lesson

                    )

                  ) : null,

                  // Buy/Sell + Next Day

                  React.createElement('div', { className: 'flex gap-3 mb-3' },

                    React.createElement('button', {

                      onClick: function () {

                        var co2 = smCompanies[smSelected];

                        if (smCash >= co2.price) {

                          upd('smCash', smCash - co2.price);

                          var newPort = Object.assign({}, smPortfolio);

                          newPort[co2.ticker] = (newPort[co2.ticker] || 0) + 1;

                          upd('smPortfolio', newPort);

                          if (addToast) addToast('Bought 1 ' + co2.ticker + ' @ $' + co2.price.toFixed(2), 'success');

                          if (typeof addXP === 'function') addXP(5, 'Stock Market: Executed trade');

                        } else { if (addToast) addToast('Not enough cash!', 'error'); }

                      },

                      className: 'flex-1 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white'

                    }, '\u25B2 Buy 1 ($' + (smCompanies[smSelected] ? smCompanies[smSelected].price.toFixed(2) : '0') + ')'),

                    React.createElement('button', {

                      onClick: function () {

                        var co5 = smCompanies[smSelected];

                        var cost10 = co5.price * 10;

                        if (smCash >= cost10) {

                          upd('smCash', smCash - cost10);

                          var newPort3 = Object.assign({}, smPortfolio);

                          newPort3[co5.ticker] = (newPort3[co5.ticker] || 0) + 10;

                          upd('smPortfolio', newPort3);

                          if (addToast) addToast('Bought 10 ' + co5.ticker + ' @ $' + co5.price.toFixed(2) + ' = $' + cost10.toFixed(2), 'success');

                        } else { if (addToast) addToast('Need $' + cost10.toFixed(2) + ' (have $' + smCash.toFixed(2) + ')', 'error'); }

                      },

                      className: 'py-3 px-2 rounded-xl text-[10px] font-bold bg-gradient-to-r from-green-600 to-emerald-600 text-white'

                    }, '\u25B2\u25B2 Buy 10'),

                    React.createElement('button', {

                      onClick: function () {

                        var co3 = smCompanies[smSelected];

                        if ((smPortfolio[co3.ticker] || 0) > 0) {

                          upd('smCash', smCash + co3.price);

                          var newPort2 = Object.assign({}, smPortfolio);

                          newPort2[co3.ticker] = newPort2[co3.ticker] - 1;

                          if (newPort2[co3.ticker] <= 0) delete newPort2[co3.ticker];

                          upd('smPortfolio', newPort2);

                          if (addToast) addToast('Sold 1 ' + co3.ticker + ' @ $' + co3.price.toFixed(2), 'info');

                        } else { if (addToast) addToast('No shares to sell!', 'error'); }

                      },

                      className: 'flex-1 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-red-500 to-rose-500 text-white'

                    }, '\u25BC Sell 1'),

                    React.createElement('button', {

                      onClick: function () {

                        var co6 = smCompanies[smSelected];

                        var held = smPortfolio[co6.ticker] || 0;

                        if (held > 0) {

                          var sellAmt = Math.min(held, 10);

                          upd('smCash', smCash + co6.price * sellAmt);

                          var newPort4 = Object.assign({}, smPortfolio);

                          newPort4[co6.ticker] = held - sellAmt;

                          if (newPort4[co6.ticker] <= 0) delete newPort4[co6.ticker];

                          upd('smPortfolio', newPort4);

                          if (addToast) addToast('Sold ' + sellAmt + ' ' + co6.ticker + ' @ $' + co6.price.toFixed(2), 'info');

                        }

                      },

                      className: 'py-3 px-2 rounded-xl text-[10px] font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white'

                    }, '\u25BC\u25BC Sell ' + Math.min(smPortfolio[smCompanies[smSelected] ? smCompanies[smSelected].ticker : ''] || 0, 10)),

                    React.createElement('button', {

                      onClick: function () {

                        upd('smLoading', true);

                        var co4 = smCompanies[smSelected];

                        var prompt = 'You are a financial news AI (difficulty: ' + (d.econDifficulty || 'medium') + ') for an educational stock market simulator. Generate a market news event. Currently tracking: ' + smCompanies.map(function (c) { return c.ticker + ' (' + c.name + ', ' + c.sector + ') @ $' + c.price.toFixed(2); }).join(', ') + '.\n\nReturn ONLY valid JSON:\n{"headline":"<breaking news headline>","analysis":"<1-2 sentence market analysis>","impacts":[{"ticker":"<TICKER>","change":<decimal between -0.15 and 0.15>}]}\n\nGenerate realistic business news. Impact 1-3 companies.\n\nIMPORTANT: Include a "lesson" field with a 1-2 sentence investing/market concept explanation (e.g., diversification, P/E ratios, market sentiment, bull vs bear markets, risk tolerance, dollar-cost averaging, index funds, short selling, market capitalization, dividends).\n\nFormat: {"headline":"...","analysis":"...","lesson":"<investing concept>","impacts":[{"ticker":"...","change":<decimal>}]}';

                        callGemini(prompt, true).then(function (result) {

                          try {

                            var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                            var start = cleaned.indexOf('{'); if (start > 0) cleaned = cleaned.substring(start);

                            var end = cleaned.lastIndexOf('}'); if (end > 0) cleaned = cleaned.substring(0, end + 1);

                            var parsed = JSON.parse(cleaned);

                            var maxImpact = 0;

                            var newCos = smCompanies.map(function (c) {

                              var impact = 0;

                              (parsed.impacts || []).forEach(function (imp) { if (imp.ticker === c.ticker) impact = imp.change; });

                              var rnd = (Math.random() - 0.48) * 0.03;

                              var newPrice = Math.max(1, c.price * (1 + impact + rnd));

                              newPrice = Math.round(newPrice * 100) / 100;

                              if (Math.abs(impact) > Math.abs(maxImpact)) maxImpact = impact;

                              var newHist = c.history.slice(-29); newHist.push(newPrice);

                              return Object.assign({}, c, { price: newPrice, history: newHist });

                            });

                            upd('smCompanies', newCos);

                            upd('smDay', smDay + 1);

                            upd('smNewsEvent', { headline: parsed.headline, analysis: parsed.analysis, impact: maxImpact, lesson: parsed.lesson });

                            if (parsed.lesson) {

                              var gl2 = (d.econGlossary || []).slice();

                              var exists2 = gl2.some(function (g) { return g.concept === parsed.headline; });

                              if (!exists2) { gl2.push({ tab: 'Stock Market', concept: parsed.headline, explanation: parsed.lesson }); upd('econGlossary', gl2); }

                            }

                            upd('smLoading', false);

                          } catch (e) {

                            console.error('[StockSim] Parse error:', e);

                            var fallbackCos = smCompanies.map(function (c) {

                              var rnd = (Math.random() - 0.48) * 0.06;

                              var np = Math.max(1, Math.round(c.price * (1 + rnd) * 100) / 100);

                              var nh = c.history.slice(-29); nh.push(np);

                              return Object.assign({}, c, { price: np, history: nh });

                            });

                            upd('smCompanies', fallbackCos); upd('smDay', smDay + 1);

                            upd('smLoading', false);

                            if (addToast) addToast('Market moved (AI unavailable)', 'warning');

                          }

                        }).catch(function (e) { upd('smLoading', false); if (addToast) addToast('AI error', 'error'); });

                      },

                      disabled: d.smLoading,

                      className: 'py-3 px-6 rounded-xl text-xs font-bold transition-all ' + (d.smLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white')

                    }, d.smLoading ? '\u23F3...' : '\u23ED Day ' + (smDay + 1))

                  ),

                  // Portfolio summary

                  React.createElement('div', { className: 'bg-white rounded-xl border border-slate-200 p-3 text-xs' },

                    React.createElement('div', { className: 'flex justify-between mb-2' },

                      React.createElement('span', { className: 'font-bold text-slate-700' }, '\uD83D\uDCBC Cash: $' + smCash.toFixed(2)),

                      React.createElement('span', { className: 'font-bold text-amber-600' }, 'Day ' + smDay),

                      React.createElement('span', { className: 'font-bold text-green-600' }, 'Total: $' + (smCash + smCompanies.reduce(function (s, c) { return s + (smPortfolio[c.ticker] || 0) * c.price; }, 0)).toFixed(2))

                    ),

                    Object.keys(smPortfolio).length > 0 && React.createElement('div', { className: 'flex gap-2 flex-wrap' },

                      Object.keys(smPortfolio).map(function (ticker) {

                        var c = smCompanies.find(function (x) { return x.ticker === ticker; });

                        return smPortfolio[ticker] > 0 ? React.createElement('span', { key: ticker, className: 'bg-slate-100 px-2 py-1 rounded text-[10px] font-bold' }, ticker + ': ' + smPortfolio[ticker] + ' ($' + (smPortfolio[ticker] * c.price).toFixed(0) + ')') : null;

                      })

                    ),

                    // Portfolio Analytics

                    smDay > 0 && React.createElement('div', { className: 'mt-3 bg-slate-50 rounded-xl p-3 border border-slate-200' },

                      React.createElement('h4', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2' }, '\uD83D\uDCC8 Portfolio Analytics'),

                      React.createElement('div', { className: 'grid grid-cols-3 gap-2 text-center' },

                        React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },

                          React.createElement('div', { className: 'text-[9px] text-slate-400' }, 'Total P&L'),

                          React.createElement('div', { className: 'text-sm font-bold ' + (smTotalVal - 10000 >= 0 ? 'text-green-600' : 'text-red-500') },

                            (smTotalVal - 10000 >= 0 ? '+' : '') + '$' + (smTotalVal - 10000).toFixed(0))

                        ),

                        React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },

                          React.createElement('div', { className: 'text-[9px] text-slate-400' }, 'Return %'),

                          React.createElement('div', { className: 'text-sm font-bold ' + (smTotalVal >= 10000 ? 'text-green-600' : 'text-red-500') },

                            (smTotalVal >= 10000 ? '+' : '') + ((smTotalVal / 10000 - 1) * 100).toFixed(1) + '%')

                        ),

                        React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },

                          React.createElement('div', { className: 'text-[9px] text-slate-400' }, 'Holdings'),

                          React.createElement('div', { className: 'text-sm font-bold text-slate-700' },

                            Object.keys(smPortfolio).filter(function (t) { return smPortfolio[t] > 0; }).length + ' stocks')

                        )

                      )

                    ),

                    // Reset Market button

                    React.createElement('button', {

                      onClick: function () { upd('smCompanies', null); upd('smPortfolio', {}); upd('smCash', 10000); upd('smDay', 0); upd('smInput', ''); upd('smNewsEvent', null); if (addToast) addToast('\u267B Market reset! Create a new one.', 'info'); },

                      className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200'

                    }, '\u267B Reset Market & Generate New Companies')

                  )

                )

            ),



            econTab === 'entrepreneur' && React.createElement('div', { className: 'mt-4' },

              // Business setup (if no business yet)

              !d.enBusiness ? React.createElement('div', { className: 'text-center py-8' },

                React.createElement('div', { className: 'text-5xl mb-4' }, '\uD83D\uDE80'),

                React.createElement('h3', { className: 'text-lg font-bold text-slate-800 mb-2' }, 'Start Your Business'),

                React.createElement('p', { className: 'text-xs text-slate-500 mb-4 max-w-sm mx-auto' }, 'Type any business idea and AI will generate your startup costs, daily expenses, and pricing. Then run it day by day!'),

                React.createElement('input', {

                  type: 'text',

                  value: d.enInput || '',

                  onChange: function (e) { upd('enInput', e.target.value); },

                  placeholder: 'e.g. food truck, dog walking, tutoring, bakery, app development...',

                  className: 'w-full max-w-md px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all mb-3',

                  onKeyDown: function (e) { if (e.key === 'Enter' && (d.enInput || '').trim()) { document.getElementById('econ-start-biz').click(); } }

                }),

                React.createElement('button', {

                  id: 'econ-start-biz',

                  onClick: function () {

                    if (!(d.enInput || '').trim()) return;

                    upd('enLoading', true);

                    var prompt = 'You are a business simulation game engine for students. The player wants to start a "' + d.enInput.trim() + '" business.\n\nGenerate realistic startup details. Return ONLY valid JSON:\n{"businessName":"<creative name>","emoji":"<single emoji>","startupCost":<number 500-50000>,"dailyFixedCosts":<number 10-500>,"unitCost":<number, cost per unit/customer served>,"unitName":"<what 1 unit is, e.g. meal, walk, lesson, item>","suggestedPrice":<number>,"maxDailyCustomers":<number 5-200>,"description":"<1 sentence pitch>","riskFactors":["<risk 1>","<risk 2>","<risk 3>"]}\n\nMake the numbers realistic for a small business startup.';

                    callGemini(prompt, true).then(function (result) {

                      try {

                        var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                        var s2 = cleaned.indexOf('{'); if (s2 > 0) cleaned = cleaned.substring(s2);

                        var e2 = cleaned.lastIndexOf('}'); if (e2 > 0) cleaned = cleaned.substring(0, e2 + 1);

                        var biz = JSON.parse(cleaned);

                        upd('enBusiness', biz);

                        upd('enBizCash', 10000 - (biz.startupCost || 5000));

                        upd('enBizDay', 1);

                        upd('enBizRep', 50);

                        upd('enBizPrice', biz.suggestedPrice || 10);

                        upd('enBizHistory', []);

                        upd('enBizEvent', null);

                        upd('enLoading', false);

                        if (addToast) addToast('\uD83C\uDF89 ' + biz.businessName + ' is open! Starting capital: $' + (10000 - biz.startupCost).toLocaleString(), 'success');

                      } catch (e3) { upd('enLoading', false); if (addToast) addToast('Failed to create business. Try again!', 'error'); console.error('[BizSim]', e3); }

                    }).catch(function (e4) { upd('enLoading', false); if (addToast) addToast('AI error', 'error'); });

                  },

                  disabled: d.enLoading || !(d.enInput || '').trim(),

                  className: 'w-full max-w-md py-3 rounded-xl text-sm font-bold shadow-lg transition-all ' + (d.enLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-xl')

                }, d.enLoading ? '\u23F3 AI is building your business...' : '\uD83D\uDE80 Launch Business')

              ) :

                // Active business view

                React.createElement('div', null,

                  // Business header

                  React.createElement('div', { className: 'flex items-center gap-3 mb-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200' },

                    React.createElement('span', { className: 'text-3xl' }, d.enBusiness.emoji || '\uD83C\uDFEA'),

                    React.createElement('div', { className: 'flex-1' },

                      React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, d.enBusiness.businessName),

                      React.createElement('p', { className: 'text-[10px] text-amber-600' }, d.enBusiness.description)

                    ),

                    React.createElement('div', { className: 'text-right' },

                      React.createElement('div', { className: 'text-lg font-bold ' + ((d.enBizCash || 0) >= 0 ? 'text-green-600' : 'text-red-500') }, '$' + (d.enBizCash || 0).toLocaleString()),

                      React.createElement('div', { className: 'text-[10px] text-slate-400' }, 'Day ' + (d.enBizDay || 1) + ' | Rep: ' + (d.enBizRep || 50) + '/100 | Staff: ' + (d.enBizEmployees || 0))

                    )

                  ),

                  // Price adjustment + stats

                  React.createElement('div', { className: 'grid grid-cols-3 gap-2 mb-3' },

                    React.createElement('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },

                      React.createElement('label', { className: 'block text-[10px] font-bold text-amber-700 mb-1' }, '\uD83D\uDCB2 Price per ' + (d.enBusiness.unitName || 'unit') + ': $' + (d.enBizPrice || d.enBusiness.suggestedPrice || 10).toFixed(2)),

                      React.createElement('input', {

                        type: 'range', min: 1, max: (d.enBusiness.suggestedPrice || 10) * 3, step: 0.5,

                        value: d.enBizPrice || d.enBusiness.suggestedPrice || 10,

                        onChange: function (e) { upd('enBizPrice', parseFloat(e.target.value)); },

                        className: 'w-full accent-amber-500'

                      }),

                      React.createElement('div', { className: 'text-[9px] text-amber-600 mt-0.5' }, 'Suggested: $' + (d.enBusiness.suggestedPrice || 10))

                    ),

                    React.createElement('div', { className: 'bg-blue-50 rounded-xl p-3 border border-blue-200 text-center' },

                      React.createElement('div', { className: 'text-[9px] text-blue-500 font-bold' }, 'Profit Margin'),

                      React.createElement('div', { className: 'text-lg font-bold ' + (((d.enBizPrice || d.enBusiness.suggestedPrice || 10) - (d.enBusiness.unitCost || 5)) / (d.enBizPrice || d.enBusiness.suggestedPrice || 10) * 100 > 30 ? 'text-green-600' : 'text-amber-600') },

                        (((d.enBizPrice || d.enBusiness.suggestedPrice || 10) - (d.enBusiness.unitCost || 5)) / (d.enBizPrice || d.enBusiness.suggestedPrice || 10) * 100).toFixed(0) + '%'),

                      React.createElement('div', { className: 'text-[9px] text-blue-400' }, 'Cost: $' + (d.enBusiness.unitCost || 5))

                    ),

                    React.createElement('div', { className: 'bg-purple-50 rounded-xl p-3 border border-purple-200 text-center' },

                      React.createElement('div', { className: 'text-[9px] text-purple-500 font-bold' }, 'Break-Even'),

                      React.createElement('div', { className: 'text-lg font-bold text-purple-700' },

                        Math.ceil((d.enBusiness.dailyFixedCosts || 50) / Math.max(0.01, (d.enBizPrice || d.enBusiness.suggestedPrice || 10) - (d.enBusiness.unitCost || 5)))),

                      React.createElement('div', { className: 'text-[9px] text-purple-400' }, d.enBusiness.unitName + 's/day')

                    )

                  )

                ),

              // AI Event display

              d.enBizEvent ? React.createElement('div', { className: 'bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200 mb-3' },

                React.createElement('div', { className: 'flex items-start gap-2 mb-3' },

                  React.createElement('span', { className: 'text-2xl' }, d.enBizEvent.emoji || '\u26A1'),

                  React.createElement('div', null,

                    React.createElement('h4', { className: 'text-sm font-bold text-purple-800' }, d.enBizEvent.title),

                    React.createElement('p', { className: 'text-xs text-purple-600 mt-1' }, d.enBizEvent.description),

                    d.enBizEvent.lesson && React.createElement('div', { className: 'mt-2 bg-purple-100 rounded-lg px-3 py-2 text-[10px] text-purple-800 border border-purple-200' },

                      React.createElement('span', { className: 'font-bold' }, '\uD83D\uDCDA Business Concept: '),

                      d.enBizEvent.lesson

                    )

                  )

                ),

                React.createElement('div', { className: 'grid gap-2' },

                  (d.enBizEvent.choices || []).map(function (ch, chi) {

                    return React.createElement('button', {

                      key: chi,

                      onClick: function () {

                        var ef = ch.effect || {};

                        upd('enBizCash', (d.enBizCash || 0) + (ef.cash || 0));

                        upd('enBizRep', Math.min(100, Math.max(0, (d.enBizRep || 50) + (ef.reputation || 0))));

                        if (ef.employees) upd('enBizEmployees', Math.max(0, (d.enBizEmployees || 0) + ef.employees));

                        upd('enBizEvent', null);

                        if (addToast) addToast(ch.label + ' \u2192 ' + (ef.cash >= 0 ? '+$' : '-$') + Math.abs(ef.cash || 0), ef.cash >= 0 ? 'success' : 'warning');

                      },

                      className: 'w-full text-left p-3 rounded-xl border-2 border-purple-100 hover:border-purple-400 bg-white hover:bg-purple-50 transition-all text-xs'

                    },

                      React.createElement('div', { className: 'font-bold text-slate-700' }, ch.label),

                      React.createElement('div', { className: 'text-slate-400 mt-0.5 flex gap-3' },

                        ch.effect && ch.effect.cash ? React.createElement('span', { className: ch.effect.cash >= 0 ? 'text-green-500' : 'text-red-500' }, (ch.effect.cash >= 0 ? '+' : '') + '$' + ch.effect.cash) : null,

                        ch.effect && ch.effect.reputation ? React.createElement('span', { className: 'text-purple-500' }, (ch.effect.reputation > 0 ? '+' : '') + ch.effect.reputation + ' rep') : null,

                        ch.effect && ch.effect.employees ? React.createElement('span', { className: 'text-sky-500' }, (ch.effect.employees > 0 ? '+' : '') + ch.effect.employees + ' staff') : null

                      )

                    );

                  })

                )

              ) : null,

              // Run Day button

              !d.enBizEvent && React.createElement('button', {

                onClick: function () {

                  upd('enBizLoading', true);

                  var biz = d.enBusiness;

                  var prompt = 'You are a business simulation game engine (difficulty: ' + (d.econDifficulty || 'medium') + '). The player runs "' + biz.businessName + '" (a ' + (d.enInput || 'business') + '). Day ' + (d.enBizDay || 1) + ', cash: $' + (d.enBizCash || 0) + ', reputation: ' + (d.enBizRep || 50) + '/100. They sell ' + biz.unitName + ' at $' + (d.enBizPrice || biz.suggestedPrice) + ' each. Daily fixed costs: $' + biz.dailyFixedCosts + ', unit cost: $' + biz.unitCost + '. They have ' + (d.enBizLocations || 1) + ' location(s) and ' + (d.enBizEmployees || 0) + ' employees (each costs $80/day but increases max customers by 20%).\n\nSimulate today and generate an event. Return ONLY valid JSON:\n{"customersToday":<number>,"revenue":<number>,"costs":<number>,"emoji":"<emoji>","title":"<event title>","description":"<what happened today + the event>","choices":[{"label":"<option>","effect":{"cash":<number>,"reputation":<number>,"employees":<number or 0>}}]}\n\nMake daily customers based on reputation (higher rep = more customers, max ' + biz.maxDailyCustomers + '). Include a realistic challenge with 2-3 choices.\n\nIMPORTANT: Include a "lesson" field with a 1-2 sentence business/entrepreneurship concept (e.g., break-even analysis, profit margins, customer acquisition cost, cash flow management, competitive advantage, economies of scale, marketing ROI, supply chain, pivot strategy, unit economics, customer retention vs acquisition).';

                  callGemini(prompt, true).then(function (result) {

                    try {

                      var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                      var s3 = cleaned.indexOf('{'); if (s3 > 0) cleaned = cleaned.substring(s3);

                      var e3 = cleaned.lastIndexOf('}'); if (e3 > 0) cleaned = cleaned.substring(0, e3 + 1);

                      var dayResult = JSON.parse(cleaned);

                      var dailyProfit = (dayResult.revenue || 0) - (dayResult.costs || 0);

                      upd('enBizCash', (d.enBizCash || 0) + dailyProfit);

                      upd('enBizDay', (d.enBizDay || 1) + 1);

                      if (typeof addXP === 'function') addXP(10, 'Business Sim: Completed a day');

                      var h2 = (d.enBizHistory || []).slice(-29);

                      h2.push({ day: d.enBizDay || 1, revenue: dayResult.revenue, costs: dayResult.costs, profit: dailyProfit, customers: dayResult.customersToday });

                      upd('enBizHistory', h2);

                      upd('enBizEvent', dayResult);

                      if (dayResult.lesson) {

                        var gl3 = (d.econGlossary || []).slice();

                        var exists3 = gl3.some(function (g) { return g.concept === dayResult.title; });

                        if (!exists3) { gl3.push({ tab: 'Business', concept: dayResult.title, explanation: dayResult.lesson }); upd('econGlossary', gl3); }

                      }

                      upd('enBizLoading', false);

                    } catch (e4) { upd('enBizLoading', false); if (addToast) addToast('Day sim failed. Try again!', 'error'); console.error('[BizSim]', e4); }

                  }).catch(function (e5) { upd('enBizLoading', false); if (addToast) addToast('AI error', 'error'); });

                },

                disabled: d.enBizLoading,

                className: 'w-full py-4 rounded-2xl text-sm font-bold shadow-lg mb-3 transition-all ' + (d.enBizLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-xl hover:scale-[1.02]')

              }, d.enBizLoading ? '\u23F3 Simulating day...' : '\u2600\uFE0F Open for Business! (Day ' + (d.enBizDay || 1) + ')'),

              // Stats + History

              (d.enBizHistory || []).length > 0 && React.createElement('div', { className: 'bg-white rounded-xl border border-slate-200 p-3' },

                React.createElement('h4', { className: 'text-xs font-bold text-slate-500 mb-2' }, '\uD83D\uDCC8 Business History'),

                (d.enBizHistory || []).slice(-7).reverse().map(function (dh, dhi) {

                  return React.createElement('div', { key: dhi, className: 'flex justify-between text-[10px] py-1 border-b border-slate-50' },

                    React.createElement('span', { className: 'text-slate-400' }, 'Day ' + dh.day),

                    React.createElement('span', { className: 'text-slate-500' }, dh.customers + ' customers'),

                    React.createElement('span', { className: 'text-blue-500' }, 'Rev $' + (dh.revenue || 0).toFixed(0)),

                    React.createElement('span', { className: dh.profit >= 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold' }, (dh.profit >= 0 ? '+' : '') + '$' + (dh.profit || 0).toFixed(0))

                  );

                })

              ),

              // Close business

              React.createElement('button', {

                onClick: function () { upd('enBusiness', null); upd('enInput', ''); if (addToast) addToast('Business closed. Start a new one!', 'info'); },

                className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200'

              }, '\u267B Close Business & Start New')

            )

          );
      })();
    }
  });

  // â•â•â• ðŸ”¬ circuit (circuit) â•â•â•
  window.StemLab.registerTool('circuit', {
    icon: 'ðŸ”¬',
    label: 'circuit',
    desc: '',
    color: 'slate',
    category: 'science',
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

      // â”€â”€ Tool body (circuit) â”€â”€
      return (function() {
var _isCircuit = stemLabTab === 'explore' && stemLabTool === 'circuit'; if (!_isCircuit) { React.useEffect(function(){}, []); return null; }

          const d = labToolData.circuit;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, circuit: { ...prev.circuit, [key]: val } }));

          const mode = d.mode || 'series';

          // Component resistance helper (switch, LED, ammeter, voltmeter support)

          const getCompR = (c) => c.type === 'switch' ? (c.closed ? 0.001 : 1e9) : c.type === 'ammeter' ? 0.001 : c.type === 'voltmeter' ? 1e9 : (c.value || 1);

          const toggleSwitch = (compId) => upd('components', d.components.map(c => c.id === compId ? Object.assign({}, c, { closed: !c.closed }) : c));

          const cycleLedColor = (compId) => { var _cs = ['#ef4444','#22c55e','#3b82f6','#eab308','#f8fafc']; upd('components', d.components.map(c => { if (c.id !== compId) return c; var ci = _cs.indexOf(c.ledColor || '#ef4444'); return Object.assign({}, c, { ledColor: _cs[(ci + 1) % _cs.length] }); })); };

          const hasOpenSwitch = mode === 'series' && d.components.some(c => c.type === 'switch' && !c.closed);

          const totalR = hasOpenSwitch ? 1e9 : (mode === 'series'

            ? d.components.reduce((s, c) => s + getCompR(c), 0) || 0.001

            : (d.components.length > 0 ? 1 / d.components.reduce((s, c) => s + 1 / (getCompR(c) || 1), 0) : 0.001));

          const current = hasOpenSwitch ? 0 : d.voltage / totalR;

          const power = d.voltage * current;

          const isShort = d.components.length > 0 && totalR < 1 && !hasOpenSwitch;

          const isOpen = hasOpenSwitch;

          const W = 440, H = 200;



          // Electron animation tick (proper useEffect with cleanup)

          var tick = d.tick || 0;

          React.useEffect(function () {

            if (current < 0.001 || isShort) return;

            var _tickTimer = setTimeout(function () {

              upd('tick', (tick + 1) % 400);

            }, 60);

            return function () { clearTimeout(_tickTimer); };

          }, [tick, current, isShort]);



          // Electron dots along the wire path

          var electronDots = [];

          if (current > 0.001 && !isShort) {

            var numDots = Math.min(Math.ceil(current * 3), 12);

            for (var ei = 0; ei < numDots; ei++) {

              var phase = ((tick * 2 + ei * (400 / numDots)) % 400) / 400;

              var ex, ey;

              // Path: top wire (left to right), right wire (top to bottom), bottom wire (right to left), left wire (bottom to top)

              if (phase < 0.3) { // top wire

                ex = 35 + (380 - 35) * (phase / 0.3);

                ey = 20;

              } else if (phase < 0.4) { // right wire

                ex = 380;

                ey = 20 + 120 * ((phase - 0.3) / 0.1);

              } else if (phase < 0.7) { // bottom wire

                ex = 380 - (380 - 35) * ((phase - 0.4) / 0.3);

                ey = 140;

              } else { // left wire

                ex = 35;

                ey = 140 - 120 * ((phase - 0.7) / 0.3);

              }

              electronDots.push({ x: ex, y: ey });

            }

          }



          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDD0C Circuit Builder"),

              React.createElement("span", { className: "px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full" }, "INTERACTIVE"),

              isShort && React.createElement("span", { className: "px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full animate-pulse" }, "\u26A0 SHORT CIRCUIT!"),

              React.createElement("div", { className: "flex gap-1 ml-auto" },

                ["series", "parallel"].map(m => React.createElement("button", { key: m, onClick: () => upd("mode", m), className: "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all " + (mode === m ? 'bg-yellow-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-yellow-50') }, m))

              )

            ),

            React.createElement("p", { className: "text-xs text-slate-400 italic -mt-1 mb-3" }, "Build " + mode + " circuits. V = IR. Add components and adjust voltage to see live calculations."),

            // SVG Schematic

            React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full rounded-xl border-2 shadow-sm transition-colors " + (isShort ? 'bg-red-50 border-red-300' : 'bg-gradient-to-b from-yellow-50 to-white border-yellow-200'), style: { maxHeight: "220px" } },

              // Battery

              React.createElement("rect", { x: 15, y: 40, width: 40, height: 60, fill: isShort ? '#fca5a5' : '#fbbf24', stroke: isShort ? '#dc2626' : '#92400e', strokeWidth: 2, rx: 5 }),

              React.createElement("text", { x: 35, y: 72, textAnchor: "middle", style: { fontSize: '11px', fontWeight: 'bold' }, fill: isShort ? '#dc2626' : '#92400e' }, d.voltage + "V"),

              React.createElement("text", { x: 35, y: 32, textAnchor: "middle", style: { fontSize: '12px' }, fill: "#92400e" }, "\uD83D\uDD0B"),

              // + / - terminals

              React.createElement("text", { x: 20, y: 38, fill: "#dc2626", style: { fontSize: '12px', fontWeight: 'bold' } }, "+"),

              React.createElement("text", { x: 20, y: 110, fill: "#3b82f6", style: { fontSize: '12px', fontWeight: 'bold' } }, "\u2212"),

              // Wires

              React.createElement("line", { x1: 35, y1: 40, x2: 35, y2: 20, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),

              React.createElement("line", { x1: 35, y1: 20, x2: 400, y2: 20, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),

              React.createElement("line", { x1: 35, y1: 100, x2: 35, y2: 140, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),

              React.createElement("line", { x1: 35, y1: 140, x2: 400, y2: 140, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),

              React.createElement("line", { x1: 400, y1: 20, x2: 400, y2: 140, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),

              // Current direction arrow

              !isShort && current > 0.01 && React.createElement("g", null,

                React.createElement("polygon", { points: "210,12 220,8 220,16", fill: "#3b82f6" }),

                React.createElement("text", { x: 225, y: 15, fill: "#3b82f6", style: { fontSize: '7px', fontWeight: 'bold' } }, "I = " + current.toFixed(2) + "A")

              ),

              // Components â€” Series

              mode === 'series'

                ? d.components.map(function (comp, i) {

                  var spacing = Math.min(70, 280 / Math.max(d.components.length, 1));

                  var cx = 80 + i * spacing;

                  var compI = current;

                  var compR = getCompR(comp);

                  var compV = current * compR;

                  var compP = compV * compI;

                  var bulbBright = comp.type === 'bulb' ? Math.min(compP / 10, 1) : 0;

                  var ledGlow = comp.type === 'led' && current > 0.005 ? Math.min(current * 20, 1) : 0;

                  return React.createElement("g", { key: comp.id },

                    React.createElement("line", { x1: cx, y1: 20, x2: cx, y2: 55, stroke: "#1e293b", strokeWidth: 2 }),

                    comp.type === 'resistor'

                      ? React.createElement("g", null,

                        React.createElement("rect", { x: cx - 12, y: 55, width: 24, height: 45, fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.5, rx: 3 }),

                        React.createElement("line", { x1: cx - 8, y1: 65, x2: cx + 8, y2: 65, stroke: "#ca8a04", strokeWidth: 1 }),

                        React.createElement("line", { x1: cx - 8, y1: 72, x2: cx + 8, y2: 72, stroke: "#ca8a04", strokeWidth: 1 }),

                        React.createElement("line", { x1: cx - 8, y1: 79, x2: cx + 8, y2: 79, stroke: "#ca8a04", strokeWidth: 1 }),

                        React.createElement("line", { x1: cx - 8, y1: 86, x2: cx + 8, y2: 86, stroke: "#ca8a04", strokeWidth: 1 })

                      )

                      : comp.type === 'switch'

                      ? React.createElement("g", { onClick: function () { toggleSwitch(comp.id); }, style: { cursor: 'pointer' } },

                        React.createElement("rect", { x: cx - 14, y: 55, width: 28, height: 40, fill: comp.closed ? '#d1fae5' : '#fee2e2', stroke: comp.closed ? '#059669' : '#dc2626', strokeWidth: 1.5, rx: 4 }),

                        React.createElement("circle", { cx: cx - 6, cy: 75, r: 3, fill: '#1e293b' }),

                        React.createElement("circle", { cx: cx + 6, cy: 75, r: 3, fill: '#1e293b' }),

                        comp.closed

                          ? React.createElement("line", { x1: cx - 6, y1: 75, x2: cx + 6, y2: 75, stroke: '#059669', strokeWidth: 2.5 })

                          : React.createElement("line", { x1: cx - 6, y1: 75, x2: cx + 4, y2: 62, stroke: '#dc2626', strokeWidth: 2.5 }),

                        React.createElement("text", { x: cx, y: 68, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: 'bold' }, fill: comp.closed ? '#059669' : '#dc2626' }, comp.closed ? 'ON' : 'OFF')

                      )

                      : comp.type === 'led'

                      ? React.createElement("g", { onClick: function () { cycleLedColor(comp.id); }, style: { cursor: 'pointer' } },

                        ledGlow > 0.1 && React.createElement("circle", { cx: cx, cy: 75, r: 18 + ledGlow * 8, fill: (comp.ledColor || '#ef4444').replace(')', ',' + (ledGlow * 0.3).toFixed(2) + ')').replace('rgb', 'rgba').replace('#ef4444', 'rgba(239,68,68,' + (ledGlow * 0.3).toFixed(2) + ')').replace('#22c55e', 'rgba(34,197,94,' + (ledGlow * 0.3).toFixed(2) + ')').replace('#3b82f6', 'rgba(59,130,246,' + (ledGlow * 0.3).toFixed(2) + ')').replace('#eab308', 'rgba(234,179,8,' + (ledGlow * 0.3).toFixed(2) + ')').replace('#f8fafc', 'rgba(248,250,252,' + (ledGlow * 0.3).toFixed(2) + ')') }),

                        React.createElement("polygon", { points: (cx - 10) + ',65 ' + (cx + 10) + ',65 ' + cx + ',88', fill: ledGlow > 0.2 ? (comp.ledColor || '#ef4444') : '#fecaca', stroke: comp.ledColor || '#ef4444', strokeWidth: 1.5 }),

                        React.createElement("line", { x1: cx - 10, y1: 88, x2: cx + 10, y2: 88, stroke: comp.ledColor || '#ef4444', strokeWidth: 2 }),

                        React.createElement("line", { x1: cx + 7, y1: 70, x2: cx + 13, y2: 63, stroke: comp.ledColor || '#ef4444', strokeWidth: 1 }),

                        React.createElement("polygon", { points: (cx + 13) + ',63 ' + (cx + 11) + ',66 ' + (cx + 14) + ',65', fill: comp.ledColor || '#ef4444' }),

                        React.createElement("line", { x1: cx + 10, y1: 74, x2: cx + 16, y2: 67, stroke: comp.ledColor || '#ef4444', strokeWidth: 1 }),

                        React.createElement("polygon", { points: (cx + 16) + ',67 ' + (cx + 14) + ',70 ' + (cx + 17) + ',69', fill: comp.ledColor || '#ef4444' })

                      )

                      : comp.type === 'ammeter'

                      ? React.createElement("g", null,

                        React.createElement("circle", { cx: cx, cy: 75, r: 15, fill: '#eff6ff', stroke: '#2563eb', strokeWidth: 2 }),

                        React.createElement("text", { x: cx, y: 79, textAnchor: 'middle', style: { fontSize: '12px', fontWeight: 'bold' }, fill: '#2563eb' }, 'A'),

                        current > 0.001 && React.createElement("text", { x: cx, y: 68, textAnchor: 'middle', style: { fontSize: '6px', fontWeight: 'bold' }, fill: '#1d4ed8' }, current.toFixed(3) + 'A')

                      )

                      : comp.type === 'voltmeter'

                      ? React.createElement("g", null,

                        React.createElement("circle", { cx: cx, cy: 75, r: 15, fill: '#fefce8', stroke: '#ca8a04', strokeWidth: 2 }),

                        React.createElement("text", { x: cx, y: 79, textAnchor: 'middle', style: { fontSize: '12px', fontWeight: 'bold' }, fill: '#ca8a04' }, 'V'),

                        React.createElement("text", { x: cx, y: 68, textAnchor: 'middle', style: { fontSize: '6px', fontWeight: 'bold' }, fill: '#a16207' }, d.voltage.toFixed(1) + 'V')

                      )

                      : React.createElement("g", null,

                        // Glowing halo for bulb

                        bulbBright > 0.1 && React.createElement("circle", { cx: cx, cy: 77, r: 20 + bulbBright * 8, fill: "rgba(251,191,36," + (bulbBright * 0.25).toFixed(2) + ")" }),

                        React.createElement("circle", { cx: cx, cy: 77, r: 15, fill: bulbBright > 0.3 ? "rgba(251,191,36," + (0.3 + bulbBright * 0.7).toFixed(2) + ")" : '#fef3c7', stroke: "#f59e0b", strokeWidth: 1.5 }),

                        React.createElement("line", { x1: cx - 5, y1: 72, x2: cx + 5, y2: 82, stroke: "#92400e", strokeWidth: 1 }),

                        React.createElement("line", { x1: cx + 5, y1: 72, x2: cx - 5, y2: 82, stroke: "#92400e", strokeWidth: 1 })

                      ),

                    comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter' && React.createElement("text", { x: cx, y: comp.type === 'resistor' ? 110 : (comp.type === 'led' ? 104 : 100), textAnchor: "middle", style: { fontSize: '8px', fontWeight: 'bold' }, fill: "#78350f" }, (comp.type === 'led' ? '~2V drop' : comp.value + "\u03A9")),

                    // Voltage drop label

                    current > 0.01 && comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter' && React.createElement("text", { x: cx, y: comp.type === 'resistor' ? 118 : (comp.type === 'led' ? 112 : 108), textAnchor: "middle", style: { fontSize: '7px' }, fill: "#3b82f6" }, compV.toFixed(1) + "V"),

                    React.createElement("line", { x1: cx, y1: comp.type === 'resistor' ? 100 : (comp.type === 'switch' ? 95 : (comp.type === 'ammeter' || comp.type === 'voltmeter' ? 90 : 92)), x2: cx, y2: 140, stroke: "#1e293b", strokeWidth: 2 })

                  );

                })

                // Components â€” Parallel

                : d.components.map(function (comp, i) {

                  var cy = 40 + i * Math.min(30, 80 / Math.max(d.components.length, 1));

                  var compR2 = getCompR(comp);

                  var compI2 = d.voltage / compR2;

                  var compP2 = d.voltage * compI2;

                  var bulbBright2 = comp.type === 'bulb' ? Math.min(compP2 / 10, 1) : 0;

                  var ledGlow2 = comp.type === 'led' && compI2 > 0.005 ? Math.min(compI2 * 20, 1) : 0;

                  return React.createElement("g", { key: comp.id },

                    React.createElement("line", { x1: 180, y1: cy, x2: 200, y2: cy, stroke: "#1e293b", strokeWidth: 1.5 }),

                    comp.type === 'resistor'

                      ? React.createElement("rect", { x: 200, y: cy - 8, width: 40, height: 16, fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.5, rx: 2 })

                      : comp.type === 'switch'

                      ? React.createElement("g", { onClick: function () { toggleSwitch(comp.id); }, style: { cursor: 'pointer' } },

                        React.createElement("rect", { x: 200, y: cy - 8, width: 40, height: 16, fill: comp.closed ? '#d1fae5' : '#fee2e2', stroke: comp.closed ? '#059669' : '#dc2626', strokeWidth: 1.5, rx: 3 }),

                        React.createElement("text", { x: 220, y: cy + 4, textAnchor: 'middle', style: { fontSize: '8px', fontWeight: 'bold' }, fill: comp.closed ? '#059669' : '#dc2626' }, comp.closed ? 'ON' : 'OFF')

                      )

                      : comp.type === 'led'

                      ? React.createElement("g", { onClick: function () { cycleLedColor(comp.id); }, style: { cursor: 'pointer' } },

                        ledGlow2 > 0.1 && React.createElement("circle", { cx: 220, cy: cy, r: 14 + ledGlow2 * 5, fill: 'rgba(239,68,68,' + (ledGlow2 * 0.25).toFixed(2) + ')' }),

                        React.createElement("polygon", { points: '210,' + (cy - 6) + ' 230,' + (cy - 6) + ' 220,' + (cy + 8), fill: ledGlow2 > 0.2 ? (comp.ledColor || '#ef4444') : '#fecaca', stroke: comp.ledColor || '#ef4444', strokeWidth: 1 }),

                        React.createElement("line", { x1: 210, y1: cy + 8, x2: 230, y2: cy + 8, stroke: comp.ledColor || '#ef4444', strokeWidth: 1.5 })

                      )

                      : comp.type === 'ammeter'

                      ? React.createElement("g", null,

                        React.createElement("circle", { cx: 220, cy: cy, r: 10, fill: '#eff6ff', stroke: '#2563eb', strokeWidth: 1.5 }),

                        React.createElement("text", { x: 220, y: cy + 4, textAnchor: 'middle', style: { fontSize: '9px', fontWeight: 'bold' }, fill: '#2563eb' }, 'A')

                      )

                      : comp.type === 'voltmeter'

                      ? React.createElement("g", null,

                        React.createElement("circle", { cx: 220, cy: cy, r: 10, fill: '#fefce8', stroke: '#ca8a04', strokeWidth: 1.5 }),

                        React.createElement("text", { x: 220, y: cy + 4, textAnchor: 'middle', style: { fontSize: '9px', fontWeight: 'bold' }, fill: '#ca8a04' }, 'V')

                      )

                      : React.createElement("g", null,

                        bulbBright2 > 0.1 && React.createElement("circle", { cx: 220, cy: cy, r: 15 + bulbBright2 * 5, fill: "rgba(251,191,36," + (bulbBright2 * 0.25).toFixed(2) + ")" }),

                        React.createElement("circle", { cx: 220, cy: cy, r: 10, fill: bulbBright2 > 0.3 ? "rgba(251,191,36," + (0.3 + bulbBright2 * 0.7).toFixed(2) + ")" : '#fef3c7', stroke: "#f59e0b", strokeWidth: 1.5 })

                      ),

                    comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter' && React.createElement("text", { x: 220, y: cy + 4, textAnchor: "middle", style: { fontSize: '7px', fontWeight: 'bold' }, fill: "#78350f" }, comp.type === 'led' ? '~2V' : comp.value + "\u03A9"),

                    comp.type === 'ammeter' && React.createElement("text", { x: 250, y: cy + 3, style: { fontSize: '6px', fontWeight: 'bold' }, fill: "#2563eb" }, compI2.toFixed(3) + 'A'),

                    comp.type === 'voltmeter' && React.createElement("text", { x: 250, y: cy + 3, style: { fontSize: '6px', fontWeight: 'bold' }, fill: "#ca8a04" }, d.voltage.toFixed(1) + 'V'),

                    comp.type !== 'ammeter' && comp.type !== 'voltmeter' && React.createElement("text", { x: 250, y: cy + 3, style: { fontSize: '6px' }, fill: "#3b82f6" }, compI2.toFixed(2) + "A"),

                    React.createElement("line", { x1: 240, y1: cy, x2: 260, y2: cy, stroke: "#1e293b", strokeWidth: 1.5 })

                  );

                }),

              // Electron dots

              electronDots.map(function (dot, i) {

                return React.createElement("circle", { key: 'e' + i, cx: dot.x, cy: dot.y, r: 3, fill: "#3b82f6", opacity: 0.8 });

              }),

              // Empty state

              d.components.length === 0 && React.createElement("text", { x: W / 2, y: H / 2, textAnchor: "middle", fill: "#94a3b8", style: { fontSize: '12px' } }, "Add components below")

            ),

            // Component buttons

            React.createElement("div", { className: "flex flex-wrap gap-2 mt-3 mb-3" },

              React.createElement("button", { onClick: () => upd('components', [...d.components, { type: 'resistor', value: 100, id: Date.now() }]), className: "px-3 py-1.5 bg-yellow-100 text-yellow-800 font-bold rounded-lg text-sm border border-yellow-300 hover:bg-yellow-200 transition-all" }, "\u2795 Resistor"),

              React.createElement("button", { onClick: () => upd('components', [...d.components, { type: 'bulb', value: 50, id: Date.now() + 1 }]), className: "px-3 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-lg text-sm border border-amber-300 hover:bg-amber-200 transition-all" }, "\uD83D\uDCA1 Bulb"),

              React.createElement("button", { onClick: () => upd('components', [...d.components, { type: 'switch', value: 0, id: Date.now() + 2, closed: true }]), className: "px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-sm border border-emerald-300 hover:bg-emerald-200 transition-all" }, "\uD83D\uDD18 Switch"),

              React.createElement("button", { onClick: () => upd('components', [...d.components, { type: 'led', value: 40, id: Date.now() + 3, ledColor: '#ef4444' }]), className: "px-3 py-1.5 bg-rose-100 text-rose-800 font-bold rounded-lg text-sm border border-rose-300 hover:bg-rose-200 transition-all" }, "\uD83D\uDD34 LED"),

              React.createElement("button", { onClick: () => upd('components', [...d.components, { type: 'ammeter', value: 0, id: Date.now() + 4 }]), className: "px-3 py-1.5 bg-blue-100 text-blue-800 font-bold rounded-lg text-sm border border-blue-300 hover:bg-blue-200 transition-all" }, "\u26A1 Ammeter"),

              React.createElement("button", { onClick: () => upd('components', [...d.components, { type: 'voltmeter', value: 0, id: Date.now() + 5 }]), className: "px-3 py-1.5 bg-orange-100 text-orange-800 font-bold rounded-lg text-sm border border-orange-300 hover:bg-orange-200 transition-all" }, "\uD83D\uDD0B Voltmeter"),

              React.createElement("button", { onClick: () => upd('components', []), className: "px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm border border-red-200 hover:bg-red-100 transition-all" }, "\uD83D\uDDD1 Clear"),

              d.components.length > 0 && React.createElement("span", { className: "self-center text-xs text-slate-400 ml-auto" }, d.components.length + " component" + (d.components.length > 1 ? 's' : ''))

            ),

            // Voltage slider + component editor

            React.createElement("div", { className: "bg-white rounded-xl border border-yellow-200 p-3" },

              React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                React.createElement("span", { className: "text-xl" }, "\uD83D\uDD0B"),

                React.createElement("input", { type: "range", min: 1, max: 24, step: 0.5, value: d.voltage, onChange: e => upd('voltage', parseFloat(e.target.value)), className: "flex-1 accent-yellow-600" }),

                React.createElement("span", { className: "font-bold text-yellow-700 w-12 text-right" }, d.voltage + "V")

              ),

              React.createElement("div", { className: "flex flex-wrap gap-2" },

                d.components.map(function (comp, i) {

                  var compIcon = comp.type === 'resistor' ? '\u2AE8' : comp.type === 'bulb' ? '\uD83D\uDCA1' : comp.type === 'switch' ? '\uD83D\uDD18' : comp.type === 'led' ? '\uD83D\uDD34' : comp.type === 'ammeter' ? '\u26A1' : '\uD83D\uDD0B';

                  var compLabel = comp.type === 'resistor' ? 'R' : comp.type === 'bulb' ? 'Bulb' : comp.type === 'switch' ? (comp.closed ? 'ON' : 'OFF') : comp.type === 'led' ? 'LED' : comp.type === 'ammeter' ? 'Ammeter' : 'Voltmeter';

                  return React.createElement("div", { key: comp.id, className: "flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200" },

                    React.createElement("span", null, compIcon),

                    React.createElement("span", { className: "text-xs font-bold text-slate-600 min-w-[40px]" }, compLabel),

                    (comp.type === 'resistor' || comp.type === 'bulb') && React.createElement("input", { type: "number", min: 1, max: 10000, value: comp.value, onChange: function (e) { var nc = [...d.components]; nc[i] = Object.assign({}, nc[i], { value: parseInt(e.target.value) || 1 }); upd('components', nc); }, className: "w-20 px-2 py-1 text-sm border rounded text-center font-mono" }),

                    (comp.type === 'resistor' || comp.type === 'bulb') && React.createElement("span", { className: "text-xs text-slate-500" }, "\u03A9"),

                    comp.type === 'switch' && React.createElement("button", { onClick: function () { toggleSwitch(comp.id); }, className: "px-2 py-1 text-xs font-bold rounded border transition-all " + (comp.closed ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-red-100 text-red-700 border-red-300') }, comp.closed ? 'Close' : 'Open'),

                    comp.type === 'led' && React.createElement("button", { onClick: function () { cycleLedColor(comp.id); }, className: "w-5 h-5 rounded-full border-2 border-slate-300", style: { backgroundColor: comp.ledColor || '#ef4444' } }),

                    React.createElement("button", { onClick: function () { upd('components', d.components.filter(function (_, j) { return j !== i; })); }, className: "text-red-400 hover:text-red-600 ml-auto" }, "\u00D7")

                  );

                })

              )

            ),

            // Readout cards

            React.createElement("div", { className: "mt-3 grid grid-cols-4 gap-2" },

              [

                { label: t('stem.circuit.mode'), val: mode, color: 'slate', icon: mode === 'series' ? '\u2192' : '\u2261' },

                { label: t('stem.circuit.resistance'), val: totalR.toFixed(1) + '\u03A9', color: 'yellow', icon: '\u2AE8' },

                { label: t('stem.circuit.current'), val: current.toFixed(3) + 'A', color: 'blue', icon: '\u26A1' },

                { label: t('stem.circuit.power'), val: power.toFixed(2) + 'W', color: 'red', icon: '\uD83D\uDD25' }

              ].map(function (m) {

                return React.createElement("div", { key: m.label, className: "text-center p-2 rounded-xl border transition-all " + (isShort && m.label !== t('stem.circuit.mode') ? 'bg-red-50 border-red-200' : 'bg-' + m.color + '-50 border-' + m.color + '-200') },

                  React.createElement("p", { className: "text-[10px] font-bold uppercase " + (isShort && m.label !== t('stem.circuit.mode') ? 'text-red-600' : 'text-' + m.color + '-600') }, m.icon + ' ' + m.label),

                  React.createElement("p", { className: "text-sm font-bold " + (isShort && m.label !== t('stem.circuit.mode') ? 'text-red-800' : 'text-' + m.color + '-800') }, m.val)

                );

              })

            ),

            // Per-component analysis

            d.components.length > 0 && React.createElement("div", { className: "mt-3 bg-yellow-50 rounded-xl border border-yellow-200 p-3" },

              React.createElement("p", { className: "text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-2" }, "\u26A1 Per-Component Analysis"),

              React.createElement("div", { className: "space-y-1" },

                d.components.map(function (comp, i) {

                  var compR = getCompR(comp);

                  var compI = mode === 'series' ? current : d.voltage / compR;

                  var compV = mode === 'series' ? current * compR : d.voltage;

                  var compP = compV * compI;

                  var typeIcon = comp.type === 'resistor' ? '\u2AE8 R' : comp.type === 'bulb' ? '\uD83D\uDCA1 B' : comp.type === 'switch' ? '\uD83D\uDD18 S' : comp.type === 'led' ? '\uD83D\uDD34 L' : comp.type === 'ammeter' ? '\u26A1 A' : '\uD83D\uDD0B V';

                  var rDisplay = comp.type === 'switch' ? (comp.closed ? '~0\u03A9' : '\u221E') : comp.type === 'ammeter' ? '~0\u03A9' : comp.type === 'voltmeter' ? '\u221E' : comp.type === 'led' ? '~40\u03A9' : comp.value + '\u03A9';

                  return React.createElement("div", { key: comp.id, className: "flex items-center gap-2 text-xs bg-white rounded-lg px-2 py-1.5 border" },

                    React.createElement("span", { className: "font-bold text-yellow-700 w-16" }, typeIcon + (i + 1)),

                    React.createElement("span", { className: "text-slate-500 w-16" }, rDisplay),

                    comp.type === 'ammeter' ? React.createElement("span", { className: "text-blue-600 w-40 font-mono font-bold" }, '\u27A1 ' + compI.toFixed(3) + 'A (reads current)')

                    : comp.type === 'voltmeter' ? React.createElement("span", { className: "text-amber-600 w-40 font-mono font-bold" }, '\u27A1 ' + d.voltage.toFixed(1) + 'V (reads voltage)')

                    : React.createElement(React.Fragment, null,

                      React.createElement("span", { className: "text-blue-600 w-20 font-mono" }, compV.toFixed(2) + 'V'),

                      React.createElement("span", { className: "text-emerald-600 w-20 font-mono" }, compI.toFixed(3) + 'A'),

                      React.createElement("span", { className: "text-red-600 w-20 font-mono font-bold" }, compP.toFixed(2) + 'W')

                    ),

                    comp.type === 'bulb' && React.createElement("span", { className: "text-yellow-500" }, compP > 10 ? '\uD83D\uDD06' : compP > 3 ? '\uD83D\uDCA1' : '\uD83D\uDD05'),

                    comp.type === 'switch' && React.createElement("span", { className: comp.closed ? 'text-emerald-500' : 'text-red-500' }, comp.closed ? '\u2705 Closed' : '\u274C Open'),

                    comp.type === 'led' && React.createElement("span", { style: { color: comp.ledColor || '#ef4444' } }, compI > 0.005 ? '\u2B50 Lit' : '\u26AB Off')

                  );

                })

              ),

              React.createElement("div", { className: "mt-2 flex items-center gap-2 text-[10px] text-slate-400" },

                React.createElement("span", null, "\u2696 V = IR"),

                React.createElement("span", null, "\u2022"),

                React.createElement("span", null, "P = IV"),

                React.createElement("span", null, "\u2022"),

                React.createElement("span", null, mode === 'series' ? 'Series: same current through all' : 'Parallel: same voltage across all')

              )

            ),

            // Open circuit warning

            isOpen && React.createElement("div", { className: "mt-3 bg-amber-100 rounded-xl border-2 border-amber-400 p-3 text-center" },

              React.createElement("p", { className: "text-lg font-black text-amber-700" }, "\uD83D\uDD13 CIRCUIT OPEN"),

              React.createElement("p", { className: "text-xs text-amber-600 mt-1" }, "A switch is open \u2014 no current flows. Close all switches to complete the circuit.")

            ),

            // Short circuit warning

            isShort && React.createElement("div", { className: "mt-3 bg-red-100 rounded-xl border-2 border-red-400 p-3 text-center animate-pulse" },

              React.createElement("p", { className: "text-lg font-black text-red-700" }, "\u26A0\uFE0F SHORT CIRCUIT DETECTED"),

              React.createElement("p", { className: "text-xs text-red-600 mt-1" }, "Total resistance is below 1\u03A9! In real life, this could damage components or cause a fire. Add more resistance.")

            ),

            // Circuit challenges

            React.createElement("div", { className: "mt-3 bg-amber-50 rounded-xl border border-amber-200 p-3" },

              React.createElement("p", { className: "text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2" }, "\uD83C\uDFAF Circuit Challenges"),

              React.createElement("div", { className: "flex flex-wrap gap-2" },

                [

                  { label: t('stem.circuit.get_2a_current'), target: 2, type: 'current', unit: 'A' },

                  { label: t('stem.circuit.get_05a_current'), target: 0.5, type: 'current', unit: 'A' },

                  { label: t('stem.circuit.total_r_200u03a9'), target: 200, type: 'resistance', unit: '\u03A9' },

                  { label: t('stem.circuit.power_24w'), target: 24, type: 'power', unit: 'W' },

                  { label: t('stem.circuit.total_r_50u03a9'), target: 50, type: 'resistance', unit: '\u03A9' },

                ].map(function (ch) {

                  var actual = ch.type === 'current' ? current : ch.type === 'resistance' ? totalR : power;

                  var close = Math.abs(actual - ch.target) < ch.target * 0.05;

                  return React.createElement("button", {

                    key: ch.label, onClick: function () {

                      if (close) { addToast(t('stem.circuit.u2705_challenge_complete_you_hit') + actual.toFixed(3) + ch.unit + ' (target: ' + ch.target + ch.unit + ')', 'success'); }

                      else { addToast(t('stem.circuit.ud83cudfaf_target') + ch.target + ch.unit + ' | Current: ' + actual.toFixed(3) + ch.unit + '. Adjust components!', 'info'); }

                      upd('challenge', ch);

                    }, className: "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all " + (close ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50')

                  }, (close ? '\u2705 ' : '\uD83C\uDFAF ') + ch.label);

                })

              )

            ),

            // â”€â”€ Ohm's Law Quiz â”€â”€

            (() => {

              var cq = d.ohmQuiz || null;

              var cqScore = d.ohmScore || 0;

              var cqStreak = d.ohmStreak || 0;

              function makeOhmQ() {

                var qTypes = [

                  function () { var V = [3, 5, 6, 9, 12, 24][Math.floor(Math.random() * 6)]; var R = [10, 20, 50, 100, 200, 500][Math.floor(Math.random() * 6)]; var I = V / R; return { q: 'A ' + V + 'V battery drives current through a ' + R + 'Î© resistor. What is the current?', a: parseFloat(I.toFixed(3)), unit: 'A', formula: 'I = V/R = ' + V + '/' + R + ' = ' + I.toFixed(3) + 'A' }; },

                  function () { var I2 = [0.1, 0.2, 0.5, 1, 2, 3][Math.floor(Math.random() * 6)]; var R2 = [10, 20, 50, 100, 200][Math.floor(Math.random() * 5)]; var V2 = I2 * R2; return { q: 'A current of ' + I2 + 'A flows through a ' + R2 + 'Î© resistor. What voltage is required?', a: parseFloat(V2.toFixed(1)), unit: 'V', formula: 'V = IR = ' + I2 + 'Ã—' + R2 + ' = ' + V2.toFixed(1) + 'V' }; },

                  function () { var V3 = [6, 9, 12, 24][Math.floor(Math.random() * 4)]; var I3 = [0.1, 0.2, 0.5, 1, 2][Math.floor(Math.random() * 5)]; var R3 = V3 / I3; return { q: 'A ' + V3 + 'V source pushes ' + I3 + 'A of current. What is the resistance?', a: parseFloat(R3.toFixed(1)), unit: 'Î©', formula: 'R = V/I = ' + V3 + '/' + I3 + ' = ' + R3.toFixed(1) + 'Î©' }; },

                  function () { var V4 = [6, 9, 12][Math.floor(Math.random() * 3)]; var I4 = [0.5, 1, 2, 3][Math.floor(Math.random() * 4)]; var P4 = V4 * I4; return { q: 'A ' + V4 + 'V circuit draws ' + I4 + 'A. What is the power consumed?', a: parseFloat(P4.toFixed(1)), unit: 'W', formula: 'P = IV = ' + I4 + 'Ã—' + V4 + ' = ' + P4.toFixed(1) + 'W' }; },

                  function () { var R5a = [50, 100, 200][Math.floor(Math.random() * 3)]; var R5b = [50, 100, 200][Math.floor(Math.random() * 3)]; var Rtot = R5a + R5b; return { q: 'Two resistors (' + R5a + 'Î© and ' + R5b + 'Î©) are in series. What is the total resistance?', a: parseFloat(Rtot.toFixed(1)), unit: 'Î©', formula: 'R_total = Râ‚ + Râ‚‚ = ' + R5a + ' + ' + R5b + ' = ' + Rtot + 'Î©' }; },

                  function () { var R6a = [100, 200, 300][Math.floor(Math.random() * 3)]; var R6b = [100, 200, 300][Math.floor(Math.random() * 3)]; var Rpar = (R6a * R6b) / (R6a + R6b); return { q: 'Two resistors (' + R6a + 'Î© and ' + R6b + 'Î©) are in parallel. What is the total resistance?', a: parseFloat(Rpar.toFixed(1)), unit: 'Î©', formula: 'R = (Râ‚Ã—Râ‚‚)/(Râ‚+Râ‚‚) = (' + R6a + 'Ã—' + R6b + ')/(' + R6a + '+' + R6b + ') = ' + Rpar.toFixed(1) + 'Î©' }; }

                ];

                var gen = qTypes[Math.floor(Math.random() * qTypes.length)]();

                var wrong1 = parseFloat((gen.a * (1.5 + Math.random())).toFixed(gen.unit === 'A' ? 3 : 1));

                var wrong2 = parseFloat((gen.a * (0.2 + Math.random() * 0.5)).toFixed(gen.unit === 'A' ? 3 : 1));

                var wrong3 = parseFloat((gen.a + (Math.random() > 0.5 ? 1 : -1) * (gen.a * 0.3 + 5)).toFixed(gen.unit === 'A' ? 3 : 1));

                if (wrong2 <= 0) wrong2 = parseFloat((gen.a * 2.5).toFixed(gen.unit === 'A' ? 3 : 1));

                var opts = [gen.a, wrong1, wrong2, wrong3].sort(function () { return Math.random() - 0.5; });

                return { text: gen.q, answer: gen.a, unit: gen.unit, formula: gen.formula, opts: opts, answered: false };

              }

              return React.createElement("div", { className: "mt-3 bg-blue-50 rounded-xl border border-blue-200 p-3" },

                React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                  React.createElement("button", {

                    onClick: function () { var q = makeOhmQ(); upd('ohmQuiz', q); },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (cq ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-blue-600 text-white hover:bg-blue-700')

                  }, cq ? 'ðŸ”„ Next Question' : 'âš¡ Ohm\'s Law Quiz'),

                  cqScore > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, 'â­ ' + cqScore + ' correct'),

                  cqStreak > 1 && React.createElement("span", { className: "text-xs font-bold text-orange-600" }, 'ðŸ”¥ ' + cqStreak + ' streak')

                ),

                cq && !cq.answered && React.createElement("div", { className: "bg-white rounded-lg p-3 border border-blue-200" },

                  React.createElement("p", { className: "text-sm font-bold text-blue-800 mb-3" }, cq.text),

                  React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                    cq.opts.map(function (opt, oi) {

                      return React.createElement("button", {

                        key: oi, onClick: function () {

                          var correct = Math.abs(opt - cq.answer) < 0.01;

                          upd('ohmQuiz', Object.assign({}, cq, { answered: true, chosen: opt }));

                          upd('ohmScore', cqScore + (correct ? 1 : 0));

                          upd('ohmStreak', correct ? cqStreak + 1 : 0);

                          if (correct) { addToast('âš¡ Correct! ' + cq.formula, 'success'); awardStemXP('circuit', 10, 'Ohm\'s Law Quiz'); }

                          else { addToast('âŒ ' + cq.formula, 'error'); }

                        }, className: "px-3 py-2.5 rounded-lg text-sm font-bold border-2 bg-white text-slate-700 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all"

                      }, opt + cq.unit);

                    })

                  )

                ),

                cq && cq.answered && React.createElement("div", { className: "p-3 rounded-lg text-sm font-bold " + (Math.abs(cq.chosen - cq.answer) < 0.01 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') },

                  Math.abs(cq.chosen - cq.answer) < 0.01 ? 'âœ… Correct!' : 'âŒ Answer: ' + cq.answer + cq.unit,

                  React.createElement("p", { className: "text-xs font-normal mt-1 " + (Math.abs(cq.chosen - cq.answer) < 0.01 ? 'text-emerald-600' : 'text-red-600') }, 'ðŸ“ ' + cq.formula)

                )

              );

            })(),

            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ci-' + Date.now(), tool: 'circuit', label: d.components.length + ' parts ' + d.voltage + 'V ' + mode, data: Object.assign({}, d, { mode: mode }), timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

          )
      })();
    }
  });

  console.log('[StemLab] stem_tool_science.js loaded â€” 29 tools');
})();
