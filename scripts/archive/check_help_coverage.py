"""
Check HELP_STRINGS coverage vs data-help-key DOM attributes.
Are there any DOM elements expecting help text that HELP_STRINGS doesn't have?
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract HELP_STRINGS keys
hs_start = content.index('const HELP_STRINGS')
# Find the closing };
depth = 0
hs_end = hs_start
for i in range(hs_start, min(hs_start + 300000, len(content))):
    ch = content[i]
    if ch == '{': depth += 1
    elif ch == '}':
        depth -= 1
        if depth == 0:
            hs_end = i
            break

hs_block = content[hs_start:hs_end + 1]
hs_keys = set(re.findall(r"""['"]([^'"]+)['"]\s*:""", hs_block))
print(f"HELP_STRINGS keys: {len(hs_keys)}")

# 2. Extract data-help-key values
dhk = set(re.findall(r'data-help-key="([^"]+)"', content))
print(f"data-help-key attrs: {len(dhk)}")

# 3. Compare
covered = dhk & hs_keys
gaps = dhk - hs_keys
extra = hs_keys - dhk

print(f"\nCovered (in both): {len(covered)}")
print(f"Gaps (data-help-key but no HELP_STRINGS entry): {len(gaps)}")
print(f"Extra (HELP_STRINGS but no data-help-key): {len(extra)}")

if gaps:
    print(f"\n--- GAPS ({len(gaps)}): DOM elements with no help text ---")
    for k in sorted(gaps):
        print(f"  MISSING: {k}")

# 4. Also check: were help_mode keys in UI_STRINGS covering these gaps?
# The remaining help_mode section only has activate/deactivate
# Let's see if any of the gap keys match help_mode naming patterns
if gaps:
    print(f"\n--- Would help_mode have covered any gaps? ---")
    for k in sorted(gaps):
        # help_mode keys used underscores matching the data-help-key values
        print(f"  {k}")
