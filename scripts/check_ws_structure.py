# -*- coding: utf-8 -*-
"""Check if the WordFamiliesView references are inside duplicate WordSounds code
that should have been extracted. Also find the Word Sounds IIFE loader."""

MAIN_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(MAIN_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open(r'scripts\ws_structure.txt', 'w', encoding='utf-8') as out:
    out.write(f"Total lines: {len(lines)}\n\n")
    
    # Find the Word Sounds IIFE loader
    out.write("=== Word Sounds Module IIFE ===\n")
    for i, l in enumerate(lines):
        if 'AlloModules' in l and 'WordSounds' in l:
            out.write(f"L{i+1}: {l.strip()[:160]}\n")
    
    # Check if there's a standalone WordSoundsModal definition in main file
    out.write("\n=== WordSoundsModal definitions ===\n")
    for i, l in enumerate(lines):
        if 'const WordSoundsModal' in l or 'function WordSoundsModal' in l:
            out.write(f"L{i+1}: {l.strip()[:160]}\n")
    
    # Check context around L8728 - what function body is this inside?
    # Walk backward from L8728 to find the function start
    out.write("\n=== Context around WordFamiliesView refs ===\n")
    out.write("\n--- Walking back from L8728 ---\n")
    for i in range(8727, max(8527, 0), -1):
        l = lines[i].strip()
        if ('const ' in l and '= (' in l) or ('function ' in l) or ('React.memo' in l):
            out.write(f"  Possible function start L{i+1}: {l[:160]}\n")
        if l.startswith('const ') and ('= React.memo' in l or '= ({' in l or '= (' in l):
            out.write(f"  ** Component definition L{i+1}: {l[:160]}\n")
            break

print("Done - see scripts/ws_structure.txt")
