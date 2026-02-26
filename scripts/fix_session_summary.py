"""
Enhance Session Complete modal with:
1. A local sessionWordResults ref tracking each word + correctness
2. Word-by-word recap in the completion modal  
3. "Practice Missed Words" button that starts a new session with only missed words
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# FIX 1: Add sessionWordResults ref near other refs
# Insert after: const submissionLockRef = React.useRef(false);
old_ref = """    const submissionLockRef = React.useRef(false);
    const feedbackAudioRef = React.useRef(null); // Track feedback audio for cleanup // Prevent race condition on rapid answer"""

new_ref = """    const submissionLockRef = React.useRef(false);
    const sessionWordResults = React.useRef([]); // Track word-by-word results for session summary
    const feedbackAudioRef = React.useRef(null); // Track feedback audio for cleanup // Prevent race condition on rapid answer"""

if old_ref in content:
    content = content.replace(old_ref, new_ref, 1)
    changes += 1
    print("1. FIXED: Added sessionWordResults ref")
else:
    print("[WARN] Ref pattern not found")

# FIX 2: Record each word result in checkAnswer
# Find the score update and add tracking there
# Looking for: setWordSoundsScore(prev => ...correct... + 1
# We need to find: isCorrect && ... setWordSoundsScore
# Simple approach: add tracking right after feedback is set  
# Find: submissionLockRef.current = false; (at end of feedback timeout)
# Actually, let's find the isCorrect branching and add before score update

old_score = """            // Update Score
            setWordSoundsScore(prev => ({
                correct: prev.correct + (isCorrect ? 1 : 0),
                total: prev.total + 1
            }));"""

new_score = """            // Track word result for session summary
            sessionWordResults.current.push({ 
                word: currentWordSoundsWord, 
                correct: isCorrect,
                activity: wordSoundsActivity,
                attempts: attempts + 1,
                timestamp: Date.now()
            });
            // Update Score
            setWordSoundsScore(prev => ({
                correct: prev.correct + (isCorrect ? 1 : 0),
                total: prev.total + 1
            }));"""

if old_score in content:
    content = content.replace(old_score, new_score, 1)
    changes += 1
    print("2. FIXED: Added word result tracking in checkAnswer")
else:
    print("[WARN] Score update pattern not found")

# FIX 3: Clear sessionWordResults when starting a new activity
old_start = """        setShowSessionComplete(false); // FIX: Always reset on new activity start"""

new_start = """        setShowSessionComplete(false); // FIX: Always reset on new activity start
        sessionWordResults.current = []; // Clear word results for new session"""

if old_start in content:
    content = content.replace(old_start, new_start, 1)
    changes += 1
    print("3. FIXED: Clear sessionWordResults on new activity start")
else:
    print("[WARN] startActivity pattern not found")

# FIX 4: Enhance the session complete modal with word recap + practice missed
# Replace the existing Stats Grid with enhanced version including word recap
old_stats_end = """                    </div>
                    {/* Actions */}
                    <div className="p-6 flex flex-col gap-3">
                        <button 
                            onClick={() => {
                                setShowSessionComplete(false);
                                // Reset for new session
                                setWordSoundsScore({ correct: 0, total: 0 });
                                setWordSoundsSessionProgress?.(0);
                                startActivity(wordSoundsActivity); // Restart same activity
                            }}
                            className="w-full py-4 bg-white text-violet-600 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform"
                        >
                            🔄 {ts('word_sounds.play_again') || 'Play Again'}
                        </button>"""

new_stats_end = """                    </div>
                    {/* Word-by-Word Recap */}
                    {sessionWordResults.current.length > 0 && (
                        <div className="px-6 pb-2">
                            <div className="text-xs uppercase tracking-wider text-white/50 font-bold mb-2">Word Recap</div>
                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-thin">
                                {[...new Map(sessionWordResults.current.map(r => [r.word, r])).values()].map((r, i) => (
                                    <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                        r.correct 
                                            ? 'bg-green-400/20 text-green-200' 
                                            : 'bg-red-400/20 text-red-200'
                                    }`}>
                                        {r.correct ? '✓' : '✗'} {r.word}
                                        {r.attempts > 1 && <span className="text-white/40">({r.attempts}×)</span>}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Actions */}
                    <div className="p-6 flex flex-col gap-3">
                        {/* Practice Missed Words - only if there are missed words */}
                        {sessionWordResults.current.filter(r => !r.correct).length > 0 && (
                            <button
                                onClick={() => {
                                    setShowSessionComplete(false);
                                    const missedWords = [...new Set(sessionWordResults.current.filter(r => !r.correct).map(r => r.word))];
                                    // Build a mini queue from missed words
                                    const actId = wordSoundsActivity || 'segmentation';
                                    sessionQueueRef.current[actId] = missedWords.map(w => ({ word: w, singleWord: w }));
                                    setWordSoundsScore({ correct: 0, total: 0 });
                                    setWordSoundsSessionProgress?.(0);
                                    sessionWordResults.current = [];
                                    // Start with first missed word
                                    const firstMissed = missedWords[0];
                                    setCurrentWordSoundsWord(firstMissed);
                                    const preloaded = preloadedWords.find(pw => 
                                        (pw.word?.toLowerCase() === firstMissed.toLowerCase() || 
                                         pw.targetWord?.toLowerCase() === firstMissed.toLowerCase()));
                                    if (preloaded) {
                                        setWordSoundsPhonemes(preloaded);
                                    } else {
                                        const fallback = generateFallbackData(firstMissed);
                                        if (fallback) applyWordDataToState(fallback);
                                    }
                                    setIsLoadingPhonemes(false);
                                }}
                                className="w-full py-4 bg-amber-400 text-amber-900 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform"
                            >
                                🎯 Practice Missed Words ({[...new Set(sessionWordResults.current.filter(r => !r.correct).map(r => r.word))].length})
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                setShowSessionComplete(false);
                                // Reset for new session
                                setWordSoundsScore({ correct: 0, total: 0 });
                                setWordSoundsSessionProgress?.(0);
                                sessionWordResults.current = [];
                                startActivity(wordSoundsActivity); // Restart same activity
                            }}
                            className="w-full py-4 bg-white text-violet-600 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform"
                        >
                            🔄 {ts('word_sounds.play_again') || 'Play Again'}
                        </button>"""

if old_stats_end in content:
    content = content.replace(old_stats_end, new_stats_end, 1)
    changes += 1
    print("4. FIXED: Enhanced session complete with word recap + practice missed")
else:
    print("[WARN] Session complete actions pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nApplied %d fixes" % changes)
