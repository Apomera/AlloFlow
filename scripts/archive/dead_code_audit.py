"""
Dead Code Audit — Phase 1: Function Discovery

Strategy:
1. Find ALL function/const definitions (named functions, arrow functions, React components)
2. For each, count how many times the name appears OUTSIDE its definition
3. If a name appears only at its definition site = DEAD CODE

This handles:
- const foo = () => {} 
- const foo = useCallback(...)
- function foo() {}
- const FooComponent = React.memo(...)
- const FooComponent = React.forwardRef(...)

We exclude:
- State setters (set*) — they're part of useState pairs
- Internal React hooks usage patterns
"""
import sys, re
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

content = ''.join(lines)

# ===================================================================
# Phase 1: Find all function/const definitions
# ===================================================================
definitions = []

for i, line in enumerate(lines):
    stripped = line.strip()
    
    # Skip comments
    if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
        continue
    
    # Pattern 1: const name = (...) => { or const name = async (...) => {
    m = re.match(r'^\s*(const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(', stripped)
    if m:
        name = m.group(2)
        # Exclude state setters, single-letter vars, React hooks results
        if (not name.startswith('set') or len(name) <= 4) and \
           len(name) > 1 and \
           not name.startswith('_') and \
           name not in ['id', 'el', 'fn', 'cb', 'ev']:
            definitions.append({
                'name': name,
                'line': i + 1,
                'type': 'arrow_fn',
                'text': stripped[:100]
            })
        continue
    
    # Pattern 2: const name = useCallback(
    m = re.match(r'^\s*const\s+(\w+)\s*=\s*useCallback\(', stripped)
    if m:
        definitions.append({
            'name': m.group(1),
            'line': i + 1,
            'type': 'callback',
            'text': stripped[:100]
        })
        continue
    
    # Pattern 3: const Name = React.memo( or React.forwardRef(
    m = re.match(r'^\s*const\s+(\w+)\s*=\s*React\.(memo|forwardRef)\(', stripped)
    if m:
        definitions.append({
            'name': m.group(1),
            'line': i + 1, 
            'type': 'component',
            'text': stripped[:100]
        })
        continue
    
    # Pattern 4: function name(
    m = re.match(r'^\s*(?:async\s+)?function\s+(\w+)\s*\(', stripped)
    if m:
        name = m.group(1)
        if len(name) > 1:
            definitions.append({
                'name': name,
                'line': i + 1,
                'type': 'function',
                'text': stripped[:100]
            })
        continue
    
    # Pattern 5: const NAME = value (constants - all caps)
    m = re.match(r'^\s*const\s+([A-Z][A-Z_0-9]+)\s*=\s*', stripped)
    if m:
        name = m.group(1)
        if len(name) > 2:
            definitions.append({
                'name': name,
                'line': i + 1,
                'type': 'constant',
                'text': stripped[:100]
            })
        continue

print(f"Found {len(definitions)} definitions")
print(f"  Arrow functions: {sum(1 for d in definitions if d['type'] == 'arrow_fn')}")
print(f"  Callbacks: {sum(1 for d in definitions if d['type'] == 'callback')}")
print(f"  Components: {sum(1 for d in definitions if d['type'] == 'component')}")
print(f"  Functions: {sum(1 for d in definitions if d['type'] == 'function')}")
print(f"  Constants: {sum(1 for d in definitions if d['type'] == 'constant')}")

# ===================================================================
# Phase 2: Count references for each definition
# ===================================================================
dead_code = []
low_use = []

for defn in definitions:
    name = defn['name']
    
    # Count ALL occurrences of this name in the file
    # Use word boundary to avoid partial matches
    pattern = r'\b' + re.escape(name) + r'\b'
    matches = list(re.finditer(pattern, content))
    total_count = len(matches)
    
    # Subtract the definition itself (typically 1-2 occurrences for const x = ...)
    # A truly dead function appears only at its definition
    # Count occurrences on the DEFINITION LINE
    def_line_content = lines[defn['line'] - 1]
    def_line_count = len(re.findall(pattern, def_line_content))
    
    # Also check the line after (for multi-line definitions that have the name again)
    usage_count = total_count - def_line_count
    
    # For exports, check if the name is in an export statement
    is_exported = f'export {{ {name}' in content or f'export default {name}' in content
    
    if usage_count == 0 and not is_exported:
        dead_code.append({**defn, 'usage_count': usage_count, 'total_count': total_count})
    elif usage_count == 1 and not is_exported:
        low_use.append({**defn, 'usage_count': usage_count, 'total_count': total_count})

# ===================================================================
# Phase 3: Output results
# ===================================================================
out = []
out.append(f"=== DEAD CODE (0 references outside definition): {len(dead_code)} ===\n")

# Group by type
for code_type in ['component', 'callback', 'arrow_fn', 'function', 'constant']:
    items = [d for d in dead_code if d['type'] == code_type]
    if items:
        out.append(f"--- {code_type.upper()} ({len(items)}) ---")
        for d in sorted(items, key=lambda x: x['line']):
            out.append(f"  L{d['line']}: {d['name']} (total:{d['total_count']}, usage:{d['usage_count']})")
            out.append(f"       {d['text']}")
        out.append("")

out.append(f"\n=== LOW USE (1 reference outside definition): {len(low_use)} ===")
for code_type in ['component', 'callback', 'arrow_fn', 'function', 'constant']:
    items = [d for d in low_use if d['type'] == code_type]
    if items:
        out.append(f"--- {code_type.upper()} ({len(items)}) ---")
        for d in sorted(items, key=lambda x: x['line'])[:15]:
            out.append(f"  L{d['line']}: {d['name']}")
        if len(items) > 15:
            out.append(f"  ... and {len(items) - 15} more")
        out.append("")

out.append(f"\n=== SUMMARY ===")
out.append(f"  Total definitions: {len(definitions)}")
out.append(f"  Dead (0 refs): {len(dead_code)}")
out.append(f"  Low use (1 ref): {len(low_use)}")

result = '\n'.join(out)
with open('dead_code_report.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"\nDead code: {len(dead_code)}, Low use: {len(low_use)}")
# Print component dead code specifically (these are the biggest wins)
component_dead = [d for d in dead_code if d['type'] == 'component']
print(f"\nDead COMPONENTS: {len(component_dead)}")
for d in component_dead:
    print(f"  L{d['line']}: {d['name']}")
