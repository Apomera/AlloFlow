"""Quick critical checks only."""
import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Missing callback references
onclick_refs = set()
for m in re.finditer(r'onClick=\{(handle\w+)\}', content):
    onclick_refs.add(m.group(1))

callback_defs = set()
for m in re.finditer(r'const\s+(handle\w+)\s*=\s*React\.useCallback', content):
    callback_defs.add(m.group(1))

# Also count non-useCallback handler definitions
for m in re.finditer(r'const\s+(handle\w+)\s*=\s*(?:async\s*)?\(', content):
    callback_defs.add(m.group(1))
for m in re.finditer(r'function\s+(handle\w+)\s*\(', content):
    callback_defs.add(m.group(1))

missing = onclick_refs - callback_defs
print(f"onClick refs: {len(onclick_refs)} unique handler names")
print(f"Handler defs: {len(callback_defs)} unique names")
if missing:
    print(f"MISSING handlers ({len(missing)}):")
    for name in sorted(missing):
        # Find where it's referenced
        count = len(re.findall(f'onClick={{{{?{name}}}}}?', content))
        print(f"  {name} (referenced {count}x)")
else:
    print("ALL references have matching definitions - OK!")

# 2. Brace balance
open_b = content.count('{')
close_b = content.count('}')
print(f"\nBraces: {open_b} open, {close_b} close, diff={open_b - close_b}")

# 3. Show the Tier 2 block header
marker_idx = content.find("PHASE 1 TIER 2")
if marker_idx >= 0:
    line = content[:marker_idx].count('\n') + 1
    end = min(marker_idx + 500, len(content))
    print(f"\nTier 2 block starts at line {line}")
    print(content[marker_idx:end])
