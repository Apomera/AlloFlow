"""Final verification: check dispatchEscape call integrity and sample output"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_final_escape_verify.txt', 'w', encoding='utf-8')
out.write(f"Total lines: {len(lines)}\n\n")

# 1. Count remaining old setters (should all be 0)
old = lines_str = ''.join(lines)
out.write(f"setEscapeRoomState remaining: {old.count('setEscapeRoomState')}\n")
out.write(f"setEscapeTimeLeft remaining: {old.count('setEscapeTimeLeft')}\n")
out.write(f"setIsEscapeTimerRunning remaining: {old.count('setIsEscapeTimerRunning')}\n\n")

# 2. Count dispatchEscape by type
dispatch_lines = []
for i, line in enumerate(lines):
    if 'dispatchEscape' in line:
        dispatch_lines.append((i+1, line.strip()[:180]))

out.write(f"Total dispatchEscape calls: {len(dispatch_lines)}\n\n")

# 3. Show all dispatchEscape calls with their type
types = {}
for ln, text in dispatch_lines:
    m = re.search(r"type:\s*'(\w+)'", text)
    t = m.group(1) if m else 'UNKNOWN'
    types[t] = types.get(t, 0) + 1
    
for t, c in sorted(types.items()):
    out.write(f"  type='{t}': {c} calls\n")

# 4. Show a sample of FUNC_UPDATE calls to verify closure
out.write(f"\n=== FUNC_UPDATE SAMPLES ===\n")
for i, line in enumerate(lines):
    if "'FUNC_UPDATE'" in line:
        for j in range(i, min(i+8, len(lines))):
            out.write(f"  L{j+1}: {lines[j].rstrip()[:180]}\n")
        out.write("  ---\n")

# 5. Show some UPDATE samples 
out.write(f"\n=== UPDATE SAMPLES (first 5) ===\n")
count = 0
for i, line in enumerate(lines):
    if "'UPDATE'" in line and 'dispatchEscape' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")
        count += 1
        if count >= 5:
            break

out.close()
print("Done -> _final_escape_verify.txt")
