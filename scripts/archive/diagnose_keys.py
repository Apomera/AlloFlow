"""
Diagnose: Find what we actually inserted and where.
Check the adventure section structure to figure out why the keys aren't being found.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Search for our "ORPHAN FIX" markers
print("=== ORPHAN FIX markers ===")
for i, line in enumerate(lines, 1):
    if 'ORPHAN FIX' in line:
        print(f"L{i}: {line.rstrip()}")
        # Show next 5 lines for context
        for j in range(i, min(i+5, len(lines))):
            print(f"  L{j+1}: {lines[j].rstrip()}")
        print()

# Search for our inserted adventure keys
print("\n=== Inserted adventure.* keys ===")
for i, line in enumerate(lines, 1):
    s = line.strip()
    if s.startswith("back_to_resume:") or s.startswith("fallback_opening:") or s.startswith("paused_title:"):
        print(f"L{i}: {line.rstrip()}")
        # Show context: 3 lines before
        for j in range(max(0, i-4), i-1):
            print(f"  ctx L{j+1}: {lines[j].rstrip()}")

# Check what section depth these are at
print("\n=== Adventure section structure ===")
ui_start = None
for i, line in enumerate(lines, 1):
    if 'const UI_STRINGS' in line and '{' in line:
        ui_start = i
        break

# Find adventure section
for i in range(ui_start, min(ui_start + 10000, len(lines))):
    s = lines[i].strip()
    if s.startswith('adventure:') and '{' in s:
        print(f"Adventure section starts at L{i+1}")
        # Show first 5 and look at nesting
        for j in range(i, min(i+20, len(lines))):
            if 'ORPHAN' in lines[j] or 'back_to_resume' in lines[j]:
                # Show surrounding context
                start = max(i, j-3)
                for k in range(start, min(j+5, len(lines))):
                    print(f"  L{k+1}: {lines[k].rstrip()}")
                break
        break
