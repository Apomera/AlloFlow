"""Check current state of visual panel code."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
c = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
lines = c.split('\n')
print(f'Total lines: {len(lines)}')
checks = [
    'handleLabelDragStart',
    'setDraggingLabel',
    'draggingLabel',
    'handleLabelPointerDown',
    'handleLabelMouseDown',
    'setPointerCapture',
    'visual-panel-role',
    'visual-caption',
    'handleAddUserLabel',
    'addingLabelPanel',
    'label-delete-btn',
    'onDoubleClick',
]
for k in checks:
    print(f'  {k}: {"FOUND" if k in c else "missing"}')

# Find the drag handler
for i, line in enumerate(lines):
    if 'handleLabelDragStart' in line or 'draggingLabel' in line:
        if i < 1600:
            print(f'\nL{i+1}: {line.rstrip()[:120]}')
