"""
Remove isMountedRef guards that are outside the Word Sounds scope.
The main App component never unmounts, so these guards are unnecessary anyway.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find all isMountedRef references and their line numbers
all_refs = []
for i, line in enumerate(lines, 1):
    if 'isMountedRef' in line:
        all_refs.append(i)

# The Word Sounds component scope is approximately L3462-9700
# (isMountedRef defined at L3462, component cleanup at ~L8100)
WS_START = 3462
WS_END = 9700

out_of_scope = [ln for ln in all_refs if ln < WS_START or ln > WS_END]
in_scope = [ln for ln in all_refs if WS_START <= ln <= WS_END]

print(f"In scope: {len(in_scope)} refs (L{WS_START}-{WS_END})")
print(f"Out of scope: {len(out_of_scope)} refs")
for ln in out_of_scope:
    print(f"  L{ln}: {lines[ln-1].strip()[:120]}")

# Remove the out-of-scope lines that are pure guard lines (added by our patch)
# These are lines that ONLY contain "if (!isMountedRef.current) return;" or 
# "if (isMountedRef.current) ..." guard patterns
lines_to_remove = []
for ln in out_of_scope:
    line = lines[ln-1].strip()
    # Pure guard line (our injected async guards)
    if line == 'if (!isMountedRef.current) return;':
        lines_to_remove.append(ln)
    # Inline guard in setTimeout (our inline fixes)
    # These need to be un-guarded, not removed

print(f"\nPure guard lines to remove: {len(lines_to_remove)}")
for ln in lines_to_remove:
    print(f"  Remove L{ln}")

# Also fix inline guards: { if (isMountedRef.current) X } -> X
# These are in setTimeout(() => { if (isMountedRef.current) setState(...); }, delay);
changes = 0
for ln in out_of_scope:
    line = lines[ln-1]
    stripped = line.strip()
    
    # Pattern: setTimeout(() => { if (isMountedRef.current) XXXXX; }, NNN);
    if 'if (isMountedRef.current)' in line and 'setTimeout' in line:
        # Undo the inline guard
        new_line = line.replace('{ if (isMountedRef.current) ', '')
        new_line = new_line.replace('; }', ';')  # Remove trailing brace
        lines[ln-1] = new_line
        changes += 1
        print(f"  Reverted inline guard at L{ln}: {lines[ln-1].strip()[:100]}")

# Remove pure guard lines (work backwards to preserve indices)
for ln in sorted(lines_to_remove, reverse=True):
    del lines[ln-1]
    changes += 1
    print(f"  Deleted guard line at L{ln}")

print(f"\nTotal changes: {changes}")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.writelines(lines)
print("File saved.")
