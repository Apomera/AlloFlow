"""
Fix Find Sounds getting stuck on 'Loading sounds...'

Root causes:
1. Primary queue path (L8994-8998): Only sets isolationState if bufferedWord.isolationOptions exists.
   If preloaded data doesn't have isolationOptions, isolationState stays null → 'Loading sounds...'
2. Fallback path (L9038-9069): Handles blending/rhyming but NOT isolation → same stuck state
3. isLoadingPhonemes is not always cleared when transitioning words

Fixes:
A. Add isolation state generation when isolationOptions is missing (primary path)
B. Add isolation handling to fallback path
C. Ensure isLoadingPhonemes(false) is always called in the advancement path
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# FIX A: In the primary queue path, generate isolation state if not present
old_iso_primary = """                // FIX: Set isolation options from prefetched data
                if (wordSoundsActivity === 'isolation' && bufferedWord.isolationOptions) {
                    lastWordForIsolation.current = targetWord;
                    isolationPositionRef.current = bufferedWord.isolationOptions.currentPosition;
                    setIsolationState(bufferedWord.isolationOptions);
                }"""

new_iso_primary = """                // FIX: Set isolation options from prefetched data OR generate them
                if (wordSoundsActivity === 'isolation') {
                    if (bufferedWord.isolationOptions) {
                        lastWordForIsolation.current = targetWord;
                        isolationPositionRef.current = bufferedWord.isolationOptions.currentPosition;
                        setIsolationState(bufferedWord.isolationOptions);
                    } else if (lastWordForIsolation.current !== targetWord) {
                        // FIX: Generate isolation state on-the-fly if not preloaded
                        debugLog("🔧 Generating isolation state for:", targetWord);
                        const phonemes = phonemeData?.phonemes || estimatePhonemesBasic(targetWord);
                        const positions = ['first', 'last', 'middle'];
                        const position = positions[Math.floor(Math.random() * positions.length)];
                        const correctIdx = position === 'first' ? 0 : position === 'last' ? phonemes.length - 1 : Math.floor(phonemes.length / 2);
                        const correctPhoneme = phonemes[correctIdx] || phonemes[0] || targetWord.charAt(0);
                        const allPhonemes = [...new Set(phonemes)];
                        const distractors = allPhonemes.filter(p => p !== correctPhoneme).slice(0, 3);
                        while (distractors.length < 3) distractors.push(['b','d','f','g','k','l','m','n','p','r','s','t'][Math.floor(Math.random() * 12)]);
                        const isoOptions = fisherYatesShuffle([correctPhoneme, ...distractors.slice(0, 3)]);
                        const generatedState = {
                            correctAnswer: correctPhoneme,
                            currentPosition: position,
                            isoOptions: isoOptions,
                            prompt: position === 'first' ? 'beginning' : position === 'last' ? 'ending' : 'middle'
                        };
                        isolationPositionRef.current = position;
                        lastWordForIsolation.current = targetWord;
                        setIsolationState(generatedState);
                    }
                }"""

if old_iso_primary in content:
    content = content.replace(old_iso_primary, new_iso_primary, 1)
    changes += 1
    print("A. FIXED: Generate isolation state on-the-fly if not preloaded (primary path)")
else:
    print("[WARN] Primary isolation pattern not found")

# FIX B: Add isolation handling to fallback path (after blending/rhyming handling)
old_fallback_end = """                    } else {
                        // CONSOLIDATED: Use local fallback instead of fetchWordData
                        debugLog("📦 Using local fallback for:", targetWord, "(no preloaded match)");
                        const fallback = generateFallbackData(targetWord);
                        if (fallback) {
                            applyWordDataToState(fallback);
                            wordDataCache.current.set(targetWord.toLowerCase(), fallback);
                        }
                        setIsLoadingPhonemes(false);
                    }
                    setWordSoundsFeedback?.(null);
                    setUserAnswer('');"""

new_fallback_end = """                    } else {
                        // CONSOLIDATED: Use local fallback instead of fetchWordData
                        debugLog("📦 Using local fallback for:", targetWord, "(no preloaded match)");
                        const fallback = generateFallbackData(targetWord);
                        if (fallback) {
                            applyWordDataToState(fallback);
                            wordDataCache.current.set(targetWord.toLowerCase(), fallback);
                        }
                        setIsLoadingPhonemes(false);
                    }
                    // FIX: Generate isolation state for fallback words
                    if (wordSoundsActivity === 'isolation' && lastWordForIsolation.current !== targetWord) {
                        debugLog("🔧 [Fallback] Generating isolation state for:", targetWord);
                        const iso_phonemes = preloadedMatch?.phonemes || estimatePhonemesBasic(targetWord);
                        const iso_positions = ['first', 'last', 'middle'];
                        const iso_position = iso_positions[Math.floor(Math.random() * iso_positions.length)];
                        const iso_correctIdx = iso_position === 'first' ? 0 : iso_position === 'last' ? iso_phonemes.length - 1 : Math.floor(iso_phonemes.length / 2);
                        const iso_correct = iso_phonemes[iso_correctIdx] || iso_phonemes[0] || targetWord.charAt(0);
                        const iso_all = [...new Set(iso_phonemes)];
                        const iso_dist = iso_all.filter(p => p !== iso_correct).slice(0, 3);
                        while (iso_dist.length < 3) iso_dist.push(['b','d','f','g','k','l','m','n','p','r','s','t'][Math.floor(Math.random() * 12)]);
                        const iso_opts = fisherYatesShuffle([iso_correct, ...iso_dist.slice(0, 3)]);
                        isolationPositionRef.current = iso_position;
                        lastWordForIsolation.current = targetWord;
                        setIsolationState({
                            correctAnswer: iso_correct,
                            currentPosition: iso_position,
                            isoOptions: iso_opts,
                            prompt: iso_position === 'first' ? 'beginning' : iso_position === 'last' ? 'ending' : 'middle'
                        });
                    }
                    setIsLoadingPhonemes(false); // FIX: Always ensure loading cleared
                    setWordSoundsFeedback?.(null);
                    setUserAnswer('');"""

if old_fallback_end in content:
    content = content.replace(old_fallback_end, new_fallback_end, 1)
    changes += 1
    print("B. FIXED: Added isolation state generation to fallback path")
else:
    print("[WARN] Fallback end pattern not found")

# FIX C: Add isLoadingPhonemes(false) in the primary queue path (after setIsolationState)
# The primary path at L8934 calls applyWordDataToState which may or may not clear the loading flag.
# Let's add explicit clearing.
old_primary_next = """                // FIXED: Advance to next word WITHOUT removing from list
                // Words persist for reuse across activities
                setCurrentWordIndex(prev => (prev + 1) % Math.max(1, preloadedWords.length));
                setNextWordBuffer(null); // Clear legacy buffer"""

new_primary_next = """                setIsLoadingPhonemes(false); // FIX: Always ensure loading state is cleared
                // FIXED: Advance to next word WITHOUT removing from list
                // Words persist for reuse across activities
                setCurrentWordIndex(prev => (prev + 1) % Math.max(1, preloadedWords.length));
                setNextWordBuffer(null); // Clear legacy buffer"""

if old_primary_next in content:
    content = content.replace(old_primary_next, new_primary_next, 1)
    changes += 1
    print("C. FIXED: Added explicit isLoadingPhonemes(false) to primary queue path")
else:
    print("[WARN] Primary next pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nApplied %d fixes" % changes)
