"""
Find ALL structural issues in UI_STRINGS by tracking brace depth.
A key-value line should never appear immediately after a closing } at a deeper nesting level.
Output exact line numbers and fixes needed.
"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# Find UI_STRINGS
ui_start = None
ui_end = None
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line:
        ui_start = i
        depth = 0
        for j in range(i, min(i + 10000, len(lines))):
            for ch in lines[j]:
                if ch == '{': depth += 1
                elif ch == '}': depth -= 1
            if depth == 0 and j > i:
                ui_end = j
                break
        break

# Track depth and find issues
depth = 0
issues = []
for i in range(ui_start, ui_end + 1):
    line = lines[i]
    stripped = line.strip()
    
    # Track depth change for this line
    line_open = line.count('{')
    line_close = line.count('}')
    
    # Check: if previous line closed a section (depth decreased), and this line is a key:value
    # at a depth that doesn't match, we have an orphan
    if i > ui_start:
        prev_stripped = lines[i-1].strip()
        if prev_stripped in ('}', '},') and stripped and ':' in stripped and not stripped.startswith('//'):
            # This key-value line follows a closing brace
            # Check if the key's indent suggests it should be INSIDE the section that just closed
            key_indent = len(line) - len(line.lstrip())
            close_indent = len(lines[i-1]) - len(lines[i-1].lstrip())
            
            # If key indent > close indent, it's inside but section is closed -> orphan!
            if key_indent > close_indent:
                issues.append({
                    'line': i,
                    'key_indent': key_indent,
                    'close_indent': close_indent,
                    'content': stripped[:100]
                })
    
    depth += line_open - line_close

out = open('_structure_issues.txt', 'w')
out.write("Issues found: " + str(len(issues)) + "\n\n")
for issue in issues:
    out.write("L" + str(issue['line']+1) + " (indent " + str(issue['key_indent']) + " > close indent " + str(issue['close_indent']) + "): " + issue['content'] + "\n")
    # Show context
    for j in range(max(ui_start, issue['line']-2), min(ui_end, issue['line']+2)):
        out.write("  L" + str(j+1) + ": " + lines[j].rstrip()[:150] + "\n")
    out.write("\n")
out.close()

print("Issues: " + str(len(issues)))
print("See _structure_issues.txt")
