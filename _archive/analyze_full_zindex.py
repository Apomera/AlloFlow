#!/usr/bin/env python3
"""Save z-index analysis to file"""
import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

with open('zindex_analysis.txt', 'w', encoding='utf-8') as out:
    # Find ALL z-index values
    z_items = []
    for i, line in enumerate(lines):
        matches = re.findall(r'z-\[(\d+)\]|z-index:\s*(\d+)|z-(\d+)(?![0-9])', line)
        for m in matches:
            z_val = int(m[0] or m[1] or m[2])
            z_items.append((z_val, i+1, line.strip()[:180]))

    z_items.sort(reverse=True)

    out.write('TOP 80 HIGHEST Z-INDEX VALUES\n')
    out.write('=' * 100 + '\n')
    for z, ln, txt in z_items[:80]:
        out.write(f'z={z:<7} Line {ln:<6}: {txt}\n')

    out.write('\n\nVOICE SETTINGS AREA (Lines 56490-56560)\n')
    out.write('=' * 100 + '\n')
    for i in range(56489, min(56560, len(lines))):
        line = lines[i]
        out.write(f'{i+1}: {line.rstrip()}\n')

    out.write('\n\nHEADER UTILS AREA (Lines 56630-56700)\n')  
    out.write('=' * 100 + '\n')
    for i in range(56629, min(56700, len(lines))):
        out.write(f'{i+1}: {lines[i].rstrip()}\n')

print('Analysis saved to zindex_analysis.txt')
