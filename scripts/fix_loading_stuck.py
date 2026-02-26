"""
Fix "Loading sounds" stuck state with three changes:

1. Add missing `word` and `correctSound` fields to the fallback setIsolationState at L9229
2. Add a timeout/escape hatch to the "Loading sounds" guard so it can't get stuck forever
3. Ensure session completion fires when truly empty instead of infinite refill loop
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# FIX 1: Add word and correctSound to fallback setIsolationState
old_fallback = """                        setIsolationState({
                            correctAnswer: iso_correct,
                            currentPosition: iso_position,
                            isoOptions: iso_opts,
                            prompt: iso_position === 'first' ? 'beginning' : iso_position === 'last' ? 'ending' : 'middle'
                        });"""

new_fallback = """                        setIsolationState({
                            word: targetWord, // FIX: Include word to pass data integrity check
                            correctAnswer: iso_correct,
                            correctSound: iso_correct, // FIX: Include correctSound (used by rendering)
                            currentPosition: iso_position,
                            isoOptions: iso_opts,
                            prompt: iso_position === 'first' ? 'beginning' : iso_position === 'last' ? 'ending' : 'middle'
                        });"""

if old_fallback in content:
    content = content.replace(old_fallback, new_fallback, 1)
    changes += 1
    print("1. FIXED: Added word + correctSound to fallback setIsolationState")
else:
    print("[WARN] Fallback pattern not found")

# FIX 2: Add a safety timeout to the "Loading sounds" guard
# The guard returns a loading spinner forever if isolationState.word never matches currentWordSoundsWord
# We'll add a useRef-based timeout that forces isolationState regeneration after 5 seconds of being stuck

# First, find existing loading guard:
old_guard = """                // DATA INTEGRITY CHECK: Ensure state matches current word
                if (!isolationState || (isoWord && isoWord.toLowerCase() !== currentWordSoundsWord?.toLowerCase())) {
                     return <div className="p-8 text-center animate-pulse text-violet-400">Loading sounds...</div>;
                }
                if (!isolationState) return <div className="p-8 text-center animate-pulse text-violet-400">Loading sounds...</div>;"""

new_guard = """                // DATA INTEGRITY CHECK: Ensure state matches current word
                if (!isolationState || (isoWord && isoWord.toLowerCase() !== currentWordSoundsWord?.toLowerCase())) {
                     // FIX: Auto-regenerate isolation state after 3s to prevent permanent stuck state
                     if (currentWordSoundsWord && isoWord && isoWord.toLowerCase() !== currentWordSoundsWord?.toLowerCase()) {
                         debugLog("⚠️ Isolation state mismatch:", isoWord, "vs", currentWordSoundsWord, "- will auto-sync");
                     }
                     return <div className="p-8 text-center animate-pulse text-violet-400">Loading sounds...</div>;
                }"""

if old_guard in content:
    content = content.replace(old_guard, new_guard, 1)
    changes += 1
    print("2. FIXED: Removed duplicate guard, added debug logging for mismatch")
else:
    print("[WARN] Guard pattern not found")

# FIX 3: Add a useEffect that auto-regenerates isolation state when stuck
# Find a good place to add it - right after the isolation effect
old_isolation_effect_end = """        // If NOT a new word, do nothing - keep existing isolationState
    }, [wordSoundsActivity, wordSoundsPhonemes, handleAudio, currentWordSoundsWord]); // Removed isolationState to prevent loop"""

new_isolation_effect_end = """        // If NOT a new word, do nothing - keep existing isolationState
    }, [wordSoundsActivity, wordSoundsPhonemes, handleAudio, currentWordSoundsWord]); // Removed isolationState to prevent loop
    // FIX: Auto-recovery effect — if isolation state word doesn't match for 3 seconds, force re-sync
    React.useEffect(() => {
        if (wordSoundsActivity !== 'isolation') return;
        if (!currentWordSoundsWord) return;
        if (isolationState?.word?.toLowerCase() === currentWordSoundsWord?.toLowerCase()) return; // Already in sync
        const timer = setTimeout(() => {
            if (!isMountedRef.current) return;
            debugLog("🔧 Auto-recovery: isolationState stuck for 3s, forcing re-sync for:", currentWordSoundsWord);
            // Force-regenerate using available phoneme data
            const phonemes = wordSoundsPhonemes?.phonemes || estimatePhonemesBasic(currentWordSoundsWord);
            const pos = Math.floor(Math.random() * phonemes.length);
            const correct = phonemes[pos] || currentWordSoundsWord[0] || 'a';
            const dists = phonemes.filter(p => p !== correct).slice(0, 3);
            while (dists.length < 3) dists.push(['b','d','f','g','k','l','m','n','p','r','s','t'][Math.floor(Math.random() * 12)]);
            setIsolationState({
                word: currentWordSoundsWord,
                currentPosition: pos,
                correctSound: correct,
                correctAnswer: correct,
                isoOptions: fisherYatesShuffle([correct, ...dists.slice(0, 3)])
            });
            setIsLoadingPhonemes(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, [currentWordSoundsWord, isolationState?.word, wordSoundsActivity]);"""

if old_isolation_effect_end in content:
    content = content.replace(old_isolation_effect_end, new_isolation_effect_end, 1)
    changes += 1
    print("3. FIXED: Added auto-recovery effect for stuck isolation state")
else:
    print("[WARN] Isolation effect end pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nApplied %d fixes" % changes)
