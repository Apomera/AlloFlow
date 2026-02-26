# -*- coding: utf-8 -*-
"""Check where the 3 WordFamiliesView references are in the main file."""

MAIN_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(MAIN_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find all WordFamiliesView references
for i, l in enumerate(lines):
    if 'WordFamiliesView' in l:
        # Show context (3 lines before, the line, 3 lines after)
        start = max(0, i-3)
        end = min(len(lines), i+4)
        print(f"\n--- WordFamiliesView at L{i+1} ---")
        for j in range(start, end):
            marker = ">>>" if j == i else "   "
            print(f"  {marker} L{j+1}: {lines[j].rstrip()[:160]}")
