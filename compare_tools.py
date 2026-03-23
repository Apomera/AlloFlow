"""
Extract tool sections from the old commit e93a33d and compare 
with current HEAD to identify what needs restoring.
"""
import subprocess
import sys

# Get the old file content from git
result = subprocess.run(
    ['git', 'show', 'e93a33d:stem_lab_module.js'],
    capture_output=True, text=True, encoding='utf-8'
)
if result.returncode != 0:
    print("ERROR getting old file:", result.stderr[:500])
    sys.exit(1)

old_lines = result.stdout.split('\n')
print(f"Old file lines: {len(old_lines)}")

# Read current file
with open('stem_lab_module.js', 'r', encoding='utf-8') as f:
    new_lines = f.readlines()
new_lines = [l.rstrip('\r\n') for l in new_lines]
print(f"Current file lines: {len(new_lines)}")

# Tools we need to find
tools = {
    'physics': 'physics',
    'titrationLab': 'titrationLab',
    'dissection': 'dissection',
    'brainAtlas': 'brainAtlas',
    'artStudio': 'artStudio',
    'spaceColony': 'spaceColony'
}

def find_tool_bounds(lines, tool_id):
    """Find start and end of a tool section"""
    start = None
    for i, line in enumerate(lines):
        if f"stemLabTool === '{tool_id}'" in line and ('&&' in line):
            start = i
            break
    if start is None:
        return None, None
    
    # Find the end by looking for the next tool section or closing pattern
    # We look for the })(), pattern which closes each IIFE tool
    depth = 0
    in_tool = False
    for i in range(start, len(lines)):
        line = lines[i]
        # Count parens as a rough guide
        if '(() =>' in line or '(function' in line:
            in_tool = True
        # Look for the IIFE closing pattern at a similar indent
        if i > start + 5 and ('})(),' in line.strip() or '})()' in line.strip()):
            # Check if this is the right depth - look ahead for next tool
            for j in range(i+1, min(i+5, len(lines))):
                next_line = lines[j].strip()
                if next_line and (
                    "stemLabTool ===" in next_line or 
                    "stemLabTab ===" in next_line or
                    next_line.startswith("// ═══")
                ):
                    return start, i
    # If we didn't find a clean end, return start, None
    return start, None

for name, tool_id in tools.items():
    old_start, old_end = find_tool_bounds(old_lines, tool_id)
    new_start, new_end = find_tool_bounds(new_lines, tool_id)
    
    old_len = (old_end - old_start + 1) if (old_start is not None and old_end is not None) else 'N/A'
    new_len = (new_end - new_start + 1) if (new_start is not None and new_end is not None) else 'N/A'
    
    print(f"\n{name}:")
    print(f"  Old: start={old_start}, end={old_end}, lines={old_len}")
    print(f"  New: start={new_start}, end={new_end}, lines={new_len}")
    if isinstance(old_len, int) and isinstance(new_len, int):
        print(f"  Diff: {old_len - new_len} lines lost")
