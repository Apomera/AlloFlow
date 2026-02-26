#!/usr/bin/env python3
"""Fix voice settings panel z-index by increasing parent container z-index"""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix 1: Increase tour-header-settings container z-index from z-[60] to z-[10002]
# This ensures it's above tour-header-utils at z-[100]
modified = False
for i, line in enumerate(lines):
    if 'id="tour-header-settings"' in line and 'z-[60]' in line:
        print(f'Found tour-header-settings at line {i+1}:')
        print(f'  Before: {line.strip()[:120]}...')
        # Note: We need a very high z-index because the panel dropdown needs to escape
        # We'll use z-[10002] so when the panel opens (z-[10001]), the whole section is above other headers
        lines[i] = line.replace('z-[60]', 'z-[10002]')
        print(f'  After:  {lines[i].strip()[:120]}...')
        modified = True
        break

if not modified:
    print('Could not find tour-header-settings with z-[60]. Searching...')
    for i, line in enumerate(lines):
        if 'tour-header-settings' in line:
            print(f'  Line {i+1}: {line.strip()[:120]}')

if modified:
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('\nSUCCESS: tour-header-settings z-index increased to z-[10002]!')
