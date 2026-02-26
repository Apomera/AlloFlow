"""
Structural validator: Walk through UI_STRINGS with string-aware brace counting
to verify the section nesting is valid. Report any depth anomalies.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find UI_STRINGS
ui_start = ui_end_approx = None
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line and '{' in line:
        ui_start = i
        break

def structural_braces(line):
    """Count { and } NOT inside string literals."""
    result = ''
    in_str = None
    escape = False
    for ch in line:
        if escape:
            escape = False
            continue
        if ch == '\\':
            escape = True
            continue
        if ch in ('"', "'", '`'):
            if in_str is None:
                in_str = ch
            elif in_str == ch:
                in_str = None
            continue
        if in_str is None:
            result += ch
    return result.count('{'), result.count('}')

# Walk through from ui_start
depth = 0
max_depth = 0
section_path = []

for i in range(ui_start, min(ui_start + 8000, len(lines))):
    line = lines[i]
    s = line.strip()
    if s.startswith('//'):
        continue
    
    opens, closes = structural_braces(line)
    old_depth = depth
    depth += opens - closes
    max_depth = max(max_depth, depth)
    
    # Check for anomalies
    if depth < 0:
        print(f"!! NEGATIVE DEPTH at L{i+1}: depth={depth}, line: {s[:80]}")
    
    # Track section names  
    if opens > 0:
        m = re.match(r'^[\s]*"?(\w+)"?\s*:\s*\{', s)
        if m:
            section_path.append(m.group(1))
    
    if closes > opens and section_path:
        for _ in range(closes - opens):
            if section_path:
                section_path.pop()
    
    if depth == 0 and i > ui_start:
        print(f"UI_STRINGS closes at L{i+1}")
        print(f"Max depth: {max_depth}")
        
        # Check if what follows is valid (not a misplaced key)
        for j in range(i+1, min(i+5, len(lines))):
            next_s = lines[j].strip()
            if next_s and not next_s.startswith('//'):
                if re.match(r'^\w+:\s*[\'"{[]', next_s):
                    print(f"!! MISPLACED KEY after UI_STRINGS close at L{j+1}: {next_s[:80]}")
                break
        break

# Final sanity check: count total braces in the UI_STRINGS block 
total_opens = 0
total_closes = 0
for i in range(ui_start, min(ui_start + 8000, len(lines))):
    o, c = structural_braces(lines[i])
    total_opens += o
    total_closes += c
    if total_opens == total_closes and i > ui_start:
        print(f"\nBrace balance: {total_opens} opens, {total_closes} closes (balanced at L{i+1})")
        break

print("\n=== Done ===")
