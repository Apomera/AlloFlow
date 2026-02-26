# -*- coding: utf-8 -*-
"""Restyle the STEM Lab button from heavy gradient to a sleek compact pill."""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

found = False
for i in range(len(lines)):
    if 'setShowStemLab(true)' in lines[i] and i > 60000 and i < 61000:
        if i + 1 < len(lines) and 'w-full py-2 bg-gradient' in lines[i+1]:
            nl = '\r\n' if lines[i].endswith('\r\n') else '\n'
            # Find </button>
            end = i
            for j in range(i, min(i + 5, len(lines))):
                if '</button>' in lines[j]:
                    end = j
                    break
            
            indent = '                    '
            new_lines = [
                indent + '<div className="flex justify-end px-3 pt-2">' + nl,
                indent + '    <button onClick={() => setShowStemLab(true)} className="group flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-full transition-all hover:shadow-sm">' + nl,
                indent + '        \U0001f9ea <span className="group-hover:tracking-wide transition-all">STEM Lab</span> <span className="text-indigo-400 text-[9px]">\u2192</span>' + nl,
                indent + '    </button>' + nl,
                indent + '</div>' + nl,
            ]
            
            lines[i:end + 1] = new_lines
            found = True
            print(f"Replaced button at L{i+1}-{end+1} with sleek pill ({end - i + 1} lines -> {len(new_lines)} lines)")
            break

if found:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("File saved.")
else:
    print("ERROR: Button not found!")
