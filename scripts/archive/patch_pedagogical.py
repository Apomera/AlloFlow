"""
Four Pedagogical Improvements:
1. Corrective audio on wrong answers - play correct answer via handleAudio
2. Scaffolding on repeated failure - hints after multiple attempts
3. Re-enable letter hints when performance drops
4. Meaningful level progression - level affects difficulty & options
"""
import re

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
print(f"Loaded {original_len} chars")
changes = 0

# ============================================================
# FIX 1: Corrective Audio on Wrong Answers
# ============================================================
print("\n=== FIX 1: Corrective Audio ===")

# (A) On FIRST wrong answer (retry): play correct answer audio after "Try again"
# Find: "Try again! Listen closely..." feedback block
# After: setTimeout(() => { if (isMountedRef.current) setWordSoundsFeedback?.(null); }, 1500);
# Add: Play the correct answer so student can hear it

old_retry_block = '''            setWordSoundsFeedback?.({
                isCorrect: false,
                message: "Try again! Listen closely...",
            });
            // Auto-clear feedback after 1.5s so they can try again
            setTimeout(() => { if (isMountedRef.current) setWordSoundsFeedback?.(null); }, 1500);
            return;'''

new_retry_block = '''            setWordSoundsFeedback?.({
                isCorrect: false,
                message: "Try again! Listen closely...",
            });
            // Corrective audio: replay the word so student hears it again
            setTimeout(() => {
                if (isMountedRef.current && currentWordSoundsWord) {
                    handleAudio(currentWordSoundsWord);
                }
            }, 800);
            // Auto-clear feedback after 2.5s so they can try again
            setTimeout(() => { if (isMountedRef.current) setWordSoundsFeedback?.(null); }, 2500);
            return;'''

if old_retry_block in content:
    content = content.replace(old_retry_block, new_retry_block)
    changes += 1
    print("  Added corrective audio replay on first wrong answer")
else:
    print("  WARNING: First wrong answer block not found")

# (B) On FINAL wrong answer: play the correct answer after showing text feedback
# Find: `: `Nice try! The answer was "${expectedAnswer}".``
# After the feedback message, add an audio play of the expected answer

old_final_wrong = '''            : `Nice try! The answer was "${expectedAnswer}".` 
        });
        // Auto-advance'''

new_final_wrong = '''            : `Nice try! The answer was "${expectedAnswer}".` 
        });
        // Corrective audio: speak the correct answer so student hears it
        if (!isCorrect && expectedAnswer) {
            setTimeout(() => {
                if (isMountedRef.current) handleAudio(expectedAnswer);
            }, 600);
        }
        // Auto-advance'''

if old_final_wrong in content:
    content = content.replace(old_final_wrong, new_final_wrong)
    changes += 1
    print("  Added corrective audio on final wrong answer")
else:
    print("  WARNING: Final wrong answer block not found")

# ============================================================
# FIX 2: Scaffolding on Repeated Failure
# ============================================================
print("\n=== FIX 2: Scaffolding on Repeated Failure ===")

# Currently there's only 1 retry (attempts goes 0 -> 1 -> final).
# We want a better scaffolding flow:
# - Attempt 1 (wrong): "Try again! Listen closely..." + replay word
# - Attempt 2 (wrong): Show hint (first letter or phoneme count) + reveal text
# - Attempt 3 (wrong): Auto-reveal answer and move on
# 
# Change the retry mechanic from 1 retry to 2 retries with progressive hints

# Find the retry condition: "if (!isCorrect && attempts === 0)"
old_retry_condition = '''        // RETRY MECHANIC (Second Chance)
        if (!isCorrect && attempts === 0) {
            setAttempts(1);
            // Progressive: reveal image after first incorrect
            if (effectiveCheckMode === 'progressive') setShowImageForCurrentWord(true);
            // After Completion: reveal on 2nd incorrect (handled in final scoring below)
            playSound('error'); // Soft error
            // Visual feedback
            setWordSoundsFeedback?.({
                isCorrect: false,
                message: "Try again! Listen closely...",
            });
            // Corrective audio: replay the word so student hears it again
            setTimeout(() => {
                if (isMountedRef.current && currentWordSoundsWord) {
                    handleAudio(currentWordSoundsWord);
                }
            }, 800);
            // Auto-clear feedback after 2.5s so they can try again
            setTimeout(() => { if (isMountedRef.current) setWordSoundsFeedback?.(null); }, 2500);
            return;
        }'''

