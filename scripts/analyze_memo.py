import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt','r',encoding='utf-8',errors='replace').readlines()

# 1. Hook counts
hooks = {
    'useState': 0,
    'useEffect': 0,
    'useCallback': 0,
    'useMemo': 0,
    'useRef': 0,
    'useContext': 0,
    'useReducer': 0,
}
for l in lines:
    for hook in hooks:
        if hook + '(' in l and not l.strip().startswith('//'):
            hooks[hook] += 1

print("=== HOOK COUNTS ===")
for h, c in sorted(hooks.items(), key=lambda x: -x[1]):
    print(f"  {h}: {c}")

# 2. Sample useCallback dependency arrays (check size)
print("\n=== useCallback DEPENDENCY ARRAYS (sample) ===")
cb_count = 0
for i, line in enumerate(lines):
    if 'useCallback(' in line and not line.strip().startswith('//'):
        cb_count += 1
        # Look forward for the dependency array (], [deps])
        for j in range(i, min(len(lines), i+50)):
            cleaned = lines[j].strip()
            if cleaned.startswith('], ['):
                deps = cleaned[4:cleaned.find(']', 4)] if ']' in cleaned[4:] else cleaned[4:]
                dep_count = len([d.strip() for d in deps.split(',') if d.strip()]) if deps.strip() else 0
                if cb_count <= 10 or dep_count > 5:
                    print(f"  L{i+1}: {dep_count} deps -> {deps[:80]}")
                break
            elif cleaned == '], []);' or cleaned == '], [])':
                print(f"  L{i+1}: 0 deps (empty)")
                break

# 3. Sample useMemo dependency arrays
print(f"\n=== useMemo DEPENDENCY ARRAYS (sample) ===")
memo_count = 0
for i, line in enumerate(lines):
    if 'useMemo(' in line and not line.strip().startswith('//'):
        memo_count += 1
        for j in range(i, min(len(lines), i+30)):
            cleaned = lines[j].strip()
            if '], [' in cleaned:
                dep_start = cleaned.find('], [') + 4
                dep_end = cleaned.find(']', dep_start)
                deps = cleaned[dep_start:dep_end] if dep_end > dep_start else cleaned[dep_start:]
                dep_count = len([d.strip() for d in deps.split(',') if d.strip()]) if deps.strip() else 0
                if memo_count <= 10 or dep_count > 5:
                    print(f"  L{i+1}: {dep_count} deps -> {deps[:80]}")
                break

# 4. Check for stale closure risks: useCallback with empty deps that reference state
print(f"\n=== POTENTIAL STALE CLOSURE RISKS ===")
print(f"  useCallbacks with empty deps []: ", end='')
empty_cb = 0
for i, line in enumerate(lines):
    if 'useCallback(' in line and not line.strip().startswith('//'):
        for j in range(i, min(len(lines), i+50)):
            if lines[j].strip() in ('}, []);', '}, [])'):
                empty_cb += 1
                break
print(f"{empty_cb}")

# 5. React.memo components count
memo_comps = sum(1 for l in lines if '= React.memo(' in l and l.strip().startswith('const '))
print(f"  React.memo components: {memo_comps}")

# 6. Inline object/array props (re-render triggers)
inline_obj = sum(1 for l in lines if 'style={{' in l and not l.strip().startswith('//'))
print(f"  Inline style={{}} objects: {inline_obj}")

print(f"\n  Total lines: {len(lines)}")
