# -*- coding: utf-8 -*-
"""Restore WordFamiliesView and StudentAnalyticsPanel to main file."""

WS_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js'
MAIN_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(WS_FILE, 'r', encoding='utf-8') as f:
    ws_lines = f.readlines()
with open(MAIN_FILE, 'r', encoding='utf-8') as f:
    main_lines = f.readlines()

print(f"Main file before: {len(main_lines)} lines")

# WordFamiliesView: ws L1051-1288 (index 1050-1287)
wfv_block = ws_lines[1050:1288]
print(f"WordFamiliesView block: {len(wfv_block)} lines")
print(f"  First: {wfv_block[0].strip()[:80]}")
print(f"  Last: {wfv_block[-1].strip()[:80]}")

# StudentAnalyticsPanel: ws L6777-10715 (index 6776-10714)
sap_block = ws_lines[6776:10715]
print(f"StudentAnalyticsPanel block: {len(sap_block)} lines")
print(f"  First: {sap_block[0].strip()[:80]}")
print(f"  Last: {sap_block[-1].strip()[:80]}")

# Find insertion point: right before "// #region --- LOCALIZATION STRINGS ---"
# which we added earlier. Actually, let's put them before  FONT_OPTIONS
# which is at the start of the extracted constants region
insert_idx = None
for i, l in enumerate(main_lines):
    if 'const FONT_OPTIONS = [' in l:
        insert_idx = i
        break

if insert_idx is None:
    print("ERROR: Could not find FONT_OPTIONS!")
    exit(1)

print(f"Inserting before L{insert_idx+1}: {main_lines[insert_idx].strip()[:80]}")

# Combine: WordFamiliesView + blank line + StudentAnalyticsPanel + blank line
combined = wfv_block + ['\n'] + sap_block + ['\n']
print(f"Combined block: {len(combined)} lines")

# Insert
new_lines = main_lines[:insert_idx] + combined + main_lines[insert_idx:]
print(f"Main file after: {len(new_lines)} lines")

with open(MAIN_FILE, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done!")
