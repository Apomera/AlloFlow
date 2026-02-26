"""
Remove ALL misplaced localization key artifacts from outside UI_STRINGS.
Scans the entire file for key: 'value', patterns that appear OUTSIDE the
UI_STRINGS block boundaries.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find UI_STRINGS block
ui_start = ui_end = None
bd = 0
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line and '{' in line:
        ui_start = i
        bd = line.count('{') - line.count('}')
        continue
    if ui_start is not None and ui_end is None:
        bd += line.count('{') - line.count('}')
        if bd <= 0:
            ui_end = i
            break

print(f"UI_STRINGS: L{ui_start+1} to L{ui_end+1}")

# Remove any lines OUTSIDE UI_STRINGS that look like injected keys
# Pattern: starts with whitespace + word: 'value', (a localization key pattern)
# but is in a JS code area
injected_key_pattern = re.compile(r"^\s+(\w+):\s*'[^']+',?\s*$")
toolbar_pattern = re.compile(r"^\s+toolbar:\s*\{")

new_lines = []
removed = 0
skip_block = False
skip_depth = 0

for i, line in enumerate(lines):
    # Only filter OUTSIDE UI_STRINGS
    if i >= ui_start and i <= ui_end:
        new_lines.append(line)
        continue
    
    # Skip injected blocks (like toolbar: { ... })
    if skip_block:
        skip_depth += line.count('{') - line.count('}')
        if skip_depth <= 0:
            skip_block = False
        removed += 1
        continue
    
    s = line.strip()
    
    # Check for injected key patterns outside UI_STRINGS
    if injected_key_pattern.match(line) and i > ui_end:
        # This is a key: 'value' line outside UI_STRINGS
        # Verify it's not legitimate JS (e.g., object literals in code)
        # Check surrounding context
        prev_code = lines[i-1].strip() if i > 0 else ''
        next_line = lines[i+1].strip() if i+1 < len(lines) else ''
        
        # If previous line is also a key or is JS code (not a {), it's misplaced
        if (prev_code.startswith('cleaned') or 
            prev_code.endswith(';') or 
            injected_key_pattern.match(lines[i-1]) or
            prev_code.endswith('],') or
            prev_code.endswith('),')):
            print(f"  Removing misplaced key L{i+1}: {s[:60]}")
            removed += 1
            continue
    
    # Check for injected section blocks
    if toolbar_pattern.match(line) and i > ui_end:
        # Check if this is a misplaced block
        print(f"  Removing misplaced block L{i+1}: {s[:60]}")
        skip_block = True
        skip_depth = line.count('{') - line.count('}')
        removed += 1
        continue
    
    new_lines.append(line)

print(f"\nRemoved {removed} misplaced lines/blocks")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Final line count: {len(new_lines)}")
