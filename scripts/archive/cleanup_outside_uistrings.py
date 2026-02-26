"""
Final cleanup: Remove misplaced injection blocks that are OUTSIDE UI_STRINGS.
Only remove complete blocks (cancel: { ... } and chat_guide: { ... }) 
that appear after the UI_STRINGS closing line.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find UI_STRINGS end
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

# Remove misplaced blocks AFTER UI_STRINGS
new_lines = []
i = 0
removed = 0
while i < len(lines):
    if i > ui_end:
        s = lines[i].strip()
        # Check for misplaced section blocks: section_name: { ... },
        if re.match(r'^(cancel|chat_guide|toolbar|about|adventure|common|bingo):\s*\{', s):
            print(f"  Removing misplaced block at L{i+1}: {s[:60]}")
            depth = s.count('{') - s.count('}')
            removed += 1
            i += 1
            while i < len(lines) and depth > 0:
                depth += lines[i].count('{') - lines[i].count('}')
                removed += 1
                i += 1
            # Skip the closing }, line too
            if i < len(lines) and lines[i].strip() in ('},', '}'):
                removed += 1
                i += 1
            continue
        # Check for flat misplaced keys: key: 'value',
        if re.match(r'^(cancel|features_list|back_to_resume|paused_title|paused_desc|system_state|system_simulation):\s*[\'"]', s):
            print(f"  Removing misplaced flat key at L{i+1}: {s[:60]}")
            removed += 1
            i += 1
            continue
    
    new_lines.append(lines[i])
    i += 1

print(f"\nRemoved {removed} misplaced lines/blocks")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Final line count: {len(new_lines)}")
