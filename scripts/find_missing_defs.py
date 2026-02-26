# -*- coding: utf-8 -*-
"""Find ALL top-level definitions in word_sounds_module.js that are
referenced by AlloFlowANTI.txt but not defined there."""
import re

WS_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js'
MAIN_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(WS_FILE, 'r', encoding='utf-8') as f:
    ws_lines = f.readlines()
with open(MAIN_FILE, 'r', encoding='utf-8') as f:
    main_text = f.read()
    main_lines = main_text.split('\n')

# Find top-level const/let/var/function definitions in word_sounds_module.js
# These are lines that start with const/let/var/function (no leading whitespace beyond module wrapper)
ws_defs = {}
pat = re.compile(r'^(?:const|let|var)\s+(\w+)\s*=|^(?:function)\s+(\w+)\s*\(|^const\s+(\w+)\s*=\s*React\.memo|^const\s+(\w+)\s*=\s*\(\{')
for i, line in enumerate(ws_lines):
    stripped = line.strip()
    m = pat.match(stripped)
    if m:
        name = m.group(1) or m.group(2) or m.group(3) or m.group(4)
        if name and len(name) > 2:  # Skip short variable names
            ws_defs[name] = i + 1

print(f"Top-level definitions in word_sounds_module.js: {len(ws_defs)}")
for name, line in sorted(ws_defs.items(), key=lambda x: x[1]):
    print(f"  L{line}: {name}")

print("\n=== CHECKING MAIN FILE ===\n")

# For each definition in ws module, check if it's referenced in main file
# AND not defined in main file
missing = []
for name, ws_line in sorted(ws_defs.items(), key=lambda x: x[1]):
    # Check if referenced in main file
    ref_count = main_text.count(name)
    if ref_count == 0:
        continue
    
    # Check if defined in main file
    def_pat = re.compile(rf'^(?:const|let|var)\s+{re.escape(name)}\s*=|^function\s+{re.escape(name)}\s*\(', re.MULTILINE)
    is_defined = bool(def_pat.search(main_text))
    
    if not is_defined and ref_count > 0:
        # Find reference locations
        ref_lines = []
        for i, ml in enumerate(main_lines):
            if name in ml:
                ref_lines.append(i + 1)
        missing.append((name, ws_line, ref_count, ref_lines[:5]))
        print(f"MISSING: {name} (WS L{ws_line}, {ref_count} refs in main: {ref_lines[:5]})")
    elif is_defined:
        pass  # Already defined, fine

print(f"\n=== TOTAL MISSING: {len(missing)} ===")
for name, ws_line, ref_count, refs in missing:
    print(f"  {name}: defined at WS L{ws_line}, {ref_count} refs in main at lines {refs}")
