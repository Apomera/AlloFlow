"""
Find the exact line where the extra { appears.
Walk through UI_STRINGS with JS-accurate tokenizer and report 
depth at every section boundary (depth==1 transitions).
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find UI_STRINGS start line
ui_start = None
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line and '{' in line:
        ui_start = i
        break

print(f"UI_STRINGS starts at L{ui_start+1}")

def js_brace_count(line_text):
    """Count structural { and } in a line, skipping string contents and comments."""
    opens = 0
    closes = 0
    i = 0
    in_single = False
    in_double = False
    in_template = False
    
    while i < len(line_text):
        ch = line_text[i]
        
        # Handle escape sequences inside strings
        if (in_single or in_double or in_template) and ch == '\\':
            i += 2
            continue
        
        # Toggle string states
        if ch == "'" and not in_double and not in_template:
            in_single = not in_single
            i += 1
            continue
        if ch == '"' and not in_single and not in_template:
            in_double = not in_double
            i += 1
            continue
        if ch == '`' and not in_single and not in_double:
            in_template = not in_template
            i += 1
            continue
        
        # Inside a string - skip everything
        if in_single or in_double or in_template:
            i += 1
            continue
        
        # Line comment - skip rest
        if ch == '/' and i + 1 < len(line_text) and line_text[i+1] == '/':
            break
        
        if ch == '{':
            opens += 1
        elif ch == '}':
            closes += 1
        
        i += 1
    
    return opens, closes

# Walk through and track depth
depth = 0
for i in range(ui_start, min(ui_start + 8000, len(lines))):
    line = lines[i]
    opens, closes = js_brace_count(line)
    old_depth = depth
    depth += opens - closes
    
    # Report key transitions
    if opens > 0 or closes > 0:
        s = line.strip()[:80]
        if old_depth <= 1 or depth <= 1 or abs(opens - closes) > 0:
            # Only report section-level transitions
            if old_depth <= 2 and opens > 0:
                print(f"L{i+1} [{old_depth}->{depth}] +{opens}/-{closes}: {s}")
            elif depth <= 2 and closes > 0:
                print(f"L{i+1} [{old_depth}->{depth}] +{opens}/-{closes}: {s}")
    
    if depth == 0 and i > ui_start:
        print(f"\n>>> DEPTH REACHES 0 at L{i+1}")
        break
    
    if depth < 0:
        print(f"!! NEGATIVE DEPTH at L{i+1}")
        break

# If we didn't reach 0, report
if depth > 0:
    print(f"\n!! Still at depth {depth} after scanning")
