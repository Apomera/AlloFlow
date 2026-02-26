"""Fix infinite recursion + blank lines in Phase D2 group iteration."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# Fix 1: Add setFullPackTargetGroup('none') before recursive call
for i, l in enumerate(lines):
    if "await handleGenerateFullPack(chatContextOverride);" in l and i > 52000 and i < 52600:
        # Check previous lines for the fix
        prev = ''.join(lines[max(0,i-3):i])
        if "setFullPackTargetGroup('none')" in prev:
            print("[OK] Recursion guard already present")
            break
        # Insert before this line
        indent = l[:len(l) - len(l.lstrip())]
        guard_line = indent + "setFullPackTargetGroup('none'); // prevent infinite recursion\r\n"
        lines.insert(i, guard_line)
        changes += 1
        print("[OK] Added recursion guard before L%d" % (i+1))
        break

# Fix 2: Also need to set isProcessing = false before recursive call since the guard checks it
# Actually, the recursive call has 'if (isProcessing) return;' at the top. 
# We set isProcessing(true) at line 52489, so the recursive call will return immediately!
# Fix: We need to temporarily set isProcessing to false before the recursive call.
for i, l in enumerate(lines):
    if "setFullPackTargetGroup('none'); // prevent infinite recursion" in l:
        next_line_idx = i + 1
        if next_line_idx < len(lines) and 'handleGenerateFullPack' in lines[next_line_idx]:
            # Check if we already have the isProcessing fix
            if 'setIsProcessing(false)' not in lines[i]:
                # Replace the guard line with both fixes
                indent = l[:len(l) - len(l.lstrip())]
                lines[i] = indent + "setFullPackTargetGroup('none'); // prevent infinite recursion\r\n"
                lines.insert(i+1, indent + "setIsProcessing(false); // allow recursive call to proceed\r\n")
                changes += 1
                print("[OK] Added isProcessing(false) guard")
        break

# Fix 3: Clean blank lines in the D2 block
# Find the D2 block boundaries
d2_start = None
d2_end = None
for i, l in enumerate(lines):
    if '// Phase D2: Per-group full pack generation' in l:
        d2_start = i
    if d2_start and i > d2_start and "setFullPackTargetGroup('none');" in l and 'finally' in ''.join(lines[max(0,i-5):i]):
        d2_end = i + 5  # include closing braces
        break

if d2_start and d2_end:
    # Remove blank lines within this range
    cleaned = []
    for j in range(d2_start, min(d2_end, len(lines))):
        if lines[j].strip():
            cleaned.append(lines[j])
    removed = (d2_end - d2_start) - len(cleaned)
    lines[d2_start:d2_end] = cleaned
    if removed > 0:
        changes += 1
        print("[OK] Cleaned %d blank lines in D2 block" % removed)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("\n=== Total %d fixes applied ===" % changes)
