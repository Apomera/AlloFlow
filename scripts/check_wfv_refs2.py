# -*- coding: utf-8 -*-
"""Check where the 3 WordFamiliesView references are in the main file. Output to file."""
MAIN_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(MAIN_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open(r'scripts\wfv_refs.txt', 'w', encoding='utf-8') as out:
    out.write(f"Total lines: {len(lines)}\n\n")
    for i, l in enumerate(lines):
        if 'WordFamiliesView' in l:
            start = max(0, i-3)
            end = min(len(lines), i+4)
            out.write(f"--- WordFamiliesView at L{i+1} ---\n")
            for j in range(start, end):
                marker = ">>>" if j == i else "   "
                out.write(f"  {marker} L{j+1}: {lines[j].rstrip()[:160]}\n")
            out.write("\n")

print("Done - see scripts/wfv_refs.txt")
