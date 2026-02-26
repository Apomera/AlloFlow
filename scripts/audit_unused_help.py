"""
Audit unused help string definitions.
Extracts all HELP_STRINGS keys and all data-help-key references,
finds keys defined but never used, and checks if corresponding
UI elements exist with similar names but missing data-help-key wiring.
"""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    f.seek(0)
    lines = f.readlines()

# 1. Extract HELP_STRINGS keys (single-quoted keys followed by colon and quote)
# These are in the HELP_STRINGS object, roughly L35079-35912
help_block_start = 35078
help_block_end = min(35912, len(lines))
defined_keys = set()
for i in range(help_block_start, help_block_end):
    l = lines[i]
    # Match 'key_name': " or 'key_name': '
    matches = re.findall(r"'(\w+)'\s*:", l)
    for m in matches:
        if len(m) > 3:
            defined_keys.add(m)

# 2. Extract data-help-key references
used_keys = set()
for l in lines:
    for m in re.finditer(r'data-help-key=["\']([^"\']+)', l):
        used_keys.add(m.group(1))
    # Also check dynamic references like data-help-key={`prefix_${var}`}
    for m in re.finditer(r'data-help-key=\{[`\'"]([^`\'"$]+)', l):
        used_keys.add(m.group(1))

# 3. Find unused
unused = sorted(defined_keys - used_keys)

print(f"Defined keys: {len(defined_keys)}")
print(f"Used keys (data-help-key): {len(used_keys)}")
print(f"Unused keys: {len(unused)}")
print()

# 4. For each unused key, check if a similar UI element exists
#    (button, div, section with similar naming but no data-help-key)
print("=== UNUSED HELP STRING KEYS ===")
for key in unused:
    # Check if the key appears anywhere else in the code (outside help strings block)
    # as a string, variable name, or partial match
    occurrences = []
    base_parts = key.split('_')
    for i, l in enumerate(lines):
        if i >= help_block_start and i < help_block_end:
            continue  # Skip help strings block itself
        if key in l:
            occurrences.append(f"L{i+1}")
    
    status = "🔗 REFERENCED" if occurrences else "❌ ORPHAN"
    refs = ', '.join(occurrences[:5]) + ('...' if len(occurrences) > 5 else '')
    print(f"  {status} {key}" + (f" ({refs})" if occurrences else ""))

# Save detailed report
with open('unused_help_audit.txt', 'w', encoding='utf-8') as f:
    f.write(f"Defined: {len(defined_keys)}, Used: {len(used_keys)}, Unused: {len(unused)}\n\n")
    for key in unused:
        occurrences = []
        for i, l in enumerate(lines):
            if i >= help_block_start and i < help_block_end:
                continue
            if key in l:
                occurrences.append(f"L{i+1}: {l.strip()[:120]}")
        f.write(f"\n{'='*60}\n{key}\n")
        if occurrences:
            f.write("REFERENCED:\n")
            for o in occurrences[:10]:
                f.write(f"  {o}\n")
        else:
            f.write("NOT REFERENCED ANYWHERE\n")
