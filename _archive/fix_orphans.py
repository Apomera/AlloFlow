"""
COMPREHENSIVE: Find ALL lines that are between a closing } and }  or }, 
that look like injected keys (key: "value",) but are orphaned AFTER a nested section close.
Fix by moving them BEFORE the nested section close, or detect and remove+re-add properly.
"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# Find UI_STRINGS block
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

print("UI_STRINGS: L" + str(ui_start+1) + " to L" + str(ui_end+1))

# Scan for orphaned keys: lines that look like "    key: "value"," but appear
# right after a closing } line (which means they're outside the section)
orphans = []
for i in range(ui_start, ui_end):
    line = lines[i].strip()
    # Check if this is a key-value line
    key_val = re.match(r'^(\w+|"[^"]+"):\s*"[^"]*",?\s*$', line)
    if not key_val:
        continue
    
    # Check if the previous non-blank line is a closing }
    for j in range(i-1, max(ui_start, i-3), -1):
        prev = lines[j].strip()
        if prev == '' :
            continue
        if prev in ('}', '},'):
            orphans.append(i)
            print("ORPHAN at L" + str(i+1) + ": " + line[:100] + "  (after } at L" + str(j+1) + ")")
        break

# Fix orphans by moving them before the closing }
# Process in REVERSE order to avoid index shifting
fixes = 0
for idx in reversed(orphans):
    orphan_line = lines[idx]
    
    # Find the closing } before this orphan
    for j in range(idx-1, max(ui_start, idx-3), -1):
        if lines[j].strip() in ('}', '},'):
            # Check if the line before } needs a trailing comma
            for k in range(j-1, max(ui_start, j-3), -1):
                if lines[k].strip():
                    stripped = lines[k].rstrip('\r\n').rstrip()
                    if stripped.endswith('"') and not stripped.endswith('",'):
                        lines[k] = stripped + ',' + le
                        print("  Added comma at L" + str(k+1))
                    break
            
            # Move the orphan line before the closing }
            del lines[idx]
            lines.insert(j, orphan_line)
            fixes += 1
            print("  Moved L" + str(idx+1) + " before L" + str(j+1))
            break

print("\nTotal orphans fixed: " + str(fixes))
f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Lines: " + str(len(lines)))
