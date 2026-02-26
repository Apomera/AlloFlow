"""Pass 2: Race Condition Analysis - write results to file"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []

results.append("ANALYSIS 1: setTimeout with state updates but NO isMountedRef guard")
results.append("=" * 70)

unguarded = []
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
            unguarded.append((i, stripped[:150]))

results.append(f"Found {len(unguarded)} unguarded setTimeout with state updates:")
for ln, text in unguarded:
    results.append(f"  L{ln}: {text}")

results.append("")
results.append("ANALYSIS 2: setInterval cleanup status")
results.append("=" * 70)

for i, line in enumerate(lines, 1):
    if 'setInterval(' in line:
        stripped = line.strip()
        var_match = re.search(r'(?:const|let|var)\s+(\w+)\s*=\s*setInterval', stripped)
        ref_match = re.search(r'(\w+(?:\.current)?)\s*=\s*setInterval', stripped)
        var = var_match.group(1) if var_match else (ref_match.group(1) if ref_match else None)
        has_cleanup = False
        if var:
            search = f'clearInterval({var})'
            for l in lines:
                if search in l:
                    has_cleanup = True
                    break
        status = "CLEANED" if has_cleanup else ("NO_CLEANUP" if var else "ANON")
        emoji = "OK" if has_cleanup else "WARN"
        results.append(f"  [{emoji}] L{i} [{status}] var={var}: {stripped[:120]}")

results.append("")
results.append("ANALYSIS 3: Counts")
results.append("=" * 70)
total = sum(1 for l in lines if 'setTimeout(' in l and not l.strip().startswith('//'))
promises = sum(1 for l in lines if 'new Promise' in l and 'setTimeout' in l)
clears = sum(1 for l in lines if 'clearTimeout' in l)
results.append(f"Total setTimeout: {total}")
results.append(f"Promise delays (safe): {promises}")
results.append(f"clearTimeout calls: {clears}")
results.append(f"Real timeouts: {total - promises}")

with open('pass2_results.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print("Results written to pass2_results.txt")
