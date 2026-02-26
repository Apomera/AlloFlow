"""Comprehensive audit of WordSoundsModal for potential issues"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_ws_audit.txt', 'w', encoding='utf-8')

# ══════════════════════════════════════════════
# AUDIT 1: Dead code / Unreachable paths
# ══════════════════════════════════════════════
out.write("=== AUDIT 1: Dead / Disabled Code ===\n")
for i, line in enumerate(lines):
    if i >= 3055 and i < 31000:  # Inside WordSoundsModal
        stripped = line.strip()
        if any(x in stripped for x in ['DISABLED:', 'DEAD:', 'TODO:', 'FIXME:', 'HACK:', 'XXX:', 'BROKEN:', 'BUG:']):
            out.write(f"  L{i+1}: {stripped[:150]}\n")
        # Also disabled return statements
        if 'return; // DISABLED' in stripped or '// DISABLED' in stripped:
            out.write(f"  L{i+1}: {stripped[:150]}\n")

# ══════════════════════════════════════════════
# AUDIT 2: Console errors/warnings
# ══════════════════════════════════════════════
out.write("\n=== AUDIT 2: console.error / console.warn in WS Modal ===\n")
for i, line in enumerate(lines):
    if i >= 3055 and i < 31000:
        if 'console.error' in line or 'console.warn' in line:
            out.write(f"  L{i+1}: {line.strip()[:150]}\n")

# ══════════════════════════════════════════════
# AUDIT 3: Hardcoded values that should be configurable
# ══════════════════════════════════════════════
out.write("\n=== AUDIT 3: Hardcoded distractors / magic numbers ===\n")
for i, line in enumerate(lines):
    if i >= 3055 and i < 31000:
        # Hardcoded word lists
        if '"dog", "sun", "bed"' in line or "'dog', 'sun', 'bed'" in line:
            out.write(f"  L{i+1}: HARDCODED DISTRACTORS: {line.strip()[:150]}\n")
        # DISABLE_GEMINI flag
        if 'DISABLE_GEMINI' in line:
            out.write(f"  L{i+1}: {line.strip()[:150]}\n")

# ══════════════════════════════════════════════
# AUDIT 4: Missing error handling
# ══════════════════════════════════════════════
out.write("\n=== AUDIT 4: try/catch with empty catch or swallowed errors ===\n")
for i, line in enumerate(lines):
    if i >= 3055 and i < 31000:
        if 'catch' in line and (i+1 < len(lines)):
            next_line = lines[i+1].strip()
            if next_line in ['', '}', '} catch', '// swallow']:
                out.write(f"  L{i+1}: EMPTY CATCH: {line.strip()[:100]} -> {next_line[:50]}\n")

# ══════════════════════════════════════════════
# AUDIT 5: State updates on unmounted components 
# ══════════════════════════════════════════════
out.write("\n=== AUDIT 5: Async operations that may update unmounted state ===\n")
for i, line in enumerate(lines):
    if i >= 3055 and i < 31000:
        if 'setTimeout' in line and 'set' in line:
            out.write(f"  L{i+1}: TIMEOUT+STATE: {line.strip()[:150]}\n")

# ══════════════════════════════════════════════
# AUDIT 6: Race conditions in audio
# ══════════════════════════════════════════════
out.write("\n=== AUDIT 6: Audio race patterns ===\n")
for i, line in enumerate(lines):
    if i >= 3055 and i < 31000:
        if 'handleAudio' in line and 'await' in line:
            out.write(f"  L{i+1}: AWAIT AUDIO: {line.strip()[:150]}\n")

# ══════════════════════════════════════════════
# AUDIT 7: DISABLE_GEMINI_PHONEMES flag impact
# ══════════════════════════════════════════════
out.write("\n=== AUDIT 7: DISABLE_GEMINI_PHONEMES and estimatePhonemesBasic usage ===\n")
for i, line in enumerate(lines):
    if 'DISABLE_GEMINI_PHONEMES' in line:
        out.write(f"  L{i+1}: {line.strip()[:150]}\n")
    if 'estimatePhonemesBasic' in line:
        out.write(f"  L{i+1}: {line.strip()[:150]}\n")
    if 'estimatePhonemesEnhanced' in line:
        out.write(f"  L{i+1}: {line.strip()[:150]}\n")

# ══════════════════════════════════════════════
# AUDIT 8: Stale closures / missing deps
# ══════════════════════════════════════════════
out.write("\n=== AUDIT 8: useCallback/useMemo with potential stale closures ===\n")
for i, line in enumerate(lines):
    if i >= 3055 and i < 31000:
        if 'useCallback' in line and '[]' in line:
            out.write(f"  L{i+1}: EMPTY DEPS CALLBACK: {line.strip()[:150]}\n")

# ══════════════════════════════════════════════
# AUDIT 9: Missing prefetchNextWords removal
# ══════════════════════════════════════════════
out.write("\n=== AUDIT 9: prefetchNextWords calls after consolidation ===\n")
for i, line in enumerate(lines):
    if 'prefetchNextWords' in line and '//' not in line.strip()[:3]:
        out.write(f"  L{i+1}: {line.strip()[:150]}\n")

# ══════════════════════════════════════════════
# AUDIT 10: isLoadingPhonemes not being cleared
# ══════════════════════════════════════════════
out.write("\n=== AUDIT 10: setIsLoadingPhonemes(true) without matching false ===\n")
loading_true = []
loading_false = []
for i, line in enumerate(lines):
    if i >= 3055 and i < 31000:
        if 'setIsLoadingPhonemes(true)' in line:
            loading_true.append(i+1)
        if 'setIsLoadingPhonemes(false)' in line:
            loading_false.append(i+1)
out.write(f"  setIsLoadingPhonemes(true): {len(loading_true)} calls at {loading_true}\n")
out.write(f"  setIsLoadingPhonemes(false): {len(loading_false)} calls at {loading_false}\n")
if len(loading_true) > len(loading_false):
    out.write(f"  ⚠️ {len(loading_true) - len(loading_false)} more true than false - potential stuck loading\n")

# ══════════════════════════════════════════════
# AUDIT 11: Session complete check conditions
# ══════════════════════════════════════════════
out.write("\n=== AUDIT 11: showSessionComplete / session completion triggers ===\n")
for i, line in enumerate(lines):
    if 'showSessionComplete' in line or 'SessionComplete' in line:
        if i >= 3055 and i < 31000:
            out.write(f"  L{i+1}: {line.strip()[:150]}\n")

# ══════════════════════════════════════════════
# AUDIT 12: Remaining fetchWordData calls (after consolidation)
# ══════════════════════════════════════════════
out.write("\n=== AUDIT 12: Remaining fetchWordData calls ===\n")
for i, line in enumerate(lines):
    if 'fetchWordData(' in line and '//' not in line.strip()[:5]:
        out.write(f"  L{i+1}: {line.strip()[:150]}\n")

out.close()
print("Done -> _ws_audit.txt")
