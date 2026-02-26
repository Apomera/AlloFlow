#!/usr/bin/env python3
"""Fix z-index of voice settings backdrop to prevent button overlap"""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find lines containing z-[90] that are within 5 lines of showVoiceSettings
print('Searching for z-[90] near showVoiceSettings context...')
voice_settings_lines = set()
for i, line in enumerate(lines):
    if 'showVoiceSettings' in line:
        voice_settings_lines.add(i)
        
print(f'Found showVoiceSettings on lines: {sorted([l+1 for l in voice_settings_lines])}')

# Find z-[90] within 5 lines of any showVoiceSettings line
modified = False
for i, line in enumerate(lines):
    if 'z-[90]' in line:
        # Check if this line is near a showVoiceSettings line
        for vs_line in voice_settings_lines:
            if abs(i - vs_line) <= 5:
                print(f'\nFound target at line {i+1} (near showVoiceSettings at line {vs_line+1}):')
                print(f'  Before: {line.strip()[:120]}')
                lines[i] = line.replace('z-[90]', 'z-[10000]')
                print(f'  After:  {lines[i].strip()[:120]}')
                modified = True
                break
    if modified:
        break

if modified:
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('\nSUCCESS: Fixed z-index on voice settings backdrop!')
else:
    print('\nERROR: Could not find the target line.')
    # Debug: Show all lines containing z-[90]
    print('\nAll lines containing z-[90]:')
    for i, line in enumerate(lines):
        if 'z-[90]' in line:
            print(f'  Line {i+1}: {line.strip()[:100]}...')
