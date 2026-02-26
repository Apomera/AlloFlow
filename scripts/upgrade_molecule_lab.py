"""
Upgrade the Molecule Builder to include:
1. Compound Creator mode with periodic table grid (118 elements)
2. Compound recipes (20+ discoverable compounds)
3. Material Decomposer (new tool)
4. Discovery log tracking
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Replace existing molecule tool with enhanced version ──
OLD_MOLECULE_START = "stemLabTab === 'explore' && stemLabTool === 'molecule' && (() => {"
start_idx = content.find(OLD_MOLECULE_START)
if start_idx == -1:
    print("ERROR: Could not find molecule section")
    exit(1)

# Find end of IIFE
brace_count = 0
in_section = False
end_idx = start_idx
i = start_idx
while i < len(content):
    ch = content[i]
    if ch == '{': brace_count += 1; in_section = True
    elif ch == '}':
        brace_count -= 1
        if in_section and brace_count == 0:
            rest = content[i:i+5]
            if rest.startswith('})()'):
                end_idx = i + 4
                break
    i += 1

print(f"Found molecule section: chars {start_idx} to {end_idx}")

NEW_MOLECULE = r"""stemLabTab === 'explore' && stemLabTool === 'molecule' && (() => {
          const d = labToolData.molecule;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, molecule: { ...prev.molecule, [key]: val } }));
          const W = 400, H = 300;
          const mode = d.moleculeMode || 'viewer';
          // ── Periodic Table Data (118 elements) ──
          const ELEMENTS = [
            {n:1,s:'H',name:'Hydrogen',cat:'nonmetal',c:'#60a5fa'},{n:2,s:'He',name:'Helium',cat:'noble',c:'#c084fc'},
            {n:3,s:'Li',name:'Lithium',cat:'alkali',c:'#f87171'},{n:4,s:'Be',name:'Beryllium',cat:'alkaline',c:'#fbbf24'},
            {n:5,s:'B',name:'Boron',cat:'metalloid',c:'#34d399'},{n:6,s:'C',name:'Carbon',cat:'nonmetal',c:'#60a5fa'},
            {n:7,s:'N',name:'Nitrogen',cat:'nonmetal',c:'#60a5fa'},{n:8,s:'O',name:'Oxygen',cat:'nonmetal',c:'#60a5fa'},
            {n:9,s:'F',name:'Fluorine',cat:'halogen',c:'#2dd4bf'},{n:10,s:'Ne',name:'Neon',cat:'noble',c:'#c084fc'},
            {n:11,s:'Na',name:'Sodium',cat:'alkali',c:'#f87171'},{n:12,s:'Mg',name:'Magnesium',cat:'alkaline',c:'#fbbf24'},
            {n:13,s:'Al',name:'Aluminum',cat:'metal',c:'#94a3b8'},{n:14,s:'Si',name:'Silicon',cat:'metalloid',c:'#34d399'},
            {n:15,s:'P',name:'Phosphorus',cat:'nonmetal',c:'#60a5fa'},{n:16,s:'S',name:'Sulfur',cat:'nonmetal',c:'#60a5fa'},
            {n:17,s:'Cl',name:'Chlorine',cat:'halogen',c:'#2dd4bf'},{n:18,s:'Ar',name:'Argon',cat:'noble',c:'#c084fc'},
            {n:19,s:'K',name:'Potassium',cat:'alkali',c:'#f87171'},{n:20,s:'Ca',name:'Calcium',cat:'alkaline',c:'#fbbf24'},
            {n:21,s:'Sc',name:'Scandium',cat:'transition',c:'#fb923c'},{n:22,s:'Ti',name:'Titanium',cat:'transition',c:'#fb923c'},
            {n:23,s:'V',name:'Vanadium',cat:'transition',c:'#fb923c'},{n:24,s:'Cr',name:'Chromium',cat:'transition',c:'#fb923c'},
            {n:25,s:'Mn',name:'Manganese',cat:'transition',c:'#fb923c'},{n:26,s:'Fe',name:'Iron',cat:'transition',c:'#fb923c'},
            {n:27,s:'Co',name:'Cobalt',cat:'transition',c:'#fb923c'},{n:28,s:'Ni',name:'Nickel',cat:'transition',c:'#fb923c'},
            {n:29,s:'Cu',name:'Copper',cat:'transition',c:'#fb923c'},{n:30,s:'Zn',name:'Zinc',cat:'transition',c:'#fb923c'},
            {n:31,s:'Ga',name:'Gallium',cat:'metal',c:'#94a3b8'},{n:32,s:'Ge',name:'Germanium',cat:'metalloid',c:'#34d399'},
            {n:33,s:'As',name:'Arsenic',cat:'metalloid',c:'#34d399'},{n:34,s:'Se',name:'Selenium',cat:'nonmetal',c:'#60a5fa'},
            {n:35,s:'Br',name:'Bromine',cat:'halogen',c:'#2dd4bf'},{n:36,s:'Kr',name:'Krypton',cat:'noble',c:'#c084fc'},
            {n:37,s:'Rb',name:'Rubidium',cat:'alkali',c:'#f87171'},{n:38,s:'Sr',name:'Strontium',cat:'alkaline',c:'#fbbf24'},
            {n:39,s:'Y',name:'Yttrium',cat:'transition',c:'#fb923c'},{n:40,s:'Zr',name:'Zirconium',cat:'transition',c:'#fb923c'},
            {n:41,s:'Nb',name:'Niobium',cat:'transition',c:'#fb923c'},{n:42,s:'Mo',name:'Molybdenum',cat:'transition',c:'#fb923c'},
            {n:43,s:'Tc',name:'Technetium',cat:'transition',c:'#fb923c'},{n:44,s:'Ru',name:'Ruthenium',cat:'transition',c:'#fb923c'},
            {n:45,s:'Rh',name:'Rhodium',cat:'transition',c:'#fb923c'},{n:46,s:'Pd',name:'Palladium',cat:'transition',c:'#fb923c'},
            {n:47,s:'Ag',name:'Silver',cat:'transition',c:'#fb923c'},{n:48,s:'Cd',name:'Cadmium',cat:'transition',c:'#fb923c'},
            {n:49,s:'In',name:'Indium',cat:'metal',c:'#94a3b8'},{n:50,s:'Sn',name:'Tin',cat:'metal',c:'#94a3b8'},
            {n:51,s:'Sb',name:'Antimony',cat:'metalloid',c:'#34d399'},{n:52,s:'Te',name:'Tellurium',cat:'metalloid',c:'#34d399'},
            {n:53,s:'I',name:'Iodine',cat:'halogen',c:'#2dd4bf'},{n:54,s:'Xe',name:'Xenon',cat:'noble',c:'#c084fc'},
            {n:55,s:'Cs',name:'Cesium',cat:'alkali',c:'#f87171'},{n:56,s:'Ba',name:'Barium',cat:'alkaline',c:'#fbbf24'},
            {n:57,s:'La',name:'Lanthanide',cat:'lanthanide',c:'#a78bfa'},{n:58,s:'Ce',name:'Cerium',cat:'lanthanide',c:'#a78bfa'},
            {n:59,s:'Pr',name:'Praseodymium',cat:'lanthanide',c:'#a78bfa'},{n:60,s:'Nd',name:'Neodymium',cat:'lanthanide',c:'#a78bfa'},
            {n:61,s:'Pm',name:'Promethium',cat:'lanthanide',c:'#a78bfa'},{n:62,s:'Sm',name:'Samarium',cat:'lanthanide',c:'#a78bfa'},
            {n:63,s:'Eu',name:'Europium',cat:'lanthanide',c:'#a78bfa'},{n:64,s:'Gd',name:'Gadolinium',cat:'lanthanide',c:'#a78bfa'},
            {n:65,s:'Tb',name:'Terbium',cat:'lanthanide',c:'#a78bfa'},{n:66,s:'Dy',name:'Dysprosium',cat:'lanthanide',c:'#a78bfa'},
            {n:67,s:'Ho',name:'Holmium',cat:'lanthanide',c:'#a78bfa'},{n:68,s:'Er',name:'Erbium',cat:'lanthanide',c:'#a78bfa'},
            {n:69,s:'Tm',name:'Thulium',cat:'lanthanide',c:'#a78bfa'},{n:70,s:'Yb',name:'Ytterbium',cat:'lanthanide',c:'#a78bfa'},
            {n:71,s:'Lu',name:'Lutetium',cat:'lanthanide',c:'#a78bfa'},
            {n:72,s:'Hf',name:'Hafnium',cat:'transition',c:'#fb923c'},{n:73,s:'Ta',name:'Tantalum',cat:'transition',c:'#fb923c'},
            {n:74,s:'W',name:'Tungsten',cat:'transition',c:'#fb923c'},{n:75,s:'Re',name:'Rhenium',cat:'transition',c:'#fb923c'},
            {n:76,s:'Os',name:'Osmium',cat:'transition',c:'#fb923c'},{n:77,s:'Ir',name:'Iridium',cat:'transition',c:'#fb923c'},
            {n:78,s:'Pt',name:'Platinum',cat:'transition',c:'#fb923c'},{n:79,s:'Au',name:'Gold',cat:'transition',c:'#fb923c'},
            {n:80,s:'Hg',name:'Mercury',cat:'transition',c:'#fb923c'},{n:81,s:'Tl',name:'Thallium',cat:'metal',c:'#94a3b8'},
            {n:82,s:'Pb',name:'Lead',cat:'metal',c:'#94a3b8'},{n:83,s:'Bi',name:'Bismuth',cat:'metal',c:'#94a3b8'},
            {n:84,s:'Po',name:'Polonium',cat:'metalloid',c:'#34d399'},{n:85,s:'At',name:'Astatine',cat:'halogen',c:'#2dd4bf'},
            {n:86,s:'Rn',name:'Radon',cat:'noble',c:'#c084fc'},
            {n:87,s:'Fr',name:'Francium',cat:'alkali',c:'#f87171'},{n:88,s:'Ra',name:'Radium',cat:'alkaline',c:'#fbbf24'},
            {n:89,s:'Ac',name:'Actinide',cat:'actinide',c:'#f472b6'},{n:90,s:'Th',name:'Thorium',cat:'actinide',c:'#f472b6'},
            {n:91,s:'Pa',name:'Protactinium',cat:'actinide',c:'#f472b6'},{n:92,s:'U',name:'Uranium',cat:'actinide',c:'#f472b6'},
            {n:93,s:'Np',name:'Neptunium',cat:'actinide',c:'#f472b6'},{n:94,s:'Pu',name:'Plutonium',cat:'actinide',c:'#f472b6'},
            {n:95,s:'Am',name:'Americium',cat:'actinide',c:'#f472b6'},{n:96,s:'Cm',name:'Curium',cat:'actinide',c:'#f472b6'},
            {n:97,s:'Bk',name:'Berkelium',cat:'actinide',c:'#f472b6'},{n:98,s:'Cf',name:'Californium',cat:'actinide',c:'#f472b6'},
            {n:99,s:'Es',name:'Einsteinium',cat:'actinide',c:'#f472b6'},{n:100,s:'Fm',name:'Fermium',cat:'actinide',c:'#f472b6'},
            {n:101,s:'Md',name:'Mendelevium',cat:'actinide',c:'#f472b6'},{n:102,s:'No',name:'Nobelium',cat:'actinide',c:'#f472b6'},
            {n:103,s:'Lr',name:'Lawrencium',cat:'actinide',c:'#f472b6'},
            {n:104,s:'Rf',name:'Rutherfordium',cat:'transition',c:'#fb923c'},{n:105,s:'Db',name:'Dubnium',cat:'transition',c:'#fb923c'},
            {n:106,s:'Sg',name:'Seaborgium',cat:'transition',c:'#fb923c'},{n:107,s:'Bh',name:'Bohrium',cat:'transition',c:'#fb923c'},
            {n:108,s:'Hs',name:'Hassium',cat:'transition',c:'#fb923c'},{n:109,s:'Mt',name:'Meitnerium',cat:'transition',c:'#fb923c'},
            {n:110,s:'Ds',name:'Darmstadtium',cat:'transition',c:'#fb923c'},{n:111,s:'Rg',name:'Roentgenium',cat:'transition',c:'#fb923c'},
            {n:112,s:'Cn',name:'Copernicium',cat:'transition',c:'#fb923c'},{n:113,s:'Nh',name:'Nihonium',cat:'metal',c:'#94a3b8'},
            {n:114,s:'Fl',name:'Flerovium',cat:'metal',c:'#94a3b8'},{n:115,s:'Mc',name:'Moscovium',cat:'metal',c:'#94a3b8'},
            {n:116,s:'Lv',name:'Livermorium',cat:'metal',c:'#94a3b8'},{n:117,s:'Ts',name:'Tennessine',cat:'halogen',c:'#2dd4bf'},
            {n:118,s:'Og',name:'Oganesson',cat:'noble',c:'#c084fc'}
          ];
          const getEl = (sym) => ELEMENTS.find(e => e.s === sym);
          // ── Periodic Table layout (row, col) ──
          const PT_LAYOUT = [
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
            [3,4,0,0,0,0,0,0,0,0,0,0,5,6,7,8,9,10],
            [11,12,0,0,0,0,0,0,0,0,0,0,13,14,15,16,17,18],
            [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36],
            [37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54],
            [55,56,0,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86],
            [87,88,0,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118],
            [],
            [0,0,0,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71],
            [0,0,0,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103]
          ];
          // ── Compound Recipes ──
          const COMPOUNDS = [
            { name: 'Water', formula: 'H\u2082O', recipe: { H: 2, O: 1 }, desc: 'Essential for life', emoji: '\uD83D\uDCA7' },
            { name: 'Carbon Dioxide', formula: 'CO\u2082', recipe: { C: 1, O: 2 }, desc: 'Greenhouse gas', emoji: '\uD83C\uDF2B\uFE0F' },
            { name: 'Table Salt', formula: 'NaCl', recipe: { Na: 1, Cl: 1 }, desc: 'Sodium chloride', emoji: '\uD83E\uDDC2' },
            { name: 'Ammonia', formula: 'NH\u2083', recipe: { N: 1, H: 3 }, desc: 'Cleaning agent', emoji: '\uD83E\uDDEA' },
            { name: 'Methane', formula: 'CH\u2084', recipe: { C: 1, H: 4 }, desc: 'Natural gas', emoji: '\uD83D\uDD25' },
            { name: 'Hydrogen Peroxide', formula: 'H\u2082O\u2082', recipe: { H: 2, O: 2 }, desc: 'Disinfectant', emoji: '\uD83E\uDE79' },
            { name: 'Ethanol', formula: 'C\u2082H\u2085OH', recipe: { C: 2, H: 6, O: 1 }, desc: 'Alcohol', emoji: '\uD83C\uDF7A' },
            { name: 'Sulfuric Acid', formula: 'H\u2082SO\u2084', recipe: { H: 2, S: 1, O: 4 }, desc: 'Battery acid', emoji: '\u26A0\uFE0F' },
            { name: 'Glucose', formula: 'C\u2086H\u2081\u2082O\u2086', recipe: { C: 6, H: 12, O: 6 }, desc: 'Blood sugar', emoji: '\uD83C\uDF6C' },
            { name: 'Baking Soda', formula: 'NaHCO\u2083', recipe: { Na: 1, H: 1, C: 1, O: 3 }, desc: 'Sodium bicarbonate', emoji: '\uD83E\uDDC1' },
            { name: 'Calcium Carbonate', formula: 'CaCO\u2083', recipe: { Ca: 1, C: 1, O: 3 }, desc: 'Chalk & marble', emoji: '\uD83E\uDEA8' },
            { name: 'Iron Oxide', formula: 'Fe\u2082O\u2083', recipe: { Fe: 2, O: 3 }, desc: 'Rust', emoji: '\uD83D\uDFE5' },
            { name: 'Sodium Hydroxide', formula: 'NaOH', recipe: { Na: 1, O: 1, H: 1 }, desc: 'Lye / caustic soda', emoji: '\uD83E\uDDEA' },
            { name: 'Hydrochloric Acid', formula: 'HCl', recipe: { H: 1, Cl: 1 }, desc: 'Stomach acid', emoji: '\uD83E\uDE79' },
            { name: 'Acetic Acid', formula: 'CH\u2083COOH', recipe: { C: 2, H: 4, O: 2 }, desc: 'Vinegar', emoji: '\uD83E\uDD4B' },
            { name: 'Nitrogen Dioxide', formula: 'NO\u2082', recipe: { N: 1, O: 2 }, desc: 'Brown smog gas', emoji: '\uD83C\uDF2B\uFE0F' },
            { name: 'Sulfur Dioxide', formula: 'SO\u2082', recipe: { S: 1, O: 2 }, desc: 'Acid rain precursor', emoji: '\uD83C\uDF27\uFE0F' },
            { name: 'Ozone', formula: 'O\u2083', recipe: { O: 3 }, desc: 'UV shield', emoji: '\uD83D\uDEE1\uFE0F' },
            { name: 'Laughing Gas', formula: 'N\u2082O', recipe: { N: 2, O: 1 }, desc: 'Nitrous oxide', emoji: '\uD83D\uDE02' },
            { name: 'Silicon Dioxide', formula: 'SiO\u2082', recipe: { Si: 1, O: 2 }, desc: 'Sand & glass', emoji: '\uD83C\uDFD6\uFE0F' },
          ];
          const selectedEls = d.selectedElements || {};
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
            } else {
              upd('craftResult', { success: false });
            }
          };
          const catColors = { nonmetal: 'bg-blue-100 text-blue-700 border-blue-200', noble: 'bg-purple-100 text-purple-700 border-purple-200', alkali: 'bg-red-100 text-red-700 border-red-200', alkaline: 'bg-yellow-100 text-yellow-700 border-yellow-200', transition: 'bg-orange-100 text-orange-700 border-orange-200', metal: 'bg-slate-200 text-slate-700 border-slate-300', metalloid: 'bg-emerald-100 text-emerald-700 border-emerald-200', halogen: 'bg-teal-100 text-teal-700 border-teal-200', lanthanide: 'bg-violet-100 text-violet-700 border-violet-200', actinide: 'bg-pink-100 text-pink-700 border-pink-200' };
          // ── Molecule Viewer presets ──
          const viewerPresets = [
            { name: 'H\u2082O', atoms: [{ el: 'O', x: 200, y: 120, color: '#ef4444' }, { el: 'H', x: 140, y: 190, color: '#60a5fa' }, { el: 'H', x: 260, y: 190, color: '#60a5fa' }], bonds: [[0, 1], [0, 2]], formula: 'H2O' },
            { name: 'CO\u2082', atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'O', x: 120, y: 150, color: '#ef4444' }, { el: 'O', x: 280, y: 150, color: '#ef4444' }], bonds: [[0, 1], [0, 2]], formula: 'CO2' },
            { name: 'CH\u2084', atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'H', x: 200, y: 80, color: '#60a5fa' }, { el: 'H', x: 270, y: 180, color: '#60a5fa' }, { el: 'H', x: 130, y: 180, color: '#60a5fa' }, { el: 'H', x: 200, y: 220, color: '#60a5fa' }], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]], formula: 'CH4' },
            { name: 'NaCl', atoms: [{ el: 'Na', x: 160, y: 150, color: '#a855f7' }, { el: 'Cl', x: 240, y: 150, color: '#22c55e' }], bonds: [[0, 1]], formula: 'NaCl' },
            { name: 'NH\u2083', atoms: [{ el: 'N', x: 200, y: 110, color: '#3b82f6' }, { el: 'H', x: 140, y: 185, color: '#94a3b8' }, { el: 'H', x: 200, y: 210, color: '#94a3b8' }, { el: 'H', x: 260, y: 185, color: '#94a3b8' }], bonds: [[0, 1], [0, 2], [0, 3]], formula: 'NH3' },
          ];
          return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },
            // Header
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDD2C Molecule Lab"),
              discovered.length > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full" }, "\uD83E\uDDEA " + discovered.length + "/" + COMPOUNDS.length + " discovered")
            ),
            // Mode tabs
            React.createElement("div", { className: "flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl" },
              [['viewer', '\uD83D\uDD2C Viewer'], ['creator', '\u2697\uFE0F Compound Creator'], ['table', '\uD83D\uDDC2\uFE0F Periodic Table']].map(([m, label]) =>
                React.createElement("button", { key: m, onClick: () => upd('moleculeMode', m), className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700') }, label)
              )
            ),
            // ── Viewer Mode ──
            mode === 'viewer' && React.createElement("div", null,
              React.createElement("div", { className: "flex gap-1 mb-3 flex-wrap" }, viewerPresets.map(p => React.createElement("button", { key: p.name, onClick: () => { upd('atoms', p.atoms.map(a => ({ ...a }))); upd('bonds', [...p.bonds]); upd('formula', p.formula); }, className: "px-2 py-1 rounded-lg text-xs font-bold " + (d.formula === p.formula ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200') }, p.name))),
              React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full bg-gradient-to-b from-slate-50 to-white rounded-xl border border-stone-200", style: { maxHeight: "300px" }, onMouseMove: e => { if (d.dragging !== null && d.dragging !== undefined) { const svg = e.currentTarget; const rect = svg.getBoundingClientRect(); const nx = (e.clientX - rect.left) / rect.width * W; const ny = (e.clientY - rect.top) / rect.height * H; const na = d.atoms.map((a, i) => i === d.dragging ? { ...a, x: Math.round(nx), y: Math.round(ny) } : a); upd("atoms", na); } }, onMouseUp: () => upd("dragging", null), onMouseLeave: () => upd("dragging", null) },
                (d.bonds || []).map((b, i) => d.atoms[b[0]] && d.atoms[b[1]] ? React.createElement("line", { key: 'b' + i, x1: d.atoms[b[0]].x, y1: d.atoms[b[0]].y, x2: d.atoms[b[1]].x, y2: d.atoms[b[1]].y, stroke: "#94a3b8", strokeWidth: 4, strokeLinecap: "round" }) : null),
                (d.atoms || []).map((a, i) => React.createElement("g", { key: i },
                  React.createElement("circle", { cx: a.x, cy: a.y, r: 24, fill: a.color || '#64748b', stroke: '#fff', strokeWidth: 3, style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', cursor: 'grab' }, onMouseDown: e => { e.preventDefault(); upd('dragging', i); } }),
                  React.createElement("text", { x: a.x, y: a.y + 5, textAnchor: "middle", fill: "white", style: { fontSize: '14px', fontWeight: 'bold' } }, a.el)
                ))
              ),
              React.createElement("div", { className: "mt-2 text-center" },
                React.createElement("span", { className: "text-sm font-bold text-slate-500" }, "Formula: "),
                React.createElement("span", { className: "text-lg font-bold text-slate-800" }, d.formula || '\u2014')
              )
            ),
            // ── Compound Creator Mode ──
            mode === 'creator' && React.createElement("div", null,
              React.createElement("p", { className: "text-xs text-slate-500 mb-3" }, "Select elements to craft compounds. Like Minecraft\u2019s Compound Creator!"),
              // Element selector grid (common elements)
              React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-4" },
                ['H','C','N','O','Na','Mg','Al','Si','P','S','Cl','K','Ca','Fe','Cu','Zn','Br','Ag','I','Au'].map(sym => {
                  const el = getEl(sym);
                  return React.createElement("button", { key: sym, onClick: () => addElement(sym), className: "w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold text-xs border-2 transition-all hover:scale-110 hover:shadow-md active:scale-95 " + (catColors[el?.cat] || 'bg-slate-100 text-slate-600 border-slate-200'), title: el?.name || sym },
                    React.createElement("span", { className: "text-sm font-black" }, sym),
                    React.createElement("span", { className: "text-[8px] opacity-70" }, el?.n || '')
                  );
                })
              ),
              // Selected elements display
              React.createElement("div", { className: "bg-white rounded-xl border-2 border-dashed border-slate-300 p-4 mb-4 min-h-[80px] flex items-center justify-center gap-2 flex-wrap" },
                Object.keys(selectedEls).length === 0
                  ? React.createElement("p", { className: "text-slate-400 text-sm italic" }, "Tap elements above to add them...")
                  : Object.entries(selectedEls).map(([sym, count]) => {
                      const el = getEl(sym);
                      return React.createElement("div", { key: sym, className: "flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1 border" },
                        React.createElement("span", { className: "w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm", style: { backgroundColor: el?.c || '#64748b' } }, sym),
                        React.createElement("span", { className: "text-lg font-black text-slate-700" }, "\u00D7" + count),
                        React.createElement("button", { onClick: () => removeElement(sym), className: "ml-1 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs font-bold hover:bg-red-200 flex items-center justify-center" }, "\u2212")
                      );
                    })
              ),
              // Action buttons
              React.createElement("div", { className: "flex gap-2 mb-4" },
                React.createElement("button", { onClick: tryCraft, disabled: Object.keys(selectedEls).length === 0, className: "flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed" }, "\u2697\uFE0F Combine!"),
                React.createElement("button", { onClick: clearElements, className: "px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors" }, "\uD83D\uDD04 Clear")
              ),
              // Craft result
              d.craftResult && (d.craftResult.success
                ? React.createElement("div", { className: "bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center animate-in zoom-in" },
                    React.createElement("p", { className: "text-3xl mb-1" }, d.craftResult.compound.emoji),
                    React.createElement("p", { className: "text-lg font-black text-emerald-700" }, (d.craftResult.isNew ? '\uD83C\uDF89 NEW! ' : '\u2705 ') + d.craftResult.compound.name),
                    React.createElement("p", { className: "text-sm font-bold text-emerald-600" }, d.craftResult.compound.formula),
                    React.createElement("p", { className: "text-xs text-emerald-500 mt-1" }, d.craftResult.compound.desc)
                  )
                : React.createElement("div", { className: "bg-amber-50 border-2 border-amber-200 rounded-xl p-3 text-center" },
                    React.createElement("p", { className: "text-sm font-bold text-amber-700" }, "\uD83E\uDD14 No known compound matches this combination. Try different elements!"))
              ),
              // Discovery log
              discovered.length > 0 && React.createElement("div", { className: "mt-4 bg-slate-50 rounded-xl p-3 border" },
                React.createElement("p", { className: "text-xs font-bold text-slate-600 mb-2" }, "\uD83D\uDCDA Discovery Log (" + discovered.length + "/" + COMPOUNDS.length + ")"),
                React.createElement("div", { className: "flex flex-wrap gap-1" },
                  COMPOUNDS.map(c => React.createElement("span", { key: c.formula, className: "px-2 py-0.5 rounded text-xs font-bold " + (discovered.includes(c.formula) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400') }, discovered.includes(c.formula) ? c.emoji + ' ' + c.name : '\uD83D\uDD12 ???'))
                )
              )
            ),
            // ── Periodic Table Mode ──
            mode === 'table' && React.createElement("div", null,
              React.createElement("p", { className: "text-xs text-slate-500 mb-2" }, "Tap any element to learn about it. The full 118-element periodic table."),
              d.selectedElement && React.createElement("div", { className: "mb-3 p-3 rounded-xl border-2 flex items-center gap-3 " + (catColors[d.selectedElement.cat] || 'bg-slate-50 border-slate-200') },
                React.createElement("div", { className: "w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-md", style: { backgroundColor: d.selectedElement.c } },
                  React.createElement("span", { className: "text-[10px] opacity-80" }, d.selectedElement.n),
                  React.createElement("span", { className: "text-xl font-black" }, d.selectedElement.s)
                ),
                React.createElement("div", null,
                  React.createElement("p", { className: "text-lg font-bold text-slate-800" }, d.selectedElement.name),
                  React.createElement("p", { className: "text-xs text-slate-500" }, "Atomic #" + d.selectedElement.n + " \u2022 " + (d.selectedElement.cat || 'element').replace(/^\w/, c => c.toUpperCase()))
                )
              ),
              // Table grid
              React.createElement("div", { className: "overflow-x-auto" },
                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(18, minmax(0, 1fr))', gap: '1px', minWidth: '600px' } },
                  PT_LAYOUT.flatMap((row, ri) => {
                    if (row.length === 0) return [React.createElement("div", { key: 'gap-' + ri, style: { gridColumn: 'span 18', height: '4px' } })];
                    return row.map((num, ci) => {
                      if (num === 0) return React.createElement("div", { key: ri + '-' + ci });
                      const el = ELEMENTS[num - 1];
                      if (!el) return React.createElement("div", { key: ri + '-' + ci });
                      return React.createElement("button", { key: el.s, onClick: () => upd('selectedElement', el), className: "w-full aspect-square rounded flex flex-col items-center justify-center text-[8px] font-bold border transition-all hover:scale-125 hover:z-10 hover:shadow-lg " + (catColors[el.cat] || 'bg-slate-50 border-slate-200'), title: el.name, style: { minWidth: '28px' } },
                        React.createElement("span", { className: "font-black text-[10px] leading-none" }, el.s),
                        React.createElement("span", { className: "opacity-60 leading-none" }, el.n)
                      );
                    });
                  })
                )
              ),
              // Legend
              React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3 justify-center" },
                [['alkali','Alkali'],['alkaline','Alkaline'],['transition','Transition'],['metal','Post-trans.'],['metalloid','Metalloid'],['nonmetal','Nonmetal'],['halogen','Halogen'],['noble','Noble Gas'],['lanthanide','Lanthanide'],['actinide','Actinide']].map(([cat, label]) =>
                  React.createElement("span", { key: cat, className: "px-1.5 py-0.5 rounded text-[9px] font-bold border " + (catColors[cat] || '') }, label)
                )
              )
            )
          )
        })()"""

content = content[:start_idx] + NEW_MOLECULE + content[end_idx:]

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Molecule Lab upgraded! New section: {len(NEW_MOLECULE)} chars")
print("Features: Viewer, Compound Creator (20 recipes), Periodic Table (118 elements)")
