"""
Fix 3 top priority bugs from activity audit:
1. Remove duplicate setTracingPhase('upper') reset
2. Word Scramble: track used letter indices (grey out used tiles)
3. Word Families: distractor clicks should record incorrect answer
"""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
print(f"Loaded {original_len} chars")
changes = 0

# ============================================================
# FIX 1: Remove duplicate setTracingPhase('upper')
# ============================================================
print("\n=== FIX 1: Remove duplicate tracing reset ===")

old_dup = """        if (wordSoundsActivity === 'letter_tracing') {
            setTracingPhase('upper');
        }
        
        // Reset tracing phase when word changes
        if (wordSoundsActivity === 'letter_tracing') {
            setTracingPhase('upper');
        }"""

new_dup = """        if (wordSoundsActivity === 'letter_tracing') {
            setTracingPhase('upper');
        }"""

if old_dup in content:
    content = content.replace(old_dup, new_dup)
    changes += 1
    print("  Removed duplicate setTracingPhase('upper') block")
else:
    print("  WARNING: Duplicate tracing reset not found")

# ============================================================
# FIX 2: Word Scramble — track used letter indices
# ============================================================
print("\n=== FIX 2: Word Scramble letter depletion ===")

# The scrambled letters map renders tiles that append to userAnswer on click
# We need to check if a letter at index idx has already been used
# Since userAnswer tracks the typed answer, we can derive used indices from it.
# But that's tricky because the same letter can appear twice.
# Better approach: track usedScrambleIndices as a Set derived from userAnswer length
# Since clicking appends one letter, usedIndices = first N indices of scrambledLetters
# that match the userAnswer built so far.

# Actually the simplest approach: since clicking appends the letter at idx,
# we just need to track which indices were clicked. We can use userAnswer length
# as a proxy — the first userAnswer.length tiles should be disabled.
# But tiles are in scrambled order, not answer order.

# Best approach: Add a usedScrambleIndices state tracking array.
# But we want to minimize state additions in the monolith.
# Alternative: use the userAnswer to derive which indices are "consumed".
# When user types in the text field, we can't track indices.
# So let's just grey out tiles based on a simple approach:
# Track indices in order they were clicked.

# Actually, let me rethink. The cleanest fix is:
# - When a tile at idx is clicked, mark it as used by tracking clicked indices
# - Since userAnswer already tracks the lettters, we can track consumed indices
# - On "Clear", reset the tracking

# Since we need new state, let's add it near the existing scrambledLetters memo.

# Step 1: Add usedScrambleIndices state near scrambledLetters
old_scramble_memo = """    const scrambledLetters = React.useMemo(() => 
        scrambleWord(currentWordSoundsWord?.toLowerCase()), 
        [currentWordSoundsWord]
    );"""

new_scramble_memo = """    const scrambledLetters = React.useMemo(() => 
        scrambleWord(currentWordSoundsWord?.toLowerCase()), 
        [currentWordSoundsWord]
    );
    const [usedScrambleIndices, setUsedScrambleIndices] = React.useState([]);"""

if old_scramble_memo in content:
    content = content.replace(old_scramble_memo, new_scramble_memo)
    changes += 1
    print("  Added usedScrambleIndices state")
else:
    print("  WARNING: scrambledLetters memo not found")

# Step 2: Update tile onClick to track used indices + grey out used tiles
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

# Step 3: Reset usedScrambleIndices on Clear button
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

# Step 4: Reset usedScrambleIndices on correct/incorrect answer (inside checkScramble)
old_scramble_correct = """                        setWordSoundsFeedback({ type: 'correct', message: '🎉 Unscrambled!' });
                        setTimeout(() => {
                if (!isMountedRef.current) return;
                            setUserAnswer('');
                            checkAnswer('correct', 'correct');
                        }, 1500);"""

