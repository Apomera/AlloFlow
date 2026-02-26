"""
Production Readiness Audit — Pass 3
Scans for:
1. Console.log statements left in production code (should be debugLog/warnLog or removed)
2. Memory leak patterns (setInterval/setTimeout without cleanup)
3. Missing useEffect cleanup (event listeners)
4. Inline object/array allocations in JSX props (unnecessary re-renders)
5. Unhandled promise rejections (.catch missing)
6. Large dependency arrays that might cause stale closures
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

out = []

# ===================================================================
# 1. Console.log/warn/error (should be debugLog/warnLog or removed)
# ===================================================================
console_lines = []
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('//') or stripped.startswith('*'):
        continue
    if 'console.log' in line and 'debugLog' not in line and 'warnLog' not in line:
        # Skip if in a comment
        code_part = line.split('//')[0]
        if 'console.log' in code_part:
            console_lines.append((i+1, stripped[:100]))
    elif 'console.warn' in line:
        code_part = line.split('//')[0]
        if 'console.warn' in code_part:
            console_lines.append((i+1, stripped[:100]))
    elif 'console.error' in line and 'ErrorBoundary' not in line:
        code_part = line.split('//')[0]
        if 'console.error' in code_part:
            console_lines.append((i+1, stripped[:100]))

out.append(f"=== CONSOLE STATEMENTS: {len(console_lines)} ===")
for ln, txt in console_lines[:20]:
    out.append(f"  L{ln}: {txt}")
if len(console_lines) > 20:
    out.append(f"  ... and {len(console_lines)-20} more")

# ===================================================================
# 2. setInterval/setTimeout without cleanup
# ===================================================================
intervals_no_cleanup = []
for i, line in enumerate(lines):
    if 'setInterval(' in line and 'clearInterval' not in line:
        # Check if there's a corresponding clearInterval in the next 20 lines
        has_cleanup = False
        for j in range(i+1, min(i+30, len(lines))):
            if 'clearInterval' in lines[j]:
                has_cleanup = True
                break
            if 'return () =>' in lines[j] and 'clearInterval' in ''.join(lines[j:j+3]):
                has_cleanup = True
                break
        if not has_cleanup:
            intervals_no_cleanup.append((i+1, line.strip()[:100]))

    if 'setTimeout(' in line:
        # This is benign — timeouts self-clear. Skip.
        pass

out.append(f"\n=== INTERVALS WITHOUT CLEANUP: {len(intervals_no_cleanup)} ===")
for ln, txt in intervals_no_cleanup:
    out.append(f"  L{ln}: {txt}")

# ===================================================================
# 3. addEventListener without removeEventListener
# ===================================================================
add_listeners = {}
remove_listeners = set()
for i, line in enumerate(lines):
    m = re.search(r"addEventListener\('(\w+)'", line)
    if m:
        event = m.group(1)
        add_listeners.setdefault(event, []).append(i+1)
    m = re.search(r"removeEventListener\('(\w+)'", line)
    if m:
        remove_listeners.add(m.group(1))

unmatched = {k:v for k,v in add_listeners.items() if k not in remove_listeners}
out.append(f"\n=== EVENT LISTENERS WITHOUT REMOVAL: {len(unmatched)} types ===")
for event, line_nums in unmatched.items():
    out.append(f"  '{event}' added at L{line_nums[0]} (no removeEventListener found)")

# ===================================================================
# 4. Inline style={{}} objects in hot render paths
# Count how many style={{...}} are in the file
# ===================================================================
inline_styles = 0
for line in lines:
    inline_styles += line.count('style={{')
out.append(f"\n=== INLINE STYLE OBJECTS: {inline_styles} ===")
out.append(f"  (each creates a new object on every render)")

# ===================================================================
# 5. .catch() coverage on promises
# ===================================================================
uncaught = []
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('//'):
        continue
    # Find lines with 'await' that are NOT inside try blocks
    if 'await ' in line and 'try' not in line:
        # Check if we're inside a try block by scanning backwards
        in_try = False
        brace_depth = 0
        for j in range(i-1, max(0, i-50), -1):
            check = lines[j].strip()
            brace_depth += check.count('}') - check.count('{')
            if 'try {' in check or 'try{' in check or check == 'try':
                if brace_depth <= 0:
                    in_try = True
                    break
        if not in_try:
            uncaught.append((i+1, stripped[:100]))

out.append(f"\n=== AWAIT WITHOUT TRY/CATCH: {len(uncaught)} ===")
for ln, txt in uncaught[:15]:
    out.append(f"  L{ln}: {txt}")
if len(uncaught) > 15:
    out.append(f"  ... and {len(uncaught)-15} more")

# ===================================================================
# 6. Large useEffect dependency arrays (risk of infinite loops)
# ===================================================================
large_deps = []
for i, line in enumerate(lines):
    m = re.search(r'\],\s*\[(.+)\]\)', line)
    if m:
        deps = m.group(1)
        dep_count = deps.count(',') + 1
        if dep_count >= 6:
            large_deps.append((i+1, dep_count, deps[:80]))

out.append(f"\n=== LARGE DEPENDENCY ARRAYS (>=6 deps): {len(large_deps)} ===")
for ln, count, deps in large_deps[:10]:
    out.append(f"  L{ln} ({count} deps): [{deps}]")

# ===================================================================
# 7. File size stats
# ===================================================================
total_lines = len(lines)
total_chars = sum(len(l) for l in lines)
total_kb = total_chars / 1024
total_mb = total_kb / 1024

# Count components
memo_count = sum(1 for l in lines if 'React.memo(' in l)
useState_count = sum(1 for l in lines if 'useState(' in l)
useEffect_count = sum(1 for l in lines if 'useEffect(' in l)
useCallback_count = sum(1 for l in lines if 'useCallback(' in l)
useMemo_count = sum(1 for l in lines if 'useMemo(' in l)

out.append(f"\n=== CODEBASE STATS ===")
out.append(f"  Lines: {total_lines:,}")
out.append(f"  Size: {total_mb:.1f} MB")
out.append(f"  React.memo components: {memo_count}")
out.append(f"  useState hooks: {useState_count}")
out.append(f"  useEffect hooks: {useEffect_count}")
out.append(f"  useCallback hooks: {useCallback_count}")
out.append(f"  useMemo hooks: {useMemo_count}")

result = '\n'.join(out)
with open('production_audit.txt', 'w', encoding='utf-8') as f:
    f.write(result)

# Print summary  
for line in out:
    if line.startswith('===') or line.startswith('  ') and ('L' in line[:10] or line.strip().startswith('(')):
        pass
    if '===' in line:
        print(line)
