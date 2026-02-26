"""Verify escape room useReducer migration"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_escape_verify.txt', 'w', encoding='utf-8')
out.write(f"Total lines: {len(lines)}\n\n")

# 1. Check that useReducer is declared
out.write("=== 1. useReducer DECLARATION ===\n")
for i, line in enumerate(lines):
    if 'useReducer' in line and 'escape' in line.lower():
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")

# 2. Check reducer function exists
out.write("\n=== 2. escapeReducer FUNCTION ===\n")
for i, line in enumerate(lines):
    if 'function escapeReducer' in line:
        for j in range(i, min(i+20, len(lines))):
            out.write(f"  L{j+1}: {lines[j].rstrip()[:160]}\n")
        break

# 3. Check for ANY remaining setEscapeRoomState calls (should be 0)
out.write("\n=== 3. REMAINING setEscapeRoomState (should be 0) ===\n")
remaining = 0
for i, line in enumerate(lines):
    if 'setEscapeRoomState' in line:
        remaining += 1
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")
out.write(f"  Total remaining: {remaining}\n")

# 4. Check for remaining setEscapeTimeLeft (should be 0)
out.write("\n=== 4. REMAINING setEscapeTimeLeft (should be 0) ===\n")
remaining_tl = 0
for i, line in enumerate(lines):
    if 'setEscapeTimeLeft' in line:
        remaining_tl += 1
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")
out.write(f"  Total remaining: {remaining_tl}\n")

# 5. Check for remaining setIsEscapeTimerRunning (should be 0)
out.write("\n=== 5. REMAINING setIsEscapeTimerRunning (should be 0) ===\n")
remaining_tr = 0
for i, line in enumerate(lines):
    if 'setIsEscapeTimerRunning' in line:
        remaining_tr += 1
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")
out.write(f"  Total remaining: {remaining_tr}\n")

# 6. Count dispatchEscape calls
out.write("\n=== 6. dispatchEscape CALLS ===\n")
dispatch_count = 0
types = {}
for i, line in enumerate(lines):
    if 'dispatchEscape' in line:
        dispatch_count += 1
        m = re.search(r"type:\s*'(\w+)'", line)
        if m:
            t = m.group(1)
            types[t] = types.get(t, 0) + 1
out.write(f"  Total dispatchEscape calls: {dispatch_count}\n")
for t, c in sorted(types.items()):
    out.write(f"    type='{t}': {c} calls\n")

# 7. Show first few dispatchEscape UPDATE calls to verify format
out.write("\n=== 7. SAMPLE dispatchEscape(UPDATE) CALLS ===\n")
count = 0
for i, line in enumerate(lines):
    if "dispatchEscape({type: 'UPDATE'" in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")
        count += 1
        if count >= 8:
            break

out.close()
print("Done -> _escape_verify.txt")
