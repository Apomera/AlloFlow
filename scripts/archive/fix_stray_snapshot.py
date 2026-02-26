"""Remove stray pushVisualSnapshot() call at component top level (L1423)."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')
original = len(lines)

# L1423 (0-indexed: 1422) should have stray pushVisualSnapshot()
# between useState declarations
idx = 1422  # 0-indexed for L1423
line = lines[idx].strip()
print(f"  L1423: '{line}'")
prev_line = lines[idx-1].strip()
next_line = lines[idx+1].strip()
print(f"  L1422: '{prev_line[:80]}'")
print(f"  L1424: '{next_line[:80]}'")

if line == 'pushVisualSnapshot();' and 'useState' in prev_line and 'useState' in next_line:
    lines.pop(idx)
    print("  [OK] Removed stray pushVisualSnapshot() from render body")
else:
    # Fallback: search for it
    for i in range(1400, 1445):
        if lines[i].strip() == 'pushVisualSnapshot();':
            p = lines[i-1].strip()
            n = lines[i+1].strip()
            if 'useState' in p or 'useState' in n:
                lines.pop(i)
                print(f"  [OK] Removed stray pushVisualSnapshot() at L{i+1}")
                break

content = '\n'.join(lines) 
new = len(content.split('\n'))
print(f"  Lines: {original} -> {new} (diff: {new-original:+d})")
with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print("Done!")
