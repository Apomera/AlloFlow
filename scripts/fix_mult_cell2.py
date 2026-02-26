# -*- coding: utf-8 -*-
"""Fix the cell display to show ? when hidden - using line-based approach."""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "hover:bg-slate-50')}" in line and '{val}</td>' in line and i > 75000:
        old_part = '>{val}</td>'
        new_part = '>{multTableHidden && !isExact && !multTableRevealed.has(r+\'-\'+c) ? \'?\' : val}</td>'
        lines[i] = line.replace(old_part, new_part, 1)
        print(f"Fixed cell at L{i+1}")
        break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("File saved.")
