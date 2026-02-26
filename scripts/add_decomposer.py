"""
Add Material Decomposer tool:
1. Add it to the tool grid
2. Add its rendering section
3. Add its initial state to labToolData
"""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Find the tool grid to add decomposer entry ──
# Look for the last tool in the grid (molecule or cellDiagram)
cell_diagram_entry = "id: 'cellDiagram'"
idx = content.find(cell_diagram_entry)
if idx == -1:
    print("Looking for alternative grid entry...")
    # Try finding by pattern
    idx = content.find("id: 'molecule'")
    if idx == -1:
        print("ERROR: Cannot find tool grid entries")
        exit(1)

# Find the end of the molecule tool grid entry (the closing } of the object)
# We need to add after the last tool entry
# Find pattern like: { id: 'molecule', ... },
# Let's find by label instead
molecule_grid = content.find("label: 'Molecule'")
if molecule_grid == -1:
    molecule_grid = content.find("label: 'Molecule Builder'")
    
print(f"Found molecule grid entry near char {molecule_grid}")

# Find the closing of that grid entry object
brace_count = 0
j = molecule_grid
# Go back to find the opening {
while j > 0 and content[j] != '{':
    j -= 1
# Now go forward to find matching }
i = j
while i < len(content):
    if content[i] == '{': brace_count += 1
    elif content[i] == '}':
        brace_count -= 1
        if brace_count == 0:
            # Found the end - check for comma
            end_of_entry = i + 1
            if end_of_entry < len(content) and content[end_of_entry] == ',':
                end_of_entry += 1
            break
    i += 1

NEW_TOOL_ENTRY = """
            { id: 'decomposer', icon: '\u2697\uFE0F', label: 'Decomposer', desc: 'Break materials into elements', ready: true },"""

content = content[:end_of_entry] + NEW_TOOL_ENTRY + content[end_of_entry:]
print("Added decomposer to tool grid")

# ── 2. Add decomposer initial state to labToolData defaults ──
# Find molecule initial state
molecule_init = content.find("molecule: {")
if molecule_init == -1:
    print("WARNING: Could not find molecule init state, skipping")
else:
    # Find the end of molecule init
    bc = 0
    k = molecule_init
    while k < len(content):
        if content[k] == '{': bc += 1
        elif content[k] == '}':
            bc -= 1
            if bc == 0:
                end_mol_init = k + 1
                if end_mol_init < len(content) and content[end_mol_init] == ',':
                    end_mol_init += 1
                break
        k += 1
    
    DECOMPOSER_INIT = """
            decomposer: { material: 'Water', decomposed: false },"""
    content = content[:end_mol_init] + DECOMPOSER_INIT + content[end_mol_init:]
    print("Added decomposer init state")

# ── 3. Add decomposer rendering section before the final close ──
# Find the molecule tool rendering end and add decomposer after it
# Look for the end of the molecule IIFE
mol_render_end = content.find("stemLabTab === 'explore' && stemLabTool === 'molecule'")
if mol_render_end == -1:
    print("ERROR: Cannot find molecule rendering section")
    exit(1)

# Find the })() that closes the molecule section
brace_count = 0
in_section = False
i = mol_render_end
end_mol_render = i
while i < len(content):
    if content[i] == '{': brace_count += 1; in_section = True
    elif content[i] == '}':
        brace_count -= 1
        if in_section and brace_count == 0:
            rest = content[i:i+5]
            if rest.startswith('})()'):
                end_mol_render = i + 4  # })()
                break
    i += 1

print(f"Found molecule render end at char {end_mol_render}")

