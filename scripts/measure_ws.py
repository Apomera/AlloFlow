# -*- coding: utf-8 -*-
"""Measure WordSoundsModal size and prop interface."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find WordSoundsModal definition start
ws_start = None
for i,l in enumerate(lines):
    if 'const WordSoundsModal' in l or 'function WordSoundsModal' in l:
        ws_start = i
        print(f'WordSoundsModal starts at L{i+1}: {l.strip()[:100]}')
        break

# Find the end - match braces
if ws_start:
    depth = 0
    ws_end = ws_start
    for j in range(ws_start, len(lines)):
        for ch in lines[j]:
            if ch == '{': depth += 1
            elif ch == '}': depth -= 1
        if depth <= 0 and j > ws_start + 100:
            ws_end = j
            break

    ws_size = sum(len(lines[k]) for k in range(ws_start, ws_end+1))
    print(f'WordSoundsModal ends at L{ws_end+1}')
    print(f'  Lines: {ws_end - ws_start + 1}')
    print(f'  Size: {ws_size // 1024} KB')

# Look at what components are defined BEFORE WordSoundsModal
# (sub-components it might reference)
print('\nComponents defined before WordSoundsModal:')
for i,l in enumerate(lines):
    if i < ws_start and 'React.memo' in l:
        print(f'  L{i+1}: {l.strip()[:100]}')
    if i < ws_start and l.strip().startswith('const ') and '= ({' in l and i > 50:
        name = l.strip().split('=')[0].replace('const ','').strip()
        if name[0].isupper() and len(name) > 5:
            print(f'  L{i+1}: {name}')

# Look at props passed to WordSoundsModal
print('\nWordSoundsModal props (from render call):')
for i,l in enumerate(lines):
    if '<WordSoundsModal' in l and i > 30000:
        # Print a few lines around it
        for k in range(i, min(i+5, len(lines))):
            print(f'  L{k+1}: {lines[k].strip()[:120]}')
        break

# Also check what sub-components are in the module
print('\nSub-components inside WordSoundsModal:')
for i,l in enumerate(lines):
    if ws_start and i > ws_start and i < ws_end:
        if l.strip().startswith('const ') and '= (' in l:
            name = l.strip().split('=')[0].replace('const ','').strip()
            if name[0].isupper() and len(name) > 4:
                print(f'  L{i+1}: {name}')

print('\nDone!')
