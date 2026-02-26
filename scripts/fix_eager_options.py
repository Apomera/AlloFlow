"""
FIX: Eagerly set rhyme/blend options in startActivity when preloaded data
is available for the first word. This eliminates the render-cycle delay.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# After L8024 (setWordSoundsPhonemes(preloadedWord)), add eager option setting
old = """                setWordSoundsPhonemes(preloadedWord); // Full object with blendingDistractors
                setIsLoadingPhonemes(false);"""

new = """                setWordSoundsPhonemes(preloadedWord); // Full object with blendingDistractors
                setIsLoadingPhonemes(false);
                // FIX: Eagerly set distractor options to eliminate render-cycle latency
                if (activityId === 'blending' && preloadedWord.blendingDistractors) {
                    const distractors = preloadedWord.blendingDistractors.slice(0, 5);
                    setBlendingOptions(fisherYatesShuffle([targetWord, ...distractors]));
                    lastWordForBlending.current = targetWord;
                    debugLog("📋 [Eager] Set blending options from preloaded:", targetWord);
                }
                if (activityId === 'rhyming' && preloadedWord.rhymeDistractors) {
                    const correctRhyme = preloadedWord.rhymeWord;
                    const distractors = preloadedWord.rhymeDistractors.slice(0, 5);
                    const options = correctRhyme 
                        ? fisherYatesShuffle([correctRhyme, ...distractors])
                        : distractors;
                    setRhymeOptions(options);
                    lastWordForRhyming.current = targetWord;
                    debugLog("📋 [Eager] Set rhyme options from preloaded:", targetWord);
                }"""

if old in content:
    content = content.replace(old, new, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("FIXED: Added eager distractor option setting in startActivity for first word")
else:
    print("[WARN] Pattern not found")
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if 'setWordSoundsPhonemes(preloadedWord)' in l:
            print("L%d: %s" % (i+1, l.strip()[:180]))