DECOMPOSER_SECTION = r""",

        stemLabTab === 'explore' && stemLabTool === 'decomposer' && (() => {
          const d = labToolData.decomposer || {};
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, decomposer: { ...prev.decomposer, [key]: val } }));
          const MATERIALS = [
            { name: 'Water', emoji: '\uD83D\uDCA7', elements: { H: 66.7, O: 33.3 }, formula: 'H\u2082O', fact: 'Water covers 71% of Earth\u2019s surface' },
            { name: 'Table Salt', emoji: '\uD83E\uDDC2', elements: { Na: 39.3, Cl: 60.7 }, formula: 'NaCl', fact: 'Salt preserves food by dehydrating bacteria' },
            { name: 'Glass', emoji: '\uD83E\uDE9F', elements: { Si: 46.7, O: 53.3 }, formula: 'SiO\u2082', fact: 'Glass is made by heating sand to 1700\u00B0C' },
            { name: 'Steel', emoji: '\u2699\uFE0F', elements: { Fe: 98.0, C: 2.0 }, formula: 'Fe + C', fact: 'Steel is iron with a small amount of carbon' },
            { name: 'Baking Soda', emoji: '\uD83E\uDDC1', elements: { Na: 27.4, H: 1.2, C: 14.3, O: 57.1 }, formula: 'NaHCO\u2083', fact: 'Reacts with vinegar to produce CO\u2082 bubbles' },
            { name: 'Chalk', emoji: '\uD83E\uDEA8', elements: { Ca: 40.0, C: 12.0, O: 48.0 }, formula: 'CaCO\u2083', fact: 'Made from ancient marine organisms\u2019 shells' },
            { name: 'Rust', emoji: '\uD83D\uDFE5', elements: { Fe: 69.9, O: 30.1 }, formula: 'Fe\u2082O\u2083', fact: 'Iron oxidizes when exposed to moisture and air' },
            { name: 'Sugar', emoji: '\uD83C\uDF6C', elements: { C: 42.1, H: 6.5, O: 51.4 }, formula: 'C\u2082H\u2082\u2082O\u2081\u2081', fact: 'Sucrose is extracted from sugarcane or sugar beets' },
            { name: 'Diamond', emoji: '\uD83D\uDC8E', elements: { C: 100 }, formula: 'C', fact: 'The hardest natural material \u2014 pure carbon' },
            { name: 'Marble', emoji: '\uD83C\uDFDB\uFE0F', elements: { Ca: 40.0, C: 12.0, O: 48.0 }, formula: 'CaCO\u2083', fact: 'Metamorphic rock used in sculpture since antiquity' },
            { name: 'Dry Ice', emoji: '\u2744\uFE0F', elements: { C: 27.3, O: 72.7 }, formula: 'CO\u2082', fact: 'Solid carbon dioxide at -78.5\u00B0C' },
            { name: 'Bleach', emoji: '\uD83E\uDDEA', elements: { Na: 30.9, O: 21.5, Cl: 47.6 }, formula: 'NaOCl', fact: 'Sodium hypochlorite kills germs by oxidation' },
            { name: 'Limestone', emoji: '\uD83E\uDEA8', elements: { Ca: 40.0, C: 12.0, O: 48.0 }, formula: 'CaCO\u2083', fact: 'Used to make cement and concrete' },
            { name: 'Ammonia', emoji: '\uD83E\uDDEA', elements: { N: 82.4, H: 17.6 }, formula: 'NH\u2083', fact: 'Key ingredient in fertilizers worldwide' },
            { name: 'Quartz', emoji: '\uD83D\uDD2E', elements: { Si: 46.7, O: 53.3 }, formula: 'SiO\u2082', fact: 'The most abundant mineral in Earth\u2019s crust' },
          ];
          const mat = MATERIALS.find(m => m.name === (d.material || 'Water')) || MATERIALS[0];
          const maxPct = Math.max(...Object.values(mat.elements));
          const elColors = { H: '#60a5fa', C: '#1e293b', N: '#3b82f6', O: '#ef4444', Na: '#a855f7', Cl: '#22c55e', Ca: '#fbbf24', Fe: '#fb923c', Si: '#34d399', S: '#eab308', K: '#f87171', Mg: '#fbbf24', Al: '#94a3b8', Cu: '#fb923c', Zn: '#94a3b8' };
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\u2697\uFE0F Material Decomposer")
            ),
            React.createElement("p", { className: "text-xs text-slate-500 mb-3 -mt-1" }, "Break everyday materials into their constituent elements. Inspired by Minecraft\u2019s Material Reducer!"),
            // Material selector
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-4" },
              MATERIALS.map(m => React.createElement("button", { key: m.name, onClick: () => { upd('material', m.name); upd('decomposed', false); }, className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.material === m.name ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-violet-50 border border-slate-200') }, m.emoji + " " + m.name))
            ),
            // Material display
            React.createElement("div", { className: "bg-white rounded-xl border-2 border-violet-200 p-6 text-center" },
              React.createElement("p", { className: "text-4xl mb-2" }, mat.emoji),
              React.createElement("h4", { className: "text-xl font-black text-slate-800" }, mat.name),
              React.createElement("p", { className: "text-sm font-bold text-violet-600 mb-1" }, mat.formula),
              React.createElement("p", { className: "text-xs text-slate-500 mb-4 italic" }, mat.fact),
              // Decompose button
              !d.decomposed
                ? React.createElement("button", { onClick: () => upd('decomposed', true), className: "px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold rounded-xl hover:from-violet-600 hover:to-purple-700 shadow-lg transition-all hover:scale-105 active:scale-95" }, "\uD83D\uDD2C Decompose!")
                : React.createElement("div", { className: "animate-in slide-in-from-bottom duration-500" },
                    React.createElement("p", { className: "text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider" }, "Element Composition (by atom %)"),
                    React.createElement("div", { className: "space-y-2" },
                      Object.entries(mat.elements).sort((a, b) => b[1] - a[1]).map(([el, pct]) =>
                        React.createElement("div", { key: el, className: "flex items-center gap-2" },
                          React.createElement("span", { className: "w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm", style: { backgroundColor: elColors[el] || '#64748b' } }, el),
                          React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-6 overflow-hidden" },
                            React.createElement("div", { className: "h-full rounded-full flex items-center px-2 transition-all duration-1000 ease-out", style: { width: (pct / maxPct * 100) + '%', backgroundColor: (elColors[el] || '#64748b') + '20', borderLeft: '3px solid ' + (elColors[el] || '#64748b') } },
                              React.createElement("span", { className: "text-xs font-bold", style: { color: elColors[el] || '#64748b' } }, pct.toFixed(1) + "%")
                            )
                          )
                        )
                      )
                    ),
                    React.createElement("button", { onClick: () => upd('decomposed', false), className: "mt-4 px-4 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-200" }, "\uD83D\uDD04 Reassemble")
                  )
            )
          )
        })()"""

content = content[:end_mol_render] + DECOMPOSER_SECTION + content[end_mol_render:]
print("Added decomposer rendering section")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("Material Decomposer added successfully!")
print("Features: 15 materials, element bar chart, fun facts, animated decomposition")
