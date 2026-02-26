import sys

with open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

# L21340 (0-indexed 21339): setTimeout(() => setIdleAnimation(null), durationMs);
# L21341 (0-indexed 21340): }), []);
# Problem: playAnimation body needs a closing }, before the }), []);
# Fix: Insert "      }," between L21340 and L21341

idx = 21340  # 0-indexed for L21341
line = lines[idx].strip()
print(f"L{idx+1}: {line}")
assert line == '}), []);', f"Unexpected content: {line}"

prev = lines[idx - 1].strip()
print(f"L{idx}: {prev}")
assert 'setTimeout' in prev, f"Unexpected content at L{idx}: {prev}"

# Insert closing brace for playAnimation
nl = "\r\n"
lines.insert(idx, "      }," + nl)

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(lines)

# Verify
lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace').readlines()
for i in range(21336, 21345):
    print(f"L{i+1}: {lines[i].rstrip()[:100]}")
print(f"Total: {len(lines)}")
print("Fix applied!")
