"""
Word Families Activity — 8 improvements (Tier 1 + Tier 2)
1. Add progress counter (X/Y found)
2. Balance ratio: reduce distractors from 8 to 4
3. Add wrong-answer feedback message with target sound
4. Localize 5 hardcoded strings
5. Play completion sound
6. Fix "house" metaphor — dynamic subtitle from data.family
7. Dynamic subtitle matching actual task
8. Make mode configurable (note: requires teacher UI, so just expose the prop)
"""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# FIX 2: Reduce distractors from 8 to 4
# ================================================================
old_dist_count = "const selectedDistractors = shuffleSeeded(distractorsPool).slice(0, 8); // Grab extra distractors"
new_dist_count = "const selectedDistractors = shuffleSeeded(distractorsPool).slice(0, 4); // Balanced: ~4 matches : 4 distractors"
if old_dist_count in content:
    content = content.replace(old_dist_count, new_dist_count)
    changes += 1
    print("2. Reduced distractors from 8 to 4")
else:
    print("2. WARNING: distractor count not found")

# ================================================================
# FIX 3: Add wrong-answer feedback with target sound info
# FIX 5: Play completion sound
# FIX 1: Add progress counter
# FIX 6/7: Fix house metaphor + dynamic subtitle
# FIX 4: Localize hardcoded strings
# ================================================================
# These all modify the WordFamiliesView component (L4122-4296)

# --- FIX 3: Wrong answer feedback ---
# Currently L4161-4166:
#   } else {
#       setShakenWord(item.text);
#       setTimeout(() => { if (isMountedRef.current) setShakenWord(null); }, 500);
#       onCheckAnswer('incorrect');
#   }
old_wrong = """            } else {
                // Wrong! Shake animation + record incorrect
                setShakenWord(item.text);
                setTimeout(() => { if (isMountedRef.current) setShakenWord(null); }, 500);
                onCheckAnswer('incorrect');
            }"""

new_wrong = """            } else {
                // Wrong! Shake animation + feedback message + record incorrect
                setShakenWord(item.text);
                setWrongFeedback(item.text);
                setTimeout(() => { if (isMountedRef.current) { setShakenWord(null); setWrongFeedback(null); } }, 1500);
                onCheckAnswer('incorrect');
            }"""

if old_wrong in content:
    content = content.replace(old_wrong, new_wrong)
    changes += 1
    print("3. Added wrong-answer feedback state updates")
else:
    print("3. WARNING: wrong handler not found")

# --- Add wrongFeedback state ---
old_states = """        const [shakenWord, setShakenWord] = React.useState(null);
        const [isComplete, setIsComplete] = React.useState(false);"""
new_states = """        const [shakenWord, setShakenWord] = React.useState(null);
        const [wrongFeedback, setWrongFeedback] = React.useState(null);
        const [isComplete, setIsComplete] = React.useState(false);"""
if old_states in content:
    content = content.replace(old_states, new_states)
    changes += 1
    print("3b. Added wrongFeedback state")
else:
    print("3b. WARNING: states block not found")

# --- FIX 5: Play completion sound ---
old_complete = """                     setIsComplete(true);
                     setTimeout(() => onCheckAnswer('correct'), 1000);"""
new_complete = """                     setIsComplete(true);
                     onPlayAudio('correct'); // Celebration sound
                     setTimeout(() => onCheckAnswer('correct'), 1200);"""
if old_complete in content:
    content = content.replace(old_complete, new_complete)
    changes += 1
    print("5. Added completion celebration sound")
else:
    print("5. WARNING: completion handler not found")

# --- FIX 1 + 6 + 7 + 4: Progress counter, fix metaphor, dynamic subtitle, localize ---
# Replace the header and subtitle section
old_header = """                {/* Visual Header */}
                <div className="text-center mb-6 relative">
                    <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-sm border border-slate-100 mb-4">
                        <span className="text-2xl">\U0001f3e0</span>
                        <div className="flex flex-col">
                            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Sound Match</span>
                            <span className="text-xl font-black text-violet-600">{data.family}</span>
                        </div>
                        {/* Repeat Target Word Button */}
                        <button 
                            onClick={() => onPlayAudio(data.options?.[0] || data.family)}
                            title="Hear target word"
                            className="ml-2 p-2 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors"
                        >
                            <Volume2 size={18} />
                        </button>
                    </div>
                    <h3 className="text-lg text-slate-600 font-medium">Find all the words that belong in the house!</h3>
                </div>"""