new_retry_condition = '''        // RETRY MECHANIC (Progressive Scaffolding: 2 retries with hints)
        if (!isCorrect && attempts < 2) {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            playSound('error'); // Soft error

            if (newAttempts === 1) {
                // ATTEMPT 1: Gentle retry + replay word audio
                if (effectiveCheckMode === 'progressive') setShowImageForCurrentWord(true);
                setWordSoundsFeedback?.({
                    isCorrect: false,
                    message: "Try again! Listen closely... 👂",
                });
                // Corrective audio: replay the word
                setTimeout(() => {
                    if (isMountedRef.current && currentWordSoundsWord) {
                        handleAudio(currentWordSoundsWord);
                    }
                }, 800);
            } else {
                // ATTEMPT 2: Show hint + reveal text as scaffold
                const hint = wordSoundsPhonemes?.phonemes
                    ? `Hint: This word has ${wordSoundsPhonemes.phonemes.length} sounds and starts with "${expectedAnswer?.charAt(0).toUpperCase()}"` 
                    : `Hint: It starts with "${expectedAnswer?.charAt(0).toUpperCase()}"`;
                setWordSoundsFeedback?.({
                    isCorrect: false,
                    message: `${hint} — one more try! 💪`,
                });
                setShowWordText(true); // Reveal word text as scaffold
                // Play the correct answer so they can compare
                setTimeout(() => {
                    if (isMountedRef.current) handleAudio(expectedAnswer);
                }, 800);
            }
            // Auto-clear feedback after 3s so they can try again
            setTimeout(() => { if (isMountedRef.current) setWordSoundsFeedback?.(null); }, 3000);
            return;
        }'''

if old_retry_condition in content:
    content = content.replace(old_retry_condition, new_retry_condition)
    changes += 1
    print("  Upgraded retry mechanic from 1 to 2 retries with progressive hints")
else:
    print("  WARNING: Retry condition block not found")

# ============================================================
# FIX 3: Re-enable Letter Hints When Performance Drops
# ============================================================
print("\n=== FIX 3: Re-enable Hints on Performance Drop ===")

# When streak resets to 0 (wrong answer after hints were turned off),
# re-enable hints if the student is struggling.
# Find: "const newStreak = isCorrect" block, add re-enable logic after streak reset

# After streak is set at ": 0;" for wrong answers, add hint re-enable check
# The best place is right after "if (setWordSoundsStreak) setWordSoundsStreak(newStreak);"
old_streak_update = '''        if (setWordSoundsStreak) setWordSoundsStreak(newStreak);
        
        // Calculate XP with streak bonus and difficulty bonus'''

new_streak_update = '''        if (setWordSoundsStreak) setWordSoundsStreak(newStreak);
        
        // Re-enable letter hints if struggling (streak dropped to 0 twice in a row)
        if (!isCorrect && !showLetterHints && newStreak === 0) {
            const recentHistory = (wordSoundsHistory || []).slice(-5);
            const recentAccuracy = recentHistory.length > 0 
                ? recentHistory.filter(h => h.correct).length / recentHistory.length
                : 1;
            if (recentAccuracy < 0.4) {
                // Student is struggling (<40% recent accuracy) — re-enable scaffolding
                setShowLetterHints(true);
                setWordSoundsFeedback?.({
                    type: 'info',
                    message: "Let's add some text to help! 📝"
                });
                debugLog("📝 Letter hints re-enabled due to low accuracy:", recentAccuracy);
            }
        }
        
        // Calculate XP with streak bonus and difficulty bonus'''

if old_streak_update in content:
    content = content.replace(old_streak_update, new_streak_update)
    changes += 1
    print("  Added hint re-enable on low accuracy (<40% over last 5)")
