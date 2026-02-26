# -*- coding: utf-8 -*-
"""Find t() calls in the StudentAnalyticsPanel block (the restored code)."""
import re

MAIN_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(MAIN_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The restored blocks are before FONT_OPTIONS. Find them.
# WordFamiliesView starts around L4297
# StudentAnalyticsPanel is after WordFamiliesView
# FONT_OPTIONS is after StudentAnalyticsPanel

font_opts_line = None
wfv_line = None
sap_line = None
for i, l in enumerate(lines):
    if 'const WordFamiliesView' in l and wfv_line is None:
        wfv_line = i
    if 'const StudentAnalyticsPanel' in l and sap_line is None:
        sap_line = i
    if 'const FONT_OPTIONS' in l and font_opts_line is None:
        font_opts_line = i

with open(r'scripts\t_refs_result.txt', 'w', encoding='utf-8') as out:
    out.write(f"WordFamiliesView at L{wfv_line+1 if wfv_line else 'NOT FOUND'}\n")
    out.write(f"StudentAnalyticsPanel at L{sap_line+1 if sap_line else 'NOT FOUND'}\n")
    out.write(f"FONT_OPTIONS at L{font_opts_line+1 if font_opts_line else 'NOT FOUND'}\n\n")
    
    # Search the restored blocks for t(' calls
    search_start = wfv_line or 0
    search_end = font_opts_line or len(lines)
    
    out.write(f"Searching L{search_start+1} to L{search_end+1} for t() calls:\n\n")
    
    pat = re.compile(r"\bt\s*\(\s*['\"]")
    count = 0
    for i in range(search_start, search_end):
        if pat.search(lines[i]):
            count += 1
            out.write(f"L{i+1}: {lines[i].strip()[:160]}\n")
    
    out.write(f"\nTotal: {count} t() calls in restored blocks\n")

print("Output written to scripts/t_refs_result.txt")
