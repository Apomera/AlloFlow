"""
Deeper analysis of the 73 render-path operations.
Find .filter().map() chains in JSX that can be safely extracted.

Strategy:
- Find {array.filter(...).map(...)} patterns in JSX
- Extract the filter to a useMemo const BEFORE the return statement
- Replace the inline filter().map() with filteredArray.map()

This is the safest approach because:
1. The filter is the expensive part (O(n) comparison)
2. The map is needed for rendering anyway (can't skip it)
3. Extracting just the filter requires minimal code changes
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Find .filter( chains in JSX context (inside { } in JSX, typically after a return)
filter_map_chains = []

for i, line in enumerate(lines):
    stripped = line.strip()
    
    # Look for pattern: {something.filter(...)  or  something.filter(...).map(
    # These are typically inside JSX curly braces
    
    # Pattern 1: {array.filter(callback).map( — single line start
    m = re.search(r'\{(\w[\w.]*(?:\?\.\w+)*)\.(filter)\(([^)]+)\)\.(map)\(', stripped)
    if m:
        source = m.group(1)
        filter_cb = m.group(3)
        
        # Check if we're inside a return (JSX context)
        in_return = False
        for j in range(i-1, max(0, i-50), -1):
            check = lines[j].strip()
            if check.startswith('return (') or check.startswith('return(') or check == 'return (':
                in_return = True
                break
            if check.startswith('const ') and '=' in check:
                break
        
        if in_return:
            filter_map_chains.append({
                'line': i + 1,
                'source': source,
                'filter_callback': filter_cb[:60],
                'text': stripped[:120],
                'in_return': True
            })

# Also find: const x = array.filter().map() patterns that we might have missed
# and .filter( not followed by .map on the same line (multi-line chains)
for i, line in enumerate(lines):
    stripped = line.strip()
    
    # Multi-line pattern: ends with .filter(callback)
    # and next relevant line starts with .map(
    if '.filter(' in stripped and '.map(' not in stripped:
        # Check next few lines for .map
        for j in range(i+1, min(i+5, len(lines))):
            if '.map(' in lines[j]:
                in_return = False
                for k in range(i-1, max(0, i-50), -1):
                    check = lines[k].strip()
                    if 'return (' in check or 'return(' in check:
                        in_return = True
                        break
                    if check.startswith('const ') and '=' in check:
                        break
                
                if in_return:
                    m = re.search(r'(\w[\w.]*)\.(filter)\(', stripped)
                    if m:
                        filter_map_chains.append({
                            'line': i + 1,
                            'source': m.group(1),
                            'filter_callback': '',
                            'text': stripped[:120],
                            'in_return': True,
                            'multiline': True
                        })
                break

print(f"Found {len(filter_map_chains)} .filter().map() chains in JSX return blocks")
print()

# Group by source array to see which arrays are filtered most
from collections import Counter
sources = Counter(c['source'] for c in filter_map_chains)
print("Most filtered arrays:")
for src, count in sources.most_common(10):
    print(f"  {src}: {count}x")
    for c in filter_map_chains:
        if c['source'] == src:
            print(f"    L{c['line']}: {c['text'][:80]}")

# Print all
print(f"\nAll filter-map chains:")
for c in sorted(filter_map_chains, key=lambda x: x['line']):
    ml = '(ML)' if c.get('multiline') else ''
    print(f"  L{c['line']} {ml}: {c['source']}.filter({c['filter_callback']}).map() → {c['text'][:80]}")
