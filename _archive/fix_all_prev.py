"""
COMPREHENSIVE: Find ALL 'prev.' or '...prev' references that are NOT inside 
FUNC_UPDATE blocks (where prev IS a valid parameter).

Strategy:
1. Find all FUNC_UPDATE dispatch blocks and mark their line ranges
2. Find all lines with 'prev.' or '...prev' outside those ranges
3. Replace prev. with escapeRoomState. and ...prev with ...escapeRoomState
"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

# 1. Find all FUNC_UPDATE block ranges
func_update_ranges = []
i = 0
while i < len(lines):
    if "'FUNC_UPDATE'" in lines[i] and 'dispatchEscape' in lines[i]:
        start = i
        depth = 0
        for j in range(i, min(i + 60, len(lines))):
            for ch in lines[j]:
                if ch == '{': depth += 1
                elif ch == '}': depth -= 1
            if depth <= 0 and j > i:
                func_update_ranges.append((start, j))
                i = j + 1
                break
        else:
            i += 1
    else:
        i += 1

print("FUNC_UPDATE ranges: " + str(len(func_update_ranges)))
for s, e in func_update_ranges:
    print("  L" + str(s+1) + "-L" + str(e+1))

# Also mark the escapeReducer function itself as a safe zone
for i, line in enumerate(lines):
    if 'function escapeReducer' in line:
        for j in range(i, min(i + 30, len(lines))):
            if lines[j].strip() == '}':
                func_update_ranges.append((i, j))
                break
        break

# 2. Find ALL 'prev' references outside those ranges
def in_safe_range(line_idx):
    for s, e in func_update_ranges:
        if s <= line_idx <= e:
            return True
    return False

fixes = 0
all_prev_lines = []

for i, line in enumerate(lines):
    if 'prev' not in line:
        continue
    if in_safe_range(i):
        continue
    
    # Check if this line has prev. or ...prev in a dispatch context
    if 'prev.' in line or '...prev' in line:
        # Check context: is this inside a dispatchEscape call or near one?
        has_dispatch_context = False
        for j in range(max(0, i-30), i+1):
            if 'dispatchEscape' in lines[j]:
                has_dispatch_context = True
                break
        
        if has_dispatch_context:
            old = lines[i]
            lines[i] = lines[i].replace('...prev,', '...escapeRoomState,')
            lines[i] = lines[i].replace('...prev}', '...escapeRoomState}')
            lines[i] = lines[i].replace('prev.', 'escapeRoomState.')
            if lines[i] != old:
                fixes += 1
                all_prev_lines.append("L" + str(i+1) + ": " + lines[i].strip()[:180])

print("\nFixed " + str(fixes) + " lines with prev references:")
for l in all_prev_lines:
    print("  " + l)

f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("\nDone. Lines: " + str(len(lines)))
