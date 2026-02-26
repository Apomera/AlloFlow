"""Write verification results to a file for reading."""
import re
import sys

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

results = []

# 1. Missing callback references
onclick_refs = set()
for m in re.finditer(r'onClick=\{(handle\w+)\}', content):
    onclick_refs.add(m.group(1))

callback_defs = set()
for m in re.finditer(r'(?:const|let|var)\s+(handle\w+)\s*=', content):
    callback_defs.add(m.group(1))
for m in re.finditer(r'function\s+(handle\w+)', content):
    callback_defs.add(m.group(1))

missing = onclick_refs - callback_defs
results.append(f"onClick handler refs: {len(onclick_refs)} unique names")
results.append(f"Handler definitions found: {len(callback_defs)} unique names")
results.append(f"Missing definitions: {len(missing)}")
for name in sorted(missing):
    count = len(re.findall(rf'onClick=\{{{name}\}}', content))
    results.append(f"  MISSING: {name} (used {count}x)")

# 2. Brace balance
open_b = content.count('{')
close_b = content.count('}')
results.append(f"\nBraces: {open_b} open, {close_b} close, diff={open_b - close_b}")

# 3. Tier 2 block location and content
marker_idx = content.find("PHASE 1 TIER 2")
if marker_idx >= 0:
    line = content[:marker_idx].count('\n') + 1
    results.append(f"\nTier 2 block at line {line}:")
    snippet = content[marker_idx:marker_idx+800]
    results.append(snippet)

# 4. New useCallback count  
new_cbs = re.findall(r'const\s+(handle\w+)\s*=\s*React\.useCallback', content)
results.append(f"\nNew useCallback declarations: {len(new_cbs)}")
for name in new_cbs[:25]:
    results.append(f"  {name}")

with open('verification_results.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))

print(f"Results written to verification_results.md ({len(results)} lines)")
