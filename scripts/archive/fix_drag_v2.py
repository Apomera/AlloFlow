"""Fix user label drag by moving mousedown to outer div,
and change № to Step for the panel badge.
Uses exact line content matching to avoid Unicode issues.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
fixed = 0

# ============================================================
# FIX 1: Rework user label drag
# Move onMouseDown from the ⠿ span to the outer div
# Add stopPropagation on text and delete to prevent drag when clicking those
# ============================================================

# Step 1a: Add onMouseDown to the outer div (L1797, after aria-label line)
for i, line in enumerate(lines):
    if i >= 1795 and i <= 1800 and 'role="note" tabIndex={0} aria-label={uLabel.text}' in line:
        # Replace this line to add onMouseDown handler
        lines[i] = line.replace(
            'role="note" tabIndex={0} aria-label={uLabel.text}',
            '''role="note" tabIndex={0} aria-label={uLabel.text}
                                    onMouseDown={(e) => { if (e.target.tagName === 'INPUT') return; e.preventDefault(); e.stopPropagation(); const rect = e.currentTarget.parentElement.getBoundingClientRect(); setDraggingLabel({ panelIdx, labelId: uLabel.id, offsetX: e.clientX, offsetY: e.clientY, rect }); }}'''
        )
        fixed += 1
        print(f"[OK] Added onMouseDown to user label outer div at L{i+1}")
        break

# Step 1b: Add cursor:grab to the outer div style and userSelect:none
for i, line in enumerate(lines):
    if i >= 1795 and i <= 1800 and "borderColor: '#8b5cf6'" in line and "cursor:" not in line:
        lines[i] = line.replace(
            "color: '#1e1b4b' }}",
            "color: '#1e1b4b', cursor: draggingLabel ? 'grabbing' : 'grab', userSelect: 'none' }}"
        )
        fixed += 1
        print(f"[OK] Added cursor:grab to user label outer div at L{i+1}")
        break

# Step 1c: Remove onMouseDown from the ⠿ span (just keep it as a visual indicator)
for i, line in enumerate(lines):
    if i >= 1798 and i <= 1810 and 'handleLabelDragStart' in line:
        lines[i] = line.replace(
            "onMouseDown={(e) => handleLabelDragStart(panelIdx, uLabel.id, e)}",
            ""
        )
        fixed += 1
        print(f"[OK] Removed old onMouseDown from ⠿ span at L{i+1}")
        break

# Step 1d: Add onMouseDown stopPropagation to text span and input
for i, line in enumerate(lines):
    if i >= 1812 and i <= 1820 and "onClick={() => setEditingLabel" in line and "onMouseDown" not in line:
        lines[i] = line.replace(
            "onClick={() => setEditingLabel",
            "onMouseDown={(e) => e.stopPropagation()} onClick={() => setEditingLabel"
        )
        fixed += 1
        print(f"[OK] Added stopPropagation to text span at L{i+1}")
        break

# Step 1e: Add stopPropagation to delete button mousedown
for i, line in enumerate(lines):
    if i >= 1818 and i <= 1825 and "handleDeleteUserLabel" in line and "onMouseDown" not in line and "onClick" in line:
        lines[i] = line.replace(
            "onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel",
            "onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel"
        )
        fixed += 1
        print(f"[OK] Added stopPropagation to delete button at L{i+1}")
        break

# ============================================================
# FIX 2: Change № to Step for the panel badge
# ============================================================
for i, line in enumerate(lines):
    if "panel.role === 'step' ?" in line and '№' in line:
        lines[i] = line.replace("№ ${panelIdx + 1}", "Step ${panelIdx + 1}")
        fixed += 1
        print(f"[OK] Changed '№' to 'Step' in panel badge at L{i+1}")
        break

open(filepath, 'w', encoding='utf-8').writelines(lines)
print(f"\nDone! {fixed} fixes applied.")
