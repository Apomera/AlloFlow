"""
Fix Letter Tracing Phase Transition Bug — 3 compounding fixes.

Fix 1: Give LetterTraceView its own local isMountedRef (L7901-8189)
Fix 2: Guard tracingPhase reset against spurious re-fires (L6251-6252)
Fix 3: Remove duplicate tracingPhase state at L30634
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

changes = 0

# ===================================================================
# FIX 1: Give LetterTraceView its own local isMountedRef
# ===================================================================

# 1a. Add localMountedRef after the existing refs at L7903
# Find: const maskRef = React.useRef(null); // Hidden mask for validation
for i, l in enumerate(lines):
    if 'maskRef = React.useRef(null)' in l and 'Hidden mask for validation' in l:
        print("Fix 1a: Found maskRef at L%d" % (i+1))
        # Insert localMountedRef after this line
        indent = '        '
        lines.insert(i+1, indent + 'const localMountedRef = React.useRef(true); // Local mount tracking (NOT the parent\'s)\n')
        changes += 1
        print("  Inserted localMountedRef")
        break

# Re-read after insertion (line numbers shifted by 1)
# 1b. Change L8057 (now L8058): isMountedRef.current = false → localMountedRef.current = false
# But ONLY inside the LetterTraceView cleanup (L8034-8059 range, now shifted)
# Find the exact line inside the cleanup effect
for i, l in enumerate(lines):
    if i > 8030 and i < 8100:
        if 'isMountedRef.current = false' in l and '// 4. Mark as unmounted' not in l:
            # Check if previous line has the comment about unmounted
            # This is the line at ~L8057+1=L8058 after our insertion
            context = lines[i-1] if i > 0 else ''
            if 'feedbackAudioRef.current' in context or 'stale async' in context:
                print("Fix 1b: Found isMountedRef corruption at L%d" % (i+1))
                lines[i] = l.replace('isMountedRef.current = false', 'localMountedRef.current = false')
                changes += 1
                print("  Changed to localMountedRef")
                break

# 1c. Change L8189 (now L8190): onComplete guard
# Find: setTimeout(() => { if (isMountedRef.current) onComplete(true); }, 800);
for i, l in enumerate(lines):
    if 'isMountedRef.current) onComplete(true)' in l:
        print("Fix 1c: Found onComplete guard at L%d" % (i+1))
        lines[i] = l.replace('isMountedRef.current) onComplete(true)', 'localMountedRef.current) onComplete(true)')
        changes += 1
        print("  Changed to localMountedRef")
        break

# 1d. Change L8193 (now L8194): setFeedback guard
# Find: setTimeout(() => { if (isMountedRef.current) setFeedback(null); }, 2000);
# There are TWO of these (L8193 and L8196), both inside LetterTraceView (L7901-8300 range)
for i, l in enumerate(lines):
    if i > 8100 and i < 8300:
        if 'isMountedRef.current) setFeedback(null)' in l:
            print("Fix 1d: Found setFeedback guard at L%d" % (i+1))
            lines[i] = l.replace('isMountedRef.current) setFeedback(null)', 'localMountedRef.current) setFeedback(null)')
            changes += 1
            print("  Changed to localMountedRef")
            # Don't break — there are two instances

# 1e. Add cleanup for localMountedRef in the useEffect return
# The existing cleanup at ~L8058 now sets localMountedRef. But we also need to ADD
# a reset of localMountedRef = true when the component re-mounts.
# Actually, useRef(true) handles this — each mount creates a new ref.
# The cleanup already sets localMountedRef.current = false. ✓

print()

# ===================================================================
# FIX 2: Guard tracingPhase reset against spurious re-fires
# ===================================================================

# 2a. Add lastTracingWord ref near L3313 (or near other refs)
# Find the tracingPhase declaration at L3313
for i, l in enumerate(lines):
    if "tracingPhase, setTracingPhase" in l and "useState('upper')" in l and i < 5000:
        print("Fix 2a: Found tracingPhase declaration at L%d" % (i+1))
        indent = '    '
        lines.insert(i+1, indent + "const lastTracingWord = React.useRef(null); // Guard: only reset tracingPhase on genuine word changes\n")
        changes += 1
        print("  Inserted lastTracingWord ref")
        break

# 2b. Change the tracingPhase reset at L6252 (now shifted) to guard against spurious re-fires
# Find: if (wordSoundsActivity === 'letter_tracing') { setTracingPhase('upper'); }
for i, l in enumerate(lines):
    if "wordSoundsActivity === 'letter_tracing'" in l and i > 6200 and i < 6300:
        next_line = lines[i+1] if i+1 < len(lines) else ''
        if "setTracingPhase('upper')" in next_line:
            print("Fix 2b: Found tracingPhase reset at L%d-%d" % (i+1, i+2))
            # Replace the conditional and body
            indent = '        '
            lines[i] = indent + "if (wordSoundsActivity === 'letter_tracing' && currentWordSoundsWord !== lastTracingWord.current) {\n"
            lines[i+1] = indent + "    lastTracingWord.current = currentWordSoundsWord;\n" + indent + "    setTracingPhase('upper');\n"
            changes += 1
            print("  Changed to guard against spurious re-fires")
            break

print()

# ===================================================================
# FIX 3: Remove duplicate tracingPhase state at L30634
# ===================================================================

# Find the duplicate at L30634 (now shifted due to insertions)
for i, l in enumerate(lines):
    if i > 30000:
        if "tracingPhase, setTracingPhase" in l and "useState('upper')" in l:
            print("Fix 3: Found duplicate tracingPhase at L%d" % (i+1))
            # Comment it out rather than deleting entirely (safer)
            lines[i] = '  // REMOVED: Duplicate tracingPhase state (moved to Word Sounds scope at L3313)\n'
            changes += 1
            print("  Commented out duplicate")
            break

# ===================================================================
# Write and fix line endings
# ===================================================================

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

# Fix double CRs
with open(FILE, 'rb') as f:
    raw = f.read()
dbl = raw.count(b'\r\r\n')
if dbl > 0:
    raw = raw.replace(b'\r\r\n', b'\r\n')
    with open(FILE, 'wb') as f:
        f.write(raw)
    print("Fixed %d double CRs" % dbl)

print("\nTotal changes: %d" % changes)
print("DONE")
