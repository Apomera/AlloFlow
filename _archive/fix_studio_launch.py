import os

filepath = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

replacement = """    React.useEffect(() => {
        if (wordSoundsActivity && (!sessionQueueRef.current[wordSoundsActivity] || sessionQueueRef.current[wordSoundsActivity].length === 0)) {
            debugLog("🚀 Initializing Session Queue for", wordSoundsActivity);
            generateSessionQueue(wordSoundsActivity, wordSoundsDifficulty || 'medium');
            if (!currentWordSoundsWord) {
                 const hasWords = (wordPool && wordPool.length > 0) || (preloadedWords && preloadedWords.length > 0);
                 if (hasWords) {
                     // Since we skip the review panel and want to directly launch into the configured activity:
                     hasStartedFromReview.current = true;
                     startActivity(wordSoundsActivity);
                 } else {
                     const first = getAdaptiveRandomWord();
                     if (first) {
                         const w = first.singleWord || first.word || first;
                         setCurrentWordSoundsWord(w);
                     }
                 }
            }
        }
    }, [wordSoundsActivity, wordPool, preloadedWords.length, generateSessionQueue, startActivity]);
"""

start_idx = -1
for i, line in enumerate(lines):
    if "if (wordSoundsActivity && (!sessionQueueRef.current[wordSoundsActivity] || sessionQueueRef.current[wordSoundsActivity].length === 0)) {" in line:
        for offset in range(1, 5):
            if "React.useEffect(() => {" in lines[i - offset]:
                start_idx = i - offset
                break
        if start_idx != -1:
            break

if start_idx != -1:
    end_idx = -1
    for j in range(start_idx, start_idx + 30):
        if "}, [wordSoundsActivity, wordPool, preloadedWords.length, generateSessionQueue]);" in lines[j]:
            end_idx = j
            break
            
    if end_idx != -1:
        new_lines = lines[:start_idx] + [replacement] + lines[end_idx+1:]
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f"Replacement successful! Replaced lines {start_idx} to {end_idx}.")
    else:
        print("Found start but not end.")
else:
    print("Could not find start index.")
