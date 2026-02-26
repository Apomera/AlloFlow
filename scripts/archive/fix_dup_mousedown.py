"""Fix duplicate onMouseDown attributes.
The previous script globally replaced onPointerDown with onMouseDown,
but some elements already had onMouseDown, causing duplicates.
Fix: find elements with TWO onMouseDown and remove the stopPropagation one,
keeping the original onMouseDown. Or revert to onPointerDown for those.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
original_len = len(content.split('\n'))

# The problem: elements that had BOTH onPointerDown and onMouseDown
# now have two onMouseDown attributes. For those, change the
# stopPropagation one back to onPointerDown.

# Pattern: "onMouseDown={(e) => e.stopPropagation()} onMouseDown="
# We need to change the FIRST onMouseDown back to onPointerDown
# when it's a duplicate

# Find all lines with duplicate onMouseDown
lines = content.split('\n')
fixed = 0
for i, line in enumerate(lines):
    count = line.count('onMouseDown=')
    if count >= 2:
        # This line has duplicate onMouseDown - change the first 
        # stopPropagation one back to onPointerDown
        lines[i] = line.replace(
            'onMouseDown={(e) => e.stopPropagation()} onMouseDown=',
            'onPointerDown={(e) => e.stopPropagation()} onMouseDown=',
            1  # only first occurrence
        )
        if lines[i] != line:
            fixed += 1
            print(f"[OK] Fixed duplicate onMouseDown at L{i+1}")

content = '\n'.join(lines)
new_len = len(content.split('\n'))
print(f"\nLine count: {original_len} -> {new_len} (diff: {new_len - original_len:+d})")
open(filepath, 'w', encoding='utf-8').write(content)
print(f"Done! {fixed} duplicate(s) fixed.")
