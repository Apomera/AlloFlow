"""
useCallback Dependency Audit

For each useCallback, extract:
1. The function name
2. State/prop variables referenced INSIDE the callback body
3. The dependency array
4. Flag MISSING dependencies (state var used in body but not in deps)
5. Flag STALE dependencies (dep listed but not used in body)

Stale closure risks:
- If a callback reads `someState` but deps are `[]`, it will always see the initial value
- If a callback reads `someState` but deps only include `[t]`, same problem
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()
    lines = content.split('\n')

# ===================================================================
# Step 1: Find all useCallback definitions
# ===================================================================
callbacks = []

i = 0
while i < len(lines):
    line = lines[i]
    
    # Match: const name = useCallback(
    m = re.match(r'^\s*const\s+(\w+)\s*=\s*useCallback\(', line)
    if m:
        name = m.group(1)
        start_line = i
        
        # Collect the full callback body until we find the closing ], [deps]);
        depth = 0
        body_lines = []
        deps_text = None
        found_end = False
        
        for j in range(i, min(i + 200, len(lines))):
            body_lines.append(lines[j])
            
            # Track brace depth
            for ch in lines[j]:
                if ch in '{(':
                    depth += 1
                elif ch in '})':
                    depth -= 1
            
            # Look for the dependency array: ], [deps]);
            dep_match = re.search(r'\},\s*\[([^\]]*)\]\)', lines[j])
            if dep_match and depth <= 1:
                deps_text = dep_match.group(1).strip()
                found_end = True
                break
            
            # Alternative: }, [deps]);  on next line
            if depth <= 0 and j > i:
                # Check if NEXT line has the deps
                if j + 1 < len(lines):
                    next_dep = re.search(r'^\s*\},?\s*\[([^\]]*)\]\)', lines[j + 1])
                    if next_dep:
                        deps_text = next_dep.group(1).strip()
                        body_lines.append(lines[j + 1])
                        found_end = True
                        break
        
        if found_end:
            body_text = '\n'.join(body_lines)
            
            # Parse dependency array
            if deps_text == '':
                deps = []
            else:
                deps = [d.strip() for d in deps_text.split(',') if d.strip()]
            
            callbacks.append({
                'name': name,
                'line': start_line + 1,
                'body': body_text,
                'deps': deps,
                'deps_text': deps_text,
                'line_count': len(body_lines)
            })
        
        i = start_line + len(body_lines)
    else:
        i += 1

print(f"Found {len(callbacks)} useCallback hooks")

# ===================================================================
# Step 2: Analyze each callback for stale closures
# ===================================================================

# Known state variables (from useState) — these are the risky ones
# We'll pattern-match: any variable that matches set* pattern or known names
# More importantly, we look for specific state vars used in the body

# Build a set of known state variables
state_vars = set()
for line in lines:
    m = re.match(r'^\s*const\s*\[\s*(\w+)\s*,\s*set(\w+)\s*\]\s*=\s*useState', line)
    if m:
        state_vars.add(m.group(1))

# Also add reducer state
for line in lines:
    m = re.match(r'^\s*const\s*\[\s*(\w+)\s*,\s*(\w+Dispatch)\s*\]\s*=\s*useReducer', line)
    if m:
        state_vars.add(m.group(1))

print(f"Found {len(state_vars)} state variables")

# Known safe patterns (don't need to be in deps):
safe_patterns = {
    'setSettings', 'setState', 'dispatch', 'warnLog', 'addToast',
    'playSound', 'navigator', 'window', 'document', 'localStorage',
    'console', 'JSON', 'Math', 'Date', 'Object', 'Array', 'String',
    'parseInt', 'parseFloat', 'setTimeout', 'setInterval', 'clearTimeout',
    'clearInterval', 'fetch', 'Promise', 'Error', 'RegExp',
    'db', 'doc', 'collection', 'updateDoc', 'setDoc', 'getDoc',
    'deleteDoc', 'onSnapshot', 'query', 'where', 'orderBy',
}

# Add all state SETTERS as safe (they're stable by React guarantee)
for line in lines:
    m = re.match(r'^\s*const\s*\[\s*\w+\s*,\s*(set\w+)\s*\]\s*=\s*useState', line)
    if m:
        safe_patterns.add(m.group(1))

# Add all dispatch functions as safe
for line in lines:
    m = re.match(r'^\s*const\s*\[\s*\w+\s*,\s*(\w+)\s*\]\s*=\s*useReducer', line)
    if m:
        safe_patterns.add(m.group(1))

# Also add refs as safe
for line in lines:
    m = re.match(r'^\s*const\s+(\w+)\s*=\s*useRef', line)
    if m:
        safe_patterns.add(m.group(1))

print(f"Built {len(safe_patterns)} safe patterns")

# Analyze each callback
missing_deps = []  # Callbacks with state vars used but not in deps
empty_deps_with_state = []  # Callbacks with [] deps but reading state

for cb in callbacks:
    body = cb['body']
    deps = set(cb['deps'])
    
    # Find state variables referenced in the body
    used_state = set()
    for sv in state_vars:
        # Use word boundary match
        if re.search(r'\b' + re.escape(sv) + r'\b', body):
            # Check it's not just the definition line
            if sv not in safe_patterns:
                used_state.add(sv)
    
    # Find which used state vars are NOT in the dependency array
    missing = used_state - deps
    
    # Filter out false positives:
    # - Variables used in string literals
    # - Variables that are the callback's own argument names
    # - State vars accessed via ref.current pattern
    
    # Get callback arguments
    arg_match = re.search(r'\(([^)]*)\)\s*=>', body.split('\n')[0])
    if arg_match:
        args = set(a.strip().split('=')[0].strip() for a in arg_match.group(1).split(','))
        missing -= args
    
    if missing:
        severity = 'HIGH' if len(cb['deps']) == 0 and len(missing) > 0 else 'MEDIUM'
        cb['missing'] = missing
        cb['severity'] = severity
        cb['used_state'] = used_state
        
        if len(cb['deps']) == 0:
            empty_deps_with_state.append(cb)
        else:
            missing_deps.append(cb)

# ===================================================================
# Step 3: Output report
# ===================================================================
out = []
out.append(f"=== useCallback DEPENDENCY AUDIT ({len(callbacks)} callbacks) ===\n")

out.append(f"=== EMPTY DEPS [] WITH STATE ACCESS ({len(empty_deps_with_state)}) — HIGHEST RISK ===")
out.append("(These callbacks close over initial state values and NEVER update)\n")

for cb in sorted(empty_deps_with_state, key=lambda c: len(c.get('missing', set())), reverse=True)[:30]:
    out.append(f"  {cb['name']} (L{cb['line']}, {cb['line_count']} lines)")
    out.append(f"    Deps: [{cb['deps_text']}]")
    out.append(f"    Missing: {', '.join(sorted(cb['missing']))}")
    out.append("")

out.append(f"\n=== PARTIAL DEPS WITH MISSING STATE ({len(missing_deps)}) — MEDIUM RISK ===")
out.append("(These callbacks have some deps but are missing state refs)\n")

for cb in sorted(missing_deps, key=lambda c: len(c.get('missing', set())), reverse=True)[:30]:
    out.append(f"  {cb['name']} (L{cb['line']}, {cb['line_count']} lines)")
    out.append(f"    Deps: [{cb['deps_text']}]")
    out.append(f"    Missing: {', '.join(sorted(cb['missing']))}")
    out.append("")

safe_count = len(callbacks) - len(empty_deps_with_state) - len(missing_deps)
out.append(f"\n=== SUMMARY ===")
out.append(f"  Total useCallbacks: {len(callbacks)}")
out.append(f"  Empty deps with state access: {len(empty_deps_with_state)} (HIGH risk)")
out.append(f"  Partial deps missing state: {len(missing_deps)} (MEDIUM risk)")
out.append(f"  Clean (no issues found): {safe_count}")

result = '\n'.join(out)
with open('callback_audit.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"\nHIGH risk (empty deps): {len(empty_deps_with_state)}")
print(f"MEDIUM risk (partial deps): {len(missing_deps)}")
print(f"Clean: {safe_count}")
print("Report: callback_audit.txt")
