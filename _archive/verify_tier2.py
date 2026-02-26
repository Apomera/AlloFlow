"""Verify the modified monolith - check syntax and Tier 2 quality."""
import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
print(f"File: {len(content):,} bytes, {len(lines):,} lines")

# 1. Look for the Tier 2 block
marker = "PHASE 1 TIER 2"
for i, line in enumerate(lines):
    if marker in line:
        print(f"\n=== Tier 2 block at line {i+1} ===")
        for j in range(max(0, i-1), min(len(lines), i+30)):
            print(f"  {j+1}: {lines[j]}")
        break

# 2. Check for common syntax issues in the added callbacks
# Look for all the handleToggle / handleSet patterns
cb_pattern = re.compile(r'const\s+(handle\w+)\s*=\s*React\.useCallback')
callbacks = []
for m in cb_pattern.finditer(content):
    line_num = content[:m.start()].count('\n') + 1
    # Get the full line
    line_start = content.rfind('\n', 0, m.start()) + 1
    line_end = content.find('\n', m.end())
    full_line = content[line_start:line_end].strip()
    callbacks.append((line_num, m.group(1), full_line[:150]))

print(f"\n=== useCallback declarations ({len(callbacks)} total) ===")
for line_num, name, snippet in callbacks[:20]:
    print(f"  L{line_num}: {snippet}")
if len(callbacks) > 20:
    print(f"  ... and {len(callbacks) - 20} more")

# 3. Check for unmatched braces (simple check)
open_braces = content.count('{')
close_braces = content.count('}')
print(f"\n=== Brace check ===")
print(f"  Open braces: {open_braces}")
print(f"  Close braces: {close_braces}")
print(f"  Difference: {open_braces - close_braces}")

# 4. Check for onClick={handleXxx} references that don't have matching declarations
onclick_refs = set()
for m in re.finditer(r'onClick=\{(handle\w+)\}', content):
    onclick_refs.add(m.group(1))

callback_names = set(name for _, name, _ in callbacks)
missing = onclick_refs - callback_names
if missing:
    print(f"\n=== WARNING: onClick references with no matching useCallback ===")
    for name in sorted(missing):
        print(f"  {name}")
else:
    print(f"\n=== All onClick={'{handleXxx}'} references have matching useCallback declarations ===")

# 5. How many onClick still use inline arrows?
inline_onclick = len(re.findall(r'onClick=\{[^}]*=>', content))
callback_onclick = len(re.findall(r'onClick=\{handle\w+\}', content))
print(f"\n=== onClick breakdown ===")
print(f"  Inline arrows remaining: {inline_onclick}")
print(f"  Using useCallback refs: {callback_onclick}")
