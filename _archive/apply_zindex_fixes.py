#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Apply approved z-index and help mode fixes.

Fixes:
1. Add #tour-header-tools to help mode CSS (after #tour-header-settings block)
2. Adjust voice settings panel from top-20 to top-28
3. Adjust text settings panel from top-20 to top-28
"""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = []

# Fix 1: Add tour-header-tools to help mode CSS
# Insert after the tour-header-settings block (around line 32809)
target_line = None
for i in range(32805, 32815):
    if i < len(lines) and 'z-index: 200 !important;' in lines[i] and i > 32800:
        # Find the closing brace of this block
        for j in range(i, min(i+5, len(lines))):
            if '}' in lines[j] and '#tour-header-settings' not in lines[j]:
                target_line = j
                break
        break

if target_line:
    new_css = '''        
        /* FIX: Header Tools Interactivity (student/teacher view, dashboard) */
        .help-mode-active #tour-header-tools button,
        .help-mode-active #tour-header-tools [data-help-key] {
            pointer-events: auto !important;
            cursor: pointer !important;
            z-index: 200 !important;
        }
'''
    lines.insert(target_line + 1, new_css)
    changes.append(f'Added #tour-header-tools CSS after line {target_line + 1}')
else:
    print('WARNING: Could not find location for #tour-header-tools CSS')

# Re-read to get updated line numbers after insertion
# Actually, we need to account for the inserted lines
offset = len(new_css.split('\n')) if target_line else 0

# Fix 2: Adjust voice settings panel position
# Target: fixed top-20 right-4 ... z-[10001] (voice settings)
voice_fixed = False
for i, line in enumerate(lines):
    if 'fixed top-20 right-4' in line and 'z-[10001]' in line:
        lines[i] = line.replace('fixed top-20 right-4', 'fixed top-28 right-4')
        changes.append(f'Line {i+1}: Voice panel changed from top-20 to top-28')
        voice_fixed = True
        break

if not voice_fixed:
    print('WARNING: Could not find voice settings panel to fix')

# Fix 3: Adjust text settings panel position
# Target: fixed top-20 right-20 ... z-[10001] (text settings)
text_fixed = False
for i, line in enumerate(lines):
    if 'fixed top-20 right-20' in line and 'z-[10001]' in line:
        lines[i] = line.replace('fixed top-20 right-20', 'fixed top-28 right-20')
        changes.append(f'Line {i+1}: Text panel changed from top-20 to top-28')
        text_fixed = True
        break

if not text_fixed:
    print('WARNING: Could not find text settings panel to fix')

# Write changes
if changes:
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print('=' * 60)
    print('CHANGES APPLIED SUCCESSFULLY:')
    print('=' * 60)
    for change in changes:
        print(f'  ✓ {change}')
    print('=' * 60)
else:
    print('No changes were made.')
