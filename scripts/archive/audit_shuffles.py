"""Audit all naive shuffle patterns in AlloFlowANTI.txt."""
FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []
for i, line in enumerate(lines):
    if 'Math.random()' in line and '.sort(' in line:
        ctx_before = [lines[j].rstrip() for j in range(max(0, i-5), i)]
        ctx_after = [lines[j].rstrip() for j in range(i+1, min(len(lines), i+5))]
        results.append({
            'line': i + 1,
            'code': line.strip()[:150],
            'before': ctx_before,
            'after': ctx_after
        })

with open('_shuffle_audit.txt', 'w', encoding='utf-8') as f:
    for r in results:
        f.write(f"=== LINE {r['line']} ===\n")
        for b in r['before']:
            f.write(f"  CTX: {b[:120]}\n")
        f.write(f"  >>> {r['code']}\n")
        for a in r['after']:
            f.write(f"  CTX: {a[:120]}\n")
        f.write("\n")

print(f"Found {len(results)} naive shuffles, written to _shuffle_audit.txt")
