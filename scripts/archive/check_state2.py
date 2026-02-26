"""Full state audit of reverted file."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
c = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
lines = c.split('\n')
print(f'Total lines: {len(lines)}')

# Find drag-related code
print('\n--- Drag/Label Handler Definitions (L1400-1600) ---')
for i in range(1400, min(1600, len(lines))):
    line = lines[i].rstrip()
    if any(k in line for k in ['draggingLabel', 'handleLabelDrag', 'handleLabelPointer', 'handleLabelMouse', 'setPointerCapture', 'Pointer-capture', 'Document-level drag']):
        print(f'L{i+1}: {line[:150]}')

# Find user label JSX
print('\n--- User Label JSX ---')
for i in range(1750, min(1850, len(lines))):
    line = lines[i].rstrip()
    if any(k in line for k in ['User-Created', 'userLabels', 'uLabel', 'handleDelete', 'onMouseDown', 'onPointerDown', 'handleLabelDragStart']):
        print(f'L{i+1}: {line[:150]}')

# Find step badge
print('\n--- Step Badge ---')
for i in range(1730, min(1770, len(lines))):
    line = lines[i].rstrip()
    if 'panel-role' in line or 'Step ' in line or 'panel.role' in line:
        print(f'L{i+1}: {line[:150]}')

# Find caption
print('\n--- Caption ---')
for i in range(1800, min(1850, len(lines))):
    line = lines[i].rstrip()
    if 'caption' in line.lower() or 'figcaption' in line:
        print(f'L{i+1}: {line[:150]}')

# Find label CSS
print('\n--- Label/Panel CSS ---')
for i in range(25200, min(25400, len(lines))):
    line = lines[i].rstrip()
    if any(k in line for k in ['visual-panel-role', 'visual-caption', 'visual-label', 'label-delete']):
        print(f'L{i+1}: {line[:150]}')
