"""
Moderate Issues Surgery Script
================================
Scans for and fixes:
  1. Duplicate state definitions (wordSoundsSessionGoal)
  2. Unguarded .map() calls on potentially undefined arrays
  3. Unsafe property access without optional chaining
  4. Silent catch blocks in critical paths (add console.warn)
"""
import sys, os, re

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
MONOLITH = os.path.join(os.path.dirname(__file__), 'AlloFlowANTI.txt')
REPORT = os.path.join(os.path.dirname(__file__), 'moderate_scan.txt')

out = []
def log(msg):
    out.append(msg)
    print(msg)

with open(MONOLITH, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

log(f"Loaded {len(lines)} lines")

# ============================================================
# 1. Duplicate state definitions
# ============================================================
log(f"\n{'='*60}")
log(f"ISSUE 1: DUPLICATE STATE DEFINITIONS")
log(f"{'='*60}")

state_defs = {}
for i, line in enumerate(lines):
    m = re.search(r'const \[(\w+), set\w+\] = React\.useState', line)
    if m:
        name = m.group(1)
        if name not in state_defs:
            state_defs[name] = []
        state_defs[name].append(i + 1)

dupes = {k: v for k, v in state_defs.items() if len(v) > 1}
log(f"Found {len(dupes)} state names with multiple definitions:")
for name, locs in sorted(dupes.items()):
    log(f"  '{name}' at lines: {locs}")
    # Check if they're in separate components (which is OK)
    for loc in locs:
        ctx = lines[max(0,loc-20):loc]
        for cl in ctx:
            if 'const ' in cl and '=>' in cl:
                func_name = cl.strip()[:60]
                log(f"    L{loc} inside: {func_name}")
                break

# ============================================================
# 2. Unguarded .map() calls
# ============================================================
log(f"\n{'='*60}")
log(f"ISSUE 2: UNGUARDED .map() CALLS (within Word Sounds range L2500-L10000)")
log(f"{'='*60}")

map_issues = []
for i in range(2500, min(10000, len(lines))):
    line = lines[i]
    if '.map(' in line:
        stripped = line.strip()
        # Check if there's already a guard (optional chaining or && pattern)
        has_guard = ('?.map(' in stripped or 
                     '&& ' in stripped and '.map(' in stripped.split('&&')[-1] or
                     '|| []' in stripped)
        
        # Extract the variable being mapped
        m = re.search(r'(\w+(?:\.\w+)*)\.map\(', stripped)
        if m:
            var = m.group(1)
            if not has_guard:
                map_issues.append((i+1, var, stripped[:100]))

log(f"Found {len(map_issues)} unguarded .map() calls:")
for ln, var, ctx in map_issues[:20]:
    log(f"  L{ln}: {var}.map(...) -> {ctx}")

# ============================================================
# 3. Unsafe property access (missing optional chaining)
# ============================================================
log(f"\n{'='*60}")
log(f"ISSUE 3: UNSAFE PROPERTY ACCESS (within Word Sounds range L2500-L10000)")
log(f"{'='*60}")

# Look for patterns like: variable.property.length, variable.property.map
# where no ?. is used and the variable could be null
unsafe = []
for i in range(2500, min(10000, len(lines))):
    line = lines[i]
    stripped = line.strip()
    # Pattern: someVar.someProperty.length (without ?.)
    m = re.search(r'(\w+State|\w+Data|\w+Options|\w+Words)\.([\w.]+)\.(length|map|filter|forEach|find|some|every|reduce)', stripped)
    if m and '?.' not in stripped:
        unsafe.append((i+1, m.group(0), stripped[:100]))

log(f"Found {len(unsafe)} potentially unsafe deep property accesses:")
for ln, pattern, ctx in unsafe[:15]:
    log(f"  L{ln}: {pattern} -> {ctx}")

# ============================================================
# 4. Silent catch blocks in critical paths
# ============================================================
log(f"\n{'='*60}")
log(f"ISSUE 4: SILENT CATCH BLOCKS (within Word Sounds range L2500-L10000)")
log(f"{'='*60}")

silent_catches = []
for i in range(2500, min(10000, len(lines))):
    line = lines[i]
    stripped = line.strip()
    if stripped.startswith('catch') or stripped.startswith('} catch'):
        # Check if next 3 lines have any logging
        has_log = False
        for j in range(i+1, min(i+4, len(lines))):
            nxt = lines[j].strip()
            if ('console.' in nxt or 'log(' in nxt or 'warn(' in nxt or 
                'error(' in nxt or 'throw' in nxt):
                has_log = True
                break
        if not has_log:
            # Check if it's just an empty catch or catch with only a comment
            is_empty = True
            for j in range(i+1, min(i+3, len(lines))):
                nxt = lines[j].strip()
                if nxt and nxt != '}' and not nxt.startswith('//'):
                    is_empty = False
                    break
            if is_empty:
                silent_catches.append((i+1, stripped[:80]))

log(f"Found {len(silent_catches)} silent catch blocks:")
for ln, ctx in silent_catches[:15]:
    log(f"  L{ln}: {ctx}")

# Write report
with open(REPORT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
log(f"\nReport written to {REPORT}")
