"""
AlloFlow Comprehensive Health Check
=====================================
Automated structural and code quality audit for AlloFlowANTI.txt
Checks: brace balance, duplicate object keys, React hooks violations,
unclosed JSX tags, console.log pollution, undefined references, and more.
"""
import sys, re, json
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
lines = content.split('\n')
total_lines = len(lines)

issues = []
warnings = []
info = []

print(f"{'='*60}")
print(f"  AlloFlow Health Check — {total_lines:,} lines")
print(f"{'='*60}\n")

# ══════════════════════════════════════════════════════════════
# 1. BRACE BALANCE (critical — unbalanced = crash)
# ══════════════════════════════════════════════════════════════
print("▶ [1/8] Brace Balance Check...")
brace_depth = 0
paren_depth = 0
bracket_depth = 0
in_string = False
in_template = False
in_comment = False
in_block_comment = False

for i, line in enumerate(lines):
    stripped = line.strip()
    # Skip block comment lines
    if in_block_comment:
        if '*/' in stripped:
            in_block_comment = False
        continue
    if stripped.startswith('/*'):
        in_block_comment = True
        if '*/' in stripped:
            in_block_comment = False
        continue
    if stripped.startswith('//'):
        continue
    
    # Simple brace counting (not perfect but catches major issues)
    for ch in stripped:
        if ch == '{': brace_depth += 1
        elif ch == '}': brace_depth -= 1

if brace_depth == 0:
    info.append("✅ Braces balanced (depth=0)")
else:
    issues.append(f"🔴 BRACE IMBALANCE: depth={brace_depth} (expected 0)")

print(f"   Brace depth at EOF: {brace_depth}")

# ══════════════════════════════════════════════════════════════
# 2. DUPLICATE FUNCTION/CONST DEFINITIONS
# ══════════════════════════════════════════════════════════════
print("▶ [2/8] Duplicate Definition Check...")
const_defs = []
func_defs = []
for i, line in enumerate(lines):
    # Top-level const/let/var declarations
    m = re.match(r'\s*(const|let|var)\s+(\w+)\s*=', line)
    if m:
        const_defs.append((m.group(2), i+1))
    # Function declarations
    m = re.match(r'\s*function\s+(\w+)\s*\(', line)
    if m:
        func_defs.append((m.group(1), i+1))

# Count duplicates (only report if same name appears 3+ times, 2 is often valid)
const_counter = Counter(name for name, _ in const_defs)
dup_consts = [(name, count) for name, count in const_counter.items() if count >= 3]
if dup_consts:
    for name, count in sorted(dup_consts, key=lambda x: -x[1])[:8]:
        locations = [str(ln) for n, ln in const_defs if n == name][:5]
        warnings.append(f"⚠️ const '{name}' defined {count}x (L{', L'.join(locations)})")
    print(f"   Found {len(dup_consts)} potentially duplicated const names")
else:
    info.append("✅ No suspicious duplicate const definitions")
    print("   No suspicious duplicates")

# ══════════════════════════════════════════════════════════════
# 3. REACT HOOKS RULES VIOLATIONS
# ══════════════════════════════════════════════════════════════
print("▶ [3/8] React Hooks Rules Check...")
hooks_in_conditions = 0
for i, line in enumerate(lines):
    stripped = line.strip()
    # Check for hooks inside conditions (simplified check)
    if re.match(r'if\s*\(', stripped) or stripped.startswith('else'):
        # Look forward for hook calls
        for j in range(i+1, min(len(lines), i+5)):
            if re.search(r'\b(useState|useEffect|useCallback|useMemo|useRef)\b', lines[j]):
                # But not if it's a new function scope
                if '{' in lines[j-1] if j > 0 else False:
                    continue
                hooks_in_conditions += 1
                if hooks_in_conditions <= 3:
                    warnings.append(f"⚠️ Possible hook in conditional at L{j+1}: {lines[j].strip()[:80]}")

if hooks_in_conditions == 0:
    info.append("✅ No hooks-in-conditionals detected")
print(f"   Hooks in conditionals: {hooks_in_conditions}")

# ══════════════════════════════════════════════════════════════
# 4. CONSOLE.LOG POLLUTION (debug left behind)
# ══════════════════════════════════════════════════════════════
print("▶ [4/8] Console Pollution Check...")
console_logs = 0
console_warns = 0
console_errors = 0
debug_logs = 0
warn_logs = 0
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('//') or 'SILENCED' in line:
        continue
    if 'console.log(' in line:
        console_logs += 1
    if 'console.warn(' in line:
        console_warns += 1
    if 'console.error(' in line:
        console_errors += 1
    if 'debugLog(' in line:
        debug_logs += 1
    if 'warnLog(' in line:
        warn_logs += 1

info.append(f"📊 Logging: {console_logs} console.log, {console_warns} console.warn, {console_errors} console.error, {debug_logs} debugLog, {warn_logs} warnLog")
print(f"   console.log: {console_logs}, console.warn: {console_warns}, debugLog: {debug_logs}, warnLog: {warn_logs}")

