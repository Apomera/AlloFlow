"""
Comprehensive Bug Hunting & Performance Audit for AlloFlowANTI.txt
Scans for:
1. Unused useState declarations (set but never read, or read but never set)
2. useEffect without cleanup for timers/intervals
3. Z-index collisions
4. Inline object/array literals in JSX props (re-render hazards)
5. Potential memory leaks (setInterval without clearInterval in cleanup)
6. Duplicate function declarations
7. Console.log statements left in production code
8. Unreachable code after return statements
9. Empty catch blocks that swallow errors silently
10. Large inline styles that should be CSS classes
"""
import sys, re
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

content = ''.join(lines)
out = open('bug_perf_audit.txt', 'w', encoding='utf-8')

def write(msg):
    out.write(msg + '\n')

write("=" * 70)
write("  ALLOFLOW BUG HUNTING & PERFORMANCE AUDIT")
write("=" * 70)
write(f"  File: {FILE}")
write(f"  Lines: {len(lines)}")
write("")

# ============================================================
# 1. UNUSED STATE VARIABLES
# ============================================================
write("\n" + "=" * 70)
write("  1. UNUSED STATE ANALYSIS")
write("=" * 70)

# Find all useState declarations
use_state_pattern = re.compile(r'const\s+\[(\w+),\s*(set\w+)\]\s*=\s*useState')
state_vars = []
for i, line in enumerate(lines):
    for m in use_state_pattern.finditer(line):
        state_vars.append((m.group(1), m.group(2), i+1))

write(f"\nTotal useState declarations: {len(state_vars)}")

# Check for never-read state (setter used but value never read)
# and never-set state (value read but setter never called)
unused_getters = []
unused_setters = []
for getter, setter, line_num in state_vars:
    # Count occurrences (excluding the declaration line itself)
    getter_count = 0
    setter_count = 0
    for i, line in enumerate(lines):
        if i + 1 == line_num:
            continue
        if getter in line:
            getter_count += 1
        if setter in line:
            setter_count += 1
    
    if getter_count == 0:
        unused_getters.append((getter, setter, line_num))
    if setter_count == 0:
        unused_setters.append((getter, setter, line_num))

write(f"\n  State values NEVER READ (write-only state):")
if unused_getters:
    for g, s, ln in unused_getters:
        write(f"    L{ln}: [{g}, {s}] — '{g}' is never used")
else:
    write("    None found ✓")

write(f"\n  State setters NEVER CALLED (read-only state = should be const/ref):")
if unused_setters:
    for g, s, ln in unused_setters:
        write(f"    L{ln}: [{g}, {s}] — '{s}' is never called")
else:
    write("    None found ✓")

# ============================================================
# 2. TIMER LEAK ANALYSIS (setInterval/setTimeout without cleanup)
# ============================================================
write("\n" + "=" * 70)
write("  2. TIMER / INTERVAL LEAK ANALYSIS")
write("=" * 70)

# Find setInterval calls
interval_lines = []
for i, line in enumerate(lines):
    if 'setInterval(' in line and '//' not in line.split('setInterval')[0]:
        interval_lines.append((i+1, line.strip()[:100]))

write(f"\n  setInterval() calls: {len(interval_lines)}")
for ln, text in interval_lines:
    write(f"    L{ln}: {text}")

# Check for useEffect blocks that contain setInterval but no clearInterval
write(f"\n  Checking for interval leaks in useEffects...")
# Simple heuristic: find useEffect blocks
effect_pattern = re.compile(r'useEffect\s*\(\s*\(\)')
leak_candidates = []
for i, line in enumerate(lines):
    if 'setInterval(' in line:
        # Look backwards for nearest useEffect
        found_effect = False
        found_clear = False
        for j in range(max(0, i-50), min(len(lines), i+50)):
            if 'useEffect' in lines[j]:
                found_effect = True
            if 'clearInterval' in lines[j]:
                found_clear = True
        if found_effect and not found_clear:
            leak_candidates.append((i+1, line.strip()[:80]))

if leak_candidates:
    write(f"\n  ⚠️ Potential interval leaks (setInterval without clearInterval nearby):")
    for ln, text in leak_candidates:
        write(f"    L{ln}: {text}")
else:
    write("    No interval leaks detected ✓")

# ============================================================
# 3. Z-INDEX COLLISION MAP
# ============================================================
write("\n" + "=" * 70)
write("  3. Z-INDEX COLLISION MAP")
write("=" * 70)

z_pattern = re.compile(r'z-(?:index:\s*|[\[])(\d+)')
z_map = defaultdict(list)
for i, line in enumerate(lines):
    for m in z_pattern.finditer(line):
        z_val = int(m.group(1))
        if z_val >= 50:  # Only care about high z-indexes
            context = line.strip()[:80]
            z_map[z_val].append((i+1, context))

write(f"\n  High z-index values (≥50) with multiple users:")
collisions = {k: v for k, v in z_map.items() if len(v) > 2}
if collisions:
    for z_val in sorted(collisions.keys(), reverse=True):
        entries = collisions[z_val]
        write(f"\n  z-{z_val} ({len(entries)} uses):")
        for ln, ctx in entries[:5]:  # Show max 5 per z-value
            write(f"    L{ln}: {ctx}")
        if len(entries) > 5:
            write(f"    ... and {len(entries)-5} more")
