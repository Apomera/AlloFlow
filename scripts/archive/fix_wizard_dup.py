"""
Fix: Remove duplicate ? button and duplicate help panel from the wizard.
The injection script added each twice.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

original_count = len(lines)
print(f"Starting: {original_count} lines")

# Find the duplicate ? button (second occurrence at L27823-27830)
# L27815-27822 is the first (good) copy
# L27823-27830 is the duplicate (remove it)

dup_btn_start = None
seen_first = False
for i, l in enumerate(lines):
    if 'setShowWizardHelp(h =>' in l and 'onClick' in l:
        if not seen_first:
            seen_first = True
            print(f"  First ? button at L{i+1}")
        else:
            dup_btn_start = i
            print(f"  Duplicate ? button starts at L{i+1}")
            break

# The duplicate button is 8 lines (same as the first)
if dup_btn_start:
    # Find entire <button>...</button> block
    # Go back to the <button line before it
    btn_start = dup_btn_start - 1  # <button 
    btn_end = dup_btn_start + 6  # </button>
    print(f"  Removing duplicate button L{btn_start+1}-L{btn_end+1}")
    del lines[btn_start:btn_end + 1]
    print(f"  Removed {btn_end - btn_start + 1} lines")

# Now find the duplicate help panel (second showWizardHelp && wizardStepHelp)
seen_first_panel = False
dup_panel_start = None
for i, l in enumerate(lines):
    if 'showWizardHelp && wizardStepHelp[step]' in l:
        if not seen_first_panel:
            seen_first_panel = True
            print(f"  First help panel at L{i+1}")
        else:
            dup_panel_start = i
            print(f"  Duplicate help panel starts at L{i+1}")
            break

if dup_panel_start:
    # The help panel is 12 lines: from {showWizardHelp... to )}
    panel_end = dup_panel_start + 11
    # Verify the end line
    if ')}' in lines[panel_end].strip():
        print(f"  Removing duplicate panel L{dup_panel_start+1}-L{panel_end+1}")
        del lines[dup_panel_start:panel_end + 1]
        print(f"  Removed {panel_end - dup_panel_start + 1} lines")
    else:
        print(f"  !! Panel end line doesn't match expected. L{panel_end+1}: {lines[panel_end].strip()}")

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

final_count = len(lines)
print(f"\nFinal: {final_count} lines (removed {original_count - final_count})")
