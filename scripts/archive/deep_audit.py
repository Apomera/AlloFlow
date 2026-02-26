"""
Deep Performance & Bug Audit — Pass 2
Focuses on:
1. Write-only state deep analysis (are the values truly dead or used via spread/destructure?)
2. Re-render hazard: inline arrow functions as event handlers in JSX
3. Stale closure hazards: useEffect/useCallback with state reads but empty deps []
4. Race conditions: setState inside async functions without cancellation
5. Missing accessibility: buttons without aria-label or title
6. Unreachable code: code after return/break/continue
7. Large useEffect bodies (>30 lines — candidates for extraction)
8. Prop drilling depth: how deep do certain state values go?
9. Hardcoded English strings (i18n gaps)
10. Missing key props in .map() JSX
"""
import sys, re
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

content = ''.join(lines)
out = open('deep_audit.txt', 'w', encoding='utf-8')

def write(msg):
    out.write(msg + '\n')

write("=" * 70)
write("  DEEP PERFORMANCE & BUG AUDIT — PASS 2")
write("=" * 70)

# ============================================================
# 1. WRITE-ONLY STATE DEEP ANALYSIS  
# ============================================================
write("\n" + "=" * 70)
write("  1. WRITE-ONLY STATE — DETAILED ANALYSIS")
write("=" * 70)

use_state_pattern = re.compile(r'const\s+\[(\w+),\s*(set\w+)\]\s*=\s*useState')
state_vars = []
for i, line in enumerate(lines):
    for m in use_state_pattern.finditer(line):
        state_vars.append((m.group(1), m.group(2), i+1))

write_only = []
for getter, setter, line_num in state_vars:
    getter_count = 0
    for i, line in enumerate(lines):
        if i + 1 == line_num:
            continue
        if re.search(r'\b' + re.escape(getter) + r'\b', line):
            getter_count += 1
    if getter_count == 0:
        write_only.append((getter, setter, line_num))

for g, s, ln in write_only:
    # Count setter usages
    setter_uses = []
    for i, line in enumerate(lines):
        if i + 1 == ln:
            continue
        if s in line:
            setter_uses.append((i+1, line.strip()[:80]))
    
    write(f"\n  ⚠️  {g} (L{ln}) — NEVER READ, set {len(setter_uses)} times:")
    for sln, stext in setter_uses[:5]:
        write(f"      L{sln}: {stext}")
    if len(setter_uses) > 5:
        write(f"      ... +{len(setter_uses)-5} more")

# ============================================================
# 2. MISSING KEY PROPS IN .map()
# ============================================================
write("\n" + "=" * 70)
write("  2. MISSING KEY PROPS IN JSX .map()")
write("=" * 70)

map_pattern = re.compile(r'\.map\s*\(')
missing_keys = []
for i, line in enumerate(lines):
    if map_pattern.search(line):
        # Look at the next 5 lines for JSX element opening without key=
        found_jsx = False
        has_key = False
        for j in range(i, min(len(lines), i+8)):
            jline = lines[j]
            if '<' in jline and ('className' in jline or 'onClick' in jline or 'style=' in jline):
                found_jsx = True
            if 'key=' in jline or 'key =' in jline:
                has_key = True
        if found_jsx and not has_key:
            missing_keys.append((i+1, line.strip()[:80]))

write(f"\n  .map() without key= in nearby JSX: {len(missing_keys)}")
if missing_keys:
    write("  (First 20 shown)")
    for ln, text in missing_keys[:20]:
        write(f"    L{ln}: {text}")

# ============================================================
# 3. LARGE useEffect BODIES (>30 lines)
# ============================================================
write("\n" + "=" * 70)
write("  3. LARGE useEffect BODIES (>30 lines)")
write("=" * 70)

effect_starts = []
for i, line in enumerate(lines):
    if 'useEffect(' in line or 'useEffect (' in line:
        effect_starts.append(i)

large_effects = []
for start in effect_starts:
    # Count braces to find the end
    brace_depth = 0
    started = False
    end = start
    for j in range(start, min(len(lines), start + 500)):
        for ch in lines[j]:
            if ch == '{':
                brace_depth += 1
                started = True
            elif ch == '}':
                brace_depth -= 1
        if started and brace_depth <= 0:
            end = j
            break
    
    length = end - start + 1
    if length > 30:
        # Get dependency array
        dep_text = ""
        for j in range(max(start, end-3), end+1):
            if '], [' in lines[j] or '},' in lines[j]:
                dep_text = lines[j].strip()[:60]
        large_effects.append((start+1, length, dep_text))

write(f"\n  useEffect blocks >30 lines: {len(large_effects)}")
if large_effects:
    for ln, length, deps in sorted(large_effects, key=lambda x: -x[1])[:15]:
        write(f"    L{ln}: {length} lines | deps: {deps or '(unknown)'}")

# ============================================================
# 4. STALE CLOSURE HAZARDS
# ============================================================
write("\n" + "=" * 70)
write("  4. STALE CLOSURE HAZARD CANDIDATES")
write("=" * 70)
write("  (useCallback/useMemo with [] deps that read state)")

