"""Fix ALL UPDATE dispatch calls that reference 'prev' — replace with escapeRoomState"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

fixes = 0

# Find lines with UPDATE dispatch that reference prev
# These are cases where prev was part of a functional updater but got converted to UPDATE
for i in range(len(lines)):
    line = lines[i]
    
    # Check if this is inside a FUNC_UPDATE (where prev IS defined) - skip those
    if "'FUNC_UPDATE'" in line:
        continue
    
    # Check for prev.X in UPDATE payload lines
    if 'prev.' in line:
        # Check if we're inside a FUNC_UPDATE block by looking backwards
        in_func_update = False
        for j in range(max(0, i-20), i):
            if "'FUNC_UPDATE'" in lines[j]:
                in_func_update = True
            if in_func_update and ('});' in lines[j] or '}});' in lines[j] or '})});' in lines[j]):
                in_func_update = False
        
        if not in_func_update and 'dispatchEscape' in ''.join(lines[max(0,i-5):i+1]):
            # Replace prev. with escapeRoomState.
            old = lines[i]
            lines[i] = lines[i].replace('prev.', 'escapeRoomState.')
            if lines[i] != old:
                fixes += 1
                print("Fixed L" + str(i+1) + ": " + lines[i].strip()[:180])

print("\nTotal fixes: " + str(fixes))

f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Lines: " + str(len(lines)))
