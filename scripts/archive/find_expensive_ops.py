"""
Find expensive computations in render paths that should use useMemo.
Focus on: .filter(), .sort(), .reduce(), .find(), .every(), .some()
that operate on state arrays but aren't inside useMemo/useCallback.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Find lines with array operations NOT inside useMemo or useCallback
expensive_ops = []
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('//') or stripped.startswith('*'):
        continue
    
    # Check for expensive operations
    ops_found = []
    for op in ['.filter(', '.sort(', '.reduce(', '.flatMap(', 'Object.keys(', 'Object.entries(', 'Object.values(', '.slice().sort(', 'Array.from(']:
        if op in stripped:
            ops_found.append(op)
    
    if not ops_found:
        continue
    
    # Check if this is inside a useMemo or useCallback block
    in_memo = False
    in_callback = False
    in_render = False
    brace_depth = 0
    
    for j in range(i-1, max(0, i-100), -1):
        check = lines[j].strip()
        brace_depth += check.count('}') - check.count('{')
        
        if 'useMemo(' in check and brace_depth <= 0:
            in_memo = True
            break
        if 'useCallback(' in check and brace_depth <= 0:
            in_callback = True
            break
        if check.startswith('return (') or check.startswith('return(') or check == 'return (':
            in_render = True
            break
        # Stop if we hit a function definition
        if ('const ' in check and '=' in check and 'useState' not in check and 
            'useRef' not in check and brace_depth <= -2):
            break
    
    # Check if it's a const with useMemo
    is_memo_result = 'useMemo(' in stripped or 'React.useMemo(' in stripped
    
    if not in_memo and not is_memo_result:
        # Determine if this is in the render path (JSX return)
        location = 'callback' if in_callback else ('render' if in_render else 'function')
        
        # Check what array it's operating on
        source_array = ''
        m = re.search(r'(\w+)\.' + re.escape(ops_found[0].replace('(', '')), stripped)
        if m:
            source_array = m.group(1)
        
        expensive_ops.append({
            'line': i + 1,
            'ops': ops_found,
            'location': location,
            'source': source_array,
            'text': stripped[:120],
            'in_render': in_render
        })

# Group by location
render_ops = [o for o in expensive_ops if o['in_render']]
function_ops = [o for o in expensive_ops if o['location'] == 'function']
callback_ops = [o for o in expensive_ops if o['location'] == 'callback']

out = []
out.append(f"=== IN RENDER PATH (HIGHEST IMPACT — re-computed every render): {len(render_ops)} ===")
for o in render_ops[:20]:
    out.append(f"  L{o['line']}: [{o['source']}] {' + '.join(o['ops'])} → {o['text'][:80]}")
if len(render_ops) > 20:
    out.append(f"  ... and {len(render_ops) - 20} more")

out.append(f"\n=== IN FUNCTIONS (medium impact): {len(function_ops)} ===")
for o in function_ops[:10]:
    out.append(f"  L{o['line']}: [{o['source']}] {' + '.join(o['ops'])} → {o['text'][:80]}")
if len(function_ops) > 10:
    out.append(f"  ... and {len(function_ops) - 10} more")

out.append(f"\n=== IN CALLBACKS (already memoized): {len(callback_ops)} ===")

out.append(f"\n=== SUMMARY ===")
out.append(f"  In render: {len(render_ops)} (WRAP IN useMemo)")
out.append(f"  In functions: {len(function_ops)}")
out.append(f"  In callbacks: {len(callback_ops)} (already OK)")
out.append(f"  Total: {len(expensive_ops)}")

result = '\n'.join(out)
with open('expensive_ops.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"Render: {len(render_ops)}, Function: {len(function_ops)}, Callback: {len(callback_ops)}")
