"""
Properly compare HELP_STRINGS keys vs data-help-key attributes.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    content = ''.join(lines)

# 1. Find HELP_STRINGS block and extract keys
hs_start = None
for i, l in enumerate(lines):
    if 'const HELP_STRINGS' in l:
        hs_start = i
        break

hs_keys = set()
if hs_start:
    depth = 0
    for i in range(hs_start, min(hs_start + 1000, len(lines))):
        depth += lines[i].count('{') - lines[i].count('}')
        # Keys are like: 'key_name': "value"
        m = re.match(r"\s+'(\w[\w_-]+)'\s*:", lines[i])
        if m:
            hs_keys.add(m.group(1))
        if depth == 0 and i > hs_start:
            print(f"HELP_STRINGS: L{hs_start+1}-L{i+1} ({i - hs_start + 1} lines)")
            break

# 2. Extract data-help-key values
dhk = set(re.findall(r'data-help-key="([^"]+)"', content))

# 3. Compare
covered = dhk & hs_keys
gaps = dhk - hs_keys
extra = hs_keys - dhk

print(f"HELP_STRINGS keys: {len(hs_keys)}")
print(f"data-help-key attrs: {len(dhk)}")
print(f"Covered by HELP_STRINGS: {len(covered)}")
print(f"GAPS (in DOM but not HELP_STRINGS): {len(gaps)}")
print(f"Extra (in HELP_STRINGS but not DOM): {len(extra)}")

if gaps:
    print(f"\n--- GAPS ({len(gaps)}): ---")
    for k in sorted(gaps):
        print(f"  {k}")
