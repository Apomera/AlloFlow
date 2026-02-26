"""
Post-Fix Comprehensive Word Sounds Audit
==========================================
Scans the patched AlloFlowANTI.txt across 20 hazard dimensions.
Focused on Word Sounds range (L2500-L10000) but also checks global patterns.
"""
import sys, os, re, json

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
MONOLITH = os.path.join(os.path.dirname(__file__), 'AlloFlowANTI.txt')
REPORT = os.path.join(os.path.dirname(__file__), 'audit_postfix.txt')

out = []
def log(msg):
    out.append(msg)

with open(MONOLITH, 'r', encoding='utf-8-sig') as f:
    text = f.read()
lines = text.split('\n')
log(f"FILE: {len(lines)} lines, {len(text)} chars")
log(f"{'='*70}")

# ============================================================
# 1. BOM CHECK
# ============================================================
log(f"\n## 1. BOM MARKERS")
with open(MONOLITH, 'rb') as f:
    raw = f.read()
bom = b'\xef\xbb\xbf'
bom_count = raw.count(bom)
log(f"   Total BOMs: {bom_count} {'✅' if bom_count == 1 else '❌'}")

# ============================================================
# 2. PHONEME_AUDIO_BANK INTEGRITY
# ============================================================
log(f"\n## 2. PHONEME_AUDIO_BANK INTEGRITY")
# Find all bracket assignments
bracket_assigns = re.findall(r"PHONEME_AUDIO_BANK\['(\w+)'\]\s*=", text)
log(f"   Bracket assignments: {len(bracket_assigns)} keys")

# Check for duplicates
from collections import Counter
dupe_keys = {k: v for k, v in Counter(bracket_assigns).items() if v > 1}
if dupe_keys:
    log(f"   ❌ DUPLICATE KEYS: {dupe_keys}")
else:
    log(f"   ✅ No duplicate bracket assignment keys")

# Check object literal keys
obj_literal_keys = re.findall(r"^\s+'(\w+)'\s*:\s*['\"]data:audio", text, re.MULTILINE)
obj_dupes = {k: v for k, v in Counter(obj_literal_keys).items() if v > 1}
if obj_dupes:
    log(f"   ⚠️  Duplicate object literal keys: {obj_dupes}")
else:
    log(f"   ✅ No duplicate object literal keys")

# Verify 'or' specifically
or_bracket = text.count("PHONEME_AUDIO_BANK['or'] =")
or_literal = len(re.findall(r"^\s+'or'\s*:", text, re.MULTILINE))
log(f"   'or': {or_bracket} bracket, {or_literal} literal {'✅' if or_bracket == 1 and or_literal == 0 else '❌'}")

# ============================================================
# 3. TIMER CLEANUP (setTimeout without clearTimeout)
# ============================================================
log(f"\n## 3. TIMER CLEANUP (Word Sounds range L2500-L10000)")
set_timeouts = 0
clear_timeouts = 0
unguarded_timers = []
for i in range(2500, min(10000, len(lines))):
    if 'setTimeout(' in lines[i]:
        set_timeouts += 1
        # Check if this timer's return value is captured
        stripped = lines[i].strip()
        if not (stripped.startswith('const ') or stripped.startswith('let ') or 
                stripped.startswith('timer') or 'Ref.current' in stripped or
                'timerRef' in stripped.lower()):
            unguarded_timers.append((i+1, stripped[:80]))
    if 'clearTimeout(' in lines[i]:
        clear_timeouts += 1

log(f"   setTimeout:    {set_timeouts}")
log(f"   clearTimeout:  {clear_timeouts}")
log(f"   Unguarded (no variable capture): {len(unguarded_timers)}")
for ln, ctx in unguarded_timers[:10]:
    log(f"     L{ln}: {ctx}")
if len(unguarded_timers) > 10:
    log(f"     ... and {len(unguarded_timers) - 10} more")

# ============================================================
# 4. RACE CONDITIONS (async/await without cancellation)
# ============================================================
log(f"\n## 4. ASYNC CANCELLATION GUARDS (Word Sounds range)")
await_lines = []
guard_lines = []
for i in range(2500, min(10000, len(lines))):
    if 'await ' in lines[i].strip():
        await_lines.append(i+1)
    if 'if (cancelled)' in lines[i] or 'if(cancelled)' in lines[i]:
        guard_lines.append(i+1)

log(f"   await statements:    {len(await_lines)}")
log(f"   cancellation guards: {len(guard_lines)}")
ratio = len(guard_lines) / max(1, len(await_lines)) * 100
log(f"   Guard ratio: {ratio:.0f}% {'✅' if ratio > 30 else '⚠️'}")

