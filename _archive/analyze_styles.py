"""Analyze inline styles in the monolith and check for syntax issues."""
import re
from collections import Counter

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Analyze inline styles
pattern = r'style=\{\{([^}]+)\}\}'
matches = list(re.finditer(pattern, content))

constant_count = 0
dynamic_count = 0
style_bodies = []

for m in matches:
    body = m.group(1).strip()
    has_dynamic = '?' in body or '(' in body or '`' in body
    
    if not has_dynamic:
        props = [p.strip() for p in body.split(',') if p.strip()]
        all_constant = True
        for prop in props:
            if ':' not in prop:
                all_constant = False
                break
            val = prop.split(':', 1)[1].strip().rstrip(',')
            is_const = (
                val.startswith("'") or val.startswith('"') or
                re.match(r'^-?\d+(\.\d+)?(px|em|rem|%|vh|vw|s|ms)?$', val) or
                val in ('true', 'false', '0', 'none')
            )
            if not is_const:
                all_constant = False
                break
        if all_constant and len(props) >= 2:
            constant_count += 1
            normalized = re.sub(r'\s+', ' ', body).strip()
            style_bodies.append(normalized)
        else:
            dynamic_count += 1
    else:
        dynamic_count += 1

body_counts = Counter(style_bodies)
duplicated = {k: v for k, v in body_counts.items() if v >= 2}

print(f"Total inline styles: {len(matches)}")
print(f"Constant styles (2+ props): {constant_count}")
print(f"Dynamic styles: {dynamic_count}")
print(f"Duplicated constant patterns (2+): {len(duplicated)}")
for body, count in sorted(duplicated.items(), key=lambda x: -x[1])[:10]:
    print(f"  [{count}x] {body[:100]}")

# Also check what the Tier 2 insertions look like
marker = "PHASE 1 TIER 2"
marker_idx = content.find(marker)
if marker_idx > 0:
    line = content[:marker_idx].count('\n') + 1
    snippet = content[marker_idx:marker_idx+1500]
    print(f"\n--- Tier 2 block found at line {line} ---")
    print(snippet[:800])
else:
    print("\nTier 2 marker NOT found")

# Check total useCallback count
uc = len(re.findall(r'React\.useCallback', content))
print(f"\nTotal React.useCallback in file: {uc}")
