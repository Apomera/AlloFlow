"""
Pass 4: Performance Anti-Patterns Analysis
Scan for:
1. Inline object/array creation in JSX style props
2. useMemo/useCallback usage patterns  
3. Expensive operations in render path (JSON.parse/stringify, .filter/.map chains)
4. Large component render analysis
5. React.memo usage
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []

# === ANALYSIS 1: Inline style objects ===
results.append("=" * 70)
results.append("ANALYSIS 1: Inline Style Objects in JSX")
results.append("=" * 70)

inline_styles = 0
for i, line in enumerate(lines, 1):
    if 'style={{' in line or 'style = {{' in line:
        inline_styles += 1

results.append(f"Inline style={{{{ }}}} count: {inline_styles}")
results.append("(These create new objects on every render but are standard React practice)")

# === ANALYSIS 2: useMemo / useCallback / React.memo ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 2: Memoization Patterns")
results.append("=" * 70)

use_memo = sum(1 for l in lines if 'useMemo(' in l and not l.strip().startswith('//'))
use_callback = sum(1 for l in lines if 'useCallback(' in l and not l.strip().startswith('//'))
react_memo = sum(1 for l in lines if 'React.memo(' in l and not l.strip().startswith('//'))

results.append(f"useMemo calls: {use_memo}")
results.append(f"useCallback calls: {use_callback}")
results.append(f"React.memo wraps: {react_memo}")

# === ANALYSIS 3: Expensive render-path operations ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 3: Potentially Expensive Render-Path Operations")
results.append("=" * 70)

json_parse = 0
json_stringify = 0
filter_map_chains = 0
sort_calls = 0

for i, line in enumerate(lines, 1):
    stripped = line.strip()
    if stripped.startswith('//'):
        continue
    if 'JSON.parse(' in line:
        json_parse += 1
    if 'JSON.stringify(' in line:
        json_stringify += 1
    if '.filter(' in line and '.map(' in line:
        filter_map_chains += 1
    if '.sort(' in line:
        sort_calls += 1

results.append(f"JSON.parse calls: {json_parse}")
results.append(f"JSON.stringify calls: {json_stringify}")
results.append(f".filter().map() chains: {filter_map_chains}")
results.append(f".sort() calls: {sort_calls}")

# === ANALYSIS 4: Large inline functions in JSX ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 4: Inline Arrow Functions in JSX Event Handlers")
results.append("=" * 70)

# Count onClick={() => patterns (creates new function each render)
inline_handlers = 0
for i, line in enumerate(lines, 1):
    # Match onClick={() =>  or onChange={() =>  etc
    if re.search(r'on[A-Z]\w+\s*=\s*\{?\s*\(\s*\)\s*=>', line):
        inline_handlers += 1
    elif re.search(r'on[A-Z]\w+\s*=\s*\{?\s*\(e\)\s*=>', line):
        inline_handlers += 1
    elif re.search(r'on[A-Z]\w+\s*=\s*\{?\s*\(\s*\w+\s*\)\s*=>', line):
        inline_handlers += 1

results.append(f"Inline arrow function event handlers: {inline_handlers}")
results.append("(Standard React pattern, only concerning in frequently re-rendered lists)")

# === ANALYSIS 5: Key prop usage in lists ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 5: List Rendering Key Props")
results.append("=" * 70)

map_calls = sum(1 for l in lines if '.map(' in l and not l.strip().startswith('//'))
key_props = sum(1 for l in lines if 'key=' in l or 'key =' in l)
index_keys = sum(1 for l in lines if 'key={i}' in l or 'key={idx}' in l or 'key={index}' in l)

results.append(f".map() calls (potential list renders): {map_calls}")
results.append(f"key= props: {key_props}")
results.append(f"Index-based keys (key={{i/idx/index}}): {index_keys}")

# === ANALYSIS 6: Component count and size ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 6: Component Structure")
results.append("=" * 70)

# Count function components
func_components = 0
for i, line in enumerate(lines, 1):
    if re.search(r'(const|function)\s+[A-Z]\w+\s*=\s*\(', line):
        func_components += 1
    elif re.search(r'function\s+[A-Z]\w+\s*\(', line):
        func_components += 1

results.append(f"Function component definitions: {func_components}")
results.append(f"Total lines: {len(lines)}")
results.append(f"Average lines per component: ~{len(lines) // max(func_components, 1)}")

# === ANALYSIS 7: Re-render triggers ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 7: State Variables (Re-render Triggers)")
results.append("=" * 70)

use_state = sum(1 for l in lines if 'useState(' in l and not l.strip().startswith('//'))
use_ref = sum(1 for l in lines if 'useRef(' in l and not l.strip().startswith('//'))

results.append(f"useState calls: {use_state}")
results.append(f"useRef calls: {use_ref}")
results.append(f"State-to-ref ratio: {use_state}:{use_ref}")

with open('pass4_results.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print(f"Results written to pass4_results.txt ({len(results)} lines)")
