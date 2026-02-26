"""
Fix remaining bugs — CR/LF-aware version.
The file uses \r\n line endings; we normalize before matching and restore after.
"""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Normalize to \n for matching
content = content.replace('\r\n', '\n')
original_len = len(content)
print(f"Loaded {original_len} chars (normalized)")
changes = 0

# ============================================================
# FIX 2: Word Scramble — tile depletion
# ============================================================
print("\n=== FIX 2: Word Scramble letter depletion ===")

# 2a: State already added (usedScrambleIndices). Verify:
if 'usedScrambleIndices' in content:
    print("  ✓ usedScrambleIndices state already exists")
else:
    print("  WARNING: usedScrambleIndices not found")

# 2b: Update tile rendering
old_tile = """                            {scrambledLetters.map((letter, idx) => (
                                <div 
                                    key={idx}
                                    className="w-12 h-14 border-2 border-violet-300 bg-violet-50 rounded-lg flex items-center justify-center text-2xl font-bold uppercase text-violet-700 shadow-md hover:scale-105 transition-transform cursor-pointer"
                                    onClick={() => setUserAnswer((prev) => (prev || '') + letter)}
                                >
                                    {letter.toUpperCase()}
                                </div>
                            ))}"""

new_tile = """                            {scrambledLetters.map((letter, idx) => {
                                const isUsed = usedScrambleIndices.includes(idx);
                                return (
                                <div 
                                    key={idx}
                                    className={`w-12 h-14 border-2 rounded-lg flex items-center justify-center text-2xl font-bold uppercase shadow-md transition-all ${
                                        isUsed 
                                            ? 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed opacity-50' 
                                            : 'border-violet-300 bg-violet-50 text-violet-700 hover:scale-105 cursor-pointer'
                                    }`}
                                    onClick={() => {
                                        if (isUsed) return;
                                        setUserAnswer((prev) => (prev || '') + letter);
                                        setUsedScrambleIndices((prev) => [...prev, idx]);
                                    }}
                                >
                                    {letter.toUpperCase()}
                                </div>
                                );
                            })}"""

if old_tile in content:
    content = content.replace(old_tile, new_tile)
    changes += 1
    print("  Updated tile onClick with depletion tracking + visual feedback")
else:
    print("  WARNING: scrambled tile block not found")

# 2c: Clear button
old_clear = """                            <button
                                onClick={() => setUserAnswer('')}
                                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-all"
                            >
                                {ts('word_sounds.word_scramble_clear')}
                            </button>"""

new_clear = """                            <button
                                onClick={() => { setUserAnswer(''); setUsedScrambleIndices([]); }}
                                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-all"
                            >
                                {ts('word_sounds.word_scramble_clear')}
                            </button>"""

if old_clear in content:
    content = content.replace(old_clear, new_clear)
    changes += 1
    print("  Updated Clear button to reset usedScrambleIndices")
else:
    print("  WARNING: Clear button not found")

# 2d: Reset on correct answer
old_correct = """                        setWordSoundsFeedback({ type: 'correct', message: '🎉 Unscrambled!' });
                        setTimeout(() => {
                if (!isMountedRef.current) return;
                            setUserAnswer('');
                            checkAnswer('correct', 'correct');
                        }, 1500);"""

new_correct = """                        setWordSoundsFeedback({ type: 'correct', message: '🎉 Unscrambled!' });
                        setTimeout(() => {
                if (!isMountedRef.current) return;
                            setUserAnswer('');
                            setUsedScrambleIndices([]);
                            checkAnswer('correct', 'correct');
                        }, 1500);"""

if old_correct in content:
    content = content.replace(old_correct, new_correct)
    changes += 1
    print("  Reset usedScrambleIndices on correct answer")
else:
    print("  WARNING: scramble correct handler not found")

# 2e: Reset on wrong answer
old_wrong = """                        setWordSoundsFeedback({ type: 'incorrect', message: 'Not quite! Try again 🔀' });
                        // Engage retry mechanic (Second Chance + progressive image reveal)
                        checkAnswer('incorrect', 'correct');
                    }
                };
                
                return (
                    <div className="flex flex-col items-center gap-5 p-4">
                        {renderPrompt()}
                        {/* Activity Header */}
                        <div className="text-center">
                            <div className="text-4xl mb-2">🔀</div>"""

new_wrong = """                        setWordSoundsFeedback({ type: 'incorrect', message: 'Not quite! Try again 🔀' });
                        setUserAnswer('');
                        setUsedScrambleIndices([]);
                        // Engage retry mechanic (Second Chance + progressive image reveal)
                        checkAnswer('incorrect', 'correct');
                    }
                };
                
                return (
                    <div className="flex flex-col items-center gap-5 p-4">
                        {renderPrompt()}
                        {/* Activity Header */}
                        <div className="text-center">
                            <div className="text-4xl mb-2">🔀</div>"""

if old_wrong in content:
    content = content.replace(old_wrong, new_wrong)
    changes += 1
    print("  Reset usedScrambleIndices + userAnswer on wrong answer")
else:
    print("  WARNING: scramble wrong context not found")


# ============================================================
# FIX 3: Word Families — distractor scoring
# ============================================================
print("\n=== FIX 3: Word Families wrong answer scoring ===")

# 3a: In WordFamiliesView, add onCheckAnswer('incorrect') on distractor click
old_wrong_click = """            if (item.isFamily) {
                // Correct!
                const newFound = [...foundWords, item.text];
                setFoundWords(newFound);
                
                // Check if all family members found
                const allMembers = data.options;
                const uniqueFound = new Set(newFound);
                if (allMembers.every(m => uniqueFound.has(m))) {
                     setIsComplete(true);
                     setTimeout(() => onCheckAnswer('correct'), 1000);
                }
            } else {
                // Wrong!
                setShakenWord(item.text);
                setTimeout(() => { if (isMountedRef.current) setShakenWord(null); }, 500);
            }"""

new_wrong_click = """            if (item.isFamily) {
                // Correct! Add to found words
                const newFound = [...foundWords, item.text];
                setFoundWords(newFound);
                
                // Check if all family members found
                const allMembers = data.options;
                const uniqueFound = new Set(newFound);
                if (allMembers.every(m => uniqueFound.has(m))) {
                     setIsComplete(true);
                     setTimeout(() => onCheckAnswer('correct'), 1000);
                }
            } else {
                // Wrong! Shake animation + record incorrect for scoring
                setShakenWord(item.text);
                setTimeout(() => { if (isMountedRef.current) setShakenWord(null); }, 500);
                onCheckAnswer('incorrect');
            }"""

if old_wrong_click in content:
    content = content.replace(old_wrong_click, new_wrong_click)
    changes += 1
    print("  WordFamiliesView now calls onCheckAnswer('incorrect') on distractor click")
else:
    print("  WARNING: WordFamiliesView wrong click block not found")
    
# 3b: Fix parent callback to pass result through
old_parent = """                        onCheckAnswer={(word) => {
                            checkAnswer('correct', 'correct'); 
                        }}"""

new_parent = """                        onCheckAnswer={(result) => {
                            checkAnswer(result, 'correct'); 
                        }}"""

if old_parent in content:
    content = content.replace(old_parent, new_parent)
    changes += 1  
    print("  Parent callback now passes through correct/incorrect result")
else:
    print("  WARNING: Parent callback not found")

# ============================================================
# Restore \r\n and save
# ============================================================
content = content.replace('\n', '\r\n')
print(f"\n=== Writing {changes} changes ===")
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Saved {FILE} ({len(content)} chars)")
