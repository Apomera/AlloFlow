"""Fix duplicate )} causing JSX syntax error at L1832."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')
original_count = len(lines)

# Line 1831 has the correct )}, line 1832 is the duplicate
# L1831 (0-indexed 1830): "                            )}"
# L1832 (0-indexed 1831): "                            )}"  <-- extra, remove this
idx = 1831  # 0-indexed = line 1832
print(f"  L1832 content: '{lines[idx].rstrip()[:80]}'")
print(f"  L1831 content: '{lines[idx-1].rstrip()[:80]}'")
print(f"  L1833 content: '{lines[idx+1].rstrip()[:80]}'")

if ')}' in lines[idx].strip() and ')}' in lines[idx-1].strip():
    lines.pop(idx)
    print(f"  [OK] Removed duplicate ')}}' at L1832")
else:
    print(f"  [WARN] Pattern not matched")

content = '\n'.join(lines)
new_count = len(content.split('\n'))
print(f"\nLine count: {original_count} -> {new_count} (diff: {new_count - original_count:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print("Done!")
