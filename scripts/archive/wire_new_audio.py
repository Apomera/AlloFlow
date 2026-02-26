"""
Wire 6 new audio keys into the code:
1. fb_try_again_listen -> 1st retry attempt
2. fb_almost -> 2nd retry attempt  
3. inst_orthography -> orthography activity instruction
4. inst_spelling_bee -> spelling_bee activity instruction
5. inst_word_scramble -> word_scramble activity instruction
6. inst_missing_letter -> missing_letter activity instruction
"""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
print(f"Loaded {original_len} chars")
changes = 0

# ============================================================
# FIX 1: Wire fb_try_again_listen into 1st retry
# ============================================================
print("\n=== FIX 1: Wire fb_try_again_listen into 1st retry ===")

old_retry1 = '''            if (newAttempts === 1) {
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
                }, 800);'''

new_retry1 = '''            if (newAttempts === 1) {
                // ATTEMPT 1: Gentle retry + replay word audio
                if (effectiveCheckMode === 'progressive') setShowImageForCurrentWord(true);
                setWordSoundsFeedback?.({
                    isCorrect: false,
                    message: "Try again! Listen closely... 👂",
                });
                // Play "Try again, listen carefully" pre-recorded audio, then replay the word
                try {
                    if (typeof INSTRUCTION_AUDIO !== 'undefined' && INSTRUCTION_AUDIO['fb_try_again_listen']) {
                        const tryAgainAudio = new Audio(INSTRUCTION_AUDIO['fb_try_again_listen']);
                        tryAgainAudio.volume = 0.7;
                        tryAgainAudio.play().catch(() => {});
                        // After the "try again" clip, replay the target word
                        tryAgainAudio.onended = () => {
                            if (isMountedRef.current && currentWordSoundsWord) {
                                setTimeout(() => handleAudio(currentWordSoundsWord), 300);
                            }
                        };
                    } else {
                        // TTS fallback: just replay the word
                        setTimeout(() => {
                            if (isMountedRef.current && currentWordSoundsWord) handleAudio(currentWordSoundsWord);
                        }, 800);
                    }
                } catch(e) { debugLog('fb_try_again_listen error', e); }'''

if old_retry1 in content:
    content = content.replace(old_retry1, new_retry1)
    changes += 1
    print("  Wired fb_try_again_listen into 1st retry")
else:
    print("  WARNING: 1st retry block not found")

# ============================================================
# FIX 2: Wire fb_almost into 2nd retry
# ============================================================
print("\n=== FIX 2: Wire fb_almost into 2nd retry ===")

old_retry2 = '''            } else {
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
            }'''

new_retry2 = '''            } else {
                // ATTEMPT 2: Show hint + reveal text as scaffold
                const hint = wordSoundsPhonemes?.phonemes
                    ? `Hint: This word has ${wordSoundsPhonemes.phonemes.length} sounds and starts with "${expectedAnswer?.charAt(0).toUpperCase()}"` 
                    : `Hint: It starts with "${expectedAnswer?.charAt(0).toUpperCase()}"`;
                setWordSoundsFeedback?.({
                    isCorrect: false,
                    message: `${hint} — one more try! 💪`,
                });
                setShowWordText(true); // Reveal word text as scaffold
                // Play "Almost! Try one more time" then the correct answer
                try {
                    if (typeof INSTRUCTION_AUDIO !== 'undefined' && INSTRUCTION_AUDIO['fb_almost']) {
                        const almostAudio = new Audio(INSTRUCTION_AUDIO['fb_almost']);
                        almostAudio.volume = 0.7;
                        almostAudio.play().catch(() => {});
                        almostAudio.onended = () => {
                            if (isMountedRef.current) {
                                setTimeout(() => handleAudio(expectedAnswer), 300);
                            }
                        };
                    } else {
                        setTimeout(() => {
                            if (isMountedRef.current) handleAudio(expectedAnswer);
                        }, 800);
                    }
                } catch(e) { debugLog('fb_almost error', e); }
            }'''

if old_retry2 in content:
    content = content.replace(old_retry2, new_retry2)
    changes += 1
    print("  Wired fb_almost into 2nd retry")
else:
    print("  WARNING: 2nd retry block not found")

# ============================================================
# FIX 3: Map inst_* keys to activity IDs in instruction lookup
# ============================================================
print("\n=== FIX 3: Map inst_* instruction audio to activities ===")

# The instruction playback at L7476 checks INSTRUCTION_AUDIO[wordSoundsActivity]
# For new activities that use inst_* keys, we need to add a fallback lookup
# Best approach: add a mapping before the lookup

old_instruction_check = '''            // 1. Determine instruction source
            // Check for pre-recorded instruction audio first
            if (typeof INSTRUCTION_AUDIO !== 'undefined' && INSTRUCTION_AUDIO[wordSoundsActivity] && wordSoundsActivity !== 'rhyming') {
                instructionAudioSrc = INSTRUCTION_AUDIO[wordSoundsActivity];'''

new_instruction_check = '''            // 1. Determine instruction source
            // Map activity IDs to instruction audio keys (some use inst_ prefix)
            const INST_KEY_MAP = {
                orthography: 'inst_orthography',
                spelling_bee: 'inst_spelling_bee',
                word_scramble: 'inst_word_scramble',
                missing_letter: 'inst_missing_letter',
                counting: 'inst_counting',
                blending: 'inst_blending',
                segmentation: 'inst_segmentation',
                rhyming: 'inst_rhyming',
                letter_tracing: 'inst_letter_tracing',
                word_families: 'inst_word_families',
            };
            const instKey = INST_KEY_MAP[wordSoundsActivity] || wordSoundsActivity;
            // Check for pre-recorded instruction audio first
            if (typeof INSTRUCTION_AUDIO !== 'undefined' && (INSTRUCTION_AUDIO[instKey] || INSTRUCTION_AUDIO[wordSoundsActivity]) && wordSoundsActivity !== 'rhyming') {
                instructionAudioSrc = INSTRUCTION_AUDIO[instKey] || INSTRUCTION_AUDIO[wordSoundsActivity];'''

if old_instruction_check in content:
    content = content.replace(old_instruction_check, new_instruction_check)
    changes += 1
    print("  Added INST_KEY_MAP for all activity instruction audio keys")
else:
    print("  WARNING: Instruction check block not found")

# Save
print(f"\n=== Writing {changes} changes ===")
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Saved {FILE} ({len(content)} chars, was {original_len})")
