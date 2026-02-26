#!/usr/bin/env python3
"""
Fix voice settings panel overlap WITHOUT breaking help mode.

Issue: Previous fix set tour-header-settings to z-[10002] which blocked help mode.

Proper Solution:
1. Revert tour-header-settings to z-[60]
2. Change voice settings PANEL (not backdrop) to use position: fixed instead of position: absolute
   This allows it to escape parent stacking context while keeping the parent at lower z-index

The backdrop already uses fixed positioning (z-[10000]), so we need the panel to also be fixed.
"""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes_made = []

# Fix 1: Revert tour-header-settings from z-[10002] back to z-[60]
for i, line in enumerate(lines):
    if 'id="tour-header-settings"' in line and 'z-[10002]' in line:
        lines[i] = line.replace('z-[10002]', 'z-[60]')
        changes_made.append(f'Line {i+1}: Reverted tour-header-settings from z-[10002] to z-[60]')

# Fix 2: Change voice settings panel from absolute to fixed positioning
# Target: The panel div that contains `absolute top-full right-0` and z-[10001]
for i, line in enumerate(lines):
    if 'absolute top-full right-0' in line and 'z-[10001]' in line:
        # Change absolute to fixed and adjust positioning
        # The original: absolute top-full right-0 mt-4 w-64
        # New: fixed top-auto right-auto (will need JS positioning, but for now make it fixed)
        # Actually looking at the structure, we need to make it escape via a portal or fixed
        # Let's try a simpler approach: increase ONLY the voice panel and backdrop z-index 
        # but also move them to be rendered AFTER tour-header-utils in the DOM
        print(f'Found voice panel at line {i+1}: {line.strip()[:100]}')
        # For now, let's just ensure the panel stays above by keeping high z-index
        # The real issue is that the PARENT div containing relative has z-60
        # We can solve this by making the dropdown a FIXED element instead of ABSOLUTE
        
        # Actually, the simplest fix is to just ensure the dropdown panel and backdrop
        # escape stacking context by being truly fixed elements
        # The backdrop is already fixed. Let's check if panel is working correctly.
        break

# Alternative approach: Instead of changing positioning, we can add a CSS rule
# that ensures voice settings appears above header utils during panel open state
# This requires checking if there's a showVoiceSettings wrapper

print('\nAnalysis:')
print('The voice settings panel uses absolute positioning within a z-[60] parent.')
print('The backdrop uses fixed positioning with z-[10000] which DOES work.')
print('The panel uses absolute with z-[10001] which is TRAPPED inside z-[60] parent.')
print('')
print('SOLUTION: Change the panel from absolute to fixed positioning.')

# Now let's actually fix it - change the panel from absolute to fixed
for i, line in enumerate(lines):
    # Target the voice settings panel - it's the div with:
    # className={`absolute top-full right-0 mt-4 w-64 p-5 rounded-xl shadow-2xl border z-[10001]
    if 'absolute top-full right-0' in line and 'z-[10001]' in line:
        # Replace 'absolute top-full right-0' with 'fixed' and we'll need to calculate position
        # Actually, 'absolute top-full right-0' means: below parent, aligned to right
        # For fixed, we need: top position (will be relative to viewport), right: 0 or calculated
        
        # Simpler approach: keep the structure but wrap in a higher z-index context
        # Actually, the cleanest fix is to change the RELATIVE parent to have higher z-index
        # But that's what broke help mode!
        
        # The REAL solution: When showVoiceSettings is true, render the panel 
        # OUTSIDE the header hierarchy entirely (as a portal)
        # But that requires significant refactoring.
        
        # PRACTICAL FIX: Just use CSS !important to force the panel on top when open
        # We can add an inline style with z-index that works
        
        # For now, let's try using fixed positioning with calculated coords
        print(f'\nLine {i+1}: Voice panel div found')
        print('This needs position: fixed to escape parent stacking context')
        break

# Let's implement a simpler fix: just revert the z-index change for now
if changes_made:
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('\n' + '='*60)
    for change in changes_made:
        print(change)
    print('='*60)
    print('\nReverted the z-index change. Need alternative solution for voice panel.')
else:
    print('\nNo z-[10002] found - may have already been reverted or issue is elsewhere.')
