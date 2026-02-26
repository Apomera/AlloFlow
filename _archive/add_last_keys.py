"""Add the last 2 missing keys"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# Find UI_STRINGS
ui_start = None
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line:
        ui_start = i
        break

# Find status_steps section
for i in range(ui_start, ui_start + 7000):
    s = lines[i].strip()
    if s.startswith('status_steps:') and '{' in s:
        # Find closing }
        depth = 0
        for j in range(i, i + 100):
            for ch in lines[j]:
                if ch == '{': depth += 1
                elif ch == '}': depth -= 1
            if depth == 0:
                # Get indent from existing keys
                indent = '    '
                for k in range(i+1, j):
                    if lines[k].strip() and ':' in lines[k]:
                        indent = ' ' * (len(lines[k]) - len(lines[k].lstrip()))
                        break
                # Add comma to last line
                for k in range(j-1, i, -1):
                    if lines[k].strip():
                        stripped = lines[k].rstrip('\r\n').rstrip()
                        if stripped.endswith('"') and not stripped.endswith('",'):
                            lines[k] = stripped + ',' + le
                        break
                lines.insert(j, indent + 'brainstorming: "Brainstorming ideas...",' + le)
                print("Added brainstorming to status_steps at L" + str(j+1))
                break
        break

# Find process section
for i in range(ui_start, ui_start + 7000):
    s = lines[i].strip()
    if s.startswith('process:') and '{' in s:
        depth = 0
        for j in range(i, i + 200):
            for ch in lines[j]:
                if ch == '{': depth += 1
                elif ch == '}': depth -= 1
            if depth == 0:
                indent = '    '
                for k in range(i+1, j):
                    if lines[k].strip() and ':' in lines[k]:
                        indent = ' ' * (len(lines[k]) - len(lines[k].lstrip()))
                        break
                for k in range(j-1, i, -1):
                    if lines[k].strip():
                        stripped = lines[k].rstrip('\r\n').rstrip()
                        if stripped.endswith('"') and not stripped.endswith('",'):
                            lines[k] = stripped + ',' + le
                        break
                lines.insert(j, indent + 'grammar_fix_truncation: "Fixing grammar truncation...",' + le)
                print("Added grammar_fix_truncation to process at L" + str(j+1))
                break
        break

f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Done. Lines: " + str(len(lines)))
