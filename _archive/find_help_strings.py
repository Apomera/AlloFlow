#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Find help_mode section in UI_STRINGS
"""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find help_mode in UI_STRINGS
print('=== Looking for help_mode in UI_STRINGS ===')
for i, line in enumerate(lines):
    if 'help_mode:' in line or "'help_mode':" in line or '"help_mode":' in line:
        print(f'Found help_mode at line {i+1}')
        # Show surrounding context
        for j in range(i, min(i+50, len(lines))):
            print(f'{j+1}: {lines[j].rstrip()[:100]}')
        break

# Also look for where individual help keys are defined
print('\n\n=== Sample help_mode keys ===')
for i, line in enumerate(lines):
    if 'header_view_student' in line and ':' in line:
        print(f'{i+1}: {line.strip()[:100]}')
        break

for i, line in enumerate(lines):
    if 'header_dashboard' in line and ':' in line:
        print(f'{i+1}: {line.strip()[:100]}')
        break
