"""
3 remaining activity improvements:
1. Missing Letter: progressive hints on wrong answers
2. Blending: replay phonemes button
3. Rhyming: improve distractor filter to handle longer rimes

Plus localize remaining hardcoded strings found in these areas.
"""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
original = len(content)
changes = 0

# ================================================================
# 1. MISSING LETTER: Progressive hints on wrong answers
# ================================================================
# Currently (L8928-8932):
#   setWordSoundsFeedback({ type: 'incorrect', message: 'Not quite! Listen again' });
#   handleAudio(currentWordSoundsWord);
#   checkAnswer('incorrect', 'correct');
#
# Improvement: Track wrong attempts and provide escalating hints
# - 1st wrong: replay word
# - 2nd wrong: highlight letter position (e.g. "It's in position 3")
# - 3rd wrong: reveal the letter

old_missing_wrong = """                    } else {
                        setWordSoundsFeedback({ type: 'incorrect', message: 'Not quite! Listen again \xf0\x9f\x94\x8a' });
                        handleAudio(currentWordSoundsWord);
                        // Engage retry mechanic (Second Chance + progressive image reveal)
                        checkAnswer('incorrect', 'correct');
                    }
                };
                // letterOptions hoisted to component level
                return ("""

new_missing_wrong = """                    } else {
                        // Progressive hints: escalate help on repeated wrong answers
                        const attempts = (wordSoundsScore?.total || 0) - (wordSoundsScore?.correct || 0);
                        const position = (hiddenIndex || 0) + 1;
                        if (attempts >= 2) {
                            // 3rd+ attempt: reveal the answer
                            setWordSoundsFeedback({ type: 'incorrect', message: `\xf0\x9f\x92\xa1 The missing letter is "${correctLetter.toUpperCase()}"` });
                            setUserAnswer(correctLetter);
                        } else if (attempts >= 1) {
                            // 2nd attempt: position hint
                            setWordSoundsFeedback({ type: 'incorrect', message: `\xf0\x9f\x94\x8d Hint: It's letter #${position} in the word. Listen carefully!` });
                        } else {
                            // 1st attempt: just replay
                            setWordSoundsFeedback({ type: 'incorrect', message: 'Not quite! Listen again \xf0\x9f\x94\x8a' });
                        }
                        handleAudio(currentWordSoundsWord);
                        // Engage retry mechanic (Second Chance + progressive image reveal)
                        checkAnswer('incorrect', 'correct');
                    }
                };
                // letterOptions hoisted to component level
                return ("""

if old_missing_wrong in content:
    content = content.replace(old_missing_wrong, new_missing_wrong)
    changes += 1
    print("1a. Added progressive hints to Missing Letter wrong answers")
else:
    print("1a. WARNING: Missing Letter wrong handler not found")

# Localize "Hear the word" button
old_hear = '                            Hear the word\n                        </button>'
new_hear = "                            {ts('word_sounds.missing_letter_hear') || 'Hear the word'}\n                        </button>"
if old_hear in content:
    content = content.replace(old_hear, new_hear, 1)
    changes += 1
    print("1b. Localized 'Hear the word'")
else:
    print("1b. WARNING: 'Hear the word' not found")

# Localize "Check Answer ✓" button
old_check_ml = '                            Check Answer \xe2\x9c\x93\n                        </button>\n                        {/* Mic Toggle */}'
new_check_ml = "                            {ts('word_sounds.missing_letter_check') || 'Check Answer \xe2\x9c\x93'}\n                        </button>\n                        {/* Mic Toggle */}"
if old_check_ml in content:
    content = content.replace(old_check_ml, new_check_ml)
    changes += 1
    print("1c. Localized 'Check Answer' in Missing Letter")
else:
    print("1c. WARNING: 'Check Answer' in missing letter not found")

# Localize mic toggle in Missing Letter
old_mic_ml = '<Mic size={20} /> {useMicInput ? "Switch to Tapping" : "Use Microphone"}\n                             </button>'
new_mic_ml = """<Mic size={20} /> {useMicInput ? (ts('word_sounds.mic_switch_tapping') || "Switch to Tapping") : (ts('word_sounds.mic_switch_mic') || "Use Microphone")}
                             </button>"""
if old_mic_ml in content:
    content = content.replace(old_mic_ml, new_mic_ml)
    changes += 1
    print("1d. Localized mic toggle in Missing Letter")
else:
    print("1d. WARNING: Missing Letter mic toggle not found")

# ================================================================
# 2. BLENDING: Replay phonemes button
# ================================================================
# The comment at L8454 says "Play Sounds Button REMOVED (User Request)"
# But the user wanted to remove the button that reveals the WHOLE WORD.
# We add a replay-phonemes-ONLY button that plays individual sounds.

old_blending_removed = """                                {/* Play Sounds Button REMOVED (User Request: "Remove speaker button that reveals whole word") */}
                                {/* The user can still click the microphone or select the word to check answer. */}
                                <div className="text-center">
                                    <p className="text-sm text-slate-500 mt-2 mb-4">Listen to the sounds, then {useMicInput ? "say the word!" : "pick the word!"}</p>
                                </div>"""

