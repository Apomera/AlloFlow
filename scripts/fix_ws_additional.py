#!/usr/bin/env python3
"""Apply 9 additional Word Sounds improvements to AlloFlowANTI.txt."""
import shutil

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

print(f"Loaded {len(lines)} lines")
changes = []

# Helper: find and replace a unique substring in a specific line range
def fix_dep_line(target_str, old_dep, new_dep, label, start=0, end=None):
    end = end or len(lines)
    for i in range(start, end):
        if target_str in lines[i]:
            original = lines[i]
            lines[i] = lines[i].replace(old_dep, new_dep)
            if lines[i] != original:
                changes.append(f"{label}: L{i+1}")
                return i
    print(f"WARNING: {label} target not found!")
    return None

# =====================================================================
# GROUP 1: Remove handleAudio from 5 dependency arrays
# =====================================================================

# 1a. playBlending (L5184)
fix_dep_line(
    "wordSoundsPhonemes, handleAudio",
    ", [wordSoundsPhonemes, handleAudio])",
    ", [wordSoundsPhonemes]); // eslint-disable-next-line react-hooks/exhaustive-deps",
    "G1-1: playBlending deps",
    5100, 5200
)

# 1b. fetchWordData (L6718)
fix_dep_line(
    "wordSoundsLanguage, callGemini, handleAudio",
    ", [wordSoundsLanguage, callGemini, handleAudio])",
    ", [wordSoundsLanguage, callGemini]); // eslint-disable-next-line react-hooks/exhaustive-deps",
    "G1-2: fetchWordData deps",
    6700, 6730
)

# 1c. preloadInitialBatch (L7247)
fix_dep_line(
    "isPreloading, preloadedWords.length, wordPool, callGemini, handleAudio, wordSoundsLanguage",
    ", [isPreloading, preloadedWords.length, wordPool, callGemini, handleAudio, wordSoundsLanguage])",
    ", [isPreloading, preloadedWords.length, wordPool, callGemini, wordSoundsLanguage]); // eslint-disable-next-line react-hooks/exhaustive-deps",
    "G1-3: preloadInitialBatch deps",
    7200, 7260
)

# 1d. handleRegenerateWord (L7463)
fix_dep_line(
    "preloadedWords, fetchWordData, setWsPreloadedWords, handleAudio",
    ", [preloadedWords, fetchWordData, setWsPreloadedWords, handleAudio])",
    ", [preloadedWords, fetchWordData, setWsPreloadedWords]); // eslint-disable-next-line react-hooks/exhaustive-deps",
    "G1-4: handleRegenerateWord deps",
    7440, 7480
)

# 1e. Auto-play effect (L8059)
fix_dep_line(
    "currentWordSoundsWord, isLoadingPhonemes, handleAudio, wordSoundsActivity, rhymeOptions, playBlending",
    ", [currentWordSoundsWord, isLoadingPhonemes, handleAudio, wordSoundsActivity, rhymeOptions, playBlending])",
    ", [currentWordSoundsWord, isLoadingPhonemes, wordSoundsActivity, rhymeOptions, playBlending]); // eslint-disable-next-line react-hooks/exhaustive-deps",
    "G1-5: auto-play effect deps",
    8040, 8070
)

# =====================================================================
# GROUP 2: Comment out 2 debug logs
# =====================================================================

# 2a. console.log("[callTTS] ❌ Attempt failed:") at ~L6996
for i in range(6980, 7010):
    s = lines[i].strip()
    if s.startswith('console.log("[callTTS]') and 'Attempt failed' in s:
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        lines[i] = indent + '// ' + lines[i].lstrip()
        changes.append(f"G2-1: Commented debug log: L{i+1}")
        break
else:
    print("WARNING: G2-1 target not found!")

# 2b. console.error("[WS-DBG] Review panel:") at ~L7303
for i in range(7290, 7320):
    s = lines[i].strip()
    if s.startswith('console.error("[WS-DBG]'):
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        lines[i] = indent + '// ' + lines[i].lstrip()
        changes.append(f"G2-2: Commented debug log: L{i+1}")
        break
else:
    print("WARNING: G2-2 target not found!")

# =====================================================================
# GROUP 3: Add isMountedRef guards (2 sites)
# =====================================================================

# 3a. L6914: setFirstWordReady(true) in glossary preload path
for i in range(6908, 6920):
    s = lines[i].strip()
    if s == 'setFirstWordReady(true);':
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        lines[i] = indent + 'if (isMountedRef.current) setFirstWordReady(true);\n'
        changes.append(f"G3-1: Added isMountedRef guard: L{i+1}")
        break
else:
    print("WARNING: G3-1 target not found!")

# 3b. L7064-7066: setFirstWordReady(true) in Gemini preload path
for i in range(7058, 7072):
    s = lines[i].strip()
    if s == 'setFirstWordReady(true);':
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        lines[i] = indent + 'if (isMountedRef.current) setFirstWordReady(true);\n'
        changes.append(f"G3-2: Added isMountedRef guard: L{i+1}")
        break
else:
    print("WARNING: G3-2 target not found!")

# =====================================================================
# Write
# =====================================================================
shutil.copy2(FILE, FILE + ".bak4")
print("Backup created (.bak4)")

with open(FILE, "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"\n=== Applied {len(changes)} changes ===")
for c in changes:
    print(f"  {c}")

if len(changes) < 9:
    print(f"\n⚠️ WARNING: Expected 9 changes, got {len(changes)}!")
else:
    print("\n✅ All 9 changes applied successfully!")
