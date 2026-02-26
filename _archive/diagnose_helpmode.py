#!/usr/bin/env python3
"""Diagnose help mode and AlloBot issues"""
import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open('diagnosis_report.txt', 'w', encoding='utf-8') as out:
    out.write('=' * 80 + '\n')
    out.write('HELP MODE IMPLEMENTATION\n')
    out.write('=' * 80 + '\n')
    for i, line in enumerate(lines):
        if 'isHelpMode' in line or 'helpMode' in line or 'setIsHelpMode' in line:
            out.write(f'{i+1}: {line.rstrip()}\n')
    
    out.write('\n' + '=' * 80 + '\n')
    out.write('HELP MODE OVERLAY / CLICK HANDLING\n')
    out.write('=' * 80 + '\n')
    for i, line in enumerate(lines):
        if 'data-help-key' in line:
            out.write(f'{i+1}: {line.strip()[:150]}\n')
            if i < 10:
                continue
            break  # Just show first few
    
    out.write('\n... (showing only first few data-help-key instances)\n')
    
    out.write('\n' + '=' * 80 + '\n')
    out.write('ALLOBOT CONTAINER Z-INDEX AND VISIBILITY\n')
    out.write('=' * 80 + '\n')
    # Find AlloBot component rendering
    for i, line in enumerate(lines):
        if '<AlloBot' in line or 'isBotVisible' in line:
            # Show context around this line
            start = max(0, i-2)
            end = min(len(lines), i+5)
            for j in range(start, end):
                out.write(f'{j+1}: {lines[j].rstrip()}\n')
            out.write('\n---\n')
            if 'isBotVisible' in line and '&&' in line:
                break  # Main render is found
    
    out.write('\n' + '=' * 80 + '\n')
    out.write('TOUR-HEADER-SETTINGS CURRENT STATE\n')
    out.write('=' * 80 + '\n')
    for i in range(56370, min(56380, len(lines))):
        out.write(f'{i+1}: {lines[i].rstrip()}\n')

    out.write('\n' + '=' * 80 + '\n')
    out.write('HIGH Z-INDEX ELEMENTS THAT COULD BLOCK HELP MODE\n')
    out.write('=' * 80 + '\n')
    z_items = []
    for i, line in enumerate(lines):
        matches = re.findall(r'z-\[(\d+)\]', line)
        for m in matches:
            z_val = int(m)
            if z_val >= 1000:
                z_items.append((z_val, i+1, line.strip()[:120]))
    z_items.sort(reverse=True)
    for z, ln, txt in z_items[:30]:
        out.write(f'z={z:<6} Line {ln:<6}: {txt}\n')

print('Diagnosis saved to diagnosis_report.txt')
