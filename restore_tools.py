"""
Restore 6 truncated tools from git commit 46ecdf2 (the last commit before the
modularization split 5db0275 that caused the truncation).

This commit includes ALL post-e93a33d improvements like:
- Titration Lab Phase 2 (71b5e30)
- DissectionLab sysColors fix (552d012)

Strategy: For each tool, extract the full version from 46ecdf2,
find the truncated version in current HEAD, and replace it.
Process in REVERSE line order (bottom to top) so line numbers stay stable.
"""
import subprocess
import sys

# Get the old file content from commit 46ecdf2
result = subprocess.run(
    ['git', 'show', '46ecdf2:stem_lab_module.js'],
    capture_output=True, text=True, encoding='utf-8'
)
if result.returncode != 0:
    print("ERROR getting old file:", result.stderr[:500])
    sys.exit(1)

old_lines = result.stdout.split('\n')
print(f"Source commit (46ecdf2) file lines: {len(old_lines)}")

# Read current file
with open('stem_lab_module.js', 'r', encoding='utf-8') as f:
    current_content = f.read()

# Detect line ending style
if '\r\n' in current_content[:10000]:
    line_sep = '\r\n'
    current_lines = current_content.split('\r\n')
else:
    line_sep = '\n'
    current_lines = current_content.split('\n')

print(f"Current file lines: {len(current_lines)}")

def find_tool_section(lines, tool_id):
    """Find the exact start and end (0-based) for a tool's IIFE section."""
    start = None
    for i, line in enumerate(lines):
        if f"stemLabTool === '{tool_id}'" in line and '&&' in line:
            # Handle wrapped IIFEs like (function _xxxTool() { ... })()
            if i > 0 and ('(function' in lines[i-1] or '_funcGrapherTool' in lines[i-1]):
                start = i - 1
            else:
                start = i
            break
    
    if start is None:
        return None, None
    
    # Track parens and braces to find the end of the IIFE
    paren_depth = 0
    brace_depth = 0
    
    for i in range(start, len(lines)):
        line = lines[i]
        # Skip string literals (very rough, but good enough for this)
        in_string = False
        prev_ch = ''
        for ch in line:
            if ch in ('"', "'") and prev_ch != '\\':
                in_string = not in_string
            if not in_string:
                if ch == '(':
                    paren_depth += 1
                elif ch == ')':
                    paren_depth -= 1
                elif ch == '{':
                    brace_depth += 1
                elif ch == '}':
                    brace_depth -= 1
            prev_ch = ch
        
        # Check if we've closed the IIFE
        # The pattern is: ... })(), or ... })()
        stripped = line.strip()
        if i > start + 3 and paren_depth <= 0:
            return start, i
    
    return start, None

# Tool definitions in reverse order of current line position (bottom to top for safe replacement)
tools_to_restore = [
    'spaceColony',
    'artStudio', 
    'brainAtlas',
    'dissection',
    'titrationLab',
    'physics',
]

# Collect info first
print("\n=== ANALYZING TOOL SECTIONS ===")
restore_ops = []
for tool_id in tools_to_restore:
    old_start, old_end = find_tool_section(old_lines, tool_id)
    new_start, new_end = find_tool_section(current_lines, tool_id)
    
    if old_start is None or old_end is None:
        print(f"WARNING: Could not find complete '{tool_id}' in OLD commit! (start={old_start}, end={old_end})")
        continue
    if new_start is None or new_end is None:
        print(f"WARNING: Could not find complete '{tool_id}' in CURRENT file! (start={new_start}, end={new_end})")
        continue
    
    old_section = old_lines[old_start:old_end+1]
    cur_section = current_lines[new_start:new_end+1]
    
    # Verify first lines match (roughly)
    old_first = old_lines[old_start].strip()[:60]
    cur_first = current_lines[new_start].strip()[:60]
    match = "MATCH" if old_first == cur_first else "DIFFER"
    
    print(f"\n{tool_id}:")
    print(f"  Old: [{old_start}:{old_end}] = {len(old_section)} lines")
    print(f"  Cur: [{new_start}:{new_end}] = {len(cur_section)} lines")
    print(f"  Delta: +{len(old_section) - len(cur_section)} lines to restore")
    print(f"  First line: {match}")
    if match == "DIFFER":
        print(f"    Old: {old_first}")
        print(f"    Cur: {cur_first}")
    
    restore_ops.append({
        'tool_id': tool_id,
        'new_start': new_start,
        'new_end': new_end,
        'old_section': old_section,
        'delta': len(old_section) - len(cur_section),
    })

# Sort by new_start descending (bottom to top)
restore_ops.sort(key=lambda x: x['new_start'], reverse=True)

# Perform replacements
print("\n=== PERFORMING REPLACEMENTS (bottom to top) ===")
total_added = 0
for op in restore_ops:
    tool_id = op['tool_id']
    ns = op['new_start']
    ne = op['new_end']
    old_section = op['old_section']
    cur_len = ne - ns + 1
    
    print(f"  {tool_id}: replacing lines {ns}-{ne} ({cur_len} lines) with {len(old_section)} lines (+{op['delta']})")
    current_lines[ns:ne+1] = old_section
    total_added += op['delta']

print(f"\nTotal lines added: {total_added}")
print(f"Expected file size: {len(current_lines)} lines")

# Write back
with open('stem_lab_module.js', 'w', encoding='utf-8', newline='') as f:
    f.write(line_sep.join(current_lines))

# Verify
with open('stem_lab_module.js', 'r', encoding='utf-8') as f:
    verify_lines = f.readlines()
print(f"Verification: file has {len(verify_lines)} lines")
print("\nDone!")
