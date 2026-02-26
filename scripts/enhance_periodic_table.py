"""
Enhance the Periodic Table in stem_lab_module.js:
1. Add ELEMENT_DETAILS data with descriptions, uses, and key compounds
2. Upgrade the selectedElement detail panel to show this info
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js"

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ===== ENHANCEMENT 1: Add ELEMENT_DETAILS data =====
# Insert after the ELEMENTS array closing (after line with n: 118 ... 'noble')
ANCHOR = "const getEl = (sym) => ELEMENTS.find(e => e.s === sym);"

ELEMENT_DETAILS = """
          // ── Element Details (descriptions, uses, compounds) ──
          const ELEMENT_DETAILS = {
            H:  { desc: 'Lightest element; fuels stars via fusion', uses: ['Fuel cells', 'Rocket propellant', 'Ammonia production'], compounds: ['H₂O (Water)', 'HCl (Hydrochloric Acid)', 'NH₃ (Ammonia)', 'CH₄ (Methane)'] },
            He: { desc: 'Inert noble gas; 2nd most abundant in universe', uses: ['Balloons & blimps', 'MRI coolant', 'Deep-sea diving gas'], compounds: ['None (noble gas — does not form compounds)'] },
            Li: { desc: 'Lightest metal; soft enough to cut with a knife', uses: ['Rechargeable batteries', 'Mood-stabilizing medication', 'Ceramics & glass'], compounds: ['LiOH (Lithium Hydroxide)', 'Li₂CO₃ (Lithium Carbonate)'] },
            Be: { desc: 'Rare, toxic metal that is very stiff and light', uses: ['Aerospace alloys', 'X-ray windows', 'Satellite components'], compounds: ['BeO (Beryllium Oxide)'] },
            B:  { desc: 'Metalloid essential for plant growth', uses: ['Borosilicate glass (Pyrex)', 'Cleaning products (borax)', 'Semiconductors'], compounds: ['B₂O₃ (Boron Trioxide)', 'H₃BO₃ (Boric Acid)'] },
            C:  { desc: 'Basis of all known life; forms diamond & graphite', uses: ['Steel production', 'Graphite pencils', 'Carbon fiber composites'], compounds: ['CO₂ (Carbon Dioxide)', 'CH₄ (Methane)', 'C₆H₁₂O₆ (Glucose)', 'CaCO₃ (Limestone)'] },
            N:  { desc: 'Makes up 78% of Earth\\'s atmosphere', uses: ['Fertilizers', 'Explosives (TNT)', 'Food preservation'], compounds: ['NH₃ (Ammonia)', 'NO₂ (Nitrogen Dioxide)', 'N₂O (Laughing Gas)', 'HNO₃ (Nitric Acid)'] },
            O:  { desc: 'Essential for respiration; most abundant element in Earth\\'s crust', uses: ['Medical oxygen', 'Welding & cutting', 'Water purification'], compounds: ['H₂O (Water)', 'CO₂ (Carbon Dioxide)', 'Fe₂O₃ (Rust)', 'O₃ (Ozone)'] },
            F:  { desc: 'Most reactive and electronegative element', uses: ['Toothpaste (fluoride)', 'Teflon coatings', 'Refrigerants'], compounds: ['HF (Hydrofluoric Acid)', 'NaF (Sodium Fluoride)', 'CF₄ (Carbon Tetrafluoride)'] },
            Ne: { desc: 'Produces iconic reddish-orange glow in signs', uses: ['Neon signs', 'High-voltage indicators', 'Laser technology'], compounds: ['None (noble gas)'] },
            Na: { desc: 'Soft, silvery metal that reacts explosively with water', uses: ['Table salt (NaCl)', 'Street lighting', 'Baking soda'], compounds: ['NaCl (Table Salt)', 'NaOH (Lye)', 'NaHCO₃ (Baking Soda)', 'Na₂CO₃ (Washing Soda)'] },
            Mg: { desc: 'Lightweight metal that burns with brilliant white flame', uses: ['Alloy wheels', 'Fireworks & flares', 'Antacid tablets'], compounds: ['MgO (Magnesium Oxide)', 'MgSO₄ (Epsom Salt)', 'Mg(OH)₂ (Milk of Magnesia)'] },
            Al: { desc: 'Most abundant metal in Earth\\'s crust', uses: ['Cans & foil', 'Aircraft frames', 'Window frames'], compounds: ['Al₂O₃ (Alumina)', 'AlCl₃ (Aluminum Chloride)'] },
            Si: { desc: 'Semiconductor that powers the digital age', uses: ['Computer chips', 'Solar panels', 'Glass & concrete'], compounds: ['SiO₂ (Sand/Quartz)', 'SiC (Silicon Carbide)'] },
            P:  { desc: 'Essential for DNA and bones; glows in the dark', uses: ['Fertilizers', 'Matches', 'Detergents'], compounds: ['H₃PO₄ (Phosphoric Acid)', 'Ca₃(PO₄)₂ (Bone mineral)'] },
            S:  { desc: 'Yellow element with distinctive rotten-egg smell', uses: ['Vulcanizing rubber', 'Sulfuric acid production', 'Gunpowder'], compounds: ['H₂SO₄ (Sulfuric Acid)', 'SO₂ (Sulfur Dioxide)', 'H₂S (Hydrogen Sulfide)'] },
            Cl: { desc: 'Greenish-yellow gas used to purify water', uses: ['Water treatment', 'PVC plastic', 'Bleach & disinfectants'], compounds: ['NaCl (Table Salt)', 'HCl (Hydrochloric Acid)', 'NaOCl (Bleach)'] },
            Ar: { desc: 'Third most abundant gas in atmosphere', uses: ['Welding shield gas', 'Light bulb filling', 'Window insulation'], compounds: ['None (noble gas)'] },
            K:  { desc: 'Essential nutrient found in bananas', uses: ['Fertilizers (potash)', 'Soap making', 'Food preservation'], compounds: ['KCl (Potassium Chloride)', 'KOH (Potassium Hydroxide)', 'KNO₃ (Saltpeter)'] },
            Ca: { desc: 'Builds bones and teeth; 5th most abundant element', uses: ['Cement & concrete', 'Chalk & plaster', 'Dietary supplement'], compounds: ['CaCO₃ (Limestone/Chalk)', 'CaO (Quicklime)', 'Ca(OH)₂ (Slaked Lime)', 'CaSO₄ (Gypsum)'] },
            Fe: { desc: 'Most used metal; core of Earth is mostly iron', uses: ['Steel construction', 'Cast iron cookware', 'Magnetic devices'], compounds: ['Fe₂O₃ (Rust)', 'FeSO₄ (Iron Supplement)', 'Fe₃O₄ (Magnetite)'] },
            Cu: { desc: 'Reddish metal used since the Bronze Age', uses: ['Electrical wiring', 'Plumbing pipes', 'Coins'], compounds: ['CuSO₄ (Blue Vitriol)', 'CuO (Copper Oxide)', 'Cu₂O (Cuprous Oxide)'] },
            Zn: { desc: 'Bluish-white metal that prevents rust', uses: ['Galvanizing steel', 'Batteries', 'Sunscreen (zinc oxide)'], compounds: ['ZnO (Zinc Oxide)', 'ZnS (Zinc Sulfide)', 'ZnCl₂ (Zinc Chloride)'] },
            Ag: { desc: 'Best conductor of electricity among all metals', uses: ['Jewelry & silverware', 'Photography', 'Electronics'], compounds: ['AgNO₃ (Silver Nitrate)', 'AgCl (Silver Chloride)', 'Ag₂O (Silver Oxide)'] },
            Au: { desc: 'Dense, soft, shiny precious metal — never rusts', uses: ['Jewelry', 'Electronics (connectors)', 'Currency reserves'], compounds: ['AuCl₃ (Gold Chloride) — gold rarely forms compounds'] },
            Ti: { desc: 'Strong as steel but 45% lighter', uses: ['Aircraft & spacecraft', 'Joint replacements', 'Titanium white paint'], compounds: ['TiO₂ (Titanium Dioxide)', 'TiCl₄ (Titanium Tetrachloride)'] },
            Cr: { desc: 'Shiny metal that gives rubies their red color', uses: ['Chrome plating', 'Stainless steel', 'Leather tanning'], compounds: ['Cr₂O₃ (Chromium Oxide)', 'K₂Cr₂O₇ (Potassium Dichromate)'] },
            Mn: { desc: 'Essential for steel production and bone health', uses: ['Steel alloys', 'Alkaline batteries', 'Glass decolorizer'], compounds: ['MnO₂ (Manganese Dioxide)', 'KMnO₄ (Potassium Permanganate)'] },
            Ni: { desc: 'Corrosion-resistant metal used in coins worldwide', uses: ['Stainless steel', 'Rechargeable batteries', 'Coins'], compounds: ['NiO (Nickel Oxide)', 'NiSO₄ (Nickel Sulfate)'] },
            Br: { desc: 'Only non-metal liquid at room temperature', uses: ['Flame retardants', 'Photography', 'Water purification'], compounds: ['NaBr (Sodium Bromide)', 'HBr (Hydrobromic Acid)'] },
            I:  { desc: 'Essential trace element for thyroid function', uses: ['Antiseptic (tincture)', 'Iodized salt', 'Medical imaging'], compounds: ['KI (Potassium Iodide)', 'HI (Hydroiodic Acid)'] },
            Pt: { desc: 'Precious metal rarer than gold', uses: ['Catalytic converters', 'Jewelry', 'Anti-cancer drugs'], compounds: ['PtCl₂ (Platinum Chloride)', 'H₂PtCl₆ (Chloroplatinic Acid)'] },
            U:  { desc: 'Dense radioactive metal that powers nuclear plants', uses: ['Nuclear power', 'Nuclear weapons', 'Radiation shielding'], compounds: ['UO₂ (Uranium Dioxide)', 'UF₆ (Uranium Hexafluoride)'] },
            Hg: { desc: 'Only metal liquid at room temperature', uses: ['Thermometers (historic)', 'Fluorescent lights', 'Dental amalgams'], compounds: ['HgCl₂ (Mercury Chloride)', 'HgO (Mercury Oxide)'] },
            Pb: { desc: 'Dense, soft metal once used in pipes & paint', uses: ['Car batteries', 'Radiation shielding', 'Solder (lead-free now)'], compounds: ['PbO (Lead Oxide)', 'PbSO₄ (Lead Sulfate)'] },
            Sn: { desc: 'Soft, silvery metal used since the Bronze Age', uses: ['Tin cans (coating)', 'Solder', 'Bronze alloy'], compounds: ['SnO₂ (Tin Oxide)', 'SnCl₂ (Tin Chloride)'] },
            W:  { desc: 'Has the highest melting point of all metals', uses: ['Light bulb filaments', 'Drill bits & cutting tools', 'Military armor'], compounds: ['WO₃ (Tungsten Trioxide)', 'WC (Tungsten Carbide)'] },
          };
          const getElementDetail = (sym) => ELEMENT_DETAILS[sym] || null;
          const getElementCompounds = (sym) => COMPOUNDS.filter(c => Object.keys(c.recipe).includes(sym));
"""

if ANCHOR in c:
    c = c.replace(ANCHOR, ELEMENT_DETAILS + "\n          " + ANCHOR)
    changes += 1
    print('Enhancement 1: Added ELEMENT_DETAILS data')
else:
    print('ANCHOR not found for ELEMENT_DETAILS')

# ===== ENHANCEMENT 2: Upgrade the detail panel UI =====
# Current panel (L3836-3845):
#   d.selectedElement && React.createElement("div", { className: "mb-3 p-3 rounded-xl border-2 flex items-center gap-3 " + ... },
#     ... just shows name, symbol, atomic #, category
# Replace it with an expanded panel

OLD_PANEL = '''d.selectedElement && React.createElement("div", { className: "mb-3 p-3 rounded-xl border-2 flex items-center gap-3 " + (catColors[d.selectedElement.cat] || 'bg-slate-50 border-slate-200') },
                React.createElement("div", { className: "w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-md", style: { backgroundColor: d.selectedElement.c } },
                  React.createElement("span", { className: "text-[10px] opacity-80" }, d.selectedElement.n),
                  React.createElement("span", { className: "text-xl font-black" }, d.selectedElement.s)
                ),
                React.createElement("div", null,
                  React.createElement("p", { className: "text-lg font-bold text-slate-800" }, d.selectedElement.name),
                  React.createElement("p", { className: "text-xs text-slate-500" }, "Atomic #" + d.selectedElement.n + " \\u2022 " + (d.selectedElement.cat || 'element').replace(/^\\w/, c => c.toUpperCase()))
                )
              )'''

NEW_PANEL = '''d.selectedElement && (() => {
                const detail = getElementDetail(d.selectedElement.s);
                const relatedCompounds = getElementCompounds(d.selectedElement.s);
                return React.createElement("div", { className: "mb-3 rounded-xl border-2 overflow-hidden " + (catColors[d.selectedElement.cat] || 'bg-slate-50 border-slate-200') },
                  React.createElement("div", { className: "p-3 flex items-center gap-3" },
                    React.createElement("div", { className: "w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-md flex-shrink-0", style: { backgroundColor: d.selectedElement.c } },
                      React.createElement("span", { className: "text-[10px] opacity-80" }, d.selectedElement.n),
                      React.createElement("span", { className: "text-xl font-black" }, d.selectedElement.s)
                    ),
                    React.createElement("div", { className: "flex-1 min-w-0" },
                      React.createElement("p", { className: "text-lg font-bold text-slate-800" }, d.selectedElement.name),
                      React.createElement("p", { className: "text-xs text-slate-500" }, "Atomic #" + d.selectedElement.n + " \\u2022 " + (d.selectedElement.cat || 'element').replace(/^\\w/, c => c.toUpperCase())),
                      detail && React.createElement("p", { className: "text-xs text-slate-600 mt-1 italic" }, detail.desc)
                    ),
                    React.createElement("button", { onClick: () => upd('selectedElement', null), className: "p-1 text-slate-400 hover:text-slate-600 flex-shrink-0" }, "\\u2715")
                  ),
                  detail && React.createElement("div", { className: "border-t border-slate-200/50 px-3 pb-3" },
                    React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2 mt-2" },
                      React.createElement("div", null,
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" }, "\\uD83D\\uDD27 Common Uses"),
                        React.createElement("div", { className: "flex flex-wrap gap-1" },
                          (detail.uses || []).map((use, i) => React.createElement("span", { key: i, className: "px-2 py-0.5 bg-white/60 rounded-full text-[10px] font-medium text-slate-700 border border-slate-200/80" }, use))
                        )
                      ),
                      React.createElement("div", null,
                        React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" }, "\\uD83E\\uDDEA Key Compounds"),
                        React.createElement("div", { className: "flex flex-wrap gap-1" },
                          (detail.compounds || []).map((comp, i) => React.createElement("span", { key: i, className: "px-2 py-0.5 bg-white/60 rounded-full text-[10px] font-medium text-slate-700 border border-slate-200/80" }, comp))
                        )
                      )
                    ),
                    relatedCompounds.length > 0 && React.createElement("div", { className: "mt-2" },
                      React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" }, "\\u2697\\uFE0F Craftable in Compound Creator (" + relatedCompounds.length + ")"),
                      React.createElement("div", { className: "flex flex-wrap gap-1" },
                        relatedCompounds.map((comp, i) => React.createElement("button", { key: i, onClick: () => { upd('moleculeMode', 'creator'); upd('selectedElements', { ...comp.recipe }); }, className: "px-2 py-0.5 bg-emerald-50 rounded-full text-[10px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors" }, comp.emoji + " " + comp.name + " (" + comp.formula + ")"))
                      )
                    )
                  )
                );
              })()'''

if OLD_PANEL in c:
    c = c.replace(OLD_PANEL, NEW_PANEL)
    changes += 1
    print('Enhancement 2: Upgraded detail panel UI')
else:
    print('OLD_PANEL not found — checking for variations...')
    # Let's try a more flexible search
    if 'd.selectedElement && React.createElement("div", { className: "mb-3 p-3 rounded-xl border-2 flex items-center gap-3 "' in c:
        print('Found panel start but full match failed')
    else:
        print('Panel pattern not found at all')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\nTotal changes: {changes}/2')