new_header = """                {/* Visual Header with Progress */}
                <div className="text-center mb-6 relative">
                    <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-sm border border-slate-100 mb-4">
                        <span className="text-2xl">\U0001f50a</span>
                        <div className="flex flex-col">
                            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">{ts('word_sounds.word_families_label') || 'Sound Match'}</span>
                            <span className="text-xl font-black text-violet-600">{data.family}</span>
                        </div>
                        {/* Repeat Target Sound Button */}
                        <button 
                            onClick={() => onPlayAudio(data.options?.[0] || data.family)}
                            title="Hear target sound"
                            className="ml-2 p-2 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors"
                        >
                            <Volume2 size={18} />
                        </button>
                    </div>
                    {/* Dynamic instruction matching actual task */}
                    <h3 className="text-lg text-slate-600 font-medium">
                        {ts('word_sounds.word_families_instruction') || `Find all words that match: ${data.family}`}
                    </h3>
                    {/* Progress counter */}
                    <div className="mt-2 flex items-center justify-center gap-2">
                        <div className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm font-bold">
                            {foundWords.length} / {data.options?.length || 0} {ts('word_sounds.word_families_found') || 'found'}
                        </div>
                    </div>
                </div>"""

if old_header in content:
    content = content.replace(old_header, new_header)
    changes += 1
    print("1/4/6/7. Updated header: progress counter, localized strings, fixed metaphor, dynamic subtitle")
else:
    print("1/4/6/7. WARNING: header block not found")

# --- FIX 4: Localize "Family Complete!" ---
old_family_complete = """                            <div className="bg-green-100 text-green-700 px-6 py-4 rounded-2xl font-black text-2xl shadow-xl transform rotate-3 border-4 border-white">
                                Family Complete! \U0001f389
                            </div>"""
new_family_complete = """                            <div className="bg-green-100 text-green-700 px-6 py-4 rounded-2xl font-black text-2xl shadow-xl transform rotate-3 border-4 border-white">
                                {ts('word_sounds.word_families_complete') || 'Family Complete! \U0001f389'}
                            </div>"""
if old_family_complete in content:
    content = content.replace(old_family_complete, new_family_complete)
    changes += 1
    print("4b. Localized 'Family Complete!'")
else:
    print("4b. WARNING: 'Family Complete!' not found")

# --- FIX 3 continued: Add wrong feedback display in the word bank area ---
# Insert a wrong-answer feedback banner after the word bank div
old_wordbank_end = """                {/* Word Bank (Scattered below) */}
                <div className="flex flex-wrap justify-center gap-3">"""
new_wordbank_with_feedback = """                {/* Wrong Answer Feedback */}
                {wrongFeedback && (
                    <div className="text-center animate-in fade-in mb-2">
                        <span className="inline-block bg-rose-100 text-rose-600 px-4 py-2 rounded-full text-sm font-bold">
                            \u274c "{wrongFeedback}" {ts('word_sounds.word_families_wrong_hint') || `doesn't match: ${data.family}`}
                        </span>
                    </div>
                )}
                {/* Word Bank (Scattered below) */}
                <div className="flex flex-wrap justify-center gap-3">"""
if old_wordbank_end in content:
    content = content.replace(old_wordbank_end, new_wordbank_with_feedback)
    changes += 1
    print("3c. Added wrong-answer feedback display above word bank")
else:
    print("3c. WARNING: word bank section not found")

# ================================================================
# Add localization keys
# ================================================================
anchor = "'word_sounds.blending_instruction':"
pos = content.find(anchor)
if pos > 0:
    eol = content.find('\n', pos)
    if "'word_sounds.word_families_label'" not in content:
        new_keys = """
    'word_sounds.word_families_label': 'Sound Match',
    'word_sounds.word_families_instruction': 'Find all words that match the sound!',
    'word_sounds.word_families_found': 'found',
    'word_sounds.word_families_complete': 'Family Complete! \U0001f389',
    'word_sounds.word_families_wrong_hint': "doesn't match the sound","""
        content = content[:eol+1] + new_keys + '\n' + content[eol+1:]
        changes += 1
        print("4c. Added 5 Word Families localization keys")
    else:
        print("4c. Keys already exist")
else:
    print("4c. WARNING: localization anchor not found")

# ================================================================
# Save
# ================================================================
content = content.replace('\n', '\r\n')
print(f"\nTotal changes: {changes}")
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"Saved ({len(content)} chars)")
