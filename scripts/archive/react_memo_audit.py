"""
React.memo Prop Audit — Phase 1: Find Wasteful Memoization

For each of the 53 React.memo components, check:
1. Does the parent pass inline objects/functions as props? (defeats memo)
2. Does the parent pass stable references (useMemo/useCallback)?
3. What props does each memoized component receive?

Goal: Find components that are wrapped in React.memo but still re-render
because parents pass unstable props (e.g., onClick={() => ...} or data={{...}}).
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()
    lines = content.split('\n')

# ===================================================================
# Step 1: Find all React.memo component definitions
# ===================================================================
memo_components = []
for i, line in enumerate(lines):
    m = re.match(r'^\s*const\s+(\w+)\s*=\s*React\.memo\(', line.strip())
    if m:
        memo_components.append({
            'name': m.group(1),
            'def_line': i + 1,
        })

print(f"Found {len(memo_components)} React.memo components")

# ===================================================================
# Step 2: For each component, find where it's USED (rendered in JSX)
# ===================================================================
out = []

wasteful = []  # Components receiving inline props
efficient = []  # Components receiving stable props
uncertain = []  # Can't determine prop stability

for comp in memo_components:
    name = comp['name']
    
    # Find JSX usage: <ComponentName .../>  or <ComponentName ...>
    pattern = f'<{name}[\\s/>]'
    usages = [(i, lines[i]) for i in range(len(lines)) 
              if re.search(pattern, lines[i])]
    
    if not usages:
        comp['status'] = 'unused'
        continue
    
    # For each usage, check the props being passed
    inline_objects = 0
    inline_functions = 0
    inline_arrays = 0
    stable_props = 0
    
    for usage_line_idx, usage_line in usages:
        # Collect the full JSX element (might span multiple lines)
        jsx_text = usage_line
        # If not self-closing, collect until >
        if '/>' not in usage_line and '>' not in usage_line.split(name, 1)[-1]:
            for j in range(usage_line_idx + 1, min(usage_line_idx + 20, len(lines))):
                jsx_text += '\n' + lines[j]
                if '/>' in lines[j] or '>' in lines[j]:
                    break
        
        # Check for inline object props: prop={{...}}
        inline_objects += len(re.findall(r'=\{\{', jsx_text))
        
        # Check for inline function props: prop={() => ...} or prop={function
        inline_functions += len(re.findall(r'=\{(?:async\s*)?\(', jsx_text))
        
        # Check for inline array props: prop={[...]}
        inline_arrays += len(re.findall(r'=\{\[', jsx_text))
        
        # Check for stable props: prop={variableName} (single identifier)
        stable_props += len(re.findall(r'=\{[a-zA-Z_]\w*\}', jsx_text))
    
    comp['usages'] = len(usages)
    comp['inline_objects'] = inline_objects
    comp['inline_functions'] = inline_functions
    comp['inline_arrays'] = inline_arrays
    comp['stable_props'] = stable_props
    
    total_inline = inline_objects + inline_functions + inline_arrays
    
    if total_inline > 0:
        comp['status'] = 'wasteful'
        wasteful.append(comp)
    else:
        comp['status'] = 'efficient'
        efficient.append(comp)

# ===================================================================
# Step 3: Output report
# ===================================================================
out.append(f"=== REACT.MEMO PROP AUDIT ({len(memo_components)} components) ===\n")

out.append(f"=== WASTEFUL MEMOIZATION ({len(wasteful)}) ===")
out.append("(Components receiving inline objects/functions — React.memo is bypassed)\n")
for comp in sorted(wasteful, key=lambda c: c['inline_objects'] + c['inline_functions'] + c['inline_arrays'], reverse=True):
    total_inline = comp['inline_objects'] + comp['inline_functions'] + comp['inline_arrays']
    out.append(f"  {comp['name']} (L{comp['def_line']}) — {comp['usages']} usage(s)")
    out.append(f"    Inline objects: {comp['inline_objects']}, Inline functions: {comp['inline_functions']}, Inline arrays: {comp['inline_arrays']}")
    out.append(f"    Stable props: {comp['stable_props']}")
    out.append("")

out.append(f"\n=== EFFICIENT MEMOIZATION ({len(efficient)}) ===")
out.append("(Components receiving only stable references — React.memo is working)\n")
for comp in sorted(efficient, key=lambda c: c['def_line']):
    out.append(f"  {comp['name']} (L{comp['def_line']}) — {comp['usages']} usage(s), {comp['stable_props']} stable props")

out.append(f"\n=== SUMMARY ===")
out.append(f"  Total React.memo: {len(memo_components)}")
out.append(f"  Wasteful: {len(wasteful)} (receiving inline props)")
out.append(f"  Efficient: {len(efficient)} (stable props only)")
total_inline_all = sum(c.get('inline_objects', 0) + c.get('inline_functions', 0) + c.get('inline_arrays', 0) for c in wasteful)
out.append(f"  Total inline props defeating memo: {total_inline_all}")

result = '\n'.join(out)
with open('memo_audit.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"\nWasteful: {len(wasteful)}, Efficient: {len(efficient)}")
print(f"Total inline props defeating memo: {total_inline_all}")
print("Report: memo_audit.txt")