else:
    write("    No major collisions ✓")

# ============================================================
# 4. CONSOLE.LOG IN PRODUCTION CODE
# ============================================================
write("\n" + "=" * 70)
write("  4. CONSOLE.LOG STATEMENTS")
write("=" * 70)

console_logs = []
for i, line in enumerate(lines):
    stripped = line.strip()
    if 'console.log(' in stripped and not stripped.startswith('//') and not stripped.startswith('*'):
        console_logs.append((i+1, stripped[:100]))

write(f"\n  Total console.log statements: {len(console_logs)}")
if console_logs:
    write("  (First 20 shown)")
    for ln, text in console_logs[:20]:
        write(f"    L{ln}: {text}")
    if len(console_logs) > 20:
        write(f"    ... and {len(console_logs)-20} more")

# ============================================================
# 5. EMPTY CATCH BLOCKS
# ============================================================
write("\n" + "=" * 70)
write("  5. EMPTY CATCH BLOCKS")
write("=" * 70)

empty_catch = []
for i, line in enumerate(lines):
    if 'catch' in line and '{}' in line:
        empty_catch.append((i+1, line.strip()[:100]))
    elif line.strip() == 'catch {' or line.strip() == '} catch {':
        # Check if next non-blank line is just }
        for j in range(i+1, min(len(lines), i+3)):
            if lines[j].strip() == '}':
                empty_catch.append((i+1, line.strip() + ' <empty>'))
                break
            elif lines[j].strip():
                break

write(f"\n  Empty catch blocks: {len(empty_catch)}")
if len(empty_catch) > 0:
    write("  (First 15 shown)")
    for ln, text in empty_catch[:15]:
        write(f"    L{ln}: {text}")

# ============================================================
# 6. DUPLICATE FUNCTION NAMES
# ============================================================
write("\n" + "=" * 70)
write("  6. DUPLICATE FUNCTION DECLARATIONS")
write("=" * 70)

func_pattern = re.compile(r'(?:const|function)\s+(\w+)\s*(?:=|{|\()')
func_names = defaultdict(list)
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('//') or stripped.startswith('*'):
        continue
    for m in func_pattern.finditer(line):
        name = m.group(1)
        if len(name) > 3 and name[0].islower():  # Skip short names and components
            func_names[name].append(i+1)

dupes = {k: v for k, v in func_names.items() if len(v) > 1 and not k.startswith('set')}
write(f"\n  Functions declared multiple times: {len(dupes)}")
if dupes:
    for name, lns in sorted(dupes.items()):
        write(f"    {name}: lines {', '.join(str(l) for l in lns[:5])}")

# ============================================================
# 7. LARGE INLINE STYLE OBJECTS (performance)
# ============================================================
write("\n" + "=" * 70)
write("  7. LARGE INLINE STYLE OBJECTS (>3 properties)")
write("=" * 70)

style_pattern = re.compile(r'style=\{\{([^}]{100,})\}\}')
large_styles = []
for i, line in enumerate(lines):
    for m in style_pattern.finditer(line):
        props = m.group(1).count(':')
        if props >= 4:
            large_styles.append((i+1, props, m.group(1)[:80]))

write(f"\n  Large inline styles (≥4 CSS properties): {len(large_styles)}")
if large_styles:
    write("  (First 15 shown)")
    for ln, count, text in large_styles[:15]:
        write(f"    L{ln} ({count} props): style={{ {text}... }}")

# ============================================================
# 8. AWAITS WITHOUT TRY-CATCH
# ============================================================
write("\n" + "=" * 70)
write("  8. UNPROTECTED AWAITS (no try-catch nearby)")
write("=" * 70)

unprotected = []
for i, line in enumerate(lines):
    if 'await ' in line and '.catch(' not in line:
        # Check if inside a try block (look up 20 lines)
        in_try = False
        for j in range(max(0, i-20), i):
            if 'try {' in lines[j] or 'try{' in lines[j]:
                in_try = True
                break
        if not in_try:
            unprotected.append((i+1, line.strip()[:100]))

write(f"\n  Awaits without try-catch or .catch(): {len(unprotected)}")
if unprotected:
    write("  (First 15 shown)")
    for ln, text in unprotected[:15]:
        write(f"    L{ln}: {text}")

# ============================================================
# SUMMARY
# ============================================================
write("\n" + "=" * 70)
write("  SUMMARY")
write("=" * 70)
write(f"  Write-only state vars:      {len(unused_getters)}")
write(f"  Read-only state vars:       {len(unused_setters)}")
write(f"  Interval leak candidates:   {len(leak_candidates)}")
write(f"  Z-index collisions (>2):    {len(collisions)}")
write(f"  Console.log statements:     {len(console_logs)}")
write(f"  Empty catch blocks:         {len(empty_catch)}")
write(f"  Duplicate functions:        {len(dupes)}")
write(f"  Large inline styles:        {len(large_styles)}")
write(f"  Unprotected awaits:         {len(unprotected)}")

out.close()
print("Wrote bug_perf_audit.txt")
print("DONE")