new_scramble_correct = """                        setWordSoundsFeedback({ type: 'correct', message: '🎉 Unscrambled!' });
                        setTimeout(() => {
                if (!isMountedRef.current) return;
                            setUserAnswer('');
                            setUsedScrambleIndices([]);
                            checkAnswer('correct', 'correct');
                        }, 1500);"""

if old_scramble_correct in content:
    content = content.replace(old_scramble_correct, new_scramble_correct)
    changes += 1
    print("  Reset usedScrambleIndices on correct answer")
else:
    print("  WARNING: scramble correct handler not found")

# Also reset on incorrect
old_scramble_wrong = """                        setWordSoundsFeedback({ type: 'incorrect', message: 'Not quite! Try again 🔀' });
                        // Engage retry mechanic (Second Chance + progressive image reveal)
                        checkAnswer('incorrect', 'correct');"""

# There could be two of these (spelling_bee has similar). Target only the word_scramble one.
# Let's be more specific by using surrounding context
old_scramble_wrong_ctx = """                    const correct = userAnswer?.toLowerCase().trim() === currentWordSoundsWord?.toLowerCase();
                    if (correct) {
                        setWordSoundsFeedback({ type: 'correct', message: '🎉 Unscrambled!' });
                        setTimeout(() => {
                if (!isMountedRef.current) return;
                            setUserAnswer('');
                            setUsedScrambleIndices([]);
                            checkAnswer('correct', 'correct');
                        }, 1500);
                    } else {
                        setWordSoundsFeedback({ type: 'incorrect', message: 'Not quite! Try again 🔀' });
                        // Engage retry mechanic (Second Chance + progressive image reveal)
                        checkAnswer('incorrect', 'correct');
                    }"""

new_scramble_wrong_ctx = """                    const correct = userAnswer?.toLowerCase().trim() === currentWordSoundsWord?.toLowerCase();
                    if (correct) {
                        setWordSoundsFeedback({ type: 'correct', message: '🎉 Unscrambled!' });
                        setTimeout(() => {
                if (!isMountedRef.current) return;
                            setUserAnswer('');
                            setUsedScrambleIndices([]);
                            checkAnswer('correct', 'correct');
                        }, 1500);
                    } else {
                        setWordSoundsFeedback({ type: 'incorrect', message: 'Not quite! Try again 🔀' });
                        setUserAnswer('');
                        setUsedScrambleIndices([]);
                        // Engage retry mechanic (Second Chance + progressive image reveal)
                        checkAnswer('incorrect', 'correct');
                    }"""

if old_scramble_wrong_ctx in content:
    content = content.replace(old_scramble_wrong_ctx, new_scramble_wrong_ctx)
    changes += 1
    print("  Reset usedScrambleIndices + userAnswer on wrong answer too")
else:
    print("  WARNING: scramble wrong handler context not found")


# ============================================================
# FIX 3: Word Families — distractor clicks should register
# ============================================================
print("\n=== FIX 3: Word Families wrong answer scoring ===")

# The WordFamiliesView component at L4536 handles wrong clicks with shake
# but never calls onCheckAnswer. We need to:
# 1. Call onCheckAnswer('incorrect') when a distractor is clicked
# 2. Fix parent callback to pass through the result

# Fix 3a: In WordFamiliesView, call onCheckAnswer on distractor click
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
                // Wrong! Shake animation + record incorrect
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

# Fix 3b: Parent callback should pass through the result
old_parent_cb = """                        onCheckAnswer={(word) => {
                            checkAnswer('correct', 'correct'); 
                        }}"""

new_parent_cb = """                        onCheckAnswer={(result) => {
                            checkAnswer(result, 'correct'); 
                        }}"""

if old_parent_cb in content:
    content = content.replace(old_parent_cb, new_parent_cb)
    changes += 1
    print("  Parent callback now passes through correct/incorrect result")
else:
    print("  WARNING: Parent callback not found")


# ============================================================
# Save
# ============================================================
print(f"\n=== Writing {changes} changes ===")
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Saved {FILE} ({len(content)} chars, was {original_len})")
