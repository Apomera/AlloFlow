#!/usr/bin/env python3
"""Fix Find Sounds loading freeze: 4 surgical edits to AlloFlowANTI.txt."""
import shutil

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

print(f"Loaded {len(lines)} lines")
changes = []

# =====================================================================
# FIX A: Comment out redundant Effect 3 (L8300-L8337)
# This effect competes with Effect 1 (L7879) and has isolationState
# in its deps, causing re-fire loops.
# =====================================================================
# Find the exact block
fix_a_start = None
fix_a_end = None
for i, line in enumerate(lines):
    # Find the opening of Effect 3
    if 'wordSoundsActivity === \'isolation\' && currentWordSoundsWord && wordSoundsPhonemes' in line and i > 8200 and i < 8400:
        # Walk back to find the React.useEffect
        j = i - 1
        while j >= 0 and 'React.useEffect' not in lines[j]:
            j -= 1
        if 'React.useEffect' in lines[j]:
            fix_a_start = j
            break

if fix_a_start is not None:
    # Find the closing of this effect - look for the dependency array line
    for i in range(fix_a_start, min(fix_a_start + 50, len(lines))):
        if 'isolationState]' in lines[i] and '},' in lines[i-1] if i > 0 else False:
            fix_a_end = i
            break
        elif 'wordSoundsActivity, currentWordSoundsWord, wordSoundsPhonemes, isolationState' in lines[i]:
            fix_a_end = i
            break

if fix_a_start is not None and fix_a_end is not None:
    # Comment out each line in the block
    for i in range(fix_a_start, fix_a_end + 1):
        stripped = lines[i].rstrip('\r\n')
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        if not stripped.strip().startswith('//'):
            if i == fix_a_start:
                lines[i] = indent + '// FIX-A: Disabled — redundant effect that competes with L7879 and causes render cascade\n'
                # Add the commented original on next insertion
                # Actually, let's comment each line individually
                lines[i] = indent + '// FIX-A DISABLED: Redundant isolation init effect (competes with L7879, causes render cascade)\n'
            else:
                lines[i] = indent + '// ' + lines[i].lstrip()
    changes.append(f"Fix A: Commented out Effect 3 block L{fix_a_start+1}-L{fix_a_end+1}")
else:
    print(f"WARNING: Fix A target not found! start={fix_a_start}, end={fix_a_end}")

# =====================================================================
# FIX B: Remove handleAudio from isolation effect deps (L7967)
# The handleAudio call is fire-and-forget prefetch; having it in deps
# causes needless re-fires on every audio state change.
# =====================================================================
target_b = "}, [wordSoundsActivity, wordSoundsPhonemes, handleAudio, currentWordSoundsWord]); // Removed isolationState to prevent loop"
replace_b = "    // eslint-disable-next-line react-hooks/exhaustive-deps\n    }, [wordSoundsActivity, wordSoundsPhonemes, currentWordSoundsWord]); // FIX-B: Removed handleAudio (fire-and-forget prefetch, unstable ref)"
for i, line in enumerate(lines):
    if "wordSoundsActivity, wordSoundsPhonemes, handleAudio, currentWordSoundsWord" in line and "Removed isolationState" in line:
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = indent + replace_b + "\n"
        changes.append(f"Fix B: L{i+1} — Removed handleAudio from isolation effect deps")
        break
else:
    print("WARNING: Fix B target not found!")

# =====================================================================
# FIX C: Remove isPlayingAudio from handleAudio's deps (L5160)
# handleAudio only uses setIsPlayingAudio (a setter), not the value.
# Having isPlayingAudio as dep causes reference instability.
# =====================================================================
target_c = "}, [callTTS, selectedVoice, speakWord, wordSoundsLanguage, ttsSpeed, isPlayingAudio, wordSoundsAudioLibrary]);"
replace_c = "    // eslint-disable-next-line react-hooks/exhaustive-deps\n    }, [callTTS, selectedVoice, speakWord, wordSoundsLanguage, ttsSpeed, wordSoundsAudioLibrary]); // FIX-C: Removed isPlayingAudio (only setter used, not value)"
for i, line in enumerate(lines):
    if "callTTS, selectedVoice, speakWord, wordSoundsLanguage, ttsSpeed, isPlayingAudio, wordSoundsAudioLibrary" in line:
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = indent + replace_c + "\n"
        changes.append(f"Fix C: L{i+1} — Removed isPlayingAudio from handleAudio deps")
        break
else:
    print("WARNING: Fix C target not found!")

# =====================================================================
# FIX D: Remove handleAudio from audio prefetcher deps (L7293)
# The prefetcher only calls handleAudio as fire-and-forget.
# Its ref changing should not re-trigger the entire prefetch cycle.
# =====================================================================
target_d = "}, [preloadedWords, handleAudio, setWsPreloadedWords]);"
for i, line in enumerate(lines):
    if "preloadedWords, handleAudio, setWsPreloadedWords" in line and i > 7200 and i < 7400:
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = indent + "// eslint-disable-next-line react-hooks/exhaustive-deps\n" + indent + "}, [preloadedWords, setWsPreloadedWords]); // FIX-D: Removed handleAudio (fire-and-forget, unstable ref)\n"
        changes.append(f"Fix D: L{i+1} — Removed handleAudio from audio prefetcher deps")
        break
else:
    print("WARNING: Fix D target not found!")

# =====================================================================
# Write the file
# =====================================================================
shutil.copy2(FILE, FILE + ".bak3")
print("Backup created (.bak3)")

with open(FILE, "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"\n=== Applied {len(changes)} changes ===")
for c in changes:
    print(f"  {c}")

if len(changes) < 4:
    print("\n⚠️ WARNING: Not all 4 fixes were applied! Review output above.")
else:
    print("\n✅ All 4 fixes applied successfully!")
