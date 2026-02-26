"""Remove the 7 duplicate tour-* entries that were accidentally re-added."""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

n = len(lines)

# Find and remove the tour entries block we added
# It should be near the end of HELP_STRINGS, marked by our comment
remove_start = None
remove_end = None
for i in range(32470, min(32500, len(lines))):
    if '// Tour step entries (hyphenated keys)' in lines[i]:
        remove_start = i
        break

if remove_start:
    # Remove the comment + 7 tour entries
    remove_end = remove_start + 7  # comment + 7 entries = 8 lines
    print(f"Removing L{remove_start+1}-L{remove_end+1}")
    for j in range(remove_start, min(remove_end + 1, len(lines))):
        print(f"  {lines[j].strip()[:70]}")
    del lines[remove_start:remove_end + 1]
    
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Removed {n - len(lines)} lines. File: {len(lines)} lines")
else:
    print("Tour comment not found, checking alternative locations...")
    for i in range(32460, min(32500, len(lines))):
        if 'tour-' in lines[i]:
            print(f"  L{i+1}: {lines[i].strip()[:70]}")
