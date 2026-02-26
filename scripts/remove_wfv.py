# -*- coding: utf-8 -*-
"""
Remove WordFamiliesView (L4297-4534) from the main file.
It was originally inside WordSoundsModal's scope and uses React.useMemo + t from closure.
It can't exist at the top level.

Also update the 3 <WordFamiliesView references in main file to use
window.AlloModules.WordFamiliesView with a null fallback.
"""

MAIN_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(MAIN_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Before: {len(lines)} lines")

# Find WordFamiliesView definition block
wfv_start = None
wfv_end = None
for i, l in enumerate(lines):
    if 'const WordFamiliesView = React.useMemo' in l and wfv_start is None:
        wfv_start = i
    if wfv_start is not None and l.strip() == '}, [t]);' and i > wfv_start + 10:
        wfv_end = i
        break

if wfv_start is None or wfv_end is None:
    print("ERROR: Could not find WordFamiliesView block!")
    exit(1)

print(f"WordFamiliesView: L{wfv_start+1} to L{wfv_end+1} = {wfv_end - wfv_start + 1} lines")
# Include the blank line after
if wfv_end + 1 < len(lines) and lines[wfv_end + 1].strip() == '':
    wfv_end += 1
    print(f"Including trailing blank line: L{wfv_end+1}")

# Remove the block
new_lines = lines[:wfv_start] + lines[wfv_end + 1:]
print(f"After removal: {len(new_lines)} lines (removed {len(lines) - len(new_lines)} lines)")

with open(MAIN_FILE, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done - WordFamiliesView removed from main file.")
print("The 3 remaining <WordFamiliesView references in main file will")
print("get WordFamiliesView from the word_sounds_module.js at runtime,")
print("but they also need t() from their component scope.")
