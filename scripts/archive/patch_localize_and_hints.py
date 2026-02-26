"""
Comprehensive patch for:
1. Localize hardcoded English strings in JSX
2. Replace Spelling Bee "Show Answer" with progressive hints
"""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Normalize line endings for matching
content = content.replace('\r\n', '\n')
original = len(content)
changes = 0

# ================================================================
# Add new localization keys to UI_STRINGS
# ================================================================
# Find the existing word_sounds localization keys area
anchor = "'word_sounds.spelling_bee_show_answer':"
pos = content.find(anchor)
if pos > 0:
    # Find the end of that line
    eol = content.find('\n', pos)
    # Check if our keys already exist
    if "'word_sounds.spelling_bee_check'" not in content:
        new_keys = """
    'word_sounds.spelling_bee_check': 'Check Spelling ✓',
    'word_sounds.spelling_bee_hint_vowels': '💡 Show Vowels',
    'word_sounds.spelling_bee_hint_more': '💡 Show More',
    'word_sounds.mic_switch_typing': 'Switch to Typing',
    'word_sounds.mic_switch_mic': 'Use Microphone',
    'word_sounds.session_words_practiced': 'Words Practiced',
    'word_sounds.session_xp_earned': 'XP Earned',
    'word_sounds.session_next_activity': 'Next Activity',
    'word_sounds.session_msg_outstanding': \"Outstanding work! You're a phonics champion!\",
    'word_sounds.session_msg_great': 'Great job with this activity!',
    'word_sounds.session_msg_good': 'Good effort! Keep practicing!',
    'word_sounds.session_msg_nice': 'Nice try! Every practice makes you stronger!',"""
        content = content[:eol+1] + new_keys + '\n' + content[eol+1:]
        changes += 1
        print("1. Added 12 localization keys")
    else:
        print("1. Localization keys already exist")
else:
    print("1. WARNING: anchor not found for localization keys")

# ================================================================
# Fix "Check Spelling ✓" hardcoded string
# ================================================================
old_check = "                            Check Spelling ✓\n                        </button>"
new_check = "                            {ts('word_sounds.spelling_bee_check') || 'Check Spelling ✓'}\n                        </button>"
if old_check in content:
    content = content.replace(old_check, new_check)
    changes += 1
    print("2. Localized 'Check Spelling' button")
elif "spelling_bee_check" in content.split("case 'spelling_bee'")[1].split("case ")[0] if "case 'spelling_bee'" in content else False:
    print("2. Already localized")
else:
    print("2. WARNING: 'Check Spelling' button not found")

# ================================================================
# Fix mic toggle hardcoded strings
# ================================================================
old_mic = '<Mic size={20} /> {useMicInput ? "Switch to Typing" : "Use Microphone"}'
new_mic = """<Mic size={20} /> {useMicInput ? (ts('word_sounds.mic_switch_typing') || "Switch to Typing") : (ts('word_sounds.mic_switch_mic') || "Use Microphone")}"""
if old_mic in content:
    content = content.replace(old_mic, new_mic)
    changes += 1
    print("3. Localized mic toggle text")
else:
    print("3. WARNING: mic toggle text not found")

# ================================================================
# Fix session modal hardcoded strings
# ================================================================

# Encouragement messages
old_msg = """accuracy >= 90 ? "Outstanding work! You're a phonics champion!" :
                            accuracy >= 70 ? 'Great job with this activity!' :
                            accuracy >= 50 ? 'Good effort! Keep practicing!' :
                            'Nice try! Every practice makes you stronger!'"""

new_msg = """accuracy >= 90 ? (ts('word_sounds.session_msg_outstanding') || "Outstanding work! You're a phonics champion!") :
                            accuracy >= 70 ? (ts('word_sounds.session_msg_great') || 'Great job with this activity!') :
                            accuracy >= 50 ? (ts('word_sounds.session_msg_good') || 'Good effort! Keep practicing!') :
                            (ts('word_sounds.session_msg_nice') || 'Nice try! Every practice makes you stronger!')"""

if old_msg in content:
    content = content.replace(old_msg, new_msg)
    changes += 1
    print("4. Localized session encouragement messages")
