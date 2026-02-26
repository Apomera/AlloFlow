# -*- coding: utf-8 -*-
"""Analyze Word Sounds module for externalization."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print('=== WORD SOUNDS MODULE ANALYSIS ===\n')

# 1. Find all React.memo components in first 15K lines
print('React.memo components (first 15K lines):')
for i,l in enumerate(lines):
    if i < 15000 and 'React.memo' in l:
        print(f'  L{i+1}: {l.strip()[:110]}')

# 2. Find WordSoundsStudio definition
print('\nWord Sounds major definitions:')
for i,l in enumerate(lines):
    if i < 15000 and ('WordSoundsStudio' in l or 'WordSoundsModal' in l) and ('const ' in l or 'function ' in l or 'React.memo' in l):
        print(f'  L{i+1}: {l.strip()[:110]}')

# 3. Measure the Word Sounds region
# The KI says it's in Config region L54-14385
# Find first and last WS-related component/function
first_ws_comp = last_ws_comp = None
for i,l in enumerate(lines):
    if i < 15000 and ('React.memo' in l or l.strip().startswith('const ')) and ('Word' in l or 'Phonol' in l or 'Rhyme' in l or 'Blend' in l or 'Isol' in l or 'Trace' in l or 'Segment' in l):
        if first_ws_comp is None: first_ws_comp = i
        last_ws_comp = i

if first_ws_comp:
    print(f'\nWord Sounds component region: L{first_ws_comp+1} to L{last_ws_comp+1}')

# 4. Count total lines in the WS component region
# Find the end of the last WS component
if last_ws_comp:
    depth = 0
    ws_region_end = last_ws_comp
    for j in range(last_ws_comp, min(last_ws_comp + 5000, len(lines))):
        for ch in lines[j]:
            if ch == '{': depth += 1
            elif ch == '}': depth -= 1
        if depth <= 0 and j > last_ws_comp + 10:
            ws_region_end = j
            break
    
    ws_size = sum(len(lines[k]) for k in range(first_ws_comp, ws_region_end+1))
    print(f'WS region: L{first_ws_comp+1} to L{ws_region_end+1}')
    print(f'  Lines: {ws_region_end - first_ws_comp + 1}')
    print(f'  Size: {ws_size // 1024} KB')

# 5. Where is WS rendered in the main app?
print('\nWordSounds render calls in main app:')
for i,l in enumerate(lines):
    if i > 15000 and ('WordSoundsStudio' in l or 'WordSoundsModal' in l or 'isWordSoundsMode' in l) and ('<' in l or 'createElement' in l or '&&' in l):
        print(f'  L{i+1}: {l.strip()[:110]}')

print('\nDone!')
