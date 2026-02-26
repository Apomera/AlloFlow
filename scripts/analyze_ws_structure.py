# -*- coding: utf-8 -*-
"""Analyze the word_sounds_module.js to understand what's actually
WordSoundsModal code vs unrelated code that got swept up."""
import re

WS_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js'

with open(WS_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find all top-level component/constant definitions
# Include React.memo, React.useMemo, arrow functions assigned to PascalCase
pat = re.compile(r'^const\s+([A-Z]\w+)\s*=')
for i, l in enumerate(lines):
    stripped = l.strip()
    m = pat.match(stripped)
    if m:
        print(f"L{i+1}: {stripped[:120]}")

# Also find the end of WordSoundsModal component
print("\n=== Finding WordSoundsModal boundaries ===")
print(f"L1: {lines[0].strip()[:120]}")

# Find the actual WordSoundsModal component declaration
for i, l in enumerate(lines):
    if 'const WordSoundsModal' in l:
        print(f"WordSoundsModal at L{i+1}: {l.strip()[:120]}")

# Check if WordFamiliesView and StudentAnalyticsPanel are inside 
# WordSoundsModal's function body or outside it
# Look at the indentation / nesting around L1051 and L6777
print(f"\nAround WordFamiliesView (L1049-1053):")
for i in range(1048, 1054):
    indent = len(lines[i]) - len(lines[i].lstrip())
    print(f"  L{i+1} (indent={indent}): {lines[i].strip()[:120]}")

print(f"\nAround StudentAnalyticsPanel (L6775-6779):")
for i in range(6774, 6780):
    indent = len(lines[i]) - len(lines[i].lstrip())
    print(f"  L{i+1} (indent={indent}): {lines[i].strip()[:120]}")

# Check the IIFE wrapper
print(f"\nFirst 5 lines:")
for i in range(5):
    print(f"  L{i+1}: {lines[i].strip()[:120]}")

print(f"\nLast 5 lines:")
for i in range(len(lines)-5, len(lines)):
    print(f"  L{i+1}: {lines[i].strip()[:120]}")