# ============================================================
# 5. UNGUARDED .map() CALLS
# ============================================================
log(f"\n## 5. UNGUARDED .map() CALLS (Word Sounds range)")
unguarded_maps = []
for i in range(2500, min(10000, len(lines))):
    line = lines[i]
    if '.map(' in line:
        stripped = line.strip()
        if not ('?.map(' in stripped or '|| [])' in stripped or 
                'prev.map(' in stripped or  # setState callbacks are safe
                '.entries()' in stripped or '.keys()' in stripped):
            m = re.search(r'(\w+(?:\.\w+)*)\.map\(', stripped)
            if m:
                var = m.group(1)
                # Skip safe patterns: Array literals, known safe vars
                if var not in ('Object', 'Array', 'result', 'merged', 'phonemes', 
                               'consonants', 'wordPool', 'alphabet', 'keys', 'wordBank',
                               'foundWords', 'slots', 'chips', 'items'):
                    unguarded_maps.append((i+1, var, stripped[:80]))

log(f"   Potentially unguarded: {len(unguarded_maps)}")
for ln, var, ctx in unguarded_maps[:10]:
    log(f"     L{ln}: {var}.map() -> {ctx}")

# ============================================================
# 6. SILENT CATCH BLOCKS
# ============================================================
log(f"\n## 6. SILENT CATCH BLOCKS (Word Sounds range)")
silent_single = len(re.findall(r'\}\s*catch\s*\(\w+\)\s*\{\s*\}', text))
log(f"   Single-line silent catches remaining: {silent_single}")

# Multi-line silent catches
silent_multi = 0
for i in range(2500, min(10000, len(lines))):
    stripped = lines[i].strip()
    if 'catch' in stripped and (stripped.startswith('catch') or stripped.startswith('} catch')):
        has_action = False
        for j in range(i+1, min(i+5, len(lines))):
            nxt = lines[j].strip()
            if ('console.' in nxt or 'log(' in nxt or 'warn(' in nxt or 
                'error(' in nxt or 'throw' in nxt or 'return' in nxt or
                '=' in nxt):
                has_action = True
                break
            if nxt == '}':
                break
        if not has_action:
            silent_multi += 1
            log(f"     L{i+1}: {stripped[:60]}")

log(f"   Multi-line silent catches: {silent_multi}")

# ============================================================
# 7. useEffect DEPENDENCY ARRAYS
# ============================================================
log(f"\n## 7. useEffect MISSING DEPENDENCIES (Word Sounds range)")
effects_no_deps = 0
for i in range(2500, min(10000, len(lines))):
    stripped = lines[i].strip()
    if 'React.useEffect(() =>' in stripped or 'React.useEffect(()=>' in stripped:
        # Check next ~50 lines for closing with dependency array
        has_deps = False
        for j in range(i, min(i+80, len(lines))):
            if re.search(r'\},\s*\[', lines[j]):
                has_deps = True
                break
            if lines[j].strip() == '});' and j > i:
                break
        if not has_deps:
            effects_no_deps += 1
            log(f"     L{i+1}: useEffect without dependency array")

log(f"   Effects without deps: {effects_no_deps} {'✅' if effects_no_deps == 0 else '⚠️'}")

# ============================================================
# 8. MEMORY LEAKS: isMountedRef USAGE
# ============================================================
log(f"\n## 8. isMountedRef PATTERN")
mounted_refs_def = 0
mounted_refs_check = 0
for i, line in enumerate(lines):
    if 'isMountedRef' in line:
        if 'useRef' in line:
            mounted_refs_def += 1
        if 'isMountedRef.current' in line and ('if' in line or '&&' in line):
            mounted_refs_check += 1
log(f"   Definitions: {mounted_refs_def}")
log(f"   Guard checks: {mounted_refs_check}")

# ============================================================
# 9. SPEECH SYNTHESIS CLEANUP
# ============================================================
log(f"\n## 9. SPEECH SYNTHESIS CLEANUP")
speak_calls = 0
cancel_calls = 0
for i in range(2500, min(10000, len(lines))):
    if 'speechSynthesis.speak(' in lines[i]:
        speak_calls += 1
    if 'speechSynthesis.cancel(' in lines[i]:
        cancel_calls += 1
log(f"   speak() calls: {speak_calls}")
log(f"   cancel() calls: {cancel_calls}")
log(f"   {'✅' if cancel_calls >= speak_calls else '⚠️ More speaks than cancels'}")

# ============================================================
# 10. AUDIO CONTEXT CREATION
# ============================================================
log(f"\n## 10. AUDIO CONTEXT CREATION")
ctx_creates = 0
for line in lines:
    if 'new AudioContext(' in line or 'new (window.AudioContext' in line:
        ctx_creates += 1
log(f"   AudioContext creations: {ctx_creates}")
log(f"   {'✅ Singleton' if ctx_creates <= 2 else '⚠️ Multiple creations'}")

