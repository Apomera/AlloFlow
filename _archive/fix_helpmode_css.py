#!/usr/bin/env python3
"""
Fix help mode CSS to include tour-header-settings buttons and ensure AlloBot visibility.
"""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 32796: .help-mode-active #tour-header-utils button {
# Line 32800: closing brace }
# We need to find line 32800 and insert new CSS rules after it

# Find the exact line
target_found = False
for i in range(32794, 32802):  # Check around the known location
    if i < len(lines) and '#tour-header-utils button' in lines[i]:
        print(f'Found selector at line {i+1}: {lines[i].strip()[:60]}')
        # Find the closing brace
        for j in range(i, min(i+10, len(lines))):
            if '}' in lines[j] and '{' not in lines[j]:
                print(f'Found closing brace at line {j+1}')
                
                # Insert new CSS rules after the closing brace
                new_css_rules = '''        
        /* FIX: Header Settings Interactivity (voice, text, etc) */
        .help-mode-active #tour-header-settings button,
        .help-mode-active #tour-header-settings select,
        .help-mode-active #tour-header-settings [data-help-key] {
            pointer-events: auto !important;
            cursor: pointer !important;
            z-index: 200 !important;
        }
        
        /* FIX: Ensure AlloBot stays visible and interactive in Help Mode */
        .help-mode-active [data-help-key="bot_avatar"] {
            z-index: 10001 !important; /* Above any backdrops */
            pointer-events: auto !important;
        }
        
        /* FIX: AlloBot buttons also need interactivity */
        .help-mode-active [data-help-key="bot_avatar"] button {
            pointer-events: auto !important;
            cursor: pointer !important;
        }
'''
                lines.insert(j + 1, new_css_rules)
                target_found = True
                break
        if target_found:
            break

if target_found:
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('\n' + '='*60)
    print('SUCCESS: Added CSS fixes for:')
    print('  - #tour-header-settings buttons/selects with data-help-key')
    print('  - AlloBot visibility z-index 10001 (above backdrops)')
    print('  - AlloBot buttons interactivity')
    print('='*60)
else:
    print('Target not found at expected location.')
