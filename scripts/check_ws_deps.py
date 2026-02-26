# -*- coding: utf-8 -*-
"""Check if WS sub-components are used outside WordSoundsModal."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for comp in ['GlobalMuteButton', 'LargeFileTranscriptionModal', 'VisualPanelGrid']:
    refs = []
    for i,l in enumerate(lines):
        if comp in l:
            refs.append(i+1)
    inside = [r for r in refs if 4296 <= r <= 15304]
    outside = [r for r in refs if r < 4296 or r > 15304]
    print(f'{comp}: {len(refs)} total refs ({len(inside)} inside WS, {len(outside)} outside)')
    for r in outside:
        print(f'  Outside ref at L{r}: {lines[r-1].strip()[:80]}')

# Also measure the sub-components
print()
print('Sub-component sizes:')
for name, start_line in [('GlobalMuteButton', 179), ('LargeFileTranscriptionModal', 380), ('VisualPanelGrid', 1314)]:
    depth = 0
    end = start_line - 1
    for j in range(start_line - 1, min(start_line + 3000, len(lines))):
        for ch in lines[j]:
            if ch == '{': depth += 1
            elif ch == '}': depth -= 1
        if depth <= 0 and j > start_line:
            end = j
            break
    size = sum(len(lines[k]) for k in range(start_line-1, end+1))
    print(f'  {name}: L{start_line}-{end+1} ({end - start_line + 2} lines, {size // 1024} KB)')

# What's between VisualPanelGrid end and WordSoundsModal start?
print('\nLines between VisualPanelGrid end and WordSoundsModal start:')
# Find VisualPanelGrid end
depth = 0
vpg_end = 1314
for j in range(1313, min(4300, len(lines))):
    for ch in lines[j]:
        if ch == '{': depth += 1
        elif ch == '}': depth -= 1
    if depth <= 0 and j > 1320:
        vpg_end = j
        break
gap = 4295 - vpg_end
gap_size = sum(len(lines[k]) for k in range(vpg_end+1, 4296))
print(f'  Gap: L{vpg_end+2} to L4296 ({gap} lines, {gap_size // 1024} KB)')
print(f'  This gap contains data/constants that WordSoundsModal may need')

# Total extractable region
total_start = 179  # GlobalMuteButton
total_end = 15304  # WordSoundsModal end
total_size = sum(len(lines[k]) for k in range(total_start-1, total_end))
print(f'\nTotal extractable region: L{total_start}-{total_end}')
print(f'  Lines: {total_end - total_start + 1}')
print(f'  Size: {total_size // 1024} KB')
