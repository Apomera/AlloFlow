"""
Upgrade the Equation Balancer with:
- 12+ equations across 3 difficulty tiers (Beginner, Intermediate, Advanced)
- Difficulty filter chips
- Atom count hint system
- Streak counter
- Fixed equation display
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the chemBalance tool section
OLD_START = "stemLabTab === 'explore' && stemLabTool === 'chemBalance' && (() => {"
OLD_END_MARKER = "})(),"  # The closing of the chemBalance IIFE

# Find the start
start_idx = content.find(OLD_START)
if start_idx == -1:
    print("ERROR: Could not find chemBalance section start")
    exit(1)

# Find the end - need to find the correct })(), after the chemBalance section
# Count braces to find the matching end
brace_count = 0
in_section = False
end_idx = start_idx
i = start_idx
while i < len(content):
    ch = content[i]
    if ch == '{':
        brace_count += 1
        in_section = True
    elif ch == '}':
        brace_count -= 1
        if in_section and brace_count == 0:
            # Found the closing brace, look for })(),
            rest = content[i:i+5]
            if rest.startswith('})()'):
                end_idx = i + 4  # Include })()
                # Check for trailing comma
                if end_idx < len(content) and content[end_idx] == ',':
                    end_idx += 1
                break
    i += 1

if end_idx <= start_idx:
    print("ERROR: Could not find chemBalance section end")
    exit(1)

print(f"Found chemBalance section: chars {start_idx} to {end_idx}")
print(f"Old section length: {end_idx - start_idx} chars")

NEW_SECTION = r"""stemLabTab === 'explore' && stemLabTool === 'chemBalance' && (() => {
          const d = labToolData.chemBalance;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, chemBalance: { ...prev.chemBalance, [key]: val } }));
          const allPresets = [
            // Beginner (Gr 5-6)
            { name: 'Water', tier: 'beginner', eq: 'H\u2082 + O\u2082 \u2192 H\u2082O', target: [2, 1, 2], atoms: { H: [2, 0, 2], O: [0, 2, 1] }, hint: 'Hydrogen needs 4 atoms total on each side' },
            { name: 'Table Salt', tier: 'beginner', eq: 'Na + Cl\u2082 \u2192 NaCl', target: [2, 1, 2], atoms: { Na: [1, 0, 1], Cl: [0, 2, 1] }, hint: 'Each NaCl needs one Na and one Cl' },
            { name: 'Magnesium Oxide', tier: 'beginner', eq: 'Mg + O\u2082 \u2192 MgO', target: [2, 1, 2], atoms: { Mg: [1, 0, 1], O: [0, 2, 1] }, hint: 'Oxygen comes in pairs' },
            { name: 'Iron Oxide', tier: 'beginner', eq: 'Fe + O\u2082 \u2192 Fe\u2082O\u2083', target: [4, 3, 2], atoms: { Fe: [1, 0, 2], O: [0, 2, 3] }, hint: 'Count Fe and O atoms on each side' },
            // Intermediate (Gr 7-8)
            { name: 'Combustion', tier: 'intermediate', eq: 'CH\u2084 + O\u2082 \u2192 CO\u2082 + H\u2082O', target: [1, 2, 1, 2], atoms: { C: [1, 0, 1, 0], H: [4, 0, 0, 2], O: [0, 2, 2, 1] }, hint: 'Balance C first, then H, then O' },
            { name: 'Photosynthesis', tier: 'intermediate', eq: 'CO\u2082 + H\u2082O \u2192 C\u2086H\u2081\u2082O\u2086 + O\u2082', target: [6, 6, 1, 6], atoms: { C: [1, 0, 6, 0], O: [2, 1, 6, 2], H: [0, 2, 12, 0] }, hint: 'Start with carbon: you need 6 CO\u2082' },
            { name: 'Acid + Base', tier: 'intermediate', eq: 'HCl + NaOH \u2192 NaCl + H\u2082O', target: [1, 1, 1, 1], atoms: { H: [1, 1, 0, 2], Cl: [1, 0, 1, 0], Na: [0, 1, 1, 0], O: [0, 1, 0, 1] }, hint: 'This one is already balanced at 1:1:1:1!' },
            { name: 'Ammonia', tier: 'intermediate', eq: 'N\u2082 + H\u2082 \u2192 NH\u2083', target: [1, 3, 2], atoms: { N: [2, 0, 1], H: [0, 2, 3] }, hint: 'You need 2 NH\u2083 to use both N atoms' },
            // Advanced (Gr 9+)
            { name: 'Thermite', tier: 'advanced', eq: 'Al + Fe\u2082O\u2083 \u2192 Al\u2082O\u2083 + Fe', target: [2, 1, 1, 2], atoms: { Al: [1, 0, 2, 0], Fe: [0, 2, 0, 1], O: [0, 3, 3, 0] }, hint: 'Aluminum replaces iron' },
            { name: 'Ethanol Combustion', tier: 'advanced', eq: 'C\u2082H\u2085OH + O\u2082 \u2192 CO\u2082 + H\u2082O', target: [1, 3, 2, 3], atoms: { C: [2, 0, 1, 0], H: [6, 0, 0, 2], O: [1, 2, 2, 1] }, hint: 'Balance C, then H, then adjust O last' },
            { name: 'Calcium Carbonate', tier: 'advanced', eq: 'CaCO\u2083 \u2192 CaO + CO\u2082', target: [1, 1, 1], atoms: { Ca: [1, 1, 0], C: [1, 0, 1], O: [3, 1, 2] }, hint: 'Decomposition: already balanced!' },
            { name: 'Glucose Combustion', tier: 'advanced', eq: 'C\u2086H\u2081\u2082O\u2086 + O\u2082 \u2192 CO\u2082 + H\u2082O', target: [1, 6, 6, 6], atoms: { C: [6, 0, 1, 0], H: [12, 0, 0, 2], O: [6, 2, 2, 1] }, hint: 'Balance C (6), then H (12\u219206), then O last' },
          ];
          const tierFilter = d.tierFilter || 'all';
          const filtered = tierFilter === 'all' ? allPresets : allPresets.filter(p => p.tier === tierFilter);
          const preset = filtered.find(p => p.name === d.equation) || filtered[0];
          const numSlots = preset.target.length;
          const coeffs = (d.coefficients || [1,1,1,1]).slice(0, numSlots);
          while (coeffs.length < numSlots) coeffs.push(1);
          const showHints = d.showHints || false;
          const streak = d.streak || 0;
          const getAtomCounts = (side) => {
            const result = {};
            Object.entries(preset.atoms).forEach(([atom, perMol]) => {
              let total = 0;
              perMol.forEach((count, i) => {
                if (side === 'left' && i < preset.eq.split('\u2192')[0].split('+').length) total += count * coeffs[i];
                if (side === 'right' && i >= preset.eq.split('\u2192')[0].split('+').length) total += count * coeffs[i];
              });
              if (total > 0) result[atom] = total;
            });
            return result;
          };
          const checkBalance = () => {
            const isCorrect = coeffs.every((c, i) => c === preset.target[i]);
            if (isCorrect) {
              upd('streak', streak + 1);
              upd('feedback', { correct: true, msg: '\u2705 Balanced! ' + (streak + 1 > 1 ? '\uD83D\uDD25 ' + (streak + 1) + ' in a row!' : 'Great job!') });
            } else {
              upd('streak', 0);
              upd('feedback', { correct: false, msg: '\u274C Not balanced yet. Check atom counts on each side.' });
            }
          };
          const switchPreset = (name) => { upd('equation', name); upd('coefficients', Array(allPresets.find(p => p.name === name)?.target.length || 4).fill(1)); upd('feedback', null); };
          const tierColors = { beginner: 'emerald', intermediate: 'amber', advanced: 'rose' };
          const tierLabels = { beginner: '\uD83C\uDF31 Beginner', intermediate: '\u26A1 Intermediate', advanced: '\uD83D\uDE80 Advanced' };
          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),
              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\u2697\uFE0F Equation Balancer"),
              streak > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full animate-in zoom-in" }, "\uD83D\uDD25 " + streak + " streak")
            ),
            // Tier filter chips
            React.createElement("div", { className: "flex gap-2 mb-3" },
              ['all', 'beginner', 'intermediate', 'advanced'].map(tier =>
                React.createElement("button", { key: tier, onClick: () => { upd('tierFilter', tier); const first = tier === 'all' ? allPresets[0] : allPresets.find(p => p.tier === tier); if (first) switchPreset(first.name); }, className: "px-3 py-1 rounded-full text-xs font-bold transition-all " + (tierFilter === tier ? 'bg-lime-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') }, tier === 'all' ? '\uD83D\uDCCA All' : tierLabels[tier] || tier)
              )
            ),
            // Equation preset chips
            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-4" },
              filtered.map(p => React.createElement("button", { key: p.name, onClick: () => switchPreset(p.name), className: "px-3 py-1 rounded-lg text-xs font-bold transition-all " + (d.equation === p.name ? 'bg-lime-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-lime-50 border border-slate-200') }, p.name))
            ),
            React.createElement("div", { className: "bg-white rounded-xl border border-lime-200 p-6 text-center" },
              // Equation display
              React.createElement("p", { className: "text-2xl font-bold text-slate-800 mb-4 tracking-wide" },
                (() => { const parts = preset.eq.split('\u2192'); const left = parts[0].split('+').map(s => s.trim()); const right = parts[1] ? parts[1].split('+').map(s => s.trim()) : []; const fmt = (seg, i) => (coeffs[i] > 1 ? coeffs[i] : '') + seg; return left.map((s, i) => fmt(s, i)).join(' + ') + ' \u2192 ' + right.map((s, i) => fmt(s, left.length + i)).join(' + '); })()
              ),
              // Coefficient controls
              React.createElement("div", { className: "flex justify-center gap-4 mb-4" },
                coeffs.map((c, i) =>
                  React.createElement("div", { key: i, className: "flex flex-col items-center gap-1" },
                    React.createElement("button", { onClick: () => { const nc = [...coeffs]; nc[i] = Math.min(12, nc[i] + 1); upd('coefficients', nc); upd('feedback', null); }, className: "w-8 h-8 bg-lime-100 rounded-lg font-bold text-lime-700 hover:bg-lime-200 transition-colors" }, "+"),
                    React.createElement("span", { className: "text-xl font-bold text-slate-700 w-8 text-center" }, c),
                    React.createElement("button", { onClick: () => { const nc = [...coeffs]; nc[i] = Math.max(1, nc[i] - 1); upd('coefficients', nc); upd('feedback', null); }, className: "w-8 h-8 bg-red-50 rounded-lg font-bold text-red-500 hover:bg-red-100 transition-colors" }, "\u2212")
                  )
                )
              ),
              // Action buttons
              React.createElement("div", { className: "flex justify-center gap-3 mb-3" },
                React.createElement("button", { onClick: checkBalance, className: "px-6 py-2 bg-lime-600 text-white font-bold rounded-lg hover:bg-lime-700 transition-colors shadow-sm" }, "\u2696\uFE0F Check Balance"),
                React.createElement("button", { onClick: () => upd('showHints', !showHints), className: "px-4 py-2 rounded-lg font-bold text-xs transition-colors " + (showHints ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-blue-50') }, showHints ? '\uD83D\uDCA1 Hide Hints' : '\uD83D\uDCA1 Show Hints'),
                React.createElement("button", { onClick: () => { upd('coefficients', Array(numSlots).fill(1)); upd('feedback', null); }, className: "px-4 py-2 bg-slate-100 text-slate-500 rounded-lg font-bold text-xs hover:bg-slate-200 transition-colors" }, "\uD83D\uDD04 Reset")
              ),
              // Hint: atom counts
              showHints && React.createElement("div", { className: "mt-3 bg-blue-50 rounded-lg p-3 border border-blue-200" },
                React.createElement("p", { className: "text-xs font-bold text-blue-700 mb-2" }, "\uD83D\uDCA1 " + preset.hint),
                React.createElement("div", { className: "flex justify-center gap-8" },
                  React.createElement("div", null,
                    React.createElement("p", { className: "text-xs font-bold text-slate-500 mb-1" }, "Left Side"),
                    Object.entries(getAtomCounts('left')).map(([atom, count]) =>
                      React.createElement("span", { key: atom, className: "inline-block px-2 py-0.5 bg-white rounded text-xs font-bold mr-1 mb-1 " + (getAtomCounts('left')[atom] === getAtomCounts('right')[atom] ? 'text-green-600 border border-green-200' : 'text-red-600 border border-red-200') }, atom + ": " + count)
                    )
                  ),
                  React.createElement("div", null,
                    React.createElement("p", { className: "text-xs font-bold text-slate-500 mb-1" }, "Right Side"),
                    Object.entries(getAtomCounts('right')).map(([atom, count]) =>
                      React.createElement("span", { key: atom, className: "inline-block px-2 py-0.5 bg-white rounded text-xs font-bold mr-1 mb-1 " + (getAtomCounts('left')[atom] === getAtomCounts('right')[atom] ? 'text-green-600 border border-green-200' : 'text-red-600 border border-red-200') }, atom + ": " + count)
                    )
                  )
                )
              ),
              // Feedback
              d.feedback && React.createElement("p", { className: "mt-3 text-sm font-bold " + (d.feedback.correct ? 'text-green-600' : 'text-red-600') }, d.feedback.msg)
            )
          )
        })(),"""

content = content[:start_idx] + NEW_SECTION + content[end_idx:]

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Equation Balancer upgraded! New section: {len(NEW_SECTION)} chars")
print(f"Total presets: 12 (4 beginner, 4 intermediate, 4 advanced)")
