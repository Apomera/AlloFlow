"""
Comprehensive diagnostic of the Letter Tracing phase transition bug.
Traces all code paths from user trace completion to phase transition.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

findings = []
findings.append("=== LETTER TRACING PHASE TRANSITION DIAGNOSTIC ===\n")

# 1. tracingPhase state declarations (duplicates?)
findings.append("--- 1. tracingPhase Declarations ---")
for i, l in enumerate(lines):
    if 'tracingPhase' in l and 'useState' in l:
        findings.append("L%d: %s" % (i+1, l.strip()))

# 2. setTracingPhase calls
findings.append("\n--- 2. setTracingPhase Calls ---")
for i, l in enumerate(lines):
    if 'setTracingPhase' in l:
        findings.append("L%d: %s" % (i+1, l.strip()))

# 3. isMountedRef declarations and writes
findings.append("\n--- 3. isMountedRef Declarations and Writes ---")
for i, l in enumerate(lines):
    if 'isMountedRef' in l and ('useRef' in l or '.current' in l):
        findings.append("L%d: %s" % (i+1, l.strip()[:200]))

# 4. onComplete calls (inside LetterTraceView)
findings.append("\n--- 4. onComplete Calls ---")
for i, l in enumerate(lines):
    if 'onComplete' in l and i > 7900 and i < 8500:
        findings.append("L%d: %s" % (i+1, l.strip()[:200]))

# 5. LetterTraceView key prop
findings.append("\n--- 5. LetterTraceView Key and Props ---")
for i, l in enumerate(lines):
    if 'LetterTraceView' in l or 'letter_tracing' in l:
        findings.append("L%d: %s" % (i+1, l.strip()[:200]))

# 6. audioInstances ref (used in LetterTraceView cleanup)
findings.append("\n--- 6. audioInstances ref (used in cleanup) ---")
for i, l in enumerate(lines):
    if 'audioInstances' in l and ('useRef' in l):
        findings.append("L%d: %s" % (i+1, l.strip()[:200]))

# 7. The INSTRUCTION_AUDIO entries for fb_great_job and now_try_lowercase
findings.append("\n--- 7. INSTRUCTION_AUDIO for fb_great_job, now_try_lowercase, fb_amazing ---")
for i, l in enumerate(lines):
    if 'fb_great_job' in l or 'now_try_lowercase' in l or 'fb_amazing' in l:
        findings.append("L%d: %s" % (i+1, l.strip()[:200]))

# 8. Check for any other code that sets tracingPhase to 'upper' unexpectedly
findings.append("\n--- 8. tracingPhase Reset to 'upper' ---")
for i, l in enumerate(lines):
    if "tracingPhase" in l and "'upper'" in l:
        findings.append("L%d: %s" % (i+1, l.strip()[:200]))

# 9. Check for currentWordSoundsWord changes during tracing
# (could cause re-render of the case 'letter_tracing' block before timeout fires)
findings.append("\n--- 9. Word Advancement references (could trigger re-render) ---")
for i, l in enumerate(lines):
    if 'setCurrentWordSoundsWord' in l and i > 7000 and i < 7500:
        findings.append("L%d: %s" % (i+1, l.strip()[:200]))

# 10. Check if the LetterTraceView has its OWN isMountedRef
findings.append("\n--- 10. Refs Inside LetterTraceView (L7901-8300) ---")
for i, l in enumerate(lines):
    if i >= 7900 and i < 8300:
        if 'useRef' in l or 'isMounted' in l:
            findings.append("L%d: %s" % (i+1, l.strip()[:200]))

# 11. Any resetKey or setState that clears tracing state
findings.append("\n--- 11. resetKey and Tracing Resets ---")
for i, l in enumerate(lines):
    if 'resetKey' in l or 'setResetKey' in l:
        findings.append("L%d: %s" % (i+1, l.strip()[:200]))

with open('trace_diag.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(findings))
print("%d findings" % len(findings))
