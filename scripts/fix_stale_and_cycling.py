"""
Three fixes:
1. Replace stale getAdaptiveRandomWord() at L9022 and L9082 with direct queue access
2. Replace modulo wrapping at L9002 with linear progression (no wrapping)
   BUT: re-queue words answered incorrectly for retry
3. Add missed-word re-queue logic to checkAnswer when !isCorrect
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# FIX 1a: Replace stale getAdaptiveRandomWord() at L9022 (queue empty regeneration)
old_regen = """                    debugLog("WordSounds: Queue empty during progression. Regenerating with 'medium' fallback...");
                    generateSessionQueue(wordSoundsActivity, 'medium'); // Use medium to ensure words available
                    word = getAdaptiveRandomWord();"""

new_regen = """                    debugLog("WordSounds: Queue empty during progression. Regenerating with 'medium' fallback...");
                    generateSessionQueue(wordSoundsActivity, 'medium'); // Use medium to ensure words available
                    // FIX: Use direct queue access instead of stale-closure getAdaptiveRandomWord
                    const regenQueue = sessionQueueRef.current[fallbackActId];
                    if (regenQueue && regenQueue.length > 0) {
                        word = regenQueue[0];
                        sessionQueueRef.current[fallbackActId] = regenQueue.slice(1);
                        setSessionWordLists(prev => ({...prev, [fallbackActId]: regenQueue.slice(1)}));
                    }"""

if old_regen in content:
    content = content.replace(old_regen, new_regen, 1)
    changes += 1
    print("1a. FIXED: Replaced stale getAdaptiveRandomWord at queue-empty regeneration")
else:
    print("[WARN] Regen pattern not found")

# FIX 1b: Replace stale getAdaptiveRandomWord() at L9082 (refill retry)
old_refill = """                        debugLog("⚠️ Queue empty but goal not met. Forcing refill...");
                        generateSessionQueue(wordSoundsActivity, 'medium');
                        const retryWord = getAdaptiveRandomWord();"""

new_refill = """                        debugLog("⚠️ Queue empty but goal not met. Forcing refill...");
                        generateSessionQueue(wordSoundsActivity, 'medium');
                        // FIX: Use direct queue access instead of stale-closure getAdaptiveRandomWord
                        const retryActId = wordSoundsActivity || 'segmentation';
                        const retryQueue = sessionQueueRef.current[retryActId];
                        const retryWord = (retryQueue && retryQueue.length > 0) ? retryQueue.shift() : null;
                        if (retryWord) sessionQueueRef.current[retryActId] = retryQueue;"""

if old_refill in content:
    content = content.replace(old_refill, new_refill, 1)
    changes += 1
    print("1b. FIXED: Replaced stale getAdaptiveRandomWord at refill retry")
else:
    print("[WARN] Refill pattern not found")

# FIX 2: Replace modulo wrapping with linear progression
old_modulo = """                setCurrentWordIndex(prev => (prev + 1) % Math.max(1, preloadedWords.length));"""

new_modulo = """                setCurrentWordIndex(prev => prev + 1); // FIX: Linear — no wrapping. Missed words are re-queued separately."""

if old_modulo in content:
    content = content.replace(old_modulo, new_modulo, 1)
    changes += 1
    print("2. FIXED: Replaced modulo wrapping with linear progression")
else:
    print("[WARN] Modulo pattern not found")

# FIX 3: Re-queue missed words when answer is incorrect
# Add this right after the streak/score update for incorrect answers
# In checkAnswer, after setWordSoundsHistory for incorrect answers, re-add the word to the queue
old_history = """        // Record in history with additional metadata
        setWordSoundsHistory(prev => [...prev, {
            timestamp: Date.now(),
            activity: wordSoundsActivity,
            word: currentWordSoundsWord,
            correct: isCorrect,
            mode: showLetterHints ? 'visual' : 'sound_only',
            difficulty: getEffectiveDifficulty(),
            phonemes: wordSoundsPhonemes?.phonemes || []
        }]);"""

new_history = """        // Record in history with additional metadata
        setWordSoundsHistory(prev => [...prev, {
            timestamp: Date.now(),
            activity: wordSoundsActivity,
            word: currentWordSoundsWord,
            correct: isCorrect,
            mode: showLetterHints ? 'visual' : 'sound_only',
            difficulty: getEffectiveDifficulty(),
            phonemes: wordSoundsPhonemes?.phonemes || []
        }]);
        // FIX: Re-queue missed words for retry (incorrect answers come back later)
        if (!isCorrect && currentWordSoundsWord) {
            const requeueActId = wordSoundsActivity || 'segmentation';
            const currentQueue = sessionQueueRef.current[requeueActId] || [];
            // Add to end of queue (spaced repetition: will come back after other words)
            const wordEntry = preloadedWords.find(pw =>
                (pw.word?.toLowerCase() === currentWordSoundsWord.toLowerCase() ||
                 pw.targetWord?.toLowerCase() === currentWordSoundsWord.toLowerCase())
            ) || currentWordSoundsWord;
            sessionQueueRef.current[requeueActId] = [...currentQueue, wordEntry];
            debugLog("♻️ Re-queued missed word for retry:", currentWordSoundsWord);
        }"""

if old_history in content:
    content = content.replace(old_history, new_history, 1)
    changes += 1
    print("3. FIXED: Added missed-word re-queue logic for incorrect answers")
else:
    print("[WARN] History pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nApplied %d fixes" % changes)
