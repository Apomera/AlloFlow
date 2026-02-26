"""
Inline Style Dedup Audit

Find inline style={{...}} patterns that are REPEATED across multiple lines.
These are candidates for extraction to CSS classes or useMemo constants.

Skip unique one-off styles — only flag duplicates.
"""
import sys, re
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()
    lines = content.split('\n')

# ===================================================================
# Step 1: Extract all inline style objects
# ===================================================================
style_objects = []  # (line_num, style_text)

for i, line in enumerate(lines):
    # Match style={{ ... }}
    # Handle single-line styles
    for m in re.finditer(r'style=\{\{([^}]+)\}\}', line):
        style_text = m.group(1).strip()
        style_objects.append((i + 1, style_text))
    
    # Also match style={someVariable} where the variable is a style object
    # These are already optimized, skip them

# ===================================================================
# Step 2: Normalize and count duplicates
# ===================================================================
def normalize_style(s):
    """Normalize a style string for comparison."""
    # Remove extra whitespace
    s = re.sub(r'\s+', ' ', s).strip()
    # Sort properties for comparison
    props = [p.strip() for p in s.split(',') if p.strip()]
    props.sort()
    return ', '.join(props)

normalized = {}
for ln, style_text in style_objects:
    norm = normalize_style(style_text)
    if norm not in normalized:
        normalized[norm] = []
    normalized[norm].append(ln)

# Find duplicates (used 2+ times)
duplicates = {k: v for k, v in normalized.items() if len(v) >= 2}

# Sort by frequency
sorted_dups = sorted(duplicates.items(), key=lambda x: len(x[1]), reverse=True)

# ===================================================================
# Step 3: Also find common PARTIAL patterns
# ===================================================================
# Extract individual CSS properties
all_props = Counter()
for ln, style_text in style_objects:
    props = [p.strip() for p in style_text.split(',')]
    for prop in props:
        if ':' in prop:
            all_props[prop.strip()] += 1

# Find properties used 5+ times
common_props = [(prop, count) for prop, count in all_props.most_common(50) if count >= 5]

# ===================================================================
# Step 4: Output report
# ===================================================================
out = []
out.append(f"=== INLINE STYLE DEDUP AUDIT ({len(style_objects)} total inline styles) ===\n")

out.append(f"=== EXACT DUPLICATES ({len(duplicates)}) ===")
out.append("(Identical style objects used 2+ times — extract to CSS class or constant)\n")

total_dup_instances = 0
for style, lns in sorted_dups[:30]:
    total_dup_instances += len(lns)
    lines_str = ', '.join(f'L{l}' for l in lns[:6])
    if len(lns) > 6:
        lines_str += f', +{len(lns) - 6} more'
    out.append(f"  [{len(lns)}x] {style[:100]}")
    out.append(f"       at: {lines_str}")
    out.append("")

out.append(f"\n=== MOST COMMON PROPERTIES ({len(common_props)}) ===")
out.append("(Individual CSS props appearing 5+ times in inline styles)\n")
for prop, count in common_props:
    out.append(f"  [{count:3d}x] {prop[:80]}")

unique_styles = len(normalized) - len(duplicates)
out.append(f"\n=== SUMMARY ===")
out.append(f"  Total inline styles: {len(style_objects)}")
out.append(f"  Unique styles: {unique_styles}")
out.append(f"  Duplicate patterns: {len(duplicates)}")
out.append(f"  Total duplicate instances: {total_dup_instances}")
out.append(f"  Potential savings: {total_dup_instances - len(duplicates)} object allocations per render")

result = '\n'.join(out)
with open('inline_style_audit.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"\nTotal inline styles: {len(style_objects)}")
print(f"Duplicate patterns: {len(duplicates)}")
print(f"Unique: {unique_styles}")
print(f"Potential savings: {total_dup_instances - len(duplicates)} allocations")
print("Report: inline_style_audit.txt")
