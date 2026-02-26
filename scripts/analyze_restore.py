# -*- coding: utf-8 -*-
"""Restore WordFamiliesView and StudentAnalyticsPanel from word_sounds_module.js
back to AlloFlowANTI.txt. These were incorrectly extracted with the WordSoundsModal."""
import re

WS_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js'
MAIN_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(WS_FILE, 'r', encoding='utf-8') as f:
    ws_lines = f.readlines()

# Find boundaries of each component using brace counting
# Starting from the 'const X =' line until the closing line

def find_component_end(lines, start_idx):
    """Find the end of a component definition by tracking brace depth."""
    depth = 0
    started = False
    for i in range(start_idx, len(lines)):
        line = lines[i]
        for ch in line:
            if ch == '{':
                depth += 1
                started = True
            elif ch == '}':
                depth -= 1
        if started and depth <= 0:
            return i
    return len(lines) - 1

# WordFamiliesView starts at L1051 (index 1050)
wfv_start = 1050
wfv_end = find_component_end(ws_lines, wfv_start)
print(f"WordFamiliesView: L{wfv_start+1} to L{wfv_end+1} = {wfv_end - wfv_start + 1} lines")

# What's between WordFamiliesView end and StudentAnalyticsPanel start?
# StudentAnalyticsPanel starts at L6777 (index 6776)
sap_start = 6776
sap_end = find_component_end(ws_lines, sap_start)
print(f"StudentAnalyticsPanel: L{sap_start+1} to L{sap_end+1} = {sap_end - sap_start + 1} lines")

# Check what's between them
print(f"\nBetween WordFamiliesView end (L{wfv_end+2}) and StudentAnalyticsPanel start (L{sap_start+1}):")
between_start = wfv_end + 1
between_end = sap_start
for i in range(between_start, min(between_end, between_start + 10)):
    print(f"  L{i+1}: {ws_lines[i].strip()[:100]}")
if between_end - between_start > 10:
    print(f"  ... ({between_end - between_start - 10} more lines)")
    for i in range(between_end - 3, between_end):
        print(f"  L{i+1}: {ws_lines[i].strip()[:100]}")

# Check what's right after StudentAnalyticsPanel
print(f"\nAfter StudentAnalyticsPanel (L{sap_end+2}):")
for i in range(sap_end + 1, min(sap_end + 5, len(ws_lines))):
    print(f"  L{i+1}: {ws_lines[i].strip()[:100]}")

# Verify end lines look correct
print(f"\nWordFamiliesView end line: {ws_lines[wfv_end].strip()[:80]}")
print(f"StudentAnalyticsPanel end line: {ws_lines[sap_end].strip()[:80]}")

# The block between WordFamiliesView and FONT_OPTIONS (L10716) that isn't
# WordSoundsModal-internal should go back to main file
# Let's see what components are between wfv_end and sap_start
print(f"\n=== PascalCase defs between L{wfv_end+2} and L{sap_start+1} ===")
pat = re.compile(r'^const\s+([A-Z]\w+)\s*=')
for i in range(wfv_end + 1, sap_start):
    m = pat.match(ws_lines[i].strip())
    if m:
        print(f"  L{i+1}: {ws_lines[i].strip()[:120]}")
