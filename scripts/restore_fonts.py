# -*- coding: utf-8 -*-
"""Restore FONT_OPTIONS and injectFontStyles from word_sounds_module.js to main file."""
import os

WS_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js'
MAIN_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

# Read the font block from word_sounds_module.js (L10716-10960, 0-indexed 10715-10959)
with open(WS_FILE, 'r', encoding='utf-8') as f:
    ws_lines = f.readlines()

font_block = ws_lines[10715:10960]  # L10716 to L10960 inclusive
print(f"Font block: {len(font_block)} lines")
print(f"First line: {font_block[0].strip()[:80]}")
print(f"Last line: {font_block[-1].strip()[:80]}")

# Read main file
with open(MAIN_FILE, 'r', encoding='utf-8') as f:
    main_lines = f.readlines()
print(f"\nMain file before: {len(main_lines)} lines")

# Find the insertion point: right before "// #region --- LOCALIZATION STRINGS ---"
insert_idx = None
for i, l in enumerate(main_lines):
    if '// #region --- LOCALIZATION STRINGS ---' in l:
        insert_idx = i
        break

if insert_idx is None:
    print("ERROR: Could not find insertion point!")
    exit(1)

print(f"Inserting before L{insert_idx+1}: {main_lines[insert_idx].strip()[:80]}")

# Insert font block before localization strings
new_lines = main_lines[:insert_idx] + font_block + main_lines[insert_idx:]
print(f"Main file after: {len(new_lines)} lines")

with open(MAIN_FILE, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done!")
