#!/usr/bin/env python3
"""Fix React Hooks violation: move RTI state vars out of rtiGoals initializer."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

print(f"Starting: {len(lines)} lines")

# Find the RTI ENHANCEMENTS block that's inside the rtiGoals initializer
rti_start = None
rti_end = None
for i, l in enumerate(lines):
    if 'RTI ENHANCEMENTS: Tier Overrides' in l:
        rti_start = i
        # Find the end of the block (until we hit a line that's NOT a useState/comment)
        for k in range(i+1, min(i+10, len(lines))):
            if 'useState' not in lines[k] and lines[k].strip() and not lines[k].strip().startswith('//'):
                rti_end = k  # This is the first non-useState line after
                break
        break

if rti_start is None:
    print("ERROR: Could not find RTI ENHANCEMENTS block")
    sys.exit(1)

print(f"RTI block: L{rti_start+1} to L{rti_end}")
print(f"  Lines to move:")
for j in range(rti_start, rti_end):
    print(f"    L{j+1}: {lines[j].rstrip()[:120]}")

# Verify this block is inside rtiGoals initializer
prev_line = lines[rti_start - 1] if rti_start > 0 else ''
print(f"  Previous line: {prev_line.rstrip()[:120]}")
if 'rtiGoals' not in prev_line and 'useState' not in prev_line:
    print("WARNING: The block may not be inside rtiGoals initializer")

# Extract the lines to move
rti_lines = lines[rti_start:rti_end]

# Remove them from current position
del lines[rti_start:rti_end]
print(f"  Removed {len(rti_lines)} lines from position")

# Find the rtiGoals closing line }); 
# After deletion, the rtiGoals line is now at rti_start - 1
# The closing }); should be the try/catch line followed by });
rtigoals_close = None
for i, l in enumerate(lines):
    if 'rtiGoals' in l and 'useState' in l:
        # Find the closing });
        for k in range(i, min(i+8, len(lines))):
            if '});' in lines[k] and ('rti_goals' in lines[k] or 'studentName' in lines[k] or k == i+1 or (lines[k].strip().startswith('});') and '{ [studentName]' not in lines[k])):
                rtigoals_close = k
                break
            # Check for the comment pattern
            if '}); //' in lines[k] and 'studentName' in lines[k]:
                rtigoals_close = k
                break
        break

if rtigoals_close is None:
    # Simpler search: find line after the try/return/catch block
    for i, l in enumerate(lines):
        if 'alloflow_rti_goals' in l:
            for k in range(i, min(i+3, len(lines))):
                if '});' in lines[k]:
                    rtigoals_close = k
                    break
            break

if rtigoals_close is None:
    print("ERROR: Could not find rtiGoals closing });")
    sys.exit(1)

print(f"  rtiGoals closing at L{rtigoals_close+1}: {lines[rtigoals_close].rstrip()[:120]}")

# Insert the RTI lines AFTER the rtiGoals closing
insert_pos = rtigoals_close + 1
for j, rl in enumerate(rti_lines):
    lines.insert(insert_pos + j, rl)
print(f"  Inserted {len(rti_lines)} lines after L{insert_pos}")

with open(FILE, 'w', encoding='utf-8', newline='\r\n') as f:
    for l in lines:
        f.write(l.rstrip('\r\n') + '\n')
print(f"Done: {len(lines)} lines")