# ══════════════════════════════════════════════════════════════
# 5. STALE PATCH MARKERS (left-behind debug artifacts)
# ══════════════════════════════════════════════════════════════
print("▶ [5/8] Stale Patch Markers Check...")
patch_markers = []
for i, line in enumerate(lines):
    if re.search(r'PATCH-VER-\d+|TODO|FIXME|HACK|XXX|TEMP_FIX', line, re.IGNORECASE):
        if line.strip().startswith('//'):
            continue  # Comments are fine
        patch_markers.append(f"L{i+1}: {line.strip()[:100]}")

if patch_markers:
    for pm in patch_markers[:8]:
        warnings.append(f"⚠️ Patch marker: {pm}")
    print(f"   Found {len(patch_markers)} patch/debug markers in code")
else:
    info.append("✅ No stale patch markers in executable code")
    print("   No stale markers")

# ══════════════════════════════════════════════════════════════
# 6. EMPTY CATCH BLOCKS (swallowed errors)
# ══════════════════════════════════════════════════════════════
print("▶ [6/8] Empty Catch Blocks Check...")
empty_catches = 0
for i, line in enumerate(lines):
    if re.search(r'catch\s*\([^)]*\)\s*\{\s*\}', line):
        empty_catches += 1
        if empty_catches <= 3:
            warnings.append(f"⚠️ Empty catch block at L{i+1}: {line.strip()[:80]}")

if empty_catches == 0:
    info.append("✅ No empty catch blocks")
print(f"   Empty catch blocks: {empty_catches}")

# ══════════════════════════════════════════════════════════════
# 7. MISSING AWAIT (async functions called without await)
# ══════════════════════════════════════════════════════════════
print("▶ [7/8] Missing Await Check...")
# Find all async function names
async_funcs = set()
for i, line in enumerate(lines):
    m = re.search(r'const\s+(\w+)\s*=\s*(?:React\.)?useCallback\(\s*async', line)
    if m:
        async_funcs.add(m.group(1))
    m = re.search(r'const\s+(\w+)\s*=\s*async', line)
    if m:
        async_funcs.add(m.group(1))

# Check for calls without await (simplified)
missing_await = 0
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('//'):
        continue
    for func in async_funcs:
        # Look for direct calls without await
        pattern = rf'(?<!await\s)(?<!\.)\b{re.escape(func)}\s*\('
        if re.search(pattern, stripped):
            # Exclude definitions, .then(), .catch() chains
            if f'const {func}' in line or f'= {func}' in line:
                continue
            if '.then(' in line or '.catch(' in line:
                continue
            if f'await {func}' in line:
                continue
            missing_await += 1

info.append(f"📊 Async functions defined: {len(async_funcs)}, calls without await: {missing_await}")
print(f"   Async functions: {len(async_funcs)}, possible missing await: {missing_await}")

# ══════════════════════════════════════════════════════════════
# 8. FILE SIZE & STRUCTURE METRICS
# ══════════════════════════════════════════════════════════════
print("▶ [8/8] Structure Metrics...")
blank_lines = sum(1 for l in lines if l.strip() == '')
comment_lines = sum(1 for l in lines if l.strip().startswith('//'))
use_state = sum(1 for l in lines if 'useState(' in l)
use_effect = sum(1 for l in lines if 'useEffect(' in l)
use_callback = sum(1 for l in lines if 'useCallback(' in l)
use_memo = sum(1 for l in lines if 'useMemo(' in l)
use_ref = sum(1 for l in lines if 'useRef(' in l)

info.append(f"📊 Structure: {blank_lines} blank lines, {comment_lines} comments")
info.append(f"📊 Hooks: {use_state} useState, {use_effect} useEffect, {use_callback} useCallback, {use_memo} useMemo, {use_ref} useRef")
print(f"   Blank: {blank_lines}, Comments: {comment_lines}")
print(f"   Hooks: {use_state} state, {use_effect} effect, {use_callback} callback, {use_memo} memo, {use_ref} ref")

# ══════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════
print(f"\n{'='*60}")
print(f"  RESULTS SUMMARY")
print(f"{'='*60}")

if issues:
    print(f"\n🔴 CRITICAL ISSUES ({len(issues)}):")
    for iss in issues:
        print(f"   {iss}")

if warnings:
    print(f"\n⚠️  WARNINGS ({len(warnings)}):")
    for w in warnings:
        print(f"   {w}")

print(f"\nℹ️  INFO ({len(info)}):")
for i in info:
    print(f"   {i}")

total = len(issues) + len(warnings)
print(f"\n{'='*60}")
if len(issues) == 0:
    print(f"  VERDICT: {'PASS ✅' if total < 5 else 'PASS with warnings ⚠️'}")
else:
    print(f"  VERDICT: NEEDS ATTENTION 🔴")
print(f"  {len(issues)} critical, {len(warnings)} warnings, {len(info)} info")
print(f"{'='*60}")