new_blending_replay = """                                {/* Replay Individual Phonemes (NOT the whole word) */}
                                <div className="text-center space-y-2">
                                    <button
                                        onClick={async () => {
                                            const phonemes = wordSoundsPhonemes?.phonemes || [];
                                            for (let i = 0; i < phonemes.length; i++) {
                                                if (!isMountedRef.current) return;
                                                await handleAudio(phonemes[i]);
                                                await new Promise(r => setTimeout(r, 400));
                                            }
                                        }}
                                        disabled={isPlayingAudio}
                                        className="mx-auto flex items-center gap-2 px-5 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-full font-bold text-sm transition-all hover:scale-105 shadow-sm"
                                    >
                                        {isPlayingAudio ? (
                                            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                        ) : (
                                            <Volume2 size={18} />
                                        )}
                                        {ts('word_sounds.blending_replay_sounds') || '\xf0\x9f\x94\x89 Replay Sounds'}
                                    </button>
                                    <p className="text-sm text-slate-500">{ts('word_sounds.blending_instruction') || `Listen to the sounds, then ${useMicInput ? "say the word!" : "pick the word!"}`}</p>
                                </div>"""

if old_blending_removed in content:
    content = content.replace(old_blending_removed, new_blending_replay)
    changes += 1
    print("2. Added phoneme replay button for Blending activity")
else:
    print("2. WARNING: Blending removed-button comment not found")

# ================================================================
# 3. RHYMING: Improve distractor filter
# ================================================================
# At L6176-6180, the filter uses slice(-2) which is too shallow.
# "night" ends in "-ight" (4 chars), but filter only checks last 2 ("ht").
# This means "might" (also "ht") would be filtered as a rhyme when it IS one.
# But "bought" ("ht") would also match, even though it doesn't rhyme.
#
# Fix: Use the maximum rime length by finding the vowel nucleus.

old_filter = """                // FIX: Filter out any distractors that actually rhyme with the correct answer
                const correctEnding = (correctRhyme || '').slice(-2).toLowerCase();
                const filteredDistractors = distractors.filter(d => {
                    if (!d) return false;
                    const dEnding = d.slice(-2).toLowerCase();
                    return dEnding !== correctEnding; // Keep only words that DON'T share the ending
                });"""

new_filter = """                // FIX: Filter out distractors that actually rhyme with the correct answer
                // Use rime-aware matching: find the vowel nucleus and compare everything from there
                const getRime = (word) => {
                    const w = (word || '').toLowerCase();
                    const vowels = 'aeiou';
                    // Find the LAST vowel cluster start
                    let rimeStart = w.length;
                    for (let i = w.length - 1; i >= 0; i--) {
                        if (vowels.includes(w[i])) {
                            rimeStart = i;
                            // Keep going back if previous char is also a vowel
                            while (i > 0 && vowels.includes(w[i-1])) i--;
                            rimeStart = i;
                            break;
                        }
                    }
                    return w.slice(rimeStart);
                };
                const correctRime = getRime(correctRhyme);
                const filteredDistractors = distractors.filter(d => {
                    if (!d) return false;
                    return getRime(d) !== correctRime; // Keep only words whose rime differs
                });"""

if old_filter in content:
    content = content.replace(old_filter, new_filter)
    changes += 1
    print("3. Upgraded rhyming distractor filter from slice(-2) to rime-aware matching")
else:
    print("3. WARNING: Rhyming distractor filter not found")

# ================================================================
# Add new localization keys
# ================================================================
anchor2 = "'word_sounds.spelling_bee_hint_more':"
pos2 = content.find(anchor2)
if pos2 > 0:
    eol2 = content.find('\n', pos2)
    if "'word_sounds.missing_letter_hear'" not in content:
        more_keys = """
    'word_sounds.missing_letter_hear': 'Hear the word',
    'word_sounds.missing_letter_check': 'Check Answer \xe2\x9c\x93',
    'word_sounds.mic_switch_tapping': 'Switch to Tapping',
    'word_sounds.blending_replay_sounds': '\xf0\x9f\x94\x89 Replay Sounds',
    'word_sounds.blending_instruction': 'Listen to the sounds, then pick the word!',"""
        content = content[:eol2+1] + more_keys + '\n' + content[eol2+1:]
        changes += 1
        print("4. Added 5 more localization keys")
    else:
        print("4. Localization keys already exist")
else:
    print("4. WARNING: anchor for new keys not found")

# Also localize "Test Sequence" (L8342) and "Edit Sounds" (L8439) while we're here
old_test_seq = '                                Test Sequence\n                            </button>'
new_test_seq = "                                {ts('word_sounds.test_sequence') || 'Test Sequence'}\n                            </button>"
if old_test_seq in content:
    content = content.replace(old_test_seq, new_test_seq)
    changes += 1
    print("5. Localized 'Test Sequence' button")
else:
    print("5. WARNING: 'Test Sequence' not found")

old_edit_sounds = '>Edit Sounds\n                                        </div>'
new_edit_sounds = ">{ts('word_sounds.blending_edit_sounds') || 'Edit Sounds'}\n                                        </div>"
if old_edit_sounds in content:
    content = content.replace(old_edit_sounds, new_edit_sounds)
    changes += 1
    print("6. Localized 'Edit Sounds' label")
else:
    print("6. WARNING: 'Edit Sounds' not found")

# ================================================================
# Save
# ================================================================
content = content.replace('\n', '\r\n')
print(f"\nTotal changes: {changes}")
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"Saved ({len(content)} chars)")
