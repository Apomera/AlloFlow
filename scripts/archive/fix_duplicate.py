"""Fix: Remove duplicate _isCanvasEnv block (first occurrence at L1070-1081)"""

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find both occurrences of _isCanvasEnv
occurrences = []
for i, line in enumerate(lines):
    if 'const _isCanvasEnv' in line:
        occurrences.append(i)

print(f"Found _isCanvasEnv at lines: {[o+1 for o in occurrences]}")

if len(occurrences) != 2:
    print(f"Expected 2 occurrences, found {len(occurrences)}. Aborting.")
    exit(1)

# Remove the first occurrence (L1070-1081 = the comment + IIFE + blank line after)
# Find the comment line before first occurrence
first_start = occurrences[0]

# Go back to find the comment line
comment_start = first_start
if first_start > 0 and 'Module-scope Canvas detection' in lines[first_start - 1]:
    comment_start = first_start - 1
# Also include the blank line before the comment if present
if comment_start > 0 and lines[comment_start - 1].strip() == '':
    comment_start = comment_start - 1

# Find the end (})(); followed by blank line)
first_end = first_start
for i in range(first_start, first_start + 15):
    if lines[i].strip() == '})();':
        first_end = i
        break

# Include trailing blank line
if first_end + 1 < len(lines) and lines[first_end + 1].strip() == '':
    first_end += 1

print(f"\nRemoving lines {comment_start+1} to {first_end+1}:")
for j in range(comment_start, first_end + 1):
    print(f"  {j+1}: {lines[j].rstrip()}")

# Remove the lines
del lines[comment_start:first_end + 1]

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\nSUCCESS: Removed duplicate _isCanvasEnv block ({first_end - comment_start + 1} lines)")

# Verify only one remains
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
count = content.count('const _isCanvasEnv')
print(f"Verification: {count} occurrence(s) of _isCanvasEnv remain")