# ============================================================
# 11. LOCALSTORAGE USAGE
# ============================================================
log(f"\n## 11. LOCALSTORAGE (within Word Sounds)")
storage_keys = set()
for i in range(2500, min(10000, len(lines))):
    m = re.findall(r"localStorage\.\w+\(\s*['\"]([^'\"]+)", lines[i])
    for key in m:
        storage_keys.add(key)
    m2 = re.findall(r"PHONEME_STORAGE_KEY", lines[i])

log(f"   Keys used: {storage_keys}")

# Check PHONEME_STORAGE_KEY definitions
key_defs = []
for i, line in enumerate(lines):
    if "PHONEME_STORAGE_KEY" in line and ('const ' in line or 'let ' in line):
        key_defs.append(i+1)
log(f"   PHONEME_STORAGE_KEY definitions at lines: {key_defs}")
log(f"   {'✅' if len(key_defs) <= 2 else '⚠️ Multiple key definitions'}")

# ============================================================
# 12. NULL/UNDEFINED SAFETY
# ============================================================
log(f"\n## 12. NULL SAFETY PATTERNS (Word Sounds range)")
unsafe_patterns = 0
for i in range(2500, min(10000, len(lines))):
    stripped = lines[i].strip()
    # Detect .length on variables that could be undefined
    if re.search(r'\b(feedback|result|response|data)\.\w+\.length\b', stripped):
        if '?.' not in stripped and '|| ' not in stripped:
            unsafe_patterns += 1
            log(f"     L{i+1}: {stripped[:80]}")

log(f"   Potentially unsafe deep access: {unsafe_patterns}")

# ============================================================
# 13. EVENT LISTENER CLEANUP
# ============================================================
log(f"\n## 13. EVENT LISTENERS (Word Sounds range)")
add_listeners = 0
remove_listeners = 0
for i in range(2500, min(10000, len(lines))):
    if 'addEventListener(' in lines[i]:
        add_listeners += 1
    if 'removeEventListener(' in lines[i]:
        remove_listeners += 1
log(f"   addEventListener:    {add_listeners}")
log(f"   removeEventListener: {remove_listeners}")
log(f"   {'✅ Balanced' if add_listeners <= remove_listeners + 2 else '⚠️ Possible leak'}")

# ============================================================
# 14. SUBMISSION LOCK PATTERNS
# ============================================================
log(f"\n## 14. SUBMISSION LOCKS")
lock_sets = 0
lock_clears = 0
for i in range(2500, min(10000, len(lines))):
    if 'submissionLockRef.current = true' in lines[i]:
        lock_sets += 1
    if 'submissionLockRef.current = false' in lines[i]:
        lock_clears += 1
log(f"   Lock sets:   {lock_sets}")
log(f"   Lock clears: {lock_clears}")
log(f"   {'✅ Balanced' if lock_sets <= lock_clears + 1 else '⚠️ Possible deadlock'}")

# ============================================================
# 15. INSTRUCTION AUDIO INTEGRITY
# ============================================================
log(f"\n## 15. INSTRUCTION_AUDIO / LETTER_NAME_AUDIO / ISOLATION_AUDIO")
for bank_name in ['INSTRUCTION_AUDIO', 'LETTER_NAME_AUDIO', 'ISOLATION_AUDIO']:
    count = text.count(bank_name)
    log(f"   {bank_name}: {count} references")

# ============================================================
# 16. DUPLICATE FUNCTION DEFINITIONS
# ============================================================
log(f"\n## 16. FUNCTION DEFINITION DUPLICATES (Word Sounds range)")
func_defs = {}
for i in range(2500, min(10000, len(lines))):
    m = re.search(r'const\s+(\w+)\s*=\s*(?:React\.useCallback|React\.useMemo|\()', lines[i])
    if m:
        name = m.group(1)
        if name not in func_defs:
            func_defs[name] = []
        func_defs[name].append(i+1)

func_dupes = {k: v for k, v in func_defs.items() if len(v) > 1}
if func_dupes:
    log(f"   ⚠️  Functions defined multiple times:")
    for name, locs in func_dupes.items():
        log(f"     '{name}' at lines: {locs}")
else:
    log(f"   ✅ No duplicate function definitions")

# ============================================================
# 17. EMPTY STATE TRANSITIONS
# ============================================================
log(f"\n## 17. POTENTIAL EMPTY/NULL STATE TRANSITIONS")
null_transitions = 0
for i in range(2500, min(10000, len(lines))):
    stripped = lines[i].strip()
    # setState(null) without condition
    if re.search(r'set\w+\(null\)', stripped):
        null_transitions += 1
log(f"   setState(null) calls: {null_transitions}")

# ============================================================
# SUMMARY
# ============================================================
log(f"\n{'='*70}")
log(f"AUDIT SUMMARY")
log(f"{'='*70}")

# Write report
with open(REPORT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print(f"Audit complete. Report: {REPORT}")
print(f"Total findings logged: {len(out)} lines")
