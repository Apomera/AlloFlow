# -*- coding: utf-8 -*-
"""Fix the cell display to show ? when hidden."""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact cell text - looking at the end of line 75122
old = "'text-slate-600 hover:bg-slate-50')}}>{val}</td>;"
new = "'text-slate-600 hover:bg-slate-50')}}>{multTableHidden && !isExact && !multTableRevealed.has(r+'-'+c) ? '?' : val}</td>;"

if old in content:
    content = content.replace(old, new, 1)
    print("Fixed cell display for hide/reveal")
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("File saved.")
else:
    print("Not found, trying alt")
    # Try just the end portion
    old2 = "font-semibold' : 'text-slate-600 hover:bg-slate-50')}}>{val}</td>"
    new2 = "font-semibold' : 'text-slate-600 hover:bg-slate-50')}}>{multTableHidden && !isExact && !multTableRevealed.has(r+'-'+c) ? '?' : val}</td>"
    if old2 in content:
        content = content.replace(old2, new2, 1)
        print("Fixed cell display (alt)")
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print("File saved.")
    else:
        print("FAIL - check manually")