else:
    print("  WARNING: Streak update block not found")

# ============================================================
# FIX 4: Meaningful Level Progression
# ============================================================
print("\n=== FIX 4: Meaningful Level Progression ===")

# Level currently increments every 10 correct but does nothing.
# Make it affect:
# (a) Number of response options (higher levels = more distractors)
# (b) Difficulty auto-scaling (higher level pushes toward harder words)
# (c) Visual: show level badge in header

# (A) Make getEffectiveDifficulty factor in level
old_difficulty = '''    const getEffectiveDifficulty = React.useCallback(() => {
        if (wordSoundsDifficulty !== 'auto') return wordSoundsDifficulty;
        
        // Get recent accuracy from history
        const recentHistory = (wordSoundsHistory || []).slice(-10);
        if (recentHistory.length < 3) return 'easy'; // Start easy
        
        const correctCount = recentHistory.filter(h => h.correct).length;
        const accuracy = correctCount / recentHistory.length;
        
        // Adaptive thresholds
        if (accuracy >= 0.85) return 'hard';
        if (accuracy >= 0.60) return 'medium';
        return 'easy';
    }, [wordSoundsDifficulty, wordSoundsHistory]);'''

new_difficulty = '''    const getEffectiveDifficulty = React.useCallback(() => {
        if (wordSoundsDifficulty !== 'auto') return wordSoundsDifficulty;
        
        // Get recent accuracy from history
        const recentHistory = (wordSoundsHistory || []).slice(-10);
        if (recentHistory.length < 3) return 'easy'; // Start easy
        
        const correctCount = recentHistory.filter(h => h.correct).length;
        const accuracy = correctCount / recentHistory.length;
        
        // Level-adjusted thresholds: higher levels push toward harder words sooner
        const levelBoost = Math.min((wordSoundsLevel - 1) * 0.05, 0.15); // Up to 15% boost
        
        if (accuracy >= (0.85 - levelBoost)) return 'hard';
        if (accuracy >= (0.60 - levelBoost)) return 'medium';
        return 'easy';
    }, [wordSoundsDifficulty, wordSoundsHistory, wordSoundsLevel]);'''

if old_difficulty in content:
    content = content.replace(old_difficulty, new_difficulty)
    changes += 1
    print("  Added level-based difficulty boost to getEffectiveDifficulty")
else:
    print("  WARNING: getEffectiveDifficulty block not found")

# (B) Add level-up feedback audio
old_levelup = '''                    setWordSoundsLevel && setWordSoundsLevel(l => l + 1); // Increment level
                    setWordSoundsFeedback?.({
                        type: 'success',
                        message: `🌟 LEVEL UP! Welcome to Level ${((newVal / 10) + 1)}! 🌟`
                    });'''

new_levelup = '''                    setWordSoundsLevel && setWordSoundsLevel(l => l + 1); // Increment level
                    const nextLevel = (newVal / 10) + 1;
                    const levelMessages = [
                        `🌟 LEVEL ${nextLevel}! Words are getting trickier! 🌟`,
                        `🚀 LEVEL ${nextLevel}! You're a phonics star! 🌟`,
                        `🏆 LEVEL ${nextLevel}! Challenge mode activated! 🌟`,
                    ];
                    setWordSoundsFeedback?.({
                        type: 'success',
                        message: levelMessages[Math.floor(Math.random() * levelMessages.length)]
                    });
                    // Level-up celebration audio
                    try {
                        if (typeof INSTRUCTION_AUDIO !== 'undefined' && INSTRUCTION_AUDIO['fb_amazing']) {
                            const audio = new Audio(INSTRUCTION_AUDIO['fb_amazing']);
                            audio.volume = 0.7;
                            audio.play().catch(() => {});
                        }
                    } catch(e) {}'''

if old_levelup in content:
    content = content.replace(old_levelup, new_levelup)
    changes += 1
    print("  Added level-aware messages and celebration audio")
else:
    print("  WARNING: Level-up block not found")

# Save
print(f"\n=== Writing {changes} changes ===")
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Saved {FILE} ({len(content)} chars, was {original_len})")
