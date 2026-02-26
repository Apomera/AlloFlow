"""
Identify the most common static inline style patterns for batch CSS conversion.
Group by style content to find repeating patterns worth extracting.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Extract static style objects (no variables, ternaries, template literals)
from collections import Counter
patterns = Counter()
pattern_lines = {}

for i, line in enumerate(lines):
    if 'style={{' not in line:
        continue
    
    # Extract the style content
    idx_start = line.index('style={{') + len('style={{')
    # Find the matching }}
    brace_depth = 2
    idx_end = idx_start
    for ci in range(idx_start, len(line)):
        if line[ci] == '{':
            brace_depth += 1
        elif line[ci] == '}':
            brace_depth -= 1
            if brace_depth == 0:
                idx_end = ci - 1  # Before the last }
                break
    
    style_content = line[idx_start:idx_end+1].strip()
    
    # Check if it's static (no variables or dynamic content)
    is_dynamic = any(k in style_content for k in ['${', '`', '?', 'prev', 'var('])
    # Also check for JS variable references (word followed by comma or })
    has_var_ref = bool(re.search(r':\s*[a-zA-Z_]\w*\s*[,}]', style_content))
    # But allow quoted strings
    no_quotes = re.sub(r"'[^']*'", '', style_content)
    no_quotes = re.sub(r'"[^"]*"', '', no_quotes)
    has_var_ref = bool(re.search(r':\s*[a-zA-Z_]\w*\s*[,}]', no_quotes))
    
    if not is_dynamic and not has_var_ref:
        # Normalize whitespace
        normalized = re.sub(r'\s+', ' ', style_content).strip()
        if normalized:
            patterns[normalized] += 1
            if normalized not in pattern_lines:
                pattern_lines[normalized] = []
            pattern_lines[normalized].append(i + 1)

# Print top patterns
out = []
out.append(f"=== REPEATING STATIC STYLE PATTERNS (2+ occurrences) ===")
repeats = [(p, c) for p, c in patterns.most_common() if c >= 2]
for pattern, count in repeats:
    lines_at = pattern_lines[pattern][:5]
    out.append(f"  [{count}x] {pattern[:80]}")
    out.append(f"       at: {lines_at}")

out.append(f"\n=== UNIQUE PATTERNS (1 occurrence) ===")
singles = sum(1 for c in patterns.values() if c == 1)
out.append(f"  {singles} unique patterns (skip for now)")

out.append(f"\n=== TOTAL STATIC PATTERNS: {len(patterns)} ===")
out.append(f"  Repeating (2+): {len(repeats)}")
out.append(f"  Unique: {singles}")
out.append(f"  Total style replacements: {sum(c for _, c in repeats)}")

result = '\n'.join(out)
with open('style_patterns.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"Repeating patterns: {len(repeats)}, covering {sum(c for _, c in repeats)} style objects")
for p, c in repeats[:5]:
    print(f"  [{c}x] {p[:60]}")
