"""
Three improvements:
1. Rhyming instruction chain: "Which word rhymes with..." + [target word]
2. Session complete modal: add XP earned, level, words practiced count
3. Clean duplicate letter_* entries from instructions category in audio bank
"""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
print(f"Loaded {original_len} chars")
changes = 0

# ============================================================
# FIX 1: Rhyming instruction audio chain
# ============================================================
print("\n=== FIX 1: Rhyming instruction chain ===")

# Current guard at L7476: wordSoundsActivity !== 'rhyming'
# Need to add rhyming as a special case (like letter_tracing and word_families)
# Location: after the word_families else-if block
# The pattern is: "Which word rhymes with..." -> [wait] -> [target word]

# Find the word_families block end and add rhyming before the final else
old_wf_end = '''            } else if (wordSoundsActivity === 'word_families') {'''

# First, remove the rhyming exclusion from the generic check
old_generic_check = '''if (typeof INSTRUCTION_AUDIO !== 'undefined' && (INSTRUCTION_AUDIO[instKey] || INSTRUCTION_AUDIO[wordSoundsActivity]) && wordSoundsActivity !== 'rhyming') {'''
new_generic_check = '''if (typeof INSTRUCTION_AUDIO !== 'undefined' && (INSTRUCTION_AUDIO[instKey] || INSTRUCTION_AUDIO[wordSoundsActivity]) && wordSoundsActivity !== 'rhyming' && wordSoundsActivity !== 'letter_tracing' && wordSoundsActivity !== 'word_families') {'''

if old_generic_check in content:
    content = content.replace(old_generic_check, new_generic_check)
    changes += 1
    print("  Updated generic instruction check to exclude chained activities")
else:
    print("  WARNING: Generic check not found")

# Now find after the word_families block to add rhyming chain
# The word_families block ends with closing braces, then there's an else
# Let's find the exact text after the word_families block

# Find the spot to add rhyming: after word_families but before final else/fallback
# The structure is: } else if (wordSoundsActivity === 'word_families') { ... } else { ... }
# We need to insert: } else if (wordSoundsActivity === 'rhyming') { ... }

old_after_wf = '''                    instructionText = `Find words that end with the ${targetSound} sound`;
                    }
                }
            } else {'''

new_after_wf = '''                    instructionText = `Find words that end with the ${targetSound} sound`;
                    }
                }
            } else if (wordSoundsActivity === 'rhyming') {
                // Rhyming: chain "Which word rhymes with..." + target word
                if (typeof INSTRUCTION_AUDIO !== 'undefined' && INSTRUCTION_AUDIO['inst_rhyming']) {
                    await handleAudio(INSTRUCTION_AUDIO['inst_rhyming']); // "Which word rhymes with..."
                    if (cancelled) return;
                    await new Promise(r => setTimeout(r, 300));
                    await handleAudio(currentWordSoundsWord); // Say the target word
                } else {
                    instructionText = `Which word rhymes with ${currentWordSoundsWord}?`;
                }
            } else {'''

if old_after_wf in content:
    content = content.replace(old_after_wf, new_after_wf)
    changes += 1
    print("  Added rhyming instruction chain (inst_rhyming + target word)")
else:
    print("  WARNING: Word families end block not found")

# ============================================================
# FIX 2: Enhanced session complete modal
# ============================================================
print("\n=== FIX 2: Enhanced session completion modal ===")

# Add: XP earned, level display, words practiced, and time spent
# Also add a performance message based on accuracy

old_modal_header = '''                    {/* Celebration Header */}
                    <div className="p-8 text-center">
                        <div className="text-6xl mb-4 animate-bounce">🎉</div>
                        <h2 className="text-3xl font-black mb-2">{ts('word_sounds.session_complete') || 'Session Complete!'}</h2>
                        <p className="text-white/70">{ts('word_sounds.great_job') || 'Great job with this activity!'}</p>
                    </div>'''

