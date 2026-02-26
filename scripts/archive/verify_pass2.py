"""Post-fix verification: how many unguarded setTimeout remain?"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Count async setTimeout that still lack guard
remaining_async = 0
for i, line in enumerate(lines):
    if 'setTimeout(async () =>' in line and i + 1 < len(lines):
        next_line = lines[i + 1]
        if 'isMountedRef' not in next_line:
            remaining_async += 1
            print(f"  UNGUARDED ASYNC L{i+1}: {line.strip()[:100]}")

# Count setTimeout with state updates but no guard (within 5 lines)
remaining_state = 0
for i, line in enumerate(lines, 1):
    if 'setTimeout(' in line and 'new Promise' not in line:
        stripped = line.strip()
        if stripped.startswith('//'):
            continue
        if 'setTimeout(resolve' in line or 'setTimeout(r,' in line:
            continue
        has_state = False
        has_guard = 'isMountedRef' in line
        for j in range(i-1, min(i+5, len(lines))):
            if re.search(r'set[A-Z]\w+\(', lines[j]):
                has_state = True
            if 'isMountedRef' in lines[j]:
                has_guard = True
        if has_state and not has_guard:
            remaining_state += 1

print(f"\nRemaining unguarded async setTimeout: {remaining_async}")
print(f"Remaining setTimeout with unguarded state updates: {remaining_state}")
print(f"Total isMountedRef references: {sum(1 for l in lines if 'isMountedRef' in l)}")
