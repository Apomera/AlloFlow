"""
Fix Word Sounds CDN module:
1. Add instruction audio playback when activity changes
2. Add auto-advance to next activity when session is complete
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# =====  FIX 1: Instruction audio playback on activity change =====
# The module has playInstructions = true by default
# It has INSTRUCTION_AUDIO object (from the main app via window)
# Need to add a useEffect that plays the instruction audio when wordSoundsActivity changes
# Insert after "React.useEffect(() => { loadWordAudioBank(); }, []);"
# This is a safe insertion point that exists only once

ANCHOR1 = "React.useEffect(() => { loadWordAudioBank(); }, []);"
if ANCHOR1 in c:
    instruction_effect = """ React.useEffect(() => {
            if (!playInstructions || !wordSoundsActivity || showReviewPanel) return;
            const activityInstructionMap = {
                'counting': 'how_many_sounds',
                'isolation': 'what_is_the_sound',
                'blending': 'listen_to_sounds',
                'segmentation': 'break_the_word',
                'rhyming': 'which_word_rhymes',
                'letter_tracing': 'trace_the_letter',
                'mapping': 'match_sounds_to_letters',
                'orthography': 'spell_the_word',
                'sound_sort': 'sort_the_sounds',
                'word_families': 'find_word_family',
                'spelling_bee': 'spell_the_word',
                'word_scramble': 'unscramble_the_word',
                'missing_letter': 'find_missing_letter'
            };
            const instrKey = activityInstructionMap[wordSoundsActivity];
            if (!instrKey) return;
            const playInstr = async () => {
                await new Promise(r => setTimeout(r, 600));
                if (typeof INSTRUCTION_AUDIO !== 'undefined' && INSTRUCTION_AUDIO[instrKey]) {
                    debugLog('🔊 Playing instruction audio for:', wordSoundsActivity, instrKey);
                    try {
                        const audio = new Audio(INSTRUCTION_AUDIO[instrKey]);
                        audio.playbackRate = 0.95;
                        await new Promise((res, rej) => {
                            audio.onended = res;
                            audio.onerror = () => { warnLog('Instruction audio error'); res(); };
                            setTimeout(res, 8000);
                            audio.play().catch(() => res());
                        });
                    } catch (e) { warnLog('Instruction playback failed:', e); }
                } else {
                    debugLog('⚠️ No instruction audio for:', instrKey, '- using TTS fallback');
                    const fallbackTexts = {
                        'how_many_sounds': 'How many sounds do you hear?',
                        'what_is_the_sound': 'What sound do you hear?',
                        'listen_to_sounds': 'Listen to the sounds and pick the word.',
                        'break_the_word': 'Break the word into its sounds.',
                        'which_word_rhymes': 'Which word rhymes?',
                        'trace_the_letter': 'Trace the letter.',
                        'match_sounds_to_letters': 'Match the sounds to their letters.',
                        'spell_the_word': 'Spell the word you hear.',
                        'sort_the_sounds': 'Sort the sounds.',
                        'find_word_family': 'Find the word family.',
                        'unscramble_the_word': 'Unscramble the word.',
                        'find_missing_letter': 'Find the missing letter.'
                    };
                    const text = fallbackTexts[instrKey];
                    if (text && handleAudio) {
                        try { await handleAudio(text); } catch(e) { /* silent */ }
                    }
                }
            };
            playInstr();
        }, [wordSoundsActivity, showReviewPanel]);"""
    c = c.replace(ANCHOR1, ANCHOR1 + instruction_effect)
    changes += 1
    print(f'Fix 1 applied: Instruction audio useEffect added after loadWordAudioBank')
else:
    print(f'Fix 1 SKIPPED: anchor not found')

# ===== FIX 2: Auto-advance to next activity when session completes =====
# When showSessionComplete becomes true, check if there's a next activity in the sequence
# Insert after the showSessionComplete useState declaration
# Find "const [showSessionComplete, setShowSessionComplete] = React.useState(false);"

ANCHOR2 = "const [showSessionComplete, setShowSessionComplete] = React.useState(false);"
if ANCHOR2 in c:
    auto_advance_effect = """ React.useEffect(() => {
            if (!showSessionComplete) return;
            if (activitySequence && activitySequence.length > 0) {
                const currentIdx = sequenceIndexRef.current;
                const nextIdx = currentIdx + 1;
                if (nextIdx < activitySequence.length) {
                    debugLog('🎯 Auto-advancing to next activity:', activitySequence[nextIdx], 'index:', nextIdx);
                    const advanceTimer = setTimeout(() => {
                        if (!isMountedRef.current) return;
                        setShowSessionComplete(false);
                        sequenceIndexRef.current = nextIdx;
                        setSequenceIndex(nextIdx);
                        const nextAct = activitySequence[nextIdx];
                        if (nextAct && setWordSoundsActivity) {
                            setWordSoundsActivity(nextAct);
                            setPlayInstructions(true);
                            debugLog('✅ Advanced to activity:', nextAct);
                        }
                    }, 3000);
                    return () => clearTimeout(advanceTimer);
                } else {
                    debugLog('🏁 All activities in sequence completed!');
                }
            }
        }, [showSessionComplete, activitySequence]);"""
    c = c.replace(ANCHOR2, ANCHOR2 + auto_advance_effect)
    changes += 1
    print(f'Fix 2 applied: Auto-advance useEffect added after showSessionComplete')
else:
    print(f'Fix 2 SKIPPED: anchor not found')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\nTotal changes: {changes}/2')