else:
    print("4. WARNING: session encouragement messages not found")

# "Words Practiced"
old_wp = ">Words Practiced</div>"
new_wp = ">{ts('word_sounds.session_words_practiced') || 'Words Practiced'}</div>"
if old_wp in content:
    content = content.replace(old_wp, new_wp)
    changes += 1
    print("5. Localized 'Words Practiced'")
else:
    print("5. WARNING: 'Words Practiced' not found")

# "XP Earned"
old_xp = ">XP Earned</div>"
new_xp = ">{ts('word_sounds.session_xp_earned') || 'XP Earned'}</div>"
if old_xp in content:
    content = content.replace(old_xp, new_xp)
    changes += 1
    print("6. Localized 'XP Earned'")
else:
    print("6. WARNING: 'XP Earned' not found")

# "Next Activity"
old_na = "'➡️ Next Activity'"
new_na = "('➡️ ' + (ts('word_sounds.session_next_activity') || 'Next Activity'))"
if old_na in content:
    content = content.replace(old_na, new_na)
    changes += 1
    print("7. Localized 'Next Activity'")
else:
    print("7. WARNING: 'Next Activity' not found")

# ================================================================
# Replace "Show Answer" with progressive hints
# ================================================================
# Currently at L8756-8769:
#   <div className="flex gap-4 text-sm">
#     <button onClick={show first letter}> First Letter hint </button>
#     <button onClick={reveal whole word}> Show Answer </button>
#   </div>
# 
# Replace with progressive hint system:
# - First click: reveal vowels only
# - Second click: reveal consonants too (full reveal)

old_hints = """                        {/* Hint buttons */}
                        <div className="flex gap-4 text-sm">
                            <button
                                onClick={() => setUserAnswer(currentWordSoundsWord?.[0] || '')}
                                className="text-amber-600 hover:text-amber-700 underline"
                            >
                                {ts('word_sounds.spelling_bee_first_letter')}
                            </button>
                            <button
                                onClick={() => setUserAnswer(currentWordSoundsWord || '')}
                                className="text-slate-400 hover:text-slate-500 underline"
                            >
                                {ts('word_sounds.spelling_bee_show_answer')}
                            </button>
                        </div>"""

new_hints = """                        {/* Progressive Hint System */}
                        <div className="flex gap-4 text-sm">
                            <button
                                onClick={() => setUserAnswer(currentWordSoundsWord?.[0] || '')}
                                className="text-amber-600 hover:text-amber-700 underline"
                            >
                                {ts('word_sounds.spelling_bee_first_letter')}
                            </button>
                            <button
                                onClick={() => {
                                    // Progressive: first show vowels, then full word
                                    const word = currentWordSoundsWord || '';
                                    const vowels = 'aeiou';
                                    const current = userAnswer?.toLowerCase() || '';
                                    const vowelHint = word.split('').map(ch => 
                                        vowels.includes(ch.toLowerCase()) ? ch : '_'
                                    ).join('');
                                    // If user already has vowel hint or more, show full word
                                    if (current.length >= vowelHint.replace(/_/g, '').length && current.length > 0) {
                                        setUserAnswer(word);
                                    } else {
                                        // Show vowels only (e.g., "_a_" for "cat")
                                        setUserAnswer(vowelHint);
                                    }
                                }}
                                className="text-slate-400 hover:text-slate-500 underline"
                            >
                                {userAnswer && userAnswer.includes('_') 
                                    ? (ts('word_sounds.spelling_bee_hint_more') || '💡 Show More')
                                    : (ts('word_sounds.spelling_bee_hint_vowels') || '💡 Show Vowels')}
                            </button>
                        </div>"""

if old_hints in content:
    content = content.replace(old_hints, new_hints)
    changes += 1
    print("8. Replaced Show Answer with progressive hints (vowels first, then full)")
else:
    print("8. WARNING: Hint buttons section not found")

# ================================================================
# Save
# ================================================================
content = content.replace('\n', '\r\n')
print(f"\nTotal changes: {changes}")
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"Saved ({len(content)} chars, was {original})")
