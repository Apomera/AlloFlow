"""
Extract HELP_STRINGS properly — output to file with encoding safety.
"""
import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find HELP_STRINGS block boundaries
start = None
brace_depth = 0
end = None
for i, line in enumerate(lines):
    if 'const HELP_STRINGS = {' in line:
        start = i
        brace_depth = 1
        continue
    if start is not None and end is None:
        brace_depth += line.count('{') - line.count('}')
        if brace_depth <= 0:
            end = i
            break

# Extract defined keys
defined_keys = {}
for i in range(start, end+1):
    line = lines[i]
    m = re.match(r"\s+(?:'([^']+)'|(\w+))\s*:", line)
    if m:
        key = m.group(1) or m.group(2)
        defined_keys[key] = i+1

# Extract all used keys from JSX
content = ''.join(lines)
used_keys = set(re.findall(r'data-help-key="([^"]+)"', content))

# Compute sets
defined_set = set(defined_keys.keys())
missing_defs = sorted(used_set - defined_set) if (used_set := used_keys) else []
unused_defs = sorted(defined_set - used_keys)
matched = sorted(defined_set & used_keys)

# Write report  
with open('scripts/help_audit_report.txt', 'w', encoding='utf-8') as out:
    out.write(f"HELP_STRINGS block: lines {start+1} to {end+1}\n")
    out.write(f"Defined in HELP_STRINGS: {len(defined_keys)}\n")
    out.write(f"Used in JSX: {len(used_keys)}\n")
    out.write(f"Matched: {len(matched)}\n")
    out.write(f"Used but NO definition: {len(missing_defs)}\n")
    out.write(f"Defined but NOT used: {len(unused_defs)}\n\n")
    
    if missing_defs:
        out.write(f"=== USED BUT MISSING DEFINITION ({len(missing_defs)}) ===\n")
        for key in missing_defs:
            out.write(f"  {key}\n")
        out.write("\n")
    
    if unused_defs:
        out.write(f"=== DEFINED BUT NOT USED ({len(unused_defs)}) ===\n")
        for key in unused_defs:
            out.write(f"  {key} (L{defined_keys[key]})\n")
        out.write("\n")

    out.write(f"=== ALL DEFINED KEYS ===\n")
    for key in sorted(defined_keys.keys()):
        out.write(f"  L{defined_keys[key]:5d} | {key}\n")

print(f"Report written to scripts/help_audit_report.txt")
print(f"Block: L{start+1}-L{end+1} | Defined: {len(defined_keys)} | Used: {len(used_keys)}")
print(f"Matched: {len(matched)} | Missing def: {len(missing_defs)} | Unused def: {len(unused_defs)}")
