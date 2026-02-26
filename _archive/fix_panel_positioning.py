#!/usr/bin/env python3
"""
Fix voice settings panel to use fixed positioning.

The panel currently uses 'absolute top-full right-0' which keeps it inside the parent stacking context.
Changing to 'fixed top-20 right-4' will make it escape and render above all other elements.

This also fixes the text settings panel which has the same issue with lower z-index.
"""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = []

# Fix 1: Voice settings panel - change absolute to fixed
# Target: absolute top-full right-0 ... z-[10001]
for i, line in enumerate(lines):
    if 'absolute top-full right-0' in line and 'z-[10001]' in line:
        # Change absolute to fixed with explicit position
        # Original: absolute top-full right-0 mt-4 w-64
        # New: fixed top-20 right-4 w-64 (mt-4 becomes part of top positioning)
        new_line = line.replace('absolute top-full right-0 mt-4', 'fixed top-20 right-4')
        lines[i] = new_line
        changes.append(f'Line {i+1}: Voice settings panel changed from absolute to fixed positioning')
        print(f'Before: {line.strip()[:100]}')
        print(f'After:  {new_line.strip()[:100]}')
        break

# Fix 2: Also update text settings panel backdrop to match voice settings pattern
# (It has z-[90] which is lower - increase to z-[10000] for consistency)
# Target: fixed inset-0 z-[90] onClick={() => setShowTextSettings
for i, line in enumerate(lines):
    if 'z-[90]' in line and 'setShowTextSettings' in line:
        new_line = line.replace('z-[90]', 'z-[10000]')
        lines[i] = new_line
        changes.append(f'Line {i+1}: Text settings backdrop z-index increased to z-[10000]')
        print(f'\nAlso fixed text settings backdrop:')
        print(f'Before: {line.strip()[:80]}')
        print(f'After:  {new_line.strip()[:80]}')

# Fix 3: Text settings panel - also change to fixed positioning for consistency
# Target: absolute top-full right-0 ... z-[100] (text settings uses z-[100])
for i, line in enumerate(lines):
    if 'absolute top-full right-0' in line and 'z-[100]' in line and 'mt-4 w-72' in line:
        # This is the text settings panel
        new_line = line.replace('absolute top-full right-0 mt-4', 'fixed top-20 right-20')
        new_line = new_line.replace('z-[100]', 'z-[10001]')
        lines[i] = new_line
        changes.append(f'Line {i+1}: Text settings panel changed to fixed positioning with z-[10001]')
        print(f'\nAlso fixed text settings panel:')
        print(f'Before: {line.strip()[:100]}')
        print(f'After:  {new_line.strip()[:100]}')
        break

if changes:
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('\n' + '='*70)
    print('CHANGES APPLIED:')
    for c in changes:
        print(f'  - {c}')
    print('='*70)
else:
    print('No changes needed or patterns not found.')
