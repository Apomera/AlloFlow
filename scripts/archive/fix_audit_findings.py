"""
Fix actionable items from the bug/perf audit:
1. Remove 3 fully dead state vars (both getter and setter unused)
2. Clean console.log statements
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

changes = 0

# 1. Remove fully dead state vars
dead_states = [
    'const [dyslexicFont, setDyslexicFont] = useState',
    'const [fontTheme, setFontTheme] = useState',
    'const [pendingFactionResources, setPendingFactionResources] = useState',
]

new_lines = []
for i, line in enumerate(lines):
    removed = False
    for dead in dead_states:
        if dead in line:
            print(f"[1] Removed dead state at L{i+1}: {dead.split('[')[1].split(']')[0]}")
            changes += 1
            removed = True
            break
    if not removed:
        new_lines.append(line)
lines = new_lines

# 2. Remove audio bank console.logs (standalone lines)
standalone_logs = [
    'console.log("Initializing Audio Bank from "',
    'console.log("Audio Bank loaded successfully',
    'console.log("[AudioBank] Caches invalidated',
]

new_lines = []
for i, line in enumerate(lines):
    removed = False
    for log in standalone_logs:
        if log in line and line.strip().startswith('console.log'):
            print(f"[2] Removed console.log at L{i+1}")
            changes += 1
            removed = True
            break
    if not removed:
        new_lines.append(line)
lines = new_lines

# 3. Strip PATCH-VER-02 marker from its line (keep the rest)
new_lines = []
for i, line in enumerate(lines):
    if "console.log('PATCH-VER-02');" in line:
        cleaned = line.replace("console.log('PATCH-VER-02'); ", "")
        new_lines.append(cleaned)
        print(f"[3] Stripped PATCH-VER-02 from L{i+1}")
        changes += 1
    else:
        new_lines.append(line)
lines = new_lines

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\nTotal changes: {changes}")
print("DONE")