new_modal_header = '''                    {/* Celebration Header */}
                    <div className="p-8 text-center">
                        <div className="text-6xl mb-4 animate-bounce">{accuracy >= 90 ? '🏆' : accuracy >= 70 ? '🎉' : accuracy >= 50 ? '⭐' : '💪'}</div>
                        <h2 className="text-3xl font-black mb-2">{ts('word_sounds.session_complete') || 'Session Complete!'}</h2>
                        <p className="text-white/70">{
                            accuracy >= 90 ? 'Outstanding work! You\'re a phonics champion!' :
                            accuracy >= 70 ? 'Great job with this activity!' :
                            accuracy >= 50 ? 'Good effort! Keep practicing!' :
                            'Nice try! Every practice makes you stronger!'
                        }</p>
                        {wordSoundsLevel > 1 && (
                            <div className="mt-2 inline-flex items-center gap-1 bg-white/20 rounded-full px-4 py-1 text-sm font-bold">
                                ⭐ Level {wordSoundsLevel}
                            </div>
                        )}
                    </div>'''

if old_modal_header in content:
    content = content.replace(old_modal_header, new_modal_header)
    changes += 1
    print("  Enhanced celebration header with adaptive emoji and level badge")
else:
    print("  WARNING: Modal header not found")

# Add XP and words practiced to stats grid
old_stats_grid = '''                    <div className="bg-white/10 backdrop-blur p-6">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-white/10 rounded-2xl p-4">
                                <div className="text-3xl font-black">{wordSoundsScore.correct}</div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">{ts('word_sounds.correct') || 'Correct'}</div>
                            </div>
                            <div className="bg-white/10 rounded-2xl p-4">
                                <div className="text-3xl font-black">{accuracy}%</div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">{ts('word_sounds.accuracy') || 'Accuracy'}</div>
                            </div>
                            <div className="bg-white/10 rounded-2xl p-4">
                                <div className="text-3xl font-black">{streakEmoji} {wordSoundsStreak}</div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">{ts('word_sounds.streak') || 'Streak'}</div>
                            </div>
                        </div>
                    </div>'''

new_stats_grid = '''                    <div className="bg-white/10 backdrop-blur p-6">
                        <div className="grid grid-cols-3 gap-4 text-center mb-4">
                            <div className="bg-white/10 rounded-2xl p-4">
                                <div className="text-3xl font-black">{wordSoundsScore.correct}</div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">{ts('word_sounds.correct') || 'Correct'}</div>
                            </div>
                            <div className="bg-white/10 rounded-2xl p-4">
                                <div className="text-3xl font-black">{accuracy}%</div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">{ts('word_sounds.accuracy') || 'Accuracy'}</div>
                            </div>
                            <div className="bg-white/10 rounded-2xl p-4">
                                <div className="text-3xl font-black">{streakEmoji} {wordSoundsStreak}</div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">{ts('word_sounds.streak') || 'Streak'}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-xl font-bold">{wordSoundsScore.total}</div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">Words Practiced</div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-xl font-bold">{wordSoundsXP || 0} ✨</div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">XP Earned</div>
                            </div>
                        </div>
                    </div>'''

if old_stats_grid in content:
    content = content.replace(old_stats_grid, new_stats_grid)
    changes += 1
    print("  Enhanced stats grid with Words Practiced and XP Earned")
else:
    print("  WARNING: Stats grid not found")

# Save
print(f"\n=== Writing {changes} changes ===")
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Saved {FILE} ({len(content)} chars, was {original_len})")

# ============================================================
# FIX 3: Clean duplicate letter_* entries from instructions 
# ============================================================
print("\n=== FIX 3: Clean duplicate letter entries from audio bank ===")
import json

BANK_FILE = 'audio_bank.json'
with open(BANK_FILE, 'r', encoding='utf-8') as f:
    bank = json.load(f)

letters_to_remove = [f'letter_{chr(c)}' for c in range(ord('a'), ord('z')+1)]
removed = []
for key in letters_to_remove:
    if key in bank.get('instructions', {}):
        del bank['instructions'][key]
        removed.append(key)

if removed:
    with open(BANK_FILE, 'w', encoding='utf-8') as f:
        json.dump(bank, f, indent=2)
    print(f"  Removed {len(removed)} duplicate letter entries from instructions category")
    print(f"  Instructions keys now: {len(bank['instructions'])}")
else:
    print("  No duplicate letter entries found")
