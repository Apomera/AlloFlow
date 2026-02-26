# -*- coding: utf-8 -*-
"""
Find and remove ALL orphaned duplicate function bodies.
The pattern is: a function ends with }; then immediately the next line
starts with the old body (no function declaration).
"""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# L74527: };
# L74528: if (!cubeDragRef.current) return;  <-- orphaned old body
# L74533: };  <-- old body end

# Find and remove orphaned code between the new handleLabCubeDrag end and handleLabCubeDragEnd
to_delete = []

i = 0
while i < len(lines) - 1:
    stripped = lines[i].strip()
    if stripped == '};' and i > 74000 and i < 75000:
        # Check if next line is orphaned body (starts with if/const/set but no function declaration)
        next_stripped = lines[i+1].strip() if i+1 < len(lines) else ''
        # Orphaned body: starts with code but no const/let/var FUNCNAME = or function keyword
        if next_stripped.startswith('if (!cubeDragRef.current) return;'):
            # Find the end of this orphaned block (next };)
            end = i+1
            for j in range(i+1, min(i+20, len(lines))):
                if lines[j].strip() == '};':
                    end = j
                    break
            to_delete.append((i+1, end))
            print(f"Found orphaned handleLabCubeDrag body: L{i+2}-{end+1}")
            i = end + 1
            continue
        elif next_stripped.startswith('const key = `${x}') and i > 74000:
            end = i+1
            for j in range(i+1, min(i+20, len(lines))):
                if lines[j].strip() == '};':
                    end = j
                    break
            to_delete.append((i+1, end))
            print(f"Found orphaned handlePlaceCube body: L{i+2}-{end+1}")
            i = end + 1
            continue
    i += 1

# Also check for old handleLabCubeDragEnd duplicate
for i, line in enumerate(lines):
    if 'cubeDragRef.current = null;' in line and 'window.removeEventListener' in line and i > 74000:
        # Check if next non-empty line is also a very similar handler
        if i+1 < len(lines):
            next_l = lines[i+1].strip()
            if next_l.startswith('cubeDragRef.current = null') or (next_l == '' and i+2 < len(lines) and lines[i+2].strip().startswith('cubeDragRef.current = null')):
                # This might be a duplicate dragEnd
                pass  # Only flag if we see it

# Delete in reverse order
for start, end in reversed(to_delete):
    print(f"Deleting lines {start+1}-{end+1}")
    del lines[start:end+1]

if to_delete:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Removed {len(to_delete)} orphaned blocks. File saved.")
else:
    print("No orphaned blocks found.")
