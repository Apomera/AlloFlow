"""
Find ALL useMemo calls, check their indent level and enclosing scope.
Any useMemo at indent > the component's body indent is INVALID.
For sub-components at indent=0 or 2, their body hooks should be at indent 2-4.
For sub-components nested inside AlloFlowContent at indent=2, body hooks at indent 4.
Any useMemo at indent >= 8 is almost certainly inside a nested function/callback.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read().split('\n')

# Find every useMemo and trace its EXACT enclosing scope
results = []

for i, l in enumerate(lines):
    if 'useMemo(' not in l:
        continue
    
    indent = len(l) - len(l.lstrip())
    s = l.strip()
    ln = i + 1
    
    # Trace upward to find enclosing scope
    enclosing_stack = []
    for j in range(i - 1, max(0, i - 500), -1):
        prev = lines[j]
        prev_s = prev.strip()
        prev_indent = len(prev) - len(prev.lstrip())
        
        if prev_indent < indent:
            if any(keyword in prev_s for keyword in ['const ', 'function ', 'let ', 'async ']):
                enclosing_stack.append(f"L{j+1} (indent={prev_indent}): {prev_s[:100]}")
                indent = prev_indent  # Narrow scope
            elif prev_s.startswith('{') or prev_s.startswith('('):
                pass  # Skip bare braces
    
    # Determine validity:
    # A useMemo is valid ONLY if its immediate enclosing scope is a React component
    # React components: const Name = React.memo(...), const Name = (...) => {, function Name()
    actual_indent = len(l) - len(l.lstrip())
    is_valid = True
    reason = ""
    
    # Get first enclosing
    if enclosing_stack:
        first_enclosing = enclosing_stack[0]
        # Check if it's a React component or hook
        if any(kw in first_enclosing for kw in ['React.memo', 'forwardRef', 'useCallback', 'useEffect']):
            if 'useCallback' in first_enclosing or 'useEffect' in first_enclosing:
                is_valid = False
                reason = "inside useCallback/useEffect"
            else:
                is_valid = True
        elif re.search(r'const [A-Z]', first_enclosing):
            is_valid = True
        elif re.search(r'function [A-Z]', first_enclosing):
            is_valid = True
        elif re.search(r'const [a-z]', first_enclosing):
            is_valid = False
            reason = "inside regular function"
        elif '.map(' in first_enclosing or '.forEach(' in first_enclosing:
            is_valid = False
            reason = "inside .map/.forEach callback"
    
    # High indent is a red flag
    if actual_indent >= 12:
        is_valid = False
        reason = f"extremely deep nesting (indent={actual_indent})"
    
    status = "✅" if is_valid else "❌"
    results.append({
        'line': ln,
        'indent': actual_indent,
        'text': l.strip()[:120],
        'valid': is_valid,
        'reason': reason,
        'enclosing': enclosing_stack[0] if enclosing_stack else 'NONE',
        'status': status
    })

with open('usememo_final_audit.txt', 'w', encoding='utf-8') as f:
    f.write(f"Total useMemo: {len(results)}\n")
    f.write(f"Valid: {sum(1 for r in results if r['valid'])}\n")
    f.write(f"Invalid: {sum(1 for r in results if not r['valid'])}\n\n")
    
    for r in results:
        f.write(f"{r['status']} L{r['line']} (indent={r['indent']}): {r['text']}\n")
        f.write(f"  Enclosing: {r['enclosing']}\n")
        if r['reason']:
            f.write(f"  Reason: {r['reason']}\n")
        f.write('\n')

print(f"Total: {len(results)}, Valid: {sum(1 for r in results if r['valid'])}, Invalid: {sum(1 for r in results if not r['valid'])}")
for r in results:
    if not r['valid']:
        print(f"  ❌ L{r['line']} (indent={r['indent']}): {r['text'][:80]} — {r['reason']}")