stale_candidates = []
for i, line in enumerate(lines):
    if ('useCallback(' in line or 'useMemo(' in line) and ', [])' in line:
        # Single-line callbacks with empty deps - check for state reads
        # These are prone to stale closures if they reference state
        state_reads = []
        for g, s, ln in state_vars:
            if g in line and ln != i+1:
                state_reads.append(g)
        if state_reads:
            stale_candidates.append((i+1, state_reads, line.strip()[:80]))

# Also check multi-line callbacks: find ], []); and look back
for i, line in enumerate(lines):
    if line.strip() in ('}, []);', '], []);'):
        # Look back for useCallback/useMemo
        for j in range(max(0, i-50), i):
            if 'useCallback(' in lines[j] or 'useMemo(' in lines[j]:
                # Check lines between j and i for state reads
                block = ''.join(lines[j:i])
                state_reads = []
                for g, s, ln in state_vars:
                    if re.search(r'\b' + re.escape(g) + r'\b', block):
                        state_reads.append(g)
                if len(state_reads) > 2:  # Only flag if multiple state reads
                    stale_candidates.append((j+1, state_reads[:5], lines[j].strip()[:80]))
                break

write(f"\n  Potential stale closures: {len(stale_candidates)}")
if stale_candidates:
    write("  (First 15 shown)")
    for ln, reads, text in stale_candidates[:15]:
        write(f"    L{ln}: reads [{', '.join(reads[:4])}] | {text}")

# ============================================================
# 5. BUTTONS WITHOUT ARIA-LABEL
# ============================================================
write("\n" + "=" * 70)
write("  5. BUTTONS WITHOUT aria-label")
write("=" * 70)

buttons_without_aria = []
for i, line in enumerate(lines):
    if '<button' in line.lower() or '<Button' in line:
        # Look at next 5 lines for aria-label
        has_aria = False
        for j in range(i, min(len(lines), i+6)):
            if 'aria-label' in lines[j]:
                has_aria = True
                break
            if '>' in lines[j] and j > i:  # Closing of opening tag
                break
        if not has_aria:
            buttons_without_aria.append((i+1, line.strip()[:80]))

write(f"\n  Buttons without aria-label: {len(buttons_without_aria)}")
if buttons_without_aria:
    write("  (First 20 shown)")
    for ln, text in buttons_without_aria[:20]:
        write(f"    L{ln}: {text}")

# ============================================================
# 6. HARDCODED ENGLISH STRINGS (i18n gaps)
# ============================================================
write("\n" + "=" * 70)
write("  6. HARDCODED ENGLISH IN JSX (i18n gaps)")
write("=" * 70)

# Look for patterns like >Some English Text< in JSX (outside of comments/strings)
hardcoded_pattern = re.compile(r'>\s*([A-Z][a-z]+(?:\s+[a-z]+){2,})\s*<')
hardcoded = []
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith("'"):
        continue
    for m in hardcoded_pattern.finditer(line):
        text = m.group(1).strip()
        if len(text) > 10 and 'className' not in text and 'onClick' not in text:
            hardcoded.append((i+1, text[:60]))

write(f"\n  Potential hardcoded English phrases: {len(hardcoded)}")
if hardcoded:
    write("  (First 25 shown — many may be intentional)")
    for ln, text in hardcoded[:25]:
        write(f"    L{ln}: \"{text}\"")

# ============================================================
# 7. ASYNC setState RACE CONDITIONS
# ============================================================
write("\n" + "=" * 70)
write("  7. ASYNC setState PATTERNS (potential race conditions)")
write("=" * 70)
write("  (setState calls inside async functions — may read stale state)")

async_setstate = []
for i, line in enumerate(lines):
    # Find setter calls
    for g, s, ln_def in state_vars:
        if s + '(' in line:
            # Check if we're inside an async function (look back 30 lines)
            in_async = False
            for j in range(max(0, i-30), i):
                if 'async ' in lines[j]:
                    in_async = True
                    break
            if in_async:
                # Check if the setter uses functional form (prev => ...) which is safe
                is_functional = re.search(s + r'\s*\(\s*(?:prev|p|old|current)\s*=>', line)
                if not is_functional:
                    # Check if it reads state on the same line
                    reads_state = False
                    for g2, s2, _ in state_vars:
                        if g2 in line and g2 != s and g2 != g:
                            reads_state = True
                            break
                    if reads_state:
                        async_setstate.append((i+1, s, line.strip()[:80]))

write(f"\n  Non-functional setState in async (reads other state): {len(async_setstate)}")
if async_setstate:
    write("  (First 15 shown)")
    for ln, setter, text in async_setstate[:15]:
        write(f"    L{ln}: {setter} | {text}")

# ============================================================
# SUMMARY
# ============================================================
write("\n" + "=" * 70)
write("  SUMMARY")
write("=" * 70)
write(f"  Write-only state vars remaining:     {len(write_only)}")
write(f"  .map() missing key props:            {len(missing_keys)}")
write(f"  Large useEffects (>30 lines):        {len(large_effects)}")
write(f"  Stale closure candidates:            {len(stale_candidates)}")
write(f"  Buttons without aria-label:          {len(buttons_without_aria)}")
write(f"  Hardcoded English phrases:           {len(hardcoded)}")
write(f"  Async setState race candidates:      {len(async_setstate)}")

out.close()
print("Wrote deep_audit.txt")
print("DONE")
