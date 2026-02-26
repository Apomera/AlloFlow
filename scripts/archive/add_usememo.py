"""
Add useMemo to the safest, highest-impact candidates.

Strategy: Only wrap const declarations where:
1. The source array is a state variable (clear dependency)
2. The operation is .filter()/.sort()/.map() (pure computation)
3. The result is used 5+ times (high impact)
4. The line pattern is simple enough to safely transform

Pattern:
  const foo = bar.filter(x => ...)  →  const foo = useMemo(() => bar.filter(x => ...), [bar])
  const foo = bar.filter(x => ...).map(...)  →  const foo = useMemo(() => bar.filter(x => ...).map(...), [bar])

For multi-line declarations, we'll handle the simple single-line cases only.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

changes = 0

# Target: single-line const declarations with .filter/.sort/.map
# that operate on known state arrays and end with ;
# We'll be conservative and only touch lines that are self-contained (end with ;)

for i in range(len(lines)):
    stripped = lines[i].strip()
    
    # Must be a const/let declaration
    if not stripped.startswith('const ') and not stripped.startswith('let '):
        continue
    
    # Must be a single-line expression ending with ;
    if not stripped.endswith(';'):
        continue
    
    # Must contain .filter( or .sort( or .reduce( but NOT .find() 
    # (.find returns a single item, not an array — less impactful)
    has_op = any(op in stripped for op in ['.filter(', '.sort(', '.reduce(', '.flatMap('])
    if not has_op:
        continue
    
    # Must NOT already be wrapped in useMemo
    if 'useMemo(' in stripped or 'useCallback(' in stripped:
        continue
    
    # Extract variable name and source array
    m = re.match(r'^(const|let)\s+(\w+)\s*=\s*(\w+)', stripped)
    if not m:
        continue
    
    var_type = m.group(1)
    var_name = m.group(2)
    source = m.group(3)
    
    # Skip if source is clearly a local variable (lowercase single word not a common state name)
    # We want state arrays like: glossary, history, items, students, profiles, etc.
    
    # Check if inside a useCallback or useMemo already (by scanning backwards)
    in_memo = False
    for j in range(i-1, max(0, i-5), -1):
        check = lines[j].strip()
        if 'useMemo(' in check or 'useCallback(' in check:
            in_memo = True
            break
    if in_memo:
        continue
    
    # Check if inside an event handler or async function (not render path)
    in_handler = False
    brace_depth = 0
    for j in range(i-1, max(0, i-100), -1):
        check = lines[j].strip()
        brace_depth += check.count('}') - check.count('{')
        if ('async' in check and '=>' in check) or 'function' in check:
            if brace_depth <= 0:
                in_handler = True
                break
        if 'useCallback(' in check and brace_depth <= 0:
            in_handler = True
            break
        # Stop searching at component boundary
        if check.startswith('const ') and 'React.memo' in check:
            break
    
    if in_handler:
        continue
    
    # Count downstream usage
    usage_count = 0
    for j in range(i+1, min(i+200, len(lines))):
        if var_name in lines[j]:
            usage_count += 1
    
    # Only wrap if used 3+ times (worth the overhead)
    if usage_count < 3:
        continue
    
    # Extract the expression part: everything after the `const varName = `
    expr_start = stripped.index('=') + 1
    expr = stripped[expr_start:].strip().rstrip(';')
    
    # Build the useMemo version
    indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
    # Determine dependency - use the source array name
    # For chained operations, also check for other state refs
    deps = source
    
    # Check for additional state references in the expression
    # Look for other state variables used in the filter callback
    extra_deps = set()
    for word in re.findall(r'\b([a-zA-Z_]\w+)\b', expr):
        if word in ['filter', 'sort', 'reduce', 'map', 'flatMap', 'slice', 'const', 'let',
                     'true', 'false', 'null', 'undefined', 'return', 'length',
                     'toLowerCase', 'toUpperCase', 'trim', 'includes', 'indexOf',
                     'startsWith', 'endsWith', 'charAt', 'charCodeAt',
                     'Math', 'Date', 'Array', 'Object', 'String', 'Number',
                     'prev', 'item', 'acc', 'val', 'idx', 'index', 'key',
                     'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k',
                     'p', 'n', 'r', 's', 't', 'w', 'x', 'v',
                     source, var_name]:
            continue
        # This might be a state variable used in the filter
        extra_deps.add(word)
    
    # Build deps array  
    all_deps = [source]
    for dep in sorted(extra_deps):
        if len(dep) > 2 and dep[0].islower():  # Likely a variable
            all_deps.append(dep)
    
    # Limit deps to avoid issues
    if len(all_deps) > 5:
        continue  # Too complex, skip
    
    deps_str = ', '.join(all_deps)
    
    new_line = f"{indent}const {var_name} = useMemo(() => {expr}, [{deps_str}]);\n"
    
    if len(new_line) < 200:  # Don't create absurdly long lines
        lines[i] = new_line
        changes += 1
        print(f"  WRAPPED L{i+1} [{usage_count} uses]: {var_name} = {source}.{stripped.split('.')[1][:20]}...")

# Write result
content = ''.join(lines)
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal useMemo wrappings: {changes}")
print("DONE")
