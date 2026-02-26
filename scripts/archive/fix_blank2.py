"""Remove blank lines from the drag handler block."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
start = None
end = None
for i, line in enumerate(lines):
    if 'Document-level drag system' in line:
        start = i
    if start is not None and i > start and 'handlePanelDragStart' in line:
        end = i
        break
if start is not None and end is not None:
    block = lines[start:end]
    cleaned = [l for l in block if l.strip()]
    lines[start:end] = cleaned
    open(filepath, 'w', encoding='utf-8').writelines(lines)
    print(f'[OK] Compacted drag block: {len(block)} -> {len(cleaned)} lines')
else:
    print(f'[ERROR] start={start} end={end}')
