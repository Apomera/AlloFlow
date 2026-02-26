# -*- coding: utf-8 -*-
"""Move STEM Lab button back to accordion header with sleek pill style, rename to 'Explore'."""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = 0

# 1. Remove the panel body button (the <div className="flex justify-end..."> wrapper)
for i, line in enumerate(lines):
    if 'flex justify-end px-3 pt-2' in line and 'setShowStemLab' in lines[i+1]:
        # Find the closing </div> of the wrapper (5 lines: div, button, content, /button, /div)
        end = i
        for j in range(i, min(i + 8, len(lines))):
            if '</div>' in lines[j] and j > i + 2:
                end = j
                break
        del lines[i:end+1]
        changes += 1
        print(f"Removed panel body button at L{i+1}-{end+1}")
        break

# 2. Add sleek pill button back in the accordion header
# Find the header: <div className="text-sm font-bold text-slate-700 flex gap-2 items-center"><Calculator...> Math</div>
# Insert the pill AFTER that div and BEFORE the chevron
for i, line in enumerate(lines):
    if "text-sm font-bold text-slate-700 flex gap-2 items-center" in line and 'Calculator' in line and "t('math.title')" in line:
        nl = '\r\n' if line.endswith('\r\n') else '\n'
        # Insert the pill button after this line, before the chevron
        pill = (
            '                  <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setShowStemLab(true); setStemLabTab(\'explore\'); }} onKeyDown={(e) => { if (e.key === \'Enter\') { e.stopPropagation(); setShowStemLab(true); setStemLabTab(\'explore\'); }}} className="group flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/50 rounded-full transition-all hover:shadow-sm cursor-pointer" aria-label="Open STEM Lab Explore">' + nl +
            '                      \U0001f9ea <span className="group-hover:tracking-wide transition-all">Explore</span>' + nl +
            '                  </span>' + nl
        )
        lines.insert(i+1, pill)
        changes += 1
        print(f"Added sleek 'Explore' pill in header after L{i+1}")
        break

print(f"\nTotal changes: {changes}")

if changes >= 2:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("File saved.")
else:
    print(f"WARNING: Expected 2 changes, got {changes}")
    if changes > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("Saved partial changes.")
