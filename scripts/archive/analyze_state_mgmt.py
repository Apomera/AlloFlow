"""
Pass 5: State Management Hazards Analysis
Scan for:
1. State shadowing (same useState variable names in nested scopes)
2. Derived state anti-patterns (useEffect to sync state)
3. Stale closure risks (missing useCallback deps)
4. Prop drilling indicators
5. useState with objects (vs. useReducer)
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []

# === ANALYSIS 1: State Variable Name Frequency ===
results.append("=" * 70)
results.append("ANALYSIS 1: Most Common State Variable Names (Shadowing Risk)")
results.append("=" * 70)

state_vars = {}
for i, line in enumerate(lines, 1):
    match = re.search(r'const\s+\[(\w+),\s*set\w+\]\s*=\s*(?:React\.)?useState', line)
    if match:
        name = match.group(1)
        state_vars.setdefault(name, []).append(i)

# Find duplicates (potential shadowing)
duplicates = {k: v for k, v in state_vars.items() if len(v) > 1}
results.append(f"Total unique state variable names: {len(state_vars)}")
results.append(f"Names used more than once: {len(duplicates)}")
for name, locs in sorted(duplicates.items(), key=lambda x: -len(x[1])):
    results.append(f"  '{name}' x{len(locs)}: {', '.join(f'L{l}' for l in locs[:8])}")

# === ANALYSIS 2: Derived State Anti-Pattern ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 2: Potential Derived State (useEffect -> setState)")
results.append("=" * 70)

# Pattern: useEffect that ONLY calls a setState based on another state
derived_state = 0
for i, line in enumerate(lines, 1):
    if 'React.useEffect(' in line or 'useEffect(' in line:
        if line.strip().startswith('//'):
            continue
        # Check if body is short (3-6 lines) and only sets state
        body_lines = []
        for j in range(i, min(i+6, len(lines))):
            body_lines.append(lines[j].strip())
        body = ' '.join(body_lines)
        # Simple derived: useEffect(() => { setX(something) }, [dep]);
        if re.search(r'set[A-Z]\w+\(', body) and body.count('set') <= 2 and '}, [' in body:
            derived_state += 1

results.append(f"Potential derived state effects: {derived_state}")
results.append("(These could potentially be replaced with useMemo or inline computation)")

# === ANALYSIS 3: Prop Drilling Indicators ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 3: Prop Drilling Indicators")
results.append("=" * 70)

# Count prop usage patterns (how many props does the biggest component receive?)
max_props = 0
max_props_line = 0
for i, line in enumerate(lines, 1):
    # Look for destructured props: const { a, b, c, ... } = props
    match = re.search(r'(?:const|let)\s*\{([^}]{50,})\}\s*=\s*props', line)
    if match:
        props_str = match.group(1)
        prop_count = len([p.strip() for p in props_str.split(',') if p.strip()])
        if prop_count > max_props:
            max_props = prop_count
            max_props_line = i

# Also count function components with many parameters
for i, line in enumerate(lines, 1):
    match = re.search(r'(?:const\s+\w+\s*=|function\s+\w+)\s*\(\s*\{([^}]{80,})\}', line)
    if match:
        params = match.group(1)
        param_count = len([p.strip() for p in params.split(',') if p.strip()])
        if param_count > max_props:
            max_props = param_count
            max_props_line = i

results.append(f"Max props in single component: {max_props} (at L{max_props_line})")

# Count React.createContext usage
contexts = sum(1 for l in lines if 'createContext' in l)
use_context = sum(1 for l in lines if 'useContext(' in l)
results.append(f"React.createContext: {contexts}")
results.append(f"useContext calls: {use_context}")

# === ANALYSIS 4: useState with complex objects ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 4: Complex State Objects")
results.append("=" * 70)

object_state = 0
array_state = 0
for i, line in enumerate(lines, 1):
    if 'useState({' in line:
        object_state += 1
    elif 'useState([' in line:
        array_state += 1

results.append(f"useState({{ }}) with objects: {object_state}")
results.append(f"useState([ ]) with arrays: {array_state}")
use_reducer = sum(1 for l in lines if 'useReducer(' in l)
results.append(f"useReducer calls: {use_reducer}")

# === ANALYSIS 5: Stale closure in useCallback deps ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 5: useCallback Dependency Arrays")
results.append("=" * 70)

empty_deps_callback = 0
for i, line in enumerate(lines, 1):
    if 'useCallback(' in line:
        # Check for empty deps array [], []);
        for j in range(i, min(i+30, len(lines))):
            if '], [])' in lines[j] or '], [ ])' in lines[j]:
                empty_deps_callback += 1
                break
            if re.search(r'\],\s*\[.+\]\)', lines[j]):
                break

results.append(f"useCallback with empty deps []: {empty_deps_callback}")
results.append("(Empty deps means the callback never updates - OK for stable operations)")

with open('pass5_results.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print(f"Results written to pass5_results.txt ({len(results)} lines)")
